'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/rampage-audio.js');
function context(){
 const ctx={currentTime:0,destination:{},sources:[],filters:[],createPeriodicWave:()=>({})};
 const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}});
 const node=()=>({gain:param(),frequency:param(),Q:param(),type:'',connect(){},disconnect(){}});
 ctx.createGain=node;ctx.createBiquadFilter=()=>{const n=node();ctx.filters.push(n);return n;};
 ctx.createOscillator=()=>{const n={...node(),start(){},stop(){n.stopped=true},setPeriodicWave(){}};ctx.sources.push(n);return n};
 return ctx;
}
test('rolling creaks alternate bearing strokes and rise gently in level with speed',()=>{
 const slow=A.syllableParameters({audioSpeed:8},0),fast=A.syllableParameters({audioSpeed:32},0),oo=A.syllableParameters({audioSpeed:32},1);
 assert.equal(fast.ee,true);assert.equal(oo.ee,false);assert.ok(fast.pitch>oo.pitch);
 assert.ok(fast.gain>slow.gain&&fast.gain/slow.gain<1.3);assert.ok(fast.rate>slow.rate);
});
test('water wheelspin replaces the low voice with quieter higher chirps',()=>{
 const dry=A.syllableParameters({audioSpeed:32},0),wet=A.syllableParameters({audioSpeed:0,wet:1,slip:1.8},0);
 assert.ok(wet.gain<dry.gain*.5);assert.ok(wet.pitch>dry.pitch*3);assert.ok(wet.duration<dry.duration*.6);assert.ok(wet.rate>0);
});
test('faster natural strokes retain silence between syllables',()=>{
 for(const speed of [1,20,40,100]){const p=A.syllableParameters({audioSpeed:speed},0);assert.ok(p.duration<A.STROKE/p.rate*.5);}
});
test('wheel construction and stationary active ticks do not start any oscillator',()=>{
 const ctx=context(),w=A.createWheel(ctx);w.tick({roll:0,audioSpeed:0,slip:0},true);assert.equal(ctx.sources.length,0);w.dispose();
});
test('one phase crossing creates one finite layered stroke, never a burst of missed strokes',()=>{
 const ctx=context(),w=A.createWheel(ctx);w.tick({roll:0,audioSpeed:24},true);assert.equal(ctx.sources.length,2);assert.ok(ctx.sources[0].stopped);
 ctx.currentTime=3;w.tick({roll:0,audioSpeed:24},true);assert.equal(ctx.sources.length,2);
 w.tick({roll:100,audioSpeed:24},true);assert.equal(ctx.sources.length,4);
 ctx.currentTime=3.01;w.tick({roll:110,audioSpeed:24},true);assert.equal(ctx.sources.length,4);
 w.dispose();ctx.currentTime=10;w.tick({roll:200,audioSpeed:24},true);assert.equal(ctx.sources.length,4);
});

test('dry creaks use serial broad filters instead of vocal formants',()=>{
 const ctx=context(),w=A.createWheel(ctx);w.tick({roll:0,audioSpeed:24},true);
 assert.equal(ctx.sources[0].type,'triangle');assert.equal(ctx.sources[1].type,'sine');assert.deepEqual(ctx.filters.map(f=>f.type),['highpass','lowpass']);w.dispose();
});
test('water chirps retain their accepted pitches, duration and parallel bandpass colors',()=>{
 const ctx=context(),w=A.createWheel(ctx);const st={roll:0,wet:1,slip:1.8,audioSpeed:0};
 const a=A.syllableParameters(st,0),b=A.syllableParameters(st,1);
 assert.equal(a.pitch,1120);assert.equal(b.pitch,880);assert.equal(a.duration,.13);assert.equal(b.duration,.13);
 assert.equal(a.gain,.017*.78);w.tick(st,true);
 assert.deepEqual(ctx.filters.map(f=>f.type),['bandpass','bandpass']);
 assert.deepEqual(ctx.filters.map(f=>f.frequency.value),[1120,1120*2.7]);w.dispose();
});
