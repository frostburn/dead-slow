"""Render the real audio graph: space mix headroom, no idle diesel, fades and routing."""
def check_flight_audio(page, check):
    rows = page.evaluate('''async () => {
        async function render(rate, scenario) {
            const ctx = new OfflineAudioContext(1, Math.ceil(rate * 2.1), rate);
            const Original = window.AudioContext;
            let voices = 0;
            const oscillator = ctx.createOscillator.bind(ctx);
            ctx.createOscillator = () => { voices++; return oscillator(); };
            window.AudioContext = function () { return ctx; };
            const pending = [];
            const resume = ctx.resume.bind(ctx);
            function at(time, work) {
                pending.push(ctx.suspend(time).then(() => {
                    ctx.resume = () => Promise.resolve();
                    try { work(); } finally { ctx.resume = resume; }
                    return resume();
                }));
            }
            try {
                const audio = HarborAudio.create(); audio.setSpace(true); audio.init();
                const firing = scenario === 'main' ? {main: 1} : scenario === 'reverse' ? {main: -1}
                    : scenario === 'side' ? {side: 1} : scenario === 'yaw' ? {yaw: -1}
                    : scenario === 'beam' ? {} : scenario === 'coast' ? {} : {main: 1, side: 1, yaw: 1};
                const flight = {firingJets: firing, beamForce: scenario === 'beam' || scenario === 'mix' ? 1 : 0};
                audio.tick({engine: 1}, true, flight); // An active spacecraft must never use this diesel value.
                if (scenario === 'mix') at(.35, () => {
                    for (let i=0;i<15;i++) { audio.radar(); audio.order(); audio.checkpoint(); audio.impact(); audio.success(); }
                });
                if (scenario === 'mute') at(.35, () => { audio.radar(); audio.enabled = false; });
                if (scenario === 'coast-after-burn') at(.7, () => audio.tick({engine: 0}, true, {firingJets: {main:0, side:0, yaw:0}, beamForce:0}));
                if (scenario === 'paused') at(.7, () => audio.tick({engine: 1}, false, flight));
                if (scenario === 'switch') at(.35, () => { audio.radar(); audio.success(); audio.setSpace(false); audio.tick({engine:0},false); });
                if (scenario === 'switch-back') {
                    at(.35, () => { audio.radar(); audio.success(); audio.setSpace(false); });
                    at(.7, () => { audio.setSpace(true); audio.init(); audio.tick({engine:0},true,{firingJets:{}}); });
                }
                const data = (await ctx.startRendering()).getChannelData(0);
                await Promise.all(pending);
                let peak=0, clipped=0, bad=0, energy=0, tail=0, rough=0;
                for(let i=0;i<data.length;i++) {
                    peak=Math.max(peak,Math.abs(data[i]));
                    if(Math.abs(data[i])>=.99)clipped++;
                    if(!Number.isFinite(data[i]))bad++;
                    if(i>=rate*.15 && i<rate*.3)energy+=data[i]*data[i];
                    if(i>=rate*1.5)tail+=data[i]*data[i];
                    if(i>0 && i<rate*.3)rough+=Math.abs(data[i]-data[i-1]);
                }
                return {rate,scenario,voices,peak,clipped,bad,rms:Math.sqrt(energy/(rate*.15)),tail:Math.sqrt(tail/(rate*.6)),rough};
            } finally { window.AudioContext = Original; }
        }
        const rows=[];
        for(const rate of [44100,48000,96000]) rows.push(await render(rate,'mix'));
        for(const scenario of ['coast','main','reverse','side','yaw','beam','coast-after-burn','paused','mute','switch','switch-back'])
            rows.push(await render(48000,scenario));
        return rows;
    }''')
    for r in rows:
        label = f"{r['scenario']} at {r['rate']} Hz"
        check(f'Finite, unclipped spacecraft audio ({label})', r['bad'] == 0 and r['clipped'] == 0 and r['peak'] < .16)
        if r['scenario'] == 'mix':
            # One dormant marine oscillator + four drive oscillators + 24 cue oscillators.
            check(f'All simultaneous flight cues are bounded and repeated presses cannot stack ({label})', r['voices'] == 29 and r['peak'] > .025)
        elif r['scenario'] == 'coast':
            check('Space coast is silent even when legacy engine value is nonzero', r['peak'] < 1e-7)
        elif r['scenario'] in ['main', 'reverse', 'side', 'yaw', 'beam']:
            check(f'Actual {r["scenario"]} firing has audible onboard feedback', .001 < r['rms'] < .05)
        else:
            check(f'No stale engine or transient audio after {r["scenario"]}', r['tail'] < 1e-6)
    cues = page.evaluate('''async () => {
        const results=[];
        for(const kind of ['radar','order','checkpoint','success','impact']) {
            const rate=48000, ctx=new OfflineAudioContext(1,rate*2,rate);
            HarborSpaceAudio.soundCue(ctx,kind);
            const data=(await ctx.startRendering()).getChannelData(0);
            let energy=0,peak=0,tail=0;
            for(let i=0;i<data.length;i++){energy+=data[i]*data[i];peak=Math.max(peak,Math.abs(data[i]));if(i>rate*1.1)tail=Math.max(tail,Math.abs(data[i]));}
            results.push({kind,energy,peak,tail});
        }
        const ctx = new OfflineAudioContext(1,48000,48000);
        const cue=HarborSpaceAudio.soundCue(ctx,'radar');cue.stop();cue.stop();
        const data=(await ctx.startRendering()).getChannelData(0);
        return {results,stoppedPeak:Math.max(...data.map(Math.abs))};
    }''')
    for r in cues['results']:
        check(f'{r["kind"]} is audible with a bounded level and a silent tail', r['energy'] > .01 and .003 < r['peak'] < .07 and r['tail'] < 1e-7)
    check('Cancelling radar before attack is silent and idempotent', cues['stoppedPeak'] < 1e-7)
    return {'mix_and_transitions': rows, 'cues': cues}
