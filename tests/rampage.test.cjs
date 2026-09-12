'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const R=require('../src/rampage.js'), L=require('../src/levels.js'), S=require('../src/storage.js');
const {create}=require('./headless.cjs'), {replay}=require('../tools/verify-island-runs.cjs');
function start(){const t=create();t.load(L.findIndex(l=>l.rampage));return t;}
function isolated(){const l=JSON.parse(JSON.stringify(L.find(l=>l.rampage)));l.rampage.hills=[];l.rampage.districts=[];
 const s={x:200,y:200,vx:0,vy:0,a:0,r:0,hull:100};
 return {level:l,run:{ship:s,rampage:R.create(l,s),time:0,contacts:0,distance:0,maxSpeed:0,dockHold:0}};}
function step(a,input={},duration=1){for(let i=0;i<Math.round(duration*120);i++){a.run.time+=1/120;R.update(a.level,a.run,input,1/120);}}
test('World 5 contains exactly one explicitly standalone course',()=>{
 const rows=L.filter(l=>l.worldNumber===5);assert.equal(rows.length,1);assert.ok(rows[0].standalone);assert.ok(L.worlds[4].preview);
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
test('one published reference completes through controls only with two shields',()=>{
 const t=replay(require('./fixtures/gerbo-first-outing-controls.json'));
 assert.equal(t.state.status,'complete');assert.equal(t.state.run.result.clean,true);assert.equal(t.state.run.rampage.stats.shields,2);
 assert.equal(t.state.run.rampage.stats.districts,2);assert.equal(t.state.run.rampage.control,2);
 assert.ok(Math.abs(t.state.run.time-89.50833333333334)<1/120);
});
test('adding a standalone stage keeps the Codex migration and old circuits intact',()=>{
 const d=S.fresh?S.fresh():S.create({getItem:()=>null,setItem(){}}).data;
 d.races['grand-tour']=[{time:9000,contacts:0,clean:true}];d.stages['gerbo-first-outing']={runs:[{time:100,contacts:0,clean:true}],ghost:[],bestSplits:[]};
 const s=S.create({getItem:()=>JSON.stringify(d),setItem(){}});assert.equal(s.data.races['grand-tour'].length,1);assert.equal(s.best('gerbo-first-outing').time,100);
});
