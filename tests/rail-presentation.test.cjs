'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rail.js'),L=require('../src/rail-levels.js'),{create}=require('./headless.cjs');
test('lookahead warns before the first tight curve and never changes the occupied route',()=>{
    const st=R.create(L[2]),g=R.engineGroup(st);g.cars=g.cars.slice(0,3);
    g.path=[{id:'steep',dir:1,start:0,end:st.net.edges.steep.length}];
    g.cars.forEach((c,i)=>{c.q=150-i*18;c.v=8;});
    const before=JSON.stringify(st),warning=R.danger(st);
    assert.equal(warning.severity,1);assert.equal(warning.cars.length,0);
    assert.equal(warning.ahead.limit,5.5);assert.ok(warning.ahead.distance>40);
    assert.equal(JSON.stringify(st),before);
});
test('the last wagon can be in danger while the locomotive is under the limit',()=>{
    const st=R.create(L[2]),g=R.engineGroup(st);g.cars=g.cars.slice(0,3);
    g.path=[{id:'steep',dir:1,start:0,end:st.net.edges.steep.length}];
    g.cars.forEach((c,i)=>{c.q=350-i*18;c.v=4;});g.cars.at(-1).v=7;
    const warning=R.danger(st);assert.equal(warning.severity,2);assert.equal(warning.cars[0].id,'S2');
    assert.equal(st.failure,null);assert.equal(g.cars.at(-1).curveTime,0);
});
test('railway watch playback completes through live controls and never writes records',()=>{
    const t=create();t.cheats.watch('long-grade-1',0);t.cheats.step(600);
    const report=t.cheats.report();assert.ok(report.verified);assert.ok(report.rail.couplings===1);
    assert.equal(t.state.storage.stages['long-grade-1'].clears,0);assert.equal(t.state.run.pausedUsed,true);
});
test('ferry watch run loads both decks and leaves the engine ashore through ordinary controls',()=>{
    const t=create(),record=require('../src/verification.js').runs.find(r=>r.level==='long-grade-10');
    t.cheats.watch(record.level,0);
    for(let left=record.duration;left>0;left-=600)t.cheats.step(Math.min(600,left));
    assert.ok(t.cheats.report().verified);assert.equal(t.state.storage.stages[record.level].clears,0);
    assert.deepEqual(t.state.run.rail.completed,['port','starboard','ashore']);
});
test('railway logbook shows local circuit and Grand Tour clean and overall records',()=>{
    const t=create();t.cheats.level('long-grade-9');
    t.state.storage.races['long-grade']=[{time:123,clean:false},{time:135,clean:true}];
    t.state.storage.races['grand-tour']=[{time:456,clean:false},{time:480,clean:true}];
    t.action('log');const html=t.html('dialog');
    for(const label of ['World 5 · The Long Grade','Grand Tour · 72',t.format(123),t.format(135),t.format(456),t.format(480)])assert.ok(html.includes(label),label);
});
test('field logbook exposes records archived before volcanic hills',()=>{
    require('../src/rampage-view.js');const t=create({fieldDialog:global.GerboView.dialog});t.cheats.level('gerbo-downhill');
    t.state.storage.archivedStages['gerbo-downhill-topography-v1']={runs:[{time:123,clean:true}],ghost:[],bestSplits:[]};
    t.action('log');assert.ok(t.html('dialog').includes(t.format(123)));assert.match(t.html('dialog'),/archiv/i);
});
