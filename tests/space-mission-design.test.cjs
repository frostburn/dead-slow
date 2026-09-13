'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../src/physics.js'),X=require('../src/space.js'),L=require('../src/levels.js'),S=require('../src/storage.js');
const {create}=require('./headless.cjs');
const level=id=>L.find(l=>l.id===id);
const load=id=>{const t=create();t.load(L.indexOf(level(id)));return t;};
const park=(s,b)=>Object.assign(s,{x:b.x,y:b.y,a:b.a||0,vx:0,vy:0,r:0,engine:0,throttle:0});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('tutorial has an offset arrival and two finite, one-way flybys',()=>{
 const l=level('vacuum');assert.ok(Math.abs(l.start[1]-l.berth.y)>150);assert.equal(l.space.asteroids.length,2);
 for(const rock of l.space.asteroids){
  assert.equal(rock.motion.ax,undefined);assert.equal(rock.motion.ay,undefined);
  const a=X.asteroid(rock,100),b=X.asteroid(rock,200);
  close(b.x-a.x,a.vx*100);close(b.y-a.y,a.vy*100);
  for(const time of [1500,3000]){const p=X.asteroid(rock,time);assert.ok(p.x-p.radius>l.world[0]||p.y-p.radius>l.world[1]||p.y+p.radius<0);}
 }
});
for(const id of ['umbra','perihelion-dispatch'])test(`${id}: continuous exposure and actual drifting cover, no periodic sprint interval`,()=>{
 const l=level(id),t=load(id);assert.equal(t.state.run.space.light,0);
 for(const time of [0,30,120,350,900])assert.equal(X.flareState(l.space.flare,time).active,true);
 for(const b of l.space.asteroids)assert.ok(Math.hypot(b.motion.vx||0,b.motion.vy||0)>0);
 const w=X.shelterWindow(l,0);assert.ok(w.opens!==null);assert.ok(w.closes>w.opens+120);
 const hull={...l.spec,...l.berth};
 assert.equal(X.illumination(hull,l.space.asteroids.map(b=>X.asteroid(b,(w.opens+w.closes)/2))),0);
 assert.ok(X.illumination(hull,l.space.asteroids.map(b=>X.asteroid(b,w.closes+10)))>0);
 if(id==='umbra'){assert.ok(w.opens>300);assert.ok(X.illumination(hull,l.space.asteroids.map(b=>X.asteroid(b,0)))>0);}
});
test('Janus is a physical maze, and both marked insertion destinations are clear',()=>{
 const l=level('yesterday'),t=load(l.id),st=t.state.run.space,gates=X.gates(l.space);
 assert.equal(gates.length,2);assert.ok(st.structures.length>=8);
 for(const [i,g] of gates.entries()){
  for(const pos of [g,{x:g.destination[0],y:g.destination[1]}]){
   const hull=P.hull(P.ship(pos.x,pos.y,0,l.spec));
   for(const block of st.structures)assert.ok(!P.sat(hull,block.poly),`${g.id}/${block.id}`);
  }
  assert.ok(g.id==='AB'[i]);assert.ok(g.replayLead>0);
 }
 const lines=[[{x:l.start[0],y:l.start[1]},gates[0]],[{x:gates[0].destination[0],y:gates[0].destination[1]},gates[1]],[{x:gates[1].destination[0],y:gates[1].destination[1]},l.berth]];
 for(const [a,b] of lines)assert.ok(st.structures.some(w=>P.segmentHitsPoly(a,b,w.poly)),'direct path must be blocked');
 // Controlled collision setup, not a navigation claim.
 const b=st.structures.find(b=>b.id==='archive-stack');
 park(t.state.run.ship,{x:b.x-11+.1,y:b.y+180});t.state.run.ship.vx=.2;t.advance(1/120);
 assert.equal(t.state.run.contacts,1);assert.ok(t.state.run.ship.hull>99);
});
test('each gate archives a separate leg; two insertions are required and preserve fuel',()=>{
 const t=load('yesterday'),r=t.state.run,st=r.space,gates=X.gates(t.state.level.space),fuel=st.fuel;
 for(let i=0;i<2;i++){
  park(r.ship,gates[i]);t.advance(2.01);
  assert.equal(st.phase,i+1);assert.equal(st.histories.length,i+1);assert.equal(st.echoes.length,i+1);
  close(st.fuel,fuel);assert.ok(Math.abs(r.ship.x-gates[i].destination[0])<.01);
  close(st.histories[i].loop[0][0],0);close(st.histories[i].loop.at(-1)[0],st.histories[i].loopDuration);
  assert.ok(st.loop[0][1]===gates[i].destination[0]);
  assert.equal(X.ready(st,t.state.level.space),i===1);
 }
 assert.ok(r.distance<.01);assert.equal(st.stats.jumps,2);
 t.retry();assert.equal(t.state.run.space.histories.length,0);
});
test('histories recur after their recorded duration and both can cause a paradox',()=>{
 for(const hit of ['A','B']){
  const t=load('yesterday'),r=t.state.run,st=r.space;st.phase=2;
  st.histories=[{id:'A',start:0,lead:0,loopDuration:2,loop:[[0,700,250,0,1,0],[2,702,250,0,1,0]]},{id:'B',start:0,lead:0,loopDuration:2,loop:[[0,1100,600,0,0,0],[2,1100,600,0,0,0]]}];
  r.time=6.5;park(r.ship,{x:300,y:300});t.advance(1/120);
  assert.equal(st.echoes.length,2);assert.ok(st.echoes[0].x>700.5&&st.echoes[0].x<700.6);
  park(r.ship,st.echoes.find(e=>e.id===hit));t.advance(1/120);
  assert.equal(t.state.status,'failed');assert.equal(r.failure.type,'paradox');
 }
});
test('Erebus blocks a straight coast and any surface contact fails without a velocity boost',()=>{
 const t=load('century-ship'),l=t.state.level,r=t.state.run,b=r.space.rocks[0];
 assert.ok(b.planet);assert.ok(P.segmentHitsPoly({x:l.start[0],y:l.start[1]},l.berth,b.poly));
 park(r.ship,{x:b.x-b.radius+10,y:b.y});t.advance(1/120);
 assert.equal(r.failure.type,'planet-impact');assert.equal(t.state.status,'failed');close(r.ship.vx,0);
 const a=Math.hypot(l.space.acceleration,l.space.lateral)/l.spec.mass,T=1800,v=l.berth.speed;
 assert.ok(a*T*T/4+v*T/2-v*v/(4*a)<l.berth.x-l.start[0]-l.berth.l/2);
});
test('schema 6 archives only redesigned sectors and affected circuits, including ghosts',()=>{
 const d=S.fresh();d.version=5;
 const run={time:123,contacts:0,clean:true};
 for(const id of [...S.REDESIGNED,'borrowed-sun','granite-needle'])d.stages[id]={runs:[run],ghost:[[0,1,2,0]],bestSplits:[45],clears:1,attempts:2};
 for(const id of Object.keys(d.races))d.races[id]=[run];
 const n=S.sanitize(d);
 for(const id of S.REDESIGNED){assert.equal(n.stages[id],undefined);assert.deepEqual(n.archivedStages[id].ghost,[[0,1,2,0]]);assert.deepEqual(n.archivedStages[id].bestSplits,[45]);}
 assert.equal(n.stages['borrowed-sun'].runs[0].time,123);
 assert.equal(n.archivedStages['granite-needle-layout-v1'].runs[0].time,123);
 for(const id of ['meridian','grand-tour']){assert.equal(n.races[id].length,0);assert.equal(n.archivedRaces[id+'-layout-v1'].length,1);}
 assert.equal(n.races.coast.length,1);
    assert.equal(n.races.northwatch.length,0);assert.equal(n.archivedRaces['northwatch-approach-v1'].length,1);
 assert.equal(n.races.archipelago.length,0);assert.equal(n.archivedRaces['archipelago-layout-v2'].length,1);
 assert.deepEqual(S.sanitize(n),n);
});
// Only the affected mission recordings. The full library remains CI's job.
const {replay}=require('../tools/verify-island-runs.cjs');
for(const id of S.REDESIGNED)test(`${id}: revised control-only recording still completes cleanly`,()=>{
 const f=require(`./fixtures/${id}-controls.json`),t=replay(f);
 assert.equal(t.state.status,'complete');assert.equal(t.state.run.result.clean,true);
 assert.ok(Math.abs(t.state.run.time-f.expectedTime)<1/120);
 if(id==='yesterday'){assert.equal(t.state.run.space.histories.length,2);assert.equal(t.state.run.space.stats.jumps,2);}
});
test('deliberately frozen timeline inspection is not a missed-watch interruption',()=>{
 const t=load('yesterday');t.cheats.speed(0);t.frame(0);t.frame(5000);
 assert.equal(t.state.status,'running');close(t.state.run.time,0);assert.equal(t.state.run.pausedUsed,true);
});
