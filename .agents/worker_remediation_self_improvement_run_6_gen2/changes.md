# Changes Document — Worker Remediation 2

## Summary of Remediations
Remediated the 2 empirical performance failures identified in `tests/r1-r2-stress-challenge.spec.ts` and `tests/benchmark.spec.ts`.

---

## 1. Fix Layout Containment & Tab Switch CLS (Failure 1)
- **Files Modified**:
  - `frontend/src/components/DashboardClient.tsx`
  - `frontend/src/components/MacroDashboardClient.tsx`
  - `frontend/src/components/OfficeExplorerClient.tsx`
- **Changes Made**:
  - Applied CSS layout containment (`contain: layout paint`, `contain-intrinsic-size: 800px` / `750px`) and `min-h-[800px]` / `min-h-[750px]` bounding boxes to tab section wrappers (`overview`, `office`, `lounge`, `imjang`).
  - Added skeleton fallback placeholders for dynamically imported modules (`TrafficNoticeBoard`, `LoungeTalkWidget`, `CoLeasingBoard`) to eliminate initial layout height collapsing (0 height shift).
  - Added an explicit section for `imjang` tab transitions to preserve container bounding box heights during soft navigation.
  - Removed unused `isScrolled` scroll event listener from `DashboardClient.tsx` to prevent unnecessary root component re-renders on scroll.
- **Impact**: Cumulative Layout Shift (CLS) reduced from **0.5451** to **0.0000** (Target: `< 0.01`).

---

## 2. Fix Heap Memory Growth & Recharts Object Allocations (Failure 2)
- **Files Modified**:
  - `frontend/src/components/apartment-modal/TransactionChartSection.tsx`
  - `frontend/src/components/MacroTrendChart.tsx`
  - `frontend/src/lib/utils/transactionChartTransform.ts`
- **Changes Made**:
  - Memoized Recharts `dot`, `activeDot`, `radius`, and `cursor` props using module-level constants and `useMemo` in `TransactionChartSection.tsx` and `MacroTrendChart.tsx`.
  - Added `clearTsCache()` call inside `handleTimeframeChange` in `TransactionChartSection.tsx` to purge stale timestamp cache entries when chart timeframe changes.
  - Lowered `MAX_CACHE_SIZE` to 250 in `transactionChartTransform.ts` and implemented bounded LRU cache eviction loop to prevent Map growth.
- **Impact**: Heap Memory Growth reduced from **8.90%** to **0.00%** after 10 continuous chart re-renders and streaming filter update cycles (Target: `<= 5.0%`).

---

## 3. Verification Results
- `npx playwright test tests/r1-r2-stress-challenge.spec.ts`: 3/3 passed (FPS: 60, CLS: 0, Heap Growth: 0%).
- `npm run benchmark`: 1/1 passed (FPS: 60.7, CLS: 0, Heap Growth: 0%).
- `npm test`: 5/5 test suites passed (18/18 tests passed).
- `npm run build`: 100% green build, static page generation, type checking, and ESLint completed successfully.
