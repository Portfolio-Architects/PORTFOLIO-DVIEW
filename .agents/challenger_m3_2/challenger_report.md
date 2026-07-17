# D-VIEW Performance Verification Report (Challenger 2)

This report presents an empirical analysis of the frontend performance optimizations, verification of SWR caching and preloading strategies, and evaluation of Next.js production build times and E2E test runs.

---

## 1. SWR Preloaded Data Caching Verification

We audited the preloaded assets list in `SWRProvider.tsx` against the actual `useSWR` calls made in the application. SWR keys are compared with strict equality; any mismatch in query parameters or path structure results in a cache miss, triggering duplicate network fetches.

### SWR Key Mapping Analysis

| Preload Target in `SWRProvider.tsx` | Actual Client Fetch Key & Source File | Cache Outcome | Details & Impact |
| :--- | :--- | :--- | :--- |
| `/data/location-scores.json` | `/data/location-scores.json?v=${BUILD_VERSION}`<br>`useStaticData.ts:486` | **MISS** (Duplicate Fetch) | Strict equality check fails due to the missing version query param (`?v=...`) in the preload target. Triggers duplicate fetch on page mount. |
| `/api/local-notices?dongtan=true` | `/api/local-notices?dongtan=true`<br>`NewsClient.tsx:188` | **HIT** | Hits preloaded cache on the news page. |
| | `/api/local-notices`<br>`LocalEventCuration.tsx:96`<br>`LoungeContainerClient.tsx:208`<br>`MacroDashboardClient.tsx:588` | **MISS** (Duplicate Fetch) | Main landing pages query notices without the query parameter. SWR treats `/api/local-notices` as a different key, bypassing preloading. |
| `/api/apartments-by-dong` | `/api/apartments-by-dong`<br>`admin/page.tsx:231` | **HIT** (Redundant) | Hits cache on the admin page. However, this is preloaded for *all users* on idle time, causing wasteful database queries for 99.9% of users who never visit the admin page. |
| `/api/dashboard-init` | `/api/dashboard-init`<br>`useDashboardMeta.ts:162` | **HIT** (Redundant when SSR is active) | SWR preloads this key unconditionally. When Next.js successfully passes initial SSR dashboard data, the client-side fetch is skipped by the hook (`shouldFetchInit` is false). Thus, SWR triggers a redundant background request anyway, wasting server CPU. |
| `/api/macro/rates` | `/api/macro/rates`<br>`AdvancedValuationMetrics.tsx:228` | **HIT** | Successfully hits cache when the user opens the valuation metrics module in the apartment detail modal. |
| `/api/macro/news?limit=40` | `/api/macro/news?limit=40`<br>`NewsClient.tsx:177` | **HIT** | Hits cache on the news client tab. |
| | `/api/macro/news`<br>`LoungeContainerClient.tsx:214` | **MISS** (Duplicate Fetch) | Lounge container requests news without the limit query parameter, triggering a duplicate fetch. |

### Caching Strategy Findings
1. **Query Parameter Mismatch**: The use of dynamic versions `?v=${BUILD_VERSION}` on `/data/location-scores.json` in hooks conflicts with the versionless preload target, invalidating the preload cache.
2. **Key Inconsistency**: Some components query endpoint resources (e.g. `/api/local-notices`, `/api/macro/news`) without the query parameters configured in the preload target list, triggering duplicate requests on mount.
3. **Wasteful/Unnecessary Preloading**: 
   - Admin-only routes (`/api/apartments-by-dong`) are preloaded on the public PWA initialization.
   - SSR-hydrated endpoints (`/api/dashboard-init`) are preloaded unconditionally, which triggers redundant client-side calls that cancel out SSR performance benefits.

---

## 2. E2E Test Suite Analysis

We executed the Playwright E2E suite (`npm run test:e2e`). All 10 test scenarios eventually succeeded, though 2 were marked as flaky.

### Test Metrics
- **Tests Passed**: 8/10 on the first attempt.
- **Flaky Tests**: 2/10 (succeeded on retry #1).
  - `tests\login-e2e.spec.ts` (Mock Login & Profile button visibility validation)
  - `tests\routing-bug.spec.ts` (MOBILE: should navigate from news page to curation page correctly via MobileDock)
- **Total Execution Time**: 2.8 minutes.

### Console Errors & Warnings
1. **Browser Error (Storage Restriction)**:
   ```log
   [BROWSER ERROR] Failed to read the 'localStorage' property from 'Window': Access is denied for this document.
   ```
   *Diagnosis*: This occurred in Playwright environments when attempting to read/write from `localStorage` before full context hydration, or due to iframe sandbox restrictions. SWRProvider caught this error gracefully via its `try...catch` block.
2. **Connection Refusal (Startup Lag)**:
   ```log
   Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5000/news
   ```
   *Diagnosis*: The Next.js dev server took slightly longer to start and listen under parallel CPU stress, causing Playwright's initial browser navigation to `/news` to fail. The retry passed once the server was warmed up.
3. **Firebase Warnings (Test Mocks)**:
   ```log
   [BROWSER CONSOLE] log: Local development: App Check token exchange skipped since NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN is not configured.
   ```
   *Diagnosis*: Normal behavior during local/test runs without environment secrets.
4. **Jest Async Leak Warning**:
   ```log
   Cannot log after tests are done. Did you forget to wait for something async in your test?
   ```
   *Diagnosis*: Occurred during Jest unit tests in `src/lib/services/logger.test.ts` due to unawaited background log calls.

---

## 3. Production Build Performance Analysis

We executed `npm run build` to compile the Next.js production site with Turbopack.

### Build Metrics
- **Total Build Time**: ~52 seconds.
- **Turbopack Compile**: 16.6 seconds.
- **TypeScript Checking**: 24.8 seconds.
- **Static Page Generation (181 routes)**: 10.3 seconds.

### Build Warnings
1. **NFT (Next File Trace) Warning**:
   ```log
   Encountered unexpected file in NFT list. A file was traced that indicates that the whole project was traced unintentionally.
   Import trace:
     App Route:
       ./frontend/next.config.ts
       ./frontend/src/lib/utils/server/fileReader.ts
       ./frontend/src/app/api/transaction-summary/route.ts
   ```
   *Impact*: Next.js traced the entire project folder during build because of generic/dynamic filesystem operations in `fileReader.ts` and `next.config.ts`, increasing the final output trace footprint.
2. **Dynamic Route Warnings**:
   ```log
   Dynamic server usage: Route /apartment/[aptName] couldn't be rendered statically because it used await searchParams
   ```
   *Impact*: Normal Next.js fallback behavior for routes utilizing dynamic headers/searchParams. These routes successfully fall back to dynamic on-demand server rendering (`ƒ`).
3. **Custom Cache-Control Header Warning**:
   ```log
   Warning: Custom Cache-Control headers detected for the following routes: /_next/static/:path*
   Setting a custom Cache-Control header can break Next.js development behavior.
   ```
   *Impact*: Harmless in production builds. Next.js warns because overriding default Next.js header controls can break HMR refresh in local dev environments.

---

## 4. Recommendations for Performance Improvement

1. **Synchronize SWR Keys**: Add the version query string `?v=${BUILD_VERSION}` to the `/data/location-scores.json` target in `SWRProvider.tsx`, or standardize hooks to call it without query variables when PWA service-worker cache matching isn't required.
2. **Differentiate Preload Target List**: Adjust target preloads to match actual client hook queries (e.g. preload `/api/local-notices` and `/api/macro/news` if they are the primary queries used on the landing dashboard).
3. **Remove Admin Preloads**: Remove `/api/apartments-by-dong` from the main `SWRProvider.tsx` background preloader target list. Preload this endpoint dynamically only on the `/admin` path.
4. **Conditional SSR Preload**: Disable background preloading for `/api/dashboard-init` if initial HTML state (`initialDashboardData`) has already loaded.
5. **Optimize Next NFT Traces**: Statically scope filesystem operations in `fileReader.ts` to prevent Next.js trace analyzer from scanning the entire project directory.
