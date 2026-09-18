import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1280, 'height': 720}, record_video_dir='/home/jules/verification/videos')
        page = await context.new_page()

        # Navigate to app
        await page.goto('http://localhost:8080')
        await page.wait_for_timeout(1000)

        # Click on profile button in top right
        await page.click('#profile-top-pill')
        await page.wait_for_timeout(500)

        # Take screenshot of profile modal
        await page.screenshot(path='/home/jules/verification/screenshots/profile_modal.png')

        # Fill in new username
        await page.fill('#pm-username', 'Hustler99')
        # Select preset chip 'SL'
        await page.click('.avatar-chip[data-chip="SL"]')
        # Save profile
        await page.click('#pm-save-btn')
        await page.wait_for_timeout(1000)

        # Take screenshot of main menu with updated profile
        await page.screenshot(path='/home/jules/verification/screenshots/main_menu_updated.png')

        # Open Deposit modal from balance pill or wallet menu
        await page.click('#top-bar-deposit-btn')
        await page.wait_for_timeout(500)

        # Deposit $50
        await page.click('#wm-quick-50')
        await page.click('#wm-deposit-btn')
        await page.wait_for_timeout(1000)

        # Close wallet modal if open
        if await page.is_visible('#wallet-modal'):
            await page.click('#wm-close-btn')
            await page.wait_for_timeout(500)

        # Start practice game to see HUD
        await page.click('#btn-mode-practice')
        await page.wait_for_timeout(2000)

        # Take screenshot of in-game HUD with profile picture and wallet balance
        await page.screenshot(path='/home/jules/verification/screenshots/hud_game.png')

        await context.close()
        await browser.close()

asyncio.run(run())
