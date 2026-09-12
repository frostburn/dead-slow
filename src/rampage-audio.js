/* Wheel-bearing vowels, driven by actual angular phase rather than wall time. */
(function(root){
    'use strict';
    function createWheel(ctx,destination=ctx.destination){
        const source=ctx.createOscillator(), ee=ctx.createBiquadFilter(), oo=ctx.createBiquadFilter(), mix=ctx.createGain();
        const re=new Float32Array(9),im=new Float32Array([0,1,.45,.26,.17,.11,.07,.04,.02]);
        source.setPeriodicWave(ctx.createPeriodicWave(re,im));
        ee.type=oo.type='bandpass';ee.Q.value=3;oo.Q.value=2;
        source.connect(ee);source.connect(oo);ee.connect(mix);oo.connect(mix);mix.connect(destination);
        mix.gain.value=0;source.start();
        return {tick(st,active){
            const t=ctx.currentTime,p=st?.roll||0,vowel=(1+Math.sin(p))/2;
            const speed=st?.audioSpeed||0,slip=st?.slip||0;
            // One ee-oo cycle per revolution; ee has the high second formant.
            source.frequency.setTargetAtTime(310+110*vowel+18*Math.sin(2*p),t,.012);
            ee.frequency.setTargetAtTime(380+270*(1-vowel),t,.012);
            oo.frequency.setTargetAtTime(900+1350*vowel,t,.012);
            mix.gain.setTargetAtTime(active&&speed+slip>.04?.033*Math.min(1,speed/5+slip)*(.35+.65*Math.abs(Math.cos(p))):0,t,.025);
        },stop(){mix.gain.setTargetAtTime(0,ctx.currentTime,.012);},dispose(){source.stop();source.disconnect();ee.disconnect();oo.disconnect();mix.disconnect();}};
    }
    const api={createWheel};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.GerboAudio=api;
})(typeof globalThis!=='undefined'?globalThis:this);
