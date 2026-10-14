from playwright.sync_api import sync_playwright
import time

python_server = None
try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.on('console', lambda msg: print('BROWSER CONSOLE:', msg.type, msg.text))
        page.on('pageerror', lambda err: print('PAGE ERROR:', err))
        page.goto('http://localhost:8080')
        time.sleep(1)

        # Click on Practice mode button if menu is visible
        print("Clicking play / practice...")
        # Check available buttons or elements
        page.screenshot(path="/tmp/menu.png")

        # Look for practice or play
        buttons = page.query_selector_all("button")
        for b in buttons:
            print("Button:", b.inner_text(), b.get_attribute("id"), b.get_attribute("class"))

        # Click play / practice button if exists
        practice_btn = page.query_selector("button:has-text('Practice'), button:has-text('Play'), #btn-practice, .btn-practice")
        if practice_btn:
            practice_btn.click()
            time.sleep(2)

        page.screenshot(path="/tmp/gameplay.png")
finally:
    pass
