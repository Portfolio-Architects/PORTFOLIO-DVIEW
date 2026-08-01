# Handoff Report — Challenger 2: TimelineItemCard Performance & Memoization Validation

## 1. Observation
- **Component under test**: `TimelineItemCard` defined in `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\src\components\MacroDashboardClient.tsx` (lines 386–526).
- **Memoization Signature**: Wrapped with `React.memo` using default shallow comparison on `TimelineItemCardProps` (`item`, `isSelected`, `areaUnit`, `onCardHover`, `onCardClick`, `onDetailsClick`, `onDetailsHover`).
- **Parent Handlers**: `handleCardHover`, `handleCardClick`, `handleDetailsClick`, `handleDetailsHover` in `MacroDashboardClient.tsx` (lines 778–800) are wrapped in `useCallback` with explicit dependency arrays (`[preloadApartmentTx]`, `[setSelectedTimelineApt, setIsBottomSheetOpen]`, `[onSelectApt]`, `[preloadApartmentTx]`).
- **Test Executions**:
  - `npx jest src/components/TimelineItemCardStress.test.tsx`: 6 empirical stress/edge case tests passed (100% pass).
  - `npm test` in `frontend/`: 49 test suites, 352 total unit tests, all 49 suites passed (0 failures).

## 2. Logic Chain
1. **Rapid Selection State Updates**:
   - In `TimelineItemCardStress.test.tsx` (Test 1), 50 cards were rendered and subjected to 49 rapid sequential selection changes (`단지_0` through `단지_49`) followed by 10 unrelated parent state updates.
   - Initial render count for all 50 items = 1.
   - When selection switched to a new card, ONLY 2 cards re-rendered per selection event: the card becoming unselected (`selected -> false`) and the card becoming selected (`false -> true`).
   - Unaffected cards remained at render count = 1 despite 49 selection updates and 10 parent re-renders. Re-render cost per state change is O(1) instead of O(N).
2. **Prop Instability Sensitivity**:
   - Test 2 demonstrated that when parent callbacks are inline or non-memoized, `React.memo` fails due to `prevProps.onDetailsClick !== nextProps.onDetailsClick`. 5 parent re-renders resulted in 6 total renders for the card (100% re-render rate).
3. **Event Propagation & Isolation**:
   - Test 3 verified `e.stopPropagation()` on the "상세" (Details) button inside `TimelineItemCard`. Clicking "상세" invoked `onDetailsClick('이벤트단지')` without triggering `onCardClick`, preventing unintended card selection side-effects.
4. **Responsive Unit Switching**:
   - Test 4 verified `areaUnit` toggling (`"m2"` vs `"pyeong"`). Changing `areaUnit` triggered a single controlled re-render for visible cards, correctly switching display text between `"84.95㎡"` and `"34.2평"`.
5. **Formatting Edge Cases**:
   - Test 5 confirmed robust display under small/extreme price delta inputs (e.g. `delta: 0.02` for 200만원 rise), correctly rendering `▲ 200만` and the `"신고가"` badge without `NaN` or layout overflow.
6. **Hover Preloading Hooks**:
   - Test 6 verified `onMouseEnter` triggers `onCardHover(aptName, dong)` on main card body and `onDetailsHover(aptName, dong)` on the detail action button.

## 3. Caveats
- If parent components pass an un-memoized `onSelectApt` callback or dynamically changing `preloadApartmentTx` reference, `useCallback` inside `MacroDashboardClient` will re-instantiate, invalidating `React.memo` on every `TimelineItemCard`.
- Filtering changes (`timelineDongFilter` / `timelineAptFilter`) reconstruct `filteredTimelineData` with new object references, requiring a full list render. This is expected since filtering changes visible items.

## 4. Conclusion
- `TimelineItemCard` exhibits rock-solid memoization (`React.memo`) under rapid state changes, bounding re-renders to O(1) per selection event.
- Event bubbling, hover callback preloading, and area unit formatting behave accurately without visual glitches or redundant DOM operations.
- Full test suite status: 49/49 test suites passed (352 tests).

## 5. Verification Method
To independently verify:
```bash
# 1. Run empirical stress test suite for TimelineItemCard
cd "c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend"
npx jest src/components/TimelineItemCardStress.test.tsx

# 2. Run full frontend unit test suite
npm test
```
