# Comprehensive Analysis: Frontend Navigation & State Synchronization

**Project**: D-VIEW Refactoring  
**Milestone**: Milestone 1 (Explorer 1)  
**Target Path**: `frontend/`  
**Date**: 2026-07-22  

---

## Executive Summary

This report delivers a thorough read-only investigation of client-side route navigation performance, prefetching mechanisms, component header/dock state synchronization, SWR caching strategies, React Context architecture, service worker caching policies, and baseline command execution in `frontend/`.

---

## 1. Client Route Navigation & Prefetching Analysis

### 1.1 Main Routes Overview

| Route Key | Path / Strategy | Rendering Pattern & Revalidation | Component Entry Point | Data Fetching Pattern |
|---|---|---|---|---|
| **technovalley** | `/` (and `/technovalley` -> redirect `/`) | SSG / Dynamic with Suspense fallback | `app/page.tsx` -> `TechnoValleyClient` | Static JSON-LD SSR + Client SWR / dynamic fetch |
| **office** | `/overview?tab=office` | ISR (`revalidate = 3600`) | `app/overview/page.tsx` -> `DashboardClient` | Server `getInitialData()` + Client tab state |
| **lounge** | `/lounge` | Dynamic (`dynamic = 'force-dynamic'`) | `app/lounge/page.tsx` -> `LoungeContainerClient` | Server `Promise.all([posts, news, notices])` + Client SWR |
| **overview** | `/overview` | ISR (`revalidate = 3600`) | `app/overview/page.tsx` -> `DashboardClient` | Server `getInitialData()` + Client SWR / dynamic fetch |
| **imjang** | `/explore` | ISR (`revalidate = 600`) | `app/explore/page.tsx` -> `ExploreClient` | Server `getInitialData()` + Client data table |

### 1.2 Client Navigation & Prefetching Mechanisms

1. **Desktop Prefetching (`LoungeHeader.tsx`)**:
   - Uses Next.js `<Link prefetch={true}>` for all 5 main routes (`/`, `/overview?tab=office`, `/lounge`, `/overview`, `/explore`).
   - Ensures immediate chunk warming when hovering or approaching desktop navigation links.

2. **Mobile Bandwidth-Optimized Prefetching (`MobileDock.tsx`)**:
   - Explicitly sets `prefetch={false}` on mobile `<Link>` elements.
   - Attaches event-driven prefetching (`onMouseEnter={() => router.prefetch(href)}`, `onTouchStart={() => router.prefetch(href)}`).
   - Prevents aggressive mobile data consumption and avoids unnecessary CPU background thread contention during initial mobile renders.

3. **Background Idle Data Prefetching (`SWRProvider.tsx`)**:
   - Leverages `window.requestIdleCallback` (with a 3-second fallback timeout) to fetch essential static JSON datasets and API endpoints without blocking main thread rendering:
     - `/data/location-scores.json?v=${BUILD_VERSION}`
     - `/api/local-notices?dongtan=true`
     - `/api/dashboard-init`
     - `/api/macro/rates`
     - `/api/macro/news?limit=40`

4. **Component Chunk Preloading (`DashboardClient.tsx`)**:
   - Employs `preloadApartmentModal()` and `preloadDashboardFeatures()` inside production idle callbacks (`requestIdleCallback`) to pre-warm dynamic modal code chunks (`ApartmentModal`, `AptCompareModal`, `JeonseSafetyCalculator`).

---

## 2. Component Inspection: `LoungeHeader.tsx` vs `MobileDock.tsx`

### 2.1 Synchronization & Contract Verification

Unit tests in `src/components/HeaderDockSync.test.tsx` validate the contract agreement between `LoungeHeader` and `MobileDock`:
- Both components define identical 5 main navigation routes:
  1. `technovalley` (`/`, "테크노 랩")
  2. `office` (`/overview?tab=office`, "사무실 탐색")
  3. `lounge` (`/lounge`, "동탄 라운지")
  4. `overview` (`/overview`, "아파트 랩")
  5. `imjang` (`/explore`, "아파트 탐색")
- Active tab styling is grouped into two distinct visual themes:
  - **Techno Lab / Business Group** (`technovalley`, `office`, `lounge`): Blue highlight (`bg-hs-blue-light`, `text-hs-blue`).
  - **Apartment Lab / Residential Group** (`overview`, `imjang`): Orange highlight (`bg-hs-orange-light`, `text-hs-orange`).

### 2.2 Critical Inconsistencies & Bottlenecks

1. **State Mutation via `window.history.replaceState` vs Next Router Context**:
   - In `MobileDock.tsx` (lines 74-98), when `onTabClick` is supplied (i.e. within `DashboardClient`), clicking `overview` or `office` intercepts navigation, cancels default event behavior, calls `onTabClick(tab.id)`, and executes `window.history.replaceState(null, '', '/overview...')`.
   - In `DashboardClient.tsx` (lines 878-927), desktop header navigation also uses `<button>` with `window.history.replaceState`.
   - **Problem**: Direct call to `window.history.replaceState` mutates the browser URL bar without triggering Next.js App Router context re-evaluation. As a result, Next.js hooks like `useSearchParams()` or `usePathname()` do not automatically reflect search param updates unless custom `hashchange`/`popstate` listeners force a state update.

2. **Duplicated Desktop Header Implementation**:
   - `LoungeHeader.tsx` is rendered in standalone layouts (`/`, `/lounge`, `/explore`).
   - `DashboardClient.tsx` duplicates the desktop header DOM structure and CSS classes inline (lines 851-953) using `<button>` elements instead of reusing `<LoungeHeader>`.
   - **Risk**: Any styling or route change in `LoungeHeader.tsx` must be manually mirrored in `DashboardClient.tsx`, creating drift risk.

3. **Dual Rendering Paths for `/lounge`**:
   - `/lounge` exists as a dedicated server-rendered route (`app/lounge/page.tsx`).
   - `/overview?tab=lounge` or `/overview#lounge` mounts `<LoungeContainerClient>` inside `DashboardClient.tsx` with an empty initial post array (`initialPosts={EMPTY_ARRAY}`).
   - **Impact**: Navigating to `/lounge` directly displays server-preloaded posts immediately, whereas accessing Lounge via `/overview?tab=lounge` displays empty fallback skeletons while fetching data client-side.

---

## 3. SWR Caching, React Context & Service Worker Caching Policies

### 3.1 SWR Caching Strategy (`SWRProvider.tsx`)

- **Persistence Layer**: Implements a custom `Map` backed by `localStorage` (`app-swr-cache` and `app-swr-version`).
- **Version Eviction**: Automatically purges stale cache entries if `BUILD_VERSION` mismatch is detected or query parameter `?v=...` is outdated.
- **Request Deduplication**: Deduplication window set to `30,000 ms` (30 seconds) to prevent API hammering.
- **Focus Revalidation Disabled**: Sets `revalidateOnFocus: false` to avoid unexpected background network requests when users switch browser tabs or application windows.
- **Offline Guard**: Disables refresh intervals when `isOnline` is false and suppresses transient network error logs to avoid console pollution.

### 3.2 React Context Architecture

1. **`AuthContext.tsx`**:
   - Manages Firebase Auth state, Firestore user profiles (`getUserProfile`, `getOrCreateProfile`), and session cookie lifecycle (`/api/auth/session`).
   - Includes Playwright E2E mock authentication bridge (`__E2E_MOCK_AUTH__`) to enable fast, deterministic testing without live Firebase network dependencies.
2. **`SettingsContext.tsx`**:
   - Manages global settings: `theme` (`light` / `dark` / `system`) and `areaUnit` (`m2` / `pyeong`).
   - Uses Zod schemas (`AreaUnitSchema`, `ThemeSchema`) for runtime type validation.
   - Implements `safeGetItem`/`safeSetItem` try-catch guards to handle restricted browser sandbox environments (e.g. disabled cookies/localStorage).
   - Listens to `window.addEventListener('storage', ...)` to synchronize theme and unit settings across multiple open browser tabs in real-time.
   - De-coupled into `SettingsValueContext` and `SettingsUiContext` to prevent UI state changes (such as modal open/close) from triggering re-renders in components that only read settings values.
3. **`PWAProvider.tsx`**:
   - Handles `beforeinstallprompt` PWA events and manages custom A2HS modal display.

### 3.3 Service Worker Caching Policies (`public/sw.js`)

- **Cache-Control Header**: Configured in `next.config.ts` as `no-store, no-cache, must-revalidate, max-age=0` to ensure immediate service worker updates.
- **Bypass Rules**:
  - Development environments (`localhost`, `127.0.0.1`, ports 3000/5000) bypass SW caching completely for live hot-reload compatibility.
  - All `/api/*` endpoints bypass SW caching to ensure real-time data integrity.
- **Asset Caching Strategies**:
  - **Static Assets (`/_next/`, images, fonts)**: **Cache-First, Network Fallback** using `CACHE_NAME`.
  - **Static Data & JSON (`/data/*.json`, `/tx-data/*.json`)**: **Stale-While-Revalidate (SWR)** using `DYNAMIC_CACHE_NAME`. `tx-summary.json` is explicitly excluded from SWR caching to eliminate latency on heavy transaction summaries.
  - **Expiration Warning**: Serves timestamped headers (`x-sw-cached-at`) and posts a `CACHE_EXPIRED_WARNING` message to client windows if cache age exceeds 24 hours.
  - **Page Navigation**: **Network-First, Fallback to Cache**, and fallback to `/offline.html` if offline.
- **Offline Background Sync**:
  - Uses IndexedDB (`dview-offline-db`, `sync-queue` store) to queue failed POST/PUT API requests while offline.
  - Replays queued requests upon `sync-mutations` event using exponential backoff with random jitter (up to 5 retry attempts).
- **Web Push Notifications**:
  - Handles `push` events, renders native notification popups, and manages `notificationclick` focus, navigation, or window creation.

---

## 4. Baseline Command Execution Results

| Command | Status | Output Highlights & Verdict |
|---|---|---|
| `npm run build` | **PASSED** | Data sync generated 180 apt chunks (35.4MB), prebuilt 181 static/dynamic pages cleanly using Next.js 16.2.6 (Turbopack). |
| `npm test` | **PASSED** | 40/40 test suites passed, 279/279 unit tests passed (including `HeaderDockSync.test.tsx`, `structuredData.test.ts`, `scoring.test.ts`). |
| `npx playwright test` | **EXPECTED FAILURE** | Static audit assertions passed, but live navigation tests failed with `ERR_CONNECTION_REFUSED at http://localhost:5000/` due to no active standalone HTTP server on port 5000. |

---

## 5. Recommended Refactoring Steps (Milestone 2+)

1. **Unify Desktop Navigation Header**:
   - Replace the inline header DOM markup in `DashboardClient.tsx` with `<LoungeHeader activeTab={activeTab} onTabChange={...} />`.
2. **Standardize Navigation Routing**:
   - Replace direct `window.history.replaceState` calls with Next.js `router.push`/`router.replace` or URL query params to preserve Next Router state integrity across tabs.
3. **Consolidate Lounge Route Path**:
   - Deprecate `/overview?tab=lounge` in favor of canonical `/lounge` navigation to ensure single-source data fetching and proper SSR SEO behavior.
4. **Harden Service Worker Cache Exclusions**:
   - Ensure dynamic API-dependent JSON assets explicitly follow defined invalidation boundaries.

