"""Focused railway presentation and audio checks, using the release-atlas page."""
def rail_detail(page, selector):
    if not page.locator('#rail-info').evaluate('(e)=>e.open'):
        page.locator('#rail-info > summary').click()
    if not page.locator('.rail-details').evaluate('(e)=>e.open'):
        page.locator('.rail-details > summary').click()
    return page.locator(selector).inner_text()


def check_railway(page, check, out):
    for width,height in [(1440,1000),(1920,1080)]:
        page.set_viewport_size({'width':width,'height':height})
        for number in range(1,13):
            page.evaluate('(n)=>{DeadSlow.level(5,n);DeadSlow.speed(0);document.getElementById("rail-info").open=true}',number)
            bounds=page.evaluate('''async()=>{
                await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
                const canvas=document.getElementById('sea').getBoundingClientRect(),panel=document.getElementById('rail-info').getBoundingClientRect();
                const config=DeadSlowTest.state.run.rail.config;
                const current=HarborLevels.find(l=>l.rail===config);
                const b=RailPresentation.statusPlacement(current,DeadSlowTest.state.run.rail.net,canvas.width,canvas.height);
                const p={x:panel.x-canvas.x,y:panel.y-canvas.y,w:panel.width,h:panel.height};
                const element=document.getElementById('rail-info'),style=getComputedStyle(element);
                return {clear:b.protectedAreas.every(a=>p.x>=a.x+a.w||p.x+p.w<=a.x||p.y>=a.y+a.h||p.y+p.h<=a.y),fallback:element.dataset.fallback==='true'&&Math.abs(p.x-(canvas.width-p.w-12))<1&&Math.abs(p.y-54)<1,noScroll:style.maxHeight==='none'&&style.overflowY==='visible'&&element.scrollHeight<=element.clientHeight+1};
            }''')
            check(f'5-{number:02}: full status fits or uses default corner at {width}×{height}',(bounds['clear'] or bounds['fallback']) and bounds['noScroll'])
            if width==1440:
                page.screenshot(path=str(out/f'rail-status-{number:02}.png'))
            expanded=page.evaluate('''async()=>{
                const panel=document.getElementById('rail-info');panel.querySelector('.rail-details').open=true;
                await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
                return panel.open&&panel.querySelector('.rail-details').open&&getComputedStyle(panel).maxHeight==='none'&&panel.scrollHeight<=panel.clientHeight+1;
            }''')
            check(f'5-{number:02}: expanding details never adds a status scrollbar at {width}×{height}',expanded)
    page.set_viewport_size({'width':1440,'height':1000})
    page.evaluate('DeadSlow.level(1,1);DeadSlow.speed(0)')
    page.locator('#brief').dblclick()
    check('Repeated mouse clicks cannot select instrument text at sea',page.evaluate('getSelection().toString()===""'))
    page.evaluate('DeadSlow.level(5,1);DeadSlow.speed(0)')
    check('Railway splits stay in the sidebar',page.locator('#rail-panel #rail-tasks').is_visible() and page.locator('#rail-info #rail-tasks').count()==0)
    page.evaluate('''(()=>{const r=DeadSlowTest.state.run,t=r.rail.config.tasks[0];r.rail.completed.push(t.id);r.splits.push({name:t.text,time:12.5});DeadSlowTest.hud()})()''')
    check('Completed railway split displays its timestamp',page.locator('#rail-tasks .done').inner_text().find('12.50')>=0)
    page.evaluate('DeadSlowTest.state.run.rail.completed=[];DeadSlowTest.hud()')
    check('Invalidated split retains its first time and strikes out the objective',page.locator('#rail-tasks .invalidated').count()==1 and '12.50' in page.locator('#rail-tasks .invalidated').inner_text() and page.locator('#rail-tasks .invalidated > span').first.evaluate('(e)=>getComputedStyle(e).textDecorationLine')=='line-through')
    page.evaluate('DeadSlow.level(5,1);DeadSlow.speed(0)')
    zoom=page.locator('#zoom-btn').inner_text()
    page.locator('#sea').dblclick(position={'x':20,'y':20})
    check('Double click no longer changes map zoom',page.locator('#zoom-btn').inner_text()==zoom)
    page.locator('#rail-summary').dblclick()
    check('Railway instrument text cannot acquire selection boxes',page.evaluate('getSelection().toString()===""'))
    check('Lower railway telegraphs are visible',page.locator('#rail-helm').is_visible() and page.locator('#rail-helm button').count()==6)
    check('Grade shares the lower band with compact telegraphs',page.evaluate("""(()=>{const a=document.querySelector('#rail-grade').getBoundingClientRect(),b=document.querySelector('#rail-helm').getBoundingClientRect();return a.width>300&&a.right<=b.left&&Math.abs(a.top-b.top)<12})()"""))
    check('Guidance changes do not move sidebar controls',page.evaluate("""(()=>{const lever=document.querySelector('.rail-levers'),top=lever.getBoundingClientRect().top,n=document.querySelector('#rail-notice'),old=n.textContent;n.textContent='Brake and secure the selected wagons. '.repeat(30);const stable=top===lever.getBoundingClientRect().top;n.textContent=old;return stable&&!document.querySelector('#rail-panel #rail-notice')})()"""))
    page.locator('#rail-info > summary').click()
    check('Guidance folds away to uncover the map',not page.locator('#rail-notice').is_visible())
    page.locator('#rail-info > summary').click()
    page.locator('.rail-details > summary').click()
    check('Auxiliary details expand inside the map panel',page.locator('#rail-cut-status').is_visible())
    page.locator('.rail-details > summary').click()
    page.locator('#rail-power').focus()
    page.keyboard.press('ArrowRight')
    check('Focused railway slider retains native arrow adjustment',page.evaluate('DeadSlowTest.state.run.rail.power===1'))
    page.keyboard.press('w')
    check('W still controls the train after focusing a slider',page.evaluate('DeadSlowTest.state.run.rail.power===2'))
    page.locator('#rail-helm [data-rail="power"][data-rail-step="1"]').click()
    check('Lower plus telegraph updates the engine and sidebar',page.locator('#rail-power-value').inner_text()=='3 / 4' and page.evaluate('DeadSlowTest.state.run.rail.power===3'))
    page.locator('#rail-helm [data-rail="power"][data-rail-step="-1"]').click()
    check('Lower minus telegraph updates the same command state',page.locator('#rail-power').input_value()=='2')
    page.locator('#rail-power').focus();page.keyboard.press('Space')
    check('Full brake works with slider focus',page.evaluate('DeadSlowTest.state.run.rail.power===0 && Railway.engineGroup(DeadSlowTest.state.run.rail).brake===1'))
    page.keyboard.press('Escape')
    check('Escape still pauses with slider focus',page.evaluate('DeadSlowTest.state.status==="paused"'))
    check('Dialog text remains selectable',page.evaluate('getComputedStyle(document.getElementById("dialog")).userSelect==="text"'))
    page.evaluate('DeadSlow.level(5,1);DeadSlow.speed(0)')
    check('Railway adapter runs without marine placeholders',page.evaluate('!DeadSlowTest.state.run.ship && !DeadSlowTest.state.run.jobs'))
    page.keyboard.press('w')
    check('Keyboard command reaches the train and its HUD',page.evaluate('DeadSlowTest.state.run.rail.power===1') and page.locator('#rail-power-value').inner_text()=='1 / 4')
    page.evaluate('DeadSlow.rail("power",2)')
    check('Console command uses the same train and HUD',page.evaluate('DeadSlowTest.state.run.rail.power===2') and page.locator('#rail-power-value').inner_text()=='2 / 4')
    page.evaluate('DeadSlow.level(5,7);DeadSlow.speed(0)')
    stable_colors=page.evaluate('''() => {
        DeadSlowTest.railCommand('uncouple','engine');DeadSlowTest.railCommand('hand');
        const wagons=[...document.querySelectorAll('[data-rail="select"]')].filter(b=>b.dataset.value!=='engine');
        const snapshots=[];
        for(let i=0;i<12;i++){
            DeadSlowTest.hud();snapshots.push(wagons.map(b=>b.className).join('|'));
            if(wagons.some(b=>b.classList.contains('sliding')))return false;
        }
        return new Set(snapshots).size===1;
    }''')
    check('Stationary wagon colors remain unchanged across repeated HUD updates',stable_colors)
    page.evaluate('DeadSlow.level(5,6);DeadSlow.speed(0)')
    stable=page.evaluate('''() => {
        const st=DeadSlowTest.state.run.rail,c=Railway.engineGroup(st).cars[0];
        for(let i=0;i<20;i++){st.time+=.08;c.v=i%2?0:.2;DeadSlowTest.hud();if(!document.getElementById('rail-hand').disabled)return false;}
        c.v=0;st.time+=.5;DeadSlowTest.hud();return !document.getElementById('rail-hand').disabled;
    }''')
    check('Action icons stay disabled through stopping jitter and recover after settling',stable)
    page.evaluate('''() => {const st=DeadSlowTest.state.run.rail;st.reverser=-1;Railway.engineGroup(st).cars[0].v=.7;DeadSlowTest.hud();}''')
    check('Rollback speed is signed against the selected driving end',page.locator('#rail-speed').inner_text()=='-2.5')
    page.evaluate('DeadSlow.level(5,4);DeadSlow.speed(0)')
    check('Passenger waits for a visible departure signal','Awaiting your signal' in rail_detail(page, '#rail-operations') and page.locator('[data-rail="dispatch"]').is_enabled())
    page.keyboard.press('h')
    check('H signals the passenger and disables repeated dispatch',page.evaluate('DeadSlowTest.state.run.rail.traffic[0].released') and page.locator('[data-rail="dispatch"]').is_disabled())
    page.evaluate('DeadSlow.level(5,5);DeadSlow.speed(0)')
    check('Runaway wagons start moving independently',page.evaluate('Railway.groupFor(DeadSlowTest.state.run.rail,"R1").cars.every(c=>c.v>0)') and 'rolling free' in rail_detail(page, '#rail-operations'))
    page.evaluate('DeadSlow.level(5,7);DeadSlow.speed(0)')
    check('Bridge rating is visible before entering','205 t' in rail_detail(page, '#rail-operations'))
    page.evaluate('DeadSlow.level(5,8);DeadSlow.speed(0)')
    check('Cargo clearance warning appears before moving','fouled' in rail_detail(page, '#rail-operations'))
    page.screenshot(path=str(out/'rail-cargo-clearance.png'))
    page.locator('[data-rail="switch"][data-value="fork"]').click()
    page.locator('[data-rail="switch"][data-value="join"]').click()
    check('Broad road is fouled by parked flats outside the running track','parked wagon' in rail_detail(page, '#rail-operations'))
    check('Cargo clearance uses normal shunting controls',page.locator('#rail-gantry').count()==0 and page.locator('[data-rail="select"][data-value="P1"]').count()==1)
    page.evaluate('DeadSlowTest.railCommand("uncouple","engine");DeadSlowTest.hud()')
    check('Detached vessel clears cached route warnings without advancing time','fouled' not in rail_detail(page, '#rail-operations') and 'swings across' not in page.locator('#rail-alert').inner_text())
    page.evaluate('DeadSlowTest.railCommand("hand");DeadSlow.step(2)')
    check('Cargo shunting guide records the secured carrier split',page.evaluate('DeadSlowTest.state.run.rail.completed.includes("leave-vessel")'))
    page.evaluate("DeadSlowTest.load(HarborLevels.findIndex(l=>l.id==='long-grade-1'),false)")
    check('Replay controls stay out of the player UI',page.locator('[data-action=watch-rail], [data-rail=watch], .rail-watch').count()==0 and 'Watch run' not in page.locator('#dialog').inner_text())
    page.evaluate('DeadSlow.watch("long-grade-1",8)')
    check('Watch run starts the railway recording as unranked playback',page.evaluate('DeadSlow.state().replay==="long-grade-1" && DeadSlowTest.state.run.pausedUsed && DeadSlow.speed()===8'))
    page.evaluate('DeadSlow.speed(0);DeadSlow.step(600);if(DeadSlowTest.state.status!=="complete")DeadSlow.step(60)')
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
    check('Split controls wait for wagon brake pressure',page.locator('[data-rail="uncouple"]:disabled').count()==6 and '10%' in rail_detail(page, '#rail-cut-status'))
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
        const st={power:0,independent:0,stats:{distance:0},groups:[{cars:[{id:'engine',powered:true,v:0,pressure:0}]}]};
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
    page.evaluate('DeadSlow.level(5,9);DeadSlow.speed(0)')
    check('Helper control waits for a connected helper',page.locator('#rail-helper').is_disabled())
    check('Lower helper telegraph also waits for coupling',page.locator('#rail-helm [data-rail="helper"][data-rail-step="1"]').is_disabled())
    check('The helper needs a real reverse approach',page.locator('[data-rail="couple"]').is_disabled() and '78.4 m' in rail_detail(page, '#rail-pickup'))
    page.evaluate('DeadSlow.level(5,12);DeadSlow.speed(0)')
    page.locator('[data-rail="couple"]').click()
    check('Coupling enables rear assistance',page.locator('#rail-helper').is_enabled())
    page.locator('#rail-helm [data-rail="helper"][data-rail-step="1"]').click()
    check('Helper telegraph controls rear assistance only',page.evaluate('DeadSlowTest.state.run.rail.helper===1 && DeadSlowTest.state.run.rail.power===0'))
    page.locator('#rail-helm [data-rail="helper"][data-rail-step="-1"]').click()
    page.keyboard.press('e')
    check('E commands the helper in place of the loco brake',page.evaluate('DeadSlowTest.state.run.rail.helper===1 && DeadSlowTest.state.run.rail.power===0') and page.locator('#rail-independent').count()==0)
    for width in [320,390,844]:
        page.set_viewport_size({'width':width,'height':844 if width<800 else 390})
        page.screenshot(path=str(out/f'rail-helper-{width}.png'))
        bounds=page.evaluate('({page:document.documentElement.scrollWidth,viewport:innerWidth,levers:[...document.querySelectorAll(".rail-levers input")].map(e=>({id:e.id,right:e.getBoundingClientRect().right}))})')
        check(f'Three train levers fit at {width}px: {bounds}',len(bounds['levers'])==3 and bounds['page']<=bounds['viewport'] and all(e['right']<=bounds['viewport'] for e in bounds['levers']))
        check(f'Lower telegraphs stay reachable at {width}px',page.evaluate('''[...document.querySelectorAll('#rail-helm button')].every(b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&r.width>=40&&r.height>=40})'''))
        stable=page.evaluate('''() => {
            const st=DeadSlowTest.state.run.rail,c=Railway.drivingEngine(st),tops=[],heights=[];
            for(const force of [0,110000,0,125000,0]){
                c.coupler=force;st.time+=1;DeadSlowTest.hud();
                tops.push(document.querySelector('.rail-levers').getBoundingClientRect().top);
                heights.push(document.getElementById('rail-alert').getBoundingClientRect().height);
            }
            return new Set(tops).size===1 && new Set(heights).size===1 && document.getElementById('rail-alert').textContent.includes('Couplers within limits');
        }''')
        check(f'Coupler warnings keep controls steady at {width}px',stable)
    page.screenshot(path=str(out/'rail-helper-mobile.png'))
    page.set_viewport_size({'width':1440,'height':1000})
    page.evaluate('''() => {
        DeadSlowTest.state.storage.races['long-grade']=[{time:123,clean:false},{time:135,clean:true}];
        DeadSlowTest.state.storage.races['grand-tour']=[{time:456,clean:true}];
    }''')
    page.click('#log-btn')
    check('Railway logbook shows railway and tour records',all(label in page.locator('#dialog').inner_text() for label in ['World 5 · The Long Grade','Grand Tour · 72','02:03.00','02:15.00','07:36.00']))
    for number,label in [(10,'balance reserve'),(11,'Low Crossing'),(12,'Coastal passenger')]:
        page.evaluate('(n)=>{DeadSlow.level(5,n);DeadSlow.speed(0)}',number)
        check(f'5-{number} shows its operating constraint',label in rail_detail(page, '#rail-operations'))
        page.wait_for_timeout(50);page.screenshot(path=str(out/f'rail-{number}.png'))
    page.evaluate('DeadSlow.watch("long-grade-12",0)')
    check('Finale recording remains console-accessible',page.evaluate('DeadSlow.state().replay==="long-grade-12"'))
