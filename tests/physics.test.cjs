'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const P = require('../src/physics.js'), levels = require('../src/levels.js');
const step = (s, seconds, input = {}, env = {}, dt = 1 / 120) => {
    for (let i = 0; i < Math.round(seconds / dt); i++)
        P.integrate(s, input, env, dt);
    return s;
};
const approx = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) < tolerance, `${a} differs from ${b}`);
test('neutral coasts rather than applying an artificial brake', () => {
    const s = P.ship(0, 0, 0, { vx: 4 });
    step(s, 15);
    assert.ok(s.x > 40);
    assert.ok(s.vx > 2);
    assert.equal(s.throttle, 0);
});
test('reverse order spools; it cannot instantly reverse engine output', () => {
    const s = P.ship(0, 0, 0, { vx: 4, engine: 1, throttle: -3 });
    step(s, .5);
    assert.ok(s.engine > .6);
    step(s, 10);
    assert.ok(s.engine < -.9);
});
test('opposite thrust stops the ship much sooner than neutral', () => {
    const a = P.ship(0, 0, 0, { vx: 4, throttle: -3 }), b = P.ship(0, 0, 0, { vx: 4 });
    step(a, 20);
    step(b, 20);
    assert.ok(a.vx < .5);
    assert.ok(b.vx > 2);
    assert.ok(a.x < b.x - 10);
});
test('dead-slow ahead settles below the no-wake speed limit', () => {
    const s = P.ship(0, 0, 0, { throttle: 1 });
    step(s, 300);
    assert.ok(s.vx > 1.3 && s.vx < 1.6);
});
test('full ahead settles at a plausible restricted-water scale', () => {
    const s = P.ship(0, 0, 0, { throttle: 4 });
    step(s, 250);
    assert.ok(s.vx > 5 && s.vx < 6);
});
test('port/starboard mirror one another in still water', () => {
    const a = P.ship(0, 0, 0, { vx: 3 }), b = P.ship(0, 0, 0, { vx: 3 });
    step(a, 12, { rudder: 1 });
    step(b, 12, { rudder: -1 });
    approx(a.x, b.x);
    approx(a.y, -b.y);
    approx(a.a, -b.a);
});
test('rudder reverses steering effect astern', () => {
    const a = P.ship(0, 0, 0, { vx: 3 }), b = P.ship(0, 0, 0, { vx: -3 });
    step(a, 8, { rudder: 1 });
    step(b, 8, { rudder: 1 });
    assert.ok(a.r > 0);
    assert.ok(b.r < 0);
});
test('unpowered stationary rudder cannot pivot a ship', () => {
    const s = P.ship(0, 0);
    step(s, 20, { rudder: 1 });
    approx(s.a, 0);
    approx(s.x, 0);
});
test('bow thruster moves and rotates a stationary bow', () => {
    const s = P.ship(0, 0);
    step(s, 10, { thruster: 1 });
    assert.ok(s.a > .1);
    assert.ok(s.y > 1);
});
test('bow thruster loses authority at speed', () => {
    const a = P.ship(0, 0), b = P.ship(0, 0, 0, { vx: 5 });
    step(a, 3, { thruster: 1 });
    step(b, 3, { thruster: 1 });
    assert.ok(a.r > b.r * 2);
});
test('loaded ship accelerates more slowly under the same propeller thrust', () => {
    const a = P.ship(0, 0, 0, { throttle: 4 }), b = P.ship(0, 0, 0, { throttle: 4, mass: 1.8 });
    step(a, 20);
    step(b, 20);
    assert.ok(a.vx > b.vx + .6);
});
test('water-relative resistance lets a current carry a stopped vessel', () => {
    const s = P.ship(0, 0);
    step(s, 30, {}, { current: { x: 0, y: .5 } });
    assert.ok(s.y > 10);
    assert.ok(s.vy > .45 && s.vy < .51);
});
test('grounding suppresses thrust and rotation', () => {
    const s = P.ship(0, 0, 0, { vx: 3, r: .1, throttle: 4 });
    step(s, 5, { thruster: 1 }, { grounded: true });
    assert.ok(Math.hypot(s.vx, s.vy) < .03);
    assert.ok(Math.abs(s.r) < .003);
});
test('angle wrapping is continuous across north/360 degrees', () => {
    approx(P.wrap(3 * Math.PI), -Math.PI);
    approx(P.wrap(-3 * Math.PI), -Math.PI);
    approx(P.wrap(2 * Math.PI + .1), .1);
});
test('SAT separates, overlaps, and handles containment correctly', () => {
    assert.equal(P.sat(P.box(0, 0, 10, 10), P.box(20, 0, 10, 10)), null);
    const hit = P.sat(P.box(0, 0, 10, 10), P.box(8, 0, 10, 10));
    approx(hit.depth, 2);
    assert.ok(hit.normal.x < 0);
    const inside = P.sat(P.box(0, 0, 2, 2), P.box(0, 0, 10, 10));
    approx(inside.depth, 6);
});
test('collision impulse removes penetration and dissipates a head-on impact', () => {
    const s = P.ship(10, 20, 0, { vx: 3 }), wall = { x: 20, y: 0, w: 10, h: 40 };
    const hit = P.contact(s, wall);
    assert.ok(hit.impact > 2.9);
    assert.equal(P.sat(P.hull(s), P.rect(wall)), null);
    assert.ok(Math.abs(s.vx) < .1);
});
test('a moving obstacle transfers normal velocity', () => {
    const s = P.ship(10, 20), wall = {
        x: 20, y: 0, w: 10, h: 40, velocity: { x: -1, y: 0 }
    };
    const hit = P.contact(s, wall);
    assert.ok(hit.impact > .9);
    assert.ok(s.vx < -.9);
});
test('mooring requires whole hull, correct bow, low speed, low turn and clearance', () => {
    const b = {
        x: 0, y: 0, a: 0, l: 47, w: 22
    }, s = P.ship(0, 0);
    assert.ok(P.docking(s, b).ready);
    assert.ok(!P.docking({ ...s, a: Math.PI }, b).ready);
    assert.ok(!P.docking({ ...s, x: 15 }, b).inside);
    assert.ok(!P.docking({ ...s, vx: 1 }, b).slow);
    assert.ok(!P.docking({ ...s, r: .04 }, b).slow);
    assert.ok(!P.docking(s, b, false).ready);
});
test('traffic phase is repeatable and reflects continuously at endpoints', () => {
    const t = { from: [20, 30], to: [20, 130], speed: 2 };
    assert.deepEqual(P.trafficState(t, 15), P.trafficState(t, 115));
    const a = P.trafficState(t, 49.99), b = P.trafficState(t, 50.01);
    approx(a.y, b.y);
    assert.ok(a.vy > 0 && b.vy < 0);
});
test('signal timing, key clearance, and safety hold', () => {
    const g = { kind: 'timed', period: 34, open: 14 };
    assert.ok(P.signal(g, 0).open);
    assert.ok(!P.signal(g, 14).open);
    assert.ok(P.signal(g, 34).open);
    assert.ok(P.signal(g, 15, 0, 'entry', true).held);
    assert.ok(!P.signal({ ...g, keys: 1 }, 2, 0).open);
    assert.ok(P.signal({ ...g, keys: 1 }, 2, 1).open);
    assert.ok(P.signal({ kind: 'key', keys: 2 }, 0, 2).open);
});
test('lock interlock never requests both gates open', () => {
    for (const state of ['entry', 'cycling', 'exit']) {
        const a = P.signal({ kind: 'lock-in' }, 0, 0, state), b = P.signal({ kind: 'lock-out' }, 0, 0, state);
        assert.ok(!(a.open && b.open));
    }
    assert.ok(!P.signal({ kind: 'lock-out' }, 0, 0, 'cycling').open);
});
test('tidal phases recur and span safe and unsafe draft', () => {
    const t = levels.find(l => l.tide).tide;
    approx(P.tideDepth(t, 12), P.tideDepth(t, 12 + t.period));
    assert.ok(P.tideDepth(t, 0) < 4.6);
    assert.ok(P.tideDepth(t, 40) > 4.6);
    assert.ok(P.tideDepth(t, 70) < 4.6);
});
test('integration remains close when substep is halved', () => {
    const a = P.ship(0, 0, 0, { throttle: 3 }), b = P.ship(0, 0, 0, { throttle: 3 });
    step(a, 20, { rudder: .6 }, {}, 1 / 120);
    step(b, 20, { rudder: .6 }, {}, 1 / 240);
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < .05);
    assert.ok(Math.abs(a.a - b.a) < .001);
});
test('all 36 spawns and target hulls are clear of fixed geometry', () => {
    const harborLevels = levels.filter(l => !l.space && !l.rampage && !l.rail && !l.polar);
    assert.equal(harborLevels.length, 36);
    for (const l of harborLevels) {
        const spawn = P.ship(...l.start, l.spec), target = P.ship(l.berth.x, l.berth.y, l.berth.a, l.spec);
        for (const s of [spawn, target]) {
            const poly = P.hull(s);
            assert.ok(poly.every(p => p.x >= 20 && p.y >= 20 && p.x <= l.world[0] - 20 && p.y <= l.world[1] - 20), l.id);
            for (const o of l.obstacles)
                assert.equal(P.sat(poly, P.rect(o)), null, l.id + ' intersects a pier');
        }
        assert.ok(P.docking(target, l.berth).ready, l.id + ' impossible berth');
    }
});
test('the first harbor has a complete, clean physical docking trajectory', () => {
    const l = levels[0], s = P.ship(...l.start);
    let t = 0, phase = 0, hold = 0;
    s.throttle = 4;
    while (t < 100) {
        if (phase === 0 && t >= 50) {
            s.throttle = -3;
            phase = 1;
        }
        if (phase === 1 && s.vx < .7) {
            s.throttle = 0;
            phase = 2;
        }
        step(s, 1 / 120);
        t += 1 / 120;
        const ready = P.docking(s, l.berth).ready && s.throttle === 0 && Math.abs(s.engine) < .15;
        hold = ready ? hold + 1 / 120 : 0;
        if (hold >= 2)
            break;
    }
    assert.ok(hold >= 2);
    assert.ok(t < 80);
    assert.ok(s.x > 278 && s.x < 300);
});
