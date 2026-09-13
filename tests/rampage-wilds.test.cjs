'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../src/rampage.js'),L=require('../src/levels.js'),S=require('../src/storage.js');
const {create}=require('./headless.cjs');
const DT=1/120;
// Objective-isolation setups below are regressions, not claimed navigation runs.
function scenario(id='gerbo-forest-slalom'){
 const level=structuredClone(L.find(l=>l.id===id));
 const ship={x:200,y:200,vx:0,vy:0,r:0,a:0,mass:8,hull:100};
 return {level,run:{ship,rampage:R.create(level,ship),time:0,contacts:0,distance:0,maxSpeed:0,dockHold:0}};
}
function step(t,input={},time=DT){for(let n=0;n<Math.round(time/DT);n++){t.run.time+=DT;R.update(t.level,t.run,input,DT);}}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('twelve championship courses include four different mission types; old hairpin is retired',()=>{
 const rows=L.filter(l=>l.rampage);assert.equal(rows.length,12);
 assert.deepEqual(rows.map(l=>l.stageNumber),Array.from({length:12},(_,i)=>i+1));assert.ok(rows.every(l=>!l.standalone));
 assert.ok(!L.some(l=>l.id==='gerbo-hairpin'));assert.equal(rows[4].rampage.districts.length,0);
 assert.ok(rows[6].rampage.monsters.length);assert.ok(rows[7].rampage.fire);assert.ok(rows[8].rampage.rescue);
});
test('woodland adds rolling resistance without changing gravity or creating velocity',()=>{
 const a=scenario(),b=scenario();for(const t of[a,b]){t.level.rampage.hills=[];t.level.rampage.rocks=[];t.run.rampage.rocks=[];t.level.rampage.lakes=[];t.run.ship.vx=15;}
 a.level.rampage.forests=[{x:200,y:200,rx:300,ry:300,density:1}];b.level.rampage.forests=[];
 step(a,{},2);step(b,{},2);assert.ok(a.run.ship.vx<b.run.ship.vx);assert.ok(a.run.ship.vx>0);
 assert.equal(a.run.rampage.forest,1);assert.equal(b.run.rampage.forest,0);
});
test('forest footprint uses the same rounded boundary as the visible hatching',()=>{
 const c=R.levels[4].rampage,f=c.forests[0];
 assert.equal(R.woodland(c,{x:f.x,y:f.y}),f.density);
 assert.equal(R.woodland(c,{x:50,y:50}),0);
 for(let i=0;i<24;i++){const p=R.lakePoint(f,i*Math.PI/12,.99),q=R.lakePoint(f,i*Math.PI/12,1.01);assert.ok(R.inLake(f,p.x,p.y));assert.ok(!R.inLake(f,q.x,q.y));}
});
test('black rocks stop the full ball on faces, corners and from an overlapping spawn',()=>{
 const poly=[{x:300,y:250},{x:450,y:250},{x:450,y:400},{x:300,y:400}];
 assert.equal(R.circleContact({x:275,y:320},24,poly),null);
 assert.ok(R.circleContact({x:280,y:320},24,poly));assert.ok(R.circleContact({x:285,y:235},24,poly));
 const inside=R.circleContact({x:320,y:300},24,poly);assert.ok(inside.depth>24);
});
test('holding shield and pushing cannot cross a solid boulder',()=>{
 const t=scenario();const c=t.level.rampage;c.hills=[];c.forests=[];c.lakes=[];
 const poly=[{x:300,y:100},{x:400,y:100},{x:400,y:500},{x:300,y:500}];
 t.run.rampage.rocks=[{poly}];Object.assign(t.run.ship,{x:270,y:300,vx:30});R.shield(t.run);
 step(t,{rudder:1},2.5);assert.equal(t.run.ship.hull,100);step(t,{rudder:1},17.5);assert.ok(t.run.ship.x<=276.001);
 assert.deepEqual(t.run.rampage.rocks[0].poly,poly);
});
function ram(shield){const t=scenario('gerbo-cavy-clash'),m=t.run.rampage.monsters[0];
 Object.assign(t.run.ship,{x:m.x-m.r-24+.2,y:m.y,vx:24,vy:0});m.vx=-5;
 if(shield)R.shield(t.run);const momentum=8*24+m.mass*(-5);R.petPair(t.run,m);return {t,m,momentum};}
test('pet rams exchange momentum and deal mutual damage; shield only protects the player',()=>{
 const a=ram(false),b=ram(true);
 assert.ok(a.m.health<a.m.maxHealth);assert.ok(a.t.run.ship.hull<100);assert.equal(b.t.run.ship.hull,100);
 near(a.t.run.ship.vx,b.t.run.ship.vx);near(a.m.vx,b.m.vx);near(a.m.health,b.m.health);
 near(8*a.t.run.ship.vx+a.m.mass*a.m.vx,a.momentum);
});
test('pet charge direction is committed during its warning, followed by finite recovery',()=>{
 const t=scenario('gerbo-cavy-clash'),m=t.run.rampage.monsters[0];t.run.rampage.rocks=[];
 Object.assign(t.run.ship,{x:m.x+350,y:m.y});step(t);assert.equal(m.state,'warning');const aim=m.angle;
 t.run.ship.y+=220;step(t,{},1);near(m.angle,aim);step(t,{},1.3);assert.equal(m.state,'charge');
 step(t,{},3.6);assert.equal(m.state,'rest');assert.ok(m.until-t.run.time<6);
});
test('sleeping defeated monsters satisfy their objective without recurring attacks',()=>{
 const t=scenario('gerbo-cavy-clash'),st=t.run.rampage;st.monsters[0].health=0;st.control=st.controlCount;
 step(t);assert.ok(R.ready(t.run));assert.equal(st.stats.monsters,1);step(t,{},3);assert.equal(st.stats.monsters,1);
});
function burning(){const t=scenario('gerbo-pepperbreath'),st=t.run.rampage;st.control=1;Object.assign(t.run.ship,{x:760,y:540});st.aim=0;st.districts.forEach(d=>d.defence=false);return t;}
test('flame needs the pepper, respects range and cannot use ramming to bypass armor',()=>{
 const t=burning(),st=t.run.rampage,d=st.districts[0];st.control=0;
 step(t,{winch:1},1);assert.equal(d.health,100);st.control=1;step(t,{winch:1},1);assert.ok(d.health<60);
 assert.equal(st.districts[1].health,100);
 const a=burning(),core=a.run.rampage.districts[0];a.run.rampage.rocks=[];
 Object.assign(a.run.ship,{x:core.x-core.r-24+.1,y:core.y,vx:30});R.shield(a.run);step(a);assert.equal(core.health,100);
});
test('fire passes over low walls but not a giant boulder',()=>{
 const a=burning(),b=burning();b.run.rampage.rocks.push({poly:R.rockPolygon({x:840,y:540,rx:28,ry:60})});
 step(a,{winch:1},.5);step(b,{winch:1},.5);assert.ok(a.run.rampage.districts[0].health<100);assert.equal(b.run.rampage.districts[0].health,100);
});
test('breath is finite, only refills after release, and deep water suppresses it',()=>{
 const t=burning();step(t,{winch:1},4);near(t.run.rampage.breath,0);const time=t.run.rampage.stats.fireTime;
 step(t,{winch:1},2);near(time,t.run.rampage.stats.fireTime);step(t,{},1);near(t.run.rampage.breath,.6);
 t.level.rampage.lakes=[{x:760,y:540,rx:100,ry:100}];step(t,{winch:1},.5);
 assert.equal(t.run.rampage.fireActive,false);near(t.run.rampage.breath,.6);
});
test('cage requires both locks, then a close greeting, not a remote rescue',()=>{
 const t=scenario('gerbo-whiskerdoom'),st=t.run.rampage;st.districts[0].health=0;step(t);
 assert.ok(!st.unlocked);assert.ok(R.solids(st).some(b=>b.gate));st.districts[1].health=0;step(t);
 assert.ok(st.unlocked);assert.ok(!R.solids(st).some(b=>b.gate));assert.ok(!st.lady.following);assert.ok(!R.ready(t.run));
 Object.assign(t.run.ship,{x:1735,y:460});step(t);assert.ok(st.lady.following);assert.ok(Math.abs(st.lady.x-1840)<.01);
});
test('escort keeps actual independent movement and cannot award rescue just for freeing her',()=>{
 const t=scenario('gerbo-whiskerdoom'),st=t.run.rampage;st.districts.forEach(d=>d.health=0);st.monsters.forEach(m=>m.health=0);
 Object.assign(t.run.ship,{x:1735,y:460,vx:-4});step(t);const before=st.lady.x;
 step(t,{rudder:-1},2);assert.ok(st.lady.x<before);assert.ok(st.lady.x>t.run.ship.x+50);assert.ok(!st.rescued);assert.ok(!R.ready(t.run));
});
test('player shielding does not erase friendly collision damage',()=>{
 const t=scenario('gerbo-whiskerdoom'),st=t.run.rampage,l=st.lady;
 Object.assign(t.run.ship,{x:l.x-l.r-24+.1,y:l.y,vx:20});R.shield(t.run);R.petPair(t.run,l,true);
 assert.equal(t.run.ship.hull,100);assert.ok(l.health<100);assert.ok(st.stats.ladyDamage>0);assert.ok(st.stats.damage>0);
});
test('retired Hairpin records, ghosts and splits are archived without changing other routes',()=>{
 const data=S.fresh();data.version=8;
 const old={runs:[{time:189,contacts:0,clean:true}],ghost:[[0,10,20,0]],bestSplits:[10,20]};
 data.stages['gerbo-hairpin']=structuredClone(old);data.stages['gerbo-banking']=structuredClone(old);data.races['grand-tour']=old.runs;
 const v=S.sanitize(data);assert.equal(v.stages['gerbo-hairpin'],undefined);assert.deepEqual(v.archivedStages['gerbo-hairpin'].ghost,old.ghost);
 assert.deepEqual(v.archivedStages['gerbo-hairpin'].bestSplits,old.bestSplits);assert.equal(v.archivedStages['gerbo-banking-preview'].runs[0].time,189);assert.equal(v.archivedRaces['grand-tour-48'].length,1);
 assert.deepEqual(S.sanitize(v),v);
});
for(const id of ['gerbo-forest-slalom','gerbo-cavy-clash','gerbo-pepperbreath','gerbo-whiskerdoom'])test(id+' has a clean input-only production-console recording',()=>{
 const f=require('./fixtures/'+id+'-controls.json'),t=create();t.cheats.watch(id,0);t.advance(f.duration);
 const report=t.cheats.report();assert.ok(report.verified,JSON.stringify(report));assert.ok(report.clean);assert.equal(report.ranked,false);
 if(id==='gerbo-whiskerdoom'){assert.equal(t.state.run.rampage.lady.health,100);assert.ok(t.state.run.rampage.rescued);}
});
