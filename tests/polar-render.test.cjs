'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const L=require('../src/levels.js'),I=require('../src/polar.js'),V=require('../src/polar-view.js');
test('polar frames have a bounded drawing budget, including local ice changes',()=>{
 let draws=0,bitmaps=0;
 const methods=['fill','stroke','fillRect','strokeRect','drawImage'];
 const context=new Proxy({}, {get:(o,k)=>o[k]??(()=>{if(methods.includes(k))draws++;if(k==='drawImage')bitmaps++;}),set:(o,k,v)=>(o[k]=v,true)});
 const canvas=()=>({width:0,height:0,getBoundingClientRect:()=>({width:1050,height:720}),getContext:()=>context});
 const previous=global.document;global.document={createElement:canvas};
 try{
  for(const l of L.filter(l=>l.polar&&!l.polar.underwater)){
   const r={...I.create(l),time:0},c=canvas();V.render(c,l,r,1);draws=0;bitmaps=0;
   for(let frame=0;frame<60;frame++){r.ship.x+=.01;r.polar.time+=1/60;V.render(c,l,r,1);}
   assert.ok(draws/60<100,`${l.id}: ${draws/60} draw calls per unchanged frame`);
   assert.equal(bitmaps,60);
   const ice=r.polar.ice,k=ice.tiles.findIndex((p,k)=>p.x>300&&p.x<500&&p.y>200&&p.y<400&&ice.thickness[k]>0&&ice.thickness[k]<1);
   const change=()=>{draws=0;V.render(c,l,r,1);assert.ok(draws>100&&draws<2000,`${l.id}: dirty region used ${draws} draws`);};
   ice.opened[k]=r.polar.time;ice.revision++;change(); // fracture appears immediately
   r.polar.time+=60;change(); // ageing changes the surface
   ice.opened[k]=r.polar.time;r.polar.time+=.2;change(); // icebreaker clears slush again
   draws=0;V.render(c,l,r,1);assert.ok(draws<100,'paused ice is reused');
   draws=0;V.render(c,l,r,2.3);assert.ok(draws>2000,'zoom rebuilds the raster at a suitable resolution');
   const retry={...I.create(l),time:0};draws=0;V.render(c,l,retry,1);assert.ok(draws>2000,'retry has fresh intact ice');
  }
 }finally{global.document=previous;}
});
