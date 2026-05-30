const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const loggedMetrics = [];
  
  // Intercept console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[METRICS_CHECK]')) {
      console.log(text);
    }
  });

  // Inject script to monitor the props of FieldReportModal or resolvedReport
  // We can just add a console.log inuseApartmentDetails.ts or check the DOM.
  // Wait, let's look at the DOM structure of ApartmentModal.
  // In ApartmentModal, the category items are inside:
  // "학원 · 500m 반경" box and "음식점·카페·500m" box.
  // Let's print the category list content for a few apartments.

  const testApts = [
    "동탄역 예미지 시그너스",
    "동탄 레이크 자연앤푸르지오",
    "동탄역 시범 더샵 센트럴시티",
    "동탄역 시범 한화꿈에그린 프레스티지"
  ];

  for (const apt of testApts) {
    console.log(`Testing apartment: ${apt}`);
    const hash = encodeURIComponent(apt);
    await page.goto(`http://localhost:5000/#apt=${hash}`);
    await page.waitForTimeout(5000); // wait 5s for SWR idle fetch to load location scores

    // Click the "단지 입지정보" tab to trigger scroll / rendering if needed
    try {
      const tabButton = await page.locator('button:has-text("단지 입지정보")');
      if (await tabButton.count() > 0) {
        await tabButton.click();
        await page.waitForTimeout(1000);
      }
    } catch(e) {
      console.log('Tab click failed:', e.message);
    }

    // Inspect the DOM for category items
    const categoryItemsCount = await page.evaluate(() => {
      // Find all divs with text "개" or categories
      const elements = Array.from(document.querySelectorAll('span, div'));
      // Let's see if there are category items. 
      // The category list items have class like "text-[11px]" or text containing "개" inside the info box
      const categories = elements.filter(el => el.textContent.includes('입시') || el.textContent.includes('카페') || el.textContent.includes('학원'));
      return categories.map(el => el.innerText.trim()).slice(0, 10);
    });

    console.log(`Apartment: ${apt} - DOM Category strings found:`, categoryItemsCount);
  }

  await browser.close();
}

main().catch(console.error);
