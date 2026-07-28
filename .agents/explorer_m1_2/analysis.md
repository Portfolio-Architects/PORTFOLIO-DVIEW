# R2 Analysis Report: Chart Rendering Pipeline Defense & Modularization

**Target Project**: D-VIEW (PORTFOLIO-DTDLS)  
**Investigator**: `explorer_m1_2` (teamwork_preview_explorer_m1_2)  
**Date**: 2026-07-27  
**Scope**: All chart, graph, canvas, SVG drawing components, mobile resize handling, exception defense, and pure math calculation separation in `frontend/src/`.

---

## 1. Executive Summary

This investigation analyzed the entire chart rendering pipeline across the frontend application. D-VIEW utilizes a hybrid chart architecture combining **Recharts 3.x** for standard trend lines/bar/pie/area/radar charts, **HTML5 2D Canvas** for 3D physics node graphs (`MindMap3D`) and client-side share card image generation (`ApartmentModal`), and **SVG viewports** for circular gauge progress wheels (`JeonseSafetyCalculator`, `EducationAnalysisSection`, `JeonseSafetyReport`, `TechnoValleyDashboard`).

### Key Findings
1. **Dynamic Resizing Defenses**: The codebase exhibits two distinct resizing patterns. `TransactionChartSection` and `MacroTrendChart` implement custom `ResizeObserver` mechanisms with 2px jitter filters, 100ms debouncing, and zero-dimension render guards. However, `MindMap3D` canvas uses fixed 600x400 logical resolution scaled via CSS, leading to aspect ratio distortion on mobile viewports (<600px). No component explicitly handles multi-stage mobile `orientationchange` events.
2. **Data Exception Vulnerabilities**:
   - `MacroTrendChart.tsx`: `lineData.map()` lacks a null/undefined check on `lineData`, creating an unhandled runtime exception if API data fails or returns `null`.
   - `MindMap3D.tsx`: `Object.values(sheetApartments)` throws an unhandled `TypeError` if `sheetApartments` is undefined.
   - `TransactionChartSection.tsx`: `transactions.filter` lacks a guard against `transactions` being `null`/`undefined`.
   - `TechnoValleyDashboard.tsx`: Hardcoded YAxis domain bounds (`[0, 26]`) will clip values if real-world vacancy rates exceed 26%.
3. **Separation of Concerns Gaps**:
   - Complex data transformations (linear interpolation of transaction prices, macro factor scaling, IQR outlier filtering, rolling momentum calculations, 3D physics force simulation, coordinate projection matrices) are tightly coupled inside React client component rendering hooks (`useMemo`, `useEffect`).
   - `MacroTrendChart.tsx` contains 73 lines of unused dead code (`useResizeObserver` hook) that is never invoked inside the component itself.

---

## 2. Comprehensive Chart & Graph Component Inventory

| Component Path | Visualization Type | Library / Technology | Primary Purpose | Key Props / Data Sources |
|---|---|---|---|---|
| `components/MacroTrendChart.tsx` | Area / Line Chart | Recharts (`AreaChart`) | Dongtan macro price & rent trend | `lineData`, `xTicks`, `yTicks`, `timeframe` |
| `components/apartment-modal/TransactionChartSection.tsx` | Composed Chart (Line + Scatter + Bar) | Recharts (`ComposedChart`) + Custom SVG Overlay | Apartment transaction history, monthly averages & volume | `transactions`, `chartType`, `typeMap`, `txSummary` |
| `components/macro/TechnoValleyDashboard.tsx` | Donut / Line Chart + SVG Gauge | Recharts (`PieChart`, `LineChart`) + Inline SVG | Techno Valley vacancy rates, rent trends, building statistics | `useSWR('/api/macro/techno-valley')` |
| `components/MindMap3D.tsx` | Interactive 3D Node-Link Network | HTML5 2D Canvas + Physics Engine | Buyer sentiment & Jeonse ratio 3D heat map | `sheetApartments`, `txSummaryData` |
| `components/admin/AnalyticsDashboard.tsx` | Area / Composed Bar-Line / Gauge | Recharts (`AreaChart`, `ComposedChart`) | Admin GA4 traffic & Search Console monitoring | `useSWR('/api/admin/analytics')` |
| `components/consumer/AptCompareModal.tsx` | Radar & Multi-Line Chart | Recharts (`RadarChart`, `LineChart`) | Side-by-side apartment comparison | `apt1`, `apt2`, `comparisonData` |
| `components/consumer/MortgageCalculator.tsx` | Area Chart | Recharts (`AreaChart`) | Mortgage principal vs interest payment schedule | User input parameters |
| `components/consumer/PropertyTaxCalculator.tsx` | Donut Chart | Recharts (`PieChart`) | Property acquisition tax & fee breakdown | User input parameters |
| `components/consumer/JeonseSafetyCalculator.tsx` | Arc Gauge | Custom SVG (`viewBox="0 0 200 120"`) | Jeonse LTV safety risk score gauge | User input parameters |
| `components/consumer/SellTimingCalculator.tsx` | Arc Gauge | Custom SVG (`viewBox="0 0 200 120"`) | Optimal sell timing diagnostic gauge | User input parameters |
| `components/apartment-modal/EducationAnalysisSection.tsx` | Circular Progress Wheel | Custom SVG (`viewBox="0 0 100 100"`) | School district rating score | `aptName`, `educationData` |
| `components/apartment-modal/JeonseSafetyReport.tsx` | Circular Progress Wheel | Custom SVG (`viewBox="0 0 128 128"`) | Jeonse safety rating score | `aptName`, `safetyMetrics` |
| `components/ApartmentModal.tsx` | Image Composition | HTML5 2D Canvas (`canvas.getContext('2d')`) | Client-side share card image download | `apartment`, `txSummary` |

---

## 3. Dynamic Resizing Audit (ResizeObserver, OrientationChange, Dimensions & Timing)

### 3.1 ResizeObserver Implementations

#### A. `TransactionChartSection.tsx` (Callback Ref Pattern)
- **Code Location**: Lines 133–184
- **Implementation**: Uses a React `useCallback` ref (`containerRefCallback`) attached directly to the wrapper `<div>`. Measures initial dimensions synchronously on DOM mount (`node.clientWidth`, `node.clientHeight`) to avoid hydration shimmer.
- **Debouncing & Filtering**:
  ```ts
  const diffW = Math.abs(width - sizeRef.current.width);
  const diffH = Math.abs(height - sizeRef.current.height);
  if (sizeRef.current.width > 0 && sizeRef.current.height > 0 && diffW <= 2 && diffH <= 2) return;
  ```
  Applies a 100ms timer debounce on subsequent resize events to eliminate render thrashing.
- **Render Guard**: Line 681 explicitly verifies `dimensions.width > 0 && dimensions.height > 0` before rendering `<ResponsiveContainer>`. If dimensions are 0 (e.g. initial hidden tab or modal animation phase), it safely renders `<div className="w-full h-full rounded-xl border border-border/20 animate-shimmer" />`.

#### B. `MacroTrendChart.tsx` (Dual Pattern & Dead Code)
- **Code Location**: Lines 127–199 (unused hook) & Lines 214–242 (active `useLayoutEffect`)
- **Active Resize Observer**: Listens to `containerRef` and updates `containerWidth` / `containerHeight`. Caps dimensions at `Math.max(300, rawW)` and `Math.max(200, rawH)`.
- **Dead Code Finding**: Function `useResizeObserver` (lines 127–199) is fully declared inside `MacroTrendChart.tsx` with elaborate scroll-lock detection (`document.body.style.overflow === 'hidden'`), 2px diff threshold, and 150ms debounce. However, it is **never called** inside `MacroTrendChart` component! The component instead duplicates simpler ResizeObserver logic inside `useLayoutEffect`.

#### C. `TechnoValleyDashboard.tsx` (`matchMedia` Fallback)
- **Code Location**: Lines 631–639
- **Implementation**: The Donut `PieChart` uses `window.matchMedia('(min-width: 640px)')` to toggle between fixed pixel sizes (`260px` vs `220px`). It does not observe container width changes dynamically.

#### D. `MindMap3D.tsx` (Canvas Resizing Flaw)
- **Code Location**: Lines 177–181 & Line 630
- **Implementation**: Hardcodes logical canvas buffer size to `600` x `400` scaled by `window.devicePixelRatio`.
- **Defect**: The `<canvas>` element uses inline CSS `style={{ width: 600, height: 400 }}` combined with class `max-w-full`. On mobile viewports under 600px width (e.g., 360px–390px phones), CSS scales down the visual width while keeping canvas height at 400px, causing visible vertical stretching of 3D nodes. It lacks container `ResizeObserver` listener to recalculate canvas width dynamically.

### 3.2 OrientationChange & Timing Audit
- **Global Shield Script**: `frontend/public/js/resize-observer-shield.js` (loaded in `app/layout.tsx:148`) intercepts and suppresses browser errors (`ResizeObserver loop limit exceeded`, `ResizeObserver loop completed with undelivered notifications`).
- **Mobile Orientation Change Defect**: No chart component listens to `window.addEventListener('orientationchange')` or `window.visualViewport.onresize`. When mobile devices rotate between portrait and landscape:
  1. WebKit/Blink fires `orientationchange` before the DOM layout finishes recalculating.
  2. Intermediate layout pass can yield `width: 0` or invalid intermediate bounds.
  3. Recharts `<ResponsiveContainer>` without explicit non-zero dimension guards temporarily logs warnings or miscalculates svg viewBox scales until next interaction.

---

## 4. Data Exception & Defensive Handling Audit

### 4.1 Vulnerability Matrix

| Component | Code Location | Exception Scenario | Risk Level | Current Behavior | Required Fix |
|---|---|---|---|---|---|
| `MacroTrendChart.tsx` | Line 248 | `lineData` prop is `null` or `undefined` | 🔴 High | Throws `TypeError: Cannot read properties of null (reading 'map')`, crashing component tree | Add fallback default `lineData = []` and `if (!Array.isArray(lineData)) return <EmptyState />` |
| `MindMap3D.tsx` | Line 95 | `sheetApartments` prop is `null` / `undefined` | 🔴 High | Throws `TypeError: Cannot convert undefined or null to object` | Add default `sheetApartments = {}` and safe check before `Object.values` |
| `TransactionChartSection.tsx` | Line 224 | `transactions` prop is `null` / `undefined` | 🔴 High | Throws `TypeError: Cannot read properties of undefined (reading 'filter')` | Add default `transactions = []` in props destructuring |
| `TechnoValleyDashboard.tsx` | Line 1312 | Vacancy rate exceeds 26% | 🟡 Medium | YAxis domain hardcoded to `[0, 26]`; trend line clips beyond chart top | Change domain to `[0, 'auto']` or dynamic max calculation |
| `MindMap3D.tsx` | Line 183 | Empty node list (`nodes.length === 0`) | 🟡 Medium | Canvas renders blank dark area; user receives no notification or empty state UI | Render centered overlay banner: `"시각화 가능한 단지 데이터가 없습니다"` |
| `AptCompareModal.tsx` | Line 1878 | `combinedChartData.length === 0` | 🟢 Safe | Gracefully displays text: `"실거래 추이 데이터를 불러오는 중..."` or hides chart | Already handled safely |
| `TransactionChartSection.tsx` | Line 558 | `relevantTxs.length === 0` | 🟢 Safe | Displays friendly UI: `"🤫 현재 숨고르기 중인 단지입니다 / 해당 기간 내 실거래 기록이 없습니다"` | Already handled safely |
| `AnalyticsDashboard.tsx` | Lines 56, 88 | API request fails (500 / 404) | 🟢 Safe | SWR fallback catches error and returns client mock data via `generateLocalMockData()` | Already handled safely |

---

## 5. Separation of Concerns & Modularization Extraction Plan

Currently, data calculations (math, stats, transformations) are mixed with React DOM / Canvas rendering. To ensure testability and clean architecture, pure functions should be extracted into separate utility modules.

### 5.1 Pure Functions to Extract

#### A. Macro Trend Chart Transformation (`lib/utils/macroChartTransform.ts`)
- **Source File**: `components/MacroDashboardClient.tsx` (Lines 1274–1385) & `components/MacroTrendChart.tsx` (Lines 37–104, 118–124)
- **Functions to Extract**:
  1. `interpolateMissingMacroPoints(macroTrendList, monthlyAverages, saleFactor, rentFactor)`: Fills missing monthly transaction points by linear interpolation and scales against macro baseline.
  2. `sliceAndBackfillTimeframe(sourceData, macroBaseline, timeframe)`: Slices dataset based on timeframe (`3M`, `6M`, `1Y`, `3Y`, `5Y`, `ALL`) and backfills null values.
  3. `formatXAxisTick(value: string)`: Formats `YY.MM` string to `YY년 MM월`.
  4. `calculateGapAndJeonseRatio(salePrice: number, rentPrice: number)`: Computes gap price and rent-to-sale percentage ratio.

#### B. Transaction History & Momentum Analytics (`lib/utils/transactionChartTransform.ts`)
- **Source File**: `components/apartment-modal/TransactionChartSection.tsx` (Lines 37–58, 231–320, 397–522)
- **Functions to Extract**:
  1. `getCachedTimestamp(ymStr: string, dayStr: string)`: Date parsing with cache lookup to prevent garbage collection overhead during scrubbing.
  2. `formatAvgPriceEok(avgPrice: number)`: Converts numerical price (in 10,000 KRW) into Korean currency string (e.g. `8.5` -> `8억 5,000만`).
  3. `calculateRollingMomentum(validRawData, baselineDate)`: Calculates 1M, 3M, 6M, 1Y, 3Y rolling average prices from transaction records.
  4. `aggregateMonthlyChartData(transactions, chartType, cutoffYm)`: Groups raw transactions into monthly average arrays with primary/secondary series for Recharts.
  5. `calculateStableYDomain(transactions, cutoffYm, zoomDomain)`: Computes stable min/max Y-axis domain boundaries across sale and rent series.

#### C. 3D Physics & Camera Projection Engine (`lib/graphics/physics3dEngine.ts`)
- **Source File**: `components/MindMap3D.tsx` (Lines 94–165, 186–260, 283–310, 344–360)
- **Functions to Extract**:
  1. `build3DGraphNodes(sheetApartments, txSummaryData)`: Transforms apartment dictionary into 3D sphere-distributed node and link arrays.
  2. `stepPhysicsSimulation(nodes, links, config)`: Computes gravity, node-node repulsion, link attraction, and velocity dampening.
  3. `project3DTo2D(node, cameraAngle, dragAngle, zoom, viewport)`: Projects 3D node coordinates `(x, y, z)` onto 2D canvas coordinates `(projectedX, projectedY, projectedScale)`.
  4. `getNodeTemperatureColor(node, mode)`: Maps vote ratio or Jeonse percentage to HSL/HEX heat map colors.

---

## 6. Proposed Code Diff / Patch Interface

### Patch 1: Defensive Prop Guards in `MacroTrendChart.tsx`
```tsx
// frontend/src/components/MacroTrendChart.tsx
interface MacroTrendChartProps {
  lineData?: DongtanMacroTrendPoint[] | Array<{ name: string; "동탄 아파트 전체": number | null; "동탄 아파트 전세 평균": number | null; [key: string]: unknown }>;
  xTicks?: string[];
  yTicks?: number[];
  timeframe?: string;
  isBottomSheet?: boolean;
}

const MacroTrendChart = React.memo(function MacroTrendChart({
  lineData = [],
  xTicks = [],
  yTicks = [],
  timeframe = "ALL",
  isBottomSheet = false,
}: MacroTrendChartProps) {
  // Safe array fallback check
  const safeLineData = Array.isArray(lineData) ? lineData : [];

  const processedData = useMemo(() => {
    return safeLineData.map((d) => ({
      ...d,
      "동탄 아파트 전세 평균":
        d["동탄 아파트 전세 평균"] === 0 || d["동탄 아파트 전세 평균"] === null
          ? null
          : d["동탄 아파트 전세 평균"],
    }));
  }, [safeLineData]);

  if (processedData.length === 0) {
    return (
      <div className="w-full h-full min-h-[240px] flex items-center justify-center bg-body/20 rounded-2xl">
        <span className="text-[13px] font-bold text-tertiary">차트 데이터가 없습니다</span>
      </div>
    );
  }
  // ...
```

### Patch 2: Dead Code Removal in `MacroTrendChart.tsx`
- Remove unused `useResizeObserver` function declaration (lines 127–199) from `MacroTrendChart.tsx` or move it to a shared hook file (`frontend/src/hooks/useResizeObserver.ts`).

### Patch 3: Responsive Canvas Dimensions in `MindMap3D.tsx`
```tsx
// Observe container dimensions dynamically instead of hardcoded 600x400 CSS stretch
const containerCallbackRef = useCallback((node: HTMLDivElement | null) => {
  if (!node) return;
  const ro = new ResizeObserver((entries) => {
    if (entries[0]) {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0 && canvasRef.current) {
        const dpr = window.devicePixelRatio || 1;
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        setCanvasSize({ width, height });
      }
    }
  });
  ro.observe(node);
}, []);
```

---

## 7. Actionable Recommendations for Implementation Phase (R2)

1. **Defensive Guards**: Add default parameter fallbacks (`lineData = []`, `transactions = []`, `sheetApartments = {}`) to all top-level chart props to eliminate potential `TypeError` crashes on network failures or undefined data.
2. **Dynamic Mobile Resizing**:
   - Refactor `MindMap3D.tsx` canvas sizing to use `ResizeObserver` on `containerRef` so resolution scales properly on small screen mobile phones (<600px) without aspect ratio distortion.
   - Add a debounced `orientationchange` listener to `TransactionChartSection` and `MacroTrendChart` to handle multi-stage mobile device rotation cleanly.
3. **Dead Code Cleanup**: Remove the un-invoked `useResizeObserver` function inside `MacroTrendChart.tsx`.
4. **Extraction of Pure Math/Transform Utilities**:
   - Extract `lib/utils/macroChartTransform.ts`
   - Extract `lib/utils/transactionChartTransform.ts`
   - Extract `lib/graphics/physics3dEngine.ts`
5. **Verification Suite**: Add unit test coverage for extracted pure transformation functions verifying edge cases (`null`, `undefined`, empty arrays `[]`, extreme numbers, negative prices).

---

*Report written by `explorer_m1_2` to `.agents/explorer_m1_2/analysis.md`.*
