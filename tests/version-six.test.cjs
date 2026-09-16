'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rail.js'),G=require('../src/rampage.js'),L=require('../src/levels.js'),S=require('../src/storage.js');
test('volcano topography is smooth, compact and has an outward downhill force',()=>{
    for(const level of G.levels)for(const v of level.rampage.volcanoes||[]) {
        const c={hills:[],volcanoes:[v]},radius=v.r+65;
        assert.ok(G.terrain(c,v.x,v.y).height>7);
        for(const angle of [0,.7,2,3.5,5]) {
            const x=v.x+Math.cos(angle)*radius*.55,y=v.y+Math.sin(angle)*radius*.55,p=G.terrain(c,x,y),e=.001;
            assert.ok(p.dx*(x-v.x)+p.dy*(y-v.y)<0);
            assert.ok(Math.abs(p.dx-(G.terrain(c,x+e,y).height-G.terrain(c,x-e,y).height)/(2*e))<1e-7);
        }
        assert.deepEqual(G.terrain(c,v.x+radius,v.y),{height:0,dx:0,dy:0});
    }
});
test('an unpowered ball rolls down a quiet volcano in production physics',()=>{
    const level=structuredClone(L.find(l=>l.id==='gerbo-downhill')),c=level.rampage,v=c.volcanoes[0];
    Object.assign(c,{hills:[],rims:[],lakes:[],forests:[],districts:[],controls:[],monsters:[]});
    const ship={x:v.x+50,y:v.y,vx:0,vy:0,hull:100,mass:8,a:0};
    const run={ship,rampage:G.create(level,ship),time:0,contacts:0,distance:0,maxSpeed:0};
    for(let i=0;i<120;i++){run.time+=1/120;G.update(level,run,{},1/120);}
    assert.ok(ship.vx>.5);assert.ok(ship.x>v.x+50.2);
});
test('main-engine identity survives a detached powered helper and helper commands are guarded',()=>{
    const st=R.create(L.find(l=>l.id==='long-grade-12'));
    st.groups.reverse();assert.equal(R.drivingEngine(st).id,'engine');assert.equal(R.command(st,'helper',4),false);
    assert.ok(R.command(st,'couple'));assert.ok(R.command(st,'hand'));assert.ok(R.command(st,'helper',2));
    assert.equal(R.command(st,'uncouple','S10'),false);
    R.command(st,'stop');assert.equal(st.helper,0);assert.ok(R.command(st,'uncouple','S10'));
    assert.equal(R.command(st,'helper',4),false);
});
test('sharing the climb protects couplers; front-only pull and rear-only curve pushing fail',()=>{
    function probe(front,rear,limit=8) {
        const level=structuredClone(L.find(l=>l.id==='long-grade-12'));
        Object.assign(level.rail,{nodes:{a:[0,0,0],b:[1400,0,42]},tracks:[{id:'grade',a:'a',b:'b',limit,points:Array.from({length:15},(_,i)=>[i*100,0,i*3])}],switches:[],traffic:[],tasks:[],zones:[]});
        level.rail.groups=[{brake:0,speed:.5,cars:level.rail.groups.flatMap(g=>g.cars).map((c,i)=>({...c,edge:'grade',s:650-i*25.2}))}];
        const st=R.create(level);R.command(st,'power',front);R.command(st,'helper',rear);
        for(let i=0;i<2400&&!st.failure;i++)R.update(st,1/120);
        return st;
    }
    // Dry rail now transmits the requested force instead of limiting the top
    // notches through wheelspin. Share moderate power on this steady climb.
    const shared=probe(3,3);assert.equal(shared.failure,null);assert.ok(R.drivingEngine(shared).v>.5);
    assert.match(probe(4,0).failure,/sustain the pull/);
    assert.match(probe(0,4,6).failure,/bunched/);
});
test('ferry balance includes partially boarded bodies, and the locomotive may not board',()=>{
    const level=L.find(l=>l.id==='long-grade-10'),st=R.create(level),g=R.engineGroup(st);
    g.path=[{id:'port',dir:1,start:0,end:st.net.edges.port.length}];
    g.cars=[{...g.cars[0],q:80,v:0}];
    assert.equal(R.ferry(st).loads[0],12500);
    const s=R.create(level),eg=R.engineGroup(s);eg.path=g.path;eg.cars=[R.drivingEngine(s)];eg.cars[0].q=95;
    R.update(s,1/120);assert.match(s.failure,/locomotive ashore/);
});
test('flood closure acts on the full body at its forecast time and never removes a route',()=>{
    const st=R.create(L.find(l=>l.id==='long-grade-11')),f=st.config.floods[0],g=R.groupFor(st,'L1');
    g.cars[0].q=f.from-7;g.cars[1].q=f.from-24.2;st.time=f.at-1;
    assert.equal(R.forecast(st)[0].closed,false);R.update(st,1/120);assert.equal(st.failure,null);
    st.time=f.at;R.update(st,1/120);assert.match(st.failure,/Low Crossing/);
    assert.ok(st.net.edges[f.edge]);assert.equal(st.groups.length,3);
});
test('version 6 archives changed hills and the old tour while preserving railway records and imports',()=>{
    const d=S.fresh(),record={time:123,contacts:0,clean:true};d.version=15;
    d.stages['gerbo-downhill']={runs:[record],ghost:[[0,1,2,3]]};d.stages['long-grade-7']={runs:[record]};
    d.races['grand-tour']=[{...record,stages:60}];d.races.gerbozilla=[record];
    const n=S.sanitize(d);assert.equal(n.version,S.VERSION);assert.equal(n.races['grand-tour'].length,0);
    assert.equal(n.archivedRaces['grand-tour-60'][0].stages,60);assert.equal(n.archivedRaces['gerbozilla-topography-v1'].length,1);
    assert.deepEqual(n.archivedStages['gerbo-downhill-topography-v1'].ghost,[[0,1,2,3]]);
    assert.equal(n.stages['long-grade-7'].runs.length,1);assert.deepEqual(S.sanitize(n),n);
    const store=S.create({getItem:()=>null,setItem(){}});store.import(JSON.stringify(d));assert.equal(store.data.stages['long-grade-7'].runs.length,1);
    store.recordRace('long-grade',{...record,stages:12});assert.equal(store.bestRace('long-grade').stages,12);
});
