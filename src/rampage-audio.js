/* Discrete rubber-bearing creaks on land; unchanged tiny wheelspin chirps in water. */
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
            pitch: wet ? (ee ? 1120 : 880) : (ee ? 285 : 220) + 16 * energy
        };
    }
    function createWheel(ctx, destination = ctx.destination) {
        const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(destination);
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
            source.type = 'triangle';
            if (p.wet) {
                // Preserve the accepted water sound, including both filters and bends.
                source.frequency.setValueAtTime(p.pitch * 1.35, now);
                source.frequency.exponentialRampToValueAtTime(p.pitch * 1.06, now + p.duration * .24);
                source.frequency.exponentialRampToValueAtTime(p.pitch * .74, now + p.duration);
                f1.type = f2.type = 'bandpass';
                f1.frequency.value = p.pitch; f2.frequency.value = p.pitch * 2.7;
                f1.Q.value = f2.Q.value = .7;
            } else {
                // Stick/slip bends of a rubber bearing, not a glottal source or
                // a pair of vocal formants. Alternating shapes suggest ee/oo
                // mechanically without synthesizing a little human voice.
                source.frequency.setValueAtTime(p.pitch * (p.ee ? .87 : 1.16), now);
                for (const [u, factor] of (p.ee
                    ? [[.18,1.16],[.37,1.05],[.49,1.12],[.72,.98],[1,.82]]
                    : [[.20,1.03],[.41,.93],[.55,1.01],[.76,.86],[1,.77]]))
                    source.frequency.exponentialRampToValueAtTime(p.pitch * factor, now + p.duration * u);
                f1.type = 'highpass'; f1.frequency.value = 100; f1.Q.value = .5;
                f2.type = 'lowpass'; f2.frequency.value = 1350; f2.Q.value = .65;
            }
            env.gain.setValueAtTime(0, now);
            env.gain.linearRampToValueAtTime(p.gain, now + p.duration * .14);
            env.gain.linearRampToValueAtTime(p.gain * .8, now + p.duration * .55);
            env.gain.linearRampToValueAtTime(0, now + p.duration);
            if (p.wet) { source.connect(f1); source.connect(f2); f1.connect(env); f2.connect(env); }
            else { source.connect(f1); f1.connect(f2); f2.connect(env); }
            env.connect(bus);
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
