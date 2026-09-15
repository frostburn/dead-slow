'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rail.js'),L=require('../src/rail-levels.js'),Catalog=require('../src/levels.js');
const {step,move}=require('./rail-driver.cjs'),{create}=require('./headless.cjs');
const cmd=(st,name,value)=>assert.ok(R.command(st,name,value),st.notice);

test('5-01: stop, couple, reverse clear, switch and park using controls only',()=>{
    const st=R.create(L[0]),short=R.metrics(st).length;
    move(st,'engine','receiving',120,1);cmd(st,'independent',1);step(st,2);
    assert.ok(st.completed.includes('first-stop'));
    move(st,'engine','receiving',165,1,.45);cmd(st,'couple');
    assert.ok(R.metrics(st).length>short+30);
    cmd(st,'hand');assert.ok(R.engineGroup(st).cars.every(c=>!c.hand));step(st,2);
    move(st,'R1','approach',335,-1,2);cmd(st,'switch','j');
    move(st,'R1','siding',220,1,2);cmd(st,'hand');step(st,4);
    assert.ok(st.finishHold>=2);assert.equal(R.occupied(st,'j'),false);
    assert.equal(R.engineGroup(st).cars.length,5);
});
test('5-02: secure blue cut, run locomotive around orange cut, push second delivery',()=>{
    const st=R.create(L[1]);assert.ok(R.metrics(st).length>st.net.edges.loop.length);
    cmd(st,'switch','a');move(st,'M2','mill',130,-1,2);cmd(st,'uncouple','F4');cmd(st,'hand');
    move(st,'engine','main',375,1,2);cmd(st,'uncouple','engine');cmd(st,'hand');
    move(st,'engine','east-neck',90,1,2);cmd(st,'switch','e');cmd(st,'switch','w');
    move(st,'engine','west-neck',90,-1,2);cmd(st,'switch','w');cmd(st,'switch','e');cmd(st,'switch','b');
    const cut=R.groupFor(st,'F4'),target=R.locate(st,cut,cut.cars.find(c=>c.id==='F4').q).s-22.5;
    move(st,'engine','main',target,1,.45);cmd(st,'couple');cmd(st,'hand');step(st,2);
    assert.equal(R.engineGroup(st).cars.at(-1).id,'engine');
    move(st,'F1','foundry',220,1,2);cmd(st,'uncouple','F4');cmd(st,'select','F1');cmd(st,'hand');step(st,4);
    assert.ok(st.finishHold>=2);assert.equal(st.stats.uncouplings,3);assert.equal(st.groups.length,3);
});
test('5-03: both routes deliver; the gentler branch and cooling loop cost real distance',()=>{
    const results=[];
    for(const gentle of [false,true]) {
        const st=R.create(L[2]);if(gentle)for(const node of ['summit','join','cool','out'])cmd(st,'switch',node);
        move(st,'engine','works-road',310,1,3);cmd(st,'hand');step(st,4);
        assert.ok(st.finishHold>=2);results.push(st);
    }
    assert.ok(results[1].stats.distance>results[0].stats.distance+1800);
    assert.ok(results[1].time>results[0].time);
    assert.ok(results[0].stats.peakTemperature>180);
    assert.ok(results[1].stats.peakTemperature<results[0].stats.peakTemperature-25);
});
test('points remain locked after the engine passes until the tail clears (geometry)',()=>{
    const st=R.create(L[0]),g=R.engineGroup(st),end=st.net.edges.approach.length;
    g.path.push({id:'receiving',dir:1,start:end,end:end+st.net.edges.receiving.length});
    g.cars.forEach(c=>c.q+=end-210);
    assert.equal(R.locate(st,g,g.cars[0].q).edge,'receiving');
    assert.equal(R.command(st,'switch','j'),false);
    g.cars.forEach(c=>c.q+=100);
    assert.equal(R.command(st,'switch','j'),true);
});
test('brake application reaches the head before the tail; heat increases stopping distance',()=>{
    const st=R.create(L[2]),g=R.engineGroup(st);
    g.brake=0;g.orders=[{t:-100,value:0}];g.cars.forEach(c=>c.pressure=0);
    cmd(st,'brake',1);step(st,.5);
    assert.ok(g.cars[0].pressure>.5);assert.equal(g.cars.at(-1).pressure,0);
    g.cars.forEach(c=>c.v=5);const cold=R.metrics(st).stopping;
    g.cars.forEach(c=>c.temp=320);assert.ok(R.metrics(st).stopping>cold+15);
});
test('detached air leaks away; handbrakes hold a cut on the mill grade',()=>{
    const level=structuredClone(L[1]);level.rail.groups=[{cars:[level.rail.groups[0].cars[0]]},
        {secured:true,cars:[{id:'cut',edge:'mill',s:140,length:24,mass:35000}]}];
    const secured=R.create(level),loose=R.create(level);
    R.groupFor(loose,'cut').cars[0].hand=false;
    step(secured,160);step(loose,160);
    assert.ok(Math.abs(R.groupFor(secured,'cut').cars[0].q-140)<.01);
    assert.ok(R.groupFor(loose,'cut').cars[0].q<135);
});
test('railway completion uses shared records and respects pause/retry practice rules',()=>{
    const t=create(),i=Catalog.findIndex(l=>l.id==='long-grade-3');t.load(i,true);
    assert.ok(t.state.run.rail);t.advance(1);assert.ok(Math.abs(t.state.run.time-1)<1e-9);
    t.pause();assert.ok(t.state.run.pausedUsed);t.retry();assert.equal(t.state.run.pausedUsed,false);
    // Objective fixture, not a second control route: all cars placed in the works.
    const st=t.state.run.rail,g=R.engineGroup(st),shift=300-g.cars[0].q;
    g.path=[{id:'works-road',dir:1,start:0,end:st.net.edges['works-road'].length}];
    g.cars.forEach(c=>{c.q+=shift;c.v=0;c.hand=true;});t.advance(4);
    assert.equal(t.state.status,'complete');assert.ok(t.state.run.result.rail);
    assert.equal(t.state.storage.stages['long-grade-3'].clears,1);
    t.keydown({code:'KeyR'});assert.equal(t.state.status,'complete');
    t.keydown({code:'KeyR',shiftKey:true});assert.equal(t.state.status,'running');
    t.marathon('long-grade');assert.equal(t.state.marathon.route.length,12);
});
