import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(record_video_dir="/home/jules/verification/videos")
        page = await context.new_page()
        await page.goto("http://localhost:8080")
        await page.wait_for_timeout(1000)
        # Click on Practice button to enter game table
        await page.click("text=PRACTICE")
        await page.wait_for_timeout(2000)
        await page.screenshot(path="/home/jules/verification/screenshots/verification.png")
        await context.close()
        await browser.close()

asyncio.run(run())
