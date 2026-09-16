'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../src/compatibility.js'),S=require('../src/storage.js'),levels=require('../src/levels.js');
const R=require('../src/rail.js'),P=require('../src/rail-presentation.js'),rail=require('../src/rail-levels.js');
const Commands=require('../src/rail-commands.js'),{registry}=require('../src/simulations.js');
const {validateRail}=require('../tools/validate-rail.cjs'),{create}=require('./headless.cjs');
const record={time:80,clean:true,contacts:0,hull:100,ghost:undefined};
const stage=()=>({runs:[{...record}],ghost:[[0,1,2,0]],bestSplits:[30],clears:1,attempts:2});

test('schema upgrade retains current records; a course revision archives only affected routes',()=>{
    const data=S.fresh();data.version=17;
    data.stages['long-grade-1']=stage();data.stages['dead-slow']=stage();
    for(const id of ['long-grade','grand-tour','coast'])data.races[id]=[{...record}];
    const upgraded=S.sanitize(data);
    assert.deepEqual(upgraded.stages['long-grade-1'],stage());
    const next=C.manifest(levels.map(l=>l.id==='long-grade-1'?{...l,courseRevision:2}:l));
    const stamp=C.manifest(levels).stages['long-grade-1'],migrated=S.sanitize(upgraded,next),key=C.archiveKey('long-grade-1',stamp);
    assert.equal(migrated.stages['long-grade-1'],undefined);
    assert.deepEqual(migrated.archivedStages[key],stage());
    assert.deepEqual(migrated.stages['dead-slow'],stage());
    assert.equal(migrated.races['long-grade'].length,0);
    assert.equal(migrated.races['grand-tour'].length,0);
    assert.equal(migrated.races.coast.length,1);
    assert.equal(migrated.archivedCompatibility.stages[key],stamp);
    assert.deepEqual(S.sanitize(migrated,next),migrated);
});
test('rules and circuit order affect compatibility, presentation metadata does not',()=>{
    const current=C.manifest(levels);
    assert.deepEqual(C.manifest(levels.map(l=>({...l,name:'New title',tip:'New hint'}))),current);
    const revised=C.manifest(levels.map(l=>l.campaign==='long-grade'?{...l,rulesRevision:l.rulesRevision+1}:l));
    assert.notEqual(revised.races['long-grade'],current.races['long-grade']);
    assert.equal(revised.races.coast,current.races.coast);
    const ordered=[...levels];[ordered[0],ordered[1]]=[ordered[1],ordered[0]];
    assert.notEqual(C.manifest(ordered).races.coast,current.races.coast);
    const old=S.fresh();old.version=17;delete old.compatibility;old.races.coast=[{...record}];
    assert.equal(S.sanitize(old,C.manifest(ordered)).races.coast.length,0);
});
test('unknown or colliding compatibility never merges unrelated archived records',()=>{
    const data=S.fresh(),key=C.archiveKey('long-grade-1','unknown');
    delete data.compatibility;data.stages['long-grade-1']=stage();
    data.archivedStages[key]={...stage(),runs:[{...record,time:40}]};
    data.archivedCompatibility.stages[key]='different-signature';
    const out=S.sanitize(data);
    assert.equal(out.stages['long-grade-1'],undefined);
    assert.equal(out.archivedStages[key].runs[0].time,40);
    assert.equal(Object.values(out.archivedStages).filter(s=>s.runs[0].time===80).length,1);
    assert.deepEqual(S.sanitize(out),out);
});
test('simulation registration rejects unknown and duplicate adapters',()=>{
    const adapter={id:'rail',create:()=>({}),step(){},ready:()=>false,clean:()=>true};
    assert.equal(registry([adapter]).forLevel({id:'one',simulation:'rail'}),adapter);
    assert.throws(()=>registry([adapter,adapter]),/Duplicate/);
    assert.throws(()=>registry([adapter]).forLevel({id:'new',simulation:'new'}),/Unregistered/);
});
test('railway commands reject malformed payloads and share keyboard definitions',()=>{
    const st=R.create(rail[0]);
    for(const [name,value] of [['power',NaN],['helper','4'],['brake',Infinity],['uncouple',{after:'engine'}],['constructor'],['reverse',1]]) {
        const before=JSON.stringify({...st,notice:null});
        assert.equal(R.command(st,name,value),false);
        assert.equal(JSON.stringify({...st,notice:null}),before);
    }
    assert.deepEqual(Commands.keyboard('KeyW',{power:4,helper:0,brake:0,independent:0},false,false),['power',5]);
    assert.ok(R.command(st,'power',5));assert.equal(st.power,4);
});
test('coupling preserves momentum; split and stale-link rejection preserve topology',()=>{
    const level={rail:{thermal:false,nodes:{a:[0,0,0],b:[500,0,0]},tracks:[{id:'line',a:'a',b:'b',limit:10}],switches:[],zones:[],tasks:[],groups:[
        {speed:.1,cars:[{id:'engine',edge:'line',s:100,length:16,mass:80000,powered:true}]},
        {speed:-.1,cars:[{id:'W',edge:'line',s:81.8,length:18,mass:50000}]}
    ]}};
    const st=R.create(level),momentum=st.groups.flatMap(g=>g.cars).reduce((sum,c)=>sum+c.mass*c.v,0);
    assert.ok(R.command(st,'couple'));
    assert.ok(Math.abs(R.engineGroup(st).cars.reduce((sum,c)=>sum+c.mass*c.v,0)-momentum)<1e-8);
    R.engineGroup(st).cars.forEach(c=>c.v=0);
    assert.ok(R.command(st,'uncouple',{after:'engine',before:'W'}));
    assert.equal(st.selected,'W');assert.ok(R.assertInvariants(st));
    const before=JSON.stringify({...st,notice:null});
    assert.equal(R.command(st,'uncouple',{after:'engine',before:'W'}),false);
    assert.equal(JSON.stringify({...st,notice:null}),before);
    assert.ok(R.command(st,'couple'));assert.equal(st.selected,'engine');
});
test('bounded mixed commands conserve vehicle ownership across every railway course',()=>{
    let seed=0x5eed;
    const random=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
    for(const level of rail) {
        const st=R.create(level),original=st.groups.flatMap(g=>g.cars).map(c=>[c.id,c.mass]).sort();
        for(let i=0;i<60;i++) {
            const group=st.groups[random(st.groups.length)],car=group.cars[random(group.cars.length)];
            const commands=[['select',car.id],['hand'],['stop'],['reverse'],['couple'],['uncouple',car.id],['power',random(5)],['brake',random(5)/4]];
            const [name,value]=commands[random(commands.length)];R.command(st,name,value);
            for(let tick=0;tick<6;tick++)R.update(st,1/120);
            assert.ok(R.assertInvariants(st),level.id);
            assert.deepEqual(st.groups.flatMap(g=>g.cars).map(c=>[c.id,c.mass]).sort(),original,level.id);
        }
    }
});
test('presentation snapshots leave physics unchanged and hold one eligibility result',()=>{
    const st=R.create(rail[0]),before=JSON.stringify(st),view=P.snapshot(st);
    assert.equal(JSON.stringify(st),before);
    assert.ok(view.action('reverse').enabled);
    R.drivingEngine(st).v=1;
    assert.ok(view.action('reverse').enabled);
    assert.equal(P.snapshot(st).action('reverse').enabled,false);
});
test('railway definitions reject broken references before the game loads',()=>{
    for(const level of rail)assert.ok(validateRail(level.rail,level.id));
    const broken=structuredClone(rail[0].rail);broken.tasks[0].zone='missing';
    assert.throws(()=>validateRail(broken,'test'),/test: task .* unknown zone/);
    const cycle=structuredClone(rail[0].rail);cycle.tasks[0].after=cycle.tasks[0].id;
    assert.throws(()=>validateRail(cycle,'test'),/cyclic prerequisite/);
});
test('the railway shell needs no ship or marine jobs and console controls use its command path',()=>{
    const t=create();t.cheats.level('long-grade-1');
    assert.equal(t.state.run.ship,undefined);assert.equal(t.state.run.jobs,undefined);
    t.cheats.rail('power',2);assert.equal(t.state.run.rail.power,2);
    assert.throws(()=>t.cheats.controls({throttle:2}),/DeadSlow.rail/);
    t.cheats.step(.1);assert.ok(Number.isFinite(t.state.run.focus.x));
    t.state.storage.archivedStages[C.archiveKey('long-grade-1','rail:0:1')]=stage();
    t.action('log');assert.match(t.html('dialog'),/Earlier course records/);
});
test('obsolete recordings are rejected before loading and lose their verified-time label',()=>{
    const t=create();t.cheats.level('long-grade-1');
    const level=t.state.level,revision=level.rulesRevision,before=t.cheats.progress();
    try {
        level.rulesRevision++;
        assert.throws(()=>t.cheats.watch('long-grade-1',0),/earlier course or rules revision/);
        assert.deepEqual(t.cheats.progress(),before);
        assert.equal(t.cheats.times().find(l=>l.id===level.id).verifiedAuthorTime,null);
        assert.ok(!t.cheats.runs().some(l=>l.id===level.id));
    } finally {level.rulesRevision=revision;}
});
