# SWR Preloading and Duplicate Fetch Performance Audit Report

## Challenge Summary

**Overall risk assessment**: **LOW**

The SWR preloading key alignment and optimizations implemented are highly robust. Based on E2E testing, code auditing, and build verification, the preloaded static resources now hit the cache correctly, eliminating duplicate network fetches.

---

## Audited Implementation Details

### 1. Cache Key Realignment
- **`SWRProvider.tsx` Preload Target:** `/data/location-scores.json?v=${BUILD_VERSION}`
- **`useStaticData.ts` (Hook) Query Key:** `/data/location-scores.json?v=${BUILD_VERSION}`
- **Evaluation:** Both files import `BUILD_VERSION` from `src/lib/build-version.ts`. The keys match exactly, allowing SWR to correctly hit the preloaded data on hook mount.

### 2. Bandwidth Optimization
- `/api/apartments-by-dong` was removed from the background preloading array (`targets`) in `SWRProvider.tsx`.
- It is no longer preloaded globally for all clients, preventing unnecessary background resource usage for non-admin users.

---

## Challenges & Assumptions Checked

### [Low Risk] Challenge 1: Version String Mismatch between SWRProvider and useStaticData
- **Assumption challenged**: The build version query parameter `v` matches exactly between preloader execution and the hook query execution.
- **Attack scenario**: If the version was dynamically calculated or imported from different modules, or if client-side hydration did not have access to the same constant, there could be a mismatch (e.g. one key uses `?v=1784302919211` and the other uses `?v=undefined`). This would result in a cache miss and duplicate fetches.
- **Blast radius**: Cache miss on `location-scores.json`, triggering duplicate fetches and rendering the preloading effort useless.
- **Mitigation/Verification**: Verified that `BUILD_VERSION` is defined as a static string constant in `src/lib/build-version.ts` and imported by both components. Our E2E tests confirmed that only a single request was sent to the server containing the version suffix.

### [Low Risk] Challenge 2: Background Fetch Timing Window Races
- **Assumption challenged**: The Hook mounting sequence and preload execution do not trigger racing fetch calls.
- **Attack scenario**: The hook `useLocationScores` has an idle callback timeout of `150ms` (or `100ms` fallback), whereas the preloader `SWRProvider` has an idle callback timeout of `3000ms` (or `1500ms` fallback). If the hook triggers and initiates a request before the preloader fires, a race could occur.
- **Blast radius**: In a naive implementation, this could trigger dual requests. However, SWR's cache sharing and request deduplication mechanism (`dedupingInterval: 30000`) guarantees that if a request is already in-flight or exists in cache under the exact same key, SWR resolves it with the existing promise.
- **Mitigation/Verification**: Playwright E2E network monitoring confirmed that exactly 1 request was triggered for `location-scores.json`.

---

## E2E Verification & Stress Test Results

A Playwright E2E verification test (`frontend/tests/swr-preload-audit.spec.ts`) was created to monitor network request events and verify SWR provider config.

- **Scenario 1**: Load `/overview?tab=imjang` and monitor network request events for `location-scores.json` and `apartments-by-dong`.
  - **Expected Behavior**: Exactly 1 network request for `location-scores.json` using the `v=[BUILD_VERSION]` suffix, and no versionless requests.
  - **Actual Behavior**: 
    - Detected requests: `[ 'http://localhost:5000/data/location-scores.json?v=1784302919211' ]`
    - Versionless requests: `0`
    - Total requests count: `1`
  - **Status**: **PASS**

- **Scenario 2**: Audit the preload targets array in `SWRProvider.tsx`.
  - **Expected Behavior**: `/api/apartments-by-dong` is omitted from the preloading targets array.
  - **Actual Behavior**: Omitted. Targets list verified to contain only:
    1. `/data/location-scores.json?v=${BUILD_VERSION}`
    2. `/api/local-notices?dongtan=true`
    3. `/api/dashboard-init`
    4. `/api/macro/rates`
    5. `/api/macro/news?limit=40`
  - **Status**: **PASS**

---

## Unchallenged Areas
- **Service Worker offline caching and synchronization**: Offline service worker routing configuration and how it intercepts query parameters was not audited.
