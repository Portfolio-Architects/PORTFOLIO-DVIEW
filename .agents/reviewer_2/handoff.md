# Requirement R2 Code Review & Handoff Report

**Reviewer Agent**: `reviewer_2`  
**Target File**: `frontend/src/components/MacroDashboardClient.tsx`  
**Verdict**: **APPROVE**  
**Timestamp**: 2026-08-12T12:13:00Z  

---

## 1. Review Summary

- **Requirement**: R2 - Apt Lab Right Chart Data Integration & Robustness (Default apartment selection effect, decoupling `selectedAptSummary` from chart data rendering, `TimelineItemCard` selection highlight, fallback indicators).
- **Final Verdict**: **APPROVE**
- **Integrity Violation Check**: **PASS** (No hardcoded test results, facade implementations, or shortcuts detected).
- **Automated Tests**: 51/51 Jest Test Suites Passed (358/358 unit and integration tests passed).

---

## 2. Observation

1. **Default Apartment Selection Effect** (`frontend/src/components/MacroDashboardClient.tsx:908-934`):
   - Initializes `selectedTimelineApt` to `"동탄역 롯데캐슬"` as default.
   - `useEffect` monitors `userFavorites`, `mounted`, `hasSetDefaultApt`, `authLoading`, `isFavoritesLoading`.
   - Automatically selects the first favorite (`favArray[0]`) if `userFavorites` has items; otherwise selects default (`"동탄역 롯데캐슬"`).
   - Tracks user session state changes (`currentUserId !== prevUser`) to reset `hasSetDefaultApt` on login/logout so new favorites are auto-selected.
   - Renders a pulsing skeleton (`isDefaultAptSettingUp`) while favorites/auth are loading (`lines 1805-1806, 1933-1951`), preventing UI layout shifts.

2. **Decoupling `selectedAptSummary` from Chart Data Rendering** (`lines 1154-1406`):
   - Computes `txKey` using `sheetApartments`, `HARDCODED_MAPPING`, `nameMapping`, or `txSummaryData`.
   - SWR fetches real transaction data from `/tx-data/${encodeURIComponent(txKey)}.json`.
   - `selectedAptChartData` memoization logic computes monthly averages for sale and jeonse prices from `aptRealTxData` and interpolates missing periods.
   - If `aptRealTxData` is not available, falls back to scaling `deferredMacroTrendData` using `selectedAptSummary`.
   - If `selectedTimelineApt` is null (e.g., "전체 추이 보기") or summary is missing, `lineData` seamlessly falls back to `deferredMacroTrendData` ("동탄 아파트 전체", "동탄 아파트 전세 평균").
   - Safety check `hasAnyValidPoint` backfills macro values if sliced line data has missing points across any timeframe (`3M`, `6M`, `1Y`, `3Y`, `5Y`, `ALL`).

3. **`TimelineItemCard` Selection Highlight** (`lines 387-536, 1738-1754`):
   - `isSelected` prop is calculated dynamically using exact match, `normalizeAptName`, and `isSameApartment(selectedTimelineApt, item.aptName, nameMapping)`.
   - Highlights card with active orange border (`border-[#ea6100]`), background tint (`bg-[#ea6100]/5`), and subtle glow (`shadow-[0_2px_12px_rgba(234,97,0,0.08)]`).
   - Timeline dot indicator in date heading is highlighted (`isGroupSelected`).
   - Clicking card sets `selectedTimelineApt` and opens mobile bottom sheet when on viewport width < 1024.
   - `TimelineItemCard` is wrapped in `React.memo` with stable callback handlers (`handleCardHover`, `handleCardClick`, `handleDetailsClick`, `handleDetailsHover`).

4. **Fallback Indicators & Notice UI** (`lines 1933-1951, 1981-1985, 1708-1711`):
   - Loading indicator: Skeleton pulse with progress text ("관심 단지 정보를 분석하고 있습니다... 내 자산 가치에 맞춘 전용 리포트를 생성하는 중입니다.").
   - Estimation fallback notice: `※ 개별 실거래 세부내역 수집 대기 단지로 시세 추정치가 표시됩니다.` when real tx data JSON is pending.
   - Empty timeline fallback: `최근 실거래 내역이 없습니다.`.

5. **Test Command Output**:
   - `npm test`: Exited with code 0.
   - 51 Test Suites passed, 358 Tests passed.
   - `TimelineItemCardRender.test.tsx` verified memoized re-render behavior.

---

## 3. Logic Chain

1. **Observation 1 & 2** show that apartment selection and chart data derivation operate independently of missing summary objects. When `userFavorites` or `selectedAptSummary` is empty, `selectedAptChartData` gracefully degrades to macro trend data (`deferredMacroTrendData`), ensuring chart rendering never breaks or crashes.
2. **Observation 3** shows that card selection uses robust string normalization (`normalizeAptName`, `isSameApartment`) and applies distinct visual highlight styles without triggering unnecessary re-renders of unselected items.
3. **Observation 4** confirms that user-facing loading and fallback states provide clear feedback when data is being prefetched or estimated.
4. **Observation 5** confirms all project Jest tests pass cleanly, validating both layout render stability and memoization efficiency.
5. Therefore, Requirement R2 is completely satisfied, robustly implemented, and verified.

---

## 4. Caveats

- No caveats. Data fetching, SWR caching, timeframe slicing, and UI fallback mechanisms were fully inspected and tested.

---

## 5. Conclusion

The code implementation in `frontend/src/components/MacroDashboardClient.tsx` for Requirement R2 is **APPROVE**ed. The right chart data rendering is fully decoupled from summary data availability, default apartment selection functions correctly for logged-in and guest users, `TimelineItemCard` selection highlights work seamlessly, and fallback indicators provide appropriate user feedback.

---

## 6. Verification Method

To independently verify:

1. **Run Unit & Integration Tests**:
   ```bash
   cd frontend
   npm test
   ```
   *Expected result*: 51 test suites passed, 358 tests passed.

2. **Inspect Code Locations**:
   - Default apartment selection effect: `MacroDashboardClient.tsx:908-934`
   - Chart data fallback and decoupling: `MacroDashboardClient.tsx:1154-1406`
   - Timeline item selection highlight: `MacroDashboardClient.tsx:403-406, 1741-1747`
   - Fallback indicators: `MacroDashboardClient.tsx:1933-1951, 1981-1985`

---

## 7. Adversarial Stress Test Results

| Attack Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|
| Guest user with no favorites | Default to "동탄역 롯데캐슬" on load | Sets `selectedTimelineApt("동탄역 롯데캐슬")` | **PASS** |
| User with custom favorites | Auto-select first favorite in list | Sets `selectedTimelineApt(favArray[0])` | **PASS** |
| User switch / Session change | Reset default flag and load new user favorites | `useEffect` detects `user.uid` change & re-evaluates | **PASS** |
| Apartment tx JSON missing (404/network) | Render fallback macro chart with estimation notice | SWR returns `null`, falls back to macro scale, displays notice | **PASS** |
| Click timeline item card | Highlight card and update chart | Sets `selectedTimelineApt`, updates chart & highlights card | **PASS** |
