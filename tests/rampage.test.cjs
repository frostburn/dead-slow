'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const R=require('../src/rampage.js'), L=require('../src/levels.js'), S=require('../src/storage.js');
const {create}=require('./headless.cjs'), {replay}=require('../tools/verify-island-runs.cjs');
function start(){const t=create();t.load(L.findIndex(l=>l.rampage));return t;}
function isolated(){const l=JSON.parse(JSON.stringify(L.find(l=>l.rampage)));l.rampage.hills=[];l.rampage.districts=[];
 const s={x:200,y:200,vx:0,vy:0,a:0,r:0,hull:100};
 return {level:l,run:{ship:s,rampage:R.create(l,s),time:0,contacts:0,distance:0,maxSpeed:0,dockHold:0}};}
function step(a,input={},duration=1){for(let i=0;i<Math.round(duration*120);i++){a.run.time+=1/120;R.update(a.level,a.run,input,1/120);}}
test('World 5 contains three explicitly standalone courses',()=>{
 const rows=L.filter(l=>l.worldNumber===5);assert.equal(rows.length,3);assert.ok(rows.every(l=>l.standalone));assert.ok(L.worlds[4].preview);
 const t=start();t.marathon('grand-tour');assert.equal(t.state.marathon.route.length,48);assert.ok(t.state.marathon.route.every(i=>!L[i].rampage));
 t.marathon('gerbozilla');assert.equal(t.state.marathon,null);assert.ok(t.state.run.rampage);
});
test('diagonal running is normalized; releasing preserves momentum',()=>{
 const a=isolated(),b=isolated();step(a,{rudder:1},5);step(b,{rudder:1,thruster:1},5);
 assert.ok(Math.abs(Math.hypot(a.run.ship.vx,a.run.ship.vy)-Math.hypot(b.run.ship.vx,b.run.ship.vy))<1e-9);
 const speed=a.run.ship.vx;step(a,{},.2);assert.ok(a.run.ship.vx>speed*.98);
});
test('counter-pushing slows and eventually reverses the ball',()=>{
 const a=isolated();step(a,{rudder:1},5);const before=a.run.ship.vx;step(a,{rudder:-1},2);assert.ok(a.run.ship.vx<before);step(a,{rudder:-1},6);assert.ok(a.run.ship.vx<0);
});
test('contour elevation and analytical slope agree',()=>{
 const c=L.find(l=>l.rampage).rampage,t=R.terrain(c,300,530),e=.001;
 assert.ok(Math.abs(t.dx-(R.terrain(c,300+e,530).height-R.terrain(c,300-e,530).height)/(2*e))<1e-7);assert.ok(t.height>20&&t.dx>0);
});
test('fully wet controls only spin the shell; they do not propel it',()=>{
 const a=isolated();Object.assign(a.run.ship,{x:600,y:515});step(a,{rudder:1},1);
 assert.equal(a.run.ship.vx,0);assert.equal(a.run.ship.vy,0);assert.ok(a.run.rampage.roll>1);assert.equal(a.run.rampage.wet,1);
});
test('a ball carries existing momentum through the lake',()=>{
 const a=isolated();Object.assign(a.run.ship,{x:600,y:515,vx:15});step(a,{},1);
 assert.ok(a.run.ship.x>614);assert.ok(a.run.ship.vx>14);assert.ok(a.run.rampage.stats.waterTime>.99);
});
test('shield has a finite protected window and a cooldown, not invulnerability',()=>{
 const t=start(),r=t.state.run;assert.ok(R.shield(r));assert.ok(!R.shield(r));assert.ok(R.protectedAt(r));r.time=3.01;assert.ok(!R.protectedAt(r));assert.ok(!R.shield(r));r.time=9;assert.ok(R.shield(r));
});
function ram(shield){const t=start(),r=t.state.run,d=r.rampage.districts[0];Object.assign(r.ship,{x:d.x-d.r-24+.1,y:d.y,vx:18,vy:0});if(shield)t.lineAction();t.advance(1/120);return r;}
test('ramming deals mutual damage; shield prevents only shell damage',()=>{
 const a=ram(false),b=ram(true);assert.equal(a.rampage.districts[0].health,0);assert.equal(b.rampage.districts[0].health,0);
 assert.ok(a.ship.hull<100);assert.equal(b.ship.hull,100);assert.equal(a.ship.vx,b.ship.vx);assert.ok(b.ship.vx<18);assert.equal(b.rampage.stats.blocked,1);
});
test('defence rounds are physical, damage the shell, and respect shields',()=>{
 for(const shield of [false,true]){const t=start(),r=t.state.run;if(shield)t.lineAction();r.rampage.shots.push({x:r.ship.x,y:r.ship.y,vx:0,vy:0,life:1});t.advance(1/120);assert.equal(r.ship.hull,shield?100:92);assert.equal(r.rampage.shots.length,0);}
});
test('the whole ball leaving the paper ends the attempt',()=>{
 const t=start();t.setShip({x:23,y:500,vx:-1});t.advance(1/120);assert.equal(t.state.status,'failed');assert.equal(t.state.run.failure.type,'off-map');
});
test('recovery meadow does not bypass the two controls and city objectives',()=>{
 const t=start(),f=t.state.level.rampage.finish;t.setShip({x:f.x,y:f.y});t.advance(3);assert.equal(t.state.status,'running');assert.ok(!t.state.run.dock.ready);
});
for (const l of L.filter(l=>l.rampage)) test(l.name+' has a clean input-only reference',()=>{
 const f=require('./fixtures/'+l.id+'-controls.json'),t=replay(f);
 assert.equal(t.state.status,'complete');assert.equal(t.state.run.result.clean,true);
 assert.equal(t.state.run.rampage.stats.districts,l.rampage.districts.length);
 assert.equal(t.state.run.rampage.control,l.rampage.controls.length);
 assert.ok(Math.abs(t.state.run.time-f.expectedTime)<1/120);
});
test('adding a standalone stage keeps the Codex migration and old circuits intact',()=>{
 const d=S.fresh?S.fresh():S.create({getItem:()=>null,setItem(){}}).data;
 d.races['grand-tour']=[{time:9000,contacts:0,clean:true}];d.stages['gerbo-first-outing']={runs:[{time:100,contacts:0,clean:true}],ghost:[],bestSplits:[]};
 const s=S.create({getItem:()=>JSON.stringify(d),setItem(){}});assert.equal(s.data.races['grand-tour'].length,1);assert.equal(s.best('gerbo-first-outing').time,100);
});

test('wet gravity survives at full and partial immersion while paw drive loses grip',()=>{
 for(const offset of [0,75]){
  const a=isolated(),b=isolated();
  for(const z of [a,b]){z.level.rampage.hills=[{x:500,y:515,rx:130,ry:100,height:20}];Object.assign(z.run.ship,{x:600+offset,y:515});}
  const wet=R.water(a.level.rampage,a.run.ship),slope=R.terrain(a.level.rampage,a.run.ship.x,515);
  assert.ok(wet>0, 'test hull must actually be wet');
  step(a,{},1/120);step(b,{rudder:1},1/120);
  assert.ok(Math.abs(a.run.ship.vx-(-7.007*slope.dx)/120)<1e-10);
  assert.ok(Math.abs(b.run.ship.vx-a.run.ship.vx-(1-wet)*a.level.rampage.drive/120)<1e-10);
 }
});
test('irregular shoreline drawing samples agree with water classification',()=>{
 for(const l of L.filter(l=>l.rampage)) for(const lake of l.rampage.lakes) {
  const rs=[];
  for(let i=0;i<120;i++){
   const angle=i*Math.PI/60,p=R.lakePoint(lake,angle,.998),q=R.lakePoint(lake,angle,1.002);
   assert.ok(R.inLake(lake,p.x,p.y));assert.ok(!R.inLake(lake,q.x,q.y));rs.push(R.shoreRadius(lake,angle));
  }
  assert.ok(Math.max(...rs)-Math.min(...rs)>.2);
 }
});
test('rotated irregular hills keep analytical gravity consistent with the contour field',()=>{
 for(const l of L.filter(l=>l.rampage)) for(const h of l.rampage.hills){
  const x=h.x+23,y=h.y-31,e=.001,t=R.terrain(l.rampage,x,y);
  for(const [axis,dx,dy] of [['dx',e,0],['dy',0,e]]) {
   const fd=(R.terrain(l.rampage,x+dx,y+dy).height-R.terrain(l.rampage,x-dx,y-dy).height)/(2*e);
   assert.ok(Math.abs(t[axis]-fd)<1e-7);
  }
 }
});
test('hind-paw phase walks under effort, paddles on water and rests while coasting',()=>{
 const a=isolated();step(a,{rudder:1},2);assert.ok(a.run.rampage.pawPhase>0);
 const phase=a.run.rampage.pawPhase;step(a,{},1);assert.equal(a.run.rampage.pawPhase,phase);
 Object.assign(a.run.ship,{x:600,y:515,vx:0,vy:0});step(a,{rudder:1},1);
 assert.ok(a.run.rampage.pawPhase>phase+3);assert.equal(a.run.ship.vx,0);
});
test('only obsolete Seedhaven records are archived, idempotently',()=>{
 const d=S.create({getItem:()=>null,setItem(){}}).data;d.version=6;
 const old={runs:[{time:89.5,contacts:0,clean:true}],ghost:[[0,130,530,0]],bestSplits:[12,22]};
 d.stages['gerbo-first-outing']=old;d.stages.vacuum=old;
 d.races['grand-tour']=[{time:9000,contacts:0,clean:true}];
 const v=S.sanitize(d);assert.equal(v.version,7);assert.equal(v.stages['gerbo-first-outing'],undefined);
 assert.equal(v.archivedStages['gerbo-first-outing'].runs[0].time,89.5);
 assert.deepEqual(v.archivedStages['gerbo-first-outing'].ghost,old.ghost);assert.deepEqual(v.archivedStages['gerbo-first-outing'].bestSplits,old.bestSplits);
 assert.equal(v.stages.vacuum.runs[0].time,89.5);assert.equal(v.races['grand-tour'].length,1);
 v.stages['gerbo-first-outing']=old;assert.equal(S.sanitize(v).stages['gerbo-first-outing'].runs.length,1);
});
test('Cushion Ridge bends a coasting ball south without player steering',()=>{
 const l=L.find(l=>l.id==='gerbo-banking'),t=R.terrain(l.rampage,575,418);
 assert.ok(t.dy<-.05,'the named bank must exert a meaningful southward force');
 const s={x:575,y:418,vx:15,vy:0,a:0,r:0,hull:100};
 const run={ship:s,rampage:R.create(l,s),time:0,contacts:0,distance:0,maxSpeed:0,dockHold:0};
 R.update(l,run,{},1/120);assert.ok(s.vy>0);assert.equal(run.rampage.effort,0);
});
