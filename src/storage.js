(function (root) {
    'use strict';
    // Keep the original key so same-origin upgrades discover the v1 logbook.
    const KEY = 'dead-slow.records.v1', VERSION = 3;
    const RACES = ['coast', 'northwatch', 'archipelago', 'grand-tour'];
    const fresh = () => ({
        version: VERSION, stages: {}, marathon: [], races: { coast: [], northwatch: [], archipelago: [], 'grand-tour': [] }, archivedRaces: { 'grand-tour-24': [] }, settings: { ghost: true, sound: true, guide: true }, attempts: 0
    });
    function validRun(r) {
        return r && Number.isFinite(r.time) && r.time >= 0 && r.time < 86400 && Number.isInteger(r.contacts) && r.contacts >= 0 && typeof r.clean === 'boolean';
    }
    function retain(runs) {
        const sorted = runs.slice().sort((a, b) => a.time - b.time);
        const keep = new Set([...sorted.slice(0, 10), ...sorted.filter(r => r.clean).slice(0, 10)]);
        return sorted.filter(r => keep.has(r));
    }
    function sanitize(data) {
        const result = fresh();
        if (!data || ![1, 2, VERSION].includes(data.version))
            return result;
        result.attempts = Math.max(0, Math.floor(Number(data.attempts) || 0));
        for (const [key, stage] of Object.entries(data.stages || {})) {
            if (!/^[a-z0-9-]{1,40}$/.test(key) || ['constructor', 'prototype'].includes(key) || !stage || typeof stage !== 'object')
                continue;
            const runs = retain((Array.isArray(stage.runs) ? stage.runs : []).filter(validRun).slice(0, 100).map(r => ({ ...r, ghost: undefined })));
            const ghost = Array.isArray(stage.ghost) ? stage.ghost.filter(p => Array.isArray(p) && p.length === 4 && p.every(Number.isFinite)).slice(0, 12000) : [];
            const splits = Array.isArray(stage.bestSplits) ? stage.bestSplits.filter(Number.isFinite).slice(0, 30) : [];
            result.stages[key] = {
                runs, ghost, bestSplits: splits, clears: Math.max(0, Math.floor(Number(stage.clears) || 0)), attempts: Math.max(0, Math.floor(Number(stage.attempts) || 0))
            };
        }
        // Never compare circuit records for different routes or stage counts.
        result.marathon = retain((Array.isArray(data.marathon) ? data.marathon : []).filter(validRun).slice(0, 100));
        if (data.version >= 2)
            for (const id of RACES) {
                const records = retain((Array.isArray(data.races?.[id]) ? data.races[id] : []).filter(validRun).slice(0, 100));
                if (data.version === 2 && id === 'grand-tour')
                    result.archivedRaces['grand-tour-24'] = records;
                else
                    result.races[id] = records;
            }
        if (data.version === VERSION)
            result.archivedRaces['grand-tour-24'] = retain((Array.isArray(data.archivedRaces?.['grand-tour-24']) ? data.archivedRaces['grand-tour-24'] : []).filter(validRun).slice(0, 100));
        for (const k of ['ghost', 'sound', 'guide'])
            if (typeof data.settings?.[k] === 'boolean')
                result.settings[k] = data.settings[k];
        return result;
    }
    function create(storage) {
        let data = fresh(), available = true;
        try {
            const s = storage.getItem(KEY);
            if (s)
                data = sanitize(JSON.parse(s));
        }
        catch (e) {
            available = false;
        }
        function save() {
            try {
                storage.setItem(KEY, JSON.stringify(data));
                available = true;
                return true;
            }
            catch (e) {
                available = false;
                return false;
            }
        }
        function stage(id) {
            return data.stages[id] || (data.stages[id] = {
                runs: [], ghost: [], bestSplits: [], clears: 0, attempts: 0
            });
        }
        function best(id, clean = false) {
            const arr = stage(id).runs.filter(r => !clean || r.clean);
            return arr.length ? arr.reduce((a, b) => a.time < b.time ? a : b) : null;
        }
        function attempt(id) {
            data.attempts++;
            stage(id).attempts++;
            save();
        }
        function record(id, run, ghost, splits) {
            const s = stage(id), previous = best(id), pb = !previous || run.time < previous.time;
            s.clears++;
            s.runs = retain([
                ...s.runs, { ...run, date: run.date || new Date().toISOString() }
            ]);
            if (pb) {
                s.ghost = ghost;
                s.bestSplits = splits;
            }
            save();
            return pb;
        }
        function recordRace(id, run) {
            if (!RACES.includes(id) || !validRun(run))
                return false;
            data.races[id] = retain([...data.races[id], run]);
            return save();
        }
        function bestRace(id, clean = false) {
            return (data.races[id] || []).find(r => !clean || r.clean) || null;
        }
        return {
            get data() {
                return data;
            }, get available() {
                return available;
            }, save, stage, best, attempt, record, recordRace, bestRace,
            import(text) {
                const d = JSON.parse(text);
                if (!d || ![1, 2, VERSION].includes(d.version))
                    throw Error('This is not a compatible Dead Slow logbook.');
                data = sanitize(d);
                save();
            },
            reset() {
                data = fresh();
                save();
            }, export() {
                return JSON.stringify(data, null, 2);
            }
        };
    }
    const api = {
        KEY, VERSION, fresh, sanitize, create
    };
    if (typeof module !== 'undefined' && module.exports)
        module.exports = api;
    root.HarborStorage = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
