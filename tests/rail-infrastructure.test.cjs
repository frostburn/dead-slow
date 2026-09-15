'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rail.js'),L=require('../src/rail-levels.js');
test('revised bridge and cargo records are archived once without losing other missions',()=>{
    const S=require('../src/storage.js'),old=S.fresh();old.version=14;
    for(const id of ['long-grade-6','long-grade-7','long-grade-8'])old.stages[id]={runs:[{time:600,clean:true,contacts:0}]};
    const next=S.sanitize(old);
    assert.ok(next.stages['long-grade-6']);assert.equal(next.stages['long-grade-8'],undefined);
    assert.ok(next.archivedStages['long-grade-7-support-v1']);assert.ok(next.archivedStages['long-grade-8-clearance-v1']);
    assert.deepEqual(S.sanitize(next),next);
});
// Geometry and force probes below are isolated fixtures, not completion routes.
test('bridge requires adjacent paired support even below the mass rating',()=>{
    const st=R.create(L[6]),g=R.engineGroup(st);
    const support=g.cars.find(c=>c.id==='E2');g.cars=g.cars.filter(c=>c.id!=='E2');
    st.groups.push({id:'detached',path:g.path.map(p=>({...p})),cars:[support],brake:1,orders:[{t:-100,value:1}]});
    g.path=[{id:'bridge',dir:1,start:0,end:140},{id:'receiving',dir:1,start:140,end:840}];
    g.cars.forEach((c,i)=>c.q=c.id==='T2'?60:250+i*30);
    const b=R.bridges(st)[0];assert.equal(b.over,false);assert.deepEqual(b.unpaired,[['T2','E2']]);
    R.update(st,1/120);assert.match(st.failure,/T2 and E2/);
});
test('a bridge weighs every overlapping body, including a wagon whose centre has left',()=>{
    const st=R.create(L[6]),g=R.engineGroup(st),e=st.net.edges.bridge;
    g.path=[{id:'bridge',dir:1,start:0,end:e.length},{id:'receiving',dir:1,start:e.length,end:e.length+700}];
    g.cars.find(c=>c.id==='T1').q=e.length+6;
    g.cars.find(c=>c.id==='T2').q=100;
    g.cars.filter(c=>!c.heavy).forEach((c,i)=>c.q=250+i*30);
    assert.equal(R.bridges(st)[0].mass,220000);assert.equal(R.bridges(st)[0].over,true);
    R.update(st,1/120);assert.match(st.failure,/overloaded/);
});
test('wet leaves cap traction and full brake pressure causes visible sliding',()=>{
    const st=R.create(L[5]),g=R.engineGroup(st);
    g.path=[{id:'cutting',dir:1,start:0,end:st.net.edges.cutting.length}];
    g.cars.forEach(c=>{c.v=4;c.pressure=1;});st.power=4;
    R.update(st,1/120);assert.ok(st.slip);assert.ok(st.slide);assert.ok(g.cars.every(c=>c.sliding));
    g.brake=.25;g.orders=[{t:-100,value:.25}];g.cars.forEach(c=>c.pressure=.25);st.power=1;
    R.update(st,1/120);assert.equal(st.slip,false);assert.equal(st.slide,false);
});
test('oversized load preview is pure and runtime collision uses the same polygon',()=>{
    const st=R.create(L[7]),before=JSON.stringify(st),preview=R.clearance(st);
    assert.ok(preview.collision);assert.equal(JSON.stringify(st),before);
    assert.equal(R.cargoHit(st,preview.collision.polygon).name,preview.collision.hit);
    assert.equal(R.command(st,'uncouple','C1'),false);
});
test('passenger is held by an uncleared freight tail and cannot throw occupied points',()=>{
    const st=R.create(L[3]),g=R.engineGroup(st),a=st.net.edges['west-road'].length;
    R.command(st,'switch','a');R.command(st,'switch','b');
    g.path.push({id:'hollow-loop',dir:1,start:a,end:a+st.net.edges['hollow-loop'].length});
    g.cars.forEach(c=>c.q+=300);g.cars.forEach(c=>c.hand=true);
    for(let i=0;i<650*120;i++)R.update(st,1/120);
    assert.equal(st.failure,null);assert.equal(st.traffic[0].finished,false);
    assert.ok(R.occupied(st,'a'));assert.equal(st.net.switches.find(s=>s.node==='a').selected,1);
    assert.match(st.traffic[0].waiting,/Waiting|Held/);
});
