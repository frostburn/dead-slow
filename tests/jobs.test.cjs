'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const P = require('../src/physics.js'), J = require('../src/jobs.js'), L = require('../src/levels.js'), S = require('../src/storage.js');
const { create } = require('./headless.cjs');
const fixture = id => L.find(l => l.id === id), index = id => L.findIndex(l => l.id === id);
const near = (a, b, e = 1e-8) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
function setup(id = 'bigger-boat') {
    const l = fixture(id), s = P.ship(...l.start, l.spec);
    return { l, s, w: J.create(l, s) };
}
function jobsAdvance(l, w, s, time) {
    let events = [];
    for (let n = 0; n < time * 120; n++)
        events.push(...J.update(l, w, s, 1 / 120));
    return events;
}
function park(s, b) {
    Object.assign(s, {
        x: b.x, y: b.y, a: b.a, vx: 0, vy: 0, r: 0, engine: 0, throttle: 0
    });
}
test('tow instructions name controls before and after attaching the line', () => {
    const { l, s, w } = setup();
    assert.match(l.brief, /use Make fast/);
    assert.doesNotMatch(l.brief + l.tip, /\bwith F\b|\bHold J\b|\bK to\b/);
    assert.match(J.message(l, w, s), /Make fast to attach the towline/);
    assert.ok(J.toggleLine(l, w, s).ok);
    const message = J.message(l, w, s);
    assert.match(message, /0% line load · Reel in \/ Pay out/);
    assert.doesNotMatch(message, /J \/ K/);
});
test('stage and world descriptions contain no development-history references', () => {
    const phrases = /\b(original|newly|v1|v2|moved from|used to be|version [12])\b/i;
    for (const l of L)
        for (const key of ['brief', 'tip', 'kind'])
            assert.ok(!phrases.test(l[key]), `${l.id}: ${key}`);
    for (const w of L.worlds)
        assert.ok(!phrases.test(w.description), w.id);
});
test('all island polygons are convex and all starting/final hulls have room', () => {
    for (const l of L.filter(l => l.worldNumber === 3)) {
        const { s, w } = setup(l.id), obstacles = [...l.obstacles.map(P.rect), ...l.islands.map(i => i.poly)];
        for (const i of l.islands) {
            let sign = 0;
            for (let k = 0; k < i.poly.length; k++) {
                const a = i.poly[k], b = i.poly[(k + 1) % i.poly.length], c = i.poly[(k + 2) % i.poly.length], cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
                if (!sign)
                    sign = Math.sign(cross);
                assert.ok(cross * sign > 0, `${l.id}: ${i.name}`);
            }
        }
        const hulls = [s, ...w.bodies];
        for (const j of [
            ...l.jobs, { ...l.berth, type: 'own' }
        ]) {
            const b = j.type === 'tow' ? J.target(w, j.target) : s;
            const goal = { ...b, x: j.x, y: j.y, a: j.a };
            assert.ok(P.docking(goal, j).inside, l.id);
            hulls.push(goal);
        }
        for (const b of hulls)
            for (const poly of obstacles)
                assert.equal(P.sat(P.hull(b), poly), null, `${l.id}: ${b.name}`);
    }
});
test('every ferry manifest balances, respects capacity, and ends empty', () => {
    for (const l of L.filter(l => l.worldNumber === 3)) {
        let count = 0;
        for (const j of l.jobs) {
            if (j.type === 'load') {
                assert.ok(j.vehicles.every(v => J.VEHICLES[v]));
                count += j.vehicles.length;
            }
            if (j.type === 'unload')
                count -= j.count;
            assert.ok(count >= 0 && count <= (l.spec.capacity || 6), l.id);
        }
        assert.equal(count, 0, l.id);
    }
});
test('every rescue target exists and is assigned exactly once', () => {
    for (const l of L.filter(l => l.worldNumber === 3)) {
        const ids = l.jobs.filter(j => j.type === 'tow').map(j => j.target);
        assert.equal(new Set(ids).size, ids.length, l.id);
        assert.deepEqual(ids.slice().sort(), l.towables.map(t => t.id).sort(), l.id);
    }
});
test('a slack towline applies no impulse to either hull', () => {
    const { s, w } = setup(), b = w.bodies[0], line = { length: 64, strength: 1.65 };
    const out = P.towForce(s, b, line, 1 / 120);
    assert.equal(out.force, 0);
    near(s.vx, 0);
    near(b.vx, 0);
});
test('taut towline conserves linear momentum and pulls both ends together', () => {
    const { s, w } = setup(), b = w.bodies[0];
    b.moored = false;
    const before = s.mass * s.vx + b.mass * b.vx;
    const out = P.towForce(s, b, { length: 28, strength: 1.65 }, 1 / 120);
    assert.ok(out.force > 0);
    assert.ok(s.vx < 0);
    assert.ok(b.vx > 0);
    near(s.mass * s.vx + b.mass * b.vx, before);
});
test('off-centre tow force creates yaw rather than rotating a sprite by fiat', () => {
    const { s, w } = setup(), b = w.bodies[0];
    b.moored = false;
    s.y += 12;
    P.towForce(s, b, { length: 20 }, 1 / 120);
    assert.notEqual(s.r, 0);
    assert.notEqual(b.r, 0);
});
test('a shortening but slack line still cannot push the casualty', () => {
    const { s, w } = setup(), b = w.bodies[0];
    b.moored = false;
    b.vx = 4;
    const before = b.vx;
    P.towForce(s, b, { length: 55 }, 1 / 120);
    near(b.vx, before);
});
test('segment clipping catches crossings, containment, grazing and reverse winding', () => {
    const poly = P.rect({ x: 10, y: 10, w: 20, h: 20 });
    assert.ok(P.segmentHitsPoly({ x: 0, y: 20 }, { x: 50, y: 20 }, poly));
    assert.ok(P.segmentHitsPoly({ x: 15, y: 15 }, { x: 25, y: 25 }, poly));
    assert.ok(P.segmentHitsPoly({ x: 0, y: 10 }, { x: 40, y: 10 }, poly));
    assert.ok(P.segmentHitsPoly({ x: 0, y: 20 }, { x: 40, y: 20 }, poly.slice().reverse()));
    assert.ok(!P.segmentHitsPoly({ x: 0, y: 9 }, { x: 40, y: 9 }, poly));
});
test('uncollected casualties stay at anchor despite current', () => {
    const { l, s, w } = setup('slackwater-salvage'), b = w.bodies[0], start = { x: b.x, y: b.y };
    for (let n = 0; n < 1200; n++)
        J.physics(l, w, s, {}, n / 120, 1 / 120);
    near(b.x, start.x);
    near(b.y, start.y);
});
test('making fast releases the casualty anchor and starts with slack', () => {
    const { l, s, w } = setup();
    const result = J.toggleLine(l, w, s);
    assert.ok(result.ok);
    assert.ok(w.line);
    assert.ok(!w.bodies[0].moored);
    assert.ok(w.bodies[0].wasTowed);
    assert.ok(w.line.length > result.distance || w.line.length > 37);
});
test('attaching requires proximity, low relative speed and line of sight', () => {
    const { l, s, w } = setup();
    s.x += 80;
    assert.ok(!J.canAttach(l, w, s).ok);
    s.x -= 80;
    s.vx = 2;
    assert.ok(!J.canAttach(l, w, s).ok);
    s.vx = 0;
    assert.ok(!J.canAttach(l, w, s, [
        { x: 115, y: 100, w: 5, h: 100 }
    ]).ok);
    assert.ok(J.canAttach(l, w, s).ok);
});
test('a mixed-duty ferry cannot collect a casualty before passenger work', () => {
    const { l, s, w } = setup('cars-and-casualty');
    const b = w.bodies[0];
    s.x = b.x + 60;
    s.y = b.y;
    assert.ok(!J.toggleLine(l, w, s).ok);
    assert.equal(w.line, null);
});
test('casting off preserves both vessels’ velocities and the casualty keeps coasting', () => {
    const { l, s, w } = setup();
    J.toggleLine(l, w, s);
    s.vx = 1.2;
    w.bodies[0].vx = 1.8;
    const x = w.bodies[0].x;
    J.toggleLine(l, w, s);
    near(s.vx, 1.2);
    near(w.bodies[0].vx, 1.8);
    J.physics(l, w, s, {}, 0, 1 / 120);
    assert.ok(w.bodies[0].x > x);
    assert.ok(!w.bodies[0].moored);
});
test('winch moves continuously and stays between 12 and 64 metres', () => {
    for (const direction of [-1, 1]) {
        const { l, s, w } = setup();
        J.toggleLine(l, w, s);
        const start = w.line.length;
        J.physics(l, w, s, { winch: direction }, 0, .1);
        near(w.line.length, start + direction * .085);
        assert.ok(w.stats.winchTime > 0);
        w.line.length = direction < 0 ? 12 : 64;
        J.physics(l, w, s, { winch: direction }, .1, .01);
        near(w.line.length, direction < 0 ? 12 : 64);
    }
});
test('sustained overload parts the line, counts once, and leaves a recoverable vessel', () => {
    const { l, s, w } = setup();
    J.toggleLine(l, w, s);
    s.x += 70;
    let events = [];
    for (let n = 0; n < 90; n++)
        events.push(...J.physics(l, w, s, {}, n / 120, 1 / 120));
    assert.equal(w.line, null);
    assert.equal(w.stats.lineBreaks, 1);
    assert.equal(events.filter(e => e.type === 'line-break').length, 1);
    assert.ok(!w.bodies[0].moored);
});
test('a towline dragged through rock chafes through even without overload', () => {
    const { l, s, w } = setup();
    J.toggleLine(l, w, s);
    let events = [];
    for (let n = 0; n < 110; n++)
        events.push(...J.physics(l, w, s, {}, n / 120, 1 / 120, [
            { x: 119, y: 130, w: 3, h: 52 }
        ]));
    assert.equal(w.line, null);
    assert.equal(w.stats.lineBreaks, 1);
    assert.ok(events.some(e => e.message?.includes('chafed')));
});
test('hull-to-hull contact separates bodies and conserves translational momentum', () => {
    const a = P.ship(0, 0, 0, { length: 20, vx: 2, mass: 1 }), b = P.ship(19, 0, 0, { length: 20, mass: 3 });
    const before = a.mass * a.vx + b.mass * b.vx;
    const hit = P.collideBodies(a, b);
    assert.ok(hit);
    assert.equal(P.sat(P.hull(a), P.hull(b)), null);
    near(a.mass * a.vx + b.mass * b.vx, before);
    assert.ok(b.vx > 0);
});
test('moored vessels are solid and are not knocked off their berth', () => {
    const a = P.ship(0, 0, 0, { length: 20, vx: 2 }), b = P.ship(19, 0, 0, { length: 20, moored: true });
    P.collideBodies(a, b);
    near(b.x, 19);
    near(b.vx, 0);
    assert.equal(P.sat(P.hull(a), P.hull(b)), null);
});
test('vehicles transfer one at a time only after the ramp has opened', () => {
    const { l, s, w } = setup('first-crossing');
    jobsAdvance(l, w, s, 1.5);
    assert.equal(w.onboard.length, 0);
    jobsAdvance(l, w, s, 1.7);
    assert.equal(w.onboard.length, 1);
    assert.equal(w.index, 0);
    assert.ok(w.ramp > .99);
});
test('ferry loading changes mass by the actual manifest and waits for ramp closure', () => {
    const { l, s, w } = setup('first-crossing');
    const events = jobsAdvance(l, w, s, 8);
    assert.equal(w.index, 1);
    assert.equal(w.onboard.length, 4);
    near(s.mass, 1.15 + .115 * 3 + .18);
    near(w.ramp, 0);
    assert.equal(events.filter(e => e.type === 'job').length, 1);
});
test('bus, van and car have distinct payload masses', () => {
    assert.ok(J.VEHICLES.bus.mass > J.VEHICLES.van.mass);
    assert.ok(J.VEHICLES.van.mass > J.VEHICLES.car.mass);
});
test('wrong heading, a partly outside hull or excess speed cannot lower the ramp', () => {
    for (const change of [
        { a: Math.PI }, { x: 108 }, { vx: .3 }, { throttle: 1 }, { engine: .3 }
    ]) {
        const { l, s, w } = setup('first-crossing');
        Object.assign(s, change);
        jobsAdvance(l, w, s, 10);
        assert.equal(w.ramp, 0);
        assert.equal(w.onboard.length, 0);
    }
});
test('interrupting a partial transfer preserves committed vehicles without duplicating them', () => {
    const { l, s, w } = setup('first-crossing');
    jobsAdvance(l, w, s, 3.2);
    assert.equal(w.onboard.length, 1);
    s.throttle = 1;
    jobsAdvance(l, w, s, 2);
    assert.equal(w.ramp, 0);
    assert.equal(w.onboard.length, 1);
    s.throttle = 0;
    jobsAdvance(l, w, s, 8);
    assert.equal(w.index, 1);
    assert.equal(w.onboard.length, 4);
    assert.equal(w.stats.vehiclesLoaded, 4);
});
test('ramp interlock suppresses propulsion without cancelling existing momentum', () => {
    const s = P.ship(0, 0, 0, { engine: 1, throttle: 4, vx: 1 });
    P.integrate(s, { thruster: 1 }, { propulsionDisabled: true }, 1 / 120);
    assert.ok(s.vx > .99 && s.vx < 1);
    assert.ok(s.x > 0);
    near(s.vy, 0);
});
test('unloading empties the manifest and restores lightship mass', () => {
    const { l, s, w } = setup('first-crossing');
    jobsAdvance(l, w, s, 8);
    park(s, l.jobs[1]);
    jobsAdvance(l, w, s, 8);
    assert.equal(w.index, 2);
    assert.equal(w.onboard.length, 0);
    near(s.mass, w.baseMass);
    assert.equal(w.stats.vehiclesDelivered, 4);
    assert.ok(J.ready(l, w));
});
test('a rescue requires towing history, alignment, whole hull and two steady seconds', () => {
    const { l, s, w } = setup(), b = w.bodies[0], j = l.jobs[0];
    park(b, j);
    jobsAdvance(l, w, s, 3);
    assert.equal(w.index, 0);
    b.wasTowed = true;
    b.a = Math.PI;
    jobsAdvance(l, w, s, 3);
    assert.equal(w.index, 0);
    b.a = 0;
    b.vx = 1;
    jobsAdvance(l, w, s, 3);
    assert.equal(w.index, 0);
    b.vx = 0;
    const x = b.x;
    b.x += 30;
    jobsAdvance(l, w, s, 3);
    assert.equal(w.index, 0);
    b.x = x;
    jobsAdvance(l, w, s, 1.5);
    assert.equal(w.index, 0);
    jobsAdvance(l, w, s, .6);
    assert.equal(w.index, 1);
    assert.ok(b.moored && b.delivered);
    assert.equal(w.stats.vesselsDelivered, 1);
});
test('delivering a casualty releases the line but does not finish the player’s mooring', () => {
    const t = create();
    t.load(index('bigger-boat'));
    t.lineAction();
    const r = t.state.run, b = r.jobs.bodies[0], j = t.state.level.jobs[0];
    park(b, j);
    r.jobs.line = null;
    t.advance(2.2);
    assert.equal(r.jobs.index, 1);
    assert.equal(t.state.status, 'running');
    assert.ok(b.delivered);
    assert.ok(!r.dock.inside);
});
test('a circuit records a parted towline as unclean, including across retries', () => {
    const t = create();
    t.marathon('archipelago');
    t.state.run.jobs.stats.lineBreaks = 1;
    t.advance(.2);
    t.retry();
    assert.equal(t.state.marathon.lineBreaks, 1);
    t.state.run.jobs.index = t.state.level.jobs.length;
    t.state.run.jobs.onboard = [];
    t.state.run.jobs.stats.lineBreaks = 1;
    park(t.state.run.ship, t.state.level.berth);
    t.advance(2.2);
    assert.equal(t.state.status, 'complete');
    assert.equal(t.state.run.result.clean, false);
});
test('opening a menu freezes every hull and the towline, and retry resets the whole job', () => {
    const t = create();
    t.load(index('bigger-boat'));
    t.lineAction();
    t.throttle(4);
    t.advance(7);
    const before = JSON.stringify(t.state.run.jobs);
    t.pause();
    t.advance(30);
    assert.equal(JSON.stringify(t.state.run.jobs), before);
    assert.ok(t.state.run.pausedUsed);
    t.retry();
    assert.equal(t.state.run.jobs.line, null);
    assert.ok(t.state.run.jobs.bodies[0].moored);
    assert.equal(t.state.run.jobs.stats.lineChanges, 0);
    assert.equal(t.state.run.time, 0);
});
test('a gate safety strip includes towed hulls even when the tug is elsewhere', () => {
    const t = create();
    t.load(index('bigger-boat'));
    const l = t.state.level, r = t.state.run;
    const gate = {
        id: 'test-fleet-gate', x: 74, y: 137, w: 8, h: 38, kind: 'timed', period: 10, open: 1
    };
    l.gates.push(gate);
    r.gateStates[gate.id] = { open: true };
    try {
        t.advance(2);
        assert.ok(r.gateStates[gate.id].held);
    }
    finally {
        l.gates.pop();
    }
});
test('gate safety also holds for the straight towline between two clear hulls', () => {
    const t = create();
    t.load(index('bigger-boat'));
    t.lineAction();
    const l = t.state.level, r = t.state.run;
    const gate = {
        id: 'test-rope-gate', x: 122, y: 140, w: 4, h: 32, kind: 'timed', period: 10, open: 1
    };
    l.gates.push(gate);
    r.gateStates[gate.id] = { open: true };
    try {
        t.advance(2);
        assert.ok(r.gateStates[gate.id].held);
        assert.ok(r.jobs.line);
    }
    finally {
        l.gates.pop();
    }
});
test('v2 Grand Tour records are archived, not compared to the 48-stage route', () => {
    const run = { time: 2700, contacts: 0, clean: true }, data = { version: 2, races: { coast: [run], northwatch: [run], 'grand-tour': [run] }, stages: { 'dead-slow': { runs: [
                    { ...run, time: 71 }
                ], ghost: [[0, 53, 121, 0]], bestSplits: [] } } };
    const out = S.sanitize(data);
    assert.equal(out.version, S.VERSION);
    assert.equal(out.races['grand-tour'].length, 0);
    assert.equal(out.archivedRaces['grand-tour-24'][0].time, 2700);
    assert.equal(out.races.coast[0].time, 2700);
    assert.equal(out.stages['dead-slow'].runs[0].time, 71);
});
test('current export/import preserves island records, ghosts and archived route records', () => {
    const s = S.create({ getItem: () => null, setItem() {
        } });
    s.record('bigger-boat', { time: 188, contacts: 0, clean: true }, [[0, 153, 156, 0], [10, 165, 156, 0]], [180]);
    s.recordRace('archipelago', { time: 4500, contacts: 0, clean: true });
    s.data.archivedRaces['grand-tour-24'] = [
        { time: 3000, contacts: 0, clean: true }
    ];
    const b = S.create({ getItem: () => null, setItem() {
        } });
    b.import(s.export());
    assert.equal(b.best('bigger-boat').time, 188);
    assert.equal(b.bestRace('archipelago').time, 4500);
    assert.equal(b.data.archivedRaces['grand-tour-24'][0].time, 3000);
    assert.equal(b.stage('bigger-boat').ghost.length, 2);
});
for (const l of L.filter(l => l.worldNumber === 3))
    test(`${l.id}: ordered service jobs gate the final arrival`, () => {
        const t = create();
        t.load(L.indexOf(l));
        const r = t.state.run;
        r.buoyIndex = l.buoys.length;
        park(r.ship, l.berth);
        t.advance(2.3);
        assert.notEqual(t.state.status, 'complete');
        // Isolate objective guards from navigation: this test explicitly positions hulls.
        for (const j of l.jobs) {
            if (j.type === 'tow') {
                const b = J.target(r.jobs, j.target);
                b.wasTowed = true;
                b.moored = false;
                park(b, j);
                t.advance(2.3);
                assert.ok(b.delivered, j.name);
            }
            else {
                park(r.ship, j);
                t.advance(11);
            }
        }
        assert.equal(r.jobs.index, l.jobs.length, l.id);
        assert.equal(r.jobs.onboard.length, 0);
        park(r.ship, l.berth);
        t.advance(2.3);
        assert.equal(t.state.status, 'complete', l.id);
    });
