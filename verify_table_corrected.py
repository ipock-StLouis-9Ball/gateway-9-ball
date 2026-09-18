import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={'width': 1280, 'height': 720})
        await page.goto('http://localhost:8080')
        await page.wait_for_timeout(1000)
        await page.click('button[data-goto="practice"]')
        await page.wait_for_timeout(2000)
        await page.screenshot(path='verification_corrected.png')
        await browser.close()

asyncio.run(run())
