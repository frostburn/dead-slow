'use strict';
// Presentation-only setups; intentionally bypass navigation to cover every dialog branch.
const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('./headless.cjs');
const L = require('../src/levels.js');
const marine = /\bharbou?rs?\b|\bberth\b|\bmoor(?:ed|ing)?\b|\bneutral\b|\brudder\b|\b(?:astern|starboard)\b|lines ashore|cast off|bow thrust|wake violations|towlines|all fast/iu;
for (const level of L.filter(l => l.space)) {
    test(`${level.id}: flight briefing and pause never use marine defaults`, () => {
        const t = create(); t.load(L.indexOf(level), false);
        assert.doesNotMatch(t.html('dialog'), marine);
        assert.match(t.html('dialog'), /Release clamps/);
        t.start(); t.pause();
        assert.doesNotMatch(t.html('dialog'), marine);
        assert.match(t.html('dialog'), /Flight control on standby/);
    });
}
for (const kind of ['personal-best', 'slower-arrival', 'practice']) {
    test(`space result uses capture language for ${kind}`, () => {
        const t = create(), index = L.findIndex(l => l.id === 'vacuum');
        t.load(index); t.state.run.time = 10; t.finish();
        if (kind !== 'personal-best') {
            t.load(index); t.state.run.time = 10000;
            if (kind === 'practice') t.pause();
            t.finish();
        }
        assert.doesNotMatch(t.html('dialog'), marine);
        assert.match(t.html('dialog'), /Capture confirmed/);
        assert.match(t.html('dialog'), /Next sector/);
        if (kind === 'slower-arrival') assert.match(t.html('dialog'), /CAPTURE SECURED/);
    });
}
test('space circuit completion does not declare all lines fast', () => {
    const t = create(); t.marathon('meridian');
    for (let i = 0; i < 12; i++) {
        t.state.run.time = 10; t.finish();
        if (i < 11) t.next();
    }
    assert.doesNotMatch(t.html('dialog'), marine);
    assert.match(t.html('dialog'), /Twelve sectors. Mission complete/);
});
test('the marine result and pause retain their original vocabulary', () => {
    const t = create(); t.load(0); t.pause();
    assert.match(t.html('dialog'), /The harbor can wait/);
    t.state.run.time = 10; t.finish();
    assert.match(t.html('dialog'), /All fast. At last/);
    assert.match(t.html('dialog'), /Next harbor/);
});
test('radar is cosmetic, throttled and reset on retry; unavailable on paused flights', () => {
    const t = create(); t.load(L.findIndex(l => l.id === 'vacuum'));
    const st = t.state, ship = JSON.stringify(st.run.ship), space = JSON.stringify(st.run.space);
    assert.equal(t.signal(), true); assert.equal(t.signal(), false);
    assert.deepEqual(JSON.parse(JSON.stringify(st.run.radarPulse)), { x: st.run.ship.x, y: st.run.ship.y, at: 0 });
    assert.equal(JSON.stringify(st.run.ship), ship); assert.equal(JSON.stringify(st.run.space), space);
    assert.equal(st.run.time, 0); assert.equal(st.run.pausedUsed, false);
    t.retry(); assert.equal(t.state.run.radarPulse, null);
    t.pause(); assert.equal(t.signal(), false); assert.equal(t.state.run.radarPulse, null);
});
test('console catalogs display stage numbers while retaining the legacy numeric alias', () => {
    const t = create();
    for (const rows of [t.cheats.levels(), t.cheats.runs(), t.cheats.times()]) {
        for (const row of rows) {
            assert.equal(typeof row.stage, 'number');
            assert.equal(row.harbor, row.stage);
            assert.ok(!Object.keys(row).includes('harbor'));
        }
    }
});
