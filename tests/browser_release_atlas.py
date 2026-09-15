"""Focused release UX, atlas and volcanic-map checks. No full campaign playback."""
from pathlib import Path
import json,shutil
from playwright.sync_api import sync_playwright
from browser_rail import check_railway
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
    page.evaluate('DeadSlowTest.state.run.jobs.stats.lineChanges=7')
    time=page.evaluate('DeadSlow.progress().time')
    page.keyboard.press('r');page.keyboard.press('r')
    check('Plain R preserves the running attempt',page.evaluate('DeadSlowTest.state.status==="running" && DeadSlowTest.state.run.jobs.stats.lineChanges===7 && DeadSlow.progress().circuit.retries===0'))
    page.keyboard.press('Shift+r')
    check('Shift+R immediately resets and counts one retry',page.evaluate('DeadSlowTest.state.run.time===0 && DeadSlowTest.state.run.jobs.stats.lineChanges===0 && DeadSlow.progress().circuit.retries===1 && DeadSlowTest.state.modal===null'))
    check('Retry retains circuit time and selected speed',page.evaluate('DeadSlow.progress().circuit.time')==time and page.evaluate('DeadSlow.speed()')==0)
    page.evaluate('DeadSlow.step(1)')
    page.keyboard.down('Shift');page.keyboard.down('r');page.evaluate('DeadSlow.step(1)')
    page.keyboard.down('r')
    check('Held Shift+R does not repeat the reset',page.evaluate('DeadSlowTest.state.run.time>0 && DeadSlow.progress().circuit.retries===2'))
    page.keyboard.up('r');page.keyboard.up('Shift')
    for selector in ['#quick-retry-btn','#retry-btn']:
        page.click(selector)
        check(f'{selector} retries without a modal',page.evaluate('DeadSlowTest.state.run.time===0 && DeadSlowTest.state.status==="running" && DeadSlowTest.state.modal===null'))
        page.evaluate('DeadSlow.step(1)')
    page.evaluate('DeadSlowTest.finish()');page.keyboard.press('r')
    check('Plain R leaves the result screen intact',page.evaluate('DeadSlowTest.state.status==="complete" && DeadSlowTest.state.modal==="result"'))
    check('Bug reporting and feature requests are discoverable',page.locator('.permanent-support a').get_attribute('href')=='https://github.com/frostburn/dead-slow/issues/' and 'Feature requests' in page.locator('#dialog').inner_text())
    page.evaluate('DeadSlowTest.courses(5)')
    check('World 5 has twelve playable freight missions',page.locator('.level-card:not(:disabled)').count()==12 and page.locator('.level-card:disabled').count()==0)
    check('World 5 offers its complete circuit',page.locator('[data-action=marathon]').is_enabled())
    for w in [7,8]:
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
    check('Mobile retry is immediate',page.evaluate('DeadSlowTest.state.status==="running" && DeadSlowTest.state.modal===null'))
    check('Restart buttons and text fit a portrait viewport',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.screenshot(path=str(OUT/'restart-mobile.png'))
    check_railway(page,check,OUT)
    # Return to the same CSS size after another renderer changes the bitmap.
    page.set_viewport_size({'width':1440,'height':1000})
    for world in [1,2,3,4,6]:
        for destination in [world,5,world]:
            page.evaluate('(w)=>{DeadSlow.level(w,1);DeadSlow.speed(0)}',destination)
            page.wait_for_timeout(60)
        check(f'Train to World {world} restores the canvas bitmap',page.evaluate("""(()=>{const c=document.querySelector('#sea'),r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio,2);return c.width===Math.round(r.width*d)&&c.height===Math.round(r.height*d)})()"""))
        check(f'Train-only panels disappear in World {world}',not page.locator('#rail-info').is_visible() and not page.locator('#rail-grade').is_visible() and not page.locator('#rail-panel').is_visible())
    page.screenshot(path=str(OUT/'rail-to-marine.png'))
    for world in [1,2,3,4,5,6]:
        page.evaluate('(w)=>{DeadSlow.level(w,1);DeadSlow.speed(0);const r=DeadSlowTest.state.run;r.time=12.5;DeadSlowTest.finish();const s=DeadSlowTest.state;s.storage.stages[s.level.id].runs=[{time:10,contacts:0,clean:true},{time:15,contacts:1,clean:false}]}',world)
        check(f'World {world} completion offers consistent actions',page.locator('#dialog [data-action="log"]').count()==1 and page.locator('#dialog [data-action="retry"]').count()==1 and page.locator('#dialog [data-action="courses"]').count()==1 and page.locator('#dialog .primary').get_attribute('data-action')=='next')
        page.locator('#dialog [data-action="log"]').click()
        check(f'World {world} log has a run comparison table',page.locator('#dialog .run-comparison').is_visible() and page.locator('#dialog [data-filter="clean"]').is_visible() and '00:10.00' in page.locator('.run-comparison').inner_text() and '00:15.00' in page.locator('.run-comparison').inner_text())
        page.locator('#dialog [data-filter="clean"]').click()
        check(f'World {world} clean filter works',page.locator('#dialog [data-filter="clean"]').get_attribute('class').find('primary')>=0 and 'OPEN' not in page.locator('.run-comparison').inner_text())
        page.locator('#dialog [data-action="back"]').click()
        check(f'World {world} log returns to completion',page.evaluate('DeadSlowTest.state.modal==="result"'))
        if world==5:
            page.screenshot(path=str(OUT/'rail-result.png'))
            page.locator('#dialog [data-action="log"]').click()
            page.screenshot(path=str(OUT/'rail-logbook.png'))
    check('No page errors',not errors)
    browser.close()
(OUT/'browser-atlas.json').write_text(json.dumps({'passed':len(checks),'checks':checks},indent=2))
print(f'{len(checks)} focused browser checks passed')
