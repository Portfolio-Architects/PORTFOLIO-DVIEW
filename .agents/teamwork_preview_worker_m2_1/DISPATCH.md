## 2026-08-05T14:49:20Z
You are a teamwork_preview_worker assigned to implement Milestone 2: Firestore DB Upsert & Data Integrity Optimization (R2).
Your working directory is: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_worker_m2_1
You MUST create your working directory if it does not exist, initialize BRIEFING.md and progress.md, and read:
1. c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md
2. c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_explorer_r2_1\handoff.md

Tasks:
1. Standardize `_key` formula to include `monthlyRent` across all rent ingestion files:
   - In `frontend/src/app/api/cron/sync-transactions/route.ts`, `frontend/scripts/fetch-rent.js`, `frontend/scripts/upload-rent-csv.js`, `frontend/scripts/upload-rent-csv-fast.js`:
     `const _key = RENT_${aptName}_${contractYm}_${contractDay}_${area}_${deposit}_${monthlyRent}_${floor};`
   - Ensure `_key` is set BOTH as document ID (`collRef.doc(_key)`) AND inside the record object payload (`{ ..., _key }`).
2. Create shared `areaConverter.ts` helper module:
   - Create file `frontend/src/lib/utils/areaConverter.ts`.
   - Statically import `type-map.json` from `frontend/public/data/type-map.json` or `frontend/src/data/type-map.json`.
   - Export `getSupplyPyeong(aptName: string, area: number): number` matching exact `aptName` & `area`, fallback tolerance (< 0.11m²), and formula fallback (`Math.round(area * 0.3025 * 1.33 * 10) / 10`).
   - Update `sync-transactions/route.ts`, `fetch-rent.js`, `fetch-transactions.js`, `upload-rent-csv.js`, and `upload-rent-csv-fast.js` to use `getSupplyPyeong` for `areaPyeong`.
3. Create `firestore.indexes.json` & update `firebase.json`:
   - Create `frontend/firestore.indexes.json` with compound index definitions for `transactions` collection:
     - `(dealType ASC, contractDate ASC)`
     - `(dealType ASC, aptName ASC, area ASC, price DESC)`
     - `(contractYm ASC, contractDate DESC)`
   - Update `frontend/firebase.json` to include `"indexes": "firestore.indexes.json"`.
4. Verification:
   - Change directory to `frontend` and run `npx tsc --noEmit` and `npm run build`. Confirm 0 errors.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write report to: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_worker_m2_1\handoff.md
Notify orchestrator when finished.
