# Handoff Report — Milestone 2 (M2): Apartment Lab Right Graph Integration

## 1. Observation

### Modified Files & Code Snippets
- **File**: `frontend/src/components/MacroDashboardClient.tsx` (Only file modified in this milestone)

1. **Default Apartment Selection `useEffect` Refactoring (Lines 908–924)**:
   ```tsx
   // 1. 로그인 여부 및 관심 단지에 따라 디폴트 아파트 선택 (최초 1회만 실행)
   useEffect(() => {
     if (!mounted) return;
     if (hasSetDefaultApt) return;
     if (authLoading || isFavoritesLoading) return;

     if (userFavorites && userFavorites.size > 0) {
       const favArray = Array.from(userFavorites);
       setSelectedTimelineApt(favArray[0]);
       setHasSetDefaultApt(true);
     } else {
       if (!selectedTimelineApt) {
         setSelectedTimelineApt("동탄역 롯데캐슬");
       }
       setHasSetDefaultApt(true);
     }
   }, [userFavorites, mounted, hasSetDefaultApt, authLoading, isFavoritesLoading, selectedTimelineApt]);
   ```

2. **Decoupled `selectedAptSummary` in `selectedAptChartData` (Lines 1153–1158, 1230–1234)**:
   ```tsx
   const selectedAptChartData = useMemo(() => {
     if (!selectedTimelineApt || !deferredMacroTrendData || deferredMacroTrendData.length === 0) return null;

     if (!Array.isArray(aptRealTxData) || aptRealTxData.length === 0) {
       if (!selectedAptSummary) return null;
       // ... existing mock scaling calculation ...
     }
     // ...
     const fallbackSalePrice = ((selectedAptSummary?.avg1MPrice || selectedAptSummary?.avg3MPrice || selectedAptSummary?.latestPrice) || 80000) / 10000;
     const fallbackRentPrice = ((selectedAptSummary?.avg1MRentDeposit || selectedAptSummary?.avg3MRentDeposit || selectedAptSummary?.latestRentDeposit) || 48000) / 10000;
   ```

3. **Timeline Card Selection Equality Check (Line 1736–1745)**:
   ```tsx
   <TimelineItemCard
     key={`${item.aptName}-${idx}`}
     item={item}
     isSelected={
       !!selectedTimelineApt && (
         selectedTimelineApt === item.aptName ||
         normalizeAptName(selectedTimelineApt) === normalizeAptName(item.aptName) ||
         isSameApartment(selectedTimelineApt, item.aptName, nameMapping)
       )
     }
     areaUnit={areaUnit}
     ...
   />
   ```

4. **Fallback & Loading Indicator UI (Lines 1862–1865, 1924, 1970–1974)**:
   ```tsx
   // Non-favorites dropdown option
   <option value="">전체 추이 보기</option>

   // Chart container loading guard
   {isDefaultAptSettingUp || (isAptTxLoading && !aptRealTxData && !!selectedTimelineApt) ? ( ... ) : ( ... )}

   // Fallback indicator when tx data is unavailable for selected complex
   {selectedTimelineApt && (!aptRealTxData || aptRealTxData.length === 0) && !isAptTxLoading && !isDefaultAptSettingUp && (
     <div className="text-[10.5px] text-tertiary text-center mt-1.5 font-medium flex items-center justify-center gap-1">
       <span>※ 개별 실거래 세부내역 수집 대기 단지로 시세 추정치가 표시됩니다.</span>
     </div>
   )}
   ```

---

## 2. Logic Chain

1. **Step 1 (Default Selection Re-defaulting Fix)**:
   - *Observation*: The initial default selection `useEffect` ran on every change to `selectedTimelineApt` and re-evaluated `!favArray.some(...)`, resetting `selectedTimelineApt` back to `favArray[0]` whenever a non-favorite timeline card or "전체 추이 보기" (`null`/`""`) was selected.
   - *Reasoning*: Adding `if (hasSetDefaultApt) return;` and gating on `authLoading` and `isFavoritesLoading` ensures default initialization executes **only once** on mount/login, permitting persistent user selections.

2. **Step 2 (Real Transaction Chart Data Decoupling)**:
   - *Observation*: `selectedAptChartData` previously returned `null` immediately if `selectedAptSummary` was missing, discarding `aptRealTxData`.
   - *Reasoning*: Gating `selectedAptChartData` on `!selectedTimelineApt` instead of `!selectedAptSummary` allows valid `aptRealTxData` to construct real transaction monthly average graphs even when a summary record is missing. Optional chaining `selectedAptSummary?.` prevents runtime errors on fallback price calculations.

3. **Step 3 (Timeline Item Selection Highlighting)**:
   - *Observation*: `TimelineItemCard` used strict `===` string matching (`selectedTimelineApt === item.aptName`), failing when items contained district prefixes like `"[오산동] 동탄역 롯데캐슬"`.
   - *Reasoning*: Using `normalizeAptName` and `isSameApartment` comparison ensures active visual highlights appear correctly on timeline cards.

4. **Step 4 (Loading & Fallback UI Integration)**:
   - *Observation*: Switching selected apartments caused visual jumpiness when `aptRealTxData` was fetching, and provided no indication when transaction records were missing.
   - *Reasoning*: Checking `isAptTxLoading` in the chart loading condition displays a smooth loading skeleton, while the fallback indicator informs users when estimated prices are displayed due to missing transaction records.

---

## 3. Caveats

- **Exclusive File Ownership**: Only `frontend/src/components/MacroDashboardClient.tsx` was modified. No other codebase files were touched.
- **Assumptions**: `txSummaryData` and `/tx-data/*.json` assets are correctly generated during prebuild/runtime.
- **Unexplored Areas**: R1 (favorite complexes persistence) and R3 (left transaction list real-time update logic) are handled by peer/other subagents.

---

## 4. Conclusion

Milestone 2 (M2) implementation is fully complete. All reported defects regarding apartment timeline selection, right graph rendering, selection highlighting, and fallback indicators have been resolved cleanly without breaking existing components.

---

## 5. Verification Method

### Automated Tests
Run from `frontend/`:
```bash
# Run unit & component test suite
npm test

# Run empirical verification test suite
npx jest src/m2_m3_empirical_verification.test.tsx

# Production build check
npm run build
```

### Verification Results
- `npm test`: **51 test suites passed, 358 tests passed** (0 failures).
- `npm run build`: Production build succeeded with zero errors.

### Invalidation Conditions
- If selecting an apartment on the timeline causes `selectedTimelineApt` to reset back to `userFavorites[0]`.
- If selecting "전체 추이 보기" reverts back to the default favorite apartment.
- If real transaction data fails to render on the right graph when `selectedAptSummary` is missing.
