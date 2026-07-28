# R3 Investigation Report: Mobile Performance & Regression Testing Audit

**Target System**: Frontend Next.js Project (`frontend/`)  
**Auditor**: Teamwork Explorer `explorer_m1_3`  
**Date**: 2026-07-27  

---

## Executive Summary

An in-depth investigation was conducted on the mobile performance, test infrastructure, mobile outline defense, rendering bottlenecks, and chart fallback behavior in `frontend/`. 

While the application features well-designed mobile components and optimized global CSS utilities, several critical performance bottlenecks and test infrastructure gaps were identified:
1. **Jest and Playwright Setup Gaps**: Missing global polyfills (`ResizeObserver`, `IntersectionObserver`, `window.matchMedia`) in `jest.setup.ts` and missing mobile viewport targets (`Mobile Chrome`, `Mobile Safari`) in `playwright.config.ts`.
2. **Recharts Re-rendering & Inline Subtree Re-creation**: In `TransactionChartSection.tsx`, inline function components passed to `<Customized component={...}>` and `<RechartsTooltip content={...}>` force Recharts to unmount and remount SVG subtrees on every state change.
3. **Layout Thrashing (Reflow) on Resize**: In `MacroTrendChart.tsx`, an un-debounced `ResizeObserver` callback inside `useLayoutEffect` triggers React state updates on every 1px size change, bypassing a pre-existing (but unused) debounced hook.
4. **Mobile Navigation Over-triggering**: In `MobileDock.tsx`, `tabs` array is re-allocated on every render, and tab clicks trigger both `window.history.pushState` and `router.replace`, causing duplicate history mutation and double re-renders.
5. **Chart Fallback & Error Defense Vulnerabilities**: While empty data states exist in `TransactionChartSection.tsx`, charts lack dedicated React Error Boundaries, allowing uncaught SVG/Recharts rendering errors to crash parent components (`ApartmentModal`, `MacroDashboard`).

---

## 1. Test Setup & Scripts Audit (`frontend/`)

### 1.1 Package Scripts (`package.json`)
- **Current State**: `npm run test` executes `jest`, and `npm run test:e2e` executes `playwright test`.
- **Gaps**:
  - No dedicated mobile E2E test script (e.g. `npm run test:e2e:mobile`).
  - No script for mobile regression or performance contract verification (e.g. latency/CLS threshold tests).

### 1.2 Jest Configuration (`jest.config.ts` & `jest.setup.ts`)
- **Current State**: Preset `ts-jest`, environment `jsdom`, `testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/tests/']`. Polyfills `global.fetch`, `Headers`, `Request`, `Response` via `node-fetch`.
- **Gaps**:
  - **`ResizeObserver` missing**: Critical for testing responsive charts (`TransactionChartSection`, `MacroTrendChart`) and container hooks. In Jest/jsdom, any test rendering a component with `ResizeObserver` logs errors or fails.
  - **`IntersectionObserver` missing**: Critical for infinite scroll and lazy rendering components (`react-intersection-observer`).
  - **`window.matchMedia` missing**: Used in `MacroTrendChart.tsx` (line 216) and responsive theme/layout hooks.

### 1.3 Playwright E2E Configuration (`playwright.config.ts`)
- **Current State**:
  ```ts
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ]
  ```
- **Gaps**:
  - Only configures Desktop Chrome (`chromium`).
  - **Missing Mobile Devices**: Mobile devices (`Pixel 5` / `Pixel 7`, `iPhone 12` / `iPhone 14`) and viewport sizes (`375x812`, `390x844`) are absent from `projects`.
  - **Web Server Configuration**: Uses `npm run start -- -p 5000` which relies on `next start` and requires a completed build prior to E2E execution.

---

## 2. Mobile Rendering & Performance Bottlenecks Audit

### 2.1 Unnecessary Re-renders & Unmemoized Calculations

1. **`TransactionChartSection.tsx`**:
   - **Inline Customized Component (Line 796)**:
     ```tsx
     <Customized component={(rechartProps) => { ... }} />
     ```
     Creating an inline component function inside the render body forces Recharts to treat `<Customized>` as a new component on every render pass. When `hoveredDot`, `chartTimeframe`, or `zoomDomain` changes, the scatter dot layer is completely destroyed and recreated.
   - **Inline Tooltip Content (Line 746)**:
     ```tsx
     <RechartsTooltip content={({ active, payload }) => { ... }} />
     ```
     Re-allocated inline function forces tooltip re-evaluation on all mouse/touch movements.
   - **Hover State Thrashing (Lines 818-824)**:
     Pointer move events on individual scatter dots fire `setHoveredDot(...)`, triggering root component state updates and total chart re-rendering just to adjust tooltip coordinates.

2. **`MobileDock.tsx`**:
   - **Unmemoized Navigation Data (Lines 54-65)**:
     `tabs` array definition is inside the render function of `MobileDock`. On every parent re-render, 5 new tab object references and SVG icon references are allocated.
   - **Double-Navigation Conflict (Lines 90-99)**:
     ```tsx
     onClick={(e) => {
       if (onTabClick) {
         e.preventDefault();
         window.history.pushState(null, '', tab.href);
         onTabClick(tab.id);
         try {
           router.replace(tab.href, { scroll: false });
         } catch (err) {}
       }
     }}
     ```
     Executing both `window.history.pushState` and `router.replace` produces duplicate browser history entries and triggers two separate router update cycles.

3. **`MacroTrendChart.tsx`**:
   - **Un-debounced Resize Observer (Lines 227-238)**:
     ```tsx
     const observer = new ResizeObserver((entries) => {
       if (entries && entries[0]) {
         const rawW = entries[0].contentRect.width;
         const rawH = entries[0].contentRect.height;
         if (rawW > 0) setContainerWidth(Math.max(300, Math.floor(rawW)));
         if (rawH > 0) setContainerHeight(Math.max(200, Math.floor(rawH)));
       }
     });
     ```
     `useLayoutEffect` attaches an observer that immediately updates state on every single 1px container dimension change.
   - **Dead Code**: Lines 127-199 define a custom `useResizeObserver` hook with a 150ms debounce and 2px diff threshold, but `MacroTrendChart` fails to use it, maintaining an un-debounced observer instead.

---

### 2.2 Layout Thrashing (Reflow) on Resize

1. **Synchronous Measurement in Render Pipeline**:
   - `MacroTrendChart.tsx` calls `getBoundingClientRect()` inside `useLayoutEffect` on mount, triggering a synchronous style/layout calculation before setting `containerWidth` and `containerHeight`.
   - On mobile devices, window scrolling (which shows/hides browser address bar) triggers `ResizeObserver` events. Continuous state updates force re-rendering of SVG charts, causing layout reflow thrashing and frame drops during fast touch scrolls.

2. **Container Height Fluctuations in `MobileDock.tsx`**:
   - `visualViewport.resize` listener compares `vv.height` against `initialHeightRef.current - 120`. On certain Android browsers, dynamic toolbar hides/shows trigger height fluctuations that briefly set `shouldHide` to true/false, causing unwanted bottom dock slide animations.

---

### 2.3 Mobile Outline & Visual Defense Audit

1. **Recharts Tap Highlight & Focus Ring Removal**:
   - `globals.css` (lines 252-253 and 400-407) correctly applies:
     ```css
     .recharts-wrapper, .recharts-surface, .recharts-legend-wrapper, .recharts-tooltip-wrapper {
       outline: none !important;
       box-shadow: none !important;
       -webkit-tap-highlight-color: transparent;
     }
     ```
   - However, inline scatter dots in `TransactionChartSection.tsx` (lines 805-827) set `style={{ cursor: 'pointer', transition: '...', WebkitTapHighlightColor: 'transparent' }}`. While tap highlight is disabled, SVG dots lack `-webkit-touch-callout: none` or explicit focus protection, which can trigger default focus borders on iOS WebKit when tapped rapidly.

2. **Touch Target Focus Defense**:
   - Bottom dock navigation links (`MobileDock.tsx`) use `touch-manipulation` and `active:scale-[0.94]`. However, in high-contrast or focus-visible modes, missing explicit `focus-visible:outline-none` on tab links can render a rectangular focus ring over rounded tab pills (`rounded-[18px]`).

---

### 2.4 Chart Fallback Behavior Audit

1. **Empty Data Fallback**:
   - `TransactionChartSection.tsx` (lines 558-568) provides a clean fallback UI when `relevantTxs.length === 0`:
     ```tsx
     <div className="bg-body rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px]">
       <span className="text-[40px] mb-2">🤫</span>
       <span className="text-tertiary text-[15px] font-extrabold">현재 숨고르기 중인 단지입니다</span>
       <span className="text-tertiary text-[12px] font-medium mt-1">해당 기간 내 실거래 기록이 없습니다</span>
     </div>
     ```
2. **Initial Loading Shimmer Fallback**:
   - Lines 833-835 display `<div className="w-full h-full rounded-xl border border-border/20 animate-shimmer" />` when `dimensions.width === 0` or `!isChartReady`.
3. **Missing Chart Error Boundary**:
   - If Recharts encounters `NaN` or `Infinity` values in domain calculation or invalid SVG path coordinates, it throws an uncaught JavaScript error. Without an isolated Error Boundary wrapper, this crashes the entire parent view (`ApartmentModal` or `MacroDashboard`).

---

## 3. Concrete Recommendations for Milestone R3

### 3.1 Test Infrastructure & Setup Recommendations

1. **Enhance `jest.setup.ts` with Global Mocks**:
   - Add polyfills for `ResizeObserver`, `IntersectionObserver`, and `window.matchMedia`:
     ```ts
     // global mocks in jest.setup.ts
     global.ResizeObserver = class {
       observe() {}
       unobserve() {}
       disconnect() {}
     };

     global.IntersectionObserver = class {
       observe() {}
       unobserve() {}
       disconnect() {}
     };

     Object.defineProperty(window, 'matchMedia', {
       writable: true,
       value: jest.fn().mockImplementation(query => ({
         matches: false,
         media: query,
         onchange: null,
         addListener: jest.fn(),
         removeListener: jest.fn(),
         addEventListener: jest.fn(),
         removeEventListener: jest.fn(),
         dispatchEvent: jest.fn(),
       })),
     });
     ```

2. **Update `playwright.config.ts` for Mobile Testing**:
   - Add mobile projects to test against mobile Chrome and Safari viewports:
     ```ts
     projects: [
       {
         name: 'chromium',
         use: { ...devices['Desktop Chrome'] },
       },
       {
         name: 'Mobile Chrome',
         use: { ...devices['Pixel 7'] },
       },
       {
         name: 'Mobile Safari',
         use: { ...devices['iPhone 14'] },
       },
     ],
     ```

3. **Add Dedicated NPM Scripts in `package.json`**:
   - `"test:unit": "jest"`
   - `"test:e2e:mobile": "playwright test --project='Mobile Chrome' --project='Mobile Safari'"`
   - `"test:perf": "playwright test tests/performance-ux.spec.ts tests/m2-performance-contract.spec.ts"`

---

### 3.2 Performance & Rendering Optimization Recommendations

1. **Refactor `TransactionChartSection.tsx`**:
   - Extract `<Customized>` child rendering into a memoized component outside `TransactionChartSection` or wrap the callback in `useCallback`.
   - Memoize tooltip content using `useCallback` or a static sub-component.
   - Throttling mousemove/touch events on scatter dots to 50ms to prevent high-frequency state updates.

2. **Fix `MacroTrendChart.tsx` Layout Thrashing**:
   - Remove un-debounced `ResizeObserver` inside `useLayoutEffect`.
   - Wire up the pre-existing `useResizeObserver` hook (which uses a 150ms debounce and 2px diff threshold) to `containerRef`.

3. **Clean Up `MobileDock.tsx`**:
   - Move `tabs` array definition outside the component to prevent re-allocation.
   - Remove redundant `window.history.pushState` call when `router.replace` is executed in tab click handler.

4. **Implement Isolated Chart Error Boundaries**:
   - Create a reusable `<ChartErrorBoundary fallback={<ChartErrorFallback />}>` component.
   - Wrap `<TransactionChartSection>`, `<MacroTrendChart>`, and `<TechnoValleyDashboard>` charts to ensure robust fallback if Recharts encounters bad data or SVG rendering failures.

---

### 3.3 Unit & Integration Test Strategy Strategy

1. **Chart Fallback & Error Boundary Unit Tests (`__tests__/ChartFallback.test.tsx`)**:
   - Test empty transactions array render (`relevantTxs = []`).
   - Test corrupt data handling (`NaN`, missing fields) under `ChartErrorBoundary`.
   - Verify shimmer loading state when dimensions are zero.

2. **Mobile Outline & Touch Defense Integration Tests (`tests/mobile-defense.spec.ts`)**:
   - Verify bottom dock tabs have valid focus ring concealment (`focus-visible:outline-none`).
   - Verify no horizontal overflow (`scrollWidth === clientWidth`) on mobile viewports (375px, 390px).
   - Test soft keyboard open/close viewport resizing without layout breaking.
