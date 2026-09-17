'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../src/levels.js'),I=require('../src/polar.js'),P=require('../src/physics.js'),O=I.operations;
const {create}=require('./headless.cjs');
const level=n=>L.find(l=>l.id===`pale-reach-${n}`);
const state=n=>({...I.create(level(n)),time:0,contacts:0,distance:0,maxSpeed:0,dockHold:0,sampleAt:0,ghost:[],splits:[]});
function tick(r,seconds,input={}){for(let i=0;i<Math.round(seconds*120);i++)I.step(r.polar.level,r,input,1/120);}
function firing(){const r=state(6);Object.assign(r.ship,{x:734,y:230,a:Math.PI/2});tick(r,.01);I.action(r,'target','battery');return r;}

test('all six polar charts launch required, patrol and response hulls clear of solid ice',()=>{
 for(let n=1;n<=6;n++){
  const r=state(n),o=r.polar.operation;
  for(const s of [r.ship,...r.polar.fleet.map(f=>f.ship),...(o?o.npcs.map(e=>e.ship):[]),...(o?.survey?[o.survey.ship]:[])]){
   const xy=[s.x,s.y],hp=s.hull;I.iceContact(r.polar,s,1/120);
   assert.deepEqual([s.x,s.y],xy,`${n}: ${s.name}`);assert.equal(s.hull,hp);
   assert.ok(P.hull(s).every(p=>p.x>=0&&p.y>=0&&p.x<=level(n).world[0]&&p.y<=level(n).world[1]));
  }
 }
});
test('survey transfer needs steady proximity; a tow transmits force and cannot stop Caliper instantly',()=>{
 const r=state(4),st=r.polar,o=st.operation,s=o.survey.ship;
 assert.equal(I.action(r,'fire'),false);assert.equal(I.action(r,'tow'),false);
 Object.assign(r.ship,{x:600,y:330,a:Math.PI/2,vx:1});assert.equal(I.action(r,'tow'),false);
 r.ship.vx=0;assert.equal(I.action(r,'tow'),true);
 tick(r,4);assert.equal(o.survey.recovered,false);tick(r,4.1);assert.equal(o.survey.recovered,true);
 r.ship.throttle=3;tick(r,40);assert.ok(s.y>300);assert.ok(I.speed(s)>.2);assert.ok(o.line);
 const v=[s.vx,s.vy];assert.equal(I.action(r,'tow'),true);assert.deepEqual([s.vx,s.vy],v);
 assert.equal(O.ready(st),false,'recorders and a moving tow outside safe water are insufficient');
 Object.assign(s,{x:135,y:510,vx:0,vy:0});O.after(st,r,0);assert.equal(o.survey.safeNow,true);
 s.x=230;O.after(st,r,0);assert.equal(o.survey.safeNow,false,'the stern and bow must fit, not only the centre');
});
test('tow winch respects limits and a line fouled around an installation parts visibly',()=>{
 const r=state(4),st=r.polar,o=st.operation;st.player=r.ship;
 Object.assign(r.ship,{x:600,y:330,a:Math.PI/2});assert.ok(I.action(r,'tow'));
 O.before(st,r,{winch:-1},30);assert.equal(o.line.length,18);
 O.before(st,r,{winch:1},30);assert.equal(o.line.length,65);
 Object.assign(r.ship,{x:677,y:245,a:Math.PI/2});Object.assign(o.survey.ship,{x:677,y:165,a:Math.PI/2});
 O.before(st,r,{},.51);assert.equal(o.line,null);assert.match(st.notice,/fouled/);assert.equal(st.stats.towBreaks,1);
});
test('civilian station damage fails the rescue; pickets warn and remain physical nonshooters',()=>{
 const r=state(4),st=r.polar,o=st.operation;
 Object.assign(r.ship,{x:450,y:290});tick(r,.1);assert.match(o.warning,/ALTER COURSE/);
 assert.ok(o.npcs.every(n=>!n.gun));assert.equal(o.gun,null);
 Object.assign(r.ship,{x:641,y:206,a:0,vx:2});tick(r,.01);
 assert.ok(o.assets[0].ship.hull<100);assert.match(st.failure,/civilian monitoring station/);assert.equal(st.complete,false);
});
test('unrelated patrol ice contacts do not count against the player’s clean rescue',()=>{
 const r=state(4),st=r.polar,s=st.operation.npcs[0].ship;
 I.impact(st,s,'picket-ice',{impact:1});assert.ok(s.hull<100);assert.equal(st.contacts,0);
 I.impact(st,s,'picket-survey',{impact:1},true);assert.equal(st.contacts,1,'contact involving the required survey vessel still counts');
});
test('opening approaches share the same navigable ice as player cuts and never refreeze a hull',()=>{
 const r=state(5),st=r.polar,o=st.operation,s=o.npcs[0].ship,goal=[170,310];st.player=r.ship;
 assert.equal(I.waterRoute(st,s,goal),null);
 const total=o.thaw.length;st.time=40;O.before(st,r,{},0);assert.ok(o.thawIndex>0&&o.thawIndex<total);
 st.time=90;O.before(st,r,{},0);assert.ok(I.waterRoute(st,s,goal));
 assert.ok(o.melts[0].opened===o.melts[0].total);assert.ok(o.melts[2].opened===0);
 const opened=st.ice.opened.slice();st.time=10000;O.before(st,r,{},0);
 for(let k=0;k<opened.length;k++)if(opened[k]>=0)assert.ok(st.ice.opened[k]>=0);
 const cut=state(5);cut.polar.ice.opened.fill(0);assert.ok(I.waterRoute(cut.polar,cut.polar.operation.npcs[0].ship,goal),'raiders can navigate any player-cleared connection');
});
test('guns need an arc, a stable solution and a fresh fire order; shells take time and reload',()=>{
 const r=firing(),st=r.polar,g=st.operation.gun,target=st.operation.assets[0],source={id:'player',ship:r.ship};
 assert.equal(I.action(r,'fire'),false);tick(r,1);assert.ok(g.solution>0&&g.solution<g.hold);
 r.ship.vx=2;assert.match(O.solution(st,source,target,g).reason,/Slow/);r.ship.vx=0;
 r.ship.a=-Math.PI/2;assert.match(O.solution(st,source,target,g).reason,/arc/);r.ship.a=Math.PI/2;
 r.ship.r=.03;assert.equal(O.solution(st,source,target,g).ok,false);r.ship.r=0;
 tick(r,3);assert.equal(st.stats.shots,0,'a settled gun never autofires');assert.ok(I.action(r,'fire'));
 assert.equal(st.stats.shots,1);assert.equal(g.ammo,23);assert.equal(I.action(r,'fire'),false);assert.equal(target.ship.hull,108);
 tick(r,.5);assert.equal(target.ship.hull,108);tick(r,2);assert.equal(target.ship.hull,72);
 assert.ok(g.cooldown>0);assert.ok(I.speed(r.ship)>0,'recoil is an impulse, not a stationary animation');
});
test('gun solution rejects friendlies in the line; a fired shell hits the first physical obstruction',()=>{
 const r=firing(),st=r.polar,o=st.operation,g=o.gun;tick(r,3);
 const blocker={id:'interceptor',team:'friendly',active:true,ship:P.ship(734,290,0,{length:30,beam:12,disabled:true})};o.npcs.push(blocker);
 assert.match(O.solution(st,{id:'player',ship:r.ship},o.assets[0],g).reason,/Friendly/);assert.equal(I.action(r,'fire'),false);
 blocker.ship.x=800;assert.ok(I.action(r,'fire'));blocker.ship.x=734;
 // After launch no homing or fresh permission check can make the shell skip a hull.
 for(let i=0;i<240;i++){st.time+=1/120;O.after(st,r,1/120);}
 assert.equal(blocker.ship.hull,64);assert.equal(o.assets[0].ship.hull,108);assert.equal(st.stats.damageTaken,36);
 assert.equal(O.segmentHit({x:5,y:5},{x:8,y:5},P.rect({x:0,y:0,w:10,h:10})),0);
 assert.equal(O.segmentHit({x:-5,y:5},{x:15,y:5},P.rect({x:0,y:0,w:10,h:10})),.25);
});
test('response boats wait for the alarm and clear spawn water; destroyed batteries stop firing',()=>{
 const r=firing(),st=r.polar,o=st.operation,n=o.npcs[0];st.time=300;O.move(st,r,0,I);assert.equal(n.active,false);
 o.alarmAt=300;st.time=360;Object.assign(r.ship,{x:n.ship.x,y:n.ship.y});O.move(st,r,0,I);assert.equal(n.active,false);
 r.ship.x-=80;O.move(st,r,0,I);assert.equal(n.active,true);
 const battery=o.assets[0];battery.ship.hull=0;battery.gun.solution=4;O.after(st,r,1/120);assert.equal(battery.gun.solution,0);assert.equal(o.shells.length,0);
});
test('cargo and safe returns define defense victory; the strike still needs an actual withdrawal',()=>{
 const r=state(5);r.polar.fleet.forEach(f=>f.unloaded=true);assert.equal(I.ready(r),false);
 r.polar.fleet.forEach(f=>f.returned=true);tick(r,.01);assert.equal(r.polar.complete,true);assert.equal(r.polar.stats.hostilesDisabled,0);
 const s=firing();s.polar.operation.assets[0].ship.hull=0;assert.equal(I.ready(s),false);
 s.polar.operation.assets[1].ship.hull=0;tick(s,.01);assert.equal(I.ready(s),true);assert.equal(s.polar.complete,false);
 s.ship.hull=0;tick(s,.01);assert.equal(s.polar.complete,false);assert.match(s.polar.failure,/lost/);
});
test('pause freezes the new operations and rejects fire/tow orders; retry restores the assignment',()=>{
 const t=create();t.load(L.indexOf(level(6)),true);t.advance(2);const r=t.state.run;t.polarAction('target','battery');t.pause();
 const snapshot=JSON.stringify(r.polar.operation);t.advance(20);assert.equal(JSON.stringify(r.polar.operation),snapshot);
 assert.equal(t.polarAction('target','fuel'),false);assert.equal(t.polarAction('fire'),false);t.retry();assert.equal(t.state.run.polar.operation.gun.target,null);
 assert.equal(t.state.run.polar.operation.thawIndex,0);assert.equal(t.state.run.polar.operation.assets[0].ship.hull,108);
});
for(const n of [4,5,6])test(`7-0${n}: complete mission with ordinary helm, tow, gun and captain orders`,()=>{
 const t=require('./polar-operations-navigation.cjs').navigate(n),r=t.state.run;
 assert.equal(t.state.status,'complete',JSON.stringify({time:r.time,failure:r.polar.failure,xy:[r.ship.x,r.ship.y],dock:r.dock}));
 assert.ok(r.ship.hull>0);assert.equal(r.splits.length,I.progress(r).length);assert.ok(r.splits.every(s=>s.time>0));
 assert.equal(t.state.storage.stages[t.state.level.id].runs.length,1);
 if(n===4){assert.ok(r.polar.operation.survey.ship.hull>90);assert.equal(r.polar.stats.recorders,1);assert.equal(r.polar.stats.towBreaks,0);assert.equal(r.polar.operation.assets[0].ship.hull,100);}
 if(n===5){assert.equal(r.polar.stats.deliveries,2);assert.equal(r.polar.stats.safeReturns,2);assert.ok(r.polar.fleet.every(f=>f.ship.hull===100));assert.ok(r.polar.stats.shots>0);}
 if(n===6){assert.ok(r.polar.operation.assets.every(a=>a.ship.hull===0));assert.ok(r.polar.operation.npcs.some(n=>n.active&&n.ship.hull>0),'withdrawal succeeds with live reinforcements');assert.equal(r.polar.stats.shots,6);}
});
test('Home Ice cannot be completed by ignoring the attack and only ordering departures',()=>{
 const t=require('./polar-operations-navigation.cjs').navigate(5,{defend:false});assert.equal(t.state.status,'failed');assert.ok(t.state.run.polar.fleet.some(f=>f.ship.hull===0));
});
