"""Focused World 5 checks only. python tests/browser_rampage.py [--screenshots DIR]"""
from pathlib import Path
import argparse,json,shutil
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser();p.add_argument('--screenshots',type=Path);args=p.parse_args()
ROOT=Path(__file__).resolve().parents[1]
checks=[]
def check(name,ok):
    assert ok,name
    checks.append(name)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.evaluate("Object.defineProperty(window,'localStorage',{value:{getItem(k){return this[k]||null},setItem(k,v){this[k]=v}}})")
    html=(ROOT/'dist/index.html').read_text().replace("new URLSearchParams(location.search).has('test')",'true')
    page.set_content(html);page.wait_for_function('!!window.DeadSlowTest')
    def shot(name):
        if args.screenshots:
            args.screenshots.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(args.screenshots/name))
    page.evaluate('DeadSlowTest.courses(5)')
    check('World 5 selector has nine real courses, not twelve placeholders',page.locator('.level-card').count()==9 and '0 / 9 COURSES COMPLETE' in page.locator('#dialog').inner_text())
    check('Grand Tour remains 48 stages','all 48' in page.locator('#dialog').inner_text())
    page.locator('.level-card').first.click();check('Ball introduction explains map controls and shields','W A S D' in page.locator('#dialog').inner_text() and 'shield' in page.locator('#dialog').inner_text())
    check('Seedhaven introduction counts controls and districts as objectives','04\nMISSION OBJECTIVES' in page.locator('#dialog').inner_text())
    shot('gerbo-intro.png');page.click('[data-action="begin"]');page.evaluate('DeadSlow.speed(0)')
    check('Rolling UI is visible with a separate directional pad',page.locator('.rampage-helm').is_visible() and not page.locator('#throttle-up').is_visible())
    page.keyboard.down('d');page.keyboard.down('w');page.evaluate('DeadSlow.step(1)')
    check('W/D simultaneously push east and north',page.evaluate('DeadSlowTest.state.run.ship.vx>0 && DeadSlowTest.state.run.ship.vy<0'))
    page.keyboard.up('d');page.keyboard.up('w');page.evaluate('DeadSlow.step(.2)')
    check('Released keys clear effort but retain momentum',page.evaluate('DeadSlowTest.state.run.rampage.effort===0 && Math.hypot(DeadSlowTest.state.run.ship.vx,DeadSlowTest.state.run.ship.vy)>1'))
    page.click('#gerbo-shield');check('Touch shield button activates a finite shield',page.evaluate('DeadSlowTest.state.run.rampage.shieldUntil>DeadSlowTest.state.run.time'))
    page.evaluate('DeadSlow.step(3.1)');check('Shield expires instead of becoming permanent',page.evaluate('!GerboRampage.protectedAt(DeadSlowTest.state.run)'))
    page.evaluate('DeadSlow.watch("gerbo-first-outing",0);DeadSlow.step(48)');page.wait_for_timeout(120);shot('gerbo-course.png')
    page.evaluate('DeadSlow.step(60)')
    check('Production watch completes the same clean reference',page.evaluate('DeadSlow.report().verified && DeadSlow.report().clean && DeadSlow.report().rampage.shields===2'))
    check('Replay does not create ranked records',page.evaluate('DeadSlowTest.state.storage.stages["gerbo-first-outing"].runs.length===0'))
    check('Completion screen uses rampage language','Two districts.' in page.locator('#dialog').inner_text() and 'harbor' not in page.locator('#dialog').inner_text().lower())
    shot('gerbo-result.png')
    page.evaluate('DeadSlow.level(5,1);DeadSlow.speed(0);DeadSlowTest.pause()')
    check('Unattended/pause theme is a hamster snack break','snack break' in page.locator('#dialog').inner_text())
    page.click('[data-action="resume"]')
    for w,h in [(390,844),(320,740),(844,390)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(80)
        check(f'Ball UI fits {w}x{h}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        if w==390:shot('gerbo-mobile.png')
    page.set_viewport_size({'width':390,'height':844})
    page.evaluate("""for(const [id,key] of [[81,'rollnorth'],[82,'rolleast']]){const b=document.querySelector(`[data-hold=${key}]`);b.setPointerCapture=()=>{};b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,bubbles:true}));}""")
    check('Multitouch supports simultaneous directional pushes',page.evaluate('DeadSlowTest.state.input.rudder===1 && DeadSlowTest.state.input.thruster===-1'))
    page.evaluate("""for(const [id,key] of [[81,'rollnorth'],[82,'rolleast']])document.querySelector(`[data-hold=${key}]`).dispatchEvent(new PointerEvent('pointercancel',{pointerId:id,bubbles:true}));""")
    check('Touch cancellation releases all pushes',page.evaluate('DeadSlowTest.state.input.rudder===0 && DeadSlowTest.state.input.thruster===0'))
    from browser_gerbo_audio import check_gerbo_audio
    audio=check_gerbo_audio(page,check)
    # Start from an actual tow assignment; updateWorkHud hides #manifest there.
    page.set_viewport_size({'width':1440,'height':1000})
    page.evaluate('DeadSlow.level("floating-sauna");DeadSlow.speed(0);DeadSlowTest.hud()')
    check('Regression setup really hides the tow manifest',page.locator('#manifest').evaluate('(e)=>e.hidden'))
    page.evaluate('DeadSlow.level(5,1);DeadSlow.speed(0);DeadSlowTest.hud()')
    check('Switching from tow duty restores visible rolling and shield counters',page.locator('#manifest').is_visible() and 'ROLLED' in page.locator('#manifest').inner_text() and 'HITS BLOCKED' in page.locator('#manifest').inner_text())
    for id,number in [('gerbo-banking',2),('gerbo-lake-skipping',3),('gerbo-downhill',4),('gerbo-forest-slalom',5),('gerbo-fort-pillow',6),
                      ('gerbo-cavy-clash',7),('gerbo-pepperbreath',8),('gerbo-whiskerdoom',9)]:
        seconds=json.loads((ROOT/'tests/fixtures'/f'{id}-controls.json').read_text())['duration']
        page.evaluate('(id)=>{DeadSlow.watch(id,0);DeadSlow.step(40)}',id)
        page.wait_for_timeout(100);shot(f'gerbo-course-{number}.png')
        page.evaluate('(seconds)=>DeadSlow.step(seconds)',seconds-40)
        check(f'Course {number} completes its own clean production replay',page.evaluate('DeadSlow.report().verified && DeadSlow.report().clean'))
        check(f'Course {number} has no leaderboard pollution',page.evaluate('(id)=>DeadSlowTest.state.storage.stages[id].runs.length===0',id))
        if id=='gerbo-pepperbreath':
            check('Pepperbreath result counts its control and three districts','4 / 4' in page.locator('#dialog').inner_text())
    check('Ninth course has no nonexistent tenth-stage button',not page.locator('[data-action=next]').count())
    check('Ninth course result counts locks, sentry, and rescue','4 / 4' in page.locator('#dialog').inner_text())
    page.evaluate('DeadSlow.watch("gerbo-first-outing",0);DeadSlow.step(20)')
    page.click('#zoom-btn');page.wait_for_timeout(100);shot('gerbo-hind-paws.png')
    phase=page.evaluate('DeadSlowTest.state.run.rampage.pawPhase')
    page.evaluate('DeadSlow.step(.7)');page.wait_for_timeout(50)
    check('Rendered running paws use a changing physical gait phase',page.evaluate('DeadSlowTest.state.run.rampage.pawPhase')>phase)
    page.evaluate('DeadSlow.watch("gerbo-lake-skipping",0);DeadSlow.step(25)')
    page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(100);shot('gerbo-lakes-mobile.png')
    page.set_viewport_size({'width':1440,'height':1000})
    page.evaluate('DeadSlow.watch("gerbo-lake-skipping",0);DeadSlow.step(36)')
    page.wait_for_timeout(100);shot('retaliation-warning.png')
    check('A demolished city actually starts the long-range warning display',
          page.evaluate('DeadSlowTest.state.run.rampage.stats.salvos>0 && DeadSlowTest.state.run.rampage.strikes.some(s=>s.x!==null)')
          and 'RETALIATION' in page.locator('#work-readout').inner_text())
    for id in ['gerbo-downhill','gerbo-forest-slalom','gerbo-fort-pillow']:
        page.evaluate('(id)=>{DeadSlow.level(id);DeadSlow.speed(0)}',id)
        page.wait_for_timeout(80);shot(id+'.png')
    # The integration touches mode switching, not any earlier mission layouts.
    page.evaluate('DeadSlow.level(4,1);DeadSlow.speed(0)')
    check('Returning to space restores the flight helm',not page.locator('.rampage-helm').is_visible() and page.locator('#helm-rudder-label').inner_text()=='ROTATIONAL JETS')
    page.evaluate('DeadSlow.level(1,1);DeadSlow.speed(0)')
    check('Returning to sea restores the marine helm',page.locator('#helm-rudder-label').inner_text()=='RUDDER' and page.locator('#speed-unit').inner_text()=='kn')
    check('No browser errors',not errors)
    report={'checks':len(checks),'passed':checks,'errors':errors,'audio':audio}
    (ROOT/'reports').mkdir(exist_ok=True);(ROOT/'reports/rampage-browser.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2));browser.close()
