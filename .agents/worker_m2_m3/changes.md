# Summary of Changes

## 1. Page Transition Optimization (R1)
- **Footer Link Caching / Viewport Prefetching**:
  - Modified `frontend/src/components/Footer.tsx` to add `prefetch={false}` to static utility links (`D-VIEW 소개`, `문의하기`, `서비스 이용약관`, `개인정보처리방침`).
- **Mobile Dock Prefetching**:
  - Modified `frontend/src/components/pwa/MobileDock.tsx` to change `prefetch={true}` to `prefetch={false}`. This disables automatic prefetching on viewport visibility, while preserving custom `onMouseEnter` and `onTouchStart` programmatic prefetch handlers (`router.prefetch(tab.href)`).
- **Service Worker Caching Policy**:
  - Modified `frontend/public/sw.js` to change the static JSON caching handler (`/data/` and `/tx-data/` requests, except `tx-summary.json`) from a **Network First** policy to a **Stale-While-Revalidate (SWR)** policy. SWR immediately returns the cached response if available while triggering a background fetch to keep the cache updated.
- **SWR Cache Cleanup Logic**:
  - Modified `frontend/src/components/pwa/SWRProvider.tsx` to parse keys from `localStorage` (`app-swr-cache`) in `getCache` and purge any entry with mismatched `v=` version query parameters that do not match the current `BUILD_VERSION`.
  - Also modified `syncToLocalStorage` to skip saving keys with mismatched `v=` parameters.

## 2. ApartmentModal Optimization (R2)
- **Decoupled `useApartmentDetails` Hook**:
  - Moved the `useApartmentDetails` hook call inside `FieldReportModal` in `frontend/src/components/ApartmentModal.tsx`.
  - Removed `useApartmentDetails` and `useComments` hook calls from the parent level (`ExploreClient.tsx` and `DashboardClient.tsx`) to eliminate massive parent re-renders when data loads/revalidates.
  - Parents now pass the raw `selectedReport` object down as `report`.
  - Created a stateless, lightweight preloading hook `usePreloadApartmentTx` in `frontend/src/hooks/usePreloadApartmentTx.ts` for list rows and autocompletes to call on hover/focus without subscribing to state updates.
- **Calculator Preloading**:
  - Added dynamic imports in `ApartmentModal.tsx` (`preloadCalculators`) triggered on `onMouseEnter` and `onFocus` of the calculator launcher buttons (`PropertyTaxCalculator`, `SellTimingCalculator`, `MortgageCalculator`, `JeonseSafetyCalculator`) to pre-cache the modules before click.
- **Jank Elimination & Transition Deferral**:
  - Modified `ApartmentModal.tsx` to defer rendering of `TransactionChartSection` and `TransactionTable` until the slide-in transition finishes (`isAnimationFinished === true`). Skeleton placeholders are shown during the transition.
  - Wrapped key share/copy event handlers (`handleKakaoShare`, `handleDownloadShareCard`, `handleCopyLink`, `handleCopySummary`, `handleNativeShare`, `handleShareSection`, `handleToggleFilter`, `handleDownloadWatermarkedImage`) inside `useCallback` for stable references.
