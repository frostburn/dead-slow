/* Separated wheel syllables. No continuously sounding oscillator or wall-time loop. */
(function (root) {
    'use strict';
    const STROKE = Math.PI / 2; // Four alternating ee / oo strokes per shell revolution.
    function syllableParameters(st, index) {
        const speed = Math.max(0, st.audioSpeed || 0), wet = (st.wet || 0) > .5;
        const rate = speed / (st.radius || 24) + Math.max(0, st.slip || 0);
        const energy = Math.min(1, speed / 35), ee = index % 2 === 0;
        return { wet, rate, ee,
            // At high speed preserve a gap: more syllables, not one long whine.
            duration: Math.min(wet ? .13 : ee ? .29 : .34, STROKE / Math.max(.01, rate) * .48),
            gain: (wet ? .017 : .042) * (.78 + .22 * energy),
            pitch: wet ? (ee ? 1120 : 880) : (ee ? 158 : 128) + 16 * energy
        };
    }
    function createWheel(ctx, destination = ctx.destination) {
        const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(destination);
        const real = new Float32Array(33), imag = new Float32Array(33);
        for (let i = 1; i < imag.length; i++) imag[i] = 1 / Math.pow(i, 1.12);
        const wave = ctx.createPeriodicWave(real, imag);
        const voices = new Set();
        let stroke = null, lastRoll = -1, next = 0, sequence = 0, disposed = false;
        function hush() {
            bus.gain.cancelScheduledValues(ctx.currentTime);
            bus.gain.setTargetAtTime(0, ctx.currentTime, .006);
            // A mode switch or mute must not resurrect an unfinished syllable.
            for (const voice of voices) voice.source.stop(ctx.currentTime + .03);
            stroke = null; lastRoll = -1;
        }
        function speak(st) {
            const p = syllableParameters(st, sequence++), now = ctx.currentTime;
            const source = ctx.createOscillator(), env = ctx.createGain();
            const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter();
            if (p.wet) source.type = 'triangle'; else source.setPeriodicWave(wave);
            source.frequency.setValueAtTime(p.pitch * (p.wet ? 1.35 : .85), now);
            source.frequency.exponentialRampToValueAtTime(p.pitch * 1.06, now + p.duration * .24);
            source.frequency.exponentialRampToValueAtTime(p.pitch * (p.wet ? .74 : .92), now + p.duration);
            f1.type = f2.type = 'bandpass';
            f1.frequency.value = p.wet ? p.pitch : p.ee ? 380 : 330;
            f2.frequency.value = p.wet ? p.pitch * 2.7 : p.ee ? 2300 : 680;
            f1.Q.value = p.wet ? .7 : 2.4; f2.Q.value = p.wet ? .7 : 3.6;
            env.gain.setValueAtTime(0, now);
            env.gain.linearRampToValueAtTime(p.gain, now + p.duration * .14);
            env.gain.linearRampToValueAtTime(p.gain * .8, now + p.duration * .55);
            env.gain.linearRampToValueAtTime(0, now + p.duration);
            source.connect(f1); source.connect(f2); f1.connect(env); f2.connect(env); env.connect(bus);
            const voice = { source }; voices.add(voice);
            source.onended = () => {
                source.disconnect(); f1.disconnect(); f2.disconnect(); env.disconnect(); voices.delete(voice);
            };
            bus.gain.cancelScheduledValues(now); bus.gain.setTargetAtTime(1, now, .006);
            source.start(now); source.stop(now + p.duration + .02);
            next = now + p.duration + .085; // Deliberate silence between syllables, even at 32x.
        }
        return {
            tick(st, active) {
                if (disposed) return;
                if (!active || !st || syllableParameters(st, 0).rate < .015) {
                    if (stroke !== null) hush();
                    return;
                }
                const roll = Math.max(0, st.roll || 0), current = Math.floor(roll / STROKE);
                const restarted = roll < lastRoll;
                if ((stroke === null || current !== stroke || restarted) && ctx.currentTime >= next) speak(st);
                // Skipped strokes during accelerated play are dropped, never queued in a burst.
                stroke = current; lastRoll = roll;
            },
            stop() { if (!disposed) hush(); },
            dispose() {
                if (disposed) return;
                hush(); disposed = true; bus.disconnect();
            }
        };
    }
    const api = { STROKE, syllableParameters, createWheel };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.GerboAudio = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
