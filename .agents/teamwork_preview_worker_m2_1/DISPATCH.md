# DISPATCH: Milestone 2 Worker — Interactive Dashboard UI & AdSense Placement

## Milestone
Milestone 2: Interactive Statistics Dashboard UI & Monetization Placement
(`frontend/src/app/stats/`, `frontend/src/components/stats/`, Navigation Integration)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Context & Architecture Blueprints
- Working Directory: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_worker_m2_1`
- Frontend Root: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend`
- Original Request: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md` (Section ## 2026-09-19T13:40:53Z)
- Project Document: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\orchestrator_stats_adsense\PROJECT.md`
- UI Architecture Survey: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_explorer_survey_2\survey_ui_dashboard.md`
- AdSense & CLS Survey: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_explorer_survey_3\survey_ads_tests.md`
- Completed M1 Engine: `frontend/src/lib/analytics/statsEngine.ts`, `frontend/src/types/stats.ts`
- E2E Test Suite: `frontend/src/__tests__/stats_report_e2e.test.tsx`

## Exclusive Scope & Files Owned
1. `frontend/src/app/stats/page.tsx`: Server component with ISR/revalidate (600s), SEO metadata (Title, OpenGraph, JSON-LD Schema), and Suspense fallback to `StatsDashboardSkeleton`.
2. `frontend/src/app/stats/StatsDashboardClient.tsx`: Interactive client dashboard with:
   - Centralized filter state (Region, Dong, Pyeong, Timeframe, Sort).
   - In-memory data loading from `public/data/tx-summary.json`, `recent-transactions.json`, `macro-trend.json`, and dynamic 1Y/ALL loader when selected.
   - Zero Firestore cost (0 direct browser reads).
   - <300ms filter responsiveness.
3. `frontend/src/app/stats/StatsDashboardSkeleton.tsx`: Zero-CLS pre-sized skeleton layout with reserved bounding boxes for charts and ad slots.
4. `frontend/src/components/stats/StatsFilterBar.tsx`: Responsive filter bar (Region pills, Pyeong chips, Timeframe tabs 1M/3M/6M/1Y/ALL, Sort selector).
5. `frontend/src/components/stats/StatsTimeTrendChart.tsx`: Recharts `ComposedChart` with Bar for volume and Line/Area for average sale and rent prices. Responsive container with debounced resize observer.
6. `frontend/src/components/stats/StatsPyeongRankingChart.tsx`: Recharts horizontal `BarChart` for TOP 20 complexes by pyeong price.
7. `frontend/src/components/stats/StatsVolumeDistributionChart.tsx`: Recharts donut `PieChart` showing volume share by pyeong tier and region.
8. `frontend/src/components/stats/HyperlocalInsightCards.tsx`: 4 high-dwell-time insight summary cards (신고가 갱신, 전세가율/갭 최적, 거래량 급증, 낙폭과대 급매) linking to existing modals or detailed views.
9. `frontend/src/components/stats/StatsAdBanners.tsx`: AdSense wrappers using `AdSlot.tsx` with strict min-height bounding boxes (`min-h-[90px]`, `min-h-[140px]`, `min-h-[250px]`) at the 4 strategic placement coordinates:
   - `stat-slot-filter-bottom` (horizontal-strip)
   - `stat-slot-mid-feed` (in-feed)
   - `stat-slot-ranking-break` (in-feed)
   - `stat-slot-bottom-anchor` (banner)
10. `frontend/src/components/LoungeHeader.tsx`: Add 4th navigation tab (`/stats`, label: '통계 리포트', icon: `BarChart3`).
11. `frontend/src/components/pwa/MobileDock.tsx`: Add 4th navigation tab (`/stats`, label: '통계 리포트', icon: `BarChart3`).
12. `frontend/src/components/HeaderDockSync.test.tsx`: Update expected routes to include `/stats` (4-Tab contract).

## Verification Requirements
- `npx tsc --noEmit` must pass with 0 errors.
- `npm run lint` must pass with 0 errors.
- `npm test -- src/components/HeaderDockSync.test.tsx` must pass 100%.
- `npm test -- src/__tests__/stats_report_e2e.test.tsx` must pass 100%.
- `npm test -- src/lib/analytics/statsEngine.test.ts` must pass 100%.
- Write `handoff.md` and report back with verification outputs.

## 2026-09-19T15:00:22Z
Worker for Milestone 2 (Interactive Statistics Dashboard UI & AdSense Placement) dispatched with scope in DISPATCH.md.

