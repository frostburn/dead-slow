"""Pale Reach UI checks, called once from the existing atlas browser job."""
def check_polar(page,check,out):
    page.set_viewport_size({'width':1440,'height':1000})
    for stage in [1,2,3,4,5,6]:
        page.evaluate('(n)=>{DeadSlow.level(7,n);DeadSlow.speed(0)}',stage)
        page.wait_for_timeout(80)
        check(f'7-0{stage} exposes polar chart and hides railway panels',page.locator('#polar-panel').is_visible() and not page.locator('#rail-panel').is_visible())
        check(f'7-0{stage} shows its authored bridge briefing',page.evaluate('DeadSlowTest.state.level.polar.dispatch[1].length>80'))
        if stage==1:
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
            check('Unloading captains have physical cargo progress','Unloading' in page.locator('#polar-fleet').inner_text())
        if stage==6:
            page.locator('[data-polar-target=fuel]').click()
            check('Target buttons select the named military installation',page.evaluate('DeadSlowTest.state.run.polar.operation.gun.target==="fuel"'))
            page.keyboard.press('b')
            check('An unprepared shot consumes no ammunition',page.evaluate('DeadSlowTest.state.run.polar.operation.gun.ammo===24'))
            check('Strike restores the mooring checklist',page.locator('#check-inside').inner_text()=='Inside berth')
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
        check(f'Convoy orders remain visible at {width}×{height}',page.locator('#polar-panel').is_visible() and page.locator('[data-convoy=sedge][data-order=proceed]').is_visible())
        check(f'Order buttons have usable targets at {width}×{height}',page.locator('#polar-fleet button').evaluate_all('(bs)=>bs.every(b=>b.getBoundingClientRect().height>=40)'))
        page.locator('.polar-mobile-splits').evaluate('(d)=>d.open=true')
        check(f'Split times are accessible at {width}×{height}',page.locator('#polar-splits').is_visible() and page.locator('#polar-splits .split-row').count()==3)
        page.screenshot(path=str(out/f'pale-reach-{width}.png'))
        for stage in [4,5,6]:
            page.evaluate('(n)=>{DeadSlow.level(7,n);DeadSlow.speed(0)}',stage)
            check(f'7-0{stage} operations fit {width}×{height}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
            check(f'7-0{stage} action buttons are usable at {width}×{height}',page.locator('#polar-actions button:visible').evaluate_all('(bs)=>bs.length>=3 && bs.every(b=>b.getBoundingClientRect().height>=40)'))
            page.screenshot(path=str(out/f'pale-reach-{stage}-{width}.png'))
        page.evaluate('DeadSlow.level(7,3);DeadSlow.speed(0)')
    page.set_viewport_size({'width':1440,'height':1000});page.evaluate('DeadSlow.level(1,1);DeadSlow.speed(0)')
    check('Leaving the polar world hides its convoy panel',not page.locator('#polar-panel').is_visible())

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
