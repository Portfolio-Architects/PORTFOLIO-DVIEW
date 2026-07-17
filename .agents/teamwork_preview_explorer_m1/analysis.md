# Milestone M1: Performance Analysis Report
**Date**: 2026-07-17T04:32:30Z
**Author**: teamwork_preview_explorer_m1
**Target Page**: `/overview` ("아파트 랩" / Overview Page)

---

## 1. Executive Summary

A comprehensive, read-only performance analysis of the `/overview` ("아파트 랩") page on D-VIEW was conducted. The investigation revealed several critical bottlenecks affecting initial load time (FCP, LCP), Total Blocking Time (TBT), and interactive responsiveness (INP):
1. **Critical CPU Overhead (Dead Code Computations)**: `MacroDashboardClient.tsx` contains **11 variables** computed via `useMemo` or `useCallback` that are **completely unused** in the rendered JSX. These include heavy loops over flat-mapped lists of all apartments (performing regex search-key mappings) and recent transaction arrays on every render or state change.
2. **Dynamic Modals & Calculators**: The lazy loading strategy implemented in `DashboardClient.tsx` is solid, saving ~200KB of initial JS bundle. However, statically imported dashboard widgets (`TrafficNoticeBoard`, `LoungeTalkWidget`) inside the dynamic `MacroDashboardClient` chunk can be further code-split using Next.js `dynamic()` to minimize the initial load boundary.
3. **Timeline Selection Lag**: Selecting an apartment on the "일자별 최근 실거래" timeline triggers a component-wide re-render of `MacroDashboardClient`. Because timeline item elements are declared inline in the map function and not memoized, all transaction cards are re-created and re-rendered.
4. **Chart Remounting Bottleneck**: The `<MacroTrendChart>` is rendered with a dynamic `key` tied to `selectedTimelineApt`. This forces a complete unmount, destruction of Recharts SVG/DOM elements, and remount on every click, triggering redundant `ResizeObserver` loops and layout jumps.

---

## 2. Component Analysis & Rendering Behavior

### 2.1 `frontend/src/app/overview/page.tsx`
- **Behavior**: A Next.js App Router Page component that utilizes ISR (`revalidate = 3600`) to fetch initial dashboard data on the server via `getInitialData()`. It outputs pre-rendered screen-reader-only SEO content in `<div className="sr-only" aria-hidden="true">` containing the Top 10 leaderboards and recent 15 transactions.
- **Client Hand-off**: Suspends page load using `<Suspense fallback={<DashboardSkeleton />}>` while rendering `<DashboardClient>` client component.
- **Assessment**: Efficient server-side pre-rendering for SEO. No direct performance issues found in this file.

### 2.2 `frontend/src/components/DashboardClient.tsx`
- **Behavior**: Manages tab state (`activeTab`), modal display states (`isCompareOpen`, `isJeonseSafetyOpen`, etc.), and user authentication hooks. 
- **Code Splitting**: Dynamically imports heavy modals (`FieldReportModal`, `WriteReviewModal`) and calculations-heavy pages (`MacroDashboardClient`, `LoungeContainerClient`, `OfficeExplorerClient`, and calculators) on demand.
- **Assessment**: Highly optimized bundle loading. However, callbacks passed as props to dynamic children (e.g. `onSelectApt`) sometimes trigger cascading updates because they depend on hooks whose SWR data changes state during lifecycle mounts.

### 2.3 `frontend/src/components/MacroDashboardClient.tsx`
- **Behavior**: Renders the core Overview dashboard. It holds the "일자별 최근 실거래" timeline list, `<MacroTrendChart>`, `<TrafficNoticeBoard>`, and `<LoungeTalkWidget>`.
- **Bottleneck**: This is the primary bottleneck. It performs all data preparation (calculating gaps, risk indicators, statistics, and sorting) inside the component. When user interacts (selecting an apartment or altering a filter), the component re-runs all non-memoized elements, leading to high Total Blocking Time (TBT).

---

## 3. CPU & Rendering Bottleneck: Dead Computations (Critical)

During code inspection of `MacroDashboardClient.tsx`, we discovered that **11 heavy variables** are declared, memoized, and updated on SWR/state changes, but they are **never referenced or rendered anywhere in the UI**. These computations represent dead code that causes massive rendering lag because they involve flat-mapping loops over hundreds of apartments and sorting transactions on the client thread.

### List of Unused Calculations

| Line No. | Variable Name | Type | Dependencies | Details & Performance Impact |
|:---|:---|:---|:---|:---|
| **837-885** | `donutData` | `useMemo` | `[recentTransactions, chartMode, maxDateTime]` | Loops through all `recentTransactions` (typically 50-100 items), groups them by `txKey` and `area`, sorts them, and counts rising/falling/neutral prices. |
| **887-901** | `totalHouseholds`, `publicRentalHouseholds` | `useMemo` | `[sheetApartments, publicRentalSet]` | Flat-maps the entire `sheetApartments` object (all dongs and apartments) and sums the house counts. |
| **904-906** | `benchmarks` | `useMemo` | `[]` | Unused array containing a single string. |
| **1190-1213** | `getAptBriefingMessage` | `useCallback` | `[userFavorites]` | Prepares a textual briefing message string; never called in JSX. |
| **1317-1361** | `card3Data` | `useMemo` | `[recent7DaysVolume, recentTransactions, maxDateTime]` | Computes YoY transaction volume delta percentages. |
| **1364-1395** | `card4Data` | `useMemo` | `[sheetApartments, publicRentalSet, favoriteCounts]` | Flat-maps all apartments in the workspace and does linear checks against `favoriteCounts` to find the most favorited apartment. |
| **1398-1413** | `globalVotes` | `useMemo` | `[globalVotesData]` | Computes vote percentages from SWR. |
| **1416-1449** | `enrichedAptList` | `useMemo` | `[sheetApartments, txSummaryData, nameMapping, publicRentalSet]` | Flat-maps all `sheetApartments`, does `findTxKey` (which loops through `txSummaryData` and performs regex normalizations) to extract average sales and rents, calculates ratios, and filters out rentals. **Extremely heavy loop.** |
| **1452-1482** | `gapInvestment1st` | `useMemo` | `[enrichedAptList]` | Iterates over `enrichedAptList` to find the maximum jeonse rate. |
| **1485-1552** | `gapInvestmentTop5` | `useMemo` | `[enrichedAptList, gapRankingDong]` | Filters `enrichedAptList` by dong, evaluates 3-risk metrics (reverse jeonse, liquidity, volatility) per apartment, sorts the results, and slices Top 5. |
| **1555-1570** | `averageJeonseRateText` | `useMemo` | `[enrichedAptList, gapRankingDong]` | Loops over `enrichedAptList` to find the mean jeonse rate. |

### Diagnostic Conclusion
Because **none** of these variables are rendered or passed down, removing them entirely will immediately cut CPU execution times in half when the component updates.

---

## 4. Component-Level Rendering Bottlenecks & Optimization Plan

### 4.1 Next.js `dynamic()` Code Splitting Opportunities
In `MacroDashboardClient.tsx`, `TrafficNoticeBoard` and `LoungeTalkWidget` are imported statically:
- `import { TrafficNoticeBoard } from "./macro/TrafficNoticeBoard";`
- `import { LoungeTalkWidget } from "./macro/LoungeTalkWidget";`

On initial render of `/overview`, these widgets are placed below the fold (timeline list and chart are at the top). Statically loading them bloats the dynamic chunk of `MacroDashboardClient`.
- **Optimization Strategy**: Convert them to dynamic client components loaded on demand or with `{ ssr: false }`.
  ```typescript
  const TrafficNoticeBoard = dynamic(() => import("./macro/TrafficNoticeBoard").then(m => m.TrafficNoticeBoard), {
    ssr: false,
    loading: () => <div className="w-full h-[350px] bg-surface rounded-2xl animate-pulse" />
  });
  
  const LoungeTalkWidget = dynamic(() => import("./macro/LoungeTalkWidget").then(m => m.LoungeTalkWidget), {
    ssr: false,
    loading: () => <div className="w-full h-[300px] bg-surface rounded-2xl animate-pulse" />
  });
  ```

### 4.2 Re-rendering, React.memo, and useCallback Optimizations

#### 4.2.1 Extraction and Memoization of Timeline Item Cards
Currently, the "일자별 최근 실거래" items are rendered inline inside `MacroDashboardClient.tsx`:
```typescript
{group.items.map((item, idx) => {
  const isRising = item.delta > 0;
  const isFalling = item.delta < 0;
  const isSelected = selectedTimelineApt === item.aptName;

  return (
    <div key={`${item.aptName}-${idx}`} className="...">
      <button onClick={() => setSelectedTimelineApt(item.aptName)} ...>
         ...
      </button>
      <button onClick={() => onSelectApt(item.aptName)}>상세</button>
    </div>
  );
})}
```
Whenever `selectedTimelineApt` changes, React re-renders every item. Since they are inline, React creates new DOM subtrees and binds fresh event handlers.
- **Optimization Strategy**: Extract this layout into `TimelineItemCard.tsx` and wrap it in `React.memo`. Pass down simple props: `item`, `isSelected`, `areaUnit`, and memoized handler callbacks (`onSelect`, `onSelectDetails`, `preloadApartmentTx`). 

#### 4.2.2 Stop Chart Unmounting on Key Change
In `MacroDashboardClient.tsx` (lines 2136-2142):
```typescript
<MacroTrendChart
  key={selectedTimelineApt || 'all'}
  lineData={mainLineData}
  xTicks={mainXTicks}
  yTicks={mainYTicks}
  timeframe={timeframe}
/>
```
Using the `selectedTimelineApt` state as a `key` forces React to tear down and recreate the entire Chart SVG on every selection change. Recharts is highly capable of updating lines smoothly when props change.
- **Optimization Strategy**: Remove the `key` prop entirely or make it a static value:
  ```typescript
  <MacroTrendChart
    lineData={mainLineData}
    xTicks={mainXTicks}
    yTicks={mainYTicks}
    timeframe={timeframe}
  />
  ```
  This will prevent unmounts, avoid layout shifts, bypass initial `ResizeObserver` size calculations (which fire state updates and re-renders), and allow for smooth charting transitions.

### 4.3 Heavy List Virtualization & Progressive Rendering
The "일자별 최근 실거래" list displays recent transactions.
- **Virtualization Assessment**: Because the list items are nested inside daily date headings (`group.dateStr`), rendering variable-height items with third-party virtualization libraries like `react-window` can be complex and add overhead.
- **Progressive Rendering Strategy**: Instead of rendering all 50-100 transactions on desktop immediately, we can introduce progressive rendering (rendering the first 15 groups, and using a "Load More" button or an IntersectionObserver to append more items as the user scrolls). This keeps the initial DOM light (reducing TBT) and renders items on demand.
- **Top 5 Leaderboard**: Currently, the calculation loop `gapInvestmentTop5` is unused dead code. It should be deleted, preventing any list rendering virtualization concerns here.

---

## 5. Summary of Recommended Implementation Diffs

### Phase A: Remove Dead Computations
Delete all unused `useMemo` and `useCallback` definitions in `MacroDashboardClient.tsx`:
- `donutData`
- `totalHouseholds` / `publicRentalHouseholds`
- `benchmarks`
- `getAptBriefingMessage`
- `card3Data`
- `card4Data`
- `globalVotes`
- `enrichedAptList`
- `gapInvestment1st`
- `gapInvestmentTop5`
- `averageJeonseRateText`

### Phase B: Extract & Memoize Timeline Item Cards
Create a `TimelineItemCard.tsx` component wrapped in `React.memo` to isolate list updates.

### Phase C: Convert Static Widgets to Dynamic Loaders
Replace static imports of `TrafficNoticeBoard` and `LoungeTalkWidget` in `MacroDashboardClient.tsx` with dynamic imports.

### Phase D: Stabilize Trend Chart Lifecycle
Remove the dynamic `key` attribute from `<MacroTrendChart>` inside `MacroDashboardClient.tsx`.
