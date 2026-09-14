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
