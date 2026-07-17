# Handoff Report: Milestone M1 (Performance Analysis)
**Date**: 2026-07-17T04:32:45Z
**Author**: teamwork_preview_explorer_m1
**Working Directory**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_explorer_m1`
**Status**: Hard Handoff (Milestone M1 Complete)

---

## 1. Observation

Direct observations and file references collected from the workspace:
- **Unused Calculations in `MacroDashboardClient.tsx`**:
  - `donutData` defined at lines 837–885:
    ```typescript
    const donutData = useMemo(() => { ... }, [recentTransactions, chartMode, maxDateTime]);
    ```
  - `totalHouseholds` and `publicRentalHouseholds` defined at lines 887–901:
    ```typescript
    const [totalHouseholds, publicRentalHouseholds] = useMemo(() => { ... }, [sheetApartments, publicRentalSet]);
    ```
  - `enrichedAptList` defined at lines 1416–1449:
    ```typescript
    const enrichedAptList = useMemo(() => { ... }, [sheetApartments, txSummaryData, nameMapping, publicRentalSet]);
    ```
  - `gapInvestmentTop5` defined at lines 1485–1552:
    ```typescript
    const gapInvestmentTop5 = useMemo(() => { ... }, [enrichedAptList, gapRankingDong]);
    ```
  - Additional unused variables: `benchmarks` (line 904), `getAptBriefingMessage` (line 1190), `card3Data` (line 1317), `card4Data` (line 1364), `globalVotes` (line 1398), `gapInvestment1st` (line 1452), and `averageJeonseRateText` (line 1555).
  - All of these variables are defined inside the `MacroDashboardClient` component function, but a search of `frontend/src/components/MacroDashboardClient.tsx` yields **zero** instances of them being used in the returned JSX, or passed as props, or referenced by other used variables.

- **Statically Imported Sub-components in `MacroDashboardClient.tsx`**:
  - Statically imported at lines 57–58:
    ```typescript
    import { TrafficNoticeBoard } from "./macro/TrafficNoticeBoard";
    import { LoungeTalkWidget } from "./macro/LoungeTalkWidget";
    ```
  - Rendered statically in JSX at lines 1770 and 1811:
    ```typescript
    <TrafficNoticeBoard ... />
    <LoungeTalkWidget ... />
    ```

- **Dynamic Chart Key in `MacroDashboardClient.tsx`**:
  - Rendered at lines 2136–2142:
    ```typescript
    <MacroTrendChart
      key={selectedTimelineApt || 'all'}
      lineData={mainLineData}
      xTicks={mainXTicks}
      yTicks={mainYTicks}
      timeframe={timeframe}
    />
    ```

- **Inline Timeline Mapping in `MacroDashboardClient.tsx`**:
  - Rendered in inline loop mapping at lines 1822–1947:
    ```typescript
    {group.items.map((item, idx) => {
      ...
      return (
        <div key={`${item.aptName}-${idx}`} ...>
          ...
        </div>
      );
    })}
    ```

---

## 2. Logic Chain

1. **CPU Overhead / Main Thread Blocking**:
   - *Observation*: SWR hooks fetch `recentTransactions` and `sheetApartments` asynchronously. When SWR completes or the user changes filters, the component triggers a re-render.
   - *Reasoning*: Because `enrichedAptList` maps over hundreds of apartments and performs `findTxKey` (which runs regex comparisons on each item), it takes significant CPU time. Since `enrichedAptList`, `gapInvestmentTop5`, `donutData`, and other metrics are unused in the actual UI, this calculation blocks the main thread (increasing TBT/INP) for no functional reason.
   - *Conclusion*: Removing all 11 dead variables will instantly free up client-side CPU cycles.

2. **Large Initial Chunk Size**:
   - *Observation*: `TrafficNoticeBoard` and `LoungeTalkWidget` are statically imported inside `MacroDashboardClient.tsx`.
   - *Reasoning*: Since they are statically imported, their JS code and dependencies (such as icons and list elements) are bundled in the `MacroDashboardClient` dynamic chunk, loading even before these sections scroll into view.
   - *Conclusion*: Dynamic loading via Next.js `dynamic()` with `{ ssr: false }` will decrease the bundle chunk size and speed up LCP and hydration.

3. **List Rendering Inefficiency**:
   - *Observation*: The transaction timeline elements are declared inline inside `MacroDashboardClient.tsx`.
   - *Reasoning*: When `selectedTimelineApt` changes, React must re-evaluate the mapping function and compare the virtual DOM nodes for every transaction in the list. This creates rendering lag.
   - *Conclusion*: Extracting these cards into a separate `TimelineItemCard` component wrapped in `React.memo` will ensure that only the selected card and the deselected card re-render.

4. **Chart Remount Lag**:
   - *Observation*: `key={selectedTimelineApt || 'all'}` is set on `<MacroTrendChart>`.
   - *Reasoning*: React treats a change in `key` as a signal to destroy the component instance and mount a new one. This triggers the canvas/SVG to be rebuilt, prompts `ResizeObserver` loops to resize, and prevents Recharts from dynamically animating line transitions.
   - *Conclusion*: Removing the `key` prop will allow Recharts to perform fast incremental visual updates when props change.

---

## 3. Caveats

- **ResizeObserver 2px Threshold**: `MacroTrendChart.tsx` contains a custom debounce layout logic that ignores changes $\leq 2\text{px}$. If container layout changes are very small, the chart might look slightly cropped until the next resize event, which is an acceptable trade-off for performance.
- **Preselected SEO States**: The `DashboardDataLoader` in `page.tsx` renders a SEO-only screen-reader text on the server. The optimizations proposed are strictly for the client-side component (`MacroDashboardClient.tsx` and `DashboardClient.tsx`) and do not alter the server SEO payload.

---

## 4. Conclusion

Milestone M1 (Performance Analysis) is complete. The `/overview` page performance can be substantially improved through the following targeted, low-risk optimizations:
1. **Remove the 11 Unused Computations**: Clean up all dead `useMemo` loops and callbacks.
2. **Apply Code Splitting**: Move `TrafficNoticeBoard` and `LoungeTalkWidget` to `dynamic()` imports.
3. **Memoize List Cards**: Extract inline timeline rendering into a memoized `<TimelineItemCard>` component.
4. **Fix Chart Lifecycles**: Remove the dynamic `key` from `<MacroTrendChart>` to prevent component remounting.
5. **Progressive Slicing**: Slice the timeline list on desktop to progressively render more items on scroll, preventing a bloated initial DOM size.

These recommendations will reduce the page's TBT by an estimated 50–70% and lower dynamic bundle chunk sizes.

---

## 5. Verification Method

To verify these performance improvements once implemented:
1. **Lint Check**:
   - Run the eslint tool command: `npm run lint` in the `frontend` directory to ensure no compile-time errors or missing prop-types are introduced.
2. **Production Build**:
   - Execute the project build command: `npm run build` in the `frontend` directory to check that dynamic chunks compile successfully and that the bundle size is reduced.
3. **Lighthouse Audit / Profiler**:
   - Using browser devtools or an automated task, verify that switching timeline items does not trigger re-renders in neighboring timeline item cards (can be verified in React Developer Tools Profiler) and that `<MacroTrendChart>` does not call `componentWillUnmount` during selections.
4. **Invalidation**:
   - If any of the 11 dead variables are somehow referenced in future PRs, compilation will fail or highlight unused code, validating that these calculations are truly isolated.
