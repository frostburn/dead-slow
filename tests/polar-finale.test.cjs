'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../src/levels.js'),I=require('../src/polar.js'),U=require('../src/submarine.js'),P=require('../src/physics.js'),C=require('../src/compatibility.js'),S=require('../src/storage.js');
const {create}=require('./headless.cjs');
const level=n=>L.find(l=>l.id===`pale-reach-${n}`);
const state=n=>({...I.create(level(n)),time:0,contacts:0,distance:0,maxSpeed:0,dockHold:0,sampleAt:0,ghost:[],splits:[]});
function tick(r,seconds,input={}){for(let i=0;i<Math.round(seconds*120);i++)I.step(r.polar.level,r,input,1/120);}
function arrangeHandoff(r){const st=r.polar;st.mission.team='recovered';st.mission.work=st.config.access.work;st.stats.teamInserted=1;st.stats.teamRecovered=1;}

test('the extraction starts with a waiting team and physically drifting, separating shelter plates',()=>{
 const r=state(10),st=r.polar,sites=U.Recovery.sites(st),gap=st.bergs[1].y-st.bergs[0].y;
 assert.equal(st.mission.team,'waiting');assert.equal(st.stats.teamInserted,0);assert.equal(st.gun.ammo,0);
 tick(r,30);const moved=U.Recovery.sites(st);
 assert.equal(moved[0].x,sites[0].x);assert.ok(moved[1].x<sites[1].x&&moved[1].y>sites[1].y);assert.ok(st.bergs[1].y-st.bergs[0].y>gap+3);
 assert.equal(st.failure,null);assert.ok(I.action(r,'rendezvous','far'));assert.equal(st.recovery.settled,false);
 const far=U.access(st),before={...st.recovery.beacon};Object.assign(r.ship,{x:far.x,y:far.y,depth:88,depthTarget:88});
 assert.equal(I.action(r,'team'),false,'the team cannot teleport to a newly selected pickup');
 tick(r,1);assert.ok(Math.hypot(st.recovery.beacon.x-before.x,st.recovery.beacon.y-before.y)<2);
});
test('recovery redeploys visible patrols without moving their hulls instantly; no insertion phase is credited',()=>{
 const r=state(10),st=r.polar;I.action(r,'rendezvous','far');tick(r,210);
 const p=U.access(st);assert.ok(p.available);Object.assign(r.ship,{x:p.x,y:p.y,depth:88,depthTarget:88,vx:p.vx,vy:p.vy});
 assert.ok(I.action(r,'team'));tick(r,8.1);
 assert.equal(st.mission.team,'recovered');assert.equal(st.stats.teamInserted,0);assert.equal(st.stats.teamRecovered,1);assert.equal(st.recovery.search,true);
 assert.ok(st.actors.every(a=>a.route.some(p=>p[0]<450)));
 assert.equal(st.complete,false);assert.equal(I.ready(r),false,'the team still has to escape the search');
});
test('exposure changes patrol approaches without an arbitrary pickup expiry or mission failure',()=>{
 const r=state(10),st=r.polar;tick(r,260.1);
 assert.ok(st.recovery.exposed);assert.equal(st.failure,null);assert.equal(st.mission.team,'waiting');assert.ok(U.access(st).available);
 const a=st.actors[0],before=[a.ship.x,a.ship.y];tick(r,.01);assert.ok(Math.hypot(a.ship.x-before[0],a.ship.y-before[1])<.1);
});
test('rescue captains need contact and connected water; guns cannot substitute for required survivors',()=>{
 const r=state(11),st=r.polar,f=st.fleet[0];assert.equal(I.command(r,f.id,'proceed'),false);assert.equal(I.action(r,'fire'),false);
 Object.assign(r.ship,{x:f.ship.x-60,y:f.ship.y,a:0});tick(r,4.1);assert.ok(f.rescued);assert.equal(f.order,'hold');assert.ok(I.command(r,f.id,'proceed'));
 st.operation.survey.safeNow=true;st.fleet.forEach(f=>{f.rescued=true;f.returned=true;});st.fleet[2].returned=false;
 assert.equal(I.operations.ready(st),false);st.fleet[2].returned=true;assert.equal(I.operations.ready(st),true);
 st.operation.survey.safeNow=false;assert.equal(I.operations.ready(st),false);
});
test('crossfire is emitted by visible vessels, travels through space and earns no rescue credit',()=>{
 const r=state(11),st=r.polar;tick(r,9);
 assert.ok(st.operation.shells.length>0);assert.ok(st.operation.shells.every(s=>st.operation.npcs.some(n=>n.active&&n.id===s.source)));
 const before=st.operation.shells[0].y;tick(r,.1);assert.notEqual(st.operation.shells[0].y,before);
 tick(r,20);assert.equal(st.stats.hostilesDisabled,0);assert.equal(st.stats.safeReturns,0);assert.equal(st.stats.damageTaken,0,'gunboat-on-gunboat hits are not rescue damage');
 assert.equal(st.complete,false);
});
test('the surface sea evolves during the underwater leg; only a working cutter can fracture it',()=>{
 const r=state(12),f=r.finalJourney,sea=f.surface.polar,b=sea.bergs[0],y=b.y;
 assert.equal(r.polar.bergs,sea.bergs);tick(r,90);
 assert.ok(sea.broken>0);assert.ok(sea.operation.npcs[0].ship.x>240);assert.ok(Math.abs(b.y-y-.055*90)<1e-6,'shared iceberg advances exactly once');
 assert.ok(Math.abs(r.time-f.surface.time)<1e-8);assert.equal(sea.fleet.every(v=>v.order==='hold'),true);
 const still=state(12);still.finalJourney.surface.polar.operation.npcs[0].ship.hull=0;tick(still,90);
 assert.equal(still.finalJourney.surface.polar.broken,0,'no invisible or timed channel opening');
});
test('handoff preserves the sea, opening timestamps, elapsed splits and one clock',()=>{
 const r=state(12);tick(r,90);const f=r.finalJourney,sea=f.surface.polar,ice=sea.ice,berg=sea.bergs[0],open=ice.opened.slice(),at=r.time,sub=r.ship,kestrel=f.surface.ship;
 arrangeHandoff(r);tick(r,5.1);
 assert.equal(f.watch.phase,'surface');assert.equal(r.ship,kestrel);assert.equal(f.subShip,sub);assert.ok(sub.moored);assert.equal(r.polar,sea);assert.equal(r.polar.ice,ice);assert.equal(r.polar.bergs[0],berg);
 assert.ok(r.time>at+5&&r.time<at+5.2);assert.equal(r.time,f.surface.time);assert.ok(r.splits.some(s=>s.name===level(12).polar.objectives[3]));
 assert.ok(open.some((t,i)=>t>=0&&ice.opened[i]===t),'existing channel ages are retained');assert.equal(r.polar.complete,false);assert.equal(f.watch.channel,false,'Kestrel still has to cut the last section');
 assert.ok(sea.operation.assets[0].ship.disabled);assert.equal(r.polar.fleet.every(v=>!v.returned),true);assert.doesNotThrow(()=>JSON.stringify(r.polar));
 const t=r.splits[0].time;tick(r,2);assert.equal(r.splits[0].time,t);assert.ok(sea.weatherFactor<1);
});
test('the shared weather window, pause and retry apply to both legs',()=>{
 const t=create();t.load(L.indexOf(level(12)),true);t.advance(2);t.pause();
 const before=JSON.stringify(t.state.run.finalJourney);t.advance(30);assert.equal(JSON.stringify(t.state.run.finalJourney),before);
 t.retry();assert.equal(t.state.run.time,0);assert.equal(t.state.run.finalJourney.watch.phase,'underwater');assert.equal(t.state.run.finalJourney.surface.polar.broken,0);
 for(const phase of ['underwater','surface']){
  const r=state(12);if(phase==='surface'){arrangeHandoff(r);tick(r,5.1);}
  const deadline=r.finalJourney.watch.deadline;r.time=deadline-.01;r.polar.time=r.time;r.finalJourney.surface.time=r.time;r.finalJourney.surface.polar.time=r.time;
  tick(r,.02);assert.match(r.polar.failure,/weather window/);assert.equal(r.polar.complete,false);
 }
});
test('completing the campaign archives the old 72-stage tour but preserves individual records and older circuits',()=>{
 const previous=L.filter(l=>!l.polar||l.stageNumber<=9).map(l=>l.polar?{...l,standalone:true}:l),old=C.manifest(previous),data=S.fresh();
 const row={time:900,contacts:0,clean:true},stage={runs:[row],ghost:[[0,100,100,0]],bestSplits:[20],clears:1,attempts:1};
 data.compatibility=old;data.stages['pale-reach-7']=structuredClone(stage);data.races['grand-tour']=[row];data.races.coast=[row];
 const out=S.sanitize(data);assert.deepEqual(out.stages['pale-reach-7'].ghost,stage.ghost);assert.equal(out.races.coast.length,1);assert.equal(out.races['grand-tour'].length,0);assert.equal(out.archivedRaces[C.archiveKey('grand-tour',old.races['grand-tour'])].length,1);
 assert.equal(out.compatibility.races['pale-reach'].split('|').length,12);assert.equal(out.compatibility.races['grand-tour'].split('|').length,84);assert.deepEqual(out.races['pale-reach'],[]);
});
for(const [n,pickup]of [[10,'near'],[10,'far'],[11],[12]])test(`7-${n}: ordinary controls complete ${pickup||'the entire assignment'}`,()=>{
 const t=require('./polar-finale-navigation.cjs').navigate(n,{pickup}),r=t.state.run,st=r.polar;
 assert.equal(t.state.status,'complete',JSON.stringify({time:r.time,failure:st.failure,mission:st.mission,journey:r.finalJourney?.watch}));
 assert.ok(r.ship.hull>0);assert.equal(r.splits.length,level(n).polar.objectives.length);assert.ok(r.splits.every(s=>s.time>0));
 if(n===10){assert.equal(st.stats.teamInserted,0);assert.equal(st.stats.teamRecovered,1);assert.equal(st.mission.alarm,false);assert.equal(st.recovery.selected,pickup);}
 if(n===11){assert.equal(st.stats.safeReturns,3);assert.ok(st.operation.survey.safeNow);assert.ok(st.fleet.every(f=>f.ship.hull>0));assert.equal(st.stats.shots,0);}
 if(n===12){assert.equal(st.stats.safeReturns,3);assert.ok(st.fleet.every(f=>f.ship.hull===100));assert.ok(r.finalJourney.watch.handoffAt>100);assert.ok(r.result.polar.submarineLeg>0&&r.result.polar.surfaceLeg>0);assert.equal(r.result.polar.teamRecovered,1);assert.ok(r.splits[4].time>r.finalJourney.watch.handoffAt+10);assert.ok(r.time<r.finalJourney.watch.deadline);}
});
