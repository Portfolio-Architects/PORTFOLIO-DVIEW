# Code Changes Log

This document details the optimizations and fixes implemented for the edge cases identified by the Adversarial Challengers.

## 1. Fix NewsClient.tsx Navigation Hashes
- **File**: `frontend/src/app/news/NewsClient.tsx`
- **Modification**: Replaced incorrect hash-based routing in the main header navigation menu:
  - `router.push('/#overview')` updated to `router.push('/overview?tab=overview')` (데이터 랩 / 아파트 랩)
  - `router.push('/#lounge')` updated to `router.push('/overview?tab=lounge')` (커뮤니티 / 동탄 라운지)
  - `router.push('/#gap')` updated to `router.push('/overview?tab=office')` (큐레이션 / 사무실 탐색)
- **Rationale**: Aligns navigation actions with query parameters (`tab=xxx`), allowing the router/dashboard state to correctly interpret the targeted tab instead of falling back to broken anchor hashes.

## 2. Fix SWR Cache Versioning & Purging
- **File**: `frontend/src/components/pwa/SWRProvider.tsx`
- **Modification**:
  - Implemented SWR cache version tracking using `app-swr-version` key in `localStorage`.
  - Added a check in `getCache()`: if `storedVersion !== BUILD_VERSION`, it purges the entire SWR cache (`app-swr-cache`) from `localStorage` and resets the tracker.
  - Added saving of `app-swr-version` to `localStorage` in the `syncToLocalStorage()` operation.
- **Rationale**: Ensures versionless API keys (like `/api/macro/rates` and `/api/dashboard-init`) that do not have `?v=` suffix are properly cleared on build upgrades, preventing stale cache persistence.

## 3. Fix Tab History popstate Sync
- **File**: `frontend/src/components/DashboardClient.tsx`
- **Modification**:
  - Renamed the hash event listener function to `syncTabFromLocation`.
  - Added `popstate` event listener alongside `hashchange` to sync tab state: `window.addEventListener('popstate', syncTabFromLocation, { passive: true });`.
  - Cleaned up the `popstate` event listener inside the effect's return block.
- **Rationale**: Ensures that when user navigates using back/forward buttons (causing `popstate` to fire due to query parameter updates), `activeTab` is synchronized properly.

## 4. Fix LoungeDetailClient.tsx Firebase Robustness
- **File**: `frontend/src/components/LoungeDetailClient.tsx`
- **Modification**:
  - Wrapped the Firestore `getDoc` query within `fetchPost` in a `try/catch/finally` block.
  - Moved `setLoading(false)` into the `finally` block (executing only if the component remains mounted / `active` is true).
- **Rationale**: Gracefully catches Firestore exceptions (e.g. when network is offline/blocked), ensuring that the spinner does not lock up permanently.
