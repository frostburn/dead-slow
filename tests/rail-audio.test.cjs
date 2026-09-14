'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),A=require('../src/rail-audio.js');
function context(){
    const ctx={currentTime:0,sampleRate:8000,destination:{},sources:[],gains:[],createPeriodicWave:()=>({})};
    const param=()=>({value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
    const node=()=>({gain:param(),frequency:param(),Q:param(),connect(){},disconnect(){}});
    ctx.createGain=()=>{const g=node();ctx.gains.push(g);return g;};ctx.createBiquadFilter=node;
    ctx.createBuffer=(n,length)=>({getChannelData:()=>new Float32Array(length)});
    ctx.createOscillator=ctx.createBufferSource=()=>{const s={...node(),start(){},stop(){s.stopped=true;},setPeriodicWave(){s.custom=true;}};ctx.sources.push(s);return s;};
    return ctx;
}
const state=(distance=0,speed=3)=>({power:2,independent:0,stats:{distance},groups:[{cars:[{powered:true,v:speed,pressure:.5}]}]});
test('train sound runs through a silent initial bus and mute/pause stops transients',()=>{
    const ctx=context(),train=A.createTrain(ctx);assert.equal(ctx.gains[0].gain.value,0);assert.ok(ctx.sources[0].custom);
    train.tick(state(),true);assert.equal(ctx.gains[0].gain.value,1);train.event('couple');
    assert.ok(ctx.sources.length>3);train.tick(null,false);assert.equal(ctx.gains[0].gain.value,0);
    assert.ok(ctx.sources.slice(3).every(s=>s.stopped));train.dispose();assert.ok(ctx.sources.every(s=>s.stopped));
});
test('frozen distance creates no wheel-joint backlog and accelerated ticks stay bounded',()=>{
    const ctx=context(),train=A.createTrain(ctx);train.tick(state(),true);const count=ctx.sources.length;
    for(let i=1;i<100;i++){ctx.currentTime=i*.01;train.tick(state(),true);}assert.equal(ctx.sources.length,count);
    for(let i=1;i<100;i++)train.tick(state(i*100),true);
    assert.ok(ctx.sources.length<=count+2);train.dispose();
});
