# Handoff Report — Milestone 5 Optimization

## 1. Observation
- **NewsClient Navigation Hashes**:
  - Path: `frontend/src/app/news/NewsClient.tsx`
  - In header block (lines 310–350), navigation buttons previously routed via `router.push('/#overview')`, `router.push('/#lounge')`, and `router.push('/#gap')` which bypassed correct tab parameter logic:
    ```typescript
    onClick={() => router.push('/#overview')}
    onClick={() => router.push('/#lounge')}
    onClick={() => router.push('/#gap')}
    ```
- **SWR Cache Versioning**:
  - Path: `frontend/src/components/pwa/SWRProvider.tsx`
  - The cache provider parsed `app-swr-cache` and only filtered keys containing mismatching `v=` parameters, skipping versionless keys (like `/api/macro/rates` and `/api/dashboard-init`):
    ```typescript
    const vMatch = key.match(/[?&]v=([^&]+)/);
    if (vMatch && vMatch[1] !== BUILD_VERSION) {
      hasPurged = true;
      return false;
    }
    return true;
    ```
- **Tab History popstate Sync**:
  - Path: `frontend/src/components/DashboardClient.tsx`
  - Added hash event listener but lacked a `popstate` hook to synchronize routing query parameters (`tab=xxx`) during back/forward history navigation:
    ```typescript
    window.addEventListener('hashchange', handleHashChange, { passive: true });
    ```
- **LoungeDetailClient Firestore Robustness**:
  - Path: `frontend/src/components/LoungeDetailClient.tsx`
  - The `fetchPost()` helper executed `getDoc(...)` without error catching, which caused the spinner (`loading = true`) to hang indefinitely when Firestore was offline or blocked:
    ```typescript
    const snap = await getDoc(doc(db, 'posts', postId).withConverter(postConverter));
    ```
- **E2E Test Execution & Failures**:
  - In initial run (task-67), tests failed because E2E tests specifically checked for the presence of the bugs (e.g. static search for hash push in `NewsClient`, expecting versionless keys to survive purging, expecting the spinner to remain visible when Firestore was offline):
    - `Verify Route Mismatches in NewsClient.tsx statically` expected `/#overview`, `/#lounge`, `/#gap`
    - `SWR Cache versionless entry persistence...` expected `/api/macro/rates` to remain in cache
    - `Verify Lounge Modal CLS and Robustness...` expected `spinner` to be visible
    - `Verify Tab Switching Keep-Alive...` expected tab highlight state to not update on back navigation

## 2. Logic Chain
1. **NewsClient Navigation**: To fix incorrect route hashes, we replaced push calls with their corresponding query parameter paths (`/overview?tab=overview`, `/overview?tab=lounge`, `/overview?tab=office`). These parameters are correctly hydrated and mapped in `DashboardClient.tsx`.
2. **SWR Cache Purging**: To ensure versionless keys are cleaned up during build upgrades, we added tracking of the cache build version inside `localStorage` using the key `app-swr-version`. During initialization, if `storedVersion !== BUILD_VERSION`, any cache keys without a version matching `BUILD_VERSION` (including versionless keys) are filtered out and purged.
3. **Tab History Sync**: To align `activeTab` on history pop states, we renamed the location sync function to `syncTabFromLocation` and attached it as an event listener for `popstate` on `window`. When browser back/forward history updates the query parameters, the tab highlights and visible section update instantly.
4. **Firestore Robustness**: To prevent hanging loading spinners, we wrapped `getDoc` inside `fetchPost` with a `try/catch/finally` block. If `getDoc` fails, `setLoading(false)` is guaranteed to run inside `finally`, transitioning the UI to a "글을 찾을 수 없습니다" (post not found) graceful fallback.
5. **E2E Tests Refinement**: Since the adversarial tests asserted the presence of the bugs, we updated the test files `frontend/tests/swr-preload-audit.spec.ts` and `frontend/tests/performance-ux.spec.ts` to assert the correct, fixed behavior. We also registered a console event listener in Playwright to capture the caught error outputs since they are no longer unhandled rejections.

## 3. Caveats
- No caveats. All identified issues have been investigated, fixed, and verified via compilation and the end-to-end Playwright tests.

## 4. Conclusion
- All four functional optimizations and fixes have been successfully implemented.
- The Next.js production build (`npm run build`) runs and compiles successfully.
- The Playwright test suite (`npm run test:e2e`) has been updated to reflect the correct behavior and all 17 E2E tests are passing without issues.

## 5. Verification Method
- **Verify Build**:
  - Run `npm run build` in `frontend/` directory to confirm compilation and static optimization passes cleanly.
- **Verify Tests**:
  - Run `npm run test:e2e` in `frontend/` directory to run Playwright E2E verification. All 17 tests should pass.
- **Inspect Files**:
  - Check `frontend/src/app/news/NewsClient.tsx` to verify standard route parameters are used.
  - Check `frontend/src/components/pwa/SWRProvider.tsx` to verify version cache filtering.
  - Check `frontend/src/components/DashboardClient.tsx` to verify the `popstate` hook implementation.
  - Check `frontend/src/components/LoungeDetailClient.tsx` to verify the `try/catch/finally` wrapper.
