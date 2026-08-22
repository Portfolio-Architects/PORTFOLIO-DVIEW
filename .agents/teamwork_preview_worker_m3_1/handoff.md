# Milestone 3 Handoff Report: Interactive Items & Modal Integration

## 1. Observation
- `frontend/src/components/macro/hooks/useMacroFilters.ts` provides:
  - `quickFilter`, `setQuickFilter`, `searchQuery`, `setSearchQuery`, `sortOrder`, `setSortOrder`, `viewMode`, `setViewMode`, `resetFilters`
  - Constants: `DONGTAN1_DONGS`, `DONGTAN2_DONGS`, `LANDMARK_APTS`.
- `frontend/src/components/macro/components/MacroTimelineView.tsx` accepts:
  - `quickFilter`, `setQuickFilter`, `searchQuery`, `setSearchQuery`, `sortOrder`, `setSortOrder`, `viewMode`, `setViewMode`, `onResetFilters`, `userFavorites`, `onToggleFavorite`, `renderTimelineItemCard`, `renderTimelineItemRow`.
  - Date group header expects `highestPriceApt: { aptName, displayAptName, priceEok, priceVal }`.
- Test harness suites (`TimelineItemCardRender.test.tsx`, `TimelineItemCardEmpirical.test.tsx`, `TimelineItemCardStress.test.tsx`) extract functions and interfaces by regex:
  - `export const formatEokWithUnit = ...`
  - `export const formatDeltaPrice = ...`
  - `interface TimelineItemCardProps { ... }`
  - `const TimelineItemCard = React.memo( ... )`
  - Anchor string: `const isRising = item.delta > 0;`
  - Expects components copied into a temporary file without external icon dependencies to compile and run smoothly.

## 2. Logic Chain
1. **Filter & Sort Integration in `MacroDashboardClient.tsx`**:
   - Extracted all filter/sort states and setters from `useMacroFilters({ sheetApartments })`.
   - Updated `filteredTimelineData` to apply:
     - `quickFilter`: `'dongtan1'` (반송동, 석우동, 능동), `'dongtan2'` (청계동, 영천동, 오산동, 목동, 산척동, 장지동, 송동, 신동), `'high'` (`item.type === 'high' || item.isNewHigh === true`), `'pyeong30'` (30평대 84㎡ 내외), `'billion10'` (`priceVal >= 10.0`), `'landmark'` (`LANDMARK_APTS.some(...)`).
     - `searchQuery`: case-insensitive match on `aptName`, `displayAptName`, and `dong`.
     - `sortOrder`: `'latest'` (natural price/date order), `'price_desc'` (`b.priceVal - a.priceVal`), `'delta_desc'` (`b.deltaPercent - a.deltaPercent` or `b.delta - a.delta`), `'area_desc'` (`b.area - a.area`).
   - Calculated `highestPriceApt` in `dailyTimelineData` and dynamically on `filteredTimelineData` so that sticky headers always highlight the peak price transaction of the date group.

2. **Upgraded `TimelineItemCard`**:
   - Integrated Favorite Heart Button with `isFavorite` active state (`fill-rose-500 text-rose-500`) and inactive state (`text-slate-300 dark:text-zinc-600 hover:text-rose-400`).
   - Isolated click event via `e.stopPropagation()` and invoked `onToggleFavorite?.(item.aptName)`.
   - Added Price per Pyeong display: `평당 ${Math.round((item.priceVal * 10000) / pyeong).toLocaleString()}만`.
   - Added Previous price strikethrough and delta percentage display.
   - Maintained "상세" button calling `onDetailsClick(item.aptName)` and `onDetailsHover(item.aptName, item.dong)`.
   - Maintained exact AST regex anchors and zero-external-import inline SVG to ensure full compatibility with dynamic test extractions.

3. **Implemented `TimelineItemRow` for Compact List View**:
   - Exported `export const TimelineItemRow = React.memo(function TimelineItemRow(...) { ... });`.
   - Built a dense, responsive horizontal table row containing the favorite heart toggle, complex name with 신고가 badge, dong/floor/area info with pyeong price, transaction price & delta badge, and direct "상세" modal trigger button.

4. **Prop Wiring to `MacroTimelineView`**:
   - Passed all new states, actions, handlers, and render functions (`renderTimelineItemCardNode`, `renderTimelineItemRowNode`) to `<MacroTimelineView />`.

## 3. Caveats
- No caveats. All existing functionality and legacy regex signatures have been strictly preserved.

## 4. Conclusion
- Milestone 3 is complete and fully verified.
- TypeScript check (`npx tsc --noEmit`) passes with 0 errors.
- Jest test suite (`npm test`) passes with 100% green tests across all 97 test suites (975/975 tests passing).

## 5. Verification Method
- **Type Checking**:
  `npx tsc --noEmit` -> 0 errors.
- **Unit & Integration Tests**:
  `npm test -- src/components/__tests__/TimelineIntegration.test.tsx` -> 6/6 tests passing.
  `npm test -- src/components/TimelineItemCardRender.test.tsx` -> PASS.
  `npm test -- src/components/TimelineItemCardEmpirical.test.tsx` -> PASS.
  `npm test -- src/components/TimelineItemCardStress.test.tsx` -> PASS.
  `npm test -- src/components/__tests__/MacroTimelineView.test.tsx` -> PASS.
- **Full Suite Run**:
  `npm test` -> 97 passed, 97 total (975 passed, 975 total).
