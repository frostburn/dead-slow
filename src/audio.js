(function (root) {
    'use strict';
    function create() {
        let ctx = null, engine = null, gain = null, enabled = true;
        function init() {
            try {
                if (!ctx) {
                    const AC = root.AudioContext || root.webkitAudioContext;
                    if (!AC)
                        return;
                    ctx = new AC();
                    const re = new Float32Array(9), im = new Float32Array([0, 1, .4, .18, .075, .03, .018, .01, .008]);
                    engine = ctx.createOscillator();
                    engine.setPeriodicWave(ctx.createPeriodicWave(re, im));
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.value = 145;
                    filter.Q.value = .45;
                    gain = ctx.createGain();
                    gain.gain.value = 0;
                    engine.connect(filter);
                    filter.connect(gain);
                    gain.connect(ctx.destination);
                    engine.start();
                }
                if (ctx.state === 'suspended')
                    ctx.resume().catch(() => {
                    });
            }
            catch (e) {
                ctx = null;
            }
        }
        function tone(frequency = 440, duration = .2, volume = .035) {
            if (!ctx || !enabled)
                return;
            const now = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
            o.type = 'sine';
            o.frequency.value = frequency;
            f.type = 'lowpass';
            f.frequency.value = 700;
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(volume, now + .018);
            g.gain.exponentialRampToValueAtTime(.0001, now + duration);
            o.connect(f);
            f.connect(g);
            g.connect(ctx.destination);
            o.start(now);
            o.stop(now + duration + .03);
        }
        return {
            init, set enabled(v) {
                enabled = v;
            }, get enabled() {
                return enabled;
            },
            tick(s, active) {
                if (!ctx || !gain)
                    return;
                const now = ctx.currentTime;
                gain.gain.setTargetAtTime(active && enabled ? .011 + Math.abs(s.engine) * .024 : 0, now, .13);
                engine.frequency.setTargetAtTime(35 + Math.abs(s.engine) * 27, now, .2);
            },
            order() {
                tone(310, .15, .025);
            }, checkpoint() {
                tone(520, .22, .025);
                setTimeout(() => tone(650, .28, .022), 110);
            }, impact() {
                tone(73, .35, .06);
            }, success() {
                tone(330, .35, .025);
                setTimeout(() => tone(440, .4, .026), 140);
                setTimeout(() => tone(550, .65, .025), 280);
            }, horn() {
                init();
                tone(110, 1.25, .045);
                tone(146.8, 1.2, .03);
            }
        };
    }
    root.HarborAudio = { create };
})(typeof globalThis !== 'undefined' ? globalThis : this);
