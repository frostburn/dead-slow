"""Input-capability coverage for desktop, narrow windows and keyboard-equipped tablets."""
def check_keyboard_hints(browser, check, html):
    for touch in [False, True]:
        context = browser.new_context(viewport={'width':1024,'height':768}, has_touch=touch, is_mobile=touch)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.evaluate("Object.defineProperty(window,'localStorage',{value:{getItem(){return null},setItem(){}}})")
        page.set_content(html.replace("new URLSearchParams(location.search).has('test')", 'true'))
        for world,number in [(1,1),(4,10),(5,12),(6,1)]:
            page.evaluate('([w,n])=>DeadSlow.level(w,n)', [world,number])
            page.wait_for_timeout(40)
            visible = page.locator('kbd:visible, .key-hint:visible, .key-row:visible, .keyboard-only:visible').count()
            check(f'World {world}: hints follow input capability (touch={touch})', (visible == 0) if touch else (visible > 0))
        if touch:
            page.evaluate('DeadSlow.level(5,12)')
            page.keyboard.press('Tab')
            check('Physical keyboard reveals tablet shortcuts',page.locator('#rail-panel .key-hint:visible').count()>0)
            page.tap('[data-rail="help"]')
            check('Touch after keyboard use retains shortcuts',page.locator('.keyboard-only:visible').count()>0)
        else:
            page.set_viewport_size({'width':390,'height':844})
            check('Narrow desktop retains keyboard hints',page.locator('kbd:visible').count()>0)
        check(f'Input hint checks have no runtime errors (touch={touch})',not errors)
        context.close()
