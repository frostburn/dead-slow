'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../src/levels.js'),I=require('../src/polar.js'),U=require('../src/submarine.js'),P=require('../src/physics.js');
const {create}=require('./headless.cjs');
const level=n=>L.find(l=>l.id===`pale-reach-${n}`);
const state=n=>({...I.create(level(n)),time:0,contacts:0,distance:0,maxSpeed:0,dockHold:0,sampleAt:0,ghost:[],splits:[]});
function tick(r,seconds,input={}){for(let i=0;i<Math.round(seconds*120);i++)I.step(r.polar.level,r,input,1/120);}
function firing(n=7){
 const r=state(n),st=r.polar,a=st.actors.find(a=>a.hostile);
 Object.assign(r.ship,{x:790,y:700,a:0,depth:48,depthTarget:48});Object.assign(a.ship,{x:1000,y:700,a:Math.PI,vx:0,vy:0});
 a.route=[[1000,700],[1001,700]];a.cruise=0;a.gun=null;
 const t=U.Sonar.observe(st,a,r.ship,st.time,true);I.action(r,'target',t.id);assert.ok(I.action(r,'identify'));return r;
}

test('all submarine charts start with physical depth clearance and bounded hulls',()=>{
 for(const n of [7,8,9]){
  const r=state(n),st=r.polar;
  for(const s of [r.ship,...st.actors.map(a=>a.ship)]){
   assert.ok(P.hull(s).every(p=>p.x>=0&&p.y>=0&&p.x<=level(n).world[0]&&p.y<=level(n).world[1]));
   for(const o of U.obstacles(st,s.depth))assert.equal(P.sat(P.hull(s),o.poly),null,`${n}: ${s.name}`);
  }
 }
});
test('depth bands take time; keel and seabed restrictions include the entire hull',()=>{
 const r=state(7),s=r.ship,st=r.polar;
 assert.ok(I.action(r,'depth','2'));assert.equal(s.depth,18);tick(r,10);assert.ok(s.depth>18&&s.depth<40);tick(r,80);assert.ok(Math.abs(s.depth-88)<.02);
 Object.assign(s,{x:555,y:st.bergs[0].y,depth:88,depthTarget:88,heave:0});assert.equal(I.action(r,'depth','1'),false);assert.match(st.notice,/keel.*seabed/);
 assert.equal(U.obstacles(st,88).some(o=>o.id==='keel'),false);assert.equal(U.obstacles(st,48).some(o=>o.id==='keel'),true);
 Object.assign(s,{x:580,y:575,depth:48,depthTarget:48});assert.equal(I.action(r,'depth','2'),false);assert.equal(U.space(st,s).floor,70);
 assert.ok(U.depthAllowed(st,s,18));
 const xy=[s.x,s.y];s.depth=88;tick(r,.01);assert.notDeepEqual([s.x,s.y],xy,'a deep hull collides with the rise horizontally instead of passing through it');
 assert.ok(Math.abs(s.depth-88)<.02,'terrain cannot teleport a vessel to a different depth');
});
test('sonar observations are detached memories; lost tracks expand without following truth',()=>{
 const r=state(9),st=r.polar,a=st.actors.find(a=>a.hostile);st.noise=.1;
 const t=U.Sonar.observe(st,a,r.ship,0),first=U.Sonar.predict(t,0),saved=structuredClone(t);
 Object.assign(a.ship,{x:1100,y:100,vx:2,vy:3});assert.deepEqual(t,saved);
 const old=U.Sonar.predict(t,30);assert.ok(old.radius>first.radius);assert.equal(old.x,t.x+t.vx*30);assert.notEqual(old.x,a.ship.x);
 assert.equal(U.Sonar.predict(t,90).x,U.Sonar.predict(t,45).x,'motion extrapolation stops while uncertainty continues growing');
 const active=U.Sonar.observe(st,a,r.ship,31,true);assert.ok(active.radius<first.radius);assert.equal(active.category,'submarine');
 const at=active.at;U.Sonar.observe(st,a,r.ship,32,false);assert.equal(active.at,at,'a weaker passive sample cannot instantly overwrite the clearer active fix');
 U.Sonar.prune(st,182);assert.equal(st.tracks.length,0);
});
test('a pulse has delayed echoes and gives a listener the emission fix, not a live player reference',()=>{
 const r=state(9),st=r.polar,a=st.actors.find(a=>a.hostile);
 Object.assign(r.ship,{x:800,y:700,depth:48,depthTarget:48});Object.assign(a.ship,{x:1000,y:600,a:Math.atan2(100,-200)});
 assert.ok(I.action(r,'ping'));assert.equal(st.tracks.length,0);assert.ok(st.echoes.length);assert.equal(a.fix.x,800);assert.equal(a.fix.y,700);
 r.ship.x=780;assert.equal(a.fix.x,800);assert.equal(I.action(r,'ping'),false);
 tick(r,5);assert.ok(st.tracks.some(t=>t.entity===a.id&&t.source==='active'));assert.ok(st.torpedoes.some(t=>t.hostile),'a steady enemy can attack the announced fix');
 assert.equal(a.fix.x,800,'quiet movement outside passive reach is not automatically tracked');
});
test('the first return cannot be blindly armed; friendly, decoy and stale contacts reject fire',()=>{
 const r=state(7),st=r.polar;tick(r,2);const first=st.tracks[0];assert.equal(first.category,'unknown');
 I.action(r,'target',first.id);assert.equal(I.action(r,'identify'),false);assert.equal(I.action(r,'fire'),false);assert.equal(st.gun.ammo,6);
 for(const a of st.actors.filter(a=>!a.hostile)){
  const t=U.Sonar.observe(st,a,r.ship,st.time,true);I.action(r,'target',t.id);assert.ok(I.action(r,'identify'));assert.equal(I.action(r,'fire'),false);
 }
 assert.equal(st.stats.shots,0);assert.equal(st.mission.identified,false);
 const armed=firing();armed.polar.time=40;assert.match(U.firingSolution(armed.polar).reason,/reacquire/);assert.equal(I.action(armed,'fire'),false);
});
test('torpedoes require a stable arc and observed depth, travel through time, and hit solid terrain',()=>{
 const r=firing(),st=r.polar,a=st.actors.find(a=>a.hostile),g=st.gun;
 assert.equal(I.action(r,'fire'),false);r.ship.a=Math.PI;assert.match(U.firingSolution(st).reason,/arc/);r.ship.a=0;
 r.ship.depth=18;assert.match(U.firingSolution(st).reason,/depth/);r.ship.depth=48;
 r.ship.vx=2;assert.match(U.firingSolution(st).reason,/steady/);r.ship.vx=0;
 tick(r,4.2);assert.equal(st.stats.shots,0);assert.ok(I.action(r,'fire'));assert.equal(a.ship.hull,100);assert.equal(g.ammo,5);assert.equal(I.action(r,'fire'),false);
 tick(r,5);assert.equal(a.ship.hull,100);tick(r,15);assert.equal(a.ship.hull,40);
 const blocked=firing(),b=blocked.polar;tick(blocked,4.2);
 const shelf={name:'fixture rise',floor:30,poly:P.rect({x:880,y:660,w:14,h:80})};b.shelves.push(shelf);
 assert.match(U.firingSolution(b).reason,/Seabed/);b.shelves.pop();assert.ok(I.action(blocked,'fire'));b.shelves.push(shelf);tick(blocked,22);
 assert.equal(b.actors.find(a=>a.hostile).ship.hull,100);assert.equal(b.torpedoes.length,0);
});
test('team transfers need rest and depth; work requires leaving; recovery and escape are distinct',()=>{
 const r=state(8),st=r.polar,m=st.mission,a=st.config.access;st.actors=[];
 assert.equal(I.action(r,'team'),false);Object.assign(r.ship,{x:a.x,y:a.y,depth:48,depthTarget:48,vx:1});assert.ok(I.action(r,'team'));
 tick(r,1);assert.equal(m.team,'aboard');assert.equal(m.board,0);
 Object.assign(r.ship,{x:a.x,y:a.y,vx:0,vy:0,r:0,engine:0,throttle:0});tick(r,8.1);assert.equal(m.team,'working');
 tick(r,100);assert.equal(m.work,0);assert.equal(m.team,'working');assert.equal(st.failure,null,'waiting alone cannot create an alarm without a listener');
 Object.assign(r.ship,{x:650,y:500});tick(r,90.1);assert.equal(m.team,'waiting');assert.ok(m.left);assert.equal(I.ready(r),false);
 Object.assign(r.ship,{x:a.x,y:a.y});assert.ok(I.action(r,'team'));tick(r,8.1);assert.equal(m.team,'recovered');assert.equal(I.ready(r),true);assert.equal(st.complete,false);
 Object.assign(r.ship,{x:st.config.home.x,y:st.config.home.y});tick(r,5.1);assert.equal(st.complete,true);assert.equal(st.stats.teamRecovered,1);assert.equal(r.splits.length,4);
});
test('quiet suspicion can fall; a confirmed acoustic alarm is latched even if the next step is quiet',()=>{
 const r=state(8),st=r.polar;
 const quiet=U.noise(r.ship),loud=U.noise({...r.ship,vx:2,engine:-1},{thruster:1});assert.ok(loud>quiet+.8);
 st.mission.suspicion=30;tick(r,5);assert.ok(st.mission.suspicion<25);
 Object.assign(r.ship,{x:770,y:360});st.mission.suspicion=80;assert.ok(I.action(r,'ping'));assert.equal(st.mission.alarm,true);
 tick(r,.01);assert.match(st.failure,/Confirmed alarm/);assert.equal(st.complete,false);
});
test('ignoring the intruder or minelayer eventually loses the protected installation or passage',()=>{
 for(const n of [7,9]){const r=state(n);for(let i=0;i<120*1200&&!r.polar.failure;i++)I.step(level(n),r,{},1/120);assert.match(r.polar.failure,/installation|charges/);assert.equal(r.polar.complete,false);}
});
test('an unverified wreck cannot substitute for identifying the intruder',()=>{
 for(const n of [7,9]){const r=state(n);r.polar.actors.find(a=>a.hostile).ship.hull=0;tick(r,6);assert.match(r.polar.failure,/before identification/);assert.equal(I.ready(r),false);assert.equal(r.polar.complete,false);}
});
test('pause freezes sonar, patrols, depth and team clocks; retry restores the original watch',()=>{
 const t=create();t.load(L.indexOf(level(8)),true);t.polarAction('depth','2');t.advance(2);const r=t.state.run;t.pause();
 const before=JSON.stringify(r.polar);t.advance(30);assert.equal(JSON.stringify(r.polar),before);assert.equal(t.polarAction('ping'),false);
 t.retry();assert.equal(t.state.run.ship.depth,48);assert.equal(t.state.run.polar.tracks.length,0);assert.equal(t.state.run.polar.mission.team,'aboard');
 t.keydown({code:'KeyX'});assert.equal(t.state.run.ship.depthTarget,88);t.keydown({code:'KeyP'});assert.equal(t.state.run.polar.stats.pulses,1);
});
test('underwater rendering never reads hidden hull positions and stays within the warm drawing budget',()=>{
 let draws=0,bitmaps=0;const methods=['fill','stroke','fillRect','strokeRect','drawImage'];
 const context=new Proxy({},{get:(o,k)=>o[k]??(()=>{if(methods.includes(k))draws++;if(k==='drawImage')bitmaps++;}),set:(o,k,v)=>(o[k]=v,true)});
 const canvas=()=>({width:0,height:0,getBoundingClientRect:()=>({width:1050,height:720}),getContext:()=>context}),previous=global.document;
 global.document={createElement:canvas};
 try{for(const n of [7,8,9]){
  const r=state(n),st=r.polar;for(const a of st.actors.filter(a=>!a.visible)){U.Sonar.observe(st,a,r.ship,0,true);Object.defineProperty(a.ship,'x',{get(){throw Error('Hidden position leaked into the chart');}});}
  const view=require('../src/submarine-view.js'),c=canvas();view.render(c,level(n),r,1);draws=0;bitmaps=0;
  for(let i=0;i<60;i++)view.render(c,level(n),r,1);
  assert.ok(draws/60<100,`${n}: ${draws/60} draws`);assert.equal(bitmaps,60);
 }}finally{global.document=previous;}
});
for(const n of [7,8,9])test(`7-0${n}: complete with ordinary helm, depth, sonar and mission orders`,()=>{
 const t=require('./submarine-navigation.cjs').navigate(n),r=t.state.run,st=r.polar;
 assert.equal(t.state.status,'complete',JSON.stringify({time:r.time,xy:[r.ship.x,r.ship.y],failure:st.failure,mission:st.mission}));
 assert.ok(r.ship.hull>0);assert.equal(r.splits.length,st.config.objectives.length);assert.ok(r.splits.every((s,i)=>s.time>0&&(!i||s.time>=r.splits[i-1].time)));
 assert.equal(t.state.storage.stages[t.state.level.id].runs.length,1);
 if(n===7){assert.ok(st.mission.identified&&st.mission.intercepted);assert.equal(st.actors.find(a=>a.kind==='service').ship.hull,100);}
 if(n===8){assert.ok(st.mission.left);assert.equal(st.stats.teamRecovered,1);assert.equal(st.mission.alarm,false);assert.ok(t.navigation.patrolWaits>0);assert.equal(st.stats.shots,0);}
 if(n===9){assert.equal(st.mission.mining<st.config.passage.lay,true);assert.ok(st.actors.find(a=>a.hostile).escaped,'defense succeeds without chasing or sinking the departing minelayer');}
});
