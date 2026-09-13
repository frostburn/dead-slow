"""Focused World 6 layout checks. Run directly; the complete smoke suite also calls it."""
from pathlib import Path

def check_mission_design(browser, check, html, screenshots=None):
    page = browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.evaluate("Object.defineProperty(window,'localStorage',{value:{getItem(){return null},setItem(){}}})")
    page.set_content(html.replace("new URLSearchParams(location.search).has('test')",'true'))
    page.wait_for_function('!!window.DeadSlowTest')
    def load(id):
        page.evaluate('(id)=>{DeadSlow.level(id);DeadSlow.speed(0)}', id)
    def shot(name):
        page.wait_for_timeout(80)
        if screenshots:
            Path(screenshots).mkdir(parents=True,exist_ok=True)
            page.screenshot(path=str(Path(screenshots)/name))
    load('vacuum')
    check('Tutorial arrival is visibly off the launch line',page.evaluate('DeadSlowTest.state.level.berth.y !== DeadSlowTest.state.run.ship.y'))
    check('Both outbound rocks appear in the live state',page.evaluate('DeadSlowTest.state.run.space.rocks.length===2'))
    shot('offset-approach.png')
    load('umbra')
    before=page.evaluate('DeadSlowTest.state.run.space.rocks[0].y')
    page.evaluate('DeadSlow.step(100)')
    check('Shadow shield actually migrates while the ship waits',page.evaluate('DeadSlowTest.state.run.space.rocks[0].y')<before-29)
    check('Continuous radiation UI forecasts real cover without an infinite flare countdown',
          'CRADLE SHADOW' in page.locator('#work-order').inner_text()
          and 'Infinity' not in page.locator('#work-readout').inner_text()
          and 'RADIATION' in page.locator('#work-readout').inner_text())
    shot('drifting-cover.png')
    load('perihelion-dispatch')
    check('Dispatch uses the same continuous radiation instruments','RADIATION' in page.locator('#work-readout').inner_text())
    load('yesterday')
    check('Two gate destinations and physical station structures are available to the renderer',page.evaluate('HarborSpace.gates(DeadSlowTest.state.level.space).length===2 && DeadSlowTest.state.run.space.structures.length===9'))
    shot('janus-station.png')
    page.evaluate('DeadSlow.watch("yesterday",0);DeadSlow.step(600);DeadSlow.step(450)')
    check('Actual recorded flight reaches the two-history maze leg',page.evaluate('DeadSlowTest.state.run.space.phase===2 && DeadSlowTest.state.run.space.echoes.length===2'))
    check('Both histories remain visibly marked solid','2 SOLID HISTORIES' in page.locator('#work-readout').inner_text())
    check('Maze replay remains unranked',page.evaluate('DeadSlowTest.state.run.pausedUsed && DeadSlowTest.state.storage.stages.yesterday.runs.length===0'))
    shot('janus-histories.png')
    page.set_viewport_size({'width':390,'height':844})
    check('Maze controls still fit a portrait viewport',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
    page.click('#zoom-btn');shot('janus-mobile.png')
    page.set_viewport_size({'width':1440,'height':1000})
    load('century-ship')
    page.click('#zoom-btn');page.click('#zoom-btn')
    check('Century overview includes the rogue planet',page.evaluate('DeadSlowTest.state.run.space.rocks.some(b=>b.planet)') and page.locator('#zoom-btn').inner_text()=='2.3×')
    shot('erebus-overview.png')
    # Geometry inspection, explicitly not an author-time run.
    load('century-ship')
    page.evaluate('DeadSlowTest.setShip({x:55424,y:4800});DeadSlowTest.hud()')
    shot('erebus-limb.png')
    check('Revised mission rendering has no JavaScript errors',not errors)
    page.close()

if __name__ == '__main__':
    import argparse,json,shutil
    from playwright.sync_api import sync_playwright
    parser=argparse.ArgumentParser()
    parser.add_argument('--screenshots',type=Path)
    parser.add_argument('--report',type=Path)
    args=parser.parse_args()
    root=Path(__file__).resolve().parents[1]
    checks=[]
    def check(name,passed):
        assert passed,name
        checks.append(name)
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
        check_mission_design(browser,check,(root/'dist/index.html').read_text(),args.screenshots)
        browser.close()
    report={'passed':len(checks),'checks':checks}
    if args.report:args.report.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps(report,indent=2))
