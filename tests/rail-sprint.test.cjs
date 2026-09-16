'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rail.js'),L=require('../src/rail-levels.js');
const {step,move,distance}=require('./rail-driver.cjs');
const cmd=(st,name,value)=>assert.ok(R.command(st,name,value),st.notice);

test('5-05: early interception matches moving wagons, preserves momentum and delivers cleanly',()=>{
    const st=R.create(L[4]);move(st,'engine','service',410,1,6);
    for(let i=0;i<2000;i++) {
        const g=R.groupFor(st,'R3'),p=R.locate(st,g,g.cars.find(c=>c.id==='R3').q);
        if(p.edge!=='runaway-road'&&!R.occupied(st,'early'))break;step(st,.1);
    }
    cmd(st,'switch','early');
    for(let i=0;i<5000;i++) {
        const g=R.groupFor(st,'R3'),wagon=g.cars.find(c=>c.id==='R3'),p=R.locate(st,g,wagon.q),speed=R.metrics(st).speed;
        if(R.availability(st,'couple').enabled){assert.ok(speed>2);cmd(st,'couple');assert.ok(R.metrics(st).speed>2);break;}
        const gap=distance(st,'engine',p.edge,p.s-18,1),target=Math.abs(wagon.v)+Math.max(-.5,Math.min(4,(gap-2.1)*.07));
        cmd(st,'brake',speed>target+.08?.25:0);cmd(st,'power',speed<target-.08?1:0);step(st,.1);
    }
    assert.equal(st.groups.length,1);
    move(st,'R1','bridge-approach',200,1,3);cmd(st,'hand');step(st,4);
    assert.ok(st.finishHold>=2);assert.equal(st.stats.contacts,0);
});

test('5-04: complete freight takes Rook’s loop, passenger passes, freight reaches East Yard',()=>{
    const st=R.create(L[3]);cmd(st,'switch','a');cmd(st,'switch','b');
    assert.ok(R.metrics(st).length>st.net.edges['refuge-loop'].length);
    move(st,'engine','hollow-loop',510,1,3);cmd(st,'hand');
    cmd(st,'switch','a');cmd(st,'switch','b');cmd(st,'dispatch','passenger');
    for(let i=0;i<900&&!st.traffic[0].finished;i++)step(st,1);
    assert.ok(st.traffic[0].finished,'Passenger must actually traverse the valley');
    step(st,1);assert.ok(st.completed.includes('meet'));cmd(st,'hand');
    if(st.net.switches.find(s=>s.node==='b').selected===0)cmd(st,'switch','b');
    move(st,'engine','east-road',470,1,3);cmd(st,'hand');step(st,4);
    assert.ok(st.finishHold>=2);
});

test('5-06: timber freight crosses the wet saddle and stops in the works using controls',()=>{
    const st=R.create(L[5]);
    move(st,'engine','works-road',360,1,4);cmd(st,'hand');step(st,4);
    assert.ok(st.finishHold>=2);
});

test('5-05: later service route catches slower wagons with less stopping room',()=>{
    const st=R.create(L[4]);move(st,'engine','service-long',1250,-1,10);
    cmd(st,'switch','late');
    for(let i=0;i<5000;i++) {
        const g=R.groupFor(st,'R3'),wagon=g.cars.find(c=>c.id==='R3'),p=R.locate(st,g,wagon.q),speed=-R.metrics(st).speed;
        if(R.availability(st,'couple').enabled){assert.equal(p.edge,'bridge-approach');cmd(st,'couple');break;}
        const gap=distance(st,'engine',p.edge,p.s-18,-1),target=Math.abs(wagon.v)+Math.max(-.5,Math.min(4,(gap-2.1)*.07));
        cmd(st,'brake',speed>target+.08?.25:0);cmd(st,'power',speed<target-.08?1:0);step(st,.1);
    }
    assert.equal(st.groups.length,1);
    move(st,'R1','bridge-approach',270,-1,2);cmd(st,'hand');step(st,4);
    assert.ok(st.finishHold>=2);
});

test('5-05: routing loose wagons into the gravel catch gives a survivable non-clean finish',()=>{
    const st=R.create(L[4]);cmd(st,'switch','fork');
    for(let i=0;i<800;i++){step(st,1);if(st.caught&&R.groupFor(st,'R1').cars.every(c=>Math.abs(c.v)<.08))break;}
    cmd(st,'select','R1');cmd(st,'hand');step(st,4);assert.ok(st.finishHold>=2);assert.ok(st.caught);assert.equal(st.stats.contacts,1);
    assert.equal(st.groups.length,2,'Catch works without magically coupling the engine');
});

test('5-07: pocket, two bridge shuttles and ordered reassembly use actual coupling operations',()=>{
    const st=R.create(L[6]);
    require('./rail-routes.cjs').bridge(st);
    assert.ok(st.finishHold>=2);assert.equal(st.groups.length,1);
    for(const task of st.config.tasks)assert.ok(st.completed.includes(task.id),task.id);
    assert.ok(st.completed.includes('pocket-load-1'),'Pocket split remains after collecting load 1');
    st.completed=['transformers'];
    const adapter=require('../src/rail-adapter.js').create({railway:R});
    assert.ok(adapter.ready({rail:st}),'Guidance does not outlaw alternative shunting solutions');
});

test('5-08: clear the load into the headshunt and reverse into the export spur',()=>{
    const st=R.create(L[7]);assert.ok(R.clearance(st).collision);
    cmd(st,'switch','fork');cmd(st,'switch','join');assert.equal(R.clearance(st).collision.hit,'Loading gantry');
    const first=R.clearance(st).collision.distance;
    cmd(st,'gantry');step(st,9);assert.ok(R.clearance(st).collision.distance>first+200);
    move(st,'engine','broad',630,1,2);cmd(st,'gantry');step(st,9);
    assert.equal(R.clearance(st).collision,null);
    move(st,'engine','headshunt',350,1,2.5);step(st,2);
    assert.ok(st.completed.includes('clear-load'));assert.equal(st.completed.includes('vessel'),false);
    cmd(st,'switch','join');
    move(st,'C2','terminal',590,-1,2);cmd(st,'hand');step(st,4);
    assert.ok(st.finishHold>=2);
});
