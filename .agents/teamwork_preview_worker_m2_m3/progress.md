# Progress Log - teamwork_preview_worker_m2_m3

Last visited: 2026-07-27T23:55:30Z

## Completed Tasks
- [x] **R1. Mobile Layout & Outline Defense**
  - Updated `globals.css`: Added focus-ring outline defense utilities (`.focus-ring-container`, `.focus-ring-inset`).
  - Refactored `MobileDock.tsx`: Moved static `TABS` array outside component render body, updated icon sizing (`size={17}`, `sm:w-[19px] sm:h-[19px]`) and font size (`text-[9.5px] xs:text-[10.5px]`), removed redundant `pushState`.
  - Updated `DashboardClient.tsx` & `LoungeFeedClient.tsx`: Fixed `CalculatorLoader` min-w breach on 320px viewports (`w-[calc(100vw-32px)] min-w-[260px] max-w-[320px]`).
  - Updated `LoungeFeedClient.tsx`: Fixed notice info row text overflow on mobile (`min-w-0`, `truncate max-w-[90px]`).
  - Updated `MacroDashboardClient.tsx`: Fixed popover width overflow on 320px viewports (`max-w-[calc(100vw-32px)]`), added `focus:ring-inset` for overflow-hidden containers, fixed timeline item card text clipping (`min-w-0 max-w-[45%] sm:max-w-none`).
  - Updated `TechnoValleyDashboard.tsx`: Responsive donut chart SVG sizing (`w-[180px] h-[180px] xs:w-[210px] xs:h-[210px] sm:w-[260px] sm:h-[260px]`) and matchMedia listener safety.

- [x] **R2. Chart Rendering Pipeline Defense & Modularization**
  - Extracted `macroChartTransform.ts`: Pure data transformation functions (`processMacroTrendData`, `formatXAxisTick`, `calculateMacroGapAndRatio`).
  - Extracted `transactionChartTransform.ts`: Pure transaction calculation functions (`getCachedTimestamp`, `formatAvgPriceEok`, `calculateMonthlyAverages`).
  - Created `ChartErrorBoundary.tsx`: Robust error boundary for SVG/Recharts render errors.
  - Refactored `MacroTrendChart.tsx`: Connected debounced 150ms `useResizeObserver`, eliminated inline un-debounced observer, added null guards, wrapped in `ChartErrorBoundary`.
  - Updated `TechnoValleyDashboard.tsx`: Replaced hardcoded YAxis domain `[0, 26]` with dynamic `[0, 'auto']`.
  - Refactored `MindMap3D.tsx`: Added null guards for `sheetApartments` and `txSummaryData`, fixed hardcoded 600x400 canvas buffer scaling on small viewports (<600px).
  - Refactored `TransactionChartSection.tsx`: Added null guard for `transactions`, extracted inline `<Customized>` dots and `<RechartsTooltip>` into memoized components (`ScatterCustomizedDots`, `TransactionChartTooltip`), used cached timestamp/formatting utilities, wrapped render output in `ChartErrorBoundary`.

- [x] **R3. Mobile Performance & Regression Testing**
  - Updated `jest.setup.ts`: Added global polyfills for `ResizeObserver`, `IntersectionObserver`, and `window.matchMedia`.
  - Updated `playwright.config.ts`: Configured `Mobile Chrome` (Pixel 5) and `Mobile Safari` (iPhone 12) test projects.
  - Updated `package.json`: Added `"test:unit": "jest"` and `"test:e2e:mobile": "playwright test --project='Mobile Chrome' --project='Mobile Safari'"` scripts.
  - Created Unit Tests:
    - `macroChartTransform.test.ts`: 100% pass for data transformation, tick formatting, and ratio calculation.
    - `transactionChartTransform.test.ts`: 100% pass for timestamp caching, price formatting, and monthly averaging.
    - `ChartErrorBoundary.test.tsx`: 100% pass for clean rendering, error fallback UI, and state reset retry.

## Status
- Unit tests: 43 test suites, 294 tests passed (100% pass rate).
- Production build: Next.js compilation in progress.
