## 2026-07-17T16:04:40Z

You are the Milestone 5 Optimization Worker. Your working directory is c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m5\.
Your mission is to implement fixes for the edge cases identified by the Adversarial Challengers:

1. **Fix NewsClient.tsx Navigation Hashes**:
   - Inspect the navigation and links in `frontend/src/app/news/NewsClient.tsx`. Ensure links/buttons route correctly to `/overview?tab=xxx` rather than incorrect hashes.

2. **Fix SWR Cache Versioning**:
   - In `frontend/src/components/pwa/SWRProvider.tsx`, ensure that the cache versioning/purging mechanism clears versionless keys (like `/api/macro/rates` and `/api/dashboard-init`) upon build version upgrades, or align these keys with `BUILD_VERSION` to prevent stale cache persistence.

3. **Fix Tab History popstate Sync**:
   - In `frontend/src/components/DashboardClient.tsx`, add a `popstate` event listener (or intercept routing state changes) to keep the `activeTab` synchronized when the user navigates back/forward (e.g. going back from `/overview?tab=office` to `/overview` or vice versa).

4. **Fix LoungeDetailClient.tsx Firebase Robustness**:
   - In `frontend/src/components/LoungeDetailClient.tsx`, wrap the Firestore document fetch (`getDoc(...)`) in a `try/catch` block. If the fetch throws (e.g. when offline or blocked), set `loading` to false and handle the error gracefully so the spinner does not lock up permanently.

5. **Verify Build & Tests**:
   - Run `npm run build` in `frontend/` to check production compile.
   - Run `npm run test:e2e` in `frontend/` to ensure Playwright tests (including the new adversarial tests) are passing.
   - Document changes in `changes.md` and verification results in `handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
