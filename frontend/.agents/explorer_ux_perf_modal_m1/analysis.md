# Codebase Analysis: Page Transitions & ApartmentModal Rendering Optimization

This report outlines the findings from an in-depth code audit of the Next.js frontend codebase, specifically focusing on page transitions, PWA caching mechanisms (Service Worker & SWR), and rendering performance bottlenecks in `ApartmentModal` (FieldReportModal).

---

## 1. Next.js Routing, Links, and Transitions
- **Routing Structure**: The application uses the **Next.js App Router** with pages located under `frontend/src/app` (e.g., `explore`, `overview`, `lounge`, `technovalley`).
- **Layout and Top Loader**: `frontend/src/app/layout.tsx` registers a global dynamic top loading indicator (`nextjs-toploader` on line 29 & 147) to provide visual feedback during page transitions.
- **Link Caching / Viewport Prefetching**:
  - **Footer Component (`frontend/src/components/Footer.tsx`)**: Links to `/about`, `/contact`, `/terms`, and `/privacy` do not specify the `prefetch` attribute. By default in Next.js, these will prefetch automatically when the footer enters the viewport, generating unnecessary network load.
  - **Mobile Dock Component (`frontend/src/components/pwa/MobileDock.tsx`)**: Tab buttons are wrapped in `<Link>` elements with `prefetch={true}` (line 105), and also have manual hover-based prefetching via `onMouseEnter={() => router.prefetch(tab.href)}` (line 106). This represents redundant prefetching.
- **Transition Indicators**: The application uses custom loaders such as `CalculatorLoader` (rendered during dynamic imports of calculators in `ExploreClient.tsx`) to show loading states while downloading JS chunks.

---

## 2. Service Worker Caching Policy
The service worker is defined in `frontend/public/sw.js`. Its caching policies for static assets and JSON files are structured as follows:
- **Static Assets (Next.js build files, images, fonts)**:
  - Uses a **Cache First, Network Fallback** policy (lines 106–118).
  - While Next.js build hashes uniquely identify resources, caching them with a Cache First strategy under the static `CACHE_NAME` can keep unused old assets in the local cache indefinitely after new deployments.
- **Static Data & JSON Files (`/data/*.json`, `/tx-data/*.json`)**:
  - Uses a **Network First, Fallback to Cache** policy (lines 120–144).
  - Under a slow or high-latency network connection, a Network First policy causes the browser to hang waiting for the fetch request to fail or timeout before retrieving the cached file. This directly causes severe lag (2+ seconds) during page transitions and modal mounts.
  - Note: `tx-summary.json` is explicitly bypassed from service worker caching to ensure real-time accuracy, which adds network overhead during transitions.

---

## 3. SWR and Context Definitions
- **Global SWR Provider (`frontend/src/components/pwa/SWRProvider.tsx`)**:
  - Configures global defaults: `dedupingInterval: 30000` (30 seconds) and `revalidateOnFocus: false` (to prevent redundant background fetches).
  - Implements a localized state cache in `localStorage` under the key `app-swr-cache`.
  - **Local Caching Issues**: Keys synced to `localStorage` include build-specific version query parameters (e.g., `/data/tx-summary.json?v=BUILD_VERSION`). When a new deployment changes `BUILD_VERSION`, SWR will look up the new key and fail to match the old key stored in `localStorage`, resulting in cache misses. The old entries remain in `localStorage` indefinitely, polluting the client's storage.
- **SWR Data Fetching Hooks**:
  - `useTxData` and `useLocationScores` in `frontend/src/hooks/useStaticData.ts` fetch core static JSONs with `dedupingInterval: 3600000` (1 hour) and lazy-initialize fetches using `requestIdleCallback`.
  - `useApartmentDetails` in `frontend/src/hooks/useApartmentDetails.ts` uses two SWR hooks:
    1. `/tx-data/[fileKey]-recent.json?v=[buildId]` (fast initial load, `<2KB` payload).
    2. `/tx-data/[fileKey].json?v=[buildId]` (deferred background load, triggered after a `250ms` delay via `shouldFetchFull` state).
- **Parent Re-rendering Bottleneck**:
  - `useApartmentDetails` is called in the *parent* components, `ExploreClient.tsx` (line 309) and `DashboardClient.tsx` (line 352), rather than inside the modal component itself.
  - SWR state updates (such as when `recentRecords` finish loading, when the `250ms` delay finishes and starts fetching `fullRecords`, or when `fullReportData` loads) change parent state and trigger a **full re-render of the parent component**. Since the parent components manage complex list views (179+ cards, search indexes, filters, etc.), this triggers heavy render calculations and causes severe lag (jank) during the modal opening transition.

---

## 4. ApartmentModal Structure and Heavy Child Components
The main modal component is `FieldReportModal` inside `frontend/src/components/ApartmentModal.tsx` (`133KB`). It employs dynamic imports (`next/dynamic` with `ssr: false`) for its heavy widgets:
- **Heavy Dynamic Components**:
  - `CommentSection` (`@/components/CommentSection` - handles comment forms & lists)
  - `TransactionTable` (`@/components/apartment-modal/TransactionTable` - renders large arrays of transaction records)
  - `TransactionChartSection` (`@/components/apartment-modal/TransactionChartSection` - renders Recharts graph)
  - `TransactionSummaryMetrics` (`@/components/apartment-modal/TransactionSummaryMetrics` - computes statistics)
  - `JeonseSafetyReport` (`@/components/apartment-modal/JeonseSafetyReport` - parses rental metrics)
  - `EducationAnalysisSection` & `InfraAnalysisSection` (`@/components/apartment-modal/*` - process school/infrastructure lists and categories)
  - `AdvancedValuationMetrics` & `AnchorTenantCard` (`@/components/consumer/*` - financial model outputs)
  - `PhotoUploadModal` (`@/components/apartment-modal/PhotoUploadModal` - image upload forms)
  - *Note*: Calculators like `AptCompareModal`, `JeonseSafetyCalculator`, `MortgageCalculator`, `PropertyTaxCalculator`, and `SellTimingCalculator` are dynamically imported and conditionally rendered in `ExploreClient.tsx`.
- **Preloading Strategy**:
  - In `ExploreClient.tsx` (lines 324–346), dynamic chunks for these modules are prefetched on mount via `requestIdleCallback`.
  - When mounting `FieldReportModal`, it calls `.preload()` for `TransactionChartSection` and `CommentSection` inside its `useEffect` (lines 1165–1168).
- **Rendering and Animation Intersect Bottleneck**:
  - The modal uses a state variable `isAnimationFinished` (set to `true` `300ms` after mounting) to delay rendering some heavy widgets (e.g. `InfraAnalysisSection`, `EducationAnalysisSection`, `JeonseSafetyReport`, `TransactionSummaryMetrics`).
  - However, the `TransactionTable` (line 2054) and `TransactionChartSection` (line 2069) **do not respect the `isAnimationFinished` flag**. They render immediately once `isTxLoading` is `false`. If the transactions load from cache quickly, these render while the slide-in transition is still active, causing visible animation stutter.

---

## 5. Optimization Proposals

### A. Link Prefetching & Hover-Based Programmatic Prefetching
1. **Disable Viewport Auto-Prefetching**:
   - In `Footer.tsx`, change static utility links (`D-VIEW 소개`, `문의하기`, `서비스 이용약관`, `개인정보처리방침`) to include `prefetch={false}`. Prefetching minor pages on load wastes bandwidth.
   - In `MobileDock.tsx`, replace `prefetch={true}` (line 105) with `prefetch={false}`. Viewport-based prefetching of all 5 main pages causes excessive parallel requests on initial load.
2. **Implement Hover/Focus Programmatic Prefetching**:
   - For links inside `Footer` and `MobileDock`, keep the hover/focus triggers (`onMouseEnter`, `onFocus`, `onTouchStart`) to call `router.prefetch(href)`. This fetches the page JS only when a user intends to navigate.

### B. Service Worker Caching Policy
1. **Transition to Stale-While-Revalidate (SWR) for JSONs**:
   - In `sw.js`, change the caching strategy for `/data/*.json` and `/tx-data/*.json` (excluding `tx-summary.json`) from *Network First* to **Stale-While-Revalidate**.
   - **Why this is safe**: The frontend uses `useStaticData.ts` to fetch real-time transactions from Firestore and merges them on top of the static JSON data. Thus, slightly stale static transactions are safely patched in-memory with live database records, allowing the service worker to return the cache immediately (0ms latency) during transition.
2. **Network First with Timeout Fallback (Alternative)**:
   - If SWR is not preferred, modify the fetch handler for JSON files to use a fast-timeout race (e.g., 1.5 seconds). If the network does not respond within the timeout, immediately resolve with the cached version.

### C. Preventing Duplicate Requests & Decoupling Component Re-renders
1. **SWR Cache Version Purging**:
   - In `SWRProvider.tsx` (`getCache` on line 59), parse keys in `localStorage` and clean up old entries containing version query parameters (`?v=...`) that do not match the current `BUILD_VERSION`. This prevents silent cache pollution and storage overflow.
2. **Decouple Data Fetching from Parent Page**:
   - **Problem**: Calling `useApartmentDetails` in `ExploreClient.tsx` makes the parent re-render during modal data loads.
   - **Solution**: Move `useApartmentDetails` calls *inside* the `FieldReportModal` component. The parent should only pass the `selectedReport` object down.
   - **Preloading**: Extract `preloadApartmentTx` into a pure, lightweight React hook or utility that doesn't hold local state. The parent list rows (`AptRow.tsx`) and autocomplete list can call this lightweight preloader on hover/focus without subscribing to rendering updates.

### D. Programmatic Preloading of Calculators and Heavy Parts
1. **Hover-Based Calculator Preloading**:
   - Programmatically trigger chunk imports on button hover/focus. Inside `ApartmentModal.tsx`, bind the hover and focus events of the calculator launcher buttons to dynamic imports:
     - *Tax Calculator Button*:
       ```typescript
       onMouseEnter={() => import('@/components/consumer/PropertyTaxCalculator')}
       onFocus={() => import('@/components/consumer/PropertyTaxCalculator')}
       ```
     - *Sell Timing Button*:
       ```typescript
       onMouseEnter={() => import('@/components/consumer/SellTimingCalculator')}
       onFocus={() => import('@/components/consumer/SellTimingCalculator')}
       ```
     This triggers the browser to load and compile the calculator chunk in parallel while the user moves their pointer to click.

### E. Eliminating Render Jank (React.memo, useMemo, useCallback)
1. **Defer Charts & Tables Rendering Until Slide-In Completes**:
   - In `ApartmentModal.tsx`, rewrite the conditional rendering blocks for the main chart and table to depend on `isAnimationFinished`:
     ```typescript
     // Render skeletons instead of actual chart/table during transition
     {!isAnimationFinished || isTxLoading ? (
       <TransactionChartSkeleton />
     ) : (
       <TransactionChartSection ... />
     )}
     ```
     This prevents Recharts from mounting and rendering SVG nodes while the CSS transform transition of the modal slide-in is active, eliminating frame drops.
2. **Apply `React.memo` on Sub-components**:
   - Ensure child sections (`ApartmentSpecsSection`, `JeonseSafetyReport`, `AdvancedValuationMetrics`, `BuyOrWaitVote`, `CommentSection`) are wrapped in `React.memo`. Since they are dynamically imported, verify that the default exports are memoized to avoid re-rendering them when parent modal states (e.g. scroll position, uploader state) change.
3. **Memoize Callbacks in the Modal**:
   - Use `useCallback` on event handlers passed to the dynamically imported components (e.g., `onClose`, `onOpenCompare`, `onOpenJeonseSafety`, `onOpenMortgage`, `onOpenTaxCalculator`) to keep reference equality and preserve `React.memo` benefits.
4. **Leverage `useDeferredValue` for Filter Changes**:
   - Already, `deferredAreaFilter` is used in `ApartmentModal.tsx`. Ensure that transaction filtering uses `deferredAreaFilter` instead of the raw `selectedAreaFilter` state to yield rendering priority back to inputs.
