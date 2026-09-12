"""Measure the production engine/horn/cue graph together, not just an isolated horn."""
def check_audio_mix(page, check):
    results = page.evaluate('''async () => {
        const results = [];
        for (const rate of [44100, 48000, 96000]) {
            for (const power of [-1, 1]) {
                const ctx = new OfflineAudioContext(1, Math.ceil(rate * 3.3), rate);
                const original = window.AudioContext;
                let voices = 0;
                const oscillator = ctx.createOscillator.bind(ctx);
                ctx.createOscillator = () => { voices++; return oscillator(); };
                window.AudioContext = function () { return ctx; };
                try {
                    const audio = HarborAudio.create();
                    audio.init();
                    audio.tick({engine: power}, true);
                    const resume = ctx.resume.bind(ctx);
                    const blast = ctx.suspend(.75).then(() => {
                        // horn.init() resumes a real suspended context. Hold the offline
                        // renderer until the entire synchronous batch is scheduled;
                        // otherwise it can render seconds between consecutive JS calls.
                        ctx.resume = () => Promise.resolve();
                        try {
                            audio.horn(); audio.horn(); audio.horn();
                            audio.order(); audio.impact();
                        } finally { ctx.resume = resume; }
                        return resume();
                    });
                    const buffer = await ctx.startRendering();
                    await blast;
                    const data = buffer.getChannelData(0);
                    let peak = 0, clipped = 0, sum = 0, engineSum = 0, nonfinite = 0;
                    for (let i = 0; i < data.length; i++) {
                        const value = data[i];
                        if (!Number.isFinite(value)) nonfinite++;
                        peak = Math.max(peak, Math.abs(value));
                        if (Math.abs(value) >= .99) clipped++;
                        if (i >= rate*.9 && i < rate*1.8) sum += value*value;
                        if (i >= rate*.35 && i < rate*.65) engineSum += value*value;
                    }
                    results.push({rate, power, peak, clipped, nonfinite, voices,
                        mixRms: Math.sqrt(sum/(rate*.9)),
                        engineRms: Math.sqrt(engineSum/(rate*.3))});
                } finally { window.AudioContext = original; }
            }
        }
        return results;
    }''')
    for row in results:
        label = f"{row['rate']} Hz, {'ahead' if row['power'] > 0 else 'astern'}"
        check(f'Mixed engine/horn/cues retain headroom ({label})',
              .02 < row['peak'] < .15 and row['clipped'] == 0 and row['nonfinite'] == 0)
        check(f'Mix test actually includes a running engine and one horn ({label})',
              row['engineRms'] > .005 and row['mixRms'] > .01 and row['voices'] == 7)
    # Quantitative horn ceiling catches accidental restoration of the old 2x envelope.
    horn = page.evaluate('''async () => {
        const ctx = new OfflineAudioContext(1, 44100*2, 44100);
        HarborAudio.soundHorn(ctx);
        const data = (await ctx.startRendering()).getChannelData(0);
        let peak=0, sum=0;
        for (let i=0; i<data.length; i++) {
            peak=Math.max(peak,Math.abs(data[i]));
            if (i>=44100*.3 && i<44100*1.1) sum+=data[i]*data[i];
        }
        return {peak, rms:Math.sqrt(sum/(44100*.8))};
    }''')
    check('Quieter horn has a regression ceiling while remaining audible',
          .015 < horn['rms'] < .03 and .04 < horn['peak'] < .09)
    return {'mix': results, 'horn': horn}
