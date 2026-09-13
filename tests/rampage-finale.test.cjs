'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rampage.js'),L=require('../src/levels.js');
const {create}=require('./headless.cjs');
const V=require('../src/verification.js');
const DT=1/120;
function scenario(id='gerbo-prickly-business'){
 const level=structuredClone(L.find(l=>l.id===id));
 const ship={x:level.start[0],y:level.start[1],vx:0,vy:0,r:0,a:0,mass:8,hull:100};
 return {level,run:{ship,rampage:R.create(level,ship),time:0,contacts:0,distance:0,maxSpeed:0,dockHold:0}};
}
function step(t,time=DT,input={}){for(let i=0;i<Math.round(time/DT);i++){t.run.time+=DT;R.update(t.level,t.run,input,DT);}}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('twelve real courses end with avoidance, pursuit and a free-start escort',()=>{
 const rows=L.filter(l=>l.rampage);assert.equal(rows.length,12);
 assert.deepEqual(rows.map(l=>l.stageNumber),Array.from({length:12},(_,i)=>i+1));
 assert.equal(L.filter(l=>!l.standalone&&!l.bonus).length,48);
 for(const l of rows.slice(-3)){assert.ok(l.rampage.monsters.some(m=>m.invulnerable));assert.equal(l.rampage.districts.length,0);}
 assert.equal(rows[11].rampage.rescue.free,true);
});
test('every new player, companion and pet starts clear of solid geometry and water',()=>{
 for(const l of L.filter(l=>l.rampage&&l.stageNumber>=10)){
  const c=l.rampage,actors=[{x:l.start[0],y:l.start[1],r:c.radius},...(c.monsters||[]),...(c.rescue?[c.rescue]:[])];
  for(const body of actors){assert.equal(R.water({...c,radius:body.r},body),0,l.id);for(const rock of c.rocks||[])assert.equal(R.circleContact(body,body.r,R.rockPolygon(rock)),null,`${l.id}: ${body.name}`);}
 }
});
function impact(shield){const t=scenario(),m=t.run.rampage.monsters[0];
 Object.assign(t.run.ship,{x:m.x-m.r-24+.2,y:m.y,vx:28});m.vx=-7;
 if(shield)R.shield(t.run);R.petPair(t.run,m);return t;}
test('Needlesworth takes no ram damage; shield blocks injury but not momentum exchange',()=>{
 const a=impact(false),b=impact(true);const m=a.run.rampage.monsters[0],n=b.run.rampage.monsters[0];
 assert.equal(m.health,m.maxHealth);assert.equal(n.health,n.maxHealth);
 assert.ok(a.run.ship.hull<100);assert.equal(b.run.ship.hull,100);
 near(a.run.ship.vx,b.run.ship.vx);near(m.vx,n.vx);
 near(8*a.run.ship.vx+m.mass*m.vx,8*28+m.mass*(-7));
 assert.equal(b.run.rampage.stats.needleBlocks,1);
});
test('even a high-speed boulder collision or arbitrary damage cannot wound Needlesworth',()=>{
 const t=scenario(),m=t.run.rampage.monsters[0];t.level.rampage.hills=[];t.level.rampage.forests=[];
 m.x=600;m.y=600;m.vx=80;m.state='charge';m.angle=0;m.until=100;
 t.run.rampage.rocks=[{poly:[{x:659,y:200},{x:730,y:200},{x:730,y:1000},{x:659,y:1000}]}];
 step(t);assert.ok(m.vx<0);assert.equal(m.health,100);
 R.hurtMonster(m,1e9);assert.equal(m.health,100);assert.ok(!m.defeated);
});
test('invulnerable and optional pursuers never become defeat objectives',()=>{
 const t=scenario();t.run.rampage.control=t.run.rampage.controlCount;
 assert.ok(R.ready(t.run));assert.equal(t.run.rampage.stats.monsters,0);
 const e=scenario('gerbo-long-way-home');e.run.rampage.control=e.run.rampage.controlCount;e.run.rampage.rescued=true;
 assert.ok(R.ready(e.run));assert.ok(e.run.rampage.monsters.every(m=>m.health>0));
});
test('Needlesworth locks his charge and recovers rather than continuously steering at the player',()=>{
 const t=scenario(),m=t.run.rampage.monsters[0];t.run.rampage.rocks=[];
 Object.assign(t.run.ship,{x:m.x+310,y:m.y});step(t);assert.equal(m.state,'warning');const angle=m.angle;
 t.run.ship.y+=300;step(t,1);near(m.angle,angle);step(t,1.6);assert.equal(m.state,'charge');
 step(t,4.1);assert.equal(m.state,'rest');assert.ok(m.health>0);
});
test('the physical refuge notch fits the ball but stops a giant hedgehog',()=>{
 const t=scenario('gerbo-rolling-threat'),c=t.level.rampage,polys=c.rocks.slice(-2).map(R.rockPolygon);
 const point={x:2465,y:640};assert.ok(polys.every(poly=>!R.circleContact(point,24,poly)));
 assert.ok(polys.some(poly=>R.circleContact(point,59,poly)));
});
test('a charging Needlesworth cannot force his body through the refuge notch',()=>{
 const t=scenario('gerbo-rolling-threat'),m=t.run.rampage.monsters[0];
 t.level.rampage.hills=[];t.level.rampage.forests=[];
 Object.assign(t.run.ship,{x:2690,y:640});Object.assign(m,{x:2330,y:640,vx:30,state:'charge',angle:0,until:100});
 step(t,12);assert.ok(m.x<2430-m.r*.3);assert.equal(m.health,100);
});
test('finale begins with Whiskerdoom free and following, without cage or destruction requirements',()=>{
 const t=scenario('gerbo-long-way-home'),st=t.run.rampage,l=st.lady;
 assert.ok(st.unlocked&&l.following);assert.ok(!st.rescued);assert.equal(st.districts.length,0);assert.ok(!st.rocks.some(r=>r.gate));
 const x=l.x;step(t,1);near(l.x,x);assert.ok(!R.ready(t.run));
 step(t,4,{rudder:1});assert.ok(l.x>x);assert.ok(l.x<t.run.ship.x-40);
});
test('route crossings release pets once and queue finite, announced artillery salvos',()=>{
 const t=scenario('gerbo-long-way-home'),st=t.run.rampage;assert.ok(st.monsters.every(m=>!m.released));
 const before=st.monsters.map(m=>[m.x,m.y]);step(t,2);assert.deepEqual(st.monsters.map(m=>[m.x,m.y]),before);
 const c=t.level.rampage.controls[0];Object.assign(t.run.ship,{x:c.x,y:c.y});step(t,DT*2);
 assert.equal(st.control,1);assert.equal(st.ambushed,1);assert.equal(st.stats.salvos,1);assert.equal(st.strikes.length,3);
 assert.ok(st.monsters[0].released);assert.ok(!st.monsters[1].released);
 step(t,1);assert.equal(st.stats.salvos,1);
 const d=t.level.rampage.controls[1];Object.assign(t.run.ship,{x:d.x,y:d.y});step(t,DT*2);
 assert.ok(st.monsters.every(m=>m.released));assert.equal(st.stats.salvos,2);assert.equal(st.strikes.length,7);
});
test('an interceptor aims at the companion, not automatically at Gerbozilla',()=>{
 const t=scenario('gerbo-long-way-home'),st=t.run.rampage,m=st.monsters[1];
 m.released=true;Object.assign(m,{x:1500,y:900});Object.assign(t.run.ship,{x:1700,y:900});Object.assign(st.lady,{x:1500,y:650});
 step(t);assert.equal(m.state,'warning');near(m.angle,-Math.PI/2);
});
test('a strike locks once to its designated hamster and harms her despite the player shield',()=>{
 const t=scenario('gerbo-long-way-home'),st=t.run.rampage;
 st.monsters=[];st.strikes=[{x:null,y:null,target:'lady',launchAt:0,impactAt:2,r:52,damage:22,lead:0}];
 step(t);const target={x:st.strikes[0].x,y:st.strikes[0].y};
 st.lady.x+=15;R.shield(t.run);step(t,1);near(st.strikes[0].x,target.x);near(st.strikes[0].y,target.y);
 step(t,1.1);assert.equal(st.lady.health,78);assert.equal(t.run.ship.hull,100);assert.equal(st.stats.escortStrikeHits,1);assert.equal(st.stats.strikeDodges,0);
});
test('lethal escort artillery fails the same tick, before any capture can be awarded',()=>{
 const t=scenario('gerbo-long-way-home'),st=t.run.rampage;st.monsters=[];st.lady.health=10;
 st.strikes=[{x:st.lady.x,y:st.lady.y,target:'lady',impactAt:0,r:52,damage:22}];
 step(t);assert.equal(t.run.failure.type,'lost-friend');assert.equal(t.run.dockHold,0);assert.ok(!st.rescued);
});
test('reaching the end alone cannot complete the escort',()=>{
 const t=scenario('gerbo-long-way-home'),st=t.run.rampage;st.control=st.controlCount;st.monsters=[];st.ambushed=2;
 Object.assign(t.run.ship,{x:t.level.rampage.finish.x,y:t.level.rampage.finish.y});step(t,2.1);
 assert.ok(!st.rescued);assert.equal(t.run.dockHold,0);
});
for(const id of ['gerbo-prickly-business','gerbo-rolling-threat','gerbo-long-way-home'])test(id+' has a clean control-only recording in the production console',()=>{
 const f=V.runs.find(f=>f.level===id);assert.ok(f);const t=create();
 t.cheats.watch(id,0);t.advance(f.duration);const report=t.cheats.report();
 assert.ok(report.verified&&report.clean);assert.equal(t.state.status,'complete');
 assert.equal(t.state.storage.stages[id].runs.length,0);near(t.state.run.time,f.expectedTime);
 assert.equal(t.state.run.rampage.monsters[0].health,100);
 if(id==='gerbo-rolling-threat')assert.ok(t.state.run.rampage.stats.needleBlocks>=2);
 if(id==='gerbo-long-way-home'){
  assert.equal(t.state.run.rampage.lady.health,100);assert.ok(t.state.run.rampage.rescued);
  assert.equal(t.state.run.rampage.stats.monsters,2);assert.equal(t.state.run.rampage.stats.salvos,2);
 }
});
