const { chromium } = require('@playwright/test');
const path = require('path');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Listen to browser console logs
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[DEBUG]') || text.includes('error') || text.includes('Error')) {
      console.log(`[BROWSER CONSOLE] ${text}`);
    }
  });

  console.log('Navigating to local D-VIEW dev server...');
  // Navigate directly with hash to trigger modal
  await page.goto('http://localhost:5000/#apt=%EB%8F%99%ED%83%84%EC%83%81%EB%85%B9%EC%98%88%EA%B0%80', { waitUntil: 'networkidle' });
  
  console.log('Waiting 3 seconds for initial load...');
  await page.waitForTimeout(3000);

  console.log('Navigating to Yeamiji Cygnus...');
  await page.goto('http://localhost:5000/#apt=%EB%8F%99%ED%83%84%EC%97%AD%20%EC%98%88%EB%AF%B8%EC%A7%80%20%EC%8B%9C%EA%B7%B8%EB%84%88%EC%8A%A4', { waitUntil: 'networkidle' });

  console.log('Waiting 5 seconds for SWR location scores load...');
  await page.waitForTimeout(5000);

  // Take a screenshot to visually inspect the modal content
  const screenshotPath = path.resolve(__dirname, '../artifacts/modal_screenshot.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to ${screenshotPath}`);

  await browser.close();
}

main().catch(console.error);
