## 2026-07-18T00:19:59Z
You are the Optimization Worker. Your working directory is c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_optimizations\.
Your mission is to implement UX and performance optimizations in D-VIEW web application, covering Milestones M2 and M3.

Specifically, implement the following changes in the codebase:

1. **Fix Prefetch Redundancy**:
   - In `frontend/src/components/LoungeHeader.tsx`, remove manual `onMouseEnter` and `onTouchStart` handlers that programmatically call `router.prefetch('/')` or other routes on Links that already have `prefetch={true}` (or default prefetch).
   - In `frontend/src/components/DashboardClient.tsx`, similarly remove redundant prefetch handlers.

2. **Fix Prefetch Gaps**:
   - In `frontend/src/components/DashboardClient.tsx`, for the "아파트 탐색" tab button, add `onMouseEnter={() => router.prefetch('/explore')}` and `onTouchStart={() => router.prefetch('/explore')}` to enable programmatic prefetching on hover/touch before routing.
   - In `frontend/src/app/news/NewsClient.tsx`, check for any buttons with `onClick={() => router.push('/explore')}` and add programmatic prefetching handlers.

3. **Fix SWR / Caching Mismatches**:
   - In `frontend/src/components/pwa/SWRProvider.tsx`, update the preload targets array:
     - Change `'/api/macro/news'` to `'/api/macro/news?limit=40'`
     - Change `'/api/local-notices'` to `'/api/local-notices?dongtan=true'`
   - In `frontend/src/components/consumer/AdvancedValuationMetrics.tsx`, import `useSWR` from `'swr'` and replace the native `fetch('/api/macro/rates')` call in `useEffect` with `useSWR('/api/macro/rates')` to utilize the SWR cache and deduplicate network requests. Update component state accordingly when SWR data is fetched.
   - In `frontend/src/hooks/useDashboardMeta.ts`, import `useSWR` from `'swr'` and replace the native `fetch('/api/dashboard-init')` call with `useSWR('/api/dashboard-init')` (or SWR preload cache reading) to leverage SWR caching instead of bypassing it.

4. **Fix Tab Transitions and State Loss**:
   - In `frontend/src/components/DashboardClient.tsx`, change tab rendering from conditional unmounting to persistent CSS visibility:
     - Keep track of whether heavy tabs have been opened using local boolean state flags: `hasOpenedOverview` (initializes to `initialTab === 'overview'`), `hasOpenedOffice` (initializes to `initialTab === 'office'`), and `hasOpenedLounge` (initializes to `initialTab === 'lounge'`).
     - Use a `useEffect` that listens to `activeTab` to set `hasOpenedOverview`, `hasOpenedOffice`, or `hasOpenedLounge` to `true` when activated.
     - Inside `memoizedTabContents`, change the conditional rendering so components mount if `activeTab === '...' || hasOpened...` is true, but use CSS display (`block`/`hidden` on the section wrapper) to control visibility. This ensures they remain mounted once loaded, retaining state and scroll positions. Add these flags to the dependency array.

5. **Fix Modal CLS**:
   - In `frontend/src/components/LoungeDetailClient.tsx` (lines 760-775), adjust the loading and "not found" fallback states. When `isModal` is true, use `min-h-[300px]` instead of `min-h-screen` to prevent the modal container from stretching to 100vh on entry, eliminating Cumulative Layout Shift (CLS).

6. **Build & Test Verification**:
   - Run the production build command `npm run build` in `frontend/` and ensure it compiles successfully.
   - Run the Playwright E2E tests `npm run test:e2e` in `frontend/` and ensure all 10 tests pass.
   - Document all changes, exact commands run, and test outcomes in `changes.md` and `handoff.md` inside your directory.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
