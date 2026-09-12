(function (root) {
    'use strict';
    // Four beating reeds, including a semitone, rather than two decaying sine bells.
    // Exported separately so the real graph can be rendered in an OfflineAudioContext.
    function soundHorn(ctx, destination = ctx.destination) {
        const now = ctx.currentTime, duration = 1.75;
        const envelope = ctx.createGain(), lowpass = ctx.createBiquadFilter();
        const highpass = ctx.createBiquadFilter(), drive = ctx.createWaveShaper();
        const mix = ctx.createGain(), sources = [], nodes = [envelope, lowpass, highpass, drive, mix];
        const curve = new Float32Array(2049);
        for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(2.8 * (2 * i / (curve.length - 1) - 1));
        drive.curve = curve;
        drive.oversample = '2x';
        highpass.type = 'highpass';
        highpass.frequency.value = 55;
        highpass.Q.value = .5;
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(650, now);
        lowpass.frequency.linearRampToValueAtTime(1450, now + .11);
        lowpass.frequency.linearRampToValueAtTime(1050, now + 1.25);
        lowpass.Q.value = .7;
        mix.gain.value = .32;
        envelope.gain.setValueAtTime(0, now);
        envelope.gain.linearRampToValueAtTime(.085, now + .09);
        envelope.gain.linearRampToValueAtTime(.072, now + 1.18);
        envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
        mix.connect(drive); drive.connect(highpass); highpass.connect(lowpass);
        lowpass.connect(envelope); envelope.connect(destination);
        const real = new Float32Array(17);
        const imag = new Float32Array([0, 1, .82, .61, .48, .37, .27, .20, .17, .13, .11, .08, .06, .04, .03, .02, .01]);
        const wave = ctx.createPeriodicWave(real, imag);
        for (const [i, frequency] of [87.31, 110, 116.54, 146.83].entries()) {
            const reed = ctx.createOscillator();
            reed.setPeriodicWave(wave);
            reed.frequency.setValueAtTime(frequency * .965, now);
            reed.frequency.exponentialRampToValueAtTime(frequency, now + .12);
            reed.detune.value = (i - 1.5) * 2.5;
            reed.connect(mix);
            reed.start(now); reed.stop(now + duration + .04);
            sources.push(reed);
        }
        let ended = 0, stopped = false;
        for (const source of sources) source.onended = () => {
            source.disconnect();
            if (++ended === sources.length) for (const node of nodes) node.disconnect();
        };
        return {
            until: now + duration,
            stop() {
                if (stopped) return;
                stopped = true;
                const time = ctx.currentTime, age = Math.max(0, time - now);
                // AudioParam.value is not necessarily the value of its scheduled
                // ramp (notably before offline rendering). Hold the envelope's
                // actual level, then fade; muting before attack stays silent.
                const held = age < .09 ? .085 * age / .09
                    : age < 1.18 ? .085 + (.072 - .085) * (age - .09) / 1.09
                    : .072 * Math.pow(.0001 / .072, Math.min(1, (age - 1.18) / (duration - 1.18)));
                envelope.gain.cancelScheduledValues(time);
                envelope.gain.setValueAtTime(held, time);
                envelope.gain.linearRampToValueAtTime(0, time + .012);
            }
        };
    }
    function create() {
        let ctx = null, engine = null, gain = null, enabled = true, horn = null;
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
                enabled = !!v;
                if (!enabled) horn?.stop();
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
                if (!enabled) return;
                init();
                // Holding H or tapping repeatedly cannot stack dangerously loud horns.
                if (ctx && (!horn || ctx.currentTime >= horn.until)) horn = soundHorn(ctx);
            }
        };
    }
    const api = { create, soundHorn };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.HarborAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
