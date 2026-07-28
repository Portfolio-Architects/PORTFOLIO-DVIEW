# Handoff Report: R3 (Mobile Performance & Regression Testing Audit)

## 1. Observation
- **Test Infrastructure (`frontend/package.json`, `jest.config.ts`, `jest.setup.ts`, `playwright.config.ts`)**:
  - `package.json` line 24-25: Contains `"test": "jest"` and `"test:e2e": "playwright test"`, lacking mobile-specific scripts (`test:e2e:mobile` or `test:perf`).
  - `jest.setup.ts` lines 1-24: Polyfills `fetch`, `Headers`, `Request`, `Response`, but contains NO global mocks for `ResizeObserver`, `IntersectionObserver`, or `window.matchMedia`.
  - `playwright.config.ts` lines 15-20: `projects` array only includes `chromium` (`Desktop Chrome`). Mobile device profiles (`Pixel 7`, `iPhone 14`) are missing.
- **Re-rendering & Inline Subtree Re-creation (`TransactionChartSection.tsx`, `MobileDock.tsx`)**:
  - `TransactionChartSection.tsx` line 796: Inline component `<Customized component={(rechartProps) => ...} />` created inside render function.
  - `TransactionChartSection.tsx` line 746: Inline tooltip handler `<RechartsTooltip content={({ active, payload }) => ...} />`.
  - `MobileDock.tsx` lines 54-65: `tabs` array defined inside render body; line 93 calls both `window.history.pushState` and `router.replace(tab.href, { scroll: false })`.
- **Layout Thrashing (Reflow) on Resize (`MacroTrendChart.tsx`)**:
  - `MacroTrendChart.tsx` lines 227-238: Attached `ResizeObserver` inside `useLayoutEffect` calls `setContainerWidth` and `setContainerHeight` on every 1px container size change without debouncing or throttling.
  - `MacroTrendChart.tsx` lines 127-199: Pre-existing `useResizeObserver` hook with 150ms debounce and 2px threshold is defined but unused.
- **Chart Fallback & Error Defense (`TransactionChartSection.tsx`, `globals.css`)**:
  - `TransactionChartSection.tsx` lines 558-568: Clean empty state UI rendered when `relevantTxs.length === 0`.
  - `TransactionChartSection.tsx` lines 833-835: Shimmer placeholder rendered when `!isChartReady || dimensions.width === 0`.
  - Recharts components lack isolated React Error Boundary wrappers.

## 2. Logic Chain
1. **From Observation to Test Infra Deficiency**: Missing `ResizeObserver` in `jest.setup.ts` causes unit/component tests for responsive charts to throw warnings/errors during test execution. Missing `Mobile Chrome` and `Mobile Safari` projects in `playwright.config.ts` leaves mobile viewports untested during automated CI/CD runs.
2. **From Observation to Rendering Bottlenecks**: In React, passing inline function components to Recharts (`<Customized component={...}>`) forces React to consider the component type modified on every parent render pass, destroying and re-instantiating the SVG DOM nodes. In `MobileDock.tsx`, executing both `pushState` and `router.replace` triggers double history modification and double React rendering cycles.
3. **From Observation to Layout Thrashing**: An un-debounced `ResizeObserver` in `MacroTrendChart.tsx` calling `setState` on every pixel change forces synchronous layout recalculation and frame drops during window resize, device orientation shifts, or mobile touch scrolling.
4. **From Observation to Fallback/Error Defense Gaps**: SVG coordinate or scaling errors in Recharts caused by missing or malformed price data currently bubble up to parent dialogs/pages due to missing isolated Chart Error Boundaries.

## 3. Caveats
- Investigation was strictly read-only per system instructions; no code modifications were applied to project source code.
- Analysis was performed on local static code inspection and configuration review; actual runtime frame rates should be verified with Chrome DevTools Performance Profiler when running the Next.js dev/production server.

## 4. Conclusion
Mobile rendering performance and test coverage for R3 can be significantly optimized through targeted fixes:
1. Extend `jest.setup.ts` with global mocks for `ResizeObserver`, `IntersectionObserver`, and `window.matchMedia`.
2. Add mobile device targets (`Mobile Chrome`, `Mobile Safari`) and npm scripts (`test:e2e:mobile`) to Playwright test suite.
3. Memoize `Customized` scatter rendering and tooltip functions in `TransactionChartSection.tsx`.
4. Replace un-debounced `ResizeObserver` in `MacroTrendChart.tsx` with the existing debounced `useResizeObserver` hook.
5. Move `tabs` constant outside `MobileDock.tsx` render and eliminate redundant `pushState` calls.
6. Wrap chart components in isolated `<ChartErrorBoundary>` components to prevent uncaught rendering failures.

## 5. Verification Method
1. **Jest Polyfill Verification**:
   - Run `npx jest src/components/apartment-modal/TransactionChartSection.test.tsx` (after creating test file) and verify zero `ResizeObserver is not defined` warnings.
2. **Playwright Mobile E2E Verification**:
   - Run `npx playwright test --project="Mobile Chrome"` to verify mobile layout compliance and bottom dock rendering.
3. **Re-render & Reflow Verification**:
   - Inspect React DevTools Profiler during window resizing on `/overview` and `/technovalley` to confirm `MacroTrendChart` state updates are debounced by 150ms.
