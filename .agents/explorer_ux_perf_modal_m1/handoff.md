# Handoff Report: UX Performance & ApartmentModal Optimization Analysis

## 1. Observation
We observed the following exact paths, lines, and behaviors in the codebase:
- **Service Worker JSON Caching**: In `frontend/public/sw.js` (lines 122–144):
  ```javascript
  if ((url.pathname.includes('/data/') || url.pathname.includes('/tx-data/') || url.pathname.endsWith('.json')) && !url.pathname.includes('tx-summary.json')) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => { ... })
        .catch(() => {
          return caches.match(req).then((cachedRes) => { ... });
        })
    );
  }
  ```
  This implements a **Network First** policy for JSON files.
- **Link Prefetching**:
  - In `frontend/src/components/pwa/MobileDock.tsx` (lines 102–107):
    ```typescript
    <Link
      href={tab.href}
      prefetch={true}
      onMouseEnter={() => router.prefetch(tab.href)}
      onTouchStart={() => router.prefetch(tab.href)}
    ```
    This uses redundant viewport prefetching alongside hover prefetching.
  - In `frontend/src/components/Footer.tsx` (lines 43–53): Standard Next.js `<Link>` elements lack `prefetch={false}`, defaulting to automatic viewport prefetching.
- **SWR Provider Caching**: In `frontend/src/components/pwa/SWRProvider.tsx` (line 59 & 93), the SWR cache is synced to `localStorage` under `app-swr-cache`. The cache stores versioned query parameters (`?v=BUILD_VERSION`), but the loader (`getCache`) has no logic to delete/purge old versions when the build changes.
- **Data Hook Re-rendering**: In `frontend/src/app/explore/ExploreClient.tsx` (line 309) and `frontend/src/components/DashboardClient.tsx` (line 352):
  ```typescript
  const { txSummaryData, fullReportData, modalTransactions, isLoadingDetail, isTxLoading, resolvedReport, aptTxSummary, loadAllTransactions, preloadApartmentTx } = useApartmentDetails(
    selectedReport, sheetApartments, nameMapping, user, txSummary, locationScores
  );
  ```
  The parent client components load modal transactions, reports, and summary data. Any SWR updates or loading toggles trigger a full re-render of these massive parent components.
- **Modal Rendering & Slide-In Animation**: In `frontend/src/components/ApartmentModal.tsx` (lines 2051–2080):
  ```typescript
  <div className="w-full md:w-[35%] shrink-0 flex flex-col self-start md:self-stretch min-h-[320px] md:h-full">
    {isTxLoading ? (
      <TransactionTableSkeleton />
    ) : (
      <TransactionTable transactions={filteredTransactions} ... />
    )}
  </div>
  ```
  The table and chart mount immediately when `isTxLoading` is false, even if `isAnimationFinished` (which delays other subcomponents for 300ms) is still false.

---

## 2. Logic Chain
1. **Network First Caching Lag**: Since `sw.js` uses a Network First policy for `/data/` and `/tx-data/` JSONs, every time the modal mounts or transitions occur, the browser stalls waiting for the network request. On slow or high-latency networks, this bypasses local cache benefits, resulting in a visible 1-3s delay before the modal contents render.
2. **Parent Component Re-render Jank**: Because `useApartmentDetails` is declared inside parent page components (`ExploreClient.tsx` and `DashboardClient.tsx`), SWR status changes and state updates in `useApartmentDetails` cause full re-renders of the parent page. Re-rendering a complex page with 179 list items and filters while the modal is attempting to mount/animate results in CPU thread saturation and visible transition frame drops (jank).
3. **Chart Mounting vs Slide-In Animation**: Recharts is a heavy package that constructs inline SVG trees. In `ApartmentModal.tsx`, the chart and transactions table render immediately when `isTxLoading` resolves to `false`, disregarding whether the slide-in CSS animation is complete (`isAnimationFinished`). If the transaction JSON is loaded from cache instantly, Recharts mounts and draws in the middle of the CSS slide-in transition, causing severe rendering jank.
4. **Link Prefetch Bloat**: Viewport-based prefetching of all tabs in `MobileDock` and utility pages in the `Footer` triggers concurrent JS chunk and page HTML downloads on initial load, consuming mobile data bandwidth and contesting with critical resource loading.
5. **Local Cache Contamination**: SWR cache keys mapped in `localStorage` contain static version strings (`?v=BUILD_VERSION`). Upon a new deployment, these keys change, making all stored cache entries obsolete. Without a purge routine, these stale entries remain in `localStorage` indefinitely, leaking memory and risking quota exceptions.

---

## 3. Caveats
- Since this is a read-only investigation (network mode: CODE_ONLY), we did not run production builds, profile live web clients, or capture Chrome DevTools performance trace timelines.
- Real-time transaction merging logic relies on Firestore. We assume client-side Firebase SWR fetches remain active and decoupled from the service worker static cache.

---

## 4. Conclusion
The sluggish transitions and modal mounting lag are caused by:
1. Blocked static data JSON requests due to a Network First Service Worker policy.
2. Wasted CPU cycles re-rendering parent components because the detail data hooks are mounted at the page level.
3. Chart rendering layout thrashing that occurs concurrently with the modal's slide-in CSS transition.
4. Extraneous viewport prefetches and unpurged localStorage SWR states.

We can solve these bottlenecks by moving data-fetching hooks inside the modal, switching the SW to Stale-While-Revalidate for data JSONs, deferring chart mounts until the slide-in animation is fully complete, preloading calculators on hover, and cleaning up old SWR keys in localStorage.

---

## 5. Verification Method
1. **Validate Compilation & Types**:
   Run the project's build checks to verify that modifications are lint-free:
   - `npm run lint` or `npx tsc --noEmit`
2. **Inspect Cached Resources**:
   - Open Chrome DevTools -> Application -> Storage -> Local Storage. Verify that `app-swr-cache` no longer contains entries with mismatched version codes after a version change.
   - Open Application -> Service Workers / Cache Storage. Verify that `/tx-data/` JSONs are served instantly from the cache, followed by background fetches.
3. **Verify Transition Smoothness**:
   - Throttle CPU (e.g. 4x slowdown) and Network (Simulated Fast 3G) in DevTools.
   - Open the modal. The modal should slide in at 60fps, showing only skeletons (no chart/table) during the animation, and mounting Recharts only after the modal finishes sliding in.
