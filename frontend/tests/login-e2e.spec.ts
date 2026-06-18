import { test, expect } from '@playwright/test';

test.describe('Login & Session Sync E2E Tests', () => {
  test('should handle mock login, profile loading, and logout successfully', async ({ page, context }) => {
    // 🚀 Mark test as slow and set timeout to 120 seconds to handle slow dev-server hydration during parallel runs
    test.slow();
    test.setTimeout(120000);

    // Enable browser console logging for E2E debugging
    page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[BROWSER ERROR] ${err.message}\nStack: ${err.stack}`));

    // 1. Inject Cookies to bypass Welcome Modal before loading
    await context.addCookies([
      {
        name: 'dview-welcome-seen',
        value: 'true',
        domain: 'localhost',
        path: '/',
      }
    ]);

    // 2. Inject E2E Mock Auth Bridge before page loads
    await page.addInitScript(() => {
      let authCallback: any = null;
      const mockUser = {
        uid: 'e2e-mock-user-777',
        email: 'tester@dview.kr',
        displayName: 'E2E테스터',
        photoURL: null,
        getIdToken: async () => 'mock-e2e-id-token', // Mock Firebase User method to prevent useFavorites runtime crash
      };

      (window as any).__E2E_MOCK_AUTH__ = {
        onAuthStateChanged: (callback: any) => {
          authCallback = callback;
          // Initial state: not logged in
          setTimeout(() => callback(null), 50);
          return () => {};
        },
        signIn: async () => {
          console.log('[E2E MOCK] signIn triggered');
          // Simulate network delay for login
          await new Promise(resolve => setTimeout(resolve, 500));
          if (authCallback) {
            authCallback(mockUser);
          }
        },
        signOut: async () => {
          console.log('[E2E MOCK] signOut triggered');
          // Simulate logout delay
          await new Promise(resolve => setTimeout(resolve, 300));
          if (authCallback) {
            authCallback(null);
          }
        }
      };

      // Set localStorage flags to bypass welcome modal, ad block banners, and briefing popups in init phase
      window.localStorage.setItem('dview-welcome-seen', 'true');
      window.localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
      window.localStorage.setItem('dview_briefing_popup_dismissed', Date.now().toString());
    });

    // 3. Go to the dashboard/home page
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // 4. Double ensure localStorage flags are set and reload
    await page.evaluate(() => {
      localStorage.setItem('dview-welcome-seen', 'true');
      localStorage.setItem('dview-adblock-banner-dismissed', Date.now().toString());
      localStorage.setItem('dview_briefing_popup_dismissed', Date.now().toString());
    });
    await page.reload();
    await page.waitForTimeout(3000); // 3 seconds wait for hydration and network stabilization under CPU stress

    // 5. Verify that the "로그인" button is visible initially (filtering for visible elements only)
    const loginButton = page.getByRole('button', { name: '로그인' }).filter({ visible: true }).first();
    await expect(loginButton).toBeVisible({ timeout: 30000 });

    // 6. Click the "로그인" button
    console.log('Clicking login button...');
    await loginButton.click();

    // 7. Verify that the avatar button (profile edit) becomes visible after login
    const profileButton = page.getByLabel('프로필 수정').filter({ visible: true }).first();
    await expect(profileButton).toBeVisible({ timeout: 40000 }); // Increase timeout to 40s to prevent flaky timeouts during parallel runs
    console.log('Login mock success: Profile button is visible.');

    // Wait a brief moment for state and DOM stability after mock login transitions
    await page.waitForTimeout(2000);

    // 8. Click the profile button to open the edit profile modal
    console.log('Opening profile modal...');
    await profileButton.click({ force: true });

    // 9. Verify that the logout button inside the modal is visible
    const logoutButton = page.getByRole('button', { name: '로그아웃' }).filter({ visible: true }).first();
    await expect(logoutButton).toBeVisible({ timeout: 30000 });

    // 10. Click the "로그아웃" button
    console.log('Clicking logout button...');
    await logoutButton.click({ force: true });

    // 11. Verify that the "로그인" button is visible again (logged out state)
    await expect(loginButton).toBeVisible({ timeout: 30000 });
    console.log('Logout success: Login button is visible again.');
  });
});
