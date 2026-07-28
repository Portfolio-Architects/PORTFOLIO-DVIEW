# R3 & R4 Comprehensive Analysis & Implementation Strategy Report

**Explorer ID**: Explorer 3  
**Date**: 2026-07-28  
**Project Root**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW`  
**Working Directory**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_self_improvement_run_6_3`  
**Target Requirements**: R3 (Network Latency / Offline Defense & Auto-Sync) & R4 (Automated Benchmarks & Regression Suite)

---

## 1. Executive Summary & Health Baseline

### 1.1 Baseline Test & Build Status
- **Jest Unit/Integration Test Suite**: `npm test` passed **100%** (45 test suites passed, 316 tests passed, 0 failed, 0 skipped, time: 13.385s).
- **Next.js Production Build**: `npm run build` runs `sync-transactions.js`, `update-sw-version.js`, and Turbopack Next.js compilation (`✓ Compiled successfully`).

---

## 2. R3: Network Latency / Offline Defense & Auto-Sync Investigation

### 2.1 Service Worker Inspection (`frontend/public/sw.js`)
- **Current Cache Strategy**:
  - `Static Assets` (`/_next/`, images, fonts): Cache-First with network fallback.
  - `Static Data & JSON` (`/data/*.json`, `/tx-data/*.json`): Stale-While-Revalidate (SWR) with `DYNAMIC_CACHE_NAME`.
  - `Default GET Requests`: Network-First, falling back to dynamic cache and `/offline.html` for HTML navigation.
  - `Background Sync`: Event listener for `sync-mutations` tag using IndexedDB store (`dview-offline-db` / `sync-queue`).
- **Critical Gaps Identified**:
  1. **API Endpoint Bypass**: Lines 87-97 explicitly bypass SW caching for all `/api/` requests (`url.pathname.startsWith('/api/')`). On offline or high-latency networks (e.g. 3G/Slow 4G), API calls fail immediately or hang, providing no cached response or offline fallback.
  2. **Excluded Key Static Asset**: Line 116 explicitly excludes `tx-summary.json` from SWR caching (`!url.pathname.includes('tx-summary.json')`). If offline, fetching summary transaction data fails.
  3. **Browser Compatibility Limitation for Background Sync**: `self.addEventListener('sync')` only works in Chromium browsers (Chrome/Edge Desktop & Android). iOS Safari does not support `SyncManager`, relying solely on foreground reconnection events in `PWAProvider.tsx`.

### 2.2 SWR Configuration & Offline Storage (`SWRProvider.tsx`, `useNetworkStatus.ts`, `offlineQueue.ts`)
- **Current Implementation**:
  - `useNetworkStatus.ts` uses `useSyncExternalStore` with `navigator.onLine` and `online`/`offline` window events.
  - `SWRProvider.tsx`:
    - Configures `revalidateOnFocus: false`, `revalidateOnReconnect: isOnline`, `shouldRetryOnError: isOnline`, `errorRetryCount: 3`, `dedupingInterval: 30000`.
    - Persists static data SWR entries into `localStorage` (`app-swr-cache`) on `pagehide` and restores on mount, purging mismatched build versions.
  - **Critical Gaps Identified**:
    1. `localStorage` SWR caching is limited to hardcoded paths (`/data/`, `/api/apartments-by-dong`, `/api/location-scores`, `/api/dashboard-init`, `/api/macro/`). Dynamic requests (such as `/tx-data/[aptKey].json` transaction details, search auto-suggest, or sub-route data) are not stored in persistent offline storage.
    2. When offline, uncached SWR hooks return `undefined` data and set `error`, triggering unhandled render errors or blank screens if component-level fallback placeholders are missing.
    3. No visual indicator for "Stale Data / Offline Mode" during network drops or 3G slow connections (only a modal when offline cache exceeds 24 hours).

### 2.3 Skeleton Loaders & Error Boundaries
- **Skeleton Component Inventory**:
  - Existing: `ApartmentModalSkeleton.tsx` in `frontend/src/components/ui/`.
  - **Gaps Identified**: Missing skeleton components for TechnoValley dashboard, Macro Trend chart, Lounge feed, and Explore tab calculators. Under slow 3G/offline conditions, these views display blank areas, layout shifts, or plain text loading indicators.
- **Error Boundary Inventory**:
  - `app/error.tsx`, `app/global-error.tsx`, `components/ui/ErrorBoundary.tsx`, and `components/common/ChartErrorBoundary.tsx`.
  - **Gaps Identified**: Not all page sections (e.g. TechnoValley sub-cards, Lounge Feed items, Explore tab tools) are wrapped with error boundaries. A network fetch failure in one component can crash the entire page.

---

## 3. R4: Automated Performance Benchmarks & Regression Suite Investigation

### 3.1 Existing Benchmark & Test Infrastructure
- **Playwright Test Suites** (`frontend/tests/`):
  - 9 spec files (`badge-accessibility.spec.ts`, `dashboard.spec.ts`, `login-e2e.spec.ts`, `m2-edge-cases.spec.ts`, `m2-performance-contract.spec.ts`, `performance-ux.spec.ts`, `routing-bug.spec.ts`, `swr-preload-audit.spec.ts`, `ui-ux-audit.spec.ts`).
  - `performance-ux.spec.ts` & `m2-performance-contract.spec.ts` contain partial performance assertions (e.g., CLS < 0.05, route navigation < 100ms).
- **Audit Pipeline** (`frontend/scripts/audit-pipeline.js`):
  - Runs TypeScript check, ESLint, Jest unit tests, Data consistency check, Bundle size check, Playwright E2E tests, and Firestore cost audit.

### 3.2 Critical Gaps Identified in Benchmark Infrastructure
- **Missing Dedicated Automated Benchmark Runner (`frontend/scripts/benchmark.ts`)**:
  - There is currently no unified, automated benchmark script (`npm run benchmark` or `npx ts-node scripts/benchmark.ts`) that programmatically collects and enforces performance metrics:
    1. **FPS Benchmarking**: Target >= 60 FPS during continuous interactive operations (scrolling, modal open/close, tab switching).
    2. **CLS Benchmarking**: Target < 0.01 layout shift across major route transitions and chart renders.
    3. **Heap Memory Growth Benchmarking**: Target Heap growth <= 5% (Zero memory leak threshold) after 10 continuous re-renders/modal opens using Chrome DevTools Protocol (`performance.memory` or CDP `JSHeapUsedSize`).
  - Without `scripts/benchmark.ts`, performance regression testing cannot be run deterministically in CI or local verification loops.

---

## 4. Proposed Implementation Strategy for Implementer

### 4.1 R3 Implementation Strategy (Network Latency / Offline Defense & Auto-Sync)
1. **Service Worker (`public/sw.js`) Enhancement**:
   - Update fetch event handler to provide network-first with stale fallback for selected non-auth `/api/` endpoints (`/api/dashboard-init`, `/api/location-scores`, `/api/local-notices`).
   - Include `tx-summary.json` in SWR caching policy while maintaining fresh validation.
2. **Offline & Stale UI Indicator**:
   - Create a lightweight `OfflineBanner` component or toast notify when the browser goes offline or serves stale cached data.
   - Enhance SWRProvider to return fallback cached structures gracefully when offline.
3. **Comprehensive Skeleton Components & Error Boundary Wrapping**:
   - Add Skeleton components for TechnoValley (`TechnoValleySkeleton.tsx`), Macro Dashboard (`MacroDashboardSkeleton.tsx`), and Lounge (`LoungeSkeleton.tsx`).
   - Wrap key view sections in `ErrorBoundary` to isolate render errors during network drops.
4. **Auto-Reconnection Synchronization**:
   - Ensure `PWAProvider.tsx` triggers `retryOfflineRequests()` on `online` event and triggers SWR revalidation (`mutate()`) across active keys seamlessly.

### 4.2 R4 Implementation Strategy (Automated Performance Benchmark Script & Suite)
1. **Create `frontend/scripts/benchmark.ts`**:
   - Implement a Playwright Node script (`npx ts-node scripts/benchmark.ts`) that launches Chrome with CDP enabled (`--remote-debugging-port`).
   - Profile the app under simulated interactions (10 continuous route transitions, modal opens/closes, chart re-renders).
   - Programmatically measure:
     - **FPS**: Sample `requestAnimationFrame` timing over interaction loops (verify FPS >= 60).
     - **CLS**: Observe PerformanceObserver `layout-shift` entries (verify total CLS < 0.01).
     - **Heap Memory**: Measure `JSHeapUsedSize` via CDP before and after 10 iterations (verify growth <= 5%).
2. **Package Script Command**:
   - Add `"benchmark": "ts-node -P scratch/tsconfig.test.json scripts/benchmark.ts"` to `package.json`.
3. **Integrate with `audit-pipeline.js`**:
   - Include benchmark runner in `audit-pipeline.js` so `npm run audit` runs automated performance benchmarking alongside Jest and Playwright E2E suites.

---

## 5. Verification Method for Implementer
1. Run `npm test` to verify Jest unit tests pass 100%.
2. Run `npm run build` to verify Next.js build succeeds with 0 errors.
3. Run `npm run benchmark` (once implemented) to verify FPS >= 60, CLS < 0.01, Heap Growth <= 5%.
4. Test offline mode in browser dev tools (Disable Network) to verify Skeleton loaders, Offline Toast Banner, and offline mutation queue replay operate without errors.
