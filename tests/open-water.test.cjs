'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const P = require('../src/physics.js'), N = require('../src/navigation.js'), J = require('../src/jobs.js');
const L = require('../src/levels.js'), S = require('../src/storage.js');
const { create } = require('./headless.cjs');
for (const l of L) {
    if(l.polar)continue; // Dedicated ice, fleet and full-hull checks live in polar.test.cjs.
    if(l.rail) {
        test(`${l.id}: every starting vehicle has an occupied track and finite motion`,()=>{
            const t=create();t.load(L.indexOf(l));
            const R=require('../src/rail.js'),st=t.state.run.rail;
            assert.ok(R.assertInvariants(st));
            for(const group of st.groups)for(const car of group.cars) {
                const point=R.locate(st,group,car.q);
                assert.ok(st.net.edges[point.edge]);
                assert.ok([point.x,point.y,point.z].every(Number.isFinite));
            }
            assert.equal(st.stats.contacts,0);
        });
        continue;
    }
    test(`${l.id}: open approach and collision-free departure`, () => {
        assert.deepEqual(l.openSides, l.worldNumber >= 3 ? ['n', 'e', 's', 'w'] : ['w']);
        const t = create(); t.load(L.indexOf(l));
        assert.equal(t.state.run.static.filter(o => o.id.startsWith('coast-')).length, l.worldNumber >= 3 ? 0 : 3);
        for (const body of [t.state.run.ship, ...t.state.run.jobs.bodies]) {
            assert.equal(N.exit(l, body), null);
            assert.equal(t.state.run.static.some(o => P.sat(P.hull(body), o.poly)), false, body.name);
        }
    });
}
for (const side of N.SIDES) {
    test(`whole hull crossing the ${side} edge fails without bouncing, even before its center leaves`, () => {
        const t = create(); t.load(24);
        const [w, h] = t.state.level.world;
        const positions = { w: [1, 30], e: [w - 1, 30], n: [w / 2, 1], s: [60, h - 1] };
        const [x, y] = positions[side];
        t.setShip({ x, y, vx: side === 'w' ? -1 : side === 'e' ? 1 : 0, vy: side === 'n' ? -1 : side === 's' ? 1 : 0 });
        t.advance(1 / 120);
        const s = t.state;
        assert.equal(s.status, 'failed'); assert.equal(s.run.failure.type, 'out-of-bounds');
        assert.equal(s.run.failure.side, side); assert.equal(s.run.contacts, 0); assert.equal(s.run.ship.hull, 100);
        assert.ok(s.run.ship.x > 0 && s.run.ship.x < w && s.run.ship.y > 0 && s.run.ship.y < h);
        const time = s.run.time; t.advance(3); assert.equal(s.run.time, time);
        assert.equal(s.storage.stages['first-crossing'].runs.length, 0);
        t.retry(); assert.equal(t.state.status, 'running'); assert.equal(t.state.run.failure, undefined);
    });
}
test('a normal port has a genuine open west exit rather than an invisible wall', () => {
    const t = create(); t.load(0); t.setShip({ x: 32, y: 120, vx: -2, throttle: -1 });
    t.advance(30);
    assert.equal(t.state.status, 'failed'); assert.equal(t.state.run.failure.side, 'w');
    assert.equal(t.state.run.contacts, 0); assert.ok(t.state.run.ship.vx < 0);
});
test('a casualty crossing an edge also loses the assignment', () => {
    const t = create(); t.load(25);
    const body = t.state.run.jobs.bodies[0];
    Object.assign(body, { x: 5, y: 155, moored: false, vx: -1 });
    t.advance(1 / 120);
    assert.equal(t.state.status, 'failed'); assert.equal(t.state.run.failure.vessel, 'ELVARA');
    assert.equal(t.state.run.failure.side, 'w'); assert.equal(t.state.run.contacts, 0);
});
test('edge warning is local, hull-based and never appears at a closed coast', () => {
    const l = L[0], s = P.ship(30, 100, 0);
    assert.equal(N.warning(l, s).side, 'w');
    s.x = 100; assert.equal(N.warning(l, s), null);
    s.y = 25; assert.equal(N.warning(l, s), null);
});
test('every later island start requires a real positioning leg', () => {
    for (const l of L.filter(l => l.worldNumber === 3 && l.stageNumber > 2)) {
        const t = create(); t.load(L.indexOf(l));
        const s = t.state.run.ship;
        if (s.vessel === 'tug') {
            const attempt = J.canAttach(l, t.state.run.jobs, s, t.state.run.static);
            assert.equal(attempt.ok, false, l.id); assert.ok(attempt.distance > 44, l.id);
        } else {
            const j = l.jobs[0];
            assert.equal(j.type, 'load'); assert.ok(Math.hypot(s.x - j.x, s.y - j.y) > 80, l.id);
            assert.ok(Math.abs(s.x - l.world[0] / 2) < l.world[0] * .25, l.id);
            t.advance(1); assert.equal(t.state.run.jobs.stats.vehiclesLoaded, 0, l.id);
        }
    }
});
test('only changed departure routes are archived; tutorials and other worlds retain PBs', () => {
    const run = { time: 200, contacts: 0, clean: true }, stage = { runs: [run], ghost: [[0, 88, 274, 0]], bestSplits: [80], clears: 1, attempts: 2 };
    // This v3 migration fixture predates the railway. Its schema-15 rail
    // archives are covered separately in rail-infrastructure.test.cjs.
    const stages = Object.fromEntries(L.filter(l=>!l.rail&&!l.polar).map(l => [l.id, stage]));
    const s = S.sanitize({ version: 3, stages, races: { coast: [run], northwatch: [run], archipelago: [run], 'grand-tour': [run] }, archivedRaces: { 'grand-tour-24': [run] } });
    assert.equal(s.version, S.VERSION); assert.equal(Object.keys(s.archivedStages).length, 11);
    for (const l of L.filter(l=>!l.rail&&!l.polar)) assert.equal(!!s.stages[l.id], !S.RESTARTED.includes(l.id) && l.id !== 'backwater', l.id);
    assert.deepEqual(s.archivedStages['backwater-approach-v1'].ghost, stage.ghost);
    assert.equal(s.archivedRaces['northwatch-approach-v1'][0].time, 200);
    assert.deepEqual(s.archivedStages['milk-run'].ghost, stage.ghost);
    assert.deepEqual(s.archivedStages['milk-run'].bestSplits, [80]);
    for (const id of ['archipelago', 'grand-tour']) {
        assert.equal(s.races[id].length, 0); assert.equal(s.archivedRaces[id + '-dock-starts'][0].time, 200);
    }
    assert.equal(s.races.coast[0].time, 200); assert.equal(s.archivedRaces['grand-tour-24'][0].time, 200);
    assert.deepEqual(S.sanitize(s), s, 'Migration must be idempotent on save/reload');
});
test('importing an old logbook cannot revive an incompatible current PB', () => {
    const s = S.create({ getItem: () => null, setItem() {} });
    s.import(JSON.stringify({ version: 3, stages: { 'milk-run': { runs: [{ time: 1, contacts: 0, clean: true }], ghost: [[0, 88, 274, 0]] } } }));
    assert.equal(s.best('milk-run'), null); assert.equal(s.data.archivedStages['milk-run'].runs[0].time, 1);
    s.record('milk-run', { time: 300, contacts: 0, clean: true }, [[0, 284, 271, 0]], []);
    const out = S.sanitize(JSON.parse(s.export()));
    assert.equal(out.stages['milk-run'].runs[0].time, 300); assert.equal(out.archivedStages['milk-run'].runs[0].time, 1);
});
