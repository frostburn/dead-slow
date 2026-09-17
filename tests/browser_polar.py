"""Pale Reach UI checks, called once from the existing atlas browser job."""
def check_polar(page,check,out):
    page.set_viewport_size({'width':1440,'height':1000})
    for stage in range(1,13):
        page.evaluate('(n)=>{DeadSlow.level(7,n);DeadSlow.speed(0)}',stage)
        page.wait_for_timeout(80)
        check(f'7-{stage:02} exposes a folding bridge watch and hides railway panels',page.locator('#polar-info').is_visible() and not page.locator('#rail-panel').is_visible())
        check(f'7-{stage:02} keeps status and splits out of the control sidebar',page.locator('#polar-info #polar-readout').count()==1 and page.locator('#polar-info #polar-splits').count()==1 and page.locator('#polar-panel #polar-readout, #polar-panel #sub-track-detail, #polar-panel .splits').count()==0)
        check(f'7-{stage:02} only reserves a sidebar when extra controls exist',page.locator('#polar-panel').is_visible()==(stage>2))
        if stage>2:
            check(f'7-{stage:02} desktop orders stay compact',page.locator('#polar-panel').evaluate('(e)=>e.getBoundingClientRect().height<500'))
        check(f'7-0{stage} shows its authored bridge briefing',page.evaluate('DeadSlowTest.state.level.polar.dispatch[1].length>80'))
        if stage==1:
            page.locator('.polar-timing').evaluate('(d)=>d.open=true')
            check('Elapsed splits can be opened inside the chart window',page.locator('#polar-info #polar-splits').is_visible())
            check('Turning pocket progress is visible','TURNING POCKET' in page.locator('#polar-readout').inner_text())
            page.evaluate('DeadSlow.step(12.25);DeadSlowTest.state.run.polar.routeOpened=true;DeadSlow.step(1)')
            check('Completed polar splits show elapsed minutes, seconds and hundredths',page.locator('#splits .split-row').first.locator('span').last.inner_text()=='00:12.25')
            page.evaluate('DeadSlow.step(2)')
            check('Recorded split time stays fixed as the clock advances',page.locator('#splits .split-row').first.locator('span').last.inner_text()=='00:12.25')
            check('Unfinished polar splits retain an empty time',page.locator('#splits .split-row').last.locator('span').last.inner_text()=='—')
        if stage==2:
            check('Following mission has live gap and closing rate','HULL GAP' in page.locator('#polar-readout').inner_text())
        if stage==4:
            check('Restricted mission exposes tow and winch but no gun',page.locator('#polar-tow-controls').is_visible() and not page.locator('#polar-gun-controls').is_visible())
            page.keyboard.press('f')
            check('Tow key reaches a visible range and relative-speed notice',page.locator('#polar-notice').is_visible() and 'within 55 m' in page.locator('#polar-notice').inner_text())
            check('Patrols, visible icebreaker and station exist on the playable chart',page.evaluate('DeadSlowTest.state.run.polar.operation.npcs.filter(n=>n.team==="patrol").length===2 && DeadSlowTest.state.run.polar.operation.npcs.some(n=>n.cutter&&n.active&&n.ship.iceClass) && DeadSlowTest.state.run.polar.operation.assets[0].team==="civilian"'))
        if stage in [5,6]:
            check(f'7-0{stage} exposes deliberate fire and hostile target controls',page.locator('#polar-gun-controls').is_visible() and page.locator('#polar-fire').is_disabled())
            page.keyboard.press('t');page.evaluate('DeadSlowTest.hud()')
            check(f'7-0{stage} target key selects a hostile contact',page.locator('#polar-targets [aria-pressed=true]').count()==1)
        if stage==5:
            check('Base defense describes evacuation rather than docking',page.locator('#dock-list-label').inner_text()=='EVACUATION STATUS')
            check('Unloading reports sit in the chart window beside separate captain orders','Unloading' in page.locator('#polar-fleet-readouts').inner_text() and page.locator('#polar-panel [data-convoy]').count()==4)
        if stage==6:
            page.locator('[data-polar-target=fuel]').click()
            check('Target buttons select the named military installation',page.evaluate('DeadSlowTest.state.run.polar.operation.gun.target==="fuel"'))
            page.keyboard.press('b')
            check('An unprepared shot consumes no ammunition',page.evaluate('DeadSlowTest.state.run.polar.operation.gun.ammo===24'))
            check('Strike restores the mooring checklist',page.locator('#check-inside').inner_text()=='Inside berth')
        if stage>=7 and stage!=11:
            check_submarine(page,check,stage)
        if stage==11:
            check('Neutral rescue has three captain pairs and towing without guns',page.locator('#polar-fleet button').count()==6 and page.locator('#polar-tow-controls').is_visible() and not page.locator('#polar-gun-controls').is_visible())
            page.locator('[data-convoy=moth][data-order=proceed]').click()
            check('A stranded captain requires rescue contact before departure','Establish rescue contact first' in page.locator('#polar-notice').inner_text())
            check('All required rescues have elapsed split rows',page.locator('#splits .split-row').count()==5)
        page.screenshot(path=str(out/f'pale-reach-{stage}.png'))
    page.evaluate('DeadSlow.level(7,3);DeadSlow.speed(0)')
    check_polar_rendering(page,check)
    check('Two captains have four order buttons',page.locator('#polar-fleet button').count()==4)
    page.locator('[data-convoy=morrow][data-order=proceed]').click()
    check('Proceed orders reach the physical captain',page.evaluate('DeadSlowTest.state.run.polar.fleet[0].order==="proceed"'))
    page.locator('[data-convoy=morrow][data-order=hold]').click()
    check('Hold is reflected as the selected accessible order',page.locator('[data-convoy=morrow][data-order=hold]').get_attribute('aria-pressed')=='true')
    page.evaluate('DeadSlow.step(2)')
    check('Polar watch clock advances',page.locator('#clock').inner_text()=='00:02.00')
    page.click('#pause-btn')
    check('Polar pause explains that ice and captains stop together','channel closure are paused together' in page.locator('#dialog').inner_text())
    page.locator('[data-action=resume]').click()
    for width,height in [(390,844),(844,390)]:
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(80)
        check(f'Polar bridge fits {width}×{height}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        check(f'Bridge watch stays within the viewport at {width}×{height}',page.locator('#polar-info').evaluate('(e)=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}'))
        check(f'Convoy orders remain visible at {width}×{height}',page.locator('#polar-panel').is_visible() and page.locator('[data-convoy=sedge][data-order=proceed]').is_visible())
        check(f'Order buttons have usable targets at {width}×{height}',page.locator('#polar-fleet button').evaluate_all('(bs)=>bs.every(b=>b.getBoundingClientRect().height>=40)'))
        page.locator('#polar-info').evaluate('(d)=>d.open=true')
        page.locator('.polar-timing').evaluate('(d)=>d.open=true')
        check(f'Split times are accessible at {width}×{height}',page.locator('#polar-splits').is_visible() and page.locator('#polar-splits .split-row').count()==3)
        page.screenshot(path=str(out/f'pale-reach-{width}.png'))
        page.locator('#polar-info > summary').click()
        check(f'Folding the watch clears its reports from the chart at {width}×{height}',not page.locator('#polar-readout').is_visible() and page.locator('#polar-panel [data-convoy]').first.is_visible())
        for stage in range(4,13):
            page.evaluate('(n)=>{DeadSlow.level(7,n);DeadSlow.speed(0)}',stage)
            check(f'7-0{stage} operations fit {width}×{height}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            check(f'7-0{stage} action buttons are usable at {width}×{height}',page.locator('#polar-actions button:visible').evaluate_all('(bs)=>bs.length>=3 && bs.every(b=>b.getBoundingClientRect().height>=40)'))
            if stage>=7 and stage!=11:
                check(f'7-0{stage} depth and sonar orders remain available at {width}×{height}',page.locator('[data-sub-depth]').count()==3 and page.locator('#sub-ping').is_visible())
                page.locator('#polar-info').evaluate('(d)=>d.open=true')
                page.locator('.polar-timing').evaluate('(d)=>d.open=true')
                check(f'7-{stage:02} elapsed splits remain available at {width}×{height}',page.locator('#polar-splits .split-row').count()==(6 if stage==12 else 4 if stage==8 else 3))
            if stage==12:
                handoff_fixture(page)
                check(f'Finale handoff keeps captain orders usable at {width}×{height}',page.locator('#polar-fleet button').count()==6 and page.locator('#polar-fleet button').evaluate_all('(bs)=>bs.every(b=>b.getBoundingClientRect().height>=40)') and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            page.screenshot(path=str(out/f'pale-reach-{stage}-{width}.png'))
            page.locator('#polar-info').evaluate('(d)=>d.open=false')
        page.evaluate('DeadSlow.level(7,3);DeadSlow.speed(0)')
    page.set_viewport_size({'width':1440,'height':1000});page.evaluate('DeadSlow.level(1,1);DeadSlow.speed(0)')
    check('Leaving the polar world restores the normal horn and hides the watch',not page.locator('#polar-panel').is_visible() and not page.locator('#polar-info').is_visible() and page.locator('#horn-btn').is_visible())

def check_submarine(page,check,stage):
    check(f'7-0{stage} exposes underwater controls and clearance',page.locator('#polar-sub-controls').is_visible() and 'SEABED' in page.locator('#polar-ice').inner_text())
    check(f'7-0{stage} hides surface weapons and tow controls',not page.locator('#polar-gun-controls').is_visible() and not page.locator('#polar-tow-controls').is_visible())
    check(f'7-{stage:02} has no horn control or horn action',not page.locator('#horn-btn').is_visible() and page.evaluate('DeadSlowTest.signal()===false'))
    check(f'7-0{stage} describes an estimated sonar chart','estimated sonar' in page.locator('#chart-section').get_attribute('aria-label'))
    if stage==7:
        page.evaluate('DeadSlow.step(2)')
        page.keyboard.press('t');page.evaluate('DeadSlowTest.hud()')
        check('First passive return stays unidentified with weapons locked',page.locator('#sub-contacts [aria-pressed=true]').count()==1 and 'UNIDENTIFIED' in page.locator('#sub-contacts').inner_text() and page.locator('#sub-fire').is_disabled())
        page.locator('[data-sub-depth="1"]').click()
        check('Depth button changes the order without moving the hull instantly',page.evaluate('DeadSlowTest.state.run.ship.depthTarget===48 && DeadSlowTest.state.run.ship.depth===18'))
        page.evaluate('DeadSlow.step(10)')
        check('Depth readout follows the gradual dive',page.evaluate('DeadSlowTest.state.run.ship.depth>18 && DeadSlowTest.state.run.ship.depth<48') and '48 m ORDERED' in page.locator('#sub-depth-status').inner_text())
        page.keyboard.press('p');page.evaluate('DeadSlowTest.hud()')
        check('Pulse key starts the visible recharge',page.locator('#sub-ping').is_disabled() and page.evaluate('DeadSlowTest.state.run.polar.stats.pulses===1'))
        page.evaluate('DeadSlow.step(4)')
        page.locator('#sub-contacts button').first.click()
        check('Active echo permits a deliberate identification',page.locator('#sub-identify').is_enabled() and 'observed depth' in page.locator('#sub-track-detail').inner_text())
        page.locator('#sub-identify').click()
        check('Identifying the tender does not unlock torpedoes','FRIENDLY TENDER' in page.locator('#sub-contacts').inner_text() and page.locator('#sub-fire').is_disabled())
        page.keyboard.press('z');page.evaluate('DeadSlowTest.hud()')
        check('Shallower key reaches the depth order',page.evaluate('DeadSlowTest.state.run.ship.depthTarget===18'))
    if stage==8:
        check('Covert watch exposes team progress and suspicion','SUSPICION' in page.locator('#polar-readout').inner_text() and 'TEAM WORK' in page.locator('#sub-solution').inner_text() and page.locator('#sub-team').is_visible() and not page.locator('#sub-fire').is_visible())
        page.locator('#sub-team').click()
        check('Remote insertion gives a visible hatch requirement','marked hatch' in page.locator('#polar-notice').inner_text())
        page.click('#pause-btn')
        check('Underwater pause describes the stopped mission clocks','sonar memories' in page.locator('#dialog').inner_text())
        page.locator('[data-action=resume]').click()
    if stage==9:
        page.evaluate('DeadSlow.step(3)')
        page.locator('#sub-contacts button').first.click()
        check('Minelayer watch shows selected uncertainty in the watch and keeps the tube locked',page.locator('#sub-contacts button').count()>0 and '±' in page.locator('#sub-track-detail').inner_text() and page.locator('#sub-fire').is_disabled())
        check('Hunt objective guards the passage rather than requiring a kill','Keep the passage clear' in page.locator('#splits').inner_text())
    if stage==10:
        check('Recovery begins with a waiting team and two pickup choices',page.locator('#sub-pickups button').count()==2 and 'Recover team' in page.locator('#sub-team').inner_text() and 'RECOVERY' in page.locator('#sub-solution').inner_text())
        page.locator('[data-pickup=far]').click()
        check('Rendezvous button orders actual travel on the ice',page.locator('[data-pickup=far]').get_attribute('aria-pressed')=='true' and page.evaluate('!DeadSlowTest.state.run.polar.recovery.settled && DeadSlowTest.state.run.polar.mission.team==="waiting"'))
        page.evaluate('DeadSlow.step(3)')
        check('Relocating team has visible progress','RELOCATING' in page.locator('#sub-solution').inner_text())
    if stage==12:
        check('Finale starts with a shared weather clock and a surface work report','LEG 1 / PETREL' in page.locator('#polar-phase').inner_text() and 'RIME ABOVE' in page.locator('#polar-ice').inner_text())
        handoff_fixture(page)
        check('Handoff replaces submarine orders with the three actual convoy captains',not page.locator('#polar-sub-controls').is_visible() and page.locator('#polar-fleet button').count()==6 and 'KESTREL' in page.locator('#ship-name').inner_text())
        check('Taking the surface bridge restores its horn and replaces underwater reports',page.locator('#horn-btn').is_visible() and page.locator('#polar-surface-status').is_visible() and not page.locator('#polar-sub-status').is_visible())
        check('Handoff preserves elapsed time and shows the second leg','LEG 2 / KESTREL' in page.locator('#polar-phase').inner_text() and page.evaluate('DeadSlowTest.state.run.time>6 && DeadSlowTest.state.run.finalJourney.watch.handoffAt>2'))
        page.locator('[data-convoy=witness][data-order=proceed]').click()
        check('The new bridge sends orders to the retained surface state',page.evaluate('DeadSlowTest.state.run.finalJourney.surface.polar.fleet[0].order==="proceed"'))
        page.keyboard.press('Shift+r');page.evaluate('DeadSlowTest.hud()')
        check('Retry restores both legs and their original ice','LEG 1 / PETREL' in page.locator('#polar-phase').inner_text() and page.locator('#polar-sub-controls').is_visible() and page.evaluate('DeadSlowTest.state.run.finalJourney.surface.polar.broken===0'))

def handoff_fixture(page):
    # UI transition isolation, not a navigation proof: full control runs are in
    # polar-finale-navigation.cjs. Only engineer objective state is arranged here.
    page.evaluate('''() => {
        DeadSlow.step(2);
        const st=DeadSlowTest.state.run.polar;
        st.mission.team='recovered';st.mission.work=st.config.access.work;
        st.stats.teamInserted=1;st.stats.teamRecovered=1;
        DeadSlow.step(5.2);
    }''')

def check_polar_rendering(page,check):
    result=page.evaluate('''() => {
        const {level,run}=DeadSlowTest.state;
        const r={...run,polar:{...run.polar,ice:{...run.polar.ice,opened:run.polar.ice.opened.slice()}}};
        function canvas(){const c=document.createElement('canvas');c.getBoundingClientRect=()=>({width:900,height:700});c.getContext('2d',{willReadFrequently:true});return c}
        const a=canvas(),b=canvas(),paint=()=>PaleReachView.render(a,level,r,1);
        paint();
        const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
        const same=(a,b)=>a.every((v,i)=>v===b[i]);
        const differences=[];
        const fresh=()=>{
            PaleReachView.render(b,level,{...r,polar:{...r.polar,ice:{...r.polar.ice}}},1);
            const actual=pixels(a),expected=pixels(b);let channels=0,maxDelta=0;const samples=[];
            for(let i=0;i<actual.length;i++)if(actual[i]!==expected[i]){
                channels++;maxDelta=Math.max(maxDelta,Math.abs(actual[i]-expected[i]));
                if(samples.length<5)samples.push({x:Math.floor(i/4)%a.width,y:Math.floor(i/4/a.width),actual:actual[i],expected:expected[i]});
            }
            differences.push({channels,maxDelta,samples});return channels===0;
        };
        const before=pixels(a),ice=r.polar.ice;
        // Include hexagons on repaint-region boundaries, where stale edges hide.
        for(let k=0;k<ice.thickness.length;k++)if(ice.thickness[k]>0&&ice.tiles[k].x>280&&ice.tiles[k].x<420&&ice.tiles[k].y>210&&ice.tiles[k].y<355)ice.opened[k]=r.polar.time;
        ice.revision++;paint();const fracture=fresh()&&!same(before,pixels(a));
        const opened=pixels(a);r.polar.time+=70;paint();const ageing=fresh()&&!same(opened,pixels(a));
        for(let k=0;k<ice.opened.length;k++)if(ice.opened[k]>=0)ice.opened[k]=r.polar.time;
        r.polar.time+=.2;paint();const reclear=fresh()&&same(opened,pixels(a));
        const split=document.querySelector('#splits').firstElementChild,notch=document.querySelector('#notches').firstElementChild;
        DeadSlowTest.hud();DeadSlowTest.hud();
        return {fracture,ageing,reclear,differences,stableHUD:split===document.querySelector('#splits').firstElementChild&&notch===document.querySelector('#notches').firstElementChild};
    }''')
    import json
    print('Polar cache comparison: '+json.dumps(result),flush=True)
    check('Cached fractures match a fresh chart without stale hex edges',result['fracture'])
    check('Cached slush visibly ages and matches a fresh chart',result['ageing'])
    check('Reclearing slush restores the chart without accumulating opacity',result['reclear'])
    check('Unchanged split and telegraph nodes survive HUD refreshes',result['stableHUD'])
