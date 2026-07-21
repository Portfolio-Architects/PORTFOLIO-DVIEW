# Handoff Report — Milestones M2, M3, M4 Implementation & Verification

## 1. Observation
- **R1 (Tax & Match Algorithm)**:
  - In `PropertyTaxCalculator.tsx`, Local Education Tax was previously computed as `acqTaxRate * 0.1` for all house counts, yielding 0.8% and 1.2% for 3 and 4+ houses. Under Local Tax Law Art. 151, heavy residential acquisition local education tax is fixed at 0.4%.
  - In `PropertyTaxCalculator.tsx`, Rural Special Tax was previously binary (0.2% if >85m² else 0%). Under Local Tax Law, 8% heavy rate is 0.6% (>85m²) / 0.2% (<=85m²), 12% heavy rate is 1.0% (>85m²) / 0.4% (<=85m²), and standard rate is 0.2% (>85m²) / 0% (<=85m²).
  - In `formatEokMan` and `formatKoreanPrice`, unrounded `manWon` caused `manWon % 10000` rounding up to 10,000 for values like `9999.6`, outputting `"10,000만 원"`.
  - In `AptFitFinder.tsx`, `Math.max(50, ...)` clamped all low match percentages to a minimum of 50%.
- **R2 (Data Pipeline & Schema Integrity)**:
  - `officeTx.service.ts` parsed raw XML text directly with `parseInt` and `parseFloat` without sanitization, producing `NaN` / `"NaN만원"` when tags were missing or non-numeric.
  - `facade.schemas.ts` lacked coerced types for Google Sheets SSOT data and lacked explicit schemas for Hwaseong enterprise data, MOL XML tags, and Upstash Redis L2 cache.
- **R3 (Automated Audit Suite)**:
  - `scripts/audit-pipeline.js` did not invoke Jest unit tests (`npm test`).
  - Unit tests for tax formulas, price formatting edge cases, score distribution, XML parser edge cases, and Zod schemas were missing or incomplete.

## 2. Logic Chain
1. **Fixing Tax Calculations & Formatting**:
   - Updated `localEducationTaxRate = ownedHouses >= 3 ? 0.4 : Math.round(acqTaxRate * 0.1 * 100) / 100` in `PropertyTaxCalculator.tsx`.
   - Updated `ruralSpecialTaxRate` branching based on `ownedHouses` (3 -> 0.6%/0.2%, >=4 -> 1.0%/0.4%, <=2 -> 0.2%/0%).
   - Updated `formatEokMan` and `formatKoreanPrice` to round total value first (`Math.round(val)`), eliminating 10,000 remainder output.
   - Changed `AptFitFinder.tsx` match percentage clamp from `Math.max(50, ...)` to `Math.max(0, ...)`.
2. **Hardening Data Pipeline & Schemas**:
   - Created `safeParseInt` and `safeParseFloat` in `officeTx.service.ts` to sanitize missing/empty tags (`""`, non-numeric) to clean default fallbacks (0, "0원").
   - Added `z.coerce.number()` to `SheetApartmentSchema` and created `HwaseongEnterpriseSchema`, `MolTransactionXmlSchema`, and `RedisCacheEnvelopeSchema` in `facade.schemas.ts`.
3. **Integrating Audit Suite & Tests**:
   - Added `auditUnitTestSuite()` to `audit-pipeline.js` running `npx jest` and checking exit code 0.
   - Implemented / updated Jest unit tests in `PropertyTaxCalculator.test.tsx`, `RelocationTaxSimulator.test.tsx`, `AptFitFinder.test.tsx`, `officeTx.service.test.ts`, and `facade.schemas.test.ts`.

## 3. Caveats
- No caveats. All requirements implemented and verified directly in `frontend/`.

## 4. Conclusion
- All requirements for Milestones M2, M3, and M4 are fully implemented and verified.
- 100% of Jest unit tests pass (39 test suites, 259 tests).
- 0 TypeScript compilation errors (`tsc --noEmit`).
- 0 ESLint errors (`eslint . --max-warnings=10`).
- `npm run audit` pipeline runs cleanly and returns exit code 0.

## 5. Verification Method
1. Run unit tests: `npm test` (in `frontend/`) -> expect 39/39 test suites passed.
2. Run TypeScript check: `npx tsc --noEmit` (in `frontend/`) -> expect 0 errors.
3. Run ESLint check: `npx eslint . --max-warnings=10` (in `frontend/`) -> expect 0 errors.
4. Run full audit pipeline: `npm run audit` (in `frontend/`) -> expect exit code 0 and "Pipeline Status: SUCCESS".
