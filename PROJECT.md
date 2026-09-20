# Project: D-VIEW Hybrid Dashboard Integration (아파트 랩 원페이지 통합)

## Architecture
- **Overview**: D-VIEW merges the standalone `/stats` (통계 리포트) analytics into the primary home page (`/`, 아파트 랩) to deliver a single-page hybrid dashboard. Per authoritative user directive (2026-09-20T02:55:46Z), the home page preserves the existing signature 2-column hero layout at the top (Left: Pyeong demand donut chart + 4 micro metric cards; Right: Individual complex price trend line chart). Immediately below, it transitions naturally into Dongtan-wide macro market intelligence (5D filter bar, 4 core KPI summary cards, 4 hyperlocal insight cards, pyeong ranking chart, volume distribution chart), connected with inline AdSense slots, followed by the daily transaction timeline, high-CPC finance tools, and AI simulators.
- **Data Layer ($0 Zero-Cost Architecture)**: Both macro statistics and micro complex analysis utilize static CDN JSON files (`public/data/recent-transactions.json`, `public/data/macro-trend.json`, `public/data/tx-summary.json`, `public/data/transactions-1y.json`) and pure in-memory calculation via `statsEngine.ts`. Zero direct Firestore queries occur on the client.
- **Navigation Layer**: Streamlined from 4 tabs to canonical 3 tabs across desktop (`LoungeHeader.tsx`) and mobile (`MobileDock.tsx`): `[아파트 랩 (/) | 아파트 탐색 (/explore) | 단지 MBTI (/mbti)]`.
- **Routing & Redirection**: `/stats` is permanently 301-redirected to `/` in both `next.config.ts` (HTTP layer) and `src/app/stats/page.tsx` (component layer).
- **Monetization & CLS**: 5 high-viewability AdSense slots placed with fixed CSS min-height bounding boxes (`min-h-[140px] sm:min-h-[160px]`, etc.) guaranteeing Cumulative Layout Shift (CLS) < 0.01.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Canonical 3-Tab Global Navigation | Synchronize `LoungeHeader.tsx` and `MobileDock.tsx` to exact 3 tabs `[아파트 랩 | 아파트 탐색 | 단지 MBTI]`. | M1 | Survey & R3 |
| F2 | `/stats` 301 Permanent Redirect | Redirect `/stats` and `/stats/:path*` to `/` in `next.config.ts` and `src/app/stats/page.tsx`. | M1 | Survey & R3 |
| F3 | Navigation Test Synchronization | Synchronize test suites (`HeaderDockSync.test.tsx`, `stats_m2_m3_challenger.test.tsx`, `stats_report_e2e.test.tsx`, `m1_navigation_redirects_empirical_challenger.test.tsx`) to pass with 3-tab contract. | M1 | Survey & R3 |
| F4 | Modular `StatsOverviewSection` Component | Encapsulate 5D filter state, `aggregateStats()` computation, and stats UI components into a reusable client module. | M2 | Survey & R1 |
| F5 | 4 Core KPIs & 5D Filter Reactivity | Render total volume (+MoM), avg sale price, avg pyeong price, and avg jeonse ratio with <300ms reactive filter updates. | M2 | Survey & R1, R2 |
| F6 | Visual Charts & Hyperlocal Insight Cards | Render `StatsTimeTrendChart`, `StatsPyeongRankingChart`, `StatsVolumeDistributionChart`, and 4 `HyperlocalInsightCards`. | M2 | Survey & R1 |
| F7 | In-Page Modal & Complex Selection Wiring | Clicking any complex in stats ranking or hyperlocal insight cards directly triggers `FieldReportModal` in-page without navigation. | M2 | Survey & R1 |
| F8 | Single-Page Vertical Transition | Preserve existing signature 2-column hero at top (donut + price trend line chart), transition smoothly into macro stats section below, connected with inline AdSense slots and followed by timeline & AI tools. | M2 | Survey & R1, R2, User Feedback |
| F9 | Inline AdSense Optimization | Place high-viewability in-feed AdSlot between top stats section and lower complex analysis section. | M3 | Survey & R3 |
| F10 | Zero-CLS Bounding Box Guarantee | Ensure all ad slots maintain identical min-height bounding boxes across skeleton, placeholder, fallback, and live ad states (CLS < 0.01). | M3 | Survey & R3 |
| F11 | End-to-End Verification & Coverage Hardening | Run 100% of test suites, type checking (`tsc`), linting, production build, adversarial challenges, and forensic integrity audit. | M4 | Survey & Acceptance Criteria |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Navigation 3-Tab Sync & 301 Redirect | `LoungeHeader.tsx`, `MobileDock.tsx`, `next.config.ts`, `src/app/stats/page.tsx`, and associated navigation test suites (F1, F2, F3). | None | DONE |
| M2 | Hybrid Dashboard UI & State Integration | `StatsOverviewSection.tsx`, `MacroDashboardClient.tsx`, `StatsFilterBar.tsx`, stats charts, and modal wiring (F4, F5, F6, F7, F8). | M1 | DONE |
| M3 | Inline AdSense & Zero-CLS Layout | AdSlot placement, bounding box containers, CLS measurement, and ad banner integration (F9, F10). | M2 | DONE |
| M4 | Final Milestone: Full Verification & Audit | Tiers 1-5 test execution, adversarial stress testing, forensic integrity audit, `tsc`, `lint`, and `next build` (F11). | M3 | DONE |

---

## Interface Contracts
### `StatsOverviewSection` ↔ `MacroDashboardClient`
```typescript
export interface StatsOverviewSectionProps {
  initialData?: {
    transactions?: Transaction[];
    macroTrend?: MacroTrendPoint[];
    summaryMap?: Record<string, ComplexSummary>;
  };
  onSelectApt: (aptName: string, dong?: string) => void;
  onOpenJeonseSafety?: (aptName?: string) => void;
  onOpenCompare?: (aptName?: string) => void;
}
```
- **Data flow**: In-memory static datasets passed or cached; filter state changes invoke `aggregateStats()` in <20ms using React 18 `startTransition`.
- **Complex selection**: Clicking a complex row or card in stats invokes `onSelectApt(aptName, dong)` which opens `FieldReportModal` in `DashboardClient.tsx`.

### Navigation 3-Tab Contract
```typescript
export const TABS = [
  { id: 'overview', label: '아파트 랩', icon: Building2, href: '/' },
  { id: 'imjang', label: '아파트 탐색', icon: Home, href: '/explore' },
  { id: 'mbti', label: '단지 MBTI', icon: Sparkles, href: '/mbti' },
] as const;
```
- Exactly 3 tabs rendered in matching order on both `LoungeHeader.tsx` and `MobileDock.tsx`.

### 301 Permanent Redirect Contract
- HTTP Request to `/stats` or `/stats/*` returns HTTP 301/308 redirect to `/`.
- Client-side navigation or component render at `/stats` invokes `redirect('/', RedirectType.permanent)`.

### AdSlot Bounding Box Contract
- Format `in-feed` must enforce `min-h-[140px] sm:min-h-[160px]`.
- Container must wrap skeleton, dev placeholder, adblock fallback, and `<ins className="adsbygoogle" />` with identical minimum height to ensure CLS = 0.000.

---

## Code Layout
- `frontend/src/app/page.tsx`: Server Component entry for `/`.
- `frontend/src/app/stats/page.tsx`: Server Component fallback redirecting to `/`.
- `frontend/src/components/DashboardClient.tsx`: Client orchestrator managing modals and tab state.
- `frontend/src/components/MacroDashboardClient.tsx`: Main dashboard view combining macro stats and micro complex analysis.
- `frontend/src/components/stats/StatsOverviewSection.tsx`: Encapsulated macro statistics section (KPIs, 5D filters, charts).
- `frontend/src/components/LoungeHeader.tsx`: Desktop 3-tab navigation header.
- `frontend/src/components/pwa/MobileDock.tsx`: Mobile 3-tab navigation dock.
- `frontend/src/components/ads/AdSlot.tsx`: AdSense wrapper with fixed bounding box min-height classes.
- `frontend/next.config.ts`: Next.js configuration with 301 permanent redirects.
