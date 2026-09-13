'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const L=require('../src/levels.js'),R=require('../src/rampage.js'),S=require('../src/storage.js');
const {create}=require('./headless.cjs'),{replay}=require('../tools/verify-island-runs.cjs');
const active=['coast','northwatch','archipelago','gerbozilla','meridian'];
const altered=['gerbo-downhill','gerbo-forest-slalom','gerbo-prickly-business'];
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);

test('eight-world catalog separates 61 playable assignments from 36 locked plans',()=>{
 assert.deepEqual(L.worlds.map(w=>w.id),['coast','northwatch','archipelago','gerbozilla','long-grade','meridian','pale-reach','megastructures']);
 assert.equal(L.length,61);assert.equal(L.catalog.length,97);assert.equal(new Set(L.catalog.map(l=>l.id)).size,97);
 for(const w of L.worlds) {
  const rows=L.catalog.filter(l=>l.campaign===w.id && !l.bonus);
  assert.equal(rows.length,12);assert.deepEqual(rows.map(l=>l.stageNumber),Array.from({length:12},(_,i)=>i+1));
  assert.ok(rows.every(l=>l.worldNumber===w.number));
  if(w.comingSoon)assert.ok(rows.every(l=>l.comingSoon && !L.includes(l) && !l.start));
 }
 assert.equal(L.find(l=>l.rampage).worldNumber,4);assert.equal(L.find(l=>l.space).worldNumber,6);
});
test('console rejects future missions/circuits without disturbing the current attempt',()=>{
 const t=create();t.cheats.tour(8);const r=t.state.run;
 for(const w of [5,7,8]){
  assert.throws(()=>t.cheats.level(w,1),/Coming soon/);
  assert.throws(()=>t.cheats.circuit(w),/unavailable/);
  assert.equal(t.state.run,r);
 }
 assert.equal(t.cheats.levels().filter(l=>l.comingSoon).length,36);
 assert.ok(t.cheats.times().filter(l=>l.comingSoon).every(l=>l.goldTarget===null && l.verifiedAuthorTime===null));
});
test('60-stage tour skips future chapters and bonus, and crosses field-to-space boundary',()=>{
 const t=create();t.cheats.tour(0);const route=t.state.marathon.route.map(i=>L[i]);
 assert.equal(route.length,60);assert.ok(route.every(l=>!l.bonus && !l.comingSoon));
 assert.deepEqual([...new Set(route.map(l=>l.campaign))],active);
 // Completion isolation tests progression, not a navigation recording.
 for(let i=0;i<60;i++){
  assert.equal(t.state.level.id,route[i].id);t.finish();
  if(i<59)t.next();
 }
 assert.equal(t.state.level.id,'perihelion-dispatch');assert.equal(t.state.marathon.stages,60);
 assert.ok(t.state.marathon.practice);
});
test('all in-game restart requests freeze first, cancel preserves progress as practice',()=>{
 const t=create();t.marathon('archipelago');t.advance(2);
 const r=t.state.run;r.ship.hull=87;r.jobs.stats.lineChanges=3;
 const time=r.time,position=t.state.marathon.position;
 t.requestRetry();t.requestRetry();assert.equal(t.state.status,'confirming');assert.equal(t.state.modal,'restart');
 t.advance(15);near(r.time,time);assert.equal(t.state.marathon.retries,0);assert.equal(r.pausedUsed,false);
 t.cancelRetry();assert.equal(t.state.status,'running');assert.equal(t.state.run,r);assert.equal(r.ship.hull,87);
 assert.equal(r.jobs.stats.lineChanges,3);assert.equal(t.state.marathon.position,position);assert.ok(r.pausedUsed);assert.ok(t.state.marathon.practice);
});
test('confirmed restart charges attempted time once and does not taint a ranked circuit',()=>{
 const t=create();t.marathon('coast');t.advance(2);const time=t.state.run.time;
 t.requestRetry();t.confirmRetry();t.confirmRetry();
 assert.equal(t.state.run.time,0);assert.equal(t.state.marathon.retries,1);near(t.state.marathon.total,time);
 assert.equal(t.state.marathon.practice,false);assert.equal(t.state.run.pausedUsed,false);
});
test('cancelling restart restores result screen and never adds another ranked clear',()=>{
 const t=create();t.load(0);t.finish();const clears=t.state.storage.stages['dead-slow'].clears;
 t.requestRetry();t.cancelRetry();assert.equal(t.state.status,'complete');assert.equal(t.state.modal,'result');
 assert.equal(t.state.storage.stages['dead-slow'].clears,clears);
});
test('accelerated restart keeps selected speed and starts the same stage',()=>{
 const t=create();t.cheats.circuit(4,16);t.advance(1);t.requestRetry();t.confirmRetry();
 assert.equal(t.cheats.speed(),16);assert.equal(t.state.level.id,'gerbo-first-outing');assert.ok(t.state.run.pausedUsed);
});
test('volcanic cycles have exact warning, hot and cooldown boundaries',()=>{
 const v={period:40,warning:7,eruption:10,offset:0};
 assert.equal(R.volcanoState(v,22.999).phase,'quiet');assert.equal(R.volcanoState(v,23).phase,'warning');
 assert.equal(R.volcanoState(v,29.999).active,false);assert.equal(R.volcanoState(v,30).active,true);
 assert.equal(R.volcanoState(v,40).active,false);assert.deepEqual(R.volcanoState(v,31),R.volcanoState(v,71));
});
test('hot polygon touches affect the full ball, not just its centre; no hidden splash radius',()=>{
 const v={x:500,y:500,r:30,zones:[[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}]]};
 assert.ok(R.volcanoContact(v,{x:120,y:50},24));assert.ok(!R.volcanoContact(v,{x:125,y:50},24));
 assert.ok(R.volcanoContact(v,{x:552,y:500},24));assert.ok(!R.volcanoContact(v,{x:555,y:500},24));
});
test('quiet vents are harmless, shields protect temporarily, cooldown prevents per-tick damage',()=>{
 const t=create();t.cheats.level('gerbo-downhill');const r=t.state.run,v=r.rampage.volcanoes[0];
 r.ship.x=v.x;r.ship.y=v.y;
 r.time=v.period-v.offset;R.volcanoUpdate(r);assert.equal(r.ship.hull,100);
 r.time=v.period-v.eruption-v.offset;R.shield(r);R.volcanoUpdate(r);assert.equal(r.ship.hull,100);assert.equal(r.rampage.stats.volcanoBlocks,1);
 R.volcanoUpdate(r);assert.equal(r.rampage.stats.volcanoBlocks,1);
 r.time+=3.01;R.volcanoUpdate(r);assert.equal(r.ship.hull,76);assert.equal(r.rampage.stats.volcanoHits,1);
});
for(const id of altered)test(`${id}: clean fixed-input route crosses each geothermal footprint during a safe window`,()=>{
 const f=require('./fixtures/'+id+'-controls.json'),t=replay(f),r=t.state.run;
 assert.equal(t.state.status,'complete');assert.ok(r.result.clean);near(r.time,f.expectedTime);
 assert.equal(r.rampage.stats.volcanoHits,0);
 for(const v of t.state.level.rampage.volcanoes){
  const crossings=r.ghost.filter(p=>R.volcanoContact(v,{x:p[1],y:p[2]},24));assert.ok(crossings.length>0,v.id+' must matter on the route');
  assert.ok(crossings.every(p=>!R.volcanoState(v,p[0]).active));
  assert.ok(crossings.some(p=>Array.from({length:v.period},(_,shift)=>R.volcanoState(v,p[0]+shift).active).some(Boolean)));
 }
});
test('schema 13 archives only altered stages and circuits, preserving overall and clean histories',()=>{
 const d=S.create({getItem:()=>null,setItem(){}}).data;d.version=12;
 const stage={runs:[{time:90,contacts:1,clean:false},{time:100,contacts:0,clean:true}],ghost:[[0,1,2,3]],bestSplits:[30]};
 for(const id of [...altered,'gerbo-first-outing','granite-needle','vacuum'])d.stages[id]=stage;
 for(const id of active.concat('grand-tour'))d.races[id]=stage.runs;
 const s=S.sanitize(d);
 for(const id of altered){assert.equal(s.stages[id],undefined);assert.equal(s.archivedStages[id+'-volcano-v1'].runs.length,2);assert.deepEqual(s.archivedStages[id+'-volcano-v1'].ghost,stage.ghost);}
 assert.equal(s.archivedRaces['grand-tour-order-v1'].length,2);assert.equal(s.archivedRaces['gerbozilla-volcano-v1'].length,2);
 for(const id of ['coast','northwatch','archipelago','meridian'])assert.equal(s.races[id].length,2);
 for(const id of ['gerbo-first-outing','granite-needle','vacuum'])assert.equal(s.stages[id].runs.length,2);
 s.stages[altered[0]]=stage;s.races.gerbozilla=stage.runs;const twice=S.sanitize(s);
 assert.equal(twice.stages[altered[0]].runs.length,2);assert.equal(twice.races.gerbozilla.length,2);
});
test('named locations and craft use fictional labels without changing persistent mission IDs',()=>{
 assert.equal(L.find(l=>l.id==='first-crossing').spec.name,'MS LINVARA');
 assert.equal(L.find(l=>l.id==='bigger-boat').spec.name,'MT SIVRA');
 assert.equal(L.find(l=>l.id==='bigger-boat').towables[0].id,'elvira');
 assert.equal(L.find(l=>l.id==='wandering-stone').space.asteroids[0].label,'HILDARA');
 const displayed=[];function walk(v){if(!v||typeof v!=='object')return;for(const[k,x]of Object.entries(v)){if(['name','label','brief','tip','sheet'].includes(k))displayed.push(x);if(typeof x==='object')walk(x);}}
 L.forEach(walk);assert.doesNotMatch(displayed.join('\n'),/\b(?:SISU|LINNEA|ELVIRA|NANSEN|Hilda|Aspö|Kivikari|Rönnskär|Strömskär|Långön)\b/);
});

test('asking to restart a completed circuit stage does not count its time twice',()=>{
 const t=create();t.cheats.circuit(1,0);t.state.run.time=12;t.finish();
 t.requestRetry();assert.equal(t.cheats.progress().circuit.time,12);
 t.cancelRetry();assert.equal(t.cheats.progress().circuit.time,12);
});
