# Handoff Report — Explorer 2: Apartment Card Mobile UI Refactoring (< 480px)

## Executive Summary
This report analyzes the responsive layout bottlenecks in DVIEW Apt Lab's apartment card components (specifically `TimelineItemCard` in `MacroDashboardClient.tsx`) on mobile screens (< 480px) and provides the exact JSX refactoring specification to transition the title area to a 2-row vertical layout.

---

## 1. Observation

### Target Component Locations
- **`TimelineItemCard`**: `frontend/src/components/MacroDashboardClient.tsx` (Lines 386–517)
- **Test File**: `frontend/src/components/TimelineItemCardRender.test.tsx` (Lines 34–45, expects `const isRising = item.delta > 0;` and standard `aria-label`)

### Current Mobile Responsive Bottlenecks (< 480px)
1. **Title & Badge Horizontal Squeezing in Row 1:**
   - Lines 414–418 in `MacroDashboardClient.tsx`:
     ```tsx
     <div className="flex flex-col gap-1 min-w-0 flex-1 max-w-[45%] sm:max-w-none overflow-hidden">
       <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 w-full overflow-hidden">
         <span className="text-xs sm:text-sm font-extrabold text-primary group-hover:text-[#ea6100] transition-colors leading-tight truncate min-w-0 flex-1" title={item.displayAptName || item.aptName}>
           {item.displayAptName || item.aptName}
         </span>
         {item.type === 'high' && (
           <span className="text-[8px] sm:text-[9.5px] font-black px-1 sm:px-1.5 py-0.5 rounded bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.4)] shrink-0 whitespace-nowrap animate-pulse tracking-wider">
             신고가
           </span>
         )}
       </div>
     ```
   - **Observation**: `max-w-[45%]` forcibly constrains the title section to 45% of card width on mobile. Placing the apartment name and `[신고가]` badge on the same row leaves only 3–5 Korean characters before truncation occurs (e.g. "동탄역시범...").

2. **Metadata Placement & Dong Name Truncation:**
   - Line 426–436:
     ```tsx
     <div className="flex items-center gap-0.5 sm:gap-1.5 text-[9.5px] sm:text-[11px] text-tertiary font-bold tracking-tight whitespace-nowrap overflow-hidden min-w-0">
       <span className="truncate max-w-[45px] sm:max-w-none">{item.dong}</span>
       <span className="opacity-30 font-normal shrink-0">•</span>
       ...
     ```
   - **Observation**: Metadata (`동 / 평형 / 층수`) sits below the title line. `max-w-[45px]` on `item.dong` truncates dong names on narrow viewports.

3. **Right Section Alignment & Padding:**
   - Lines 440–514: Price and delta badge sit inside the main clickable `button` with `ml-0.5 sm:ml-2`, while the "상세" (Details) button sits in the top-level parent `div`.
   - **Observation**: Vertical padding and flex alignment between price information and the "상세" action button lack a unified vertical container and clear border separation, leading to visual misalignment against 2-row left titles.

---

## 2. Logic Chain

1. **Root Cause**: The constraint `max-w-[45%]` combined with side-by-side positioning of `[Apartment Name]` and `[신고가 Badge]` in a single horizontal row creates an extreme bottleneck on mobile viewports (< 480px width, e.g. 360px–412px phones).
2. **Structural Solution**:
   - **Vertical Stack (2-Row Title Layout)**:
     - **Row 1 (Top)**: `[신고가 Badge]` + `[동 / 평형 / 층수]` metadata tags. Because metadata text is small (`text-[9.5px]` to `text-[11px]`), combining the badge with metadata in Row 1 leaves ample horizontal space and eliminates badge-title competition.
     - **Row 2 (Bottom)**: `[아파트 Full Name]`. Dedicated entirely to the apartment title, spanning full width (`flex-1 min-w-0`) without `max-w-[45%]`.
3. **Right Section Optimization**:
   - Wrap the price & delta badge in a centered flex column (`flex flex-col items-end justify-center gap-0.5`).
   - Group the "상세" (Details) button into a distinct flex action wrapper with vertical border separator (`border-l border-border/20`) and unified padding (`px-2 py-1.5`), maintaining clean touch targets and vertical harmony.
4. **Test & Code Base Integrity**:
   - Keep `const isRising = item.delta > 0;` intact at the top of `TimelineItemCard` so regex-based test parsing in `TimelineItemCardRender.test.tsx` passes without failure.

---

## 3. Caveats

- **Scope Limit**: Investigation and proposed JSX specs focus on `TimelineItemCard` in `MacroDashboardClient.tsx` (the primary transaction timeline card component). Secondary cards (e.g. `AptRow.tsx`, `HotComplexRanking.tsx`) should follow the identical 2-row layout principles when refactored.
- **No Direct Source Editing**: In accordance with explorer read-only constraints, no changes were applied to `frontend/src/components/MacroDashboardClient.tsx`. Implementation should be handled by an Implementer agent.

---

## 4. Conclusion & Proposed JSX Specification

### Target File
- `frontend/src/components/MacroDashboardClient.tsx` (Replace `TimelineItemCard` definition at lines 386–517)

### Proposed Exact JSX Implementation

```tsx
interface TimelineItemCardProps {
  item: TimelineItem;
  isSelected: boolean;
  areaUnit: string;
  onCardHover: (aptName: string, dong: string) => void;
  onCardClick: (aptName: string) => void;
  onDetailsClick: (aptName: string) => void;
  onDetailsHover: (aptName: string, dong: string) => void;
}

const TimelineItemCard = React.memo(function TimelineItemCard({
  item,
  isSelected,
  areaUnit,
  onCardHover,
  onCardClick,
  onDetailsClick,
  onDetailsHover,
}: TimelineItemCardProps) {
  const isRising = item.delta > 0;
  const isFalling = item.delta < 0;

  return (
    <div
      onMouseEnter={() => onCardHover(item.aptName, item.dong)}
      className={`flex items-center justify-between p-2.5 xs:p-3 sm:p-3.5 rounded-xl transition-[background-color,border-color,transform] duration-150 ease-out border w-full max-w-full box-border ${
        isSelected
          ? "border-[#ea6100] bg-[#ea6100]/5 dark:bg-[#ea6100]/10 shadow-[0_2px_12px_rgba(234,97,0,0.08)]"
          : "bg-body hover:bg-slate-50 dark:hover:bg-slate-900/40 border-transparent hover:border-border"
      } group gap-2 sm:gap-3`}
    >
      {/* Clickable Card Body Button */}
      <button
        type="button"
        onClick={() => onCardClick(item.aptName)}
        aria-label={`실거래 분석 아파트 선택: ${item.aptName}, 위치: ${item.dong}, 가격: ${item.priceEok}`}
        className="flex-1 flex items-center justify-between text-left outline-none focus:ring-2 focus:ring-[#ea6100]/50 rounded-lg p-0.5 bg-transparent border-none min-w-0 cursor-pointer overflow-hidden gap-2"
      >
        {/* Left Column: 2-Row Layout */}
        <div className="flex flex-col gap-1 min-w-0 flex-1 overflow-hidden">
          {/* Row 1: [신고가 Badge] + [동 / 평형 / 층수] */}
          <div className="flex items-center gap-1.5 min-w-0 w-full overflow-hidden text-[9.5px] xs:text-[10px] sm:text-[11px] text-tertiary font-bold tracking-tight whitespace-nowrap">
            {item.type === 'high' && (
              <span className="text-[8px] xs:text-[9px] sm:text-[9.5px] font-black px-1.5 py-0.5 rounded bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.4)] shrink-0 whitespace-nowrap animate-pulse tracking-wider">
                신고가
              </span>
            )}
            <span className="shrink-0 font-extrabold text-secondary">{item.dong}</span>
            <span className="opacity-30 font-normal shrink-0">•</span>
            <span className="shrink-0">
              {areaUnit === 'm2'
                ? (item.areaLabelM2 || `${Math.round(item.area)}㎡`)
                : (item.areaLabelPyeong || `${Math.round(item.areaPyeong)}평`)}
            </span>
            <span className="opacity-30 font-normal shrink-0">•</span>
            <span className="shrink-0">{item.floor}층</span>
          </div>

          {/* Row 2: [아파트 Full Name] (Full Width, Minimal Truncation) */}
          <div className="flex items-center min-w-0 w-full overflow-hidden">
            <span
              className="text-xs xs:text-[13px] sm:text-sm font-extrabold text-primary group-hover:text-[#ea6100] dark:group-hover:text-[#ea6100] transition-colors leading-tight truncate break-keep min-w-0 flex-1"
              title={item.displayAptName || item.aptName}
            >
              {item.displayAptName || item.aptName}
            </span>
          </div>
        </div>

        {/* Right Section Column 1: Price & Delta Badges */}
        <div className="flex flex-col items-end justify-center gap-0.5 shrink-0 ml-1.5 sm:ml-2 min-w-0">
          <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
            {item.delta !== 0 && item.prevPriceVal && item.prevPriceVal > 0 && (
              <>
                <span className="text-[10px] sm:text-[11px] text-tertiary font-bold line-through opacity-50 hidden sm:inline">
                  {formatEokWithUnit(item.prevPriceVal * 10000).value}
                </span>
                <span className="text-[9px] text-tertiary opacity-45 hidden sm:inline">➔</span>
              </>
            )}
            <span
              className={`text-[12.5px] xs:text-[13px] sm:text-[14.5px] font-black tracking-tight leading-none whitespace-nowrap ${
                isRising
                  ? "text-rose-500 dark:text-rose-400"
                  : isFalling
                    ? "text-slate-500 dark:text-slate-400"
                    : "text-primary"
              }`}
            >
              <span className="inline sm:hidden">
                {item.priceEok
                  ? item.priceEok.replace(/억\s*([0-9,]+)만?/, (_, m) => {
                      const num = parseInt(m.replace(/,/g, ''), 10);
                      return num > 0 ? `.${Math.floor(num / 1000)}억` : '억';
                    })
                  : item.priceEok}
              </span>
              <span className="hidden sm:inline">{item.priceEok}</span>
            </span>
          </div>

          <span
            className={`text-[9px] sm:text-[9.5px] font-black px-1 sm:px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap leading-none ${
              isRising
                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400"
                : isFalling
                  ? "bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            <span className="inline sm:hidden">
              {isRising
                ? `▲ ${formatDeltaPrice(item.delta).replace(/억\s*([0-9,]+)만?/, (_match: string, m: string) => {
                    const num = parseInt(m.replace(/,/g, ''), 10);
                    return num > 0 ? `.${Math.floor(num / 1000)}억` : '억';
                  })}`
                : isFalling
                  ? `▼ ${formatDeltaPrice(Math.abs(item.delta)).replace(/억\s*([0-9,]+)만?/, (_match: string, m: string) => {
                      const num = parseInt(m.replace(/,/g, ''), 10);
                      return num > 0 ? `.${Math.floor(num / 1000)}억` : '억';
                    })}`
                  : "보합"}
            </span>
            <span className="hidden sm:inline">
              {isRising
                ? `▲ ${formatDeltaPrice(item.delta)}`
                : isFalling
                  ? `▼ ${formatDeltaPrice(Math.abs(item.delta))}`
                  : "보합"}
            </span>
          </span>
        </div>
      </button>

      {/* Right Section Column 2: Detail (상세) Action Button */}
      <div className="flex items-center justify-center shrink-0 pl-1 sm:pl-2 border-l border-border/20 dark:border-zinc-800/50 my-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDetailsClick(item.aptName);
          }}
          onMouseEnter={() => onDetailsHover(item.aptName, item.dong)}
          className="px-2 xs:px-2.5 py-1.5 rounded-lg bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 border border-border hover:border-slate-300 dark:hover:border-slate-700 text-[10px] sm:text-[10.5px] font-extrabold text-secondary hover:text-primary transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-95 cursor-pointer shadow-sm shrink-0 outline-none focus:ring-2 focus:ring-emerald-500/50 whitespace-nowrap"
        >
          상세
        </button>
      </div>
    </div>
  );
});
```

---

## 5. Verification Method

To verify the proposed refactoring:

1. **Unit Test Verification**:
   Run Jest test suite in `frontend/`:
   ```bash
   cd frontend && npm test -- src/components/TimelineItemCardRender.test.tsx
   ```
   Confirm that all test assertions pass and render counts remain optimized.

2. **Visual Inspection (< 480px mobile viewports)**:
   - Run Next.js build or dev server:
     ```bash
     cd frontend && npm run build
     ```
   - Open DevTools in responsive device mode at 360px, 390px, and 430px widths.
   - Verify:
     - Row 1 displays `[신고가 뱃지] + [동 / 평형 / 층수]` without truncation on dong names.
     - Row 2 displays `[아파트 Full Name]` utilizing maximum horizontal space with zero premature truncation.
     - Right section displays price, change delta badge, and vertically centered "상세" button.
