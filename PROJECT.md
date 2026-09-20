# Project: D-VIEW Dashboard Performance Optimization & UX Enhancement

## Architecture
- **Overview**: D-VIEW optimizes the performance and interaction responsiveness of the Dongtan Apartment Real Transaction Dashboard (`/`, 아파트 랩). The architecture eliminates server/client duplicate data loading, establishes in-memory and HTTP caching, defers multi-chart Recharts mounting via viewport IntersectionObserver and idle scheduling, and refactors the stats calculation engine into a single-pass aggregator with direct tuple indexing and LRU result caching.
- **Data Layer ($0 Zero-Cost Architecture)**: All data is served from static CDN JSON assets (`public/data/*.json`, `public/tx-data/*.json`). Zero direct Firestore queries occur in client browser sessions. SSR pre-populates `typeMap` and `locationScores` to eliminate client API calls.
- **Rendering & Main Thread Distribution**: Multi-chart instances (Donut, Complex Price Trend, Macro Time Series, Pyeong Ranking, Volume Distribution) are decoupled from the initial synchronous render pass. Hero section AreaChart is idle-staggered relative to the Donut chart. Out-of-viewport macro stats charts are dynamically loaded and mounted on-demand via `useInView` (IntersectionObserver with 250px lookahead buffer).
- **Layout Integrity & Zero-CLS**: The signature top 2-column hero layout (`lg:h-[586px]`, Left: Donut + 4 KPI cards, Right: Complex Trend chart) and the bottom macro stats sections, KPIs, hyperlocal insight cards, and inline AdSense slots (1000000001 & 1000000002) are 100% preserved with zero Cumulative Layout Shift (CLS < 0.001).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | SSR Payload & In-Memory Reader Optimization | Inject `typeMap` and `locationScores` in SSR (`dashboardData.ts`); eliminate duplicate `apartments-by-dong.json` reads; eliminate per-request `stat()` calls in `fileReader.ts`. | M1 | Survey (Explorer 1) & R1 |
| F2 | SWR & Browser HTTP Caching Deduping | In `useStaticData.ts`, set `revalidateIfStale: false` and `revalidateOnMount: false` when `fallbackData` exists; allow browser caching in `staticDataService.fetchJson`. | M1 | Survey (Explorer 1) & R1 |
| F3 | Idle Deferral of Non-Critical Preloads | In `DashboardClient.tsx`, defer heavy modal and non-essential feature preloads using `requestIdleCallback` (3000ms fallback) to prevent main-thread network/CPU contention on initial load. | M1 | Survey (Explorer 1) & R1 |
| F4 | Viewport-Based Lazy Mount Hook (`useInView`) | Implement reusable `useInView.ts` hook with sticky mounting (`triggerOnce: true`), 250px rootMargin lookahead, and headless `testMode`/SSR fallback. | M2 | Survey (Explorer 2) & R2 |
| F5 | Recharts Code-Splitting & Zero-CLS Skeletons | Dynamically import `StatsTimeTrendChart`, `StatsPyeongRankingChart`, and `StatsVolumeDistributionChart` in `StatsOverviewSection.tsx` with pixel-matched skeletons preserving test IDs. | M2 | Survey (Explorer 2) & R2, R4 |
| F6 | Hero Chart Idle Staggering & Bounds Preservation | Stagger `MacroTrendChart` AreaChart mounting in `MacroDashboardClient.tsx` using `requestIdleCallback` (120ms timeout) so Donut chart mounts cleanly on Frame 1; maintain `lg:h-[586px]`. | M2 | Survey (Explorer 2) & R2, R4 |
| F7 | Direct Tuple Indexing in Period Deserialization | In `staticDataService.ts:parsePeriodTransactions`, replace `fields.forEach` closure iteration with indexed direct tuple assignments for 10x faster deserialization. | M3 | Survey (Explorer 3) & R3 |
| F8 | Single-Pass Stats Aggregator | Consolidate 4-pass filtering, rankings, time-series trend, and volume distribution in `statsEngine.ts` into a single unified pass; pre-compute and cache monthly string slicing. | M3 | Survey (Explorer 3) & R3 |
| F9 | Deterministic LRU/Keyed Result Caching | Introduce in-memory LRU result caching in `statsEngine.ts` / `StatsOverviewSection.tsx` by filter key for instant (<1ms) repeated filter re-toggles. | M3 | Survey (Explorer 3) & R3 |
| F10 | StatsOverviewSection Initial Timeframe Optimization | Set initial timeframe in `StatsOverviewSection.tsx` to `'3M'` (using already-hydrated 90d data); load 1Y/ALL on-demand upon filter selection. | M3 | Survey (Explorer 1, 3) & R1, R3 |
| F11 | Full Test Suite, Zero-Cost Audit & Build Verification | Verify 100% test suites (`npm test`), zero TypeScript compilation errors (`npx tsc --noEmit`), successful build (`npm run build`), stress benchmarks, and forensic integrity audit. | M4 | All Requirements & Acceptance Criteria |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Data Ingestion, SSR Payload & Caching Optimization | `dashboardData.ts`, `fileReader.ts`, `useStaticData.ts`, `staticDataService.ts`, `DashboardClient.tsx` (F1, F2, F3) | None | DONE |
| M2 | Multi-Chart Viewport Lazy Mount & Hero Staggering | `useInView.ts`, `ChartSkeletons.tsx`, `StatsOverviewSection.tsx`, `MacroDashboardClient.tsx` (F4, F5, F6) | None | DONE |
| M3 | Stats Engine Single-Pass Aggregation & Result Caching | `statsEngine.ts`, `staticDataService.ts`, `StatsOverviewSection.tsx` (F7, F8, F9, F10) | M1 | DONE |
| M4 | Final Milestone: Full Verification, Stress Testing & Audit | Tiers 1-5 test execution, `npm test`, `npx tsc --noEmit`, `npm run build`, forensic integrity audit (F11) | M1, M2, M3 | DONE |

---

## Interface Contracts
### `useInView` Hook Contract
```typescript
export interface UseInViewOptions {
  rootMargin?: string; // Default: '250px 0px'
  threshold?: number | number[]; // Default: 0
  triggerOnce?: boolean; // Default: true (sticky mount)
  testMode?: boolean; // Default: true if typeof window === 'undefined' or JSDOM
}

export function useInView<T extends HTMLElement = HTMLDivElement>(
  options?: UseInViewOptions
): [React.RefCallback<T>, boolean];
```

### Chart Skeletons & Test ID Continuity
```typescript
// All skeleton placeholders preserve exact data-testid attributes expected by test suites:
- <TimeTrendChartSkeleton /> => data-testid="stats-time-trend-chart"
- <PyeongRankingChartSkeleton /> => data-testid="stats-pyeong-ranking-chart"
- <VolumeDistributionChartSkeleton /> => data-testid="stats-volume-distribution-chart"
```

### Hero Layout Dimensional Contracts
- Hero Container: `grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6 items-stretch box-border`
- Left Column: `lg:col-span-6 lg:h-[586px] flex flex-col justify-between`
  - `AptDonutSection`: `h-auto sm:min-h-[385px] lg:h-[388px] shrink-0`
  - `AptMetricCards`: `grid grid-cols-2 gap-2 sm:gap-2.5 flex-1` (~184px)
- Right Column: `lg:col-span-6 lg:h-[586px] min-h-[460px]`
  - `MacroChartSection`: `lg:h-[586px] min-h-[460px] flex flex-col`

### `statsEngine` Single-Pass & Cache Contract
```typescript
export function aggregateStats(
  inputs: StatsEngineInputs,
  filters: StatsFilters,
  options?: StatsEngineOptions
): StatsAggregateResult;
// Guaranteed calculation SLA: <20ms on 25,000 transactions; <1ms on cached key lookup
```

---

## Code Layout
- `frontend/src/lib/services/dashboardData.ts`: SSR data loader for `/`.
- `frontend/src/lib/utils/server/fileReader.ts`: Server-side cached JSON file reader.
- `frontend/src/hooks/useStaticData.ts`: SWR client data fetching hooks.
- `frontend/src/lib/services/staticDataService.ts`: Client data fetching service and tuple deserializer.
- `frontend/src/hooks/useInView.ts`: Viewport intersection observer hook.
- `frontend/src/components/stats/ChartSkeletons.tsx`: Pixel-matched chart loading skeletons.
- `frontend/src/components/stats/StatsOverviewSection.tsx`: Stats dashboard section with dynamic chart imports and filter state.
- `frontend/src/components/MacroDashboardClient.tsx`: Hybrid dashboard client with hero 2-column layout and idle staggering.
- `frontend/src/lib/analytics/statsEngine.ts`: Unified single-pass stats computation engine.
