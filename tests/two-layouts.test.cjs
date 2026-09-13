'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs');
const P = require('../src/physics.js'), L = require('../src/levels.js');
const R = require('../src/rampage.js'), S = require('../src/storage.js');
const {create} = require('./headless.cjs'), {replay} = require('../tools/verify-island-runs.cjs');
const get = id => L.find(l => l.id === id);
const sample = time => ({runs:[{time, contacts:0, clean:true}], ghost:[[0,1,2,0]], bestSplits:[12], clears:1, attempts:2});

test('Granite Needle starts broadside with clear hulls and a remote tug', () => {
    const l = get('granite-needle'), t = create(); t.load(L.indexOf(l));
    const r = t.state.run, barge = r.jobs.bodies[0];
    assert.equal(barge.a, -Math.PI / 2);
    assert.equal(l.jobs[0].a, 0, 'repair yard still requires an easterly heading');
    for (const b of [r.ship, barge]) {
        assert.ok(P.hull(b).every(p=>p.x>0 && p.y>0 && p.x<l.world[0] && p.y<l.world[1]));
        for (const o of r.static) assert.equal(P.sat(P.hull(b), o.poly), null);
    }
    assert.equal(P.sat(P.hull(r.ship), P.hull(barge)), null);
    const ends = P.towEndpoints(r.ship, barge);
    assert.ok(Math.hypot(ends.a.x-ends.b.x, ends.a.y-ends.b.y)>44);
    assert.match(l.brief, /broadside/);
});

test('Teardrop Mere lies southwest of its earlier position and below the hill contours', () => {
    const l = get('gerbo-whiskerdoom'), c = l.rampage, lake = c.lakes.find(l=>l.name==='TEARDROP MERE');
    assert.ok(lake.x<2070 && lake.y>1100);
    for (let i=0; i<360; i++) {
        const p = R.lakePoint(lake, i*Math.PI/180);
        assert.ok(p.x>0 && p.y>0 && p.x<l.world[0] && p.y<l.world[1]);
        assert.ok(R.terrain(c,p.x,p.y).height<.2, 'shore stays below the first 5 m contour');
        for (const rock of c.rocks) assert.equal(R.circleContact(p, 1, R.rockPolygon(rock)), null);
    }
    assert.equal(R.water(c,{x:l.start[0],y:l.start[1]}),0);
    assert.equal(R.water(c,c.rescue),0); assert.equal(R.water(c,c.finish),0);
});

for (const id of ['granite-needle','gerbo-whiskerdoom']) test(`${id}: clean production recording for the revised layout`, () => {
    const f = require(`./fixtures/${id}-controls.json`), t = replay(f), r = t.state.run;
    assert.equal(t.state.status,'complete'); assert.equal(r.result.clean,true);
    assert.ok(Math.abs(r.time-f.expectedTime)<1/120); assert.equal(r.ship.hull,100);
    if (id==='granite-needle') {
        assert.equal(r.jobs.bodies[0].delivered,true); assert.equal(r.jobs.bodies[0].hull,100);
        assert.equal(r.jobs.stats.lineBreaks,0); assert.equal(r.jobs.stats.lineChanges,2);
        assert.ok(f.events.some(e=>e.rudder) && f.events.some(e=>e.thruster), 'pickup requires steering, not just a copied straight-line run');
    } else { assert.equal(r.rampage.lady.health,100); assert.ok(r.rampage.rescued); }
});

test('new broadside recording is in the reproducible offline watch library', () => {
    assert.equal(fs.readFileSync(require.resolve('../src/verification.js'),'utf8'),require('../tools/sync-replays.cjs').source());
    const runs=require('../src/verification.js').runs;
    assert.equal(runs.find(f=>f.level==='granite-needle').expectedTime,373.575);
    assert.equal(runs.length,37);
});

test('schema 10 preserves both changed layouts and affected circuits in separate archives', () => {
    const d=S.fresh(); d.version=10;
    for (const id of ['granite-needle','gerbo-whiskerdoom','bigger-boat','gerbo-first-outing']) d.stages[id]=sample(123);
    d.archivedStages['granite-needle']=sample(89);
    d.archivedStages['gerbo-whiskerdoom-preview']=sample(100);
    for (const id of Object.keys(d.races)) d.races[id]=[{time:1000,contacts:0,clean:true}];
    const n=S.sanitize(d);
    for (const id of ['granite-needle','gerbo-whiskerdoom']) {
        assert.equal(n.stages[id],undefined);
        assert.deepEqual(n.archivedStages[id+'-layout-v1'].ghost,d.stages[id].ghost);
        assert.deepEqual(n.archivedStages[id+'-layout-v1'].bestSplits,[12]);
    }
    for (const id of ['archipelago','gerbozilla','grand-tour']) {
        assert.equal(n.races[id].length,0); assert.equal(n.archivedRaces[id+'-layout-v2'][0].time,1000);
    }
    for (const id of ['coast','northwatch','meridian']) assert.equal(n.races[id][0].time,1000);
    assert.equal(n.stages['bigger-boat'].runs[0].time,123);
    assert.equal(n.stages['gerbo-first-outing'].runs[0].time,123);
    assert.equal(n.archivedStages['granite-needle'].runs[0].time,89);
    assert.equal(n.archivedStages['gerbo-whiskerdoom-preview'].runs[0].time,100);
    assert.deepEqual(S.sanitize(n),n);
});

test('older imports do not mislabel preview or old Grand Tour records as released layouts', () => {
    for (const version of [3,4,5,9]) {
        const d=S.fresh();d.version=version;d.stages['granite-needle']=sample(120);
        d.stages['gerbo-whiskerdoom']=sample(121);
        d.races['grand-tour']=[{time:1000,contacts:0,clean:true}];
        const n=S.sanitize(d);
        assert.equal(n.archivedStages['gerbo-whiskerdoom-layout-v1'],undefined);
        assert.equal(n.archivedRaces['grand-tour-layout-v2'].length,0);
        if(version<4) assert.equal(n.archivedStages['granite-needle-layout-v1'],undefined);
        else assert.equal(n.archivedStages['granite-needle-layout-v1'].runs[0].time,120);
    }
});

test('current records survive import and the previous schema remains accepted', () => {
    const store=S.create({getItem:()=>null,setItem(){}}), d=S.fresh();
    d.stages['granite-needle']=sample(374);d.stages['gerbo-whiskerdoom']=sample(457);
    d.races.archipelago=[{time:1000,contacts:0,clean:true}];
    store.import(JSON.stringify(d));assert.equal(store.best('granite-needle').time,374);
    assert.equal(store.bestRace('archipelago').time,1000);
    d.version=10;store.import(JSON.stringify(d));assert.equal(store.best('granite-needle'),null);
    assert.equal(store.data.archivedStages['granite-needle-layout-v1'].runs[0].time,374);
});
