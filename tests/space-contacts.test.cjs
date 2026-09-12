'use strict';
// Exercise the production space-update/contact path. Deliberately overlapping
// test hulls isolate impact response; these are not author-time recordings.
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/physics.js');
const X = require('../src/space.js');
const L = require('../src/levels.js');
const { create } = require('./headless.cjs');
const DT = 1 / 120;
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const load = id => { const t = create(); t.load(L.findIndex(l => l.id === id)); return t; };

// Put the stern just into the obstacle's right edge at the next physics tick.
// Being far from the origin must not add energy to an otherwise gentle touch.
function touch(t, obstacle, closingSpeed = 0) {
    const s = t.state.run.ship, poly = obstacle.poly || P.hull(obstacle);
    const vx = obstacle.vx - closingSpeed, vy = obstacle.vy;
    Object.assign(s, {
        x: P.bounds(poly).maxX + s.length / 2 - .2 - vx * DT,
        y: obstacle.y - vy * DT, a: 0, vx, vy, r: 0, engine: 0, throttle: 0
    });
    const expected = { ...s, x: s.x + vx * DT, y: s.y + vy * DT };
    const hit = P.contact(expected, { poly, velocity: { x: obstacle.vx, y: obstacle.vy } });
    assert.ok(hit, 'the regression setup must actually make contact');
    t.advance(DT);
    for (const key of ['vx', 'vy', 'r']) near(s[key], expected[key]);
    near(s.hull, hit.impact < .1 ? 100 : Math.max(0, 100 - .5 - hit.impact ** 2 * 5));
    assert.equal(t.state.run.contacts, hit.impact < .1 ? 0 : 1);
    return t.state;
}

test('gentle contact with the static shard does not destroy or launch the spacecraft', () => {
    const t = load('wandering-stone');
    const shard = t.state.run.space.rocks.find(b => b.id === 'shard');
    const state = touch(t, shard, .2);
    assert.equal(state.status, 'running');
    assert.ok(state.run.ship.hull > 99);
    assert.ok(Math.hypot(state.run.ship.vx, state.run.ship.vy) < .3);
});

test('a genuinely high-speed asteroid impact still destroys the spacecraft', () => {
    const t = load('wandering-stone');
    const shard = t.state.run.space.rocks.find(b => b.id === 'shard');
    assert.equal(touch(t, shard, 12).status, 'failed');
    assert.equal(t.state.run.failure.type, 'hull-loss');
});

test('a co-moving asteroid touch uses its ephemeris velocity, not world coordinates', () => {
    const t = load('wandering-stone');
    t.state.run.time = 37;
    const rock = t.state.level.space.asteroids.find(b => b.id === 'hilda');
    const state = touch(t, X.asteroid(rock, t.state.run.time + DT));
    assert.equal(state.status, 'running');
    assert.equal(state.run.ship.hull, 100);
});

for (const id of ['newtons-broadside', 'moving-argument']) {
    test(`${id}: target-vessel contact uses actual velocity`, () => {
        const t = load(id);
        t.state.run.time = 37;
        const target = X.pose(t.state.level.space.target, t.state.run.time + DT);
        const state = touch(t, target, .2);
        assert.equal(state.status, 'running');
        assert.ok(state.run.ship.hull > 99);
    });
}

for (const closingSpeed of [0, .2]) {
    test(`docked-tender contact follows the moving mothership (${closingSpeed} m/s approach)`, () => {
        const t = load('family-reunion'), run = t.state.run, st = run.space;
        const berth = X.activeTarget(t.state.level, run);
        t.setShip({ x: berth.x, y: berth.y, a: berth.a });
        t.advance(2.01);
        assert.equal(st.phase, 1, 'the first tender must be captured through the normal docking hold');
        st.mother.vx = 1.1; st.mother.vy = -.6;
        const tender = st.tenders[0], nextMother = {
            ...st.mother, x: st.mother.x + st.mother.vx * DT, y: st.mother.y + st.mother.vy * DT
        };
        const attached = { ...tender, ...P.localPoint(nextMother, 0, tender.offset),
            a: st.mother.a, vx: st.mother.vx, vy: st.mother.vy };
        const state = touch(t, attached, closingSpeed);
        assert.equal(state.status, 'running');
        assert.ok(state.run.ship.hull > 99);
    });
}
