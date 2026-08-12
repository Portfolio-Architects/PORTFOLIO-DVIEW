# Handoff Report: Milestone 3 (M3) — Apartment Lab Left Tab Recent Real Estate Transactions Update

**Agent**: Worker M3 (`worker_m3`)  
**Target Milestone**: Milestone 3 (M3) — Apartment Lab Left Tab Recent Real Estate Transactions Update (아파트 랩 좌측 일자별 최근 실거래 최신화)  
**Parent Agent ID**: `d609439f-5a37-40dd-a6ab-b033ee08bb24`  
**Date**: 2026-08-12  

---

## 1. Observation

### Files Inspected & Modified
1. `frontend/src/hooks/useStaticData.ts`:
   - Line 258: Previous calculation was `const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);`. When today is `2026-08-12`, the query `contractDate >= 20260805` created a data gap with static JSON ending on `2026-07-29`.
   - Modified to: `const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);` (`cutoffDateStr = `${y}${m}${d}``), querying Firestore for transactions within the last 30 days.
   - Line 332-342: Updated SWR hook configuration for `recent-transactions.json`: added `revalidateOnMount: true` and lowered `dedupingInterval` to `300000` (5 minutes) to ensure fresh data revalidation.
2. `frontend/src/components/DashboardClient.tsx`:
   - Line 344-360: Previous implementation of `filteredRecentTransactions` only extracted `tKey` values from `nameMapping` and checked `tx.txKey`, dropping valid items if `txKey` was missing or if matching produced an empty array.
   - Modified to populate `targetTxKeys` with normalized strings from BOTH `nameMapping` keys and values, check both `tx.txKey` and `tx.aptName`, and fallback to unfiltered `recentTransactions` if filtering produces 0 results.

### Commands Executed & Results
- `npm test`: PASS (51 test suites, 358 tests passed).
- `npm run build`: PASS (`node scripts/sync-transactions.js && node scripts/update-sw-version.js && next build` compiled successfully without errors).

---

## 2. Logic Chain

1. **Gap Resolution**: Static transaction JSON `public/data/recent-transactions.json` contains build-time snapshot data up to `2026-07-29`. By expanding the runtime Firestore query window in `fetchRecentTxsFromFirestore` from 7 days ago (`20260805`) to 30 days ago (`20260713`), all real-time transaction records reported during the gap window (2026-07-30 through 2026-08-04) are retrieved from Firestore and merged seamlessly with static transactions via `mergeRecentTransactions`.
2. **Fresh Data SWR Revalidation**: Configuring `revalidateOnMount: true` and a 5-minute deduplication interval for `recent-transactions.json` ensures client sessions automatically fetch and merge updated transaction snapshots upon mounting.
3. **Robust Fallback Filtering**: In `DashboardClient.tsx`, `filteredRecentTransactions` now checks both `tx.aptName` and `tx.txKey` against normalized keys and values in `nameMapping`. If name mapping entries are missing or matching returns empty results, the fallback returns `recentTransactions`, preventing valid transaction items from being inadvertently hidden.

---

## 3. Caveats

- **Firestore Online Data Dependency**: Live transaction fetch relies on valid Firebase client credentials and network availability. If Firestore is offline or unconfigured, `fetchRecentTxsFromFirestore` safely logs a warning and returns `[]`, gracefully falling back to static JSON data without breaking the page.

---

## 4. Conclusion

Milestone 3 (M3) implementation is complete. All changes strictly adhere to exclusive file ownership (`useStaticData.ts` and `DashboardClient.tsx`). Unit tests and production build pass cleanly with 0 errors.

---

## 5. Verification Method

To independently verify M3:
1. **Unit Tests**:
   ```bash
   cd frontend
   npm test
   ```
   Confirm all 51 test suites (358 tests) pass cleanly.
2. **Production Build**:
   ```bash
   cd frontend
   npm run build
   ```
   Confirm Next.js compilation succeeds with zero errors.
