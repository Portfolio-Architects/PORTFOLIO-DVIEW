# Handoff Report - Explorer 1 (Milestone 1)

**Working Directory**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_m1_v6_1`  
**Target Path**: `frontend/`  
**Date**: 2026-07-22  

---

## 1. Observation

### 1.1 Main Routes & Navigation Architecture
- **Route `technovalley`**: Implemented in `frontend/src/app/page.tsx:184-188` rendering `<TechnoValleyClient />` wrapped in `<Suspense fallback={<TechnoValleySkeleton />}>`. The `/technovalley` path in `frontend/src/app/technovalley/page.tsx:4-5` executes `redirect('/')`.
- **Route `office`**: Handled via `/overview?tab=office` in `frontend/src/app/overview/page.tsx:151-155` setting `initialTab = 'office'` for `<DashboardClient />`.
- **Route `lounge`**: Handled via standalone route `frontend/src/app/lounge/page.tsx:8-50` (`export const dynamic = 'force-dynamic'`), fetching posts, news, and notices server-side.
- **Route `overview`**: Handled in `frontend/src/app/overview/page.tsx:25` (`export const revalidate = 3600`) rendering `<DashboardClient initialTab="overview" />`.
- **Route `imjang`**: Handled via `/explore` in `frontend/src/app/explore/page.tsx:9` (`export const revalidate = 600`) rendering `<ExploreClient />`.

### 1.2 Desktop Header & Mobile Dock Synchronization
- **`LoungeHeader.tsx`** (`frontend/src/components/LoungeHeader.tsx:39-117`):
  - Uses `<Link prefetch={true}>` for all 5 main navigation tabs: `/`, `/overview?tab=office`, `/lounge`, `/overview`, `/explore`.
- **`MobileDock.tsx`** (`frontend/src/components/pwa/MobileDock.tsx:102-118`):
  - Disables Next.js default link prefetching with `prefetch={false}` and attaches manual prefetch on hover/touch (`onMouseEnter={() => router.prefetch(tab.href)}`, `onTouchStart={() => router.prefetch(tab.href)}`).
  - Lines 76-98: When `onTabClick` callback is passed (in `DashboardClient`), tabs for `overview` and `office` render as `<button>` elements and invoke `window.history.replaceState(null, '', '/overview...')`.
- **`DashboardClient.tsx`** (`frontend/src/components/DashboardClient.tsx:864-943`):
  - Duplicates the entire desktop header DOM markup instead of reusing `LoungeHeader.tsx`, using `<button>` elements with `window.history.replaceState` for tab switching.

### 1.3 Caching, React Context & Service Worker Policies
- **`SWRProvider.tsx`** (`frontend/src/components/pwa/SWRProvider.tsx:25-56, 175-214`):
  - Uses an in-memory `Map` backed by `localStorage` (`app-swr-cache`). Auto-purges when `BUILD_VERSION` updates.
  - Background preloading (`requestIdleCallback`) loads `/data/location-scores.json?v=${BUILD_VERSION}`, `/api/local-notices?dongtan=true`, `/api/dashboard-init`, `/api/macro/rates`, `/api/macro/news?limit=40`.
  - Configured with `dedupingInterval: 30000` and `revalidateOnFocus: false`.
- **`SettingsContext.tsx`** (`frontend/src/lib/contexts/SettingsContext.tsx:46-199`):
  - Persists `theme` (`light`/`dark`/`system`) and `areaUnit` (`m2`/`pyeong`) in `localStorage` with `safeGetItem`/`safeSetItem` try-catch guards.
  - Synchronizes across tabs via `window.addEventListener('storage', ...)`.
  - Separated into `SettingsValueContext` and `SettingsUiContext` to prevent modal state toggles from forcing re-renders.
- **`AuthContext.tsx`** (`frontend/src/lib/contexts/AuthContext.tsx:59-107`):
  - Manages Firebase Auth, Firestore profiles, session cookies (`/api/auth/session`), and integrates Playwright E2E mock auth (`__E2E_MOCK_AUTH__`).
- **`public/sw.js`** (`frontend/public/sw.js:86-181`):
  - Configured with `Cache-Control: no-store, no-cache, must-revalidate, max-age=0` in `next.config.ts`.
  - Bypasses local development ports and all `/api/*` endpoints.
  - Static assets: Cache-First. Static JSON (`/data/`, `/tx-data/` except `tx-summary.json`): Stale-While-Revalidate (SWR). Page Navigation: Network-First with Offline fallback.

### 1.4 Baseline Command Execution Results
- **`npm run build`**: PASSED. Data sync generated 180 apt chunks (35.4MB), prebuilt 181 static/dynamic pages cleanly using Next.js 16.2.6 (Turbopack).
- **`npm test`**: PASSED. 40/40 test suites passed, 279/279 unit tests passed (including `HeaderDockSync.test.tsx`, `structuredData.test.ts`, `scoring.test.ts`).
- **`npx playwright test`**: EXPECTED CONNECTION FAILURE. Static audit assertions passed, but live navigation tests failed with `ERR_CONNECTION_REFUSED at http://localhost:5000/` due to no active standalone HTTP server running on port 5000.

---

## 2. Logic Chain

1. **Premise**: In `MobileDock.tsx` and `DashboardClient.tsx`, navigation between `overview` and `office` tabs relies on `<button>` elements executing `window.history.replaceState`.
2. **Observation**: `window.history.replaceState` alters the browser URL without notifying Next.js App Router internal navigation state or firing router context listeners.
3. **Reasoning**: Components relying on Next.js hooks like `useSearchParams()` or `usePathname()` will fail to reflect URL changes, leading to state desynchronization across components.
4. **Premise**: Desktop header navigation is implemented via `<Link prefetch={true}>` in `LoungeHeader.tsx`, but duplicated inline with `<button onClick={() => window.history.replaceState(...)}>` inside `DashboardClient.tsx`.
5. **Observation**: Changes to `LoungeHeader.tsx` routes or styling will not propagate to `DashboardClient.tsx`, causing component drift and maintenance overhead.
6. **Premise**: Both `/lounge` (standalone SSR route) and `/overview?tab=lounge` (client-rendered tab in `DashboardClient`) load `LoungeContainerClient`.
7. **Observation**: `/lounge` preloads posts on the server (`getRecentPosts(50)`), whereas `/overview?tab=lounge` initializes with `initialPosts={[]}` and fetches posts client-side.
8. **Conclusion**: Route switching and state synchronization require unification: `DashboardClient` should utilize `<LoungeHeader>`, `window.history.replaceState` should be replaced with Next router navigation, and `/lounge` should serve as the canonical route for Lounge features.

---

## 3. Caveats

- Playwright E2E tests require launching `npm run start` or a local development server on port 5000 before running `npx playwright test`. Static audit tests in Playwright passed.
- Investigation was strictly read-only; no code modifications were applied to project source files.

---

## 4. Conclusion

The navigation and state synchronization architecture in `frontend/` is well-structured for client-side performance (utilizing SWR local storage caching, idle background preloading, service worker asset policies, and Playwright mock auth), but exhibits three primary architectural friction points:
1. State desynchronization caused by `window.history.replaceState` calls bypassing Next.js App Router context.
2. Code duplication between `LoungeHeader.tsx` and desktop header markup inside `DashboardClient.tsx`.
3. Dual rendering paths for `/lounge` vs `/overview?tab=lounge`.

---

## 5. Verification Method

1. **Build Verification**:
   ```bash
   cd frontend
   npm run build
   ```
   *Expected Result*: Build completes without TypeScript or Next.js build errors (181 routes compiled).

2. **Unit Test Verification**:
   ```bash
   cd frontend
   npm test
   ```
   *Expected Result*: All 40 Jest test suites (including `HeaderDockSync.test.tsx` and `SWRProvider.test.tsx`) pass (279/279 tests).

3. **E2E Test Verification**:
   ```bash
   cd frontend
   npm run build
   npm run start # on port 5000
   npx playwright test
   ```
   *Expected Result*: Playwright test suite executes successfully when target server is running.

4. **Inspection Verification**:
   - Inspect `frontend/src/components/LoungeHeader.tsx`
   - Inspect `frontend/src/components/pwa/MobileDock.tsx`
   - Inspect `frontend/src/components/DashboardClient.tsx`
   - Inspect `frontend/src/components/pwa/SWRProvider.tsx`
   - Inspect `frontend/public/sw.js`

