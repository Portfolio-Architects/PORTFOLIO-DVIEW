## 2026-08-05T23:45:26Z

You are a teamwork_preview_worker assigned to implement Milestone 1: Rent Data Collection & API Script Fixes (R1).
Your working directory is: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_worker_m1_1
You MUST create your working directory if it does not exist, initialize BRIEFING.md and progress.md, and read:
1. c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md
2. c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_explorer_r1_1\handoff.md

Tasks:
1. In `frontend/src/app/api/cron/sync-transactions/route.ts`:
   - Pass `API_KEY` using `encodeURIComponent(API_KEY)` in URL parameters to avoid MOLIT API Auth Error 30 when key contains `+`, `/`, `=`.
   - Update XML/JSON parsing to support both Korean tags (`<보증금액>`, `<월세금액>`, `<법정동>`, `<아파트>`, `<년>`, `<월>`, `<일>`, `<층>`, `<전용면적>`) and English tags (`deposit`, `monthlyRent`, `umdNm`, `aptNm`, `dealYear`, `dealMonth`, `dealDay`, `floor`, `excluUseAr`).
   - Query legal dong codes `41590` (Hwaseong-si) AND `41597` (Dongtan-gu).
   - Expand month scan window to 6 months (`M` through `M-5`) to catch administrative delays.
2. In `frontend/scripts/fetch-rent.js`:
   - Query both `41590` and `41597`.
   - Parse XML responses gracefully if MOLIT returns XML despite `_type=json`.
3. In `frontend/scripts/upload-rent-csv.js` & `upload-rent-csv-fast.js`:
   - Ensure deterministic document ID generation (`_key`) to prevent random document ID duplication.
4. In `frontend/vercel.json`:
   - Add `"crons"` schedule configuration array for `/api/cron/sync-transactions` (e.g. daily schedule `"0 18 * * *"`).
5. Run build and type checks:
   - Change directory to `frontend` and execute `npx tsc --noEmit` and `npm run build`. Verify 0 errors.

Write your report to: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_worker_m1_1\handoff.md
When complete, notify the orchestrator with your results.
