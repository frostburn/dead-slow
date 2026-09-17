"""Browser checks. Requires Python Playwright + Chromium, not needed to play.
Run: python tests/browser_smoke.py [--inline] [--screenshots DIR]
--inline avoids navigation in restricted test environments. It uses an in-memory
localStorage shim; persistence itself is covered by the Node storage tests.
"""
from pathlib import Path
import argparse, json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--inline', action='store_true')
parser.add_argument('--screenshots', type=Path)
parser.add_argument('--url', help='Test an HTTP-served build instead of file://')
parser.add_argument('--report', type=Path, help='Write a JSON check report')
parser.add_argument('--chromium', help='Chromium executable; defaults to system Chromium, then Playwright bundled Chromium')
args = parser.parse_args()
html = (ROOT / 'dist/index.html').read_text()
checks = []

def check(name, condition):
    if not condition:
        print('FAILED: '+name,flush=True)
        print('Page errors: '+json.dumps(errors),flush=True)
        print('Bridge state: '+json.dumps(page.evaluate('''() => ({status:DeadSlowTest.state.status,level:DeadSlowTest.state.level.id,time:DeadSlowTest.state.run.time,throttle:DeadSlowTest.state.run.ship?.throttle,focus:document.activeElement?.outerHTML,hidden:document.hidden})''')),flush=True)
        failure=ROOT/'reports'/'browser-failure.png'
        failure.parent.mkdir(parents=True,exist_ok=True)
        page.screenshot(path=str(failure))
    assert condition, name
    checks.append(name)

def mount(page):
    if args.inline:
        page.evaluate("Object.defineProperty(window, 'localStorage', {value:{getItem(k){return this[k]||null},setItem(k,v){this[k]=v}}})")
        page.set_content(html.replace("new URLSearchParams(location.search).has('test')", 'true'))
    else:
        page.goto((args.url or (ROOT / 'dist/index.html').as_uri()) + '?test')
    page.wait_for_function('!!window.DeadSlowTest')

def shot(page, name):
    if args.screenshots:
        args.screenshots.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(args.screenshots / name))

with sync_playwright() as p:
    import shutil
    browser = p.chromium.launch(executable_path=args.chromium or shutil.which('chromium'), headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror', lambda e:errors.append(str(e)))
    mount(page)
    check('Initial departure menu is present', page.locator('[data-action="begin"]').is_visible())
    shot(page, 'intro.png')
    page.click('[data-action="begin"]')
    for _ in range(4):page.keyboard.press('w')
    check('Keyboard advances persistent telegraph to full ahead',page.evaluate('DeadSlowTest.state.run.ship.throttle')==4)
    page.evaluate('DeadSlowTest.advance(49.9)')
    for _ in range(7):page.keyboard.press('s')
    page.evaluate('while(DeadSlowTest.state.run.ship.vx>.7 && DeadSlowTest.state.run.time<95)DeadSlowTest.advance(.1)')
    page.keyboard.press('Space')
    page.evaluate('DeadSlowTest.advance(12)')
    actual=page.evaluate('({status:DeadSlowTest.state.status,result:DeadSlowTest.state.run.result,ghost:DeadSlowTest.state.storage.stages["dead-slow"].ghost.length})')
    check('First harbor completed with real thrust/braking, without repositioning',actual['status']=='complete')
    check('First physical arrival is clean and under 80 seconds',actual['result']['clean'] and actual['result']['time']<80)
    check('Personal-best ghost is recorded',actual['ghost']>700)
    shot(page,'result.png')
    page.evaluate('DeadSlowTest.load(0);DeadSlowTest.advance(3);DeadSlowTest.pause()')
    check('Pausing marks a run practice',page.evaluate('DeadSlowTest.state.run.pausedUsed'))
    page.click('[data-action="resume"]')
    page.evaluate('DeadSlowTest.setShip({x:289,y:121,a:0,vx:0,vy:0,r:0,engine:0,throttle:0});DeadSlowTest.advance(3)')
    check('Practice arrival never replaces a saved record',page.evaluate('DeadSlowTest.state.storage.stages["dead-slow"].clears')==1)
    # Exercise each objective state machine independently from navigation.
    for i in range(24):
        out=page.evaluate('''i=>{
          DeadSlowTest.load(i);const l=HarborLevels[i],r=DeadSlowTest.state.run;
          const settle=(x,y,a=0)=>DeadSlowTest.setShip({x,y,a,vx:0,vy:0,r:0,engine:0,throttle:0});
          if(l.buoys.length||l.lock){settle(l.berth.x,l.berth.y,l.berth.a);DeadSlowTest.advance(2.3);if(DeadSlowTest.state.status==='complete')return {error:'Prerequisites were bypassed'};}
          for(const b of l.buoys){settle(b.x,b.y);DeadSlowTest.advance((b.hold||0)+.12);}
          if(l.lock){settle(l.lock.x+l.lock.w/2,l.lock.y+l.lock.h/2);DeadSlowTest.advance(l.lock.hold+.1);if(r.lock.phase!=='cycling')return {error:'Lock failed to cycle'};DeadSlowTest.advance(l.lock.cycle+.1);}
          settle(l.berth.x,l.berth.y,l.berth.a);DeadSlowTest.advance(2.5);
          return {status:DeadSlowTest.state.status,buoys:r.buoyIndex,expected:l.buoys.length,phase:r.lock.phase,loaded:r.loaded};
        }''',i)
        check(f'Harbor {i+1:02}: objective guards and mooring completion',out.get('status')=='complete' and out['buoys']==out['expected'])
        if i==8:check('Loading objective changes the ship mass',out['loaded'])
    page.evaluate('DeadSlowTest.load(3);DeadSlowTest.setShip({x:186,y:121});DeadSlowTest.advance(15)')
    check('Timed boom safely holds open around an occupying hull',page.evaluate('DeadSlowTest.state.run.gateStates.boom.held'))
    page.evaluate('DeadSlowTest.setShip({x:221,y:121});DeadSlowTest.advance(.1)')
    check('Timed boom closes once the safety strip is clear',not page.evaluate('DeadSlowTest.state.run.gateStates.boom.open'))
    page.evaluate('DeadSlowTest.load(9);DeadSlowTest.setShip({x:181,y:121,vx:2});DeadSlowTest.advance(2)')
    check('Low tide grounds and slows the ship',page.evaluate('DeadSlowTest.state.run.grounded && DeadSlowTest.state.run.groundings===1 && Math.abs(DeadSlowTest.state.run.ship.vx)<.1'))
    page.evaluate('DeadSlowTest.load(10);DeadSlowTest.setShip({x:145,y:121,vx:2.5});DeadSlowTest.advance(.8)')
    check('No-wake zone registers sustained excess speed',page.evaluate('DeadSlowTest.state.run.wakes')==1)
    page.evaluate('DeadSlowTest.load(0);DeadSlowTest.setShip({x:320,y:121,vx:4});DeadSlowTest.advance(3)')
    check('Concrete contact damages hull and increments the contact counter',page.evaluate('DeadSlowTest.state.run.contacts>0 && DeadSlowTest.state.run.ship.hull<100'))
    page.evaluate('DeadSlowTest.marathon("coast");DeadSlowTest.advance(3);DeadSlowTest.retry()')
    check('All-harbors retries retain time spent on the failed attempt',page.evaluate('DeadSlowTest.state.marathon.total>=2.99 && DeadSlowTest.state.marathon.retries===1'))
    for i in range(12):
        page.evaluate('''()=>{const t=DeadSlowTest,l=HarborLevels[t.state.index],r=t.state.run;r.buoyIndex=l.buoys.length;r.lock.phase='exit';t.setShip({x:l.berth.x,y:l.berth.y,a:l.berth.a,vx:0,vy:0,r:0,engine:0,throttle:0});t.advance(2.2)}''')
        check(f'All-harbors transition {i+1:02}',page.evaluate('DeadSlowTest.state.status')=='complete')
        if i<11:page.evaluate('DeadSlowTest.next()')
    check('All-harbors final record is saved',page.evaluate('DeadSlowTest.state.storage.races.coast.length')==1)
    page.evaluate('DeadSlowTest.load(12);DeadSlowTest.setShip({a:0,vx:2,vy:0,throttle:-3,engine:-1});DeadSlowTest.hud()')
    check('Ahead speed remains positive with an astern engine order',page.locator('#speed').inner_text().startswith('+') and page.locator('#speed-direction').inner_text()=='AHEAD')
    page.evaluate('DeadSlowTest.setShip({a:0,vx:-2,vy:0,throttle:4,engine:1});DeadSlowTest.hud()')
    check('Actual astern motion has a minus sign despite ahead throttle',page.locator('#speed').inner_text().startswith('−') and page.locator('#speed-direction').inner_text()=='ASTERN')
    page.evaluate('DeadSlowTest.setShip({a:0,vx:0,vy:.7,throttle:0,engine:0});DeadSlowTest.hud()')
    check('Pure sideways drift is identified as abeam',page.locator('#speed-direction').inner_text()=='ABEAM' and 'STBD' in page.locator('#drift').inner_text())
    page.evaluate('DeadSlowTest.load(2);DeadSlowTest.setShip({x:289,y:87});DeadSlowTest.hud()')
    check('Sheltered basin activates the local-water instrument',page.locator('#shelter-status').inner_text()=='IN THE LEE' and page.locator('#local-set').inner_text()=='SET 0.0 kn')
    page.evaluate('DeadSlowTest.load(12)')
    check('World 2 switches the bridge palette',page.locator('body').get_attribute('data-theme')=='night')
    page.click('#courses-btn')
    check('World selector displays all eight atlas worlds',page.locator('[data-world]').count()==8)
    page.click('[data-world="1"]')
    check('World 1 contains twelve cards and sheltered approaches',page.locator('.level-card').count()==12 and page.locator('[data-stage="2"]').count()==1)
    page.click('[data-world="2"]')
    check('World 2 displays its twelve separate cards',page.locator('.level-card').count()==12 and page.locator('[data-stage="12"]').count()==1)
    page.click('[data-world="3"]')
    check('World 3 has twelve island-service cards',page.locator('.level-card').count()==12 and page.locator('[data-stage="35"]').count()==1)
    check('Archipelago menu adopts the summer palette',page.locator('#dialog').get_attribute('data-theme')=='archipelago')
    shot(page,'archipelago-world.png')
    page.click('[data-world="2"]')
    shot(page,'worlds.png')
    page.click('[data-stage="16"]')
    check('World 2 selection opens the appropriate briefing',page.locator('#dialog').inner_text().find('The Sluice')>=0 and page.locator('body').get_attribute('data-theme')=='night')
    page.click('[data-action="begin"]')
    page.evaluate('DeadSlowTest.throttle(2);DeadSlowTest.advance(25)')
    shot(page,'desktop.png')
    # Held keyboard controls release; overlapping port/starboard cancel.
    page.keyboard.down('a');page.evaluate('DeadSlowTest.advance(.1)')
    check('Held port rudder is read',page.evaluate('DeadSlowTest.state.input.rudder')==-1)
    page.keyboard.down('d');check('Opposing rudder keys cancel',page.evaluate('DeadSlowTest.state.input.rudder')==0)
    page.keyboard.up('a');page.keyboard.up('d');check('Releasing controls centers command',page.evaluate('DeadSlowTest.state.input.rudder')==0)
    # Reset and import must not disconnect settings from persistent state.
    page.evaluate('DeadSlowTest.pause()')
    page.click('[data-action="courses"]');page.click('[data-action="log"]');page.click('[data-action="reset"]');page.click('[data-action="confirm-reset"]');page.click('[data-action="toggle-ghost"]')
    check('Settings remain linked to storage after reset',page.evaluate('DeadSlowTest.state.settings.ghost===DeadSlowTest.state.storage.settings.ghost'))
    # Island-service UI and physics; fixed input runs never reposition the ship.
    for filename in ['first-crossing-controls.json','bigger-boat-controls.json']:
        fixture=json.loads((ROOT/'tests/fixtures'/filename).read_text())
        run=page.evaluate("""f=>{const t=DeadSlowTest;t.load(HarborLevels.findIndex(l=>l.id===f.level));let i=0;
          for(let n=0;n<Math.ceil(f.duration*120)&&t.state.status==='running';n++){
            while(i<f.events.length&&f.events[i].time<=n/120+1e-7){const e=f.events[i++];if(e.line)t.lineAction();if(e.throttle!==undefined)t.throttle(e.throttle-t.state.run.ship.throttle);}t.advance(1/120);
          }
          return{status:t.state.status,clean:t.state.run.result?.clean,time:t.state.run.time,work:t.state.run.jobs.stats};
        }""",fixture)
        check(f'{fixture["level"]}: fixed-input browser completion is clean',run['status']=='complete' and run['clean'])
        check(f'{fixture["level"]}: browser agrees with headless completion time',abs(run['time']-fixture['expectedTime'])<1/120)
        check(f'{fixture["level"]}: results report completed island work','delivered' in page.locator('#dialog').inner_text() and 'lines parted' in page.locator('#dialog').inner_text())
    page.evaluate('DeadSlowTest.load(24);DeadSlowTest.advance(4)')
    check('Ferry has visible job instruments and vehicle manifest',page.locator('#work-panel').is_visible() and page.locator('.manifest-vehicle').count()>0)
    check('Loading is incremental while the ramp remains open',page.evaluate('DeadSlowTest.state.run.jobs.ramp===1 && DeadSlowTest.state.run.jobs.onboard.length<4'))
    check('Ferry job does not show irrelevant tow buttons',not page.locator('#tow-controls').is_visible())
    page.keyboard.press('w');page.evaluate('DeadSlowTest.advance(2)')
    check('Ordering propulsion closes an interrupted ramp',page.evaluate('DeadSlowTest.state.run.jobs.ramp===0'))
    page.keyboard.press('Space');page.evaluate('DeadSlowTest.advance(8)')
    check('Resumed transfer does not duplicate committed vehicles',page.evaluate('DeadSlowTest.state.run.jobs.stats.vehiclesLoaded===4'))
    page.evaluate('DeadSlowTest.load(25)')
    check('Tug job shows real line controls',page.locator('#tow-controls').is_visible() and 'MAKE FAST' in page.locator('#line-action').inner_text())
    page.keyboard.press('f');page.evaluate('DeadSlowTest.hud()')
    check('F makes fast and changes the UI to cast off',page.evaluate('!!DeadSlowTest.state.run.jobs.line') and 'CAST OFF' in page.locator('#line-action').inner_text())
    before=page.evaluate('DeadSlowTest.state.run.jobs.line.length')
    page.keyboard.down('j');page.evaluate('DeadSlowTest.advance(.5)')
    check('Held J reels in a physical towline',page.evaluate('DeadSlowTest.state.run.jobs.line.length')<before-.3)
    page.keyboard.down('k');check('Opposite winch commands cancel',page.evaluate('DeadSlowTest.state.input.winch===0'))
    page.keyboard.up('j');page.keyboard.up('k')
    check('Released winch commands cannot stick',page.evaluate('DeadSlowTest.state.input.winch===0'))
    page.keyboard.press('f');check('F casts off without deleting the casualty',page.evaluate('!DeadSlowTest.state.run.jobs.line && DeadSlowTest.state.run.jobs.bodies.length===1 && !DeadSlowTest.state.run.jobs.bodies[0].moored'))
    page.keyboard.press('Shift+r');check('Immediate retry resets work and casualty anchor',page.evaluate('DeadSlowTest.state.run.jobs.stats.lineChanges===0 && DeadSlowTest.state.run.jobs.bodies[0].moored'))
    # These tests isolate objective state machines by positioning each hull explicitly.
    for i in range(24,36):
        out=page.evaluate("""i=>{const t=DeadSlowTest;t.load(i);const l=t.state.level,r=t.state.run;
          const park=(s,b)=>Object.assign(s,{x:b.x,y:b.y,a:b.a,vx:0,vy:0,r:0,engine:0,throttle:0});
          r.buoyIndex=l.buoys.length;park(r.ship,l.berth);t.advance(2.3);if(t.state.status==='complete')return{error:'Job prerequisites bypassed'};
          for(const j of l.jobs){if(j.type==='tow'){const b=HarborJobs.target(r.jobs,j.target);b.wasTowed=true;b.moored=false;park(b,j);t.advance(2.3);}else{park(r.ship,j);t.advance(11);}}
          park(r.ship,l.berth);t.advance(2.3);return{status:t.state.status,jobs:r.jobs.index,expected:l.jobs.length,aboard:r.jobs.onboard.length};
        }""",i)
        check(f'Island stage {i-23:02}: service guards and final completion',out.get('status')=='complete' and out['jobs']==out['expected'] and out['aboard']==0)
    page.evaluate('DeadSlowTest.marathon("archipelago");DeadSlowTest.advance(3);DeadSlowTest.retry()')
    check('World 3 circuit starts at its own first island and retains retry time',page.evaluate('DeadSlowTest.state.index===24 && DeadSlowTest.state.marathon.total>=2.99 && DeadSlowTest.state.marathon.route.length===12'))
    page.evaluate('DeadSlowTest.marathon("grand-tour")')
    check('Grand Tour uses the complete 72-stage route',page.evaluate('DeadSlowTest.state.marathon.route.length===72'))
    page.evaluate('DeadSlowTest.load(27);DeadSlowTest.lineAction()')
    shot(page,'sauna-desktop.png')
    page.evaluate('DeadSlowTest.load(24);DeadSlowTest.advance(8);DeadSlowTest.throttle(2);DeadSlowTest.advance(30)')
    shot(page,'ferry-desktop.png')
    check('No desktop JavaScript errors',not errors)
    context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
    mobile=context.new_page();mobile_errors=[];mobile.on('pageerror',lambda e:mobile_errors.append(str(e)))
    mount(mobile);mobile.tap('[data-action="begin"]');mobile.tap('#throttle-up')
    check('Touch telegraph changes throttle',mobile.evaluate('DeadSlowTest.state.run.ship.throttle')==1)
    mobile.evaluate('''()=>{for(const [id,key] of [[1,'port'],[2,'bowport']]){const b=document.querySelector(`[data-hold=${key}]`);b.setPointerCapture=()=>{};b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,bubbles:true}));}}''')
    check('Simultaneous touch rudder and thruster',mobile.evaluate('DeadSlowTest.state.input.rudder===-1 && DeadSlowTest.state.input.thruster===-1'))
    mobile.evaluate('''()=>{for(const [id,key] of [[1,'port'],[2,'bowport']])document.querySelector(`[data-hold=${key}]`).dispatchEvent(new PointerEvent('pointercancel',{pointerId:id,bubbles:true}));}''')
    check('Cancelled touches cannot leave controls stuck',mobile.evaluate('DeadSlowTest.state.input.rudder===0 && DeadSlowTest.state.input.thruster===0'))
    check('Portrait layout does not overflow horizontally',mobile.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    mobile.evaluate('DeadSlowTest.load(19);DeadSlowTest.setShip({vx:1.5});DeadSlowTest.hud()');shot(mobile,'mobile-portrait.png')
    check('Touch HUD shows actual astern direction and signed speed',mobile.locator('#mobile-speed').inner_text().startswith('−') and mobile.locator('#mobile-direction').inner_text()=='AST')
    mobile.tap('#zoom-btn');check('Chart zoom is touch accessible',mobile.locator('#zoom-btn').inner_text()=='1.7×')
    shot(mobile,'mobile-zoom.png')
    mobile.set_viewport_size({'width':844,'height':390});mobile.evaluate('DeadSlowTest.load(6)');shot(mobile,'mobile-landscape.png')
    check('Landscape layout does not overflow',mobile.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    for width,height in [(320,740),(360,780),(768,1024),(1024,768)]:
        mobile.set_viewport_size({'width':width,'height':height})
        check(f'World 2 layout fits {width}×{height}',mobile.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    mobile.set_viewport_size({'width':390,'height':844});mobile.evaluate('DeadSlowTest.load(25)')
    mobile.tap('#line-action');mobile.evaluate('DeadSlowTest.hud()')
    check('Touch can attach a towline',mobile.evaluate('!!DeadSlowTest.state.run.jobs.line'))
    mobile.evaluate("""()=>{for(const [id,key] of [[11,'lineout'],[12,'port'],[13,'bowstarboard']]){const b=document.querySelector(`[data-hold=${key}]`);b.setPointerCapture=()=>{};b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,bubbles:true}));}}""")
    check('Three simultaneous touches control winch, rudder and thruster',mobile.evaluate('DeadSlowTest.state.input.winch===1 && DeadSlowTest.state.input.rudder===-1 && DeadSlowTest.state.input.thruster===1'))
    mobile.evaluate("""()=>{for(const [id,key] of [[11,'lineout'],[12,'port'],[13,'bowstarboard']])document.querySelector(`[data-hold=${key}]`).dispatchEvent(new PointerEvent('pointercancel',{pointerId:id,bubbles:true}));}""")
    check('All three cancelled touch commands release',mobile.evaluate('Object.values(DeadSlowTest.state.input).every(v=>v===0)'))
    check('Tow buttons fit inside the mobile chart',mobile.locator('#line-action').is_visible() and mobile.evaluate("document.querySelector('#tow-controls').getBoundingClientRect().right<=innerWidth"))
    shot(mobile,'tow-mobile.png')
    for width,height in [(320,740),(360,780),(390,844),(844,390),(768,1024),(1024,768)]:
        mobile.set_viewport_size({'width':width,'height':height})
        check(f'World 3 layout fits {width}×{height}',mobile.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    mobile.set_viewport_size({'width':390,'height':844});mobile.evaluate('DeadSlowTest.load(24);DeadSlowTest.advance(4)')
    check('Mobile ferry shows its manifest and ramp progress',mobile.locator('#work-panel').is_visible() and mobile.locator('.manifest-vehicle').count()>0)
    shot(mobile,'ferry-mobile.png')
    mobile.tap('#courses-btn');mobile.tap('[data-world="3"]')
    check('All twelve archipelago cards remain selectable on a phone',mobile.locator('.level-card').count()==12)
    check('Mobile world menu has no horizontal overflow',mobile.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    # Render every stage; simulation tests alone cannot detect canvas exceptions.
    for i in range(page.evaluate('HarborLevels.length')):
        page.evaluate('i=>DeadSlowTest.load(i)',i);page.wait_for_timeout(35)
    check('All stage charts render without an exception',not errors)
    check('Production build is self-contained', '<script src=' not in html and '<link rel="stylesheet"' not in html)
    production=browser.new_page();production_errors=[];requests=[]
    production.on('pageerror',lambda e:production_errors.append(str(e)))
    production.on('request',lambda r:requests.append(r.url))
    production.evaluate("Object.defineProperty(window,'localStorage',{value:{getItem(){return null},setItem(){}}})")
    production.set_content(html);production.wait_for_timeout(150)
    check('Normal launch does not expose the test harness',production.evaluate('typeof DeadSlowTest === "undefined"'))
    check('Production launch makes no network requests',not requests)
    check('Production launch has no JavaScript errors',not production_errors)
    production.close()
    check('No mobile JavaScript errors',not mobile_errors)
    from browser_open_water import check_open_water
    check_open_water(browser, check, html)
    from browser_space import check_space
    check_space(browser, check, html, args.screenshots)
    from browser_mission_design import check_mission_design
    check_mission_design(browser, check, html, args.screenshots)
    from browser_flight_presentation import check_flight_presentation
    check_flight_presentation(browser, check, html, args.screenshots)
    from browser_keyboard_hints import check_keyboard_hints
    check_keyboard_hints(browser, check, html)
    report={'passed':len(checks),'checks':checks,'first_harbor_time':actual['result']['time'],'errors':errors+mobile_errors}
    if args.report:
        args.report.parent.mkdir(parents=True,exist_ok=True)
        args.report.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
    browser.close()
