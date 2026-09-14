'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rail.js'),L=require('../src/rail-levels.js'),Catalog=require('../src/levels.js'),{create}=require('./headless.cjs');
const step=(st,seconds)=>{for(let i=0;i<seconds*120;i++)R.update(st,1/120);};
function contactFixture(speed=1) {
    const level=structuredClone(L[0]);level.rail.groups=[
        {cars:[{id:'engine',edge:'receiving',s:100,length:20,mass:80000,powered:true}]},
        {secured:true,cars:[{id:'waiting',edge:'receiving',s:119,length:16,mass:42000}]}];
    const st=R.create(level);R.engineGroup(st).cars[0].v=speed;return st;
}
test('buffer stopping cannot erase an excessive coupling approach',()=>{
    const st=contactFixture();step(st,.1);
    assert.equal(st.failure,null);assert.equal(R.metrics(st).speed,0);
    assert.equal(st.stats.contacts,1);assert.equal(R.command(st,'couple'),false);
    step(st,2);assert.equal(R.command(st,'couple'),false);assert.equal(st.stats.contacts,1);
    // Separation/reapproach fixture: geometry isolation, not a control recording.
    const engine=R.engineGroup(st).cars[0];engine.q-=4;step(st,.1);assert.equal(st.bufferImpact,null);
    engine.q=100;engine.v=.3;step(st,.1);
    assert.equal(st.stats.contacts,2);assert.equal(R.command(st,'couple'),true);
});
test('gentle buffer contact is counted once and remains couplable',()=>{
    const st=contactFixture(.3);step(st,.1);step(st,3);
    assert.equal(st.stats.contacts,1);assert.equal(R.command(st,'couple'),true);
});
test('2 km/h coupling limit is enforced even before touching the buffers',()=>{
    const st=contactFixture(.6);R.engineGroup(st).cars[0].q-=1;
    assert.equal(R.command(st,'couple'),false);assert.equal(st.stats.contacts,0);
});
test('parking the complete train requires all listed wagons to stay coupled',()=>{
    const st=R.create(L[0]),g=R.engineGroup(st);g.cars=st.groups.flatMap(cut=>cut.cars);st.groups=[g];
    g.path=[{id:'siding',dir:1,start:0,end:st.net.edges.siding.length}];
    g.cars.forEach((c,i)=>{c.q=230-i*22;c.v=0;c.hand=true;});st.completed=['first-stop','collect'];
    const task=st.config.tasks.at(-1);assert.equal(R.taskReady(st,task),true);
    assert.ok(R.command(st,'uncouple','engine'));assert.equal(R.taskReady(st,task),false);
    assert.equal(st.completed.includes('collect'),true);
});
test('survivable track-end impacts are debounced and propagate to non-clean records',()=>{
    const t=create();t.load(Catalog.findIndex(l=>l.id==='long-grade-3'),true);
    const st=t.state.run.rail,g=R.engineGroup(st),length=st.net.edges['works-road'].length;
    g.path=[{id:'works-road',dir:1,start:0,end:length}];
    g.cars.forEach((c,i)=>{c.q=length-11.9-i*18;c.v=1;});t.advance(.1);
    assert.equal(st.failure,null);assert.equal(st.stats.contacts,1);assert.equal(t.state.run.contacts,1);
    t.advance(.1);assert.equal(st.stats.contacts,1);
    g.cars.forEach((c,i)=>{c.q=i?280.8-(i-1)*17.2:300;c.v=0;c.hand=true;});t.advance(4);
    assert.equal(t.state.status,'complete');assert.equal(t.state.run.result.contacts,1);assert.equal(t.state.run.result.clean,false);
    assert.equal(t.state.storage.stages['long-grade-3'].runs[0].clean,false);
});
