"""Flight terminology, the real H/click radar path and context-sensitive instruments."""
def check_flight_presentation(browser, check, html, screenshots=None):
    import re
    from pathlib import Path
    page = browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
    page.evaluate("Object.defineProperty(window,'localStorage',{value:{getItem(k){return this[k]||null},setItem(k,v){this[k]=v}}})")
    mounted = html.replace("new URLSearchParams(location.search).has('test')",'true')
    # Expose only the real audio instance in this test mount, not in the release.
    mounted = mounted.replace('const audio = HarborAudio.create(),', 'const audio = (window.__audioUnderTest = HarborAudio.create()),')
    page.set_content(mounted); page.wait_for_function('!!window.DeadSlowTest')
    marine = re.compile(r'\bharbou?rs?\b|\bberth\b|\bmoor(?:ed|ing)?\b|\bneutral\b|lines ashore|cast off|\bRUDDER\b|\b(?:astern|starboard)\b|bow thrust|SOUND HORN|all fast', re.I)
    def flight_text(label, selector='#dialog'):
        text=page.locator(selector).inner_text()
        check(label, not marine.search(text))
    def shot(name):
        if screenshots:
            Path(screenshots).mkdir(parents=True,exist_ok=True)
            page.screenshot(path=str(Path(screenshots)/name))
    for i in range(36,49):
        page.evaluate('i=>DeadSlowTest.load(i,false)',i)
        flight_text(f'Flight {i-35} briefing contains no marine defaults')
    page.evaluate('DeadSlow.level("vacuum");DeadSlow.speed(0)')
    flight_text('Live spacecraft controls and HUD contain no marine defaults', 'body')
    check('Document title, capture checklist and accessible chart match space',
          'Black Meridian' in page.title() and page.locator('#check-inside').inner_text()=='Inside cradle'
          and page.locator('#chart-section').get_attribute('aria-label')=='Navigation sector and spacecraft')
    page.evaluate('''() => {
        window.__signals={radar:0,horn:0};
        for(const kind of ['radar','horn']) { const original=__audioUnderTest[kind].bind(__audioUnderTest);
            __audioUnderTest[kind]=()=>{__signals[kind]++;return original();}; }
        window.__before=JSON.stringify({ship:DeadSlowTest.state.run.ship,space:DeadSlowTest.state.run.space,time:DeadSlowTest.state.run.time,storage:DeadSlowTest.state.storage});
    }''')
    page.keyboard.press('h')
    check('H invokes electronic radar rather than the marine horn', page.evaluate('__signals.radar===1 && __signals.horn===0 && !!DeadSlowTest.state.run.radarPulse'))
    check('Radar leaves ship, fuel, objectives, simulation clock and records unchanged',page.evaluate('window.__before===JSON.stringify({ship:DeadSlowTest.state.run.ship,space:DeadSlowTest.state.run.space,time:DeadSlowTest.state.run.time,storage:DeadSlowTest.state.storage})'))
    page.wait_for_timeout(190);shot('flight-radar-desktop.png')
    page.keyboard.press('h');page.click('#radar-btn')
    check('Repeated H/button requests share one pulse cooldown',page.evaluate('__signals.radar===1'))
    page.wait_for_timeout(1120);page.keyboard.press('m');page.click('#radar-btn')
    check('Muted flight still sends a visual radar pulse',page.evaluate('__signals.radar===2 && !__audioUnderTest.enabled && !!DeadSlowTest.state.run.radarPulse'))
    page.keyboard.press('Escape');flight_text('Pause dialog uses flight-only terminology')
    old=page.evaluate('DeadSlowTest.state.run.radarPulse.at');page.keyboard.press('h')
    check('Radar cannot be sounded through a paused flight dialog',page.evaluate('DeadSlowTest.state.run.radarPulse.at')==old)
    page.evaluate('DeadSlow.level("vacuum");DeadSlow.speed(0);window.dispatchEvent(new Event("blur"))')
    flight_text('Losing focus uses a flight-deck pause')
    check('Unattended screen names the flight deck, not the bridge','The flight deck is unattended.' in page.locator('#dialog').inner_text())
    shot('flight-unattended.png')
    page.evaluate('''() => {
        DeadSlow.level('vacuum');DeadSlow.speed(0);
        Object.defineProperty(document,'hidden',{value:true,configurable:true});
        document.dispatchEvent(new Event('visibilitychange'));delete document.hidden;
    }''')
    check('Hidden-tab pause also uses the flight deck','The flight deck is unattended.' in page.locator('#dialog').inner_text())
    for button,label in [('#log-btn','Flight logbook'),('#help-btn','Flight manual')]:
        page.evaluate('DeadSlow.level("vacuum");DeadSlow.speed(0)')
        page.click(button);flight_text(label+' has no marine defaults')
    page.evaluate("DeadSlowTest.load(HarborLevels.findIndex(l=>l.id==='vacuum'));DeadSlow.normal();DeadSlowTest.state.run.time=100;DeadSlowTest.finish()")
    flight_text('Personal-best capture screen has no marine defaults');shot('flight-capture.png')
    check('Capture result advances to a sector','Next sector' in page.locator('#dialog').inner_text())
    page.evaluate("DeadSlowTest.load(HarborLevels.findIndex(l=>l.id==='vacuum'));DeadSlow.normal();DeadSlowTest.state.run.time=10000;DeadSlowTest.finish()")
    flight_text('Slow, non-PB capture screen has no marine defaults')
    check('Unmedalled flight is capture secured, not moored','CAPTURE SECURED' in page.locator('#dialog').inner_text())
    page.evaluate('DeadSlow.level("vacuum");DeadSlow.speed(0);DeadSlowTest.state.run.time=200;DeadSlowTest.finish()')
    flight_text('Assisted capture screen has no marine defaults')
    # Synthetic finish above is UI isolation, not a claimed verified flight.
    page.evaluate('DeadSlow.level("vacuum");DeadSlow.speed(0);DeadSlowTest.setShip({vx:-1,vy:1});DeadSlowTest.hud()')
    check('Space motion reads reverse and sideways rather than astern and starboard',page.locator('#speed-direction').inner_text()=='REVERSE' and 'RIGHT' in page.locator('#drift').inner_text())
    page.keyboard.press('s')
    check('Throttle input immediately uses flight terminology before the next HUD refresh',page.locator('#telegraph-name').inner_text()=='RETRO BURN' and 'TELEGRAPH' not in page.locator('#telegraph-detail').inner_text())
    page.set_viewport_size({'width':390,'height':844});page.evaluate('DeadSlow.level("wandering-stone");DeadSlow.speed(0)')
    check('Touch-sized space chart exposes a dedicated radar button',page.locator('#radar-btn').is_visible())
    page.click('#radar-btn');page.wait_for_timeout(180);shot('flight-radar-mobile.png')
    check('Touch radar creates a pulse without a keyboard',page.evaluate('!!DeadSlowTest.state.run.radarPulse'))
    for w,h in [(320,740),(390,844),(844,390),(1440,1000)]:
        page.set_viewport_size({'width':w,'height':h})
        check(f'Flight labels and radar fit {w}×{h}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.evaluate('DeadSlow.level(3,4);DeadSlow.speed(0)')
    check('Returning to sea restores all maritime controls and title',page.locator('#horn-btn').inner_text().startswith('SOUND HORN')
        and page.locator('#heading-label').inner_text()=='BOW HEADING' and page.locator('#neutral-btn').inner_text()=='NEUTRAL'
        and 'Harbor Trials' in page.title() and not page.locator('#radar-btn').is_visible())
    page.keyboard.press('h');check('At sea H still uses the horn',page.evaluate('__signals.horn===1'))
    page.evaluate('DeadSlow.level("vacuum");DeadSlow.speed(0)')
    check('Returning to space clears the last scan and restores radar labels',page.evaluate('DeadSlowTest.state.run.radarPulse===null') and page.locator('#horn-btn').inner_text().startswith('RADAR PULSE'))
    from browser_flight_audio import check_flight_audio
    audio = check_flight_audio(page,check)
    print('Flight audio measurements:',__import__('json').dumps(audio))
    check('Flight presentation and audio checks raise no page errors',not errors)
    page.close()
