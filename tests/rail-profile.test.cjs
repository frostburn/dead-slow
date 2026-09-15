const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rail.js'),L=require('../src/rail-levels.js'),P=require('../src/rail-presentation.js');
test('side profile includes detached wagons at actual route distances without mutating paths',()=>{
    const st=R.create(L[0]),g=R.engineGroup(st);
    g.path=[{id:'receiving',dir:1,start:0,end:st.net.edges.receiving.length}];
    g.cars.forEach((c,i)=>c.q=120-i*20);
    const before=JSON.stringify(st),p=P.profile(st),waiting=p.cars.find(c=>c.id==='R1');
    assert.ok(waiting);assert.equal(waiting.attached,false);assert.equal(waiting.q,201.2);
    assert.equal(waiting.length,st.groups[1].cars[0].length);
    assert.equal(p.hi-p.lo,400);assert.equal(p.samples.length,101);
    assert.equal(JSON.stringify(st),before);
    st.reverser=-1;R.drivingEngine(st).v=-.001;
    assert.deepEqual(P.profile(st),p);
});
test('profile does not project wagons on disconnected branches onto the active track',()=>{
    const st=R.create(L[0]),p=P.profile(st);
    for(const c of p.cars)assert.ok(Number.isFinite(c.q)&&Number.isFinite(c.z));
    assert.equal(p.cars.some(c=>c.id==='R1'),false);
});
test('adapter keeps completion timestamps stable and clears invalidated delivery splits',()=>{
    const create=require('../src/rail-adapter.js').create;
    const st={time:0,stats:{contacts:0,distance:0},config:{tasks:[{id:'delivery',text:'Deliver freight'}]},completed:['delivery'],finishHold:0};
    const adapter=create({railway:{update(s,dt){s.time+=dt},drivingEngine(){return {q:0,v:0}},engineGroup(){return {}},locate(){return {x:0,y:0,a:0}}},audio:{},view:{}});
    const run={rail:st,splits:[],time:0,contacts:0,maxSpeed:0,sampleAt:Infinity};
    adapter.step(run,1);adapter.step(run,2);assert.deepEqual(run.splits,[{name:'Deliver freight',time:1}]);
    st.completed=[];adapter.step(run,1);assert.deepEqual(run.splits,[]);
    st.completed=['delivery'];adapter.step(run,1);assert.equal(run.splits[0].time,5);
});
