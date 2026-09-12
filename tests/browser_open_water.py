"""Production-console and WebAudio regressions, called by browser_smoke.py.
Inline mounting deliberately uses no ?test harness, network or page navigation.
"""
def check_open_water(browser, check, html):
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors, messages, requests = [], [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: messages.append(m.text))
    page.on('request', lambda r: requests.append(r.url))
    page.evaluate("Object.defineProperty(window,'localStorage',{value:{getItem(k){return this[k]||null},setItem(k,v){this[k]=v}}})")
    page.set_content(html)
    page.wait_for_function('!!window.DeadSlow')
    check('Console discovery gives a hearty greeting without a test URL', any('AHOY, CAPTAIN' in s for s in messages))
    check('Production console does not expose the raw test harness', page.evaluate('typeof DeadSlowTest === "undefined"'))
    check('Developer methods are absent from the player-facing menus', 'DeadSlow.' not in page.locator('#dialog').inner_text())
    page.click('[data-action="begin"]')
    page.evaluate('DeadSlow.help();DeadSlow.levels();DeadSlow.runs();DeadSlow.times();DeadSlow.timeline("bigger-boat")')
    check('Console inspection alone does not make an attempt practice', page.evaluate('!DeadSlow.state().run.pausedUsed'))
    page.evaluate('DeadSlow.level(3,4);DeadSlow.speed(0);DeadSlow.line()')
    check('Later tug starts out of line-passing range', page.evaluate('!DeadSlow.state().run.jobs.line') and '44 m' in page.locator('#toast').inner_text())
    page.evaluate('DeadSlow.level(3,5);DeadSlow.step(1)')
    check('Later ferry starts mid-channel, not already boarding', page.evaluate('DeadSlow.state().run.ship.x>200 && DeadSlow.state().run.jobs.stats.vehiclesLoaded===0'))
    for side, x, y in [('west',1,30),('north',260,1),('east',519,30),('south',60,309)]:
        page.evaluate('([x,y])=>{DeadSlow.level(3,1);DeadSlow.warp(x,y);DeadSlow.step(1/120)}', [x,y])
        check(f'Production {side} exit shows the out-of-bounds failure', 'Beyond the chart.' in page.locator('#dialog').inner_text() and side in page.locator('#dialog').inner_text())
        before = page.evaluate('DeadSlow.state().run.time')
        page.wait_for_timeout(40)
        check(f'{side} exit stops the clock', page.evaluate('DeadSlow.state().run.time') == before)
    page.evaluate('DeadSlow.normal()')
    check('Normal resets acceleration and starts a ranked trial', page.evaluate('DeadSlow.speed()===1 && !DeadSlow.state().run.pausedUsed'))
    page.evaluate('DeadSlow.watch("first-crossing",32)')
    page.wait_for_function('DeadSlow.state().run.time>8')
    page.evaluate('DeadSlow.speed(0)')
    before = page.evaluate('DeadSlow.state().run.time')
    page.wait_for_timeout(130)
    check('Replay can be frozen from the console', page.evaluate('DeadSlow.state().run.time') == before)
    check('Frozen practice is labeled on the visible clock', 'FROZEN' in page.locator('#clock-label').inner_text() and 'UNRANKED' in page.locator('#clock-label').inner_text())
    page.evaluate('DeadSlow.step(10);DeadSlow.speed(32)')
    page.wait_for_function('DeadSlow.report()?.verified === true', timeout=30000)
    check('Animated accelerated replay matches the author time', abs(page.evaluate('DeadSlow.report().time')-123.95)<1/120)
    check('Watching a verification run cannot write a PB', page.locator('#best-overall').inner_text()=='—')
    reports = page.evaluate('DeadSlow.verify("all")')
    check('Production console executes all three real verification runs', len(reports)==3 and all(r['verified'] and not r['ranked'] for r in reports))
    check('Verification report identifies actual control-only method', all('no repositioning' in r['method'] for r in reports))
    # Exercise the actual graph, not a separately synthesized sound or mocked samples.
    audio = page.evaluate('''async () => {
        const rate=44100, ctx=new OfflineAudioContext(1,rate*2.3,rate);
        HarborAudio.soundHorn(ctx);
        const data=(await ctx.startRendering()).getChannelData(0);
        const rms=(a,b)=>{let sum=0;for(let i=Math.floor(a*rate);i<Math.floor(b*rate);i++)sum+=data[i]*data[i];return Math.sqrt(sum/(Math.floor(b*rate)-Math.floor(a*rate)));};
        let peak=0;for(const v of data)peak=Math.max(peak,Math.abs(v));
        const bin=f=>{let re=0,im=0,n=0;for(let i=Math.floor(.3*rate);i<Math.floor(1.1*rate);i++){re+=data[i]*Math.cos(2*Math.PI*f*i/rate);im+=data[i]*Math.sin(2*Math.PI*f*i/rate);n++;}return Math.hypot(re,im)*2/n;};
        return {peak,attack:rms(0,.01),body:rms(.3,1.1),sustain:rms(.9,1.1),tail:rms(2,2.3),roughness:bin(440)+bin(587)+bin(349)};
    }''')
    check('Horn graph produces a sustained, bounded signal', .01<audio['body']<.1 and .02<audio['peak']<.2 and audio['sustain']>.01)
    check('Horn envelope has a soft start and silent tail', audio['attack']<audio['body']*.2 and audio['tail']<1e-5)
    check('Horn has strong upper harmonics, not just two sine tones', audio['roughness']>.001)
    muted = page.evaluate('''async () => {
        const old=window.AudioContext, ctx=new OfflineAudioContext(1,44100*2.3,44100);
        const make=ctx.createOscillator.bind(ctx);let voices=0;
        ctx.createOscillator=()=>{voices++;return make()};
        window.AudioContext=function(){return ctx};
        try {
            const a=HarborAudio.create();a.horn();a.horn();a.horn();a.enabled=false;
            const buffer=await ctx.startRendering();let peak=0;
            for(const v of buffer.getChannelData(0))peak=Math.max(peak,Math.abs(v));
            return {voices,peak};
        } finally {window.AudioContext=old;}
    }''')
    check('Repeated horn presses cannot stack voices', muted['voices']==5)  # Engine + four horn reeds.
    check('Muting before the horn attack stays silent', muted['peak']<1e-5)
    fade = page.evaluate('''async () => {
        const rate=44100, ctx=new OfflineAudioContext(1,rate,rate);
        const horn=HarborAudio.soundHorn(ctx);
        const pending=ctx.suspend(.4).then(()=>{horn.stop();horn.stop();return ctx.resume()});
        const buffer=await ctx.startRendering();await pending;
        const data=buffer.getChannelData(0);
        const energy=(a,b)=>{let sum=0;for(let i=a*rate|0;i<(b*rate|0);i++)sum+=data[i]*data[i];return sum;};
        return {before:energy(.2,.35),after:energy(.45,.9)};
    }''')
    check('Muting mid-horn fades to silence and is idempotent', fade['before']>1 and fade['after']<1e-9)
    check('Open-water console and horn introduce no page errors', not errors)
    check('Console, replays and horn make no network requests', not requests)
    page.close()
