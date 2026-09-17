"""Focused Needlesworth/escort UI and playback checks, not a full-world sweep."""
from pathlib import Path
import json
import shutil
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / 'screenshots/finale'
SHOTS.mkdir(parents=True, exist_ok=True)
checks = []
def check(name, condition):
    assert condition, name
    checks.append(name)
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440,'height':1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.evaluate("Object.defineProperty(window,'localStorage',{value:{getItem(k){return this[k]||null},setItem(k,v){this[k]=v}}})")
    html = (ROOT/'dist/index.html').read_text().replace("new URLSearchParams(location.search).has('test')", 'true')
    page.set_content(html)
    page.wait_for_function('!!window.DeadSlowTest')
    def shot(name):
        page.wait_for_timeout(90)
        page.screenshot(path=str(SHOTS/(name+'.png')))
    page.evaluate('DeadSlowTest.courses(4)')
    check('All twelve World 4 courses are selectable', page.locator('.level-card').count()==12)
    check('Course count and existing Grand Tour remain honest', '0 / 12 COURSES COMPLETE' in page.locator('#dialog').inner_text() and 'all 84' in page.locator('#dialog').inner_text())
    shot('world-five')
    for number in [10,11,12]:
        page.locator(f'[data-stage="{48+number}"]').click()
        text = page.locator('#dialog').inner_text()
        check(f'Course {number} counts three real objectives, not unkillable enemies', '03\nMISSION OBJECTIVES' in text and 'SHIELD DURATION' in text)
        check(f'Course {number} explains its actual hazard or escort', ('Nothing can damage him' in text if number==10 else 'pursuit' in text if number==11 else 'already free' in text))
        page.evaluate('DeadSlowTest.courses(4)')
    snapshots = {'gerbo-prickly-business':55,'gerbo-rolling-threat':32,'gerbo-long-way-home':148}
    for id, stop in snapshots.items():
        fixture = json.loads((ROOT/'tests/fixtures'/f'{id}-controls.json').read_text())
        page.evaluate('([id,t])=>{DeadSlow.watch(id,0);DeadSlow.step(t)}',[id,stop])
        shot(id+'-map')
        page.click('#zoom-btn');shot(id+'-close')
        check(id+' renders a living invulnerable hedgehog', page.evaluate('DeadSlowTest.state.run.rampage.monsters[0].health===100 && DeadSlowTest.state.run.rampage.monsters[0].invulnerable'))
        if id=='gerbo-long-way-home':
            check('Finale has no hidden cage or outstanding lock objectives',page.evaluate('DeadSlowTest.state.run.rampage.unlocked && DeadSlowTest.state.run.rampage.lady.following && !DeadSlowTest.state.run.rampage.districts.length'))
        page.evaluate('(dt)=>DeadSlow.step(dt)', fixture['duration']-stop)
        report = page.evaluate('DeadSlow.report()')
        check(id+' verifies cleanly at its recorded time',report['verified'] and report['clean'])
        check(id+' cannot overwrite ranked records',page.evaluate('(id)=>DeadSlowTest.state.storage.stages[id].runs.length===0',id))
        text = page.locator('#dialog').inner_text()
        check(id+' result counts actual objectives', '3 / 3' in text)
        if id=='gerbo-long-way-home':
            check('Finale ends with both shells intact and no extra extraction timer',page.evaluate('DeadSlowTest.state.run.ship.hull===100 && DeadSlowTest.state.run.rampage.lady.health===100 && DeadSlowTest.state.run.rampage.rescued'))
            check('Final result offers no nonexistent thirteenth course',page.locator('[data-action=next]').count()==0)
            shot('both-home')
    page.evaluate('DeadSlow.level("gerbo-long-way-home");DeadSlow.speed(0)')
    for w,h in [(390,844),(320,740),(844,390)]:
        page.set_viewport_size({'width':w,'height':h})
        page.wait_for_timeout(90)
        check(f'Escort controls fit {w}x{h}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        check(f'Shield is reachable at {w}x{h}',page.locator('#gerbo-shield').evaluate('(e)=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}'))
        if w==390:shot('escort-mobile')
    check('No page errors in new levels, menus, or replays',not errors)
    browser.close()
(ROOT/'reports').mkdir(exist_ok=True)
(ROOT/'reports/finale-browser.json').write_text(json.dumps({'checks':checks,'count':len(checks),'errors':errors},indent=2)+'\n')
print(f'{len(checks)} focused browser checks passed; {len(errors)} page errors.')
