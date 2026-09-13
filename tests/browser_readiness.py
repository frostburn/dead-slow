"""Focused manual-tour controls and two changed approaches; no unrelated playback."""
from pathlib import Path
import json, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'reports/readiness';OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name,ok):
    assert ok,name
    checks.append(name)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.evaluate("Object.defineProperty(window,'localStorage',{value:{getItem(k){return this[k]||null},setItem(k,v){this[k]=v}}})")
    page.set_content((ROOT/'dist/index.html').read_text().replace("new URLSearchParams(location.search).has('test')",'true'))
    page.wait_for_function('!!window.DeadSlowTest')
    check('Normal play does not show practice controls',not page.locator('#review-controls').is_visible())
    page.evaluate('DeadSlow.tour(8)')
    check('Tour begins with sixty stages, no ranked departure and visible speed control',page.evaluate('DeadSlow.progress().circuit.length===60 && DeadSlowTest.state.storage.attempts===0') and page.locator('#review-controls').is_visible())
    page.select_option('#review-rate','2');check('On-screen rate changes without a menu',page.evaluate('DeadSlow.speed()===2 && DeadSlowTest.state.status==="running"'))
    page.keyboard.press('BracketRight');check('Faster key selects 4x',page.evaluate('DeadSlow.speed()===4'))
    page.keyboard.press('BracketLeft');check('Slower key returns to 2x',page.evaluate('DeadSlow.speed()===2'))
    page.keyboard.press('Backslash');time=page.evaluate('DeadSlow.progress().time');page.wait_for_timeout(120)
    check('Freeze hotkey stops simulation without opening pause',page.evaluate(f'DeadSlow.progress().time==={time} && DeadSlowTest.state.status==="running" && DeadSlow.speed()===0'))
    page.click('#review-freeze');check('Resume restores pre-freeze rate',page.evaluate('DeadSlow.speed()===2'))
    page.evaluate('DeadSlow.speed(2);DeadSlow.speed(0)')
    page.click('#review-freeze');check('Resume button restores console-selected rate',page.evaluate('DeadSlow.speed()===2'))
    page.evaluate('DeadSlow.speed(4);DeadSlow.speed(0)')
    page.keyboard.press('Backslash');check('Freeze hotkey restores console-selected rate',page.evaluate('DeadSlow.speed()===4'))
    page.evaluate('DeadSlow.speed(.5)');check('Fractional console rates remain accurately visible',page.locator('#review-rate').input_value()=='.5' or page.locator('#review-rate').input_value()=='0.5')
    page.evaluate('DeadSlow.speed(1);DeadSlowTest.finish();DeadSlowTest.next()')
    check('Next remains practice even at 1x',page.evaluate('DeadSlow.progress().practice && DeadSlow.progress().circuit.practice && DeadSlow.progress().circuit.position===2'))
    # Visit world boundaries via state-machine completion, not a navigation claim.
    for completed in [12,24,36,48,59]:
        page.evaluate('''n=>{while(DeadSlow.progress().circuit.completed<n){DeadSlowTest.finish();DeadSlowTest.next();}}''',completed)
        check(f'Circuit reaches completed stage {completed} without stale-mode errors',page.evaluate(f'DeadSlow.progress().circuit.completed==={completed} && DeadSlow.progress().practice'))
    page.evaluate('DeadSlowTest.finish()')
    check('Grand Tour ends with both hamsters and no extra bonus stage', 'Five worlds.' in page.locator('#dialog').inner_text() and page.evaluate('DeadSlow.progress().circuit.completed===60 && DeadSlowTest.state.storage.races["grand-tour"].length===0'))
    page.evaluate('DeadSlow.normal()');check('Normal command starts fresh ranked individual play',not page.locator('#review-controls').is_visible() and page.evaluate('!DeadSlow.progress().practice && DeadSlow.progress().circuit===null'))
    for id in ['backwater','island-exchange']:
        page.evaluate('(id)=>{DeadSlow.level(id);DeadSlow.speed(0)}',id)
        page.wait_for_timeout(100)
        check(id+' has updated approach instructions', ('dogleg' in page.locator('#brief').inner_text().lower() or 'stern north' in page.locator('#brief').inner_text().lower()) if id=='backwater' else 'turn north' in page.locator('#brief').inner_text())
        page.screenshot(path=str(OUT/(id+'.png')))
        page.evaluate('(id)=>DeadSlow.verify(id)',id)
        check(id+' completes its actual production watch with no ranking',page.evaluate('DeadSlow.report().verified && DeadSlow.report().clean && !DeadSlow.report().ranked'))
    # Exercise layout, actual controls, and course changes at phone dimensions.
    page.set_viewport_size({'width':390,'height':844})
    for world in [1,3,4,6]:
        page.evaluate('w=>DeadSlow.circuit(w,0)',world)
        check(f'World {world} portrait has accessible practice controls and no overflow',page.locator('#review-controls').is_visible() and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    check('Portrait practice panel does not cover the motion instruments',page.evaluate('''() => {
        const a=document.querySelector('#review-controls').getBoundingClientRect(), b=document.querySelector('.mobile-instruments').getBoundingClientRect();
        return a.bottom<=b.top || a.top>=b.bottom || a.right<=b.left || a.left>=b.right;
    }'''))
    page.screenshot(path=str(OUT/'tour-mobile.png'))
    page.evaluate('DeadSlow.circuit(3,0);DeadSlowTest.load(HarborLevels.findIndex(l=>l.id==="island-exchange"));DeadSlow.speed(0)')
    page.set_viewport_size({'width':1440,'height':1000})
    page.evaluate('DeadSlow.watch("island-exchange",0);DeadSlow.step(400)')
    page.wait_for_timeout(100);page.screenshot(path=str(OUT/'perpendicular-ramp.png'))
    check('No page errors in tour transitions or changed approaches',not errors)
    browser.close()
(OUT/'checks.json').write_text(json.dumps({'count':len(checks),'checks':checks,'errors':errors},indent=2))
print(f'{len(checks)} focused Chromium checks passed; {len(errors)} page errors')
