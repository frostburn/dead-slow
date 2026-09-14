'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../src/levels.js'),P=require('../src/physics.js'),S=require('../src/storage.js');
const {create}=require('./headless.cjs');
const V=require('../src/verification.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const level=id=>L.find(l=>l.id===id);

test('practice Grand Tour starts unranked without recording a ranked departure',()=>{
 const t=create(),p=t.cheats.tour(8);assert.equal(p.circuit.length,60);assert.ok(p.practice&&p.circuit.practice);
 assert.equal(p.circuit.position,1);assert.equal(p.timeScale,8);assert.equal(t.state.storage.attempts,0);
 assert.ok(t.state.marathon.route.every(i=>!L[i].bonus&&!L[i].standalone));
});
test('all five practice circuits have twelve missions; invalid requests are atomic',()=>{
 const t=create();for(const w of [1,2,3,4,6]){const p=t.cheats.circuit(w,4);assert.equal(p.world,w);assert.equal(p.circuit.length,12);assert.ok(p.practice);}
 const before=t.cheats.progress();for(const call of [()=>t.cheats.circuit(5),()=>t.cheats.circuit('century-ship'),()=>t.cheats.tour(33),()=>t.cheats.tour(NaN)])assert.throws(call);
 assert.deepEqual(t.cheats.progress(),before);
});
test('practice survives all sixty transitions, retries and a return to 1x',()=>{
 // State-machine traversal only: finish() is deliberately isolated here. This
 // is NOT proof of sixty navigation completions; real controls are tested below.
 const t=create();t.cheats.tour(8);let expectedTime=0;
 for(let i=0;i<60;i++){
  assert.equal(t.state.marathon.position,i);assert.ok(t.state.run.pausedUsed);
  if(i%12===0){t.advance(.25);t.retry();expectedTime+=.25;assert.ok(t.state.run.pausedUsed);}
  if(i===4)t.cheats.speed(1);
  t.advance(.25);expectedTime+=.25;t.finish();
  assert.ok(t.state.run.result);assert.equal(t.state.storage.stages[t.state.level.id].runs.length,0);
  near(t.cheats.progress().circuit.time,expectedTime);
  if(i<59)t.next();
 }
 const p=t.cheats.progress();assert.equal(p.circuit.completed,60);assert.equal(p.circuit.splits.length,60);assert.equal(p.circuit.retries,5);
 assert.equal(p.level,'perihelion-dispatch');assert.equal(t.state.storage.races['grand-tour'].length,0);assert.equal(t.state.storage.attempts,0);
 p.circuit.splits[0].time=-1;assert.ok(t.cheats.progress().circuit.splits[0].time>=0,'inspection is detached');
 t.cheats.normal();assert.equal(t.state.marathon,null);assert.equal(t.cheats.speed(),1);assert.equal(t.state.run.pausedUsed,false);
});
test('actual fixed-step frames keep speed on retry and stop precisely on completion',()=>{
 const t=create();t.cheats.circuit(1,8);t.frame(0);t.frame(125);near(t.state.run.time,1);
 t.retry();assert.equal(t.cheats.speed(),8);t.frame(0);t.frame(125);near(t.state.run.time,1);near(t.cheats.progress().circuit.time,2);
 t.cheats.speed(0);t.frame(0);t.frame(5000);near(t.state.run.time,1);
 // A real docking hold, no direct finish shortcut for this check.
 t.cheats.warp(289,121,0);t.cheats.step(3);assert.equal(t.state.status,'complete');const done=t.state.run.time;
 t.frame(5100);near(t.state.run.time,done);t.next();assert.equal(t.cheats.speed(),0);assert.ok(t.state.run.pausedUsed);
});
test('all 64 assignments load with finite clean initial state and usable objectives',()=>{
 const t=create();assert.equal(L.length,64);
 for(let i=0;i<L.length;i++){
  t.load(i,false);const {run,level:l}=t.state;
  assert.equal(t.state.status,'ready',l.id);assert.ok([run.ship.x,run.ship.y,run.ship.vx,run.ship.vy].every(Number.isFinite));
  assert.equal(run.contacts,0,l.id);assert.ok(l.brief&&l.tip&&l.pace.every(Number.isFinite));
  assert.ok(l.openSides.length>0,l.id);assert.equal(l.bonus===true,l.id==='century-ship');
  if(!l.rampage&&!l.space)for(const target of [run.ship,...run.jobs.bodies])for(const o of run.static)assert.equal(!!P.sat(P.hull(target),o.poly),false,`${l.id}: starting hull / ${o.id}`);
 }
});
test('Backwater is an offset dogleg and the fingers still fit the freighter',()=>{
 const l=level('backwater');assert.ok(Math.abs(l.start[1]-l.berth.y)>65);
 assert.equal(l.buoys.length,2);assert.ok(Math.abs(l.buoys[0].y-l.buoys[1].y)>60);
 assert.ok(l.obstacles.some(o=>o.label==='OLD MOLE'));
 const t=create();t.load(L.indexOf(l));const s=P.ship(l.berth.x,l.berth.y,l.berth.a);
 assert.ok(P.docking(s,l.berth).inside);for(const o of t.state.run.static)assert.ok(!P.sat(P.hull(s),o.poly));
});
test('Island Exchange requires perpendicular ramps, retained partial manifest and real island geometry',()=>{
 const l=level('island-exchange');near(Math.abs(P.wrap(l.jobs[1].a-l.jobs[0].a)),Math.PI/2);
 assert.ok(Math.abs(l.jobs[1].y-l.jobs[0].y)>150);assert.equal(l.jobs[1].count,2);assert.deepEqual(l.jobs[2].vehicles,['van','van']);
 const t=create();t.load(L.indexOf(l));for(const j of l.jobs){const s=P.ship(j.x,j.y,j.a,l.spec);assert.ok(P.docking(s,j).inside);for(const o of t.state.run.static)assert.ok(!P.sat(P.hull(s),o.poly),j.name);}
});
for(const id of ['backwater','island-exchange'])test(id+': ordinary production console recording completes cleanly',()=>{
 const t=create(),[r]=t.cheats.verify(id);assert.ok(r.verified);assert.ok(r.clean);assert.equal(r.contacts,0);assert.equal(r.ranked,false);
 assert.equal(t.state.storage.stages[id].runs.length,0);assert.ok(r.eventsApplied>3);
 if(id==='island-exchange'){assert.equal(t.state.run.jobs.stats.vehiclesDelivered,6);assert.equal(t.state.run.jobs.onboard.length,0);}
 const f=V.runs.find(r=>r.level===id);near(r.time,f.expectedTime);
});
test('approach archive migration preserves clean/overall records and is idempotent',()=>{
 const old=S.create({getItem:()=>null,setItem(){}}).data;old.version=11;
 const stage={runs:[{time:111,contacts:1,clean:false},{time:123,contacts:0,clean:true}],ghost:[[0,280,265,0]],bestSplits:[22]};
 for(const id of ['backwater','island-exchange','granite-needle','gerbo-whiskerdoom'])old.stages[id]=structuredClone(stage);
 for(const id of Object.keys(old.races))old.races[id]=structuredClone(stage.runs);
 old.archivedRaces['archipelago-layout-v2']=structuredClone(stage.runs);
 const d=S.sanitize(old);assert.equal(d.version,S.VERSION);
 for(const id of ['backwater','island-exchange']){assert.ok(!d.stages[id]);assert.deepEqual(d.archivedStages[id+'-approach-v1'].ghost,stage.ghost);assert.deepEqual(d.archivedStages[id+'-approach-v1'].bestSplits,[22]);}
 for(const id of ['northwatch','archipelago','grand-tour']){assert.equal(d.races[id].length,0);assert.deepEqual(d.archivedRaces[id+'-approach-v1'],stage.runs);}
 for(const id of ['coast','meridian'])assert.deepEqual(d.races[id],stage.runs);
 assert.deepEqual(d.archivedRaces['gerbozilla-volcano-v1'],stage.runs);assert.equal(d.races.gerbozilla.length,0);
 assert.deepEqual(d.archivedRaces['archipelago-layout-v2'],stage.runs);assert.ok(d.stages['granite-needle']&&d.stages['gerbo-whiskerdoom']);
 d.stages.backwater=stage;d.races.northwatch=stage.runs;const next=S.sanitize(d);assert.equal(next.stages.backwater.runs.length,2);assert.equal(next.races.northwatch.length,2);
});
test('old dock-side ferry and old long-tour archives are not relabeled as current approaches',()=>{
 const d=S.create({getItem:()=>null,setItem(){}}).data;d.version=3;
 d.stages['island-exchange']={runs:[{time:100,contacts:0,clean:true}]};d.races.archipelago=[{time:500,contacts:0,clean:true}];
 const s=S.sanitize(d);assert.ok(s.archivedStages['island-exchange']);assert.ok(!s.archivedStages['island-exchange-approach-v1']);
 assert.equal(s.archivedRaces['archipelago-dock-starts'].length,1);assert.equal(s.archivedRaces['archipelago-approach-v1'].length,0);
});
