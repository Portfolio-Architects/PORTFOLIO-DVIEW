# Handoff Report — Explorer Subagent (`explorer_audit_1`)

**Project**: D-VIEW Web Application Data Integrity & Audit Suite  
**Working Directory**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_audit_1`  
**Report Output**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_audit_1\analysis.md`

---

## 1. Observation

- **Tax Reduction & Property Tax Formulas**:
  - `RelocationTaxSimulator.tsx` (Lines 26-46): Calculates corporate tax savings as `annualCorpTax * 5` without accounting for SME Minimum Tax (최저한세, 7%) or Special Tax for Rural Development (농어촌특별세, 20% surcharge on tax exempted amount).
  - `PropertyTaxCalculator.tsx` (Lines 291-320): `acqTaxRate = Math.round(acqTaxRate * 100) / 100` prematurely rounds 6~9억 acquisition tax rate to 2 decimal places (causing ~23,333 KRW drift on 7억 property).
  - `PropertyTaxCalculator.tsx` (Line 318): Hardcodes `ruralSpecialTaxRate = exclusiveArea === '85over' ? 0.2 : 0;` regardless of `ownedHouses`. Under Rural Development Special Tax Act, 3-house (8% acq tax) and 4-house (12% acq tax) escalation increases Rural Special Tax to 0.6% and 1.0% respectively, causing an undercount of up to 8,000,000 KRW on a 10억 property.
  - `sellTimingEngine.ts` (Lines 199-275): Uses `Math.round()` in `만원` units at 4 intermediate steps instead of statutory 10 KRW truncation (`Math.floor(val / 10) * 10`).

- **Matching Algorithms & Roommate Board**:
  - `AptFitFinder.tsx` (Line 526): `matchPercentage = Math.min(99, Math.max(50, Math.round((score / 145) * 100)))` clamps minimum match score to 50%, awarding 0-match candidates an inflated 50% compatibility score.
  - `AptFitFinder.tsx` (Line 386): `if (salesPrice <= 0) return null;` excludes any apartment missing 3-month average price data from recommendations.
  - `CoLeasingBoard.tsx` (Lines 86-390): Operates on static in-memory array `INITIAL_POSTS` without backend Firestore/Redis integration or matching scoring algorithms. Form submissions trigger browser `alert()` and reset on reload.

- **Data Parsers & Zod Schemas**:
  - `facade.schemas.ts`: Validates `SheetApartmentSchema`, `TransactionRecordSchema`, `FieldReportSchema`, but lacks Zod schemas for Hwaseong enterprise datasets (`nps_stats.json`, `yeongcheon_jisan_units.json`) and raw MOLIT XML API responses.
  - `redis.ts` & `SWRProvider.tsx`: Implements L1 LRU cache, L2 Upstash Redis timeout wrapper (1.5s), and SWR cache versioning via `BUILD_VERSION`.

- **Test Suite & Build Execution**:
  - Command: `npm test` -> 35 passed, 35 total test suites; 240 passed, 240 total unit tests.
  - Command: `npm run audit` -> `audit-pipeline.js` verified TypeScript compilation, transaction data consistency, and asset sizes.

---

## 2. Logic Chain

1. **Tax Precision & Statutory Alignment**:
   - Observations show `RelocationTaxSimulator.tsx` uses a simple `5x` multiplier for corporate tax savings and `PropertyTaxCalculator.tsx` hardcodes Rural Special Tax at `0.2%`.
   - Under 조세특례제한법 제132조 and 농어촌특별세법 제5조, corporate tax reductions cannot exceed minimum tax limits, and multi-house acquisition heavy tax rates escalate Rural Special Tax up to 1.0%.
   - Therefore, the current tax simulation formulas produce inaccurate projections for multi-house owners and corporate relocations.

2. **Matching Algorithm Calibration**:
   - Observations show `AptFitFinder.tsx` clamps match score to `Math.max(50, ...)`.
   - When a user selects criteria that no candidate meets, the algorithm still outputs a 50% compatibility rating.
   - Therefore, the clamping creates an artificial score floor that degrades user trust in recommendations.

3. **Data Layer & Test Coverage**:
   - Observations show Jest unit tests pass 240/240 tests, but `CoLeasingBoard.tsx` and Hwaseong enterprise data loaders have zero test coverage.
   - Therefore, adding tests and Firestore binding for Co-Leasing will complete data integrity compliance.

---

## 3. Caveats

- **External Live Tax Database APIs**: Tax laws in South Korea are subject to legislative updates. The calculations were evaluated against 2026 Korean Local Tax Law and Restriction of Special Taxation Act ordinances.
- **Firestore Billing Audits**: Cost projections in `audit-pipeline.js` rely on historical `daily_stats` records.

---

## 4. Conclusion

The D-VIEW data layer is architecturally robust with resilient multi-tier caching (LRU + Upstash Redis + SWR), strong Zod schemas for core transaction and sheet models, and a 100% passing Jest unit test suite (240/240 tests).
However, **critical calculation bugs** exist in the tax simulation suite (missing multi-house Rural Special Tax escalation, minimum corporate tax exclusion, premature rate rounding) and **score normalization flaws** exist in Apt FitFinder (50% match floor clamping). Additionally, `CoLeasingBoard.tsx` requires transition from mock memory state to persistent Firestore models.

---

## 5. Verification Method

1. **Tax Escalation Bug Verification**:
   - File: `frontend/src/components/consumer/PropertyTaxCalculator.tsx`
   - Select 4-house owner (`ownedHouses = 4`), exclusive area >85m² (`85over`), purchase price 10억원.
   - Verify that `ruralSpecialTax` equals `1,000만원` (1.0%) instead of `200만원` (0.2%).

2. **FitFinder Score Floor Verification**:
   - File: `frontend/src/components/consumer/AptFitFinder.tsx`
   - Inspect line 526 and verify match percentage for a candidate with raw score 35 returns 24% when `Math.max(50, ...)` is removed.

3. **Automated Test Suite Verification**:
   - Run command: `npm test` inside `frontend/`.
   - Verify 35 test suites and 240 unit tests pass successfully.

---
*Handoff report completed by Explorer Subagent (`explorer_audit_1`).*
