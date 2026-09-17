'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../src/levels.js'),P=require('../src/physics.js'),I=require('../src/polar.js'),U=require('../src/submarine.js'),G=require('../src/polar-grid.js');
const {create}=require('./headless.cjs');
const level=n=>L.find(l=>l.id===`pale-reach-${n}`);

test('submarines cannot sound a horn and use the same rounded hull for chart and clearance',()=>{
 const t=create();
 for(const n of [7,8,9,10,12]){
  t.load(L.indexOf(level(n)),true);assert.equal(t.signal(),false);
  const r=t.state.run;assert.equal(r.ship.vessel,'submarine');
  for(const s of [r.ship,...r.polar.actors.filter(a=>a.kind==='submarine').map(a=>a.ship)]){
   const hull=P.hull({...s,x:0,y:0,a:0});
   assert.equal(Math.max(...hull.map(p=>p.x)),s.length/2);assert.equal(Math.min(...hull.map(p=>p.x)),-s.length/2);
   // Broad, rounded shoulders approach the nose instead of a surface ship's
   // long pointed wedge. This changes real contact, not just the artwork.
   assert.ok(hull.some(p=>p.x>s.length*.4&&Math.abs(p.y)>s.beam*.4));
   assert.equal(Math.max(...hull.map(p=>p.y)),s.beam/2);
  }
 }
 t.load(0,true);assert.notEqual(t.signal(),false,'ordinary surface horn remains available');
});
test('sonar uncertainty and world-to-canvas scaling preserve circular range',()=>{
 const l=level(7),r={...I.create(l),time:0},st=r.polar;
 const track=U.Sonar.observe(st,st.actors[0],r.ship,0,true),fix=U.Sonar.predict(track,0);
 const arcs=[],scales=[],ellipses=[];
 const ctx=new Proxy({arc:(...a)=>arcs.push(a),ellipse:(...a)=>ellipses.push(a),scale:(...a)=>scales.push(a)}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const canvas=()=>({width:0,height:0,getBoundingClientRect:()=>({width:930,height:530}),getContext:()=>ctx});
 const previous=global.document;global.document={createElement:canvas};
 try{require('../src/submarine-view.js').render(canvas(),l,r,1);}finally{global.document=previous;}
 assert.ok(arcs.some(a=>a[0]===fix.x&&a[1]===fix.y&&a[2]===fix.radius));
 assert.ok(scales.every(([x,y])=>x===y));assert.equal(ellipses.length,0);
});
test('authored fractured basins use metre coordinates and leave all rescue hulls afloat',()=>{
 const bay={poly:[[0,0],[100,0],[100,40],[40,40],[40,100],[0,100]]};
 assert.ok(G.contains(bay,20,80));assert.ok(!G.contains(bay,80,80),'concave ice notch stays solid');
 const r=I.create(level(11)),st=r.polar;
 assert.ok(st.config.water.every(e=>e.poly));assert.ok(st.config.ridges.every(e=>e.poly));
 for(const s of [r.ship,...st.fleet.map(f=>f.ship),st.operation.survey.ship,...st.operation.npcs.map(n=>n.ship)]){
  const before=[s.x,s.y,s.hull];I.iceContact(st,s,1/120);assert.deepEqual([s.x,s.y,s.hull],before,s.name);
 }
 const widths=[150,250,350,450,550].map(y=>{
  const open=[];for(let x=450;x<650;x++)if(!I.solidAt(st,x,y))open.push(x);return Math.max(...open)-Math.min(...open);
 });
 assert.ok(new Set(widths).size>=3,'the central lead has varying width');
});
