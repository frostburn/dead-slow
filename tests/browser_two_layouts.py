"""Focused layout/replay/logbook checks; does not run unrelated worlds or audio."""
from pathlib import Path
import json
import shutil
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'reports' / 'two-layouts'
OUT.mkdir(parents=True, exist_ok=True)
checks = []
def check(name, passed):
    assert passed, name
    checks.append(name)
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=shutil.which('chromium'), args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.evaluate("Object.defineProperty(window,'localStorage',{value:{getItem(k){return this[k]||null},setItem(k,v){this[k]=v}}})")
    html = (ROOT / 'dist/index.html').read_text().replace("new URLSearchParams(location.search).has('test')", 'true')
    page.set_content(html)
    page.wait_for_function('!!window.DeadSlowTest')
    page.evaluate('DeadSlow.level("granite-needle");DeadSlow.speed(0)')
    page.wait_for_timeout(500)
    check('North-facing barge is broadside in the production chart', page.evaluate('Math.abs(DeadSlowTest.state.run.jobs.bodies[0].a+Math.PI/2)<1e-10'))
    check('Granite brief explains the pickup turn', 'broadside' in page.locator('#brief').inner_text())
    page.screenshot(path=str(OUT/'granite-broadside.png'))
    page.evaluate('DeadSlow.watch("granite-needle",0);DeadSlow.step(110)')
    check('Reference has made fast and turned the barge before the narrows', page.evaluate('!!DeadSlowTest.state.run.jobs.line && Math.abs(DeadSlowTest.state.run.jobs.bodies[0].a)<.4 && DeadSlowTest.state.run.jobs.bodies[0].x<254'))
    check('Pickup leaves hulls undamaged and line intact', page.evaluate('DeadSlowTest.state.run.contacts===0 && DeadSlowTest.state.run.jobs.stats.lineBreaks===0'))
    page.screenshot(path=str(OUT/'granite-turn.png'))
    page.evaluate('DeadSlow.step(270)')
    check('Broadside recording finishes cleanly in production watch', page.evaluate('DeadSlow.report().verified && DeadSlow.report().clean && !DeadSlow.report().ranked'))
    check('Barge is actually delivered and replay has not written a PB', page.evaluate('DeadSlowTest.state.run.jobs.bodies[0].delivered && DeadSlowTest.state.storage.stages["granite-needle"].runs.length===0'))
    page.evaluate('DeadSlow.level("gerbo-whiskerdoom");DeadSlow.speed(0)')
    page.wait_for_timeout(500)
    check('Lake drawing uses the southwest placement', page.evaluate('DeadSlowTest.state.level.rampage.lakes[0].x===1810 && DeadSlowTest.state.level.rampage.lakes[0].y===1270'))
    page.screenshot(path=str(OUT/'teardrop-mere.png'))
    page.evaluate('DeadSlow.watch("gerbo-whiskerdoom",0);DeadSlow.step(458)')
    check('Unchanged rescue recording still completes cleanly', page.evaluate('DeadSlow.report().verified && DeadSlow.report().clean'))
    check('Whiskerdoom and Gerbozilla both retain 100 percent integrity', page.evaluate('DeadSlowTest.state.run.rampage.lady.health===100 && DeadSlowTest.state.run.ship.hull===100'))
    # Synthetic data is solely for archive presentation, not a navigation claim.
    page.evaluate('''() => {
        const d=DeadSlowTest.state.storage;
        d.archivedStages['granite-needle-layout-v1']={runs:[{time:289.925,contacts:0,clean:true}]};
        d.archivedStages['gerbo-whiskerdoom-layout-v1']={runs:[{time:456.491667,contacts:0,clean:true}]};
        for(const id of ['archipelago','gerbozilla','grand-tour'])d.archivedRaces[id+'-layout-v2']=[{time:1200,contacts:1,clean:false},{time:1234,contacts:0,clean:true}];
        DeadSlow.level('granite-needle');DeadSlow.speed(0);
    }''')
    page.click('#log-btn')
    text=page.locator('#dialog').inner_text()
    check('Captain log exposes both classes of inline-tow circuit archives', 'Earlier layout records (archived)' in text and 'World 3 · inline barge (archived): overall 20:00.000 · clean 20:34.000' in text)
    page.evaluate('DeadSlow.level("gerbo-whiskerdoom");DeadSlow.speed(0)')
    page.click('#log-btn')
    text=page.locator('#dialog').inner_text()
    check('Field log exposes both classes of affected circuit archives', 'Earlier terrain records (archived)' in text and 'World 5 · earlier lake (archived): overall 20:00.000 · clean 20:34.000' in text and 'Grand Tour · earlier barge/lake' in text)
    for id in ['granite-needle','gerbo-whiskerdoom']:
        page.set_viewport_size({'width':390,'height':844})
        page.evaluate('(id)=>{DeadSlow.level(id);DeadSlow.speed(0)}',id)
        page.wait_for_timeout(100)
        check(id+' chart has no portrait overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        page.screenshot(path=str(OUT/(id+'-mobile.png')))
    check('No browser page errors',not errors)
    browser.close()
(OUT/'checks.json').write_text(json.dumps({'count':len(checks),'checks':checks,'errors':errors},indent=2))
print(f'{len(checks)} focused browser checks passed; {len(errors)} page errors.')
