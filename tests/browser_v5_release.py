"""Focused field-atlas/release checks. Build first; uses inline mounting and system Chromium.
Synthetic circuit completion below isolates UI/progression, not physical marathon play.
"""
from pathlib import Path
import json, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'reports'/'v5-shots';OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(label,passed):
    assert passed,label
    checks.append(label)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.evaluate("Object.defineProperty(window,'localStorage',{value:{getItem(k){return this[k]||null},setItem(k,v){this[k]=v}}})")
    html=(ROOT/'dist/index.html').read_text().replace("new URLSearchParams(location.search).has('test')",'true')
    page.set_content(html);page.wait_for_function('!!window.DeadSlowTest')
    page.evaluate('DeadSlowTest.courses(4)')
    text=page.locator('#dialog').inner_text()
    check('Full World 4 has twelve course cards and no preview label',page.locator('.level-card').count()==12 and 'preview' not in text.lower())
    check('World 4 circuit and eighty-four-stage Grand Tour are selectable','World 4 run · 12 courses' in text and 'all 84' in text)
    page.screenshot(path=str(OUT/'world-five.png'))
    for number in [2,3,4,5,6,7,8,9,10,11]:
        page.evaluate('(n)=>{DeadSlow.level(4,n);DeadSlow.speed(0)}',number)
        page.wait_for_timeout(110)
        check(f'Course {number} renders a nonempty field sheet',page.locator('#sea').evaluate('(e)=>e.width>500&&e.height>300'))
        if number in [2,3,4,5,6,7,8,10]:page.screenshot(path=str(OUT/f'course-{number}.png'))
    page.evaluate('DeadSlow.watch("gerbo-prickly-business",0);DeadSlow.step(44)')
    check('Survey mission uses the shared river bank polygon',page.evaluate('!!DeadSlowTest.state.level.rampage.lakes.find(l=>l.poly&&l.river)'))
    page.screenshot(path=str(OUT/'bristle-brook.png'))
    page.evaluate('DeadSlow.watch("gerbo-rolling-threat",0);DeadSlow.step(100)')
    check('Buffed chase completes cleanly in the actual browser replay',page.evaluate('DeadSlow.report().verified && DeadSlow.report().clean'))
    check('Chase requires three distinct shield activations on its fast reference',page.evaluate('DeadSlowTest.state.run.rampage.stats.needleBlocks===3&&DeadSlowTest.state.run.rampage.stats.shields===3'))
    page.screenshot(path=str(OUT/'three-shields.png'))
    # Exercise the actual field UI during a real circuit, then isolate its end.
    page.evaluate('DeadSlow.normal();DeadSlowTest.marathon("gerbozilla");DeadSlowTest.hud()')
    check('Rolling circuit HUD displays its route counter and clock',page.locator('#race-banner').is_visible() and 'WORLD 4 1/12' in page.locator('#race-banner').inner_text())
    page.evaluate('DeadSlowTest.state.run.time=3;DeadSlowTest.retry();DeadSlowTest.hud()')
    check('Rolling circuit retries retain elapsed time',page.evaluate('DeadSlowTest.state.marathon.total>=3&&DeadSlowTest.state.marathon.retries===1'))
    page.evaluate('''() => {for(let i=0;i<12;i++){DeadSlowTest.state.run.time=2;DeadSlowTest.finish();if(i<11)DeadSlowTest.next();}}''')
    check('Championship result reports the full route and total','WORLD 4 12/12' in page.locator('#dialog').inner_text() and 'Twelve courses.' in page.locator('#dialog').inner_text())
    check('Championship record goes to its separate board',page.evaluate('DeadSlowTest.state.storage.races.gerbozilla.length===1 && DeadSlowTest.state.storage.races.gerbozilla[0].stages===12'))
    page.screenshot(path=str(OUT/'championship-result.png'))
    page.click('[data-action=log]')
    check('Field log includes championship and Grand Tour records','Circuit records' in page.locator('#dialog').inner_text() and 'Grand Tour · 84 stages' in page.locator('#dialog').inner_text())
    page.evaluate('''() => {
      const data=DeadSlowTest.state.storage;
      data.archivedRaces['grand-tour-48']=[{time:9876,contacts:0,clean:true}];
      data.archivedStages['gerbo-banking-preview']={runs:[{time:100,contacts:0,clean:true}]};
      data.archivedStages['gerbo-banking']={runs:[{time:90,contacts:0,clean:true}]};
      DeadSlow.level(4,2);DeadSlow.speed(0);
    }''')
    page.click('#log-btn')
    text=page.locator('#dialog').inner_text()
    check('Preview and earlier terrain archives remain separately accessible','Preview field map records (archived)' in text and 'Earlier terrain records (archived)' in text)
    check('Old forty-eight-stage circuit is visible in the rolling field log','48-stage Grand Tour (archived)' in text)
    page.evaluate('DeadSlow.normal();DeadSlowTest.marathon("grand-tour")')
    page.evaluate('''() => {for(let i=0;i<84;i++){DeadSlowTest.state.run.time=1;DeadSlowTest.finish();if(i<83)DeadSlowTest.next();}}''')
    check('Grand Tour ends with the relief passage after the field championship',page.evaluate('DeadSlowTest.state.level.id==="pale-reach-12" && DeadSlowTest.state.marathon.stages===84'))
    check('Final result celebrates the open route with the full circuit time','The route is open.' in page.locator('#dialog').inner_text() and 'GRAND TOUR 84/84' in page.locator('#dialog').inner_text())
    page.evaluate('DeadSlow.level(4,10);DeadSlow.speed(0)')
    for w,h in [(390,844),(320,740),(844,390)]:
        page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(90)
        check(f'Released field controls fit {w}x{h}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        check(f'Shield button stays reachable at {w}x{h}',page.locator('#gerbo-shield').evaluate('(e)=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}'))
        if w==390:page.screenshot(path=str(OUT/'river-mobile.png'))
    page.set_viewport_size({'width':1440,'height':1000})
    page.evaluate('DeadSlow.level(1,1);DeadSlow.speed(0)')
    check('Returning to sea restores maritime controls',page.locator('#throttle-up').is_visible() and page.locator('#speed-unit').inner_text()=='kn')
    check('Field charts, circuits and logs produce no page errors',not errors)
    browser.close()
(ROOT/'reports'/'v5-browser.json').write_text(json.dumps({'count':len(checks),'checks':checks,'errors':errors},indent=2))
print(f'{len(checks)} focused browser checks passed; {len(errors)} page errors.')
