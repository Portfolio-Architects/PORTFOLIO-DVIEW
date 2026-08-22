# Comprehensive Survey Report: Presentation Layer, API Routes, Scripts, Dependencies & Verification Gates

**Author**: Explorer 3  
**Date**: 2026-08-21  
**Target Codebase**: `frontend/` (D-VIEW Project)  
**Working Directory**: `.agents/explorer_survey_3`

---

## 1. Executive Summary

This report delivers an exhaustive, empirical architectural survey of the **Presentation Layer** (`src/components/`, `src/app/`), **API Route Handlers** (`src/app/api/`), **Data Pipeline & Automation Scripts** (`scripts/`), **Configurations & Dependencies** (`package.json`, `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `jest.config.ts`), and **Verification Gates** across the `frontend/` workspace.

### Key Highlights & Baseline Metrics
- **TypeScript Type Check (`npx tsc --noEmit`)**: Pass (Status 0, 0 errors).
- **ESLint (`npm run lint`)**: Pass (Status 0, 0 errors/warnings under current relaxed rules).
- **Unit & Component Test Suite (`npm test`)**: Pass (Status 0, **67 test suites**, **491 tests** passed, 0 failures).
- **Production Build (`npx next build`)**: Pass (Status 0, Turbopack production compilation completed, 177 static/dynamic routes generated).
- **API Route Standardization Deficit**: Only **3 out of 46 route handlers** (~6.5%) currently utilize the standardized response envelope (`apiSuccess`/`apiError`) and rate limiter (`checkRateLimit`). 43 routes return inconsistent raw JSON payloads (`{ error: '...' }`, `{ data: ... }`, `{ buyCount, waitCount }`, etc.).
- **Layer Boundary Violations**: Multiple instances of upward imports and leaked domain logic were detected:
  1. `src/lib/contexts/SettingsContext.tsx` imports presentation component `@/components/SettingsModal`.
  2. `src/lib/utils/preloadHelpers.ts` directly imports 12+ presentation components.
  3. `src/lib/utils/transactionChartTransform.ts` imports TypeScript interface `TransactionRecord` from presentation component `@/components/apartment-modal/TransactionTable`.
  4. `src/app/apartment/[aptName]/page.tsx` contains 829 lines mixing server data reading (`fs`), calculations (`getPyeongSummaries`), and formatting logic directly in the presentation page route.
  5. `src/lib/DashboardFacade.ts` re-exports `useDashboardData` from `@/hooks/useDashboardData`.

---

## 2. Presentation Layer Architecture Survey

### 2.1 Component Hierarchy & Directory Organization
The Presentation Layer spans `src/components/` and `src/app/`, organized into functional clusters:

```
src/components/
├── DashboardClient.tsx             # Root multi-tab orchestrator (Overview, Imjang, Lounge, Office, Technovalley)
├── TossApartmentExploreClient.tsx  # Interactive apartment explorer grid/table with filters
├── MacroDashboardClient.tsx        # Macro economic & real estate market trends dashboard
├── LoungeContainerClient.tsx       # Community forum wrapper & sub-routing
├── LoungeFeedClient.tsx            # Community post feed list, category filters, sorting
├── LoungeDetailClient.tsx          # Community post detail, comments, reply thread view
├── LoungeComposeClient.tsx         # Post creation & rich editor
├── OfficeExplorerClient.tsx        # Knowledge industry center (지식산업센터) office matcher
├── OfficeDetailModal.tsx           # Office detail inspection & contact modal
├── GapInvestmentExplorer.tsx       # Gap investment opportunity scanner & risk analyzer
├── CommentSection.tsx              # Universal commenting & nested thread component
├── FloatingUserBar.tsx             # Floating user profile & quick navigation bar
├── LocalEventCuration.tsx          # Local events & notices feed
├── ChopoomaCuration.tsx            # School-proximity (초품아) complex curation widget
├── HotComplexRanking.tsx           # Real-time trending apartment leaderboard
├── WriteReviewModal.tsx            # User apartment review submission modal
├── ApartmentModal.tsx              # Re-export entrypoint for apartment details modal
├── apartment/
│   ├── ApartmentModal.tsx          # Primary apartment modal layout
│   ├── ApartmentModalHeader.tsx
│   ├── ApartmentModalKakaoCard.tsx
│   ├── ApartmentModalPriceSummary.tsx
│   ├── ApartmentModalTransactionsTable.tsx
│   └── hooks/useApartmentModalState.ts
├── apartment-modal/                # Sub-sections for apartment modal
│   ├── ApartmentGallery.tsx        # Photo gallery & slideshow
│   ├── ApartmentSpecsSection.tsx   # Complex specifications
│   ├── BuyOrWaitVote.tsx           # "살래요 vs 기다릴래요" sentiment voting
│   ├── ChildcareDetailSection.tsx  # Daycare & kindergarten proximity
│   ├── EducationAnalysisSection.tsx# School zoning & private academy metrics
│   ├── InfraAnalysisSection.tsx    # Subway, train, highway, park access
│   ├── JeonseSafetyReport.tsx      # Jeonse safety & fraud risk assessment
│   ├── PhotoUploadModal.tsx        # Site inspection photo upload modal
│   ├── ScoutingReportDetailSection.tsx # Qualitative scouting analysis
│   ├── TransactionChartSection.tsx # Recharts-based interactive timeline price chart
│   ├── TransactionSummaryMetrics.tsx # 1M/3M average & max price badges
│   ├── TransactionTable.tsx        # Paginated/virtualized transaction ledger
│   └── ViralPaywallGate.tsx        # Share/Login barrier for premium content
├── consumer/                       # Consumer tools & financial calculators
│   ├── AIRecommendations.tsx       # AI budget/distance complex recommendations
│   ├── AdvancedValuationMetrics.tsx# Quantitative valuation metrics
│   ├── AnchorTenantCard.tsx        # Commercial anchor tenant indicators
│   ├── AptCompareModal.tsx         # 2~3 complex comparison radar & chart modal
│   ├── AptFitFinder.tsx            # Step-by-step preference quiz
│   ├── JeonseSafetyCalculator.tsx  # Interactive jeonse risk simulator
│   ├── MortgageCalculator.tsx      # DSR/LTV loan & payment calculator
│   ├── PropertyTaxCalculator.tsx   # Acquisition & holding tax simulator
│   ├── SellTimingCalculator.tsx    # Capital gains tax & selling period optimizer
│   └── compare/                    # Modular comparison subcomponents
├── macro/                          # Macro market & Technovalley modules
│   ├── TechnoValleyDashboard.tsx   # Technovalley overview & tenant directory
│   ├── CoLeasingBoard.tsx          # Subletting/shared office recruitment
│   ├── RelocationTaxSimulator.tsx  # Metropolitan relocation corporate tax relief
│   ├── TrafficNoticeBoard.tsx      # Rail/road infrastructure notice board
│   ├── components/                 # Macro UI slices
│   └── techno/                     # Technovalley specific charts & metrics
├── ui/                             # Base atomic UI primitives & skeletons
│   ├── ApartmentModalSkeleton.tsx
│   ├── ErrorBoundary.tsx
│   ├── LoginGateModal.tsx
│   ├── LoungeSkeleton.tsx
│   ├── MacroDashboardSkeleton.tsx
│   ├── MarkdownViewer.tsx
│   ├── OfflineBanner.tsx
│   ├── ScrollToTop.tsx
│   ├── SegmentedControl.tsx
│   ├── TechnoValleySkeleton.tsx
│   ├── Tooltip.tsx
│   └── WelcomeModal.tsx
├── admin/                          # Administrative CMS components
│   ├── AnalyticsDashboard.tsx
│   ├── ReportEditorForm.tsx
│   ├── ValuationTuner.tsx
│   ├── apartment-editor/
│   └── report-editor/
└── pwa/                            # Progressive Web App integration
    ├── CustomA2HSModal.tsx
    ├── InAppBrowserBypass.tsx
    ├── MobileDock.tsx
    ├── PWAProvider.tsx
    ├── PullToRefresh.tsx
    ├── PushSubscriptionModal.tsx
    └── SWRProvider.tsx
```

### 2.2 Dynamic Code Splitting & Lazy-Loading Strategy
- Heavy interactive features are code-split using `next/dynamic` with custom fallback loaders and retry shields (`safeReload`):
  - `ApartmentModal` (`ssr: false`, `ApartmentModalSkeleton`)
  - `MacroDashboardClient` (`ssr: false`, `MacroDashboardSkeleton`)
  - `LoungeContainerClient` (`ssr: false`, `LoungeSkeleton`)
  - `OfficeExplorerClient` (`ssr: false`, `OfficeSkeleton`)
  - Financial Calculators (`AptCompareModal`, `JeonseSafetyCalculator`, `MortgageCalculator`, `PropertyTaxCalculator`, `SellTimingCalculator`) with `CalculatorLoader`.
- **Finding**: While dynamic imports reduce initial bundle size, some dynamic import definitions are duplicated across `DashboardClient.tsx`, `SettingsContext.tsx`, and `preloadHelpers.ts`.

### 2.3 Existing Test-ID Contracts & Behavioral Invariants
The test suites assert specific `data-testid` attributes and DOM structures that **must remain unchanged** during refactoring:
- `complex-card`, `complex-name`, `risk-btn` (`GapInvestmentExplorer.tsx`)
- `radar-chart`, `line-chart`, `area-chart`, `pie-chart` (Recharts SVG wrappers in `AptCompareModal`, `TechnoValleyDashboard`, `TransactionChartSection`)
- `revalidateOnFocus`, `revalidateOnReconnect`, `refreshInterval`, `shouldRetryOnError` (`SWRProvider.tsx`)
- `lounge-skeleton`, `macrodashboard-skeleton`, `technovalley-skeleton` (`ui/*Skeleton.tsx`)
- `chart-content`, `content` (`ErrorBoundary.tsx`, `ChartErrorBoundary.tsx`)

---

## 3. Layer Boundary Violations & Cross-Layer Dependency Analysis

### 3.1 Observed Upward Imports & Leaks

| Source File | Imported Target | Issue Description | Recommended Fix |
|---|---|---|---|
| `src/lib/contexts/SettingsContext.tsx:9` | `@/components/SettingsModal` | Infrastructure context imports Presentation UI component | Decouple modal visibility state from modal component rendering; mount `SettingsModal` in layout or root client provider |
| `src/lib/utils/preloadHelpers.ts:8-32` | `@/components/ApartmentModal`, `@/components/CommentSection`, `@/components/apartment-modal/*`, `@/components/GapInvestmentExplorer`, etc. | Utility in `src/lib/` directly imports presentation modules | Move dynamic bundle preloading logic into presentation-level hook or UI orchestrator (`src/hooks/usePreloadComponents.ts`) |
| `src/lib/utils/transactionChartTransform.ts:1` | `TransactionRecord` from `@/components/apartment-modal/TransactionTable` | Infrastructure transformation utility imports type contract from UI component | Extract `TransactionRecord` interface to `src/types/transaction.ts` (Domain Layer) and import from `@/types` |
| `src/lib/DashboardFacade.ts:516` | `useDashboardData` from `@/hooks/useDashboardData` | Facade in `src/lib/` re-exports a React hook from `src/hooks/` | Consumer components should import `useDashboardData` directly from `@/hooks/useDashboardData` |
| `src/app/apartment/[aptName]/page.tsx:5-120` | Local calculations (`getPyeongSummaries`, `generateAiBriefing`, `formatPriceEok`, `decodeAptName`), `fs` calls | Business calculations and direct disk reads embedded in page component | Extract to `src/lib/services/apartmentDetail.service.ts` or domain calculation helper |

---

## 4. API Routes (`src/app/api/`) Architecture Survey

### 4.1 Response Envelope & Rate Limiting Overview
- **Total Route Files**: 46
- **Routes using `@/lib/api/apiResponse` (`apiSuccess`, `apiError`)**: **3** (`cron/sync-transactions`, `technovalley/center-specs`, `technovalley/trend`)
- **Routes using `@/lib/api/rateLimiter` (`checkRateLimit`)**: **3** (`cron/sync-transactions`, `technovalley/center-specs`, `technovalley/trend`)
- **Routes using legacy / ad-hoc responses (`NextResponse.json`)**: **43**

### 4.2 Complete API Route Inventory & Audit

| API Route Path | HTTP Methods | Current Response Format | Rate Limiting Status | Standardization Priority |
|---|---|---|---|---|
| `/api/admin/analytics` | GET | `{ data: ... }` / `{ error: ... }` | None | High |
| `/api/admin/search-console` | GET | `{ status: ... }` / `{ error: ... }` | None | Medium |
| `/api/admin/search-console/indexing` | POST | `{ success: false, error: ... }` / raw result | None | Medium |
| `/api/admin/sync-reports` | POST | Raw summary `{ total, processed, ... }` | None | High |
| `/api/ads/click` | POST | `{ success: true, message: ... }` | Ad-hoc IP check | High |
| `/api/apartments/vote` | GET, POST | `{ buyCount, waitCount }` / `{ success: true, buyCount, waitCount }` | Ad-hoc IP check | High |
| `/api/apartments-by-dong` | GET | Raw array / `{ error: ... }` | Ad-hoc IP check | High |
| `/api/apartments-sync` | POST | `{ success: true, updatedCount, addedCount, deletedCount }` | None | High |
| `/api/auth/session` | POST, DELETE | `{ status: 'success' }` / `{ error: ... }` | None | High |
| `/api/bypass-notice` | GET, POST | `{ notice: ... }` | None | Medium |
| `/api/comments` | GET, POST, DELETE | Raw array / `{ success: true }` | Ad-hoc IP check | High |
| `/api/cron/send-tx-notifications` | GET, POST | `{ sentCount: ... }` | None | Medium |
| `/api/cron/sync-local-notices` | GET, POST | `{ syncedCount: ... }` | None | Medium |
| `/api/cron/sync-transactions` | GET, POST | **`apiSuccess` / `apiError`** | **`checkRateLimit`** | Standardized ✅ |
| `/api/dashboard-init` | GET | Raw initial data object | None | High |
| `/api/debug-reports` | GET | `{ reports: ... }` | None | Low |
| `/api/explore/search-data` | GET | Raw search index object | None | High |
| `/api/favorite` | GET, POST, DELETE | `{ isFavorite: ... }` / `{ success: true }` | None | High |
| `/api/favorite-counts` | GET | `{ counts: ... }` | None | Medium |
| `/api/indexing/apartment` | POST | `{ success: true, count: ... }` | None | Medium |
| `/api/local-notices` | GET | `{ notices: ... }` | None | High |
| `/api/location-scores` | GET | Raw location scores map | None | High |
| `/api/macro/news` | GET | `{ news: ... }` | None | High |
| `/api/macro/rates` | GET | `{ rates: ... }` | None | High |
| `/api/og` | GET | ImageResponse (Binary SVG/PNG) | N/A (Edge image generation) | Standardized (Image) ✅ |
| `/api/posts` | GET, POST, DELETE | Raw post array / `{ id: ... }` | Ad-hoc IP check | High |
| `/api/proxy-image` | GET | Binary image stream | None | Medium |
| `/api/public/analytics` | POST | `{ ok: true }` | Ad-hoc check | Medium |
| `/api/push/notify-comment` | POST | `{ success: true }` | None | High |
| `/api/push/notify-new-high` | POST | `{ success: true }` | None | High |
| `/api/push/subscribe` | POST | `{ success: true }` | None | High |
| `/api/push/unsubscribe` | POST | `{ success: true }` | None | High |
| `/api/report-view` | POST | `{ viewCount: ... }` | None | High |
| `/api/subscribe` | POST | `{ success: true }` | None | High |
| `/api/technovalley/center-specs` | GET | **`apiSuccess` / `apiError`** | **`checkRateLimit`** | Standardized ✅ |
| `/api/technovalley/industry-distribution` | GET | `{ distribution: ... }` | None | High |
| `/api/technovalley/jisan-status` | GET | `{ status: ... }` | None | High |
| `/api/technovalley/transactions` | GET | `{ transactions: ... }` | None | High |
| `/api/technovalley/trend` | GET | **`apiSuccess` / `apiError`** | **`checkRateLimit`** | Standardized ✅ |
| `/api/test-names` | GET | `{ names: ... }` | None | Low |
| `/api/traffic` | GET | `{ notices: ... }` | None | High |
| `/api/transaction-summary` | GET | Raw tx summary map | None | High |
| `/api/type-map` | GET | `{ typeMap: ... }` | None | Medium |
| `/api/unsubscribe` | POST | `{ success: true }` | None | High |

---

## 5. Data Pipeline & Automation Scripts Survey

### 5.1 Pipeline Decomposition Structure
The build-time data ingestion pipeline is structured under `scripts/pipeline/`:
1. `scripts/pipeline/outlierFilters.js`:
   - `filterOutliersRolling(txs)`: 11-point rolling window local mean/standard deviation outlier filter.
   - `applyIqrOutlierDetection(records)`: Interquartile Range (IQR) lower bounding outlier detector for zero-latency client consumption.
2. `scripts/pipeline/macroTrendCalculator.js`:
   - `initMacroTrendData(months, offsetMonths, baseDate)`: Initializes 18-year (216-month) trend buckets.
   - `accumulateMacroTrend(...)`: Aggregates 30~36 pyeong standard sales and rent price trends.
   - `calculateRecent7DaysVolume(...)`: Computes 7-day transaction velocity and Week-over-Week (WoW) momentum.
   - `generateMacroTrendSeries(...)`: Generates smoothed macro time-series for chart rendering.
3. `scripts/pipeline/apartmentSummarizer.js`:
   - `calculateApartmentSummary(aptName, saleTxs, rentTxs, dongMap, now)`: Computes complex metrics (1M/3M average price, rent deposit averages, jeonse ratio, min/max).
   - `formatRecentTransactions(saleTxs, now, limit)`: Extracts flat 90-day recent transaction feed.
   - Utilities: `formatPriceEok`, `parseYYYYMMDD`, `normalizeAptName`.
4. `scripts/pipeline/fileGenerators.js`:
   - `writeSummaryFiles(paths, data)`: Atomic serialization of `tx-summary.json`, `tx-recent.json`, and `macro-trend.json`.
   - `writeApartmentChunks(outDir, aptNames, byAptMap, verbose)`: Generates individual apartment JSON chunks (`<aptName>.json`, `<aptName>-recent.json`) and `_index.json`.

### 5.2 Scripts Inventory & Classification
- **Build-Time ETL Orchestration**:
  - `scripts/sync-transactions.js`: Master transaction processing pipeline (invoked on `npm run build`).
  - `scripts/update-sw-version.js`: Updates Service Worker cache identifier timestamp before build.
  - `scripts/sync-apartments.js`: Syncs apartment metadata with Google Sheets.
  - `scripts/sync-macro.js`: Syncs macro economic indicators (BOK base rates, KOSPI).
  - `scripts/sync-location-scores.js`: Pre-calculates school/subway distances and scores.
  - `scripts/sync-nps.js`: National Pension Service employment stats ETL.
  - `scripts/sync-static-data.ts`: Generates static optimization data chunks.
- **External Data Scrapers & Fetchers**:
  - `scripts/fetch-transactions.js`: MOLIT OpenAPI sales transactions fetcher.
  - `scripts/fetch-rent.js`: MOLIT OpenAPI rent/jeonse transactions fetcher.
  - `scripts/fetch-local-notices.js`: Dongtan district administration portal crawler.
- **Diagnostic & Maintenance Tools**:
  - `scripts/audit-pipeline.js`: Performance profiler and memory leak auditor.
  - `scripts/auto-improvement-runner.js`: Automated self-optimization harness.
  - `scripts/benchmark.js` & `scripts/benchmark.ts`: End-to-end transaction ETL benchmark.
  - `scripts/generate-tickers.js`, `scripts/generate-ui-ux-report.js`: Utility generators.

---

## 6. Dependencies, Tooling Configurations & Verification Gates

### 6.1 Dependency Audit (`package.json`)
- **Runtime Dependencies**:
  - React 19.2.3 / React DOM 19.2.3
  - Next.js 16.2.4 (Turbopack)
  - Tailwind CSS 4.2.1 / `@tailwindcss/postcss` 4.2.1 / `@tailwindcss/typography` 0.5.19
  - State & Caching: `swr` 2.4.1, `@upstash/redis` 1.37.0, `@upstash/ratelimit` 2.0.8
  - Visualization: `recharts` 3.8.0, `lucide-react` 0.577.0
  - Backend Integration: `firebase` 12.10.0, `firebase-admin` 13.7.0, `google-spreadsheet` 5.2.0
  - Parsing & Validation: `zod` 4.3.6, `cheerio` 1.2.0, `rss-parser` 3.13.0
- **Dev Dependencies & Test Runners**:
  - Jest 30.3.0 / `ts-jest` 29.4.6 / `jest-environment-jsdom` 30.3.0 / `@testing-library/react` 16.3.2
  - Playwright 1.58.2 (`@playwright/test`)
  - ESLint 9 / `eslint-config-next` 16.1.6
  - TypeScript 5

### 6.2 Tooling Configuration Review
- **`tsconfig.json`**: Strict type checking enabled (`"strict": true`, `"noEmit": true`, `"moduleResolution": "bundler"`, path alias `"@/*": ["./src/*"]`). Test files and scratch folders are excluded from standard compilation.
- **`eslint.config.mjs`**: Next.js core web vitals and typescript configs extended. Note: Several rules are currently disabled (`@typescript-eslint/no-explicit-any: off`, `react-hooks/rules-of-hooks: off`, `react-hooks/exhaustive-deps: off`). Refactoring will progressively restore clean typing without breaking linter status.
- **`next.config.ts`**:
  - `typescript.ignoreBuildErrors: true` (Identified as a risk that masks build errors; static gate `npx tsc --noEmit` must always run independently).
  - Aliases `@/lib/firebaseAdmin` to client stub on browser bundles to prevent Node.js built-in leaks.
- **`jest.config.ts` & `jest.setup.ts`**:
  - Configured with `ts-jest` and `jsdom`.
  - Comprehensive polyfills configured for `fetch`, `Headers`, `Request`, `Response`, `ResizeObserver`, `IntersectionObserver`, and `window.matchMedia`.

### 6.3 Verification Gates Status Matrix

| Verification Gate | Command | Execution Result | Pass/Fail | Notes |
|---|---|---|---|---|
| TypeScript Type Check | `npx tsc --noEmit` | Exit code 0, 0 errors | PASS ✅ | Strict mode compliant |
| ESLint Static Analysis | `npm run lint` | Exit code 0, 0 errors, 0 warnings | PASS ✅ | Clean run |
| Unit & Integration Tests | `npm test` | Exit code 0, 67 test suites passed, 491 tests passed | PASS ✅ | 100% pass rate in 40.3s |
| Turbopack Production Build | `npx next build` | Exit code 0, 177/177 pages compiled | PASS ✅ | Production bundle ready |

---

## 7. Actionable Refactoring Recommendations (Milestones 4 & 5)

### Milestone 4: Presentation Layer Refactoring
1. **Eliminate Upward Imports into UI Layer**:
   - Refactor `SettingsContext.tsx` to hold pure state (`isSettingsOpen`, `openSettings`, `closeSettings`) and render `<SettingsModal />` at the root layout/provider tree level.
   - Move component preload invocations in `preloadHelpers.ts` into a dedicated Presentation hook (`src/hooks/usePreloadComponents.ts`).
   - Move `TransactionRecord` interface out of `TransactionTable.tsx` into domain contract `src/types/transaction.ts`.
2. **Decompose Monolithic Page & Client Components**:
   - Refactor `src/app/apartment/[aptName]/page.tsx` (829 lines): Extract calculation logic (`getPyeongSummaries`, `generateAiBriefing`) into domain services (`src/lib/services/apartmentDetail.service.ts`).
   - Break down monolithic client components (`DashboardClient.tsx`, `LoungeFeedClient.tsx`, `MacroDashboardClient.tsx`, `TossApartmentExploreClient.tsx`) into focused single-responsibility child components and custom hooks.
3. **Preserve User Contracts & Test IDs**:
   - Maintain all existing `data-testid` attributes (`complex-card`, `radar-chart`, `line-chart`, `revalidateOnFocus`, etc.).
   - Preserve props contracts on all public component exports.

### Milestone 5: API Routes & Data Pipeline Refactoring
1. **Universal API Route Standardization**:
   - Migrate remaining 43 API routes to use `apiSuccess(data, meta, init)` and `apiError(code, message, status, details)`.
   - Apply `checkRateLimit(request, { prefix: '<route_name>', requestsPerLimit, window })` across all public mutation and resource-intensive query endpoints.
   - Standardize HTTP status codes (200, 201, 400, 401, 403, 404, 429, 500).
2. **Data Pipeline Layer Hygiene**:
   - Ensure clean interfaces for ETL scripts in `scripts/pipeline/` without side-effects on imported modules.
   - Maintain 100% test coverage on `pipeline.test.ts` and ensure zero regression across all verification gates.
