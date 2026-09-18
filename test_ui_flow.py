from pathlib import Path
from playwright.async_api import async_playwright
import asyncio

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 720})
        await page.goto("http://localhost:8080")
        await page.wait_for_load_state("networkidle")
        await page.click("#profile-btn")
        await page.fill("#pm-username", "Hustler99")
        await page.click('.avatar-chip[data-avatar="SL"]')
        await page.click("#pm-save")
        await page.click("#menu-add")
        await page.wait_for_selector("#screen-wallet:not(.hidden)")
        await page.click('[data-goto="menu"]')
        await page.click('[data-goto="practice"]')
        await page.wait_for_selector("#screen-game:not(.hidden)")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
