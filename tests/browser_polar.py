"""Pale Reach UI checks, called once from the existing atlas browser job."""
def check_polar(page,check,out):
    page.set_viewport_size({'width':1440,'height':1000})
    for stage in [1,2,3]:
        page.evaluate('(n)=>{DeadSlow.level(7,n);DeadSlow.speed(0)}',stage)
        page.wait_for_timeout(80)
        check(f'7-0{stage} exposes polar chart and hides railway panels',page.locator('#polar-panel').is_visible() and not page.locator('#rail-panel').is_visible())
        check(f'7-0{stage} shows its authored bridge briefing',page.evaluate('DeadSlowTest.state.level.polar.dispatch[1].length>80'))
        if stage==1:
            check('Turning pocket progress is visible','TURNING POCKET' in page.locator('#polar-readout').inner_text())
        if stage==2:
            check('Following mission has live gap and closing rate','HULL GAP' in page.locator('#polar-readout').inner_text())
        page.screenshot(path=str(out/f'pale-reach-{stage}.png'))
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
        page.screenshot(path=str(out/f'pale-reach-{width}.png'))
    page.set_viewport_size({'width':1440,'height':1000});page.evaluate('DeadSlow.level(1,1);DeadSlow.speed(0)')
    check('Leaving the polar world hides its convoy panel',not page.locator('#polar-panel').is_visible())
