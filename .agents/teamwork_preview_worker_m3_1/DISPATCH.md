## 2026-08-05T14:54:01Z
<USER_REQUEST>
You are a teamwork_preview_worker assigned to implement Milestone 3: Frontend Integration & UI Display Verification (R3).
Your working directory is: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_worker_m3_1
You MUST create your working directory if it does not exist, initialize BRIEFING.md and progress.md, and read:
1. c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md
2. c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_explorer_r3_1\handoff.md

Tasks:
1. State Synchronization (`TransactionSummaryMetrics.tsx` & `ApartmentModal.tsx`):
   - In `frontend/src/components/apartment-modal/TransactionSummaryMetrics.tsx`:
     - Add `chartType?: 'sale' | 'jeonse'` to `TransactionSummaryMetricsProps`.
     - Add `useEffect(() => { if (chartType) setPeriodDealType(chartType); }, [chartType]);`.
   - In `frontend/src/components/ApartmentModal.tsx`:
     - Pass `chartType={chartType}` to `<TransactionSummaryMetrics />`.
2. Fix Rent Metric & Gap Calculations (`TransactionSummaryMetrics.tsx`):
   - Implement `getTxPrice(tx: TransactionRecord)`:
     - For `'월세'`: `(tx.deposit || 0) + Math.round((tx.monthlyRent || 0) * 12 / 0.055)`
     - For `'전세'`: `tx.deposit || tx.price || 0`
     - For `'매매'`: `tx.price || tx.deposit || 0`
   - Update `filteredJeonses`: include both `'전세'` and `'월세'` (`baseTx.filter(tx => tx.dealType === '전세' || tx.dealType === '월세')`).
   - Update `getAvgForGap`: use `getTxPrice(tx)` instead of `tx.price`.
3. Fix Rent Sorting in `TransactionTable.tsx`:
   - In `frontend/src/components/apartment-modal/TransactionTable.tsx`:
     - Update `getP(t)` helper:
       ```ts
       const getP = (t: TransactionRecord) => {
         if (t.dealType === '월세') {
           return (t.deposit || 0) + Math.round((t.monthlyRent || 0) * 12 / 0.055);
         }
         if (t.dealType === '전세') {
           return t.deposit || t.price || 0;
         }
         return t.price || t.deposit || 0;
       };
       ```
4. Include Monthly Rent (`월세`) in `MacroDashboardClient.tsx`:
   - In `frontend/src/components/MacroDashboardClient.tsx`:
     - Convert `월세` deposit value to Jeonse deposit equivalent (`(deposit + monthlyRent * 12 / 0.055) / 10000`) and push into `rentsByMonth`.
5. Verification:
   - Change directory to `frontend` and run `npx tsc --noEmit` and `npm run build`. Confirm 0 errors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write report to: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_worker_m3_1\handoff.md
Notify orchestrator when complete.
</USER_REQUEST>
