'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const V = require('../src/verification.js');
const L = require('../src/levels.js');

test('published recordings have unique known levels and input-only timelines', () => {
    assert.equal(new Set(V.runs.map(f => f.level)).size, V.runs.length);
    for (const f of V.runs) {
        assert.ok(L.some(l => l.id === f.level), f.level);
        assert.ok(Number.isFinite(f.expectedTime) && f.expectedTime > 0);
        assert.ok(Number.isFinite(f.duration) && f.duration > f.expectedTime);
        assert.ok(f.description.length > 0 && f.events.length > 0);
        let previous = 0;
        for (const e of f.events) {
            assert.ok(Number.isFinite(e.time) && e.time >= previous && e.time <= f.expectedTime, f.level);
            previous = e.time;
            assert.ok(Object.keys(e).length > 1);
            for (const [key, value] of Object.entries(e)) {
                assert.ok(['time', 'throttle', 'rudder', 'thruster', 'winch', 'line', 'rail'].includes(key), key);
                if (key === 'rail') {
                    assert.ok(L.find(l=>l.id===f.level).rail);
                    assert.ok(Array.isArray(value) && value.length>=1 && value.length<=2);
                    assert.ok(['power','helper','brake','independent','stop','reverse','switch','select','hand','uncouple','couple','dispatch'].includes(value[0]));
                }
                if (key === 'throttle') assert.ok(Number.isInteger(value) && value >= -3 && value <= 4);
                if (['rudder', 'thruster', 'winch'].includes(key)) assert.ok(Number.isFinite(value) && value >= -1 && value <= 1);
                if (key === 'line') assert.equal(value, true);
            }
        }
    }
});
test('every checked-in control fixture is shipped for offline watch playback', () => {
    const fixtures = fs.readdirSync(path.join(__dirname, 'fixtures')).filter(f => f.endsWith('-controls.json'));
    assert.equal(V.runs.length, fixtures.length + 1); // Legacy cross-current fixture lives one directory up.
    for (const file of fixtures) assert.ok(V.runs.some(f => f.source === 'tests/fixtures/' + file), file);
});
test('replay library includes gate, lock, turning, remote barge and return ferry routes', () => {
    for (const id of ['dogleg', 'signal', 'lock', 'astern', 'tidal', 'two-greens', 'granite-needle', 'island-exchange'])
        assert.ok(V.runs.some(f => f.level === id), id);
});
