'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rail.js'),L=require('../src/rail-levels.js'),S=require('../src/storage.js');
const {create}=require('./headless.cjs');
const {step}=require('./rail-driver.cjs');

test('passengers wait indefinitely for a player signal; repeated dispatch is impossible',()=>{
    for(const level of L.filter(l=>l.rail.traffic?.length)) {
        const st=R.create(level),t=st.traffic[0],positions=t.cars.map(c=>c.q);
        st.groups.forEach(g=>g.cars.forEach(c=>c.hand=true));st.time=10000;step(st,2);
        assert.deepEqual(t.cars.map(c=>c.q),positions);assert.equal(t.v,0);
        assert.equal(R.command(st,'dispatch','missing'),false);
        assert.ok(R.command(st,'dispatch',t.id));step(st,1);assert.ok(t.v>0);
        assert.equal(R.command(st,'dispatch',t.id),false);
    }
    assert.equal(R.command(R.create(L[0]),'dispatch'),false);
});

test('finale passenger waits for the tunnel points and clears only after the last carriage enters',()=>{
    // Objective probe: place the passenger approaching Summit Junction.
    // Full navigability is exercised separately by the control-only finale.
    const st=R.create(L[11]),t=st.traffic[0],leg=t.path.find(p=>p.id==='descent');
    st.groups.forEach(g=>g.cars.forEach(c=>c.hand=true));
    t.cars.forEach((c,i)=>c.q=leg.end-100-i*t.length/4);
    R.command(st,'dispatch');step(st,60);
    assert.match(t.waiting,/Summit Junction.*Ridge tunnel/);
    assert.ok(R.bounds(t).hi<=leg.end-24+.01);assert.equal(t.finished,false);
    assert.equal(st.net.switches.find(s=>s.node==='yard').selected,0);
    assert.ok(R.command(st,'switch','yard'));step(st,1);
    assert.equal(R.command(st,'switch','yard'),false,'Approaching passenger reserves aligned points');
    for(let i=0;i<150&&R.bounds(t).hi<t.exitQ;i++)step(st,1);
    assert.ok(R.bounds(t).hi>t.exitQ);assert.equal(t.finished,false);
    assert.ok(R.bounds(t).lo<t.exitQ,'Tail remains outside the portal');
    for(let i=0;i<40&&!t.finished;i++)step(st,1);
    assert.ok(t.finished);assert.ok(R.bounds(t).lo>t.exitQ);assert.deepEqual(t.reserved,[]);
});

test('helper lessons reuse the loco brake controls and the horn signals departure through the game',()=>{
    const V=require('../src/rail-view.js'),old=global.document;
    const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{setAttribute(){}});return nodes.get(id);};
    global.document={getElementById:node};
    try {
        const st=R.create(L[8]),act=(name,value)=>R.command(st,name,value);
        V.prepare(L[8],act);
        assert.equal((node('rail-panel').innerHTML.match(/type="range"/g)||[]).length,3);
        assert.ok(!node('rail-panel').innerHTML.includes('id="rail-independent"'));
        assert.equal(R.command(st,'independent',1),false);
        assert.equal(R.availability(st,'couple').enabled,false);
        assert.match(R.assistance(st).pickup,/78\.4 m/);
        V.prepare(L[11],act);
        const connected=R.create(L[11]);assert.ok(R.command(connected,'couple'));
        V.prepare(L[11],(name,value)=>R.command(connected,name,value));
        assert.ok(V.key({code:'KeyE',preventDefault(){}},connected));assert.equal(connected.helper,1);assert.equal(connected.power,0);
        assert.ok(V.key({code:'KeyQ',preventDefault(){}},connected));assert.equal(connected.helper,0);
        const help=V.dialog('help',L[11],{rail:connected},String);
        assert.match(help,/rear assistance/);assert.ok(!help.includes('locomotive brake'));
    } finally {global.document=old;}
    const game=create();game.cheats.level('long-grade-4');
    game.signal();assert.equal(game.state.run.rail.traffic[0].released,true);
});

test('changed helper and passenger records remain exportable and visible as earlier routes',()=>{
    const data=S.fresh(),record={time:123,contacts:0,clean:true};data.version=16;
    for(const id of ['long-grade-4','long-grade-9','long-grade-12','long-grade-10'])data.stages[id]={runs:[record],ghost:[[0,1,2,3]]};
    for(const id of ['long-grade','grand-tour','coast'])data.races[id]=[record];
    const store=S.create({getItem:()=>null,setItem(){}});store.import(JSON.stringify(data));const n=store.data;
    for(const id of ['long-grade-4','long-grade-9','long-grade-12']){
        assert.equal(n.stages[id],undefined);assert.deepEqual(n.archivedStages[id+'-dispatch-v1'].ghost,[[0,1,2,3]]);
    }
    assert.equal(n.stages['long-grade-10'].runs.length,1);assert.equal(n.races.coast.length,1);
    for(const id of ['long-grade','grand-tour']){assert.equal(n.races[id].length,0);assert.equal(n.archivedRaces[id+'-dispatch-v1'].length,1);}
    assert.deepEqual(S.sanitize(JSON.parse(store.export())),n);
    const game=create();game.cheats.level('long-grade-9');
    Object.assign(game.state.storage,{archivedRaces:n.archivedRaces,archivedStages:n.archivedStages});
    game.action('log');assert.match(game.html('dialog'),/Earlier route \(archived\)/);assert.match(game.html('dialog'),/World 5 · earlier helper/);
});
