"""Space UI, actual controls, production playback, and visual regression captures.
Physics/objective isolation is in space.test.cjs; each published space recording is
also executed by browser_open_water.py via the production console.
"""
def check_space(browser, check, html, screenshots=None):
    from pathlib import Path
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
    page.evaluate("Object.defineProperty(window,'localStorage',{value:{getItem(k){return this[k]||null},setItem(k,v){this[k]=v}}})")
    page.set_content(html.replace("new URLSearchParams(location.search).has('test')",'true'))
    page.wait_for_function('!!window.DeadSlowTest')
    def shot(name):
        if screenshots:
            Path(screenshots).mkdir(parents=True,exist_ok=True)
            page.screenshot(path=str(Path(screenshots)/name))
    page.evaluate('DeadSlow.level(4,1);DeadSlow.speed(0);DeadSlowTest.courses(4)')
    check('Fourth world lists twelve sectors plus a selectable bonus',page.locator('.world-tab').count()==4 and page.locator('.level-card').count()==13)
    check('Bonus is explicitly excluded from the 48-stage Grand Tour','excluded from every circuit' in page.locator('#dialog').inner_text() and 'all 48' in page.locator('#dialog').inner_text())
    shot('worlds-four.png')
    # Progress is campaign-only; the selectable Century Ship has its own tally.
    check('Fresh Meridian chart reports twelve campaign sectors and a separate bonus',
          '0 / 12 SECTORS CLEARED' in page.locator('.world-progress').inner_text()
          and '0 / 1 BONUS CLEARED' in page.locator('.world-progress').inner_text())
    for sectors, bonus in [(0, True), (12, False), (12, True)]:
        page.evaluate("""([sectors, bonus]) => {
            for (const l of HarborLevels.filter(l => l.worldNumber === 4)) {
                const saved = DeadSlowTest.state.storage.stages[l.id];
                saved.runs = (l.bonus ? bonus : l.stageNumber <= sectors) ? [{time: 100, clean: true}] : [];
            }
            DeadSlowTest.courses(4);
        }""", [sectors, bonus])
        text = page.locator('.world-progress').inner_text()
        check(f'Meridian chart keeps {sectors}/12 sectors separate from bonus ({bonus})',
              f'{sectors} / 12 SECTORS CLEARED' in text
              and f'{int(bonus)} / 1 BONUS CLEARED' in text
              and page.locator('.level-card').count() == 13)
    page.set_viewport_size({'width': 390, 'height': 844})
    check('Separate sector and bonus counters fit the portrait chart',
          page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    page.set_viewport_size({'width': 1440, 'height': 1000})
    # Do not leave synthetic records behind for the replay/no-ranking checks.
    page.evaluate("""() => {
        for (const l of HarborLevels.filter(l => l.worldNumber === 4))
            DeadSlowTest.state.storage.stages[l.id].runs = [];
        DeadSlowTest.courses(4);
    }""")
    page.click('[data-stage="36"]')
    check('Space briefing teaches thrust and counterfire','rotational jets' in page.locator('#dialog').inner_text())
    page.click('[data-action="begin"]')
    check('Flight helm has correct units and rotation/lateral controls',page.locator('#speed-unit').inner_text()=='m/s' and page.locator('#helm-rudder-label').inner_text()=='ROTATIONAL JETS' and page.locator('#helm-bow-label').inner_text()=='LATERAL JETS')
    page.keyboard.down('d');page.keyboard.down('q');page.evaluate('DeadSlow.step(1)')
    check('Keyboard rotation and translation jets fire together',page.evaluate('DeadSlow.state().run.ship.r>0 && DeadSlow.state().run.space.firingJets.side<0'))
    page.keyboard.up('d');page.keyboard.up('q')
    spin=page.evaluate('DeadSlow.state().run.ship.r');page.evaluate('DeadSlow.step(1)')
    check('Releasing rotational jets leaves angular momentum intact',abs(page.evaluate('DeadSlow.state().run.ship.r')-spin)<1e-10)
    page.evaluate('DeadSlow.watch("family-reunion",0);DeadSlow.step(250)')
    check('Assembly replay transfers active helm to the heavier mothership',page.evaluate('DeadSlow.state().run.space.phase===2 && DeadSlow.state().run.ship.mass>4.6') and 'WAYFARER' in page.locator('#ship-name').inner_text())
    shot('space-assembly.png')
    page.evaluate('DeadSlow.watch("equal-and-opposite",0);DeadSlow.step(70)')
    check('Beam flight panel exposes attraction and repulsion',page.locator('#tow-controls').is_visible() and 'ATTRACT' in page.locator('#line-in-label').inner_text() and 'REPEL' in page.locator('#line-out-label').inner_text())
    check('Rescue replay has applied equal/opposite beam impulses',page.evaluate('DeadSlow.state().run.space.stats.beamTime>0'))
    shot('space-rescue.png')
    page.evaluate('DeadSlow.watch("yesterday",0);DeadSlow.step(600)')
    check('Chronogate replay displays its actual solid history',page.evaluate('DeadSlow.state().run.space.phase===1 && !!DeadSlow.state().run.space.echo && DeadSlow.state().run.space.histories[0].loop.length>100'))
    shot('space-yesterday.png')
    page.evaluate('DeadSlow.watch("moving-argument",0);DeadSlow.step(125)')
    shot('space-gunnery.png')
    page.evaluate('DeadSlow.watch("umbra",0);DeadSlow.step(100)')
    check('Flare computer reports a radiation forecast and heat', 'HEAT' in page.locator('#work-readout').inner_text())
    shot('space-shadow.png')
    page.evaluate('DeadSlow.watch("borrowed-sun",0);DeadSlow.step(385)')
    check('Solar computer reports illuminated hull fraction','SOLAR' in page.locator('#work-readout').inner_text())
    page.evaluate('DeadSlow.level("century-ship");DeadSlow.speed(0)')
    check('Century bonus is directly accessible without starting a marathon',page.evaluate('DeadSlowTest.state.marathon===null && DeadSlowTest.state.level.bonus'))
    check('Deep-space instrumentation labels the bonus', 'CENTURY' in page.locator('#work-order').inner_text())
    page.click('#zoom-btn');page.click('#zoom-btn');shot('space-century-overview.png')
    page.evaluate('DeadSlow.level(4,2);DeadSlow.speed(0)')
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(100)
    check('Portrait space HUD uses metres per second',page.locator('#mobile-speed-unit').inner_text()=='m/s')
    shot('space-mobile.png')
    for w,h in [(320,740),(360,780),(390,844),(844,390),(768,1024)]:
        page.set_viewport_size({'width':w,'height':h})
        check(f'Space helm has no horizontal overflow at {w}×{h}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate('DeadSlow.level("equal-and-opposite");DeadSlow.speed(0)')
    page.click('#line-action')
    page.evaluate("""for(const [id,key] of [[81,'lineout'],[82,'port'],[83,'bowstarboard']]){const b=document.querySelector(`[data-hold=${key}]`);b.setPointerCapture=()=>{};b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,bubbles:true}));}""")
    check('Space beam and both RCS axes accept simultaneous pointer holds',page.evaluate('DeadSlowTest.state.input.winch===1 && DeadSlowTest.state.input.rudder===-1 && DeadSlowTest.state.input.thruster===1'))
    page.evaluate("""for(const [id,key] of [[81,'lineout'],[82,'port'],[83,'bowstarboard']])document.querySelector(`[data-hold=${key}]`).dispatchEvent(new PointerEvent('pointercancel',{pointerId:id,bubbles:true}));""")
    check('Cancelled space touches cannot leave jets or beams firing',page.evaluate('Object.values(DeadSlowTest.state.input).every(v=>v===0)'))
    page.set_viewport_size({'width':1440,'height':1000})
    page.evaluate('DeadSlow.watch("vacuum",32)')
    page.wait_for_function('DeadSlow.report()?.level==="vacuum" && DeadSlow.report().verified',timeout=30000)
    check('Animated space watch finishes at its recorded time without ranking',page.evaluate('DeadSlow.report().verified && !DeadSlow.report().ranked && DeadSlowTest.state.storage.stages.vacuum.runs.length===0'))
    check('Space result shows spacecraft counters rather than wake penalties','propellant used' in page.locator('#dialog').inner_text() and 'wake violations' not in page.locator('#dialog').inner_text())
    page.evaluate('DeadSlow.level(3,4);DeadSlow.speed(0)');page.wait_for_timeout(100)
    check('Returning to the archipelago restores maritime instruments',page.locator('#speed-unit').inner_text()=='kn' and page.locator('#helm-rudder-label').inner_text()=='RUDDER')
    shot('open-archipelago.png')
    check('Space menus, rendering, replays and responsive helm cause no page errors',not errors)
    page.close()
