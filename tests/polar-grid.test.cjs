'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../src/polar-grid.js'),P=require('../src/physics.js');
const contains=(poly,x,y)=>poly.every((a,i)=>{const b=poly[(i+1)%poly.length];return (b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x)>=-1e-8;});
test('hex lookup covers the whole chart, including staggered edges and corners',()=>{
 const g=G.create(101,83,12);
 for(let y=0;y<=83;y++)for(let x=0;x<=101;x++){
  const k=G.indexAt(g,x,y);assert.ok(k>=0&&k<g.tiles.length);assert.ok(contains(g.tiles[k].poly,x,y),`${x},${y}`);
 }
 for(const [x,y] of [[-1,0],[0,-1],[102,83],[101,84]])assert.equal(G.indexAt(g,x,y),-1);
});
test('each interior hex has six edge-sharing neighbors and preserves authored ice area',()=>{
 const g=G.create(200,200,12);
 for(const y of [80,91]){
  const k=G.indexAt(g,80,y),tile=g.tiles[k],neighbors=G.neighbors(g,k);
  assert.equal(neighbors.length,6);assert.equal(new Set(neighbors).size,6);
  assert.equal(G.indexAt(g,tile.x,tile.y),k);
  const area=tile.poly.reduce((sum,a,i)=>{const b=tile.poly[(i+1)%6];return sum+a.x*b.y-a.y*b.x;},0)/2;
  assert.ok(Math.abs(area-144)<1e-8);
  for(const n of neighbors){
   assert.ok(G.neighbors(g,n).includes(k));
   assert.equal(tile.poly.filter(a=>g.tiles[n].poly.some(b=>Math.hypot(a.x-b.x,a.y-b.y)<1e-8)).length,2);
  }
 }
});
test('collision broadphase includes hex tips without treating bounding-box corners as ice',()=>{
 const g=G.create(100,100,12),k=G.indexAt(g,50,50),tile=g.tiles[k];
 const tip=P.box(tile.x,tile.y-g.radius+.2,1,1),corner=P.box(tile.x+g.dx/2-.2,tile.y-g.radius+.2,1,1);
 for(const poly of [tip,corner]){
  const candidates=[];G.each(g,P.bounds(poly),n=>candidates.push(n));assert.ok(candidates.includes(k));
 }
 assert.ok(P.sat(tip,tile.poly));assert.equal(P.sat(corner,tile.poly),null);
 // Every actual contact must survive the broadphase, at arbitrary orientations.
 for(let x=0;x<100;x+=7)for(let y=0;y<100;y+=11){
  const poly=P.box(x,y,19,8,.37),candidates=new Set();G.each(g,P.bounds(poly),n=>candidates.add(n));
  for(let n=0;n<g.tiles.length;n++)if(P.sat(poly,g.tiles[n].poly))assert.ok(candidates.has(n));
 }
});
