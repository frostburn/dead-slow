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
    check('World 5 selector has one course, not twelve placeholders',page.locator('.level-card').count()==1 and '0 / 1 COURSES COMPLETE' in page.locator('#dialog').inner_text())
    check('Grand Tour remains 48 stages','all 48' in page.locator('#dialog').inner_text())
    page.click('.level-card');check('Ball introduction explains map controls and shields','W A S D' in page.locator('#dialog').inner_text() and 'shield' in page.locator('#dialog').inner_text())
    shot('gerbo-intro.png');page.click('[data-action="begin"]');page.evaluate('DeadSlow.speed(0)')
    check('Rolling UI is visible with a separate directional pad',page.locator('.rampage-helm').is_visible() and not page.locator('#throttle-up').is_visible())
    page.keyboard.down('d');page.keyboard.down('w');page.evaluate('DeadSlow.step(1)')
    check('W/D simultaneously push east and north',page.evaluate('DeadSlowTest.state.run.ship.vx>0 && DeadSlowTest.state.run.ship.vy<0'))
    page.keyboard.up('d');page.keyboard.up('w');page.evaluate('DeadSlow.step(.2)')
    check('Released keys clear effort but retain momentum',page.evaluate('DeadSlowTest.state.run.rampage.effort===0 && Math.hypot(DeadSlowTest.state.run.ship.vx,DeadSlowTest.state.run.ship.vy)>1'))
    page.click('#gerbo-shield');check('Touch shield button activates a finite shield',page.evaluate('DeadSlowTest.state.run.rampage.shieldUntil>DeadSlowTest.state.run.time'))
    page.evaluate('DeadSlow.step(3.1)');check('Shield expires instead of becoming permanent',page.evaluate('!GerboRampage.protectedAt(DeadSlowTest.state.run)'))
    page.evaluate('DeadSlow.watch("gerbo-first-outing",0);DeadSlow.step(48)');page.wait_for_timeout(120);shot('gerbo-course.png')
    page.evaluate('DeadSlow.step(50)')
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
    audio=page.evaluate('''async()=>{
        const rows=[];
        for(const [phase,active] of [[Math.PI/2,true],[3*Math.PI/2,true],[0,false]]){
            const c=new OfflineAudioContext(1,22050,44100),wheel=GerboAudio.createWheel(c);
            wheel.tick({roll:phase,audioSpeed:15,slip:0},active);
            const data=(await c.startRendering()).getChannelData(0);let peak=0,sum=0;
            for(const v of data){peak=Math.max(peak,Math.abs(v));sum+=v*v;}
            rows.push({phase,active,peak,rms:Math.sqrt(sum/data.length)});
        }
        return rows;
    }''')
    check('Both wheel vowels are audible with safe digital headroom',all(.00005<row['rms']<.05 and row['peak']<.15 for row in audio[:2]))
    check('Wheel audio is silent while inactive',audio[2]['peak']==0)
    # The integration touches mode switching, not any earlier mission layouts.
    page.evaluate('DeadSlow.level(4,1);DeadSlow.speed(0)')
    check('Returning to space restores the flight helm',not page.locator('.rampage-helm').is_visible() and page.locator('#helm-rudder-label').inner_text()=='ROTATIONAL JETS')
    page.evaluate('DeadSlow.level(1,1);DeadSlow.speed(0)')
    check('Returning to sea restores the marine helm',page.locator('#helm-rudder-label').inner_text()=='RUDDER' and page.locator('#speed-unit').inner_text()=='kn')
    check('No browser errors',not errors)
    report={'checks':len(checks),'passed':checks,'errors':errors,'audio':audio}
    (ROOT/'reports').mkdir(exist_ok=True);(ROOT/'reports/rampage-browser.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2));browser.close()
