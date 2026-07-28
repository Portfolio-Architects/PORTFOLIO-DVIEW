## 2026-07-27T14:51:18Z
<USER_REQUEST>
You are worker_m2_m3 executing R1, R2, and R3 refactoring & defense logic.
Working Directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_worker_m2_m3
Identity: teamwork_preview_worker_m2_m3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your objective is to refactor and harden the frontend codebase in `frontend/`:

1. **R1. Mobile Layout & Outline Defense**:
   - `frontend/src/app/globals.css`: Add focus-ring outline defense utilities (`.focus-ring-container` or safe inset/offset handling for `overflow-hidden` containers).
   - `frontend/src/components/pwa/MobileDock.tsx`: Fix 320px text label squeezing (`text-[9.5px] xs:text-[10.5px]`, `size={17} sm:size={19}`). Move `tabs` array outside component render body. Remove redundant `window.history.pushState` in click handler when `router.replace` runs.
   - `frontend/src/components/DashboardClient.tsx` & `LoungeFeedClient.tsx`: Fix `CalculatorLoader` min-w breach on 320px (`w-[calc(100vw-32px)] min-w-[260px] max-w-[320px]`).
   - `frontend/src/components/MacroDashboardClient.tsx`: Fix popover overflow on line 1812 (`max-w-[calc(100vw-32px)]`). Fix focus ring cutoff on card buttons. Fix timeline item text blowout (`min-w-0`, `max-w-[45%]`).
   - `frontend/src/components/macro/TechnoValleyDashboard.tsx`: Make donut SVG responsive (`w-[180px] h-[180px] xs:w-[210px] xs:h-[210px] sm:w-[260px] sm:h-[260px]`).
   - `frontend/src/components/LoungeFeedClient.tsx`: Fix notice info row flex text blowout (`min-w-0`, `truncate max-w-[90px]`).

2. **R2. Chart Rendering Pipeline Defense & Modularization**:
   - `frontend/src/components/MacroTrendChart.tsx`: Connect 150ms debounced `useResizeObserver` to `containerRef` instead of un-debounced inline observer to eliminate layout thrashing. Remove unused dead code. Add null/undefined guard to `lineData?.map()`.
   - `frontend/src/components/macro/MindMap3D.tsx`: Fix 600x400 buffer scaling issue on mobile viewports (<600px). Add null guard for `sheetApartments || {}`.
   - `frontend/src/components/TransactionChartSection.tsx`: Add null guard for `transactions || []`. Extract inline component functions from `<Customized>` and tooltip content into memoized components/callbacks.
   - `frontend/src/components/macro/TechnoValleyDashboard.tsx`: Fix fixed YAxis domain (`[0, 26]`) to be dynamic.
   - **Modularization**: Extract pure chart calculation and data transformation functions into separate utility modules:
     - `frontend/src/lib/utils/macroChartTransform.ts`
     - `frontend/src/lib/utils/transactionChartTransform.ts`
   - **Chart Fallback UI & Error Boundary**: Create `frontend/src/components/common/ChartErrorBoundary.tsx`. Wrap chart components with `ChartErrorBoundary` to catch SVG/Recharts errors and show a clean Fallback UI without console errors.

3. **R3. Mobile Performance & Regression Testing**:
   - `frontend/jest.setup.ts`: Add global polyfills for `ResizeObserver`, `IntersectionObserver`, and `window.matchMedia`.
   - `frontend/playwright.config.ts`: Add mobile viewport targets (`Mobile Chrome`, `Mobile Safari`).
   - `frontend/package.json`: Add scripts `"test:unit": "jest"`, `"test:e2e:mobile": "playwright test --project='Mobile Chrome' --project='Mobile Safari'"`.
   - Create unit tests for chart data transformation utilities, empty/null fallbacks, and error boundary in `frontend/src/lib/utils/*.test.ts` or `frontend/src/__tests__/`.
   - Run `npm run build` and `npm test` in `frontend/`. Ensure zero TypeScript errors and 100% test pass rate.

Write a complete report of all changes and test outputs to `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_worker_m2_m3\handoff.md`.
Send a summary message when completed.
</USER_REQUEST>
