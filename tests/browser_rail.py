"""Focused railway presentation and audio checks, using the release-atlas page."""
def check_railway(page, check, out):
    page.set_viewport_size({'width':1440,'height':1000})
    page.evaluate("DeadSlowTest.load(HarborLevels.findIndex(l=>l.id==='long-grade-1'),false)")
    check('Replay controls stay out of the player UI',page.locator('[data-action=watch-rail], [data-rail=watch], .rail-watch').count()==0 and 'Watch run' not in page.locator('#dialog').inner_text())
    page.evaluate('DeadSlow.watch("long-grade-1",8)')
    check('Watch run starts the railway recording as unranked playback',page.evaluate('DeadSlow.state().replay==="long-grade-1" && DeadSlowTest.state.run.pausedUsed && DeadSlow.speed()===8'))
    page.evaluate('DeadSlow.speed(0);DeadSlow.step(600)')
    check('Watchable railway run completes without recording a personal best',page.evaluate('DeadSlow.report().verified && DeadSlowTest.state.storage.stages["long-grade-1"].clears===0'))
    page.evaluate('DeadSlow.normal()')
    check('Taking the controls starts a fresh normal-speed ranked attempt',page.evaluate('DeadSlow.speed()===1 && !DeadSlowTest.state.run.pausedUsed && DeadSlowTest.state.status==="running"'))
    page.evaluate('DeadSlow.level(5,2);DeadSlow.speed(0)')
    page.locator('[data-rail="uncouple"][data-value="engine"]').click()
    check('Splitting selects the released wagons',page.evaluate('!Railway.groupFor(DeadSlowTest.state.run.rail,DeadSlowTest.state.run.rail.selected).cars.some(c=>c.powered)'))
    page.locator('#rail-hand').click()
    check('Handbrake UI secures wagons without securing the engine',page.evaluate('Railway.groupFor(DeadSlowTest.state.run.rail,"F1").cars.every(c=>c.hand) && !Railway.engineGroup(DeadSlowTest.state.run.rail).cars[0].hand'))
    page.locator('[data-rail="couple"]').click()
    check('Rejoining selects the controlled train and updates the strip',page.locator('.rail-cut').count()==1 and page.evaluate('DeadSlowTest.state.run.rail.selected==="engine"'))
    page.locator('#rail-hand').click()
    page.evaluate('DeadSlowTest.railCommand("power",1)')
    check('Powered train cannot be split from the UI',page.locator('[data-rail="uncouple"]:disabled').count()==6)
    page.evaluate('DeadSlowTest.railCommand("stop");DeadSlowTest.state.run.rail.groups[0].cars.at(-1).pressure=.1;DeadSlowTest.hud()')
    check('Split controls wait for wagon brake pressure',page.locator('[data-rail="uncouple"]:disabled').count()==6 and '10%' in page.locator('#rail-cut-status').inner_text())
    page.evaluate('DeadSlow.level(5,3);DeadSlow.speed(0)')
    page.click('#rail-reverse')
    check('Reverse is an action label in either direction',page.locator('#rail-reverse').inner_text()=='Reverse · X' and page.evaluate('DeadSlowTest.state.run.rail.reverser===-1'))
    page.click('#rail-reverse')
    page.evaluate('''() => {
        const st=DeadSlowTest.state.run.rail,g=Railway.engineGroup(st);
        g.cars=g.cars.slice(0,3);g.path=[{id:'steep',dir:1,start:0,end:st.net.edges.steep.length}];
        g.cars.forEach((c,i)=>{c.q=150-i*18;c.v=8;});DeadSlowTest.hud();
    }''')
    check('Approaching curve warning appears before any wagon exceeds its limit',page.locator('#rail-alert').is_visible() and 'ahead' in page.locator('#rail-alert').inner_text() and page.evaluate('Railway.danger(DeadSlowTest.state.run.rail).cars.length===0'))
    page.wait_for_timeout(50);page.screenshot(path=str(out/'rail-curve-ahead.png'))
    page.evaluate('''() => {
        const st=DeadSlowTest.state.run.rail,g=Railway.engineGroup(st);
        g.cars.forEach((c,i)=>{c.q=350-i*18;c.v=4;});g.cars[2].v=7;DeadSlowTest.hud();
    }''')
    check('A fast tail produces visible derailment danger while the engine stays safe',page.locator('#rail-alert.critical').is_visible() and page.evaluate('Railway.danger(DeadSlowTest.state.run.rail).cars[0].id==="S2" && !DeadSlowTest.state.run.rail.failure'))
    page.wait_for_timeout(50);page.screenshot(path=str(out/'rail-tail-danger.png'))
    page.set_viewport_size({'width':390,'height':844})
    check('Railway controls fit the portrait viewport',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.locator('#rail-reverse').scroll_into_view_if_needed()
    check('Reverse remains reachable on mobile',page.locator('#rail-reverse').is_visible())
    page.screenshot(path=str(out/'rail-mobile.png'))
    audio=page.evaluate('''async()=>{
        const rate=22050,ctx=new OfflineAudioContext(1,rate*5,rate),train=RailAudio.createTrain(ctx);
        const st={power:0,independent:0,stats:{distance:0},groups:[{cars:[{powered:true,v:0,pressure:0}]}]};
        train.tick(st,true);
        const tasks=[ctx.suspend(1).then(()=>{st.power=3;st.groups[0].cars[0].v=8;st.stats.distance=12;train.tick(st,true);return ctx.resume()}),
            ctx.suspend(2).then(()=>{train.event('couple');return ctx.resume()}),
            ctx.suspend(3).then(()=>{train.event('brake');return ctx.resume()}),
            ctx.suspend(4).then(()=>{train.stop();return ctx.resume()})];
        const data=(await ctx.startRendering()).getChannelData(0);await Promise.all(tasks);
        const rms=(a,b)=>{let sum=0;for(let i=a*rate;i<b*rate;i++)sum+=data[i]*data[i];return Math.sqrt(sum/((b-a)*rate));};
        let peak=0;for(const v of data)peak=Math.max(peak,Math.abs(v));train.dispose();
        return {idle:rms(.2,.8),moving:rms(1.2,1.8),paused:rms(4.5,4.9),peak,finite:data.every(Number.isFinite)};
    }''')
    check('Train audio renders finite unclipped engine and rolling sound',audio['finite'] and audio['peak']<.8 and audio['moving']>audio['idle']>0)
    check('Train audio falls silent after stopping',audio['paused']<.00001)
