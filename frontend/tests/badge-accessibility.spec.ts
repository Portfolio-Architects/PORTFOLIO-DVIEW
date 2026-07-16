import { test, expect } from '@playwright/test';

test.describe('Lounge Feed Badge Accessibility', () => {
  test('should render badges and handle keyboard focus & navigation correctly', async ({ page }) => {
    // Enable browser console logging
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[BROWSER ERROR] ${err.message}`));

    // Intercept client-side fetch calls to /api/posts to supply our target mock posts with badges
    await page.route('**/api/posts*', async (route) => {
      const mockPosts = [
        {
          id: 'post_apt_e2e_1',
          title: '동탄 아파트 단지 탐방',
          summary: '아파트 단지 정보와 실거래 분석',
          imageUrl: null,
          category: '임장기',
          author: '테스터1',
          meta: '방금 전',
          views: 5,
          likes: 1,
          commentCount: 0,
          createdAt: Date.now(),
          apartmentName: '동탄역 시범대원칸타빌' // triggers Apartment Lab badge
        },
        {
          id: 'post_techno_e2e_1',
          title: '테크노밸리 지식산업센터 사무실 매칭 정보', // contains keywords to trigger isTechnoRelated
          summary: '세금 감면 혜택과 취득세 감면 공동임차',
          imageUrl: null,
          category: '임장기',
          author: '테스터2',
          meta: '방금 전',
          views: 12,
          likes: 2,
          commentCount: 1,
          createdAt: Date.now() - 60000
        }
      ];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ posts: mockPosts }),
      });
    });

    // Dismiss welcome modal and ad block banner using localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('dview-welcome-seen', 'true');
      window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
    });

    // Navigate to lounge page
    await page.goto('/lounge');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // wait for hydration and revalidation

    // Click on "아파트 이야기" tab to show our mock posts (since default is "공동임차 매칭")
    const aptStoryTab = page.locator('button').filter({ hasText: '아파트 이야기' });
    await expect(aptStoryTab).toBeVisible();
    await aptStoryTab.click();
    await page.waitForTimeout(500);

    // 1. Verify Apartment Lab badge rendering and accessibility attributes
    const aptBadge = page.locator('[title="클릭 시 아파트 랩 실거래 지도로 이동"]');
    await expect(aptBadge).toBeVisible();
    await expect(aptBadge).toHaveAttribute('role', 'link');
    await expect(aptBadge).toHaveAttribute('tabindex', '0');
    
    // Check focus styles in class name
    const aptClassName = await aptBadge.getAttribute('class') || '';
    expect(aptClassName).toContain('outline-none');
    expect(aptClassName).toContain('focus:ring-1');

    // 2. Verify Techno Lab badge rendering and accessibility attributes
    const technoBadge = page.locator('[title="클릭 시 테크노 랩 사무실 탐색으로 이동"]');
    await expect(technoBadge).toBeVisible();
    await expect(technoBadge).toHaveAttribute('role', 'link');
    await expect(technoBadge).toHaveAttribute('tabindex', '0');
    
    // Check focus styles in class name
    const technoClassName = await technoBadge.getAttribute('class') || '';
    expect(technoClassName).toContain('outline-none');
    expect(technoClassName).toContain('focus-visible:ring-2');

    // 3. Test keyboard navigation: press Enter on the Techno Lab badge
    await technoBadge.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL(url => url.toString().includes('/overview'), { timeout: 5000 });
    // Expect URL to change to the office tab of overview
    expect(page.url()).toContain('/overview?tab=office');

    // 4. Test keyboard navigation: press Space on the Apartment Lab badge
    await page.goto('/lounge');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await aptStoryTab.click();
    await page.waitForTimeout(1000);
    
    const aptBadge2 = page.locator('[title="클릭 시 아파트 랩 실거래 지도로 이동"]');
    await expect(aptBadge2).toBeVisible();
    await aptBadge2.focus();
    await page.keyboard.press('Space');
    await page.waitForURL(url => url.toString().includes('/overview'), { timeout: 5000 });
    // Expect URL to change to the apartment overview
    expect(page.url()).toContain('/overview#apt=');
  });
});
