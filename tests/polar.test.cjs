'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../src/levels.js'),I=require('../src/polar.js'),P=require('../src/physics.js');
const {create}=require('./headless.cjs');
const level=n=>L.find(l=>l.id===`pale-reach-${n}`);
const state=n=>({...I.create(level(n)),time:0,contacts:0,distance:0,maxSpeed:0,dockHold:0,sampleAt:0,ghost:[],splits:[]});

test('Pale Reach has nine standalone assignments and three future chapters',()=>{
 const w=L.worlds.find(w=>w.id==='pale-reach');assert.ok(w.partial&&!w.comingSoon);
 assert.equal(w.stages.filter(l=>!l.comingSoon).length,9);assert.equal(w.stages.filter(l=>l.comingSoon).length,3);
 const t=create();for(let n=1;n<=9;n++){t.cheats.level(7,n);assert.ok(t.state.run.polar);assert.ok(level(n).standalone);}
 assert.throws(()=>t.cheats.level(7,10),/Coming soon/);assert.throws(()=>t.cheats.circuit(7),/unavailable/);
 t.cheats.tour(0);assert.equal(t.state.marathon.route.length,72);
});
test('only a momentum-driven icebreaking bow opens sheet; ridges remain solid',()=>{
 for(const [iceClass,vx,vy,thickness,breaks] of [[1,3,0,.3,true],[0,3,0,.3,false],[1,.2,0,.3,false],[1,0,3,.3,false],[1,-3,0,.3,false],[1,3,0,2,false]]){
  const st=state(1).polar;st.ice.thickness.fill(thickness);
  const s=P.ship(210,210,0,{length:34,beam:13,mass:1.35,iceClass,vx,vy});
  st.player=s;I.iceContact(st,s,1/120);assert.equal(st.broken>0,breaks,`${iceClass},${vx},${vy},${thickness}`);
  if(breaks){assert.ok(s.vx<3);assert.ok(st.stats.sheetArea>0);}else assert.ok(st.ice.opened.every(t=>t<0));
 }
});
test('slush increases continuously, resists motion and never becomes an occupied-hull wall',()=>{
 const st=state(2).polar;st.ice.thickness.fill(.3);st.ice.opened.fill(0);
 const s=P.ship(330,330,0,{...level(2).spec,vx:2});st.player=s;
 st.time=20;assert.equal(I.slushAt(st,0),0);st.time=40;const young=I.slushAt(st,0);st.time=70;assert.ok(I.slushAt(st,0)>young);
 st.time=10000;const x=s.x,y=s.y;I.iceContact(st,s,1);assert.equal(s.x,x);assert.equal(s.y,y);assert.ok(s.vx>0&&s.vx<2);
 assert.equal(I.solidAt(st,x,y),false);assert.ok(st.ice.opened.every(t=>t===0));
 s.iceClass=1;I.iceContact(st,s,1/120);assert.equal(I.slushAt(st,I.indexAt(st.ice,x,y)),0);
});
test('turning-pocket completion is separate from opening a passage',()=>{
 const r=state(1);assert.ok(I.pocketClear(r.polar)<r.polar.config.pocket.required);
 r.polar.routeOpened=true;assert.equal(I.ready(r),false);
 for(const k of r.polar.pocket)r.polar.ice.opened[k]=0;
 assert.equal(I.ready(r),true);assert.equal(r.polar.complete,false);
});
test('polar splits retain elapsed completion times in bridge and result displays',()=>{
 const r=state(1),l=level(1),V=require('../src/polar-view.js'),format=t=>t.toFixed(2)+' s';
 r.polar.routeOpened=true;I.step(l,r,{},1/120);
 const first=r.splits[0].time;assert.ok(first>0);
 for(let n=0;n<120;n++)I.step(l,r,{},1/120);
 for(const k of r.polar.pocket)r.polar.ice.opened[k]=0;
 I.step(l,r,{},1/120);
 assert.equal(r.splits.length,2);assert.equal(r.splits[0].time,first);assert.ok(r.splits[1].time>first);
 const rows=V.splitRows(r,format);
 for(const split of r.splits)assert.ok(rows.includes(format(split.time)));
 assert.ok(rows.includes('<span>—</span>'));assert.ok(!rows.includes('✓'));
 assert.ok(V.dialog('result',l,r,format).includes(rows));
});
test('Hold preserves inertia and cargo cannot carve a replacement channel',()=>{
 const r=state(3),f=r.polar.fleet[0];assert.equal(I.command(r,'unknown','proceed'),false);
 assert.equal(I.command(r,f.id,'teleport'),false);assert.equal(I.command(r,f.id,'proceed'),true);
 f.ship.vx=2;const x=f.ship.x;assert.equal(I.command(r,f.id,'hold'),true);assert.equal(f.ship.vx,2);
 for(let i=0;i<120;i++)I.step(level(3),r,{rudder:0,thruster:0},1/120);
 assert.ok(f.ship.x>x+.5);assert.ok(I.speed(f.ship)>0);assert.equal(r.polar.broken,0);
});
test('supply captains require connected cleared water; delivery alone never completes rescue',()=>{
 const r=state(3),f=r.polar.fleet[0];assert.equal(I.waterRoute(r.polar,f.ship,f.route.at(-1)),null);
 r.polar.ice.opened.fill(0);assert.ok(I.waterRoute(r.polar,f.ship,f.route.at(-1)).length>1);
 r.polar.fleet.forEach(f=>f.unloaded=true);assert.equal(I.ready(r),false);
 r.polar.fleet.forEach(f=>f.returned=true);assert.equal(I.ready(r),true);
 r.polar.fleet[1].ship.hull=0;I.step(level(3),r,{},1/120);assert.match(r.polar.failure,/Every required crew/);assert.equal(r.polar.complete,false);
});
test('drifting solid ice transfers contact forces; fractures wait until hulls clear',()=>{
 const r=state(3),b=r.polar.bergs[0];r.ship.x=b.x;r.ship.y=b.y;r.ship.vx=2;
 const before=r.ship.x;I.step(level(3),r,{},1/120);assert.notEqual(r.ship.x,before+2/120);assert.ok(b.y>197);
 const p=state(1),x=p.ship.x,y=p.ship.y;p.polar.pendingFloes.push({x,y,k:1});
 I.step(level(1),p,{},1/120);assert.equal(p.polar.floes.length,0);
 p.ship.x+=80;I.step(level(1),p,{},1/120);assert.equal(p.polar.floes.length,1);assert.ok(p.polar.floes[0].mass>0);
});
test('pause freezes closure, fleet and drift; retry rebuilds all mission state',()=>{
 const t=create();t.load(L.indexOf(level(3)),true);t.advance(1);const r=t.state.run,time=r.polar.time,y=r.polar.bergs[0].y;
 t.pause();t.advance(2);assert.equal(r.polar.time,time);assert.equal(r.polar.bergs[0].y,y);assert.equal(t.convoyCommand('morrow','proceed'),false);
 t.retry();assert.notEqual(t.state.run,r);assert.equal(t.state.run.polar.time,0);assert.equal(t.state.run.polar.bergs[0].y,197);assert.equal(t.state.run.polar.stats.orders,0);
 assert.equal(t.state.run.polar.fleet[0].order,'hold');
});
for(const n of [1,2,3])test(`7-0${n}: complete fixed-step trip using helm and captain orders`,()=>{
 const {t,earlyPocket,closedLoad,bergWait}=require('./polar-navigation.cjs').navigate(n),r=t.state.run;
 assert.equal(t.state.status,'complete',JSON.stringify({time:r.time,ship:[r.ship.x,r.ship.y],dock:r.dock,fleet:r.polar.fleet.map(f=>f.waiting)}));
 assert.ok(r.ship.hull>90);assert.ok(r.result.polar);assert.ok(r.ghost.length>100);
 assert.equal(r.splits.length,I.progress(r).length);
 assert.ok(r.splits.every((s,i)=>s.time>0&&s.time<=r.time&&(!i||s.time>=r.splits[i-1].time)));
 assert.equal(t.state.storage.stages[t.state.level.id].runs.length,1);
 if(n===1){assert.ok(earlyPocket<r.polar.config.pocket.required);assert.ok(I.pocketClear(r.polar)>=.86);assert.equal(r.polar.floes.length,4);assert.equal(r.ship.hull,100);}
 if(n===2){assert.equal(r.polar.checkpoint,3);assert.ok(r.polar.fleet[0].returned);assert.ok(closedLoad>.1);assert.equal(r.ship.hull,100);}
 if(n===3){assert.equal(r.polar.stats.deliveries,2);assert.equal(r.polar.stats.safeReturns,2);assert.ok(r.polar.fleet.every(f=>f.ship.hull===100));assert.ok(bergWait);}
});
test('polar departure hulls start clear and the whole required hull must stay on the chart',()=>{
 for(const n of [1,2,3]){
  const r=state(n),l=level(n);
  for(const s of [r.ship,...r.polar.fleet.map(f=>f.ship)]){
   assert.ok(P.hull(s).every(p=>p.x>=0&&p.y>=0&&p.x<=l.world[0]&&p.y<=l.world[1]));
   const x=s.x,y=s.y;I.iceContact(r.polar,s,1/120);assert.equal(s.x,x);assert.equal(s.y,y);assert.equal(s.hull,100);
  }
 }
 const r=state(3),s=r.polar.fleet[0].ship;s.x=1;s.y=380;s.vx=-.1;
 I.step(level(3),r,{},1/120);assert.match(r.polar.failure,/MORROW left the assignment chart/);assert.ok(s.x>0&&s.x<1,'exit fails before the centre leaves, without bouncing');
});
test('Rime finishing leaves the late supply passage playable',()=>{
 const t=create();t.load(L.indexOf(level(2)),true);t.advance(450);
 assert.equal(t.state.status,'running');assert.equal(t.state.run.polar.failure,null);
 assert.ok(t.state.run.polar.fleet[0].returned);assert.equal(t.state.run.polar.checkpoint,0);
 assert.match(I.message(t.state.run),/retry when you choose/);
 const r=t.state.run;r.ship.x=300;r.ship.y=330;
 I.step(level(2),r,{},1/120);assert.equal(r.polar.checkpoint,1,'a late passage can still earn its checkpoints');
});
