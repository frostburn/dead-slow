'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs');
const R=require('../src/rampage.js'), S=require('../src/storage.js');
const DT=1/120;
function scenario(level,pose={}) {
    level=structuredClone(level);
    const ship={x:200,y:200,vx:0,vy:0,a:0,r:0,hull:100,...pose};
    return {level,run:{ship,rampage:R.create(level,ship),time:0,contacts:0,distance:0,maxSpeed:0,dockHold:0}};
}
function step(t,input={},seconds=DT) {
    for(let i=0;i<Math.round(seconds/DT);i++){t.run.time+=DT;R.update(t.level,t.run,input,DT);}
}
test('mountain ring analytical slopes agree with the rendered elevation field',()=>{
    for(const l of R.levels) for(const rim of l.rampage.rims || []) for(let i=0;i<16;i++) {
        const a=i*Math.PI/8, x=rim.x+(rim.r+rim.width*.6)*Math.cos(a),y=rim.y+(rim.r+rim.width*.6)*Math.sin(a);
        const e=.001,t=R.terrain(l.rampage,x,y);
        for(const [key,dx,dy] of [['dx',e,0],['dy',0,e]]) {
            const fd=(R.terrain(l.rampage,x+dx,y+dy).height-R.terrain(l.rampage,x-dx,y-dy).height)/(2*e);
            assert.ok(Math.abs(fd-t[key])<1e-7,`${l.id}: ${key}`);
        }
    }
});
test('the first enclosing rim rejects a standing push but admits a 30 m/s run-up',()=>{
    const l=structuredClone(R.levels[1]), rim=l.rampage.rims[0];
    l.rampage.hills=[];l.rampage.rims=[rim];l.rampage.districts=[];l.rampage.lakes=[];
    const edge=rim.x-rim.r*R.shoreRadius({shore:rim.shore},Math.PI),foot=edge-rim.width*2.5;
    for(const vx of [0,30]){
        const t=scenario(l,{x:foot,y:rim.y,vx});let max=foot;
        for(let i=0;i<30*120;i++){step(t,{rudder:1});max=Math.max(max,t.run.ship.x);}
        assert.ok(vx===0?max<edge-20:max>rim.x+rim.r,`${vx}: max ${max}, crest ${edge}`);
    }
});
test('island moats enclose each protected city and share exact inner and outer shorelines',()=>{
    for(const l of R.levels) for(const lake of l.rampage.lakes.filter(l=>l.inner)) {
        assert.equal(R.inLake(lake,lake.x,lake.y),false,'island center must be dry');
        for(let i=0;i<72;i++) {
            const a=i*Math.PI/36;
            for(const [scale,wet] of [[.999,true],[1.001,false],[lake.inner*.999,false],[lake.inner*1.001,true]]){
                const p=R.lakePoint(lake,a,scale);assert.equal(R.inLake(lake,p.x,p.y),wet);
            }
        }
    }
});
test('no footbridge loophole: a stopped wet ball cannot cross a moat by pushing',()=>{
    const l=structuredClone(R.levels[2]),lake=l.rampage.lakes[0];l.rampage.hills=[];l.rampage.districts=[];
    const p=R.lakePoint(lake,Math.PI,.82);
    const a=scenario(l,{...p}),b=scenario(l,{...p,vx:20});
    assert.equal(R.water(l.rampage,a.run.ship),1);
    step(a,{rudder:1},12);step(b,{rudder:1},12);
    assert.equal(a.run.ship.x,p.x);assert.equal(a.run.ship.y,p.y);
    assert.ok(b.run.ship.x>lake.x-lake.rx*lake.inner);assert.ok(a.run.rampage.slip>0);
});
function demolish() {
    const l=R.levels[2],d=l.rampage.districts[0],t=scenario(l,{x:d.x-d.r-24+.1,y:d.y,vx:24});
    R.shield(t.run);step(t);assert.equal(t.run.rampage.districts[0].health,0);return t;
}
test('third-course demolition queues a finite three-strike off-map response',()=>{
    const t=demolish(),st=t.run.rampage;
    assert.equal(st.stats.salvos,1);assert.equal(st.strikes.length,3);
    assert.ok(st.strikes.every(b=>b.x===null && b.impactAt-b.launchAt===7.5));
    step(t);assert.equal(st.strikes.length,3,'rubble cannot retrigger salvos');
});
test('telegraphed retaliation locks a map coordinate and never homes onto the player',()=>{
    const t=demolish(),b=t.run.rampage.strikes[0];
    t.run.time=b.launchAt-DT;step(t);const pos={x:b.x,y:b.y};assert.ok(Number.isFinite(pos.x));
    Object.assign(t.run.ship,{x:300,y:1000,vx:0,vy:0});step(t,{},1);
    assert.deepEqual({x:b.x,y:b.y},pos);
});
for(const mode of ['hit','shield','dodge']) test(`retaliation impact resolves once: ${mode}`,()=>{
    const t=demolish(),b=t.run.rampage.strikes[0],st=t.run.rampage;
    t.run.time=b.launchAt-DT;step(t);
    Object.assign(t.run.ship,{x:mode==='dodge'?300:b.x,y:mode==='dodge'?1100:b.y,vx:0,vy:0});
    t.run.time=b.impactAt-DT;
    if(mode==='shield')assert.ok(R.shield(t.run));
    step(t);assert.equal(st.strikes.length,2);
    assert.equal(st.stats.strikeHits,mode==='hit'?1:0);
    assert.equal(st.stats.strikeBlocks,mode==='shield'?1:0);
    assert.equal(st.stats.strikeDodges,mode==='dodge'?1:0);
    assert.equal(t.run.ship.hull,mode==='hit'?76:100);
    step(t);assert.equal(t.run.ship.hull,mode==='hit'?76:100);
});
test('after-demolition controls cannot be collected prematurely',()=>{
    const t=scenario(R.levels[2]),st=t.run.rampage;st.control=1;
    const cp=t.level.rampage.controls[1];Object.assign(t.run.ship,{x:cp.x,y:cp.y});
    step(t);assert.equal(st.control,1);st.districts.find(d=>d.id===cp.after).health=0;
    step(t);assert.equal(st.control,2);
});
test('recovery cannot prematurely skip still-pending long-range strikes',()=>{
    const t=scenario(R.levels[2]),c=t.level.rampage,st=t.run.rampage;
    st.control=c.controls.length;st.districts.forEach(d=>d.health=0);
    Object.assign(t.run.ship,{x:c.finish.x,y:c.finish.y});
    st.strikes.push({x:300,y:300,r:60,damage:20,launchAt:0,impactAt:5});
    step(t,{},3);assert.equal(t.run.dockHold,0);
    step(t,{},4.1);assert.ok(t.run.dockHold>=2);
});
test('only schema-7 banking/lake records move to the defense-layout archive',()=>{
    const d=S.fresh();d.version=7;
    const old={runs:[{time:123,contacts:0,clean:true}],ghost:[[0,12,34,0]],bestSplits:[20]};
    for(const id of ['gerbo-first-outing','gerbo-banking','gerbo-lake-skipping','vacuum']) d.stages[id]=structuredClone(old);
    d.races['grand-tour']=[{time:9500,contacts:0,clean:true}];
    const s=S.sanitize(d);
    for(const id of ['gerbo-banking','gerbo-lake-skipping']){
        assert.equal(s.stages[id],undefined);assert.deepEqual(s.archivedStages[id].ghost,old.ghost);
        assert.deepEqual(s.archivedStages[id].bestSplits,old.bestSplits);
    }
    assert.equal(s.stages['gerbo-first-outing'].runs[0].time,123);assert.equal(s.stages.vacuum.runs[0].time,123);
    assert.equal(s.archivedRaces['grand-tour-48'][0].time,9500);
    s.stages['gerbo-banking']=old;assert.equal(S.sanitize(s).stages['gerbo-banking'].runs[0].time,123);
});
test('paws are painted before the belly, not pasted over it',()=>{
    const s=fs.readFileSync(require.resolve('../src/rampage-view.js'),'utf8');
    assert.ok(s.indexOf('const stride=Math.sin(pawPhase')<s.indexOf("g.fillStyle=lady?'#ded4bd'"));
});

test('overlapping retaliation salvos report the soonest impact first',()=>{
    const l=R.levels[2],d=l.rampage.districts[0],t=scenario(l,{x:d.x-d.r-24+.1,y:d.y,vx:24});
    t.run.rampage.strikes.push({source:'earlier',launchAt:92.5,impactAt:100,x:null,y:null,r:66,damage:24,lead:0});
    R.shield(t.run);step(t);
    const times=t.run.rampage.strikes.map(b=>b.impactAt);
    assert.deepEqual(times,[...times].sort((a,b)=>a-b));assert.equal(times.length,4);
});
