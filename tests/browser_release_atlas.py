"""Focused release UX, atlas and volcanic-map checks. No full campaign playback."""
from pathlib import Path
import json,shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'reports/release';OUT.mkdir(parents=True,exist_ok=True)
checks=[]
def check(name,ok):
    assert ok,name
    checks.append(name)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.evaluate("Object.defineProperty(window,'localStorage',{value:{getItem(k){return this[k]||null},setItem(k,v){this[k]=v}}})")
    page.set_content((ROOT/'dist/index.html').read_text().replace("new URLSearchParams(location.search).has('test')",'true'))
    page.wait_for_function('!!window.DeadSlowTest')
    page.evaluate('DeadSlow.circuit(3,0);DeadSlow.step(3)')
    # Sensitive mid-job state: the dialog must not erase it.
    page.evaluate('DeadSlowTest.state.run.jobs.stats.lineChanges=7')
    time=page.evaluate('DeadSlow.progress().time')
    page.keyboard.press('r');page.wait_for_timeout(70)
    check('R opens restart confirmation, not a new attempt',page.evaluate('DeadSlowTest.state.modal==="restart" && DeadSlowTest.state.status==="confirming" && DeadSlowTest.state.run.jobs.stats.lineChanges===7'))
    check('Keep playing receives initial focus',page.locator(':focus').get_attribute('data-action')=='cancel-retry')
    page.keyboard.press('r');page.keyboard.press('r');page.keyboard.press('d');page.keyboard.press('Space')
    check('Repeated restart and adjacent helm keys cannot confirm',page.evaluate('DeadSlowTest.state.modal==="restart" && DeadSlow.progress().circuit.retries===0'))
    page.wait_for_timeout(120)
    check('Confirmation freezes the simulation at any multiplier',page.evaluate('DeadSlow.progress().time')==time)
    page.screenshot(path=str(OUT/'restart-confirmation.png'))
    page.keyboard.press('Enter')
    check('Enter defaults to keeping progress',page.evaluate('DeadSlowTest.state.status==="running" && DeadSlowTest.state.run.jobs.stats.lineChanges===7'))
    page.click('#quick-retry-btn');page.keyboard.press('Escape')
    check('Header restart uses the same safe confirmation and Escape cancels',page.evaluate('DeadSlowTest.state.status==="running" && DeadSlow.progress().time')==time)
    page.click('#retry-btn');page.click('[data-action="confirm-retry"]')
    check('Only deliberate confirmation resets the stage and counts one retry',page.evaluate('DeadSlowTest.state.run.time===0 && DeadSlowTest.state.run.jobs.stats.lineChanges===0 && DeadSlow.progress().circuit.retries===1'))
    check('Confirmed reset keeps circuit history and frozen speed',page.evaluate('DeadSlow.progress().circuit.time')==time and page.evaluate('DeadSlow.speed()')==0)
    page.evaluate('DeadSlowTest.finish()');page.keyboard.press('r');page.keyboard.press('Escape')
    check('Cancellation restores completion rather than starting or double-recording',page.evaluate('DeadSlowTest.state.status==="complete" && DeadSlowTest.state.modal==="result"'))
    check('Modal support links are not duplicated by cancel',page.locator('#dialog .support-link').count()==1)
    check('Bug reporting and feature requests are discoverable',page.locator('.permanent-support a').get_attribute('href')=='https://github.com/frostburn/dead-slow/issues/' and 'Feature requests' in page.locator('#dialog').inner_text())
    for w in [5,7,8]:
        page.evaluate('(w)=>DeadSlowTest.courses(w)',w)
        check(f'World {w} shows 12 disabled future missions',page.locator('.level-card:disabled').count()==12 and 'COMING SOON' in page.locator('#dialog').inner_text())
        check(f'World {w} cannot start a circuit',page.locator('[data-action=marathon]').is_disabled())
    check('Eight chapter tabs remain inspectable',page.locator('.world-tab').count()==8)
    page.screenshot(path=str(OUT/'eight-world-atlas.png'))
    page.evaluate('DeadSlowTest.courses(4)')
    check('Gerbozilla is chapter 4 with 12 playable courses',page.locator('.level-card:not(:disabled)').count()==12 and 'WORLD 4' in page.locator('#dialog').inner_text() and 'COURSES COMPLETE' in page.locator('.world-progress').inner_text())
    page.evaluate('DeadSlowTest.courses(6)')
    check('Space is chapter 6 with its separately counted bonus',page.locator('.level-card:not(:disabled)').count()==13 and '0 / 12 SECTORS CLEARED' in page.locator('.world-progress').inner_text())
    page.evaluate('DeadSlow.level(3,2);DeadSlow.speed(0)')
    check('Fictional tug and casualty appear in actual instruments', 'SIVRA' in page.locator('#ship-name').inner_text() and 'ELVARA' in page.locator('#work-order').inner_text().upper())
    page.evaluate('DeadSlow.level("gerbo-downhill");DeadSlow.speed(0);DeadSlowTest.state.run.time=56;GerboRampage.volcanoUpdate(DeadSlowTest.state.run);DeadSlowTest.hud()')
    page.wait_for_timeout(100)
    check('Volcano countdown and danger state reach the rolling HUD','ERUPTING' in page.locator('#work-readout').inner_text())
    page.screenshot(path=str(OUT/'muesli-furnace.png'))
    page.evaluate('DeadSlow.level("gerbo-forest-slalom");DeadSlow.speed(0);DeadSlow.step(65)')
    check('Forest vents have different clocks',page.evaluate('(()=>{let v=DeadSlowTest.state.run.rampage.volcanoes;return v.length===2 && v[0].state.remaining!==v[1].state.remaining})()'))
    page.wait_for_timeout(100);page.screenshot(path=str(OUT/'boulder-fissures.png'))
    page.evaluate('DeadSlow.level("gerbo-prickly-business");DeadSlow.speed(0);DeadSlow.step(52)')
    check('River steam and invulnerable patrol coexist',page.evaluate('DeadSlowTest.state.run.rampage.volcanoes.every(v=>v.steam) && DeadSlowTest.state.run.rampage.monsters[0].invulnerable'))
    page.wait_for_timeout(100);page.screenshot(path=str(OUT/'boiling-brook.png'))
    # Watch the ghost being flattened. No individual body path may use 0.18 alpha.
    page.evaluate('''() => {
        window.ghostGroups=[];window.ghostPaths=0;
        const proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage,fill=proto.fill,stroke=proto.stroke;
        proto.drawImage=function(image,...args){
            if(image.width===256 && image.height===256 && Math.abs(this.globalAlpha-.18)<.001){
                const q=image.getContext('2d');
                // Belly at the hip must fully cover the leg before compositing.
                const hip=q.getImageData(100,167,1,1).data;
                ghostGroups.push({alpha:this.globalAlpha,hip:Array.from(hip)});
            }
            return draw.call(this,image,...args);
        };
        proto.fill=function(...a){if(Math.abs(this.globalAlpha-.18)<.001)ghostPaths++;return fill.apply(this,a)};
        proto.stroke=function(...a){if(Math.abs(this.globalAlpha-.18)<.001)ghostPaths++;return stroke.apply(this,a)};
        DeadSlow.level('gerbo-first-outing');DeadSlow.speed(0);
        DeadSlowTest.state.storage.stages['gerbo-first-outing'].ghost=[[0,300,530,0]];
        DeadSlowTest.state.settings.ghost=true;
    }''')
    page.wait_for_function('ghostGroups.length>0')
    check('Ghost transparency is applied once to a flattened sprite',page.evaluate('ghostGroups.every(g=>Math.abs(g.alpha-.18)<.001) && ghostPaths===0'))
    check('Opaque belly occludes legs inside the ghost layer',page.evaluate('ghostGroups[0].hip[3]===255'))
    page.screenshot(path=str(OUT/'single-alpha-ghost.png'))
    # Read new archive classes in real dialogs.
    page.evaluate('''() => {
        const d=DeadSlowTest.state.storage;
        d.archivedRaces['gerbozilla-volcano-v1']=[{time:1200,contacts:1,clean:false},{time:1234,contacts:0,clean:true}];
        d.archivedRaces['grand-tour-order-v1']=[{time:8000,contacts:1,clean:false},{time:9000,contacts:0,clean:true}];
        DeadSlow.level('gerbo-downhill');DeadSlow.speed(0);
    }''')
    page.click('#log-btn');text=page.locator('#dialog').inner_text()
    check('Field log keeps both old circuit classes visible','before volcanic crossings' in text and 'overall' in text and 'clean' in text and 'earlier world order' in text)
    page.evaluate('DeadSlow.level("vacuum");DeadSlow.speed(0)');page.click('#log-btn')
    check('Flight log exposes the same earlier Grand Tour archive','earlier world order' in page.locator('#dialog').inner_text())
    page.set_viewport_size({'width':390,'height':844});page.evaluate('DeadSlowTest.courses(5)');page.wait_for_timeout(100)
    check('Eight-world mobile selector stays within the viewport',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.screenshot(path=str(OUT/'atlas-mobile.png'))
    page.evaluate('DeadSlow.level(4,4);DeadSlow.speed(0)');page.click('#quick-retry-btn');page.wait_for_timeout(100)
    check('Tablet/mobile restart shares the cancel-first dialog',page.locator('[data-action=cancel-retry]').is_visible() and page.locator(':focus').get_attribute('data-action')=='cancel-retry')
    check('Restart buttons and text fit a portrait viewport',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.screenshot(path=str(OUT/'restart-mobile.png'))
    check('No page errors',not errors)
    browser.close()
(OUT/'browser-atlas.json').write_text(json.dumps({'passed':len(checks),'checks':checks},indent=2))
print(f'{len(checks)} focused browser checks passed')
