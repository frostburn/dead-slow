"""Focused Wilds controls, rendering, audio and changed recordings; no sea/space run sweep."""
from pathlib import Path
import json,shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];shots=ROOT/'screenshots/wilds';shots.mkdir(parents=True,exist_ok=True)
checks=[]
(ROOT/'reports').mkdir(parents=True,exist_ok=True)
def check(name,condition):
    assert condition,name
    checks.append(name)
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1000});errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.evaluate("Object.defineProperty(window,'localStorage',{value:{getItem(k){return this[k]||null},setItem(k,v){this[k]=v}}})")
    html=(ROOT/'dist/index.html').read_text().replace("new URLSearchParams(location.search).has('test')",'true')
    page.set_content(html);page.wait_for_function('!!window.DeadSlowTest')
    def shot(name):
        page.wait_for_timeout(100);page.screenshot(path=str(shots/(name+'.png')))
    page.evaluate('DeadSlowTest.courses(5)')
    check('World 5 has exactly nine courses and still no circuit',page.locator('.level-card').count()==9 and '0 / 9' in page.locator('.world-progress').inner_text() and 'all 48' in page.locator('#dialog').inner_text())
    shot('nine-courses')
    page.evaluate('DeadSlow.level("gerbo-forest-slalom");DeadSlow.speed(0)');shot('forest-map')
    check('Forest course has five ordered controls and no city objectives',page.evaluate('DeadSlowTest.state.run.rampage.controlCount===5 && DeadSlowTest.state.run.rampage.districts.length===0'))
    page.evaluate('DeadSlow.level("gerbo-pepperbreath");DeadSlow.speed(0)')
    check('Fire button is visible only on the pepper course',page.locator('#gerbo-fire').is_visible())
    page.keyboard.down('h');page.evaluate('DeadSlow.step(.1)')
    check('H cannot bypass the pepper pickup',page.evaluate('!DeadSlowTest.state.run.rampage.fireActive'))
    page.keyboard.up('h');page.evaluate('DeadSlow.warp(420,680,0);DeadSlow.step(.1)')
    page.keyboard.down('h');page.keyboard.down('d');page.evaluate('DeadSlow.step(.25)')
    check('H and a directional push operate together',page.evaluate('DeadSlowTest.state.input.winch===1 && DeadSlowTest.state.run.rampage.fireActive && DeadSlowTest.state.run.rampage.breath<3'))
    page.keyboard.up('h');page.keyboard.up('d');page.evaluate('DeadSlow.step(.25)')
    check('Key release cuts the flame and starts recharge',page.evaluate('DeadSlowTest.state.input.winch===0 && !DeadSlowTest.state.run.rampage.fireActive'))
    page.locator('#gerbo-fire').evaluate("b=>{b.setPointerCapture=()=>{};b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:88,bubbles:true}));}")
    page.evaluate('DeadSlow.step(.1)');check('Touch fire uses the same hold input',page.evaluate('DeadSlowTest.state.run.rampage.fireActive'))
    page.locator('#gerbo-fire').evaluate("b=>b.dispatchEvent(new PointerEvent('pointercancel',{pointerId:88,bubbles:true}))")
    page.evaluate('DeadSlow.step(.1)');check('Cancelled touch cannot latch fire',page.evaluate('DeadSlowTest.state.input.winch===0 && !DeadSlowTest.state.run.rampage.fireActive'))
    times={}
    for id in ['gerbo-forest-slalom','gerbo-cavy-clash','gerbo-pepperbreath','gerbo-whiskerdoom']:
        fixture=json.loads((ROOT/'tests/fixtures'/f'{id}-controls.json').read_text());times[id]=fixture['expectedTime']
        stop=(next(e['time'] for e in fixture['events'] if e.get('winch')==1)+.8) if id=='gerbo-pepperbreath' else {'gerbo-forest-slalom':40,'gerbo-cavy-clash':34,'gerbo-whiskerdoom':255}[id]
        page.evaluate('([id,t])=>{DeadSlow.watch(id,0);DeadSlow.step(t)}',[id,stop])
        shot(id)
        if id=='gerbo-whiskerdoom':
            page.click('#zoom-btn');shot('whiskerdoom-close')
        page.evaluate('(n)=>DeadSlow.step(n)',fixture['duration']-stop)
        check(id+' verifies in the production browser',page.evaluate('DeadSlow.report().verified && DeadSlow.report().clean'))
        check(id+' cannot replace a ranked PB',page.evaluate('(id)=>DeadSlowTest.state.storage.stages[id].runs.length===0',id))
        if id=='gerbo-forest-slalom':check('Control-only result is not a city-demolition screen','All controls.' in page.locator('#dialog').inner_text())
        if id=='gerbo-whiskerdoom':
            check('Rescue requires a living friend to arrive too',page.evaluate('DeadSlowTest.state.run.rampage.rescued && DeadSlowTest.state.run.rampage.lady.health===100'))
            check('Rescue completion celebrates both hamsters','Two hamsters.' in page.locator('#dialog').inner_text());shot('rescue-finish')
    page.evaluate('DeadSlow.level("gerbo-pepperbreath");DeadSlow.speed(0)')
    for width,height in [(390,844),(320,740),(844,390)]:
        page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(80)
        check(f'Fire helm fits {width}x{height}',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
        check(f'Fire button remains reachable at {width}x{height}',page.locator('#gerbo-fire').is_visible() and page.locator('#gerbo-fire').evaluate('(e)=>{const r=e.getBoundingClientRect();return r.bottom<=innerHeight && r.top>=0}'))
        if width==390:shot('fire-mobile')
    page.set_viewport_size({'width':1440,'height':1000})
    page.evaluate('DeadSlow.level("floating-sauna");DeadSlow.speed(0);DeadSlowTest.hud();DeadSlow.level("gerbo-whiskerdoom");DeadSlow.speed(0)')
    check('Tow-to-rescue switch restores the manifest',page.locator('#manifest').is_visible())
    check('Fire button is hidden in the rescue',not page.locator('#gerbo-fire').is_visible())
    # Render one identical water stroke against the merged baseline and measure
    # the added land partial; no listening claims are made by this digital check.
    old=(ROOT/'tests/fixtures/gerbo-wheel-fortresses.js').read_text()
    page.evaluate(old)
    audio=page.evaluate('''async()=>{
      async function render(api,wet){const rate=44100,ctx=new OfflineAudioContext(1,rate,rate),w=api.createWheel(ctx);
        w.tick({roll:0,audioSpeed:wet?0:30,slip:wet?1.8:0,wet:wet?1:0,radius:24},true);
        return (await ctx.startRendering()).getChannelData(0);}
      const dry=await render(GerboAudio,false),oldDry=await render(OldGerboAudio,false),wet=await render(GerboAudio,true),oldWet=await render(OldGerboAudio,true);
      const max=a=>{let v=0;for(const x of a)v=Math.max(v,Math.abs(x));return v;};
      const delta=(a,b)=>{let s=0;for(let i=0;i<a.length;i++)s=Math.max(s,Math.abs(a[i]-b[i]));return s;};
      return {dryPeak:max(dry),wetPeak:max(wet),landDifference:delta(dry,oldDry),waterDifference:delta(wet,oldWet),tail:max(dry.slice(22050))};
    }''')
    check('Water samples are unchanged from the accepted reference',audio['waterDifference']==0)
    check('Land creaks gain a measurable second color',audio['landDifference']>.0001)
    check('Layered creaks retain headroom and a silent tail',audio['dryPeak']<.15 and audio['wetPeak']<.15 and audio['tail']<1e-6)
    flame=page.evaluate('''async()=>{
      const rate=48000,ctx=new OfflineAudioContext(1,rate*2,rate),wheel=GerboAudio.createWheel(ctx);
      wheel.tick({roll:0,audioSpeed:25,slip:0,wet:0,radius:24,fireActive:true},true);
      const cut=ctx.suspend(.55).then(()=>{wheel.tick(null,false);return ctx.resume();});
      const buffer=await ctx.startRendering();await cut;
      const data=buffer.getChannelData(0);let peak=0,energy=0,tail=0;
      for(let i=0;i<data.length;i++){peak=Math.max(peak,Math.abs(data[i]));
        if(i>rate*.35&&i<rate*.5)energy+=data[i]*data[i];
        if(i>rate*1.5)tail=Math.max(tail,Math.abs(data[i]));}
      return {peak,rms:Math.sqrt(energy/(rate*.15)),tail};
    }''')
    check('Fire and creak mix remains audible with output headroom',.001<flame['rms'] and flame['peak']<.15)
    check('Disabling the sound fades the fire hiss to silence',flame['tail']<1e-6)
    from browser_gerbo_audio import check_gerbo_audio
    wheel=check_gerbo_audio(page,check)
    check('No page errors',not errors)
    report={'checks':len(checks),'passed':checks,'errors':errors,'times':times,'audio':audio,'flame':flame,'wheel':wheel}
    (ROOT/'reports/wilds-browser.json').write_text(json.dumps(report,indent=2));print(json.dumps({'checks':len(checks),'audio':audio,'flame':flame,'times':times},indent=2))
    browser.close()
