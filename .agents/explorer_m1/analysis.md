# Codebase Performance Exploration & Baselining Report (M1)

## Executive Summary
This report presents a thorough investigation of the current Next.js codebase layout, prefetching mechanics, caching layers (SWR, React Context, Service Worker), navigation transitions, and layout shift bottlenecks in the PORTFOLIO - DVIEW frontend. Key areas of performance regression and architectural mismatches have been identified, and a baseline build and Playwright test run have been executed to establish a reference point.

---

## 1. Codebase Layout & Routing Structure
The frontend is constructed using Next.js 15 App Router architecture. The directory structure is divided between `frontend/src/app` (pages/routing/API endpoints) and `frontend/src/components` (reusable UI blocks).

### Route Definition Index (`frontend/src/app`)
- **`/` (Root Route)**: Renders `TechnoValleyClient` showing the Technovalley Lab dashboard. It is statically compiled at build time (`○`).
- **`/overview`**: Renders `DashboardClient` (Apartment Lab). It is dynamically server-rendered on demand (`ƒ`) because it reads `searchParams` for initialization.
- **`/lounge`**: Renders `LoungeContainerClient` (Dongtan Lounge community). It is dynamically server-rendered (`ƒ`).
- **`/explore`**: Renders `ExploreClient` (Apartment Search). It uses static site generation with a `10m` revalidation window.
- **`/apartment/[aptName]`**: Renders detailed apartment reports dynamically (`ƒ`) on demand.
- **`/lounge/[id]`**: Renders standalone post details via Static Site Generation (`●`) using `generateStaticParams`.
- **`lounge/@modal/(.)[id]`**: Intercepting route that intercepts post-clicking inside the lounge feed to show the post details within a modal.
- **`api/`**: Folder containing multiple dynamic routing endpoints (`ƒ`) for data syncing, analytics, and business logic.

### Component Layout (`frontend/src/components`)
Components are logically grouped by feature:
- `explore/`: Components for apartment exploration.
- `lounge/`: Feed, composition, header, and backdrop components.
- `macro/`: Dashboards like `TechnoValleyDashboard` and `CoLeasingBoard`.
- `pwa/`: Progressive Web App components including `SWRProvider`, `MobileDock`, `PWAProvider`, etc.
- `ui/`: Design system primitives (skeletons, error boundaries, markdown viewer).

To optimize the initial JavaScript bundle size, heavy components are loaded lazily via Next.js `dynamic()` imports inside `DashboardClient.tsx`:
- `FieldReportModal` (Apartment modal overlay)
- `WriteReviewModal` (Review editor overlay)
- `MacroDashboardClient` (Apartment Lab dashboard)
- `LoungeContainerClient` (Lounge feed container)
- `OfficeExplorerClient` (Office search and co-leasing board)
- `AptCompareModal` & `JeonseSafetyCalculator` (Calculators and comparison sheets)

---

## 2. Prefetching Mechanics Inspection
We checked Next.js Link usage and programmatic hover-based prefetching.

### Key Observations
1. **Redundant Programmatic Prefetching**:
   - In both `LoungeHeader.tsx` and `DashboardClient.tsx`, navigation elements use Next.js `<Link prefetch={true}>` and also define hover/touch handlers (`onMouseEnter={() => router.prefetch(...)}` and `onTouchStart={() => router.prefetch(...)}`).
   - Because `prefetch` is `true` by default (or explicitly set to `true`), Next.js already registers an Intersection Observer to automatically prefetch the route bundle when the link enters the viewport. Attaching explicit hover prefetching logic on top is redundant and creates duplicated JS execution.
2. **Programmatic Prefetching Gaps**:
   - **"아파트 탐색" Tab in Dashboard**: In `DashboardClient.tsx` (lines 916-926), the tab is coded as a `<button>` that triggers `router.push('/explore')` inside `onClick`. It lacks any `onMouseEnter` or `onTouchStart` prefetching. This results in a slow transition lag when users click on "아파트 탐색" compared to the other prefetch-protected links.
   - **Lounge Feed Post Items**: In `LoungeFeedClient.tsx` (lines 1164-1177), clicking on a post item triggers `window.location.hash = "post=" + post.id` instead of a Next.js `<Link>` component. Since it is a standard `div` element modifying a hash parameter, browser crawlers cannot index these detail pages, and Next.js cannot prefetch the detail page bundle on hover.

---

## 3. Caching Inspection: SWR & React Context
SWR is configured globally via `SWRProvider.tsx` with local storage persistence (`app-swr-cache`).

### Configuration Analysis
- `revalidateOnFocus: false`: Disables automatic background refetching when the user refocuses the browser window.
- `dedupingInterval: 30000`: Deduplicates queries targeting the same URL within a 30-second window.
- **Idle Preloading**: SWRProvider starts a background thread using `requestIdleCallback` to preload key endpoints: `/data/location-scores.json`, `/api/local-notices`, `/api/apartments-by-dong`, `/api/dashboard-init`, `/api/macro/rates`, and `/api/macro/news`.

### Major Caching Misalignments & Duplicate Requests
1. **SWR Key Mismatch (`/api/macro/news`)**:
   - SWRProvider preloads the exact key `'/api/macro/news'`.
   - However, `NewsClient.tsx` requests `'/api/macro/news?limit=40'`.
   - Because SWR treats query parameters as part of the unique cache key, the preloaded cache data for `'/api/macro/news'` is ignored, forcing a duplicate network fetch when `NewsClient.tsx` is mounted.
2. **SWR Cache Bypass (`/api/macro/rates`)**:
   - SWRProvider preloads `'/api/macro/rates'` into SWR cache.
   - However, `AdvancedValuationMetrics.tsx` fetches the same API using a native `fetch('/api/macro/rates')` call, bypassing SWR's cache context completely. This renders the preloaded data useless and executes a duplicate network request.
3. **SWR Cache Bypass (`/api/dashboard-init`)**:
   - SWRProvider preloads `'/api/dashboard-init'` into SWR cache.
   - However, `useDashboardMeta.ts` performs a direct `fetch('/api/dashboard-init')` call, bypassing SWR cache completely. This causes a duplicate network request on page mount.

---

## 4. Service Worker Analysis
The Service Worker is located at `frontend/public/sw.js`.

### Cache Configuration
- **Precaching**: On install, caches static assets like `/`, `manifest.webmanifest`, app icons, `/offline.html`, and static data files (such as `/data/apartments-by-dong.json`, `/data/location-scores.json`, etc.) under `CACHE_NAME`.
- **API Bypassing**: Explicitly bypasses all request paths starting with `/api/` (they are sent directly to the network without SW caching).
- **Static Assets (Cache First)**: Build chunks under `/_next/` and media assets match `url.pathname.startsWith('/_next/')` and are loaded via **Cache First, falling back to Network**.
- **JSON Data (Stale-While-Revalidate)**: Requests matching `.json` or containing `/data/` and `/tx-data/` use a custom **Stale-While-Revalidate** strategy. It returns the cached JSON data immediately and triggers a background fetch to update the cache in IndexedDB.
- **Special Exclusion**: `tx-summary.json` is explicitly bypassed from the SWR service worker cache to ensure transaction data freshness is never delayed by cache latency.

---

## 5. Transition, Layout Switching, & Layout Shifts (CLS)
Several rendering bottlenecks and CLS sources were found during navigation and state updates.

### Key Layout Shifts and Bottlenecks
1. **Tab Unmounting Pattern**:
   - Inside `DashboardClient.tsx` (lines 741-792), tabs are conditionally rendered AND hidden with CSS, e.g.:
     ```tsx
     <section className={`w-full bg-transparent ${activeTab === 'office' ? 'block' : 'hidden'}`}>
       {activeTab === 'office' && <OfficeExplorerClient />}
     </section>
     ```
   - Because of `{activeTab === '...' && <Component />}` conditional rendering, components are completely unmounted when inactive. When the user toggles tabs, the entire tab state (scroll position, filters, selected sub-tabs) is destroyed.
   - Upon switching back, the component must mount, show a loading skeleton/flicker, and re-fetch data, causing visual stutter and rendering bottlenecks. Doing both conditional rendering and CSS toggling (`block`/`hidden`) is contradictory.
2. **CLS in Lounge Detail Modal**:
   - In `LoungeDetailClient.tsx` (line 760), while loading is true, a `min-h-screen` container is rendered with a spinner:
     ```tsx
     if (loading) {
       return (
         <div className="min-h-screen bg-body flex items-center justify-center">
           <div className="w-8 h-8 rounded-full border-2 border-toss-blue border-t-transparent animate-spin" />
         </div>
       );
     }
     ```
   - When opened inside the `LoungeModalBackdrop` (which is a `h-fit` dialog card), this `min-h-screen` loading style forces the modal container to stretch to 100vh.
   - Once loading finishes and `post` data renders, the modal height suddenly collapses to match the actual post height, creating a major layout shift (CLS) and visual jump.
3. **Mock Data Reliance in Office Explorer**:
   - `OfficeExplorerClient.tsx` does not fetch data from the server; the entire `BUILDINGS_DB` is hardcoded as a static JavaScript array inside the file. While this prevents network overhead, it increases the bundle size of the component statically.

---

## 6. Baseline Next.js Build and Playwright Test Outcomes

### Next.js Build Outcome
The build was executed successfully via `npm run build`:
- **Compile Time**: Compiled successfully in `12.9s`.
- **TypeScript Check**: Completed in `15.5s`.
- **Route Summary**:
  - `/` is static (`○`).
  - `/overview`, `/lounge`, `/apartment/[aptName]` are dynamic (`ƒ`).
  - `/lounge/[id]` is SSG (`●`).
  - Next.js build optimization warnings were identified in `generateMetadata` for `/apartment/[aptName]` due to un-awaited dynamic `searchParams` properties.

### Playwright Test Outcome
The Playwright end-to-end tests were executed successfully using `npm run test:e2e`:
- **Results**: 10 tests passed (duration: 1.1 minutes).
- **Test Coverage & Details**:
  - `tests/badge-accessibility.spec.ts`: Confirmed focus state and keyboard accessibility of elements inside the Lounge.
  - `tests/dashboard.spec.ts`: Loaded the main Apartment Lab dashboard, opened the modal view, tested filters, and verified the custom `MacroTrendChart` renders successfully on the Data Lab tab with correct dimensions.
  - `tests/login-e2e.spec.ts`: Verified mock login and logout logic flow on the frontend.
  - `tests/performance-ux.spec.ts`:
    - Verified the Donut chart CSS-only hover scale & transition styles (`hover:scale-105` with `transition-transform duration-300`).
    - Verified Accordion Lazy Rendering: confirmed the company grid unmounts completely when the accordion is collapsed (saving DOM node overhead), and mounts upon expansion.
    - Verified responsive modal container classes (`custom-scrollbar`) and layout classes on mobile screens.
  - `tests/routing-bug.spec.ts`: Confirmed that clicking the MobileDock tabs correctly routes from news page variants (e.g. `/news` or `/news?notice=some-id`) back to the proper curation tab (`/overview`) and shows/hides components without routing bugs.
  - `tests/ui-ux-audit.spec.ts`: Completed a full automated UI/UX audit on the explore page and details modal.
- **Audit Diagnostics (`scratch/ui-ux-audit-results.json`)**:
  - **LCP**: Measured at `1184ms` on the explore page (Good).
  - **CLS**: Measured at `0.036` on the explore page (Good).
  - **Accessibility Warning**: Detected a color-contrast issue inside the segmented menu: `.shadow-[0_2px_12px_rgba(0,0,0,0.06)] > span` representing the `<span>아파트 탐색</span>` menu item.

