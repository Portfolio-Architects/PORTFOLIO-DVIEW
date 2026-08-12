# Empirical Verification & Edge-Case Report (Challenger 2)

**Final Verdict**: **APPROVE**

---

## 1. Observation

### Test Execution Results
- Executed full Jest test suite (`npx jest`):
  - **Result**: 51 test suites passed, 51 total (358 tests passed, 0 failed).
- Executed empirical test suite (`npx jest src/m2_m3_empirical_verification.test.tsx`):
  - **Result**: 1 test suite passed, 1 total (20 tests passed, 0 failed).
  - Verifications include: `ChartErrorBoundary` fallback rendering and state recovery on retry, `processMacroTrendData` / `calculateMacroGapAndRatio` handling of null/undefined/zero/negative inputs, `formatAvgPriceEok` formatting edge cases, `MacroTrendChart` component rendering with empty/null line data without console errors, and 320px viewport layout overflow defense.

### R1 Code Inspection: `hooks/useFavorites.ts`
- **Lines 27–51**: `getGuestFavorites` reads `localStorage` key `'dview_guest_favorites'`. `saveGuestFavorites` serializes `Set<string> | string[]` into `localStorage` and dispatches `window.dispatchEvent(new CustomEvent('dview_favorites_updated', { detail: list }))`.
- **Lines 54–73**: Subscribes to both `'dview_favorites_updated'` (cross-component) and `'storage'` (cross-tab) events to maintain real-time guest favorite synchronization.
- **Lines 136–169**: When an unauthenticated user logs in, guest favorites in `'dview_guest_favorites'` are posted to `/api/favorite` for user account synchronization, and `localStorage.removeItem('dview_guest_favorites')` is executed cleanly.
- **Lines 197–204**: `isFavorited` matches target apartment names using `normalizeAptName(aptName)` and `isSameApartment(item, aptName)`, preventing mismatches caused by NFC normalization, whitespace, or bracket variations.

### R2 Code Inspection: `components/MacroDashboardClient.tsx`
- **Lines 800–825, 908–924**: `selectedTimelineApt` state initializes to `"동탄역 롯데캐슬"`. On first load with valid `userFavorites`, `hasSetDefaultApt` effect sets `setSelectedTimelineApt(favArray[0])` exactly once. Subsequent user card clicks update `selectedTimelineApt` via `handleCardClick(aptName)`, maintaining selection stability across re-renders and background SWR revalidations.
- **Lines 1154–1370**: When a complex not in `userFavorites` is selected, `selectedTimelineApt` fetches complex-specific transaction records `/tx-data/{txKey}.json` and calculates monthly averages in `selectedAptChartData`.
- **Fallback Logic**: If actual transaction data for the complex is empty or loading, `selectedAptChartData` scales macro trend points using `selectedAptSummary` averages. If summary is missing or line data is empty, `lineData` backfills using macro trend points (`macroSale` / `macroRent`).
- **Error Handling**: `ChartErrorBoundary` wraps chart components (`src/components/common/ChartErrorBoundary.tsx`), capturing rendering exceptions and rendering a fallback UI with a "다시 시도" retry button instead of crashing the dashboard.

### R3 Code Inspection: `hooks/useStaticData.ts`
- **Lines 255–280**: `fetchRecentTxsFromFirestore` queries Firestore collection `'transactions'` with `where('contractDate', '>=', cutoffDateStr)`.
- **Query Window**: `thirtyDaysAgo` is computed as `new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)` and formatted to `YYYYMMDD` (`cutoffDateStr`), establishing a rolling 30-day window for recent transactions.
- **Lines 192–253**: `mergeRecentTransactions` merges static JSON transactions (`recent-transactions.json`) with Firestore live transactions, deduplicating on `contractDate`, `txKey`, `area`, `floor`, and `priceVal`, and sorts by `contractDate` descending.
- **Lines 374–419**: `mergedRecent7DaysVolume` computes live 7-day transaction metrics and updates `currentCount`, `trendText`, `trendColor`, and `badge` indicators dynamically.

---

## 2. Logic Chain

1. **R1 Logic Chain (Favorites Persistence & Auth State Sync)**:
   - **Observation**: `useFavorites.ts` implements dual storage handling (`localStorage` + Firestore) and event listeners for `'dview_favorites_updated'` and `'storage'`.
   - **Reasoning**: Unauthenticated users can add/remove favorites without loss across tabs, and upon login, guest favorites are automatically migrated to Firestore via `/api/favorite`. `normalizeAptName` and `isSameApartment` guarantee that name format discrepancies (e.g. `[오산동] 힐스테이트 동탄역` vs `힐스테이트동탄역`) do not disrupt favorite state evaluation.
   - **Conclusion**: R1 state persistence, cross-tab sync, and auth migration are verified as robust.

2. **R2 Logic Chain (Selection Stability & Chart Integration)**:
   - **Observation**: `MacroDashboardClient.tsx` uses `hasSetDefaultApt` to trigger initial selection without overriding active user selections during re-renders. Non-favorite complexes successfully load `/tx-data/{txKey}.json` and fallback to scaled macro trends when specific transaction history is scarce. `m2_m3_empirical_verification.test.tsx` tests null/undefined inputs and `ChartErrorBoundary` recovery.
   - **Reasoning**: Stable state management prevents chart flicker and unexpected reset to default when data revalidates. Safe fallbacks ensure the right-hand chart renders continuous lines even with missing or partial data points. `ChartErrorBoundary` isolates SVG rendering errors.
   - **Conclusion**: R2 selection stability, non-favorite complex selection, and chart fallback defenses are verified as robust.

3. **R3 Logic Chain (Recent Transactions & 30-Day Query Window)**:
   - **Observation**: `useStaticData.ts` queries Firestore with `cutoffDateStr` (30 days ago) and merges results with static recent transactions, sorting descending by `contractDate`.
   - **Reasoning**: Using a rolling 30-day cutoff ensures recent transactions stay up to date while avoiding over-fetching historic Firestore documents. De-duplication logic prevents duplicate entries when static files and Firestore overlap.
   - **Conclusion**: R3 recent transactions updating, de-duplication, and query window filtering are verified as robust.

---

## 3. Caveats

- **Network Dependency for Live Firestore**: Unit tests mock Firestore queries and fetch calls. In live production environments without Firestore network connectivity, fallback to static JSON files (`recent-transactions.json` & `tx-summary.json`) is maintained without breaking UI layout.
- **Mock Auth Bypass**: `useFavorites` contains E2E mock auth bypass branches (`__E2E_MOCK_AUTH__`) for automated E2E testing environments.

---

## 4. Conclusion

All empirical unit tests (51 test suites, 358 tests total; including 20 empirical verification tests in `m2_m3_empirical_verification.test.tsx`) pass with 0 errors.

Code review and empirical verification confirm:
- **R1 (Favorite Persistence)**: Guest local storage sync, custom event broadcasting, account migration, and normalized name checking operate cleanly.
- **R2 (Selection Stability & Chart Fallback)**: Timeline selection state is stable, non-favorite selection fetches complex data dynamically, missing data falls back to macro-trend ratios, and `ChartErrorBoundary` handles exceptions gracefully.
- **R3 (Recent Transactions & 30-Day Query)**: Firestore 30-day query cutoff, live transaction merging, deduplication, and 7-day volume calculation operate correctly.

**Final Verdict**: **APPROVE**

---

## 5. Verification Method

To independently re-verify all empirical tests and code behaviors:

```bash
# 1. Run all frontend Jest test suites
cd frontend
npm test

# 2. Run the dedicated empirical verification suite
npx jest src/m2_m3_empirical_verification.test.tsx --no-cache
```

**Files to Inspect**:
1. `frontend/src/hooks/useFavorites.ts` (guest & auth favorite sync logic)
2. `frontend/src/components/MacroDashboardClient.tsx` (selection stability & chart fallback logic)
3. `frontend/src/hooks/useStaticData.ts` (30-day Firestore query & merge logic)
4. `frontend/src/m2_m3_empirical_verification.test.tsx` (empirical unit test assertions)
