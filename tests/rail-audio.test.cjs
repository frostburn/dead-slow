'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),A=require('../src/rail-audio.js');
function context(){
    const ctx={currentTime:0,sampleRate:8000,destination:{},sources:[],gains:[],createPeriodicWave:()=>({})};
    const param=()=>({value:0,events:[],setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);},setTargetAtTime(v){this.value=v;},linearRampToValueAtTime(v,t){this.events.push(['linear',v,t]);},exponentialRampToValueAtTime(v,t){this.events.push(['exponential',v,t]);},cancelScheduledValues(t){this.events=this.events.filter(e=>e[2]<t);}});
    const node=()=>({gain:param(),frequency:param(),Q:param(),connect(){},disconnect(){}});
    ctx.createGain=()=>{const g=node();ctx.gains.push(g);return g;};ctx.createBiquadFilter=node;
    ctx.createBuffer=(n,length)=>({getChannelData:()=>new Float32Array(length)});
    ctx.createOscillator=ctx.createBufferSource=()=>{const s={...node(),start(time){s.startTime=time;},stop(time){s.stopped=true;s.stopTime=time;},setPeriodicWave(){s.custom=true;}};ctx.sources.push(s);return s;};
    return ctx;
}
const state=(distance=0,speed=3)=>({power:2,independent:0,stats:{distance},groups:[{cars:[{id:'engine',powered:true,v:speed,pressure:.5}]}]});
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
    assert.ok(ctx.sources.length<=count+8);train.dispose();
});
test('wheel joints sound as two close axle pairs followed by a longer gap',()=>{
    const ctx=context(),train=A.createTrain(ctx);train.tick(state(0,8),true);
    const first=ctx.sources.slice(3).filter((_,i)=>i%2===0).map(s=>s.startTime);
    assert.equal(first.length,4);assert.ok(Math.abs(first[1]-first[0]-.2)<1e-9);
    assert.ok(Math.abs(first[3]-first[2]-.2)<1e-9);
    assert.ok(first[2]-first[1]>.3);
    ctx.currentTime=2.25;train.tick(state(18,8),true);
    assert.ok(ctx.sources[11].startTime-first[3]>1.4);
    ctx.currentTime=2.3;train.tick(state(18,0),true);
    assert.ok(ctx.sources.slice(11).every(s=>s.stopTime<=2.315));train.dispose();
});

test('steam whistle has a short-long call, pitched pipes and filtered breath',()=>{
    const ctx=context(),whistle=A.soundWhistle(ctx);
    assert.equal(ctx.sources.length,4);
    assert.ok(ctx.sources.slice(0,3).every(s=>s.custom));
    assert.ok(ctx.sources[3].buffer&&ctx.sources[3].loop);
    const attacks=ctx.gains[0].gain.events.filter(e=>e[0]==='linear'&&e[1]>.01);
    assert.deepEqual(attacks.map(e=>e[2]),[.09,.74]);
    assert.equal(whistle.until,1.9);
    ctx.currentTime=.5;whistle.stop();
    assert.equal(ctx.gains[0].gain.value,0,'Stopping between calls must not create a click');
    assert.ok(ctx.sources.every(s=>s.stopTime<=.52));
    assert.ok(!ctx.gains[0].gain.events.some(e=>e[1]>0&&e[2]>.5),'Mute cancels the second call');
});
test('railway horn selects the whistle, respects mute and stops when paused',()=>{
    const ctx=context(),previous=global.AudioContext;
    global.AudioContext=function(){return ctx;};
    try {
        const audio=require('../src/audio.js').create();audio.setRail(true);
        assert.equal(audio.horn(),true);assert.equal(audio.horn(),false,'Repeated signals cannot stack whistles');
        const whistleSources=ctx.sources.slice(-4);
        assert.ok(whistleSources[3].buffer);
        audio.tick(null,false);assert.ok(whistleSources.every(s=>s.stopTime<=.02));
        audio.enabled=false;const count=ctx.sources.length;
        assert.equal(audio.horn(),false);assert.equal(ctx.sources.length,count);
    } finally {global.AudioContext=previous;}
});
