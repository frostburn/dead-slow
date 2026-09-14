(function(root) {
    'use strict';
    const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
    function createTrain(ctx,destination=ctx.destination) {
        const bus=ctx.createGain(),motor=ctx.createOscillator(),motorGain=ctx.createGain(),motorFilter=ctx.createBiquadFilter();
        const noise=ctx.createBufferSource(),rolling=ctx.createGain(),rollFilter=ctx.createBiquadFilter();
        const squeal=ctx.createOscillator(),squealGain=ctx.createGain(),squealFilter=ctx.createBiquadFilter();
        const buffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),samples=buffer.getChannelData(0);
        let seed=1717;for(let i=0;i<samples.length;i++){seed=(1664525*seed+1013904223)>>>0;samples[i]=seed/2147483648-1;}
        bus.gain.value=motorGain.gain.value=rolling.gain.value=squealGain.gain.value=0;bus.connect(destination);
        motor.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(12),new Float32Array([0,1,.42,.25,.14,.12,.065,.045,.03,.025,.015,.01])));
        motorFilter.type='lowpass';motorFilter.frequency.value=240;motorFilter.Q.value=.6;
        motor.connect(motorFilter);motorFilter.connect(motorGain);motorGain.connect(bus);motor.start();
        noise.buffer=buffer;noise.loop=true;rollFilter.type='bandpass';rollFilter.frequency.value=650;rollFilter.Q.value=.45;
        noise.connect(rollFilter);rollFilter.connect(rolling);rolling.connect(bus);noise.start();
        squeal.type='sine';squealFilter.type='lowpass';squealFilter.frequency.value=1700;
        squeal.connect(squealFilter);squealFilter.connect(squealGain);squealGain.connect(bus);squeal.start();
        const voices=new Set();let joint=null,nextJoint=0,disposed=false,active=false;
        function impulse(kind) {
            if(disposed)return;
            const now=ctx.currentTime,air=kind==='brake',heavy=kind==='couple'||kind==='uncouple';
            const duration=air?.48:heavy?.3:.11,env=ctx.createGain(),filter=ctx.createBiquadFilter(),source=ctx.createBufferSource();
            source.buffer=buffer;filter.type=air?'highpass':'lowpass';filter.frequency.value=air?1150:heavy?800:1400;filter.Q.value=.55;
            env.gain.setValueAtTime(0,now);env.gain.linearRampToValueAtTime(air?.045:heavy?.13:.065,now+.006);
            env.gain.exponentialRampToValueAtTime(.0001,now+duration);
            source.connect(filter);filter.connect(env);env.connect(bus);
            const sources=[source],nodes=[filter,env];
            if(!air) {
                const ring=ctx.createOscillator(),level=ctx.createGain();ring.type='sine';ring.frequency.value=heavy?112:236;level.gain.value=.16;
                ring.connect(level);level.connect(env);sources.push(ring);nodes.push(level);
            }
            const voice={stop(){for(const s of sources)try{s.stop(ctx.currentTime+.015);}catch(_){/* ended */}}};
            if(voices.size>=6){const oldest=voices.values().next().value;oldest.stop();voices.delete(oldest);}
            voices.add(voice);let ended=0;
            for(const s of sources){s.onended=()=>{s.disconnect();if(++ended===sources.length){nodes.forEach(n=>n.disconnect());voices.delete(voice);}};s.start(now);s.stop(now+duration+.015);}
        }
        function stop() {
            active=false;joint=null;bus.gain.setTargetAtTime(0,ctx.currentTime,.012);
            for(const voice of voices)voice.stop();voices.clear();
        }
        return {
            tick(st,running) {
                if(disposed)return;
                if(!running||!st){if(active)stop();return;}
                active=true;const now=ctx.currentTime,group=st.groups.find(g=>g.cars.some(c=>c.powered)),engine=group.cars.find(c=>c.powered);
                const speed=Math.abs(engine.v),braking=Math.max(engine.pressure,st.independent),power=st.power/4;
                bus.gain.setTargetAtTime(1,now,.025);motor.frequency.setTargetAtTime(32+power*28,now,.25);
                motorFilter.frequency.setTargetAtTime(180+power*230,now,.2);motorGain.gain.setTargetAtTime(.018+power*.035,now,.12);
                rolling.gain.setTargetAtTime(.045*clamp(speed/12,0,1),now,.1);
                squeal.frequency.setTargetAtTime(530+speed*23,now,.1);
                squealGain.gain.setTargetAtTime(.008*braking*clamp(speed/5,0,1),now,.08);
                const phase=Math.floor(st.stats.distance/6);
                if(speed>.3&&phase!==joint&&now>=nextJoint){impulse('joint');nextJoint=now+.12;}
                joint=phase;
            },
            event(kind) {if(active)impulse(kind);},
            stop,
            dispose() {if(disposed)return;stop();disposed=true;for(const s of [motor,noise,squeal]){s.stop();s.disconnect();}for(const n of [bus,motorGain,motorFilter,rolling,rollFilter,squealGain,squealFilter])n.disconnect();}
        };
    }
    const api={createTrain};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.RailAudio=api;
})(typeof globalThis!=='undefined'?globalThis:this);
