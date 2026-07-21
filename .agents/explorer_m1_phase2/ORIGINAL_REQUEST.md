## 2026-07-21T13:30:38Z
You are an Explorer subagent for D-VIEW Data Integrity, Tax Benefit Formulas, Matching Algorithms & Schema Verification.
Your working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_m1_phase2
Project root: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW

Please investigate the following files and logic in `frontend/src/`:

1. **R1: Tax Benefit & Business Matching Algorithms**:
   - `frontend/src/components/macro/RelocationTaxSimulator.tsx`
   - `frontend/src/components/consumer/PropertyTaxCalculator.tsx`
   - `frontend/src/components/consumer/AptFitFinder.tsx`
   - `frontend/src/lib/utils/scoring.ts` and `frontend/src/app/actions/scoring.ts`
   - Check all tax reduction simulation formulas (acquisition tax, property tax, corporate tax rates for Dongtan Techno-Valley migration under local tax ordinances - 지방세특례제한법 Article 58-2 etc.) for precision errors, floating point drift, rounding flaws, or unhandled conditions.
   - Check Office FitFinder and Roommate matching scoring logic for scoring correctness, weights normalization, zero division, edge cases.

2. **R2: Data Pipeline & Schema Integrity**:
   - `frontend/src/lib/validation/facade.schemas.ts` (Zod validation schemas)
   - `frontend/src/lib/services/googleSheets.ts` (Google Sheets SSOT parser)
   - `frontend/src/lib/services/officeTx.service.ts` & transaction sync scripts (Ministry of Land XML transaction parser)
   - `frontend/src/lib/redis.ts` (Upstash Redis L2 cache) & SWR caching layer (`frontend/src/components/pwa/SWRProvider.tsx`)
   - `frontend/src/lib/DashboardFacade.ts` & Firestore converters (`frontend/src/lib/utils/firestoreConverters.ts`)
   - Identify any missing Zod schemas, fallback behavior that uses corrupted/unvalidated state, cache desync, or stale state risks.

3. **R3: Automated Audit Suite**:
   - `frontend/scripts/audit-pipeline.js` (`npm run audit`)
   - Existing Jest unit test coverage under `frontend/src/` and `frontend/tests/`.
   - Identify missing unit test cases for tax formulas, matching algorithms, XML/JSON parser edge-cases, and Zod validators.

Write your complete detailed findings to `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_m1_phase2\analysis.md` and handoff report. Send a message to the orchestrator when complete.
