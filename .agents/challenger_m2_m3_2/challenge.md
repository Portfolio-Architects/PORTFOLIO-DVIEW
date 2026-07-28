# Challenge & Empirical Verification Report — Mobile Performance & Regression Coverage

**Agent**: `challenger_m2_m3_2` (EMPIRICAL CHALLENGER)  
**Date**: 2026-07-28  
**Target Directory**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend`  

---

## 1. Executive Summary & Risk Assessment

- **Overall Risk Level**: **HIGH** (Critical Runtime Rendering Flaw Discovered in `TransactionChartSection`)
- **Build Status**: `npm run build` completed successfully (Sync transactions: 148 apartments; Turbopack compiled successfully).
- **Test Suite Status**: `npm test` ran **43 test suites**, **294 passed / 294 total** (100% pass rate).
- **Targeted Test Coverage**: Modularized chart calculation utilities (`transactionChartTransform`, `macroChartTransform`) and `ChartErrorBoundary` are fully tested and passing.

---

## 2. Empirical Verification Findings

### A. Critical Defect Discovered

#### [HIGH] Missing `CustomActiveDot` Component Definition in `TransactionChartSection.tsx`
- **Location**: `frontend/src/components/apartment-modal/TransactionChartSection.tsx` (Lines 798, 799)
- **Observation**:
  ```tsx
  <Area ... activeDot={<CustomActiveDot fill="#ea6100" />} ... />
  <Line ... activeDot={<CustomActiveDot fill="#f9a825" />} ... />
  ```
  `CustomActiveDot` is referenced as a JSX component on lines 798 and 799, but is **NOT imported or defined** anywhere within `TransactionChartSection.tsx` or the codebase.
- **Impact & Blast Radius**:
  When `TransactionChartSection` renders on client devices, React evaluation of `<CustomActiveDot />` throws a runtime `ReferenceError: CustomActiveDot is not defined`.
- **Safety Safeguard Evaluation**:
  `ChartErrorBoundary` successfully catches this runtime exception and prevents complete app crash, displaying fallback UI ("아파트 실거래가 차트를 로드할 수 없습니다."). However, users opening apartment modal transaction charts will see chart loading failure instead of the chart.
- **Recommended Fix**:
  Define `CustomActiveDot` at the top of `TransactionChartSection.tsx`:
  ```tsx
  const CustomActiveDot = React.memo(({ cx, cy, fill }: any) => {
    if (cx == null || cy == null) return null;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={fill}
        stroke="#ffffff"
        strokeWidth={2}
      />
    );
  });
  CustomActiveDot.displayName = 'CustomActiveDot';
  ```
  Or pass standard Recharts active dot configuration object `{ r: 5, fill: '#ea6100', stroke: '#ffffff', strokeWidth: 2 }`.

---

### B. Mobile Performance & Reflow Avoidance Audit

| Component | Reflow Avoidance | Memoization Strategy | Assessment |
| :--- | :--- | :--- | :--- |
| **`TransactionChartSection`** | Callback ref (`containerRefCallback`) with `ResizeObserver`. Filters micro-resizes (≤ 2px diff) and debounces state updates (100ms) to eliminate layout thrashing. | Wrapped in `React.memo`. Sub-components `TransactionChartTooltip` & `ScatterCustomizedDots` memoized. Heavy datasets (`monthlyData`, `domainMin/Max`, `jsonLd`, `momentum`) memoized with `useMemo`. | **Pass** (excluding `CustomActiveDot` bug) |
| **`MobileDock`** | `visualViewport` resize listener with `{ passive: true }`. Smooth hide/show on mobile keyboard popup (`vv.height < initialHeight - 120`). | Wrapped in `React.memo`. Route prefetching triggered on mount & interaction (`router.prefetch`). | **Pass** |
| **`MacroTrendChart`** | `useResizeObserver` custom hook with 150ms debounce and 2px noise threshold filter. | Wrapped in `React.memo`. Data processing (`processMacroTrendData`) memoized with `useMemo`. | **Pass** |

---

## 3. Test Suite Regression Coverage Confirmation

### A. Modularized Chart Calculation Utilities

1. **`lib/utils/transactionChartTransform.ts`**
   - Tested in `src/lib/utils/transactionChartTransform.test.ts` (3 test suites, 5 tests — **PASSED**)
   - `getCachedTimestamp`: Confirmed timestamp computation and memoized cache hit behavior.
   - `formatAvgPriceEok`: Confirmed currency formatting (e.g. `8.5` → `'8억5,000'`, `0.75` → `'7,500'`) and safe handling of `0`/`null`/`undefined`.
   - `calculateMonthlyAverages`: Confirmed aggregation of raw transaction records into monthly data points, handling missing data gracefully.

2. **`lib/utils/macroChartTransform.ts`**
   - Tested in `src/lib/utils/macroChartTransform.test.ts` (3 test suites, 6 tests — **PASSED**)
   - `processMacroTrendData`: Confirmed filtering of zero/null jeonse & sale averages to prevent chart lines dipping to zero.
   - `formatXAxisTick`: Confirmed transformation from `YY.MM` format to `'YY년 MM월'`.
   - `calculateMacroGapAndRatio`: Confirmed mathematical accuracy of jeonse ratio percentage and gap price calculation.

### B. Chart Error Boundary

1. **`components/common/ChartErrorBoundary.tsx`**
   - Tested in `src/components/common/ChartErrorBoundary.test.tsx` (3 tests — **PASSED**)
   - Confirmed rendering children when no error occurs.
   - Confirmed catching rendering exceptions and displaying fallback UI with custom fallback text.
   - Confirmed resetting error state and recovering on clicking "다시 시도" (retry) button.

---

## 4. Build and Test Command Logs

### `npm test` Output Summary
```
PASS src/lib/utils/macroChartTransform.test.ts
PASS src/lib/utils/transactionChartTransform.test.ts
PASS src/components/common/ChartErrorBoundary.test.tsx

Test Suites: 43 passed, 43 total
Tests:       294 passed, 294 total
Snapshots:   0 total
Time:        15.052 s
```

### `npm run build` Output Summary
```
📥 [Incremental] 로컬 JSON 캐시(기존 실거래가)를 로드합니다...
✅ 180개 아파트의 기존 데이터 로드 완료
📋 transactions 컬렉션에서 8678건 로드 완료
✅ 요약 완료: 148개 아파트 (매매+전월세 통합)
📁 파일 생성: public/data/tx-summary.json, recent-transactions.json, macro-trend.json
[SW Update] Bumped service worker cache name
▲ Next.js 16.2.6 (Turbopack)
✓ Compiled successfully in 15.6s
```

---

## 5. Verification Method

To independently verify these findings:
1. **Run full unit test suite**:
   ```bash
   cd frontend
   npm test
   ```
2. **Run targeted chart tests**:
   ```bash
   npx jest src/lib/utils/transactionChartTransform.test.ts src/lib/utils/macroChartTransform.test.ts src/components/common/ChartErrorBoundary.test.tsx
   ```
3. **Verify build**:
   ```bash
   npm run build
   ```
4. **Inspect `TransactionChartSection.tsx`**:
   Check lines 798-799 for `<CustomActiveDot />` and note the absence of `CustomActiveDot` component definition.
