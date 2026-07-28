# Handoff Report — R2: High-Volume Chart Streaming & Memory Leak Defense

## 1. Observation
1. **Chart Components & Pipelines**:
   - `TransactionChartSection.tsx` (`frontend/src/components/apartment-modal/TransactionChartSection.tsx`): Renders Recharts `ComposedChart` with Area, Line, Bar, and `ScatterCustomizedDots` SVG circles. Implements drag-to-zoom (`ReferenceArea`), outlier filtering via `filterOutliersIQR`, scatter dot downsampling via `displayScatterData` (capping at ~130 items when > 150), and HTML2Canvas export (`safeHtml2canvas`).
   - `MacroTrendChart.tsx` (`frontend/src/components/MacroTrendChart.tsx`): Renders Recharts `AreaChart` with debounced `useResizeObserver` (150ms delay, 2px threshold check).
   - `MindMap3D.tsx` (`frontend/src/components/MindMap3D.tsx`): HTML5 2D Canvas rendering a 3D force-directed node graph via continuous `requestAnimationFrame`. Uses `IntersectionObserver` to pause loop when canvas is hidden or off-screen.
   - `AptCompareModal.tsx` (`frontend/src/components/consumer/AptCompareModal.tsx`): Dual chart (LineChart & RadarChart) using `AbortController` and `active` flags on async fetch effects.
   - `SWRProvider.tsx` (`frontend/src/components/pwa/SWRProvider.tsx`): Global SWR configuration with `dedupingInterval: 30000`, `revalidateOnFocus: false`, and `pagehide` event listener to sync cache to `localStorage`.

2. **Memory Accumulation Point**:
   - `lib/utils/transactionChartTransform.ts` line 3:
     ```typescript
     const globalTsCache = new Map<string, number>();
     ```
     `getCachedTimestamp(ymStr, dayStr)` adds entries to `globalTsCache` without size capping or LRU eviction logic.

3. **Automated Test Results**:
   - Tool Command: `npm test -- --testPathPatterns="Chart|macroChart|transactionChart|verification"`
   - Output: `Test Suites: 6 passed, 6 total`, `Tests: 57 passed, 57 total`.

---

## 2. Logic Chain
1. *From Observation 1*: Chart components across the application heavily rely on Recharts and Canvas rendering. `ResizeObserver` instances are debounced (100-150ms) and disconnected on unmount, while Canvas RAF loops in `MindMap3D.tsx` pause via `IntersectionObserver` when off-screen and cancel on unmount.
2. *From Observation 1*: High-volume transaction datasets have potential SVG node inflation, which `TransactionChartSection.tsx` mitigates by capping scatter dots to ~130 elements when raw length > 150.
3. *From Observation 2*: While lifecycle hooks for observers and RAF loops are properly cleaned up, `globalTsCache` in `transactionChartTransform.ts` is an unbounded module-level `Map`. Over long streaming sessions or repeated complex selection toggles, timestamp key-value pairs accumulate monotonically in memory.
4. *From Observation 3*: Unit tests for all chart transforms, error boundaries, and empirical component rendering currently pass 100%, indicating that functional behavior is stable and ready for memory defense hardening.

---

## 3. Caveats
- Real browser V8 Heap snapshot analysis (via DevTools or automated Chrome CDP) requires browser execution in E2E benchmark stage (Milestone 5 / R4), which was not run in this read-only unit analysis phase.
- Third-party Recharts internal SVG cleanup depends on React DOM unmount reconciliation.

---

## 4. Conclusion
The frontend chart rendering architecture is well-fortified against layout thrashing and unmounted listener leaks. To complete R2 requirements for zero memory leaks and <5% heap growth across 10 continuous re-renders:
1. Refactor `globalTsCache` in `transactionChartTransform.ts` to be a bounded LRU cache (max 500 items) with a `clearTsCache()` export for deterministic cleanup.
2. Maintain strict `isAnimationActive={false}` or low animation durations on high-frequency streaming charts.
3. Keep `dedupingInterval` and offline protection enabled in `SWRProvider.tsx`.

---

## 5. Verification Method
1. **Unit Test Suite Execution**:
   ```bash
   npm test -- --testPathPatterns="Chart|macroChart|transactionChart|verification"
   ```
   *Expected Result*: All 6 test suites and 57 tests pass with 0 errors.

2. **File Inspection**:
   - Inspect `frontend/src/lib/utils/transactionChartTransform.ts` for timestamp cache bounds.
   - Inspect `frontend/src/components/apartment-modal/TransactionChartSection.tsx` for `ResizeObserver` cleanup and `displayScatterData` downsampling.
   - Inspect `frontend/src/components/MindMap3D.tsx` for `IntersectionObserver` pause logic and RAF cancellation.
