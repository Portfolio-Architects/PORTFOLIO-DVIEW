const { chromium } = require('@playwright/test');
const path = require('path');

async function main() {
  console.log('Launching chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 }
  });
  const page = await context.newPage();

  // Listen to browser console logs
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] [${msg.type()}] ${msg.text()}`);
  });

  console.log('Navigating directly to Dongtan Lake Xi Prugio hash...');
  try {
    await page.goto('http://localhost:5000/#apt=%EB%8F%99%ED%83%84%EB%A0%88%EC%9D%B4%ED%81%AC%20%EC%9E%90%EC%97%B0%EC%95%A4%ED%91%B8%EB%A5%B4%EC%A7%80%EC%98%A4', { waitUntil: 'load', timeout: 30000 });
  } catch (e) {
    console.log('Navigation warning/timeout:', e.message);
  }

  console.log('Waiting 8 seconds for client-side calculations and data load...');
  await page.waitForTimeout(8000);

  // Take a screenshot to visually inspect the modal content
  const screenshotPath = 'C:/Users/ocs56/.gemini/antigravity/brain/4e3a2941-82e5-4188-9002-a628a0ae3a85/modal_screenshot.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to ${screenshotPath}`);

  await browser.close();
}

main().catch(console.error);
