'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const crypto=require('node:crypto'),fs=require('node:fs');
const R=require('../src/rampage.js'),L=require('../src/levels.js'),S=require('../src/storage.js');
const {create}=require('./headless.cjs'),{replay}=require('../tools/verify-island-runs.cjs');
const V=require('../src/verification.js');
const field=id=>L.find(l=>l.id===id).rampage;
const sample={time:100,contacts:0,clean:true};
const stage=()=>({runs:[{...sample}],ghost:[[0,100,150,0]],bestSplits:[10,20],clears:1,attempts:2});

test('version 6 is a full release with six twelve-stage circuits and one excluded bonus',()=>{
 assert.match(require('../package.json').version,/^6\.\d+\.\d+$/);
 assert.equal(require('../package-lock.json').version,require('../package.json').version);
 assert.equal(L.length,79);assert.equal(L.filter(l=>!l.bonus&&!l.standalone).length,72);
 assert.equal(L.filter(l=>l.bonus).length,1);
 for(const w of L.worlds.filter(w=>!w.comingSoon&&!w.partial)){assert.ok(!w.preview);assert.equal(L.filter(l=>l.campaign===w.id&&!l.bonus&&!l.standalone).length,12);}
});
test('river spans the chart and puts every survey stamp opposite the starting meadow',()=>{
 const l=L.find(l=>l.id==='gerbo-prickly-business'),c=l.rampage,water=c.lakes.find(l=>l.river);
 assert.ok(water.poly[0].y<0 && Math.max(...water.poly.map(p=>p.y))>l.world[1]);
 for(let y=0;y<=l.world[1];y+=20){
  let wetCount=0;for(let x=650;x<1010;x+=4)wetCount+=R.inLake(water,x,y)?1:0;
  assert.ok(wetCount>=20,'no dry break in the river at '+y);
 }
 const minX=Math.min(...water.poly.map(p=>p.x)),maxX=Math.max(...water.poly.map(p=>p.x));
 assert.ok(l.start[0]<minX&&c.finish.x<minX);assert.ok(c.controls.every(cp=>cp.x>maxX));
 assert.equal(R.water(c,{x:l.start[0],y:l.start[1]}),0);
});
test('river banks are shared geometry, with dry ground just outside each bank',()=>{
 const l=field('gerbo-prickly-business').lakes.find(l=>l.river),n=l.poly.length/2;
 for(let i=1;i<n-1;i+=4){const a=l.poly[i],b=l.poly[l.poly.length-1-i];
  assert.ok(!R.inLake(l,a.x-.1,a.y));assert.ok(R.inLake(l,a.x+.1,a.y));
  assert.ok(R.inLake(l,(a.x+b.x)/2,a.y));assert.ok(!R.inLake(l,b.x+.1,b.y));
 }
});
test('full river immersion removes paw traction without a hidden forward current',()=>{
 const c=structuredClone(field('gerbo-prickly-business'));c.hills=[];c.volcanoes=[];c.forests=[];c.monsters=[];c.controls=[];
 const l=c.lakes.find(l=>l.river),a=l.poly[30],b=l.poly[l.poly.length-31];
 const ship={x:(a.x+b.x)/2,y:a.y,vx:0,vy:0,hull:100,mass:8,a:0};
 const run={ship,rampage:R.create({rampage:c},ship),time:1/120,contacts:0,distance:0,maxSpeed:0};
 R.update({rampage:c,world:[2080,1380]},run,{rudder:1},1/120);
 assert.equal(run.rampage.wet,1);assert.equal(ship.vx,0);assert.ok(run.rampage.slip>0);
});
test('named off-route woods and two new forest pools exist in the field atlas',()=>{
 for(const id of ['gerbo-banking','gerbo-lake-skipping','gerbo-downhill','gerbo-fort-pillow'])assert.ok(field(id).forests.length>=3,id);
 const c=field('gerbo-forest-slalom'),lake=c.lakes.find(l=>l.name==='BRAMBLE TARN');
 assert.ok(c.lakes.length>=3&&c.hills.length>=3);assert.ok(c.forests.some(f=>R.inLake(f,lake.x,lake.y)));
 assert.equal(field('gerbo-pepperbreath').lakes.length,2);
 assert.ok(field('gerbo-cavy-clash').hills.length>=4);
});
test('new broken mountain contours retain the exact analytical terrain gradient',()=>{
 for(const id of ['gerbo-downhill','gerbo-fort-pillow']){
  const c=field(id);for(let x=175;x<2400;x+=183)for(let y=150;y<1500;y+=227){
   const h=.001,t=R.terrain(c,x,y);
   for(const [axis,dx,dy] of [['dx',h,0],['dy',0,h]]){
    const fd=(R.terrain(c,x+dx,y+dy).height-R.terrain(c,x-dx,y-dy).height)/(2*h);
    assert.ok(Math.abs(fd-t[axis])<1e-7,`${id} ${axis} at ${x},${y}`);
   }
  }
 }
});
test('changed hills leave clear, nearly level recovery positions',()=>{
 for(const id of S.FIELD_REVISED){const c=field(id),f=c.finish,t=R.terrain(c,f.x,f.y);
  assert.equal(R.water(c,f),0,id);
  // From rest, two seconds without paws must not accelerate past 0.8 m/s.
  assert.ok(Math.hypot(t.dx,t.dy)*7.007*2<.8,id+' recovery slope');
  for(const rock of c.rocks||[])assert.equal(R.circleContact(f,c.radius,R.rockPolygon(rock)),null,id);
 }
});
test('Needlesworth pursuit is stronger but keeps telegraphed attacks and physical shielding',()=>{
 const m=field('gerbo-rolling-threat').monsters[0];assert.ok(m.invulnerable&&m.required===false);
 assert.ok(m.ai.prowlSpeed>=40&&m.ai.power>=13&&m.ai.range<=450&&m.ai.warning>=1.8);
 // There is no artificial minimum-shields objective or shield duration change.
 const t=create();t.load(L.findIndex(l=>l.id==='gerbo-rolling-threat'));
 t.state.run.rampage.control=3;assert.ok(R.ready(t.state.run));
 assert.equal(t.state.run.rampage.stats.shields,0);R.shield(t.state.run);
 assert.equal(t.state.run.rampage.shieldUntil,3);assert.equal(t.state.run.rampage.shieldReady,9);
});
test('schema 9 archives the 48-stage tour and revised maps without overwriting older terrain',()=>{
 const d=S.fresh();d.version=9;d.races['grand-tour']=[{...sample,time:9000}];d.races.meridian=[{...sample,time:2000}];
 d.stages['gerbo-first-outing']=stage();d.stages['gerbo-long-way-home']=stage();
 for(const id of S.FIELD_REVISED){d.stages[id]=stage();d.archivedStages[id]={...stage(),bestSplits:[3]};}
 const next=S.sanitize(d);
 assert.equal(next.races['grand-tour'].length,0);assert.equal(next.races.gerbozilla.length,0);
 assert.equal(next.archivedRaces['grand-tour-48'][0].time,9000);assert.equal(next.races.meridian[0].time,2000);
 for(const id of S.FIELD_REVISED){assert.equal(next.stages[id],undefined);assert.deepEqual(next.archivedStages[id+'-preview'].ghost,stage().ghost);assert.deepEqual(next.archivedStages[id].bestSplits,[3]);}
 assert.ok(next.stages['gerbo-first-outing']&&next.stages['gerbo-long-way-home']);
 assert.deepEqual(S.sanitize(next),next,'current-schema migration must be idempotent');
});
test('older circuit migrations retain their distinct routes; current records are not rearchived',()=>{
 for(const version of [2,3,5,6,7,8,9]){
  const d=S.fresh();d.version=version;d.races['grand-tour']=[{...sample,time:1234}];
  const out=S.sanitize(d),expected=version===2?'grand-tour-24':version===3?'grand-tour-dock-starts':version===5?'grand-tour-layout-v1':'grand-tour-48';
  assert.equal(out.archivedRaces[expected][0].time,1234,'schema '+version);
 }
 const current=S.fresh();current.races.gerbozilla=[sample];current.races['grand-tour']=[sample];
 assert.equal(S.sanitize(current).races.gerbozilla.length,1);assert.equal(S.sanitize(current).races['grand-tour'].length,1);
});
test('World 4 circuit keeps retry time, all twelve transitions and its own ranked record',()=>{
 // Test-only completion isolation, not a claimed physical marathon recording.
 const t=create();t.marathon('gerbozilla');assert.equal(t.state.marathon.route.length,12);
 t.advance(1);t.retry();assert.equal(t.state.marathon.retries,1);
 for(let i=0;i<12;i++){
  assert.equal(t.state.level.stageNumber,i+1);t.state.run.time=2;t.finish();
  if(i<11)t.next();
 }
 const r=t.state.storage.races.gerbozilla[0];assert.ok(r.clean);assert.equal(r.stages,12);
 assert.ok(Math.abs(r.time-25)<1e-8);assert.equal(t.state.storage.races['grand-tour'].length,0);
});
test('practice taints an entire rolling circuit and a failed course cannot be skipped',()=>{
 const t=create();t.marathon('gerbozilla');const i=t.state.index;t.next();assert.equal(t.state.index,i);
 t.pause();assert.ok(t.state.marathon.practice);t.retry();
 for(let i=0;i<12;i++){t.state.run.time=1;t.finish();if(i<11)t.next();}
 assert.equal(t.state.storage.races.gerbozilla.length,0);
});
test('Grand Tour includes rolling stages before space and records seventy-two stages, not the bonus',()=>{
 const t=create();t.marathon('grand-tour');assert.equal(t.state.marathon.route.length,72);
 assert.ok(t.state.marathon.route.every(i=>!L[i].bonus));
 for(let i=0;i<72;i++){t.state.run.time=1;t.finish();if(i<71)t.next();}
 assert.equal(t.state.level.id,'perihelion-dispatch');const r=t.state.storage.races['grand-tour'][0];
 assert.equal(r.stages,72);assert.equal(r.time,72);
});
test('shipped reference module is synchronized exactly with its fixture source',()=>{
 assert.equal(fs.readFileSync(require.resolve('../src/verification.js'),'utf8'),require('../tools/sync-replays.cjs').source());
});
for(const id of S.FIELD_REVISED)test(id+' has a clean control-only release recording',()=>{
 const f=V.runs.find(f=>f.level===id),t=replay(f);assert.equal(t.state.status,'complete');
 assert.ok(t.state.run.result.clean);assert.equal(t.state.run.result.time,f.expectedTime);
 if(id==='gerbo-rolling-threat'){
  assert.equal(t.state.run.rampage.stats.needleBlocks,3);assert.equal(t.state.run.rampage.stats.shields,3);
  assert.ok(f.expectedTime<95);assert.equal(t.state.run.rampage.monsters[0].health,100);
 }
 if(id==='gerbo-prickly-business')assert.ok(t.state.run.rampage.stats.waterTime>3);
});

// Protect the two courses explicitly approved unchanged.
test('Seedhaven and the finale retain their exact terrain and objective data',()=>{
 const hashes={
  'gerbo-first-outing':'bc3b85f06d6af56d8771eed04cefade172e5bfb8afc8444faac06b0227f3e1e3',
  'gerbo-long-way-home':'46867def6d38687cac2cdb6b31be85869e955ac6f94d080e6cebaa63db5076a7'
 };
 for(const [id,expected] of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(JSON.stringify(field(id))).digest('hex'),expected);
});

for(const missed of [0,1,2])test('omitting fast-route shield '+(missed+1)+' is fatal, not an equally fast damaged clear',()=>{
 const f=structuredClone(V.runs.find(f=>f.level==='gerbo-rolling-threat'));let i=0;
 for(const e of f.events)if(e.line){if(i++===missed)delete e.line;}
 const t=replay(f);assert.equal(t.state.status,'failed');assert.equal(t.state.run.ship.hull,0);
 assert.ok(t.state.run.time<f.expectedTime);
});

test('initial field instruments already reflect the summit and woodland before the first tick',()=>{
 const l=L.find(l=>l.id==='gerbo-downhill'),t=create();t.load(L.indexOf(l));
 assert.equal(t.state.run.rampage.elevation,R.terrain(l.rampage,l.start[0],l.start[1]).height);
 assert.ok(t.state.run.rampage.elevation>50);
});
test('old schemas do not claim future field course IDs in their terrain migrations',()=>{
 for(const [version,id] of [[6,'gerbo-banking'],[7,'gerbo-downhill'],[8,'gerbo-prickly-business']]){
  const d=S.fresh();d.version=version;d.stages[id]=stage();const n=S.sanitize(d);
  assert.ok(n.stages[id]);assert.equal(n.archivedStages[id+'-preview'],undefined);
 }
});
