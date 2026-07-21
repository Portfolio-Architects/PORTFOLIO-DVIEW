## 2026-07-21T13:32:12Z
You are a Worker subagent for the D-VIEW Web Application Data Integrity & Audit Suite project.
Your working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m2_m3_m4
Project root: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement, test, and verify all fixes for Milestones M2, M3, and M4 in `frontend/`:

1. **R1: Tax Benefit & Business Matching Algorithm Verification (M2)**:
   - In `frontend/src/components/consumer/PropertyTaxCalculator.tsx`:
     - Fix Local Education Tax rate calculation when `ownedHouses >= 3` (8% / 12% heavy tax): under Local Tax Law Art. 151, Local Education Tax for heavy residential acquisition is fixed at **0.4%**, NOT `acqTaxRate * 0.1` (which wrongly gives 0.8% / 1.2%).
     - Fix Rural Special Tax rates under Local Tax Law:
       - For 8% heavy rate: >85m² is 0.6%, <=85m² is 0.2%.
       - For 12% heavy rate: >85m² is 1.0%, <=85m² is 0.4%.
       - For standard rate: >85m² is 0.2%, <=85m² is 0%.
     - Fix currency formatting rounding remainder bug in `formatEokMan` in `PropertyTaxCalculator.tsx` and `formatKoreanPrice` in `RelocationTaxSimulator.tsx`:
       Round total value first (`const rounded = Math.round(val)`), then compute `eok = Math.floor(rounded / 10000)` and `remainder = rounded % 10000`. Prevent remainder outputting `10000` (which causes `"10,000만 원"` or `"1억 10,000만 원"`).
   - In `frontend/src/components/consumer/AptFitFinder.tsx`:
     - Remove `Math.max(50, ...)` floor clamp in match percentage calculation so low match scores are preserved across 0% to 99%.

2. **R2: Data Pipeline & Schema Integrity (M3)**:
   - In `frontend/src/lib/services/officeTx.service.ts`:
     - Harden XML tag parsing. Sanitize missing/empty XML tags (`""` or non-numeric) before calling `parseInt` or `formatPrice` so it never yields `NaN` or `"NaN만원"`. Fallback cleanly to `0` or `"0원"`.
   - In `frontend/src/lib/validation/facade.schemas.ts` and data layer services:
     - Ensure Zod validation schemas strictly validate data structures for Google Sheets SSOT, Ministry of Land XML transactions, Hwaseong enterprise data, Firestore converters (`firestoreConverters.ts`), and Upstash Redis L2 cache (`redis.ts`) / SWR sync without corrupting state or dropping valid entries.

3. **R3: Comprehensive Automated Audit Suite (M4)**:
   - In `frontend/scripts/audit-pipeline.js`:
     - Add `auditUnitTestSuite()` function that executes `npm test` (`npx jest`) and checks its exit code.
     - Include `unitTestsPassed` in the final execution status check so `npm run audit` requires 100% Jest test passing with exit code 0.
   - Implement / update Jest unit tests in `frontend/src/` to cover:
     - Tax calculation formulas and heavy rate Local Education Tax (0.4%) / Rural Special Tax cases in `PropertyTaxCalculator.test.tsx` and `RelocationTaxSimulator.test.tsx`.
     - Price formatting edge cases (e.g. 9999.6 -> "1억 원").
     - FitFinder score distribution without 50% floor clamp.
     - XML parser edge cases with missing/empty tags in `officeTx.service.test.ts`.
     - Zod validation schemas in `facade.schemas.test.ts`.
   - Run `npm test` and `npm run audit` in `frontend/` to verify that 100% of unit tests pass, 0 TS compiler errors, 0 linter errors, and `npm run audit` succeeds with exit code 0.

Write your report of changes to `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m2_m3_m4\changes.md` and deliver a handoff report when complete. Send a message to the orchestrator with test results.
