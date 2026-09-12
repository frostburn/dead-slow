'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs');
const { create } = require('./headless.cjs');
const V = require('../src/verification.js');
test('shipped replay data is exactly reproducible from the JSON fixtures', () => {
    assert.equal(fs.readFileSync(require.resolve('../src/verification.js'), 'utf8'), require('../tools/sync-replays.cjs').source());
    assert.ok(Object.isFrozen(V.runs)); assert.ok(Object.isFrozen(V.runs[0].events[0]));
});
test('inspection is safe and clearly separates verified author times from pace targets', () => {
    const t = create(); t.load(0); const d = t.cheats;
    const before = JSON.stringify(t.state.storage), snapshot = d.state();
    snapshot.run.ship.x = -900;
    const events = d.timeline('bigger-boat'); events[0].line = false;
    assert.ok(d.timeline('bigger-boat')[0].line); assert.notEqual(t.state.run.ship.x, -900);
    assert.equal(d.times().filter(l => l.verifiedAuthorTime !== null).length, V.runs.length);
    assert.equal(d.runs().length, V.runs.length); assert.equal(d.levels().length, 36);
    d.help(); d.report(); assert.equal(d.speed(), 1);
    assert.equal(t.state.run.pausedUsed, false); assert.equal(JSON.stringify(t.state.storage), before);
});
test('invalid console commands are rejected atomically and do not taint a run', () => {
    const t = create(); t.load(0); const d = t.cheats;
    for (const v of [NaN, Infinity, -1, 33, '8']) assert.throws(() => d.speed(v));
    assert.throws(() => d.step(Infinity)); assert.throws(() => d.step(601));
    assert.throws(() => d.controls({ throttle: 4, rudder: 50 }));
    assert.throws(() => d.controls({ throttle: 2.5 }));
    assert.throws(() => d.controls({ speed: 100 }));
    assert.throws(() => d.level(0, 1)); assert.throws(() => d.level(3, 13));
    assert.throws(() => d.watch('not-a-recording')); assert.throws(() => d.watch('bigger-boat', -1));
    assert.throws(() => d.warp(NaN, 10));
    assert.equal(t.state.run.ship.throttle, 0); assert.equal(t.state.run.pausedUsed, false);
    assert.equal(d.speed(), 1);
});
test('accelerated frames execute more fixed steps, never a larger physics step', () => {
    const fast = create(), reference = create(); fast.load(0); reference.load(0);
    fast.cheats.controls({ throttle: 4 }); reference.throttle(4);
    fast.cheats.speed(8); fast.frame(0); fast.frame(125); reference.advance(1);
    for (const key of ['x', 'y', 'vx', 'vy', 'a', 'r', 'engine'])
        assert.ok(Math.abs(fast.state.run.ship[key] - reference.state.run.ship[key]) < 1e-10, key);
    assert.ok(Math.abs(fast.state.run.time - 1) < 1e-10);
    assert.equal(fast.state.run.pausedUsed, true);
});
test('frozen time supports deterministic stepping and high-rate frames bound work without skipping ticks', () => {
    const t = create(); t.load(0); t.cheats.speed(0); t.frame(0); t.frame(500);
    assert.equal(t.state.run.time, 0); t.cheats.step(.25); assert.ok(Math.abs(t.state.run.time - .25) < 1e-10);
    t.cheats.speed(32); t.frame(0); t.frame(500);
    assert.ok(Math.abs(t.state.run.time - 4.25) < 1e-10, 'at most 480 fixed steps per frame');
    t.frame(500); assert.ok(Math.abs(t.state.run.time - 8.25) < 1e-10, 'remaining accumulator carries forward');
});
test('assisted arrivals and accelerated retries never save PBs, ghosts or ranked departures', () => {
    const t = create(), d = t.cheats; d.level(1, 1);
    const b = t.state.level.berth; d.warp(b.x, b.y, 0); d.step(3);
    assert.equal(t.state.status, 'complete'); assert.equal(t.state.run.result.clean, true);
    assert.equal(t.state.storage.stages['dead-slow'].runs.length, 0);
    assert.equal(t.state.storage.stages['dead-slow'].attempts, 0);
    d.speed(8); t.retry(); assert.equal(t.state.run.pausedUsed, true);
    d.speed(1); assert.equal(t.state.run.pausedUsed, true, 'cannot untaint the current attempt');
    d.normal(); assert.equal(t.state.run.pausedUsed, false); assert.equal(d.speed(), 1);
    assert.equal(t.state.storage.stages['dead-slow'].attempts, 1);
});
test('an accelerated circuit stays practice after retries and changing back to normal time', () => {
    const t = create(); t.marathon('coast'); t.cheats.speed(8); t.advance(1); t.retry(); t.cheats.speed(1);
    assert.equal(t.state.marathon.practice, true); assert.equal(t.state.run.pausedUsed, true);
    t.cheats.normal(); assert.equal(t.state.marathon, null); assert.equal(t.state.run.pausedUsed, false);
});
for (const f of V.runs) {
    test(`${f.level}: live console replay matches its control-only author time and never ranks`, () => {
        const t = create(), [report] = t.cheats.verify(f.level);
        assert.equal(report.verified, true); assert.equal(report.clean, true); assert.equal(report.ranked, false);
        assert.equal(t.state.run.pausedUsed, true); assert.equal(t.state.storage.stages[f.level].runs.length, 0);
        assert.equal(t.state.storage.stages[f.level].ghost.length, 0);
        assert.equal(report.eventsApplied, f.events.length); assert.ok(Math.abs(report.time - f.expectedTime) < 1 / 120);
    });
}
test('a failed recording is reported as divergent, not verified', () => {
    const t = create(); t.cheats.watch('first-crossing', 0); t.setShip({ x: -10 }); t.advance(1 / 120);
    const report = t.cheats.report(); assert.equal(report.verified, false); assert.equal(report.status, 'failed');
});
test('freezing a watch and stepping resumes the same input timeline', () => {
    const t = create(); t.cheats.watch('bigger-boat', 8); t.advance(20); t.cheats.speed(0); t.cheats.step(180);
    assert.equal(t.cheats.report().verified, true);
});

for (const animated of [false, true]) {
    test(`divergent ${animated ? 'animated' : 'manual'} playback freezes at its declared end, without draining a queued batch`, () => {
        const t = create(); t.cheats.watch('first-crossing', 0);
        // Isolate an incomplete run without changing the frozen input recording.
        const level = t.state.level, berth = level.berth;
        try {
            level.berth = { ...berth, x: -1000 };
            if (animated) {
                t.cheats.step(126); t.cheats.speed(32); t.frame(0); t.frame(500);
            } else {
                t.cheats.step(500);
            }
            assert.equal(t.state.status, 'running');
            assert.equal(t.cheats.report().verified, false);
            assert.equal(t.cheats.speed(), 0);
            assert.ok(Math.abs(t.state.run.time - 129) < 1e-8);
            const time = t.state.run.time; t.frame(600); t.frame(700);
            assert.equal(t.state.run.time, time);
        } finally { level.berth = berth; }
    });
}
