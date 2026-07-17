## 2026-07-17T04:50:20Z

You are a Worker agent. Your task is to implement the Page Transition and ApartmentModal optimizations (R1 and R2) based on the Explorer's findings.

### Mandatory Integrity Warning:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Optimization Requirements:

1. **Page Transition Optimization (R1)**:
   - **Link Caching / Viewport Prefetching**:
     - In `frontend/src/components/Footer.tsx`, add `prefetch={false}` to the static utility links (`D-VIEW 소개`, `문의하기`, `서비스 이용약관`, `개인정보처리방침`).
     - In `frontend/src/components/pwa/MobileDock.tsx`, change `prefetch={true}` to `prefetch={false}` to disable auto-prefetching on viewport visibility. Ensure hover/touch events still call programmatic prefetching (`router.prefetch(tab.href)`).
   - **Service Worker Caching (`frontend/public/sw.js`)**:
     - Modify the caching handler for static data JSONs (`/data/` and `/tx-data/` requests, except `tx-summary.json` or `.json` suffix) from a **Network First** policy to a **Stale-While-Revalidate (SWR)** caching policy. SWR should immediately return cached responses if available, and fetch in the background to update the cache.
   - **SWR Provider Caching (`frontend/src/components/pwa/SWRProvider.tsx`)**:
     - Implement cleanup logic in `getCache` or inside SWRProvider to parse `localStorage` keys and purge any old cached keys (like `/data/tx-summary.json?v=OLD_VERSION`) that do not match the current `BUILD_VERSION`.

2. **ApartmentModal Optimization (R2)**:
   - **Decouple useApartmentDetails**:
     - Currently `useApartmentDetails` is called at the parent level (`ExploreClient.tsx`, `DashboardClient.tsx`), which triggers massive parent re-renders when data loads/revalidates.
     - Move the hook call *inside* the modal component (`FieldReportModal` in `ApartmentModal.tsx`).
     - The parent component should only pass the `selectedReport` object down.
     - Extract `preloadApartmentTx` into a lightweight, stateless hook/utility. The parent component list rows or autocompletes should use this lightweight preloader on hover/focus to fetch files without subscribing to full data updates or causing parent re-renders.
   - **Calculator Preloading**:
     - In `ApartmentModal.tsx`, trigger dynamic preloading on hover/focus of calculator launcher buttons (e.g. `PropertyTaxCalculator`, `SellTimingCalculator`).
   - **Jank Elimination**:
     - Defer chart rendering (`TransactionChartSection`) and transaction table rendering (`TransactionTable`) in `ApartmentModal.tsx` until the slide-in transition finishes (`isAnimationFinished === true` or equivalent indicator). Show the skeleton loading states during the transition.
     - Apply memoization using `React.memo` on sub-sections of the modal. Use `useCallback` on modal event handlers/callbacks.

3. **Verify Integrity**:
   - Run type checks (`npx tsc --noEmit`) and build checks (`npm run build`) in `frontend` directory to ensure build integrity.

Write a summary of all changes in `changes.md` and your final verification and build command outcomes in `handoff.md` in your working directory: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m2_m3`.
Keep all metadata files within your working directory. Ensure the app builds without errors or warnings.
