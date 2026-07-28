# Analysis Report — R2: High-Volume Chart Streaming & Memory Leak Defense

## 1. Executive Summary
This report presents the findings of Explorer 2 for Milestone 1 / R2 (High-Volume Chart Streaming & Memory Leak Defense).
We conducted a comprehensive audit of all chart/graph rendering components, Canvas/SVG pipelines, data update loops, `requestAnimationFrame` (RAF) usage, `ResizeObserver` logic, event listeners, and memory lifecycle cleanup routines across `frontend/src/components/`, `frontend/src/app/`, `frontend/src/lib/`, and `frontend/src/hooks/`.

Key conclusion: The overall chart architecture is well-structured with debounced `ResizeObserver` hooks, RAF cancellation on unmount, and SVG scatter plot downsampling. However, we identified a critical memory accumulation risk in module-level global caching (`globalTsCache`), as well as opportunities for memory defense hardening during high-volume data streaming and repeated component mount/unmount cycles.

---

## 2. Inventory of Chart & Visualization Components

| Component / File | Render Tech | Update / Streaming Mechanism | Key Features & Datasets |
|---|---|---|---|
| `TransactionChartSection.tsx` | Recharts (`ComposedChart` + Custom SVG) | Prop driven from `useApartmentDetails`, timeframe toggle (6M/1Y/3Y/ALL), drag-to-zoom | Price trends, Scatter dots (IQR outlier filtered), Monthly volume bars, watermark capture |
| `MacroTrendChart.tsx` | Recharts (`AreaChart`) | Prop driven from SWR (`/api/technovalley/trend`), 150ms debounced `useResizeObserver` | Macro price trends (Sale/Rent average), gap/ratio calculation |
| `TechnoValleyDashboard.tsx` | Recharts (`BarChart`, `LineChart`) | SWR hooks (`/api/technovalley/...`) with 30s deduping | Industry distribution, employment growth, supply forecast |
| `AptCompareModal.tsx` | Recharts (`LineChart`, `RadarChart`) | Dynamic JSON fetch with `AbortController` signal | Side-by-side transaction price comparison and multi-dimensional radar comparison |
| `MortgageCalculator.tsx` | Recharts (`AreaChart`) | Local state recalculation on slider change | Mortgage amortization schedule and monthly payment trajectory |
| `PropertyTaxCalculator.tsx` | Recharts (`PieChart`) | Local state recalculation | Holding tax / property tax breakdown pie chart |
| `AnalyticsDashboard.tsx` | Recharts (`BarChart`, `AreaChart`) | SWR hooks (`/api/admin/analytics`, `/api/admin/search-console`) | GA4 traffic metrics, impressions, clicks, search query performance |
| `MindMap3D.tsx` | HTML5 2D Canvas (3D Math Simulation) | Continuous RAF physics loop + `IntersectionObserver` pause | 3D force-directed node graph of top 25 complexes with temperature gradient sphere rendering |
| `BuyOrWaitVote.tsx` | Canvas / Animated SVG | RAF continuous counting animation | Community buy/wait sentiment voting metrics |

---

## 3. Detailed Audit of Update Loops, Listeners, and Memory Cleanup

### 3.1 Unbounded Global Timestamp Cache (`transactionChartTransform.ts`)
- **Location**: `frontend/src/lib/utils/transactionChartTransform.ts`, line 3:
  ```typescript
  const globalTsCache = new Map<string, number>();
  ```
- **Finding**: Every call to `getCachedTimestamp(ymStr, dayStr)` adds a date string entry to `globalTsCache`. As users navigate across dozens of apartment complexes over long client sessions, date entries accumulate continuously in memory without an eviction mechanism.
- **Risk**: Memory footprint grows monotonically across extended browsing sessions, failing the 5% maximum heap growth threshold requirement under sustained usage.

### 3.2 ResizeObserver & Layout Thrashing Defense
- **Location**: `TransactionChartSection.tsx` (lines 203-254) & `MacroTrendChart.tsx` (lines 120-187).
- **Audit Findings**:
  - `TransactionChartSection.tsx` uses a callback ref (`containerRefCallback`) that disconnects previous `ResizeObserver` instances before creating new ones.
  - Both components implement a 2px noise threshold (`diffW <= 2 && diffH <= 2`) to ignore sub-pixel browser layout jitter.
  - Debouncing timers (100ms in `TransactionChartSection`, 150ms in `MacroTrendChart`) defer expensive Recharts re-renders until resize finishes.
  - Unmount cleanup in `useEffect` explicitly calls `observer.disconnect()` and `clearTimeout(timeoutId)`.
  - `app/layout.tsx` contains a global `ResizeObserver` error shield to prevent `ResizeObserver loop limit exceeded` runtime exception spam.

### 3.3 RequestAnimationFrame (RAF) & Animation Lifecycle
- **Location**: `MindMap3D.tsx` (lines 402, 417, 436, 467) & `BuyOrWaitVote.tsx` (lines 208, 212, 215).
- **Audit Findings**:
  - `MindMap3D.tsx` connects RAF rendering to an `IntersectionObserver`. When the 3D canvas scrolls out of viewport (`!entry.isIntersecting`) or document tab is hidden (`document.visibilityState === 'hidden'`), `isLoopRunning.current` sets to `false`, pausing the RAF render loop.
  - On component unmount, `cancelAnimationFrame(animationFrameId)` is executed cleanly alongside `canvas.removeEventListener('wheel', handleWheel)`, `document.removeEventListener('visibilitychange', handleVisibilityChange)`, and `observer.disconnect()`.
  - In interactive dragging hooks (`OfficeExplorerClient.tsx`, `TossApartmentExploreClient.tsx`), window/document event listeners (`mousemove`, `mouseup`) are tracked in `resizeListenersRef.current` and explicitly removed on unmount.

### 3.4 Recharts DOM Node Inflation & Tooltip Cleanup
- **Location**: `TransactionChartSection.tsx` (lines 399-410).
- **Audit Findings**:
  - Unbound SVG elements in large datasets (e.g. 500+ transaction points) can create thousands of SVG `<circle>` nodes, overwhelming the browser render engine.
  - `TransactionChartSection.tsx` addresses this via `displayScatterData`: when total scatter records exceed 150, data is downsampled to ~130 representative points while preserving edge values (first/last records and outliers).
  - In `PWAProvider.tsx` (lines 155-156), global click handlers check for orphan `.recharts-tooltip-wrapper` elements to prevent sticky tooltip popups.

---

## 4. Empirical Test Verification
We ran the existing chart and transformation unit test suites to confirm functional integrity:
```bash
npm test -- --testPathPatterns="Chart|macroChart|transactionChart|verification"
```
**Results**:
- 6 Test Suites Passed (100%)
- 57 Tests Passed (100%)
- Covered files: `transactionChartTransform.test.ts`, `macroChartTransform.test.ts`, `ChartErrorBoundary.test.tsx`, `TransactionChartSection.test.tsx`, `m2_m3_empirical_verification.test.tsx`, `m5_empirical_verification.test.ts`.

---

## 5. Proposed R2 Memory Leak Defense Strategy

To ensure zero memory leaks and guarantee <5% heap growth across 10 continuous chart re-renders / navigation cycles, we propose the following concrete implementation contract for Implementer:

1. **Bounded LRU Cache for `globalTsCache`**:
   - Refactor `globalTsCache` in `transactionChartTransform.ts` to enforce a maximum capacity (e.g. 500 entries) or use an LRU eviction strategy.
   - Add export function `clearTsCache()` to allow deterministic cache purging during test cleanup.

2. **Strict Recharts Disposing & Tooltip Mounting Guards**:
   - Ensure all Recharts components use `isAnimationActive={false}` or low duration on high-volume continuous updates to minimize SVG frame garbage generation.
   - Memoize formatted chart payloads with `useMemo` to prevent object allocation thrashing on mouse hover / touch events.

3. **Continuous Streaming & SWR GC Hardening**:
   - Retain `dedupingInterval` (30,000ms) and `revalidateOnFocus: false` settings in `SWRProvider.tsx` to prevent redundant request allocation.
   - Verify all `useEffect` hooks performing fetch calls utilize `AbortController` signals and boolean `active` flags for immediate memory release when components unmount mid-request.

4. **Automated Memory Leak Benchmark**:
   - Include a Jest / Playwright test step in `benchmark.ts` measuring `window.performance.memory.usedJSHeapSize` before and after 10 continuous chart tab toggles, validating heap growth remains <= 5%.

---
*Report compiled by Explorer 2 — Run 6 Milestone 1 (R2 Investigation Complete)*
