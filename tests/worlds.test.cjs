'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const P = require('../src/physics.js'), L = require('../src/levels.js'), S = require('../src/storage.js');
const { create } = require('./headless.cjs');
const near = (a, b, eps = 1e-8) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const level = id => L.find(l => l.id === id);
test('all five playable worlds supply twelve circuit stages', () => {
    assert.equal(L.worlds.length, 8);
    assert.equal(new Set(L.map(l => l.id)).size, 64);
    for (const w of L.worlds.filter(w => !w.comingSoon && !w.partial)) {
        const stages = L.filter(l => l.campaign === w.id && !l.bonus);
        assert.equal(stages.length, 12);
        assert.deepEqual(stages.map(l => l.stageNumber), Array.from({ length: 12 }, (_, i) => i + 1));
    }
    assert.equal(L.filter(l => l.campaign === 'gerbozilla').length, 12);
    assert.ok(L.slice(0, 12).every(l => l.theme === 'coast'));
    assert.ok(L.slice(12, 24).every(l => l.theme === 'night'));
});
test('motion reports ahead/astern from velocity, not throttle or engine', () => {
    const s = P.ship(0, 0, 0, { vx: 2, throttle: -3, engine: -1 });
    assert.equal(P.groundMotion(s).direction, 'ahead');
    s.vx = -2;
    s.throttle = 4;
    s.engine = 1;
    assert.equal(P.groundMotion(s).direction, 'astern');
    assert.equal(P.groundMotion(s).signedSpeed, -2);
});
test('ground-motion direction follows the bow at every heading', () => {
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 2.4]) {
        const s = P.ship(0, 0, a, { vx: Math.cos(a) * -2, vy: Math.sin(a) * -2 });
        const m = P.groundMotion(s);
        assert.equal(m.direction, 'astern');
        near(m.surge, -2);
        near(m.sway, 0);
    }
});
test('stopped and pure abeam motion are not mislabeled ahead or astern', () => {
    assert.equal(P.groundMotion(P.ship(0, 0, 0)).direction, 'stopped');
    const m = P.groundMotion(P.ship(0, 0, 0, { vy: 1.2 }));
    assert.equal(m.direction, 'abeam');
    near(m.speed, 1.2);
    near(m.sway, 1.2);
    assert.ok(P.groundMotion(P.ship(0, 0, 0, { vy: -1 })).sway < 0);
});
test('all three sheltered originals strongly reduce current across the entire target hull', () => {
    for (const l of L.slice(0, 12).filter(l => l.current.some(v => v))) {
        assert.ok(l.shelters.length);
        const s = P.ship(l.berth.x, l.berth.y, l.berth.a, l.spec), e = P.environmentAt(l, s);
        assert.ok(e.shelter > .99, l.id);
        assert.ok(Math.hypot(e.current.x, e.current.y) < Math.hypot(...l.current) * .05, l.id);
    }
});
test('the three original exposed layouts remain unsheltered and retain their IDs', () => {
    for (const id of ['crosscurrent', 'ballast', 'last-berth']) {
        const l = level(id);
        assert.equal(l.worldNumber, 2);
        assert.equal(l.shelters.length, 0);
        const e = P.environmentAt(l, P.ship(l.berth.x, l.berth.y, l.berth.a));
        near(e.current.x, l.current[0]);
        near(e.current.y, l.current[1]);
    }
});
test('exposed berth geometry admits a complete neutral hold at current drift', () => {
    for (const id of ['crosscurrent', 'ballast', 'last-berth']) {
        const l = level(id), s = P.ship(l.berth.x, l.berth.y, l.berth.a, { vx: l.current[0], vy: l.current[1] });
        for (let n = 0; n < 240; n++) {
            P.integrate(s, {}, P.environmentAt(l, s, n / 120), 1 / 120);
            assert.ok(P.docking(s, l.berth).ready, id);
        }
    }
});
test('shelter blends smoothly at its boundary and only affects local water', () => {
    const l = level('crosscurrent-sheltered'), z = l.shelters[0], y = z.y + z.h / 2;
    near(P.fieldAt(l, z.x - 2, y).current.y, l.current[1]);
    near(P.fieldAt(l, z.x, y).current.y, l.current[1]);
    assert.ok(P.fieldAt(l, z.x + .01, y).current.y > l.current[1] - .0001);
    assert.ok(P.fieldAt(l, z.x + z.feather / 2, y).current.y < P.fieldAt(l, z.x + 1, y).current.y);
    assert.ok(P.environmentAt(l, P.ship(z.x + 8, y)).shelter < P.environmentAt(l, P.ship(z.x + 32, y)).shelter);
});
test('shelter cannot erase existing sideways inertia', () => {
    const l = level('crosscurrent-sheltered'), s = P.ship(l.berth.x, l.berth.y, 0, { vx: 2, vy: .4 });
    const before = { ...s };
    P.integrate(s, {}, P.environmentAt(l, s), 1 / 120);
    assert.ok(s.vx > 1.99);
    assert.ok(s.vy > .39);
    assert.ok(s.x > before.x);
});
test('sluice pulse is repeatable, spatial and varies within the cycle', () => {
    const l = level('tidal-race'), z = l.currentZones[0], x = z.x + z.w / 2, y = z.y + z.h / 2;
    const a = P.fieldAt(l, x, y, 12), b = P.fieldAt(l, x, y, 12 + z.pulse.period), c = P.fieldAt(l, x, y, 12 + z.pulse.period / 2);
    near(a.current.y, b.current.y);
    assert.ok(Math.abs(a.current.y - c.current.y) > .15);
    near(P.fieldAt(l, 60, 180, 12).current.y, l.current[1]);
});
test('v1 import preserves exposed PBs and archives the incompatible old circuit', () => {
    const data = { version: 1, stages: { crosscurrent: {
                runs: [
                    { time: 123, contacts: 0, clean: true }
                ], ghost: [[0, 49, 86, 0]], bestSplits: [], clears: 1, attempts: 3
            } }, marathon: [
            { time: 2222, contacts: 0, clean: true }
        ] };
    const s = S.create({ getItem: () => JSON.stringify(data), setItem() {
        } });
    assert.equal(s.data.version, S.VERSION);
    assert.equal(s.best('crosscurrent').time, 123);
    assert.equal(s.best('crosscurrent-sheltered'), null);
    assert.equal(s.data.marathon[0].time, 2222);
    assert.equal(s.bestRace('coast'), null);
    assert.equal(s.bestRace('grand-tour'), null);
});
test('circuit rankings are separate and preserve clean times', () => {
    const s = S.create({ getItem: () => null, setItem() {
        } });
    s.recordRace('coast', { time: 600, contacts: 0, clean: true });
    for (let i = 0; i < 20; i++)
        s.recordRace('coast', { time: 500 + i, contacts: 1, clean: false });
    s.recordRace('northwatch', { time: 1200, contacts: 0, clean: true });
    s.recordRace('grand-tour', { time: 1900, contacts: 0, clean: true });
    assert.equal(s.bestRace('coast').time, 500);
    assert.equal(s.bestRace('coast', true).time, 600);
    assert.equal(s.bestRace('northwatch').time, 1200);
    assert.equal(s.bestRace('grand-tour').time, 1900);
    const copy = S.sanitize(s.data);
    assert.equal(copy.races.coast.length, 11);
});
test('full exposed crosscurrent stage has a clean control-only solution', () => {
    const fixture = require('./exposed-crosscurrent-controls.json'), t = create();
    t.load(L.findIndex(l => l.id === fixture.level));
    let i = 0;
    for (let n = 0; n < Math.ceil(fixture.duration * 120) && t.state.status === 'running'; n++) {
        while (i < fixture.events.length && fixture.events[i].time <= n / 120 + 1e-8) {
            const e = fixture.events[i++];
            if (e.throttle !== undefined)
                t.throttle(e.throttle - t.state.run.ship.throttle);
            if (e.thruster !== undefined)
                t.state.input.thruster = e.thruster;
        }
        t.advance(1 / 120);
    }
    assert.equal(t.state.status, 'complete');
    assert.equal(t.state.run.contacts, 0);
    assert.ok(t.state.run.result.clean);
    assert.ok(t.state.run.time < 80);
});
test('new project load applies its explicit mass and keeps the longer hull', () => {
    const t = create(), i = L.findIndex(l => l.id === 'deadweight');
    t.load(i);
    t.setShip({ x: 154, y: 210 });
    t.advance(3.1);
    assert.equal(t.state.run.ship.mass, 2.25);
    assert.equal(t.state.run.ship.length, 34);
});
for (const id of ['coast', 'northwatch', 'archipelago', 'meridian', 'gerbozilla', 'grand-tour'])
    test(`${id}: circuit route, transitions, retry time and final record`, () => {
        const t = create();
        t.marathon(id);
        const r = t.state.marathon, expected = id === 'grand-tour' ? 60 : 12;
        assert.equal(r.route.length, expected);
        assert.equal(t.state.index, id === 'grand-tour' ? 0 : L.findIndex(l => l.campaign === id));
        t.advance(3);
        t.retry();
        assert.ok(r.total > 2.99);
        assert.equal(r.retries, 1);
        for (let j = 0; j < expected; j++) {
            const l = t.state.level;
            // Circuit progression test only: spacecraft objective state machines
            // and complete control recordings are checked in space.test.cjs.
            if (l.space || l.rampage) {
                t.advance(2); t.finish();
                if (j < expected - 1) t.next();
                continue;
            }
            t.state.run.buoyIndex = l.buoys.length;
            t.state.run.lock.phase = 'exit';
            t.state.run.jobs.index = l.jobs.length;
            t.state.run.jobs.line = null;
            t.state.run.jobs.onboard = [];
            t.setShip({
                x: l.berth.x, y: l.berth.y, a: l.berth.a, vx: 0, vy: 0, r: 0, engine: 0, throttle: 0
            });
            t.advance(2.2);
            assert.equal(t.state.status, 'complete', l.id);
            if (j < expected - 1)
                t.next();
        }
        assert.equal(r.stages, expected);
        assert.equal(t.state.storage.races[id].length, 1);
        assert.ok(t.state.storage.races[id][0].time >= 3 + 2 * expected - 1e-8);
        t.next();
        assert.equal(t.state.marathon, null);
        assert.equal(t.state.modal, 'courses');
    });
test('individual World 1 progression stops at the world boundary', () => {
    const t = create();
    t.load(11);
    t.finish();
    t.next();
    assert.equal(t.state.index, 11);
    assert.equal(t.state.modal, 'courses');
});
