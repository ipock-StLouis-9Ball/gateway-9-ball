from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.set_viewport_size({"width": 1280, "height": 720})
    page.goto("http://localhost:8080/index.html")
    page.wait_for_timeout(1000)

    # Take screenshot of main menu
    page.screenshot(path="/home/jules/verification/screenshots/menu.png")

    # Click practice button
    practice_btn = page.get_by_role("button", name="Practice")
    practice_btn.click()
    page.wait_for_timeout(1000)

    # Take screenshot of game screen with table & right sidebar HUD
    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(2000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
