# Milestone M2, M3, M4 Implementation Report

## Summary of Changes

### 1. R1: Tax Benefit & Business Matching Algorithm Verification (M2)
- **`frontend/src/components/consumer/PropertyTaxCalculator.tsx`**:
  - Corrected **Local Education Tax** rate for heavy residential acquisition (`ownedHouses >= 3`): fixed at **0.4%** under Local Tax Law Art. 151 (previously incorrectly calculated as `acqTaxRate * 0.1` yielding 0.8% or 1.2%).
  - Corrected **Rural Special Tax** rates under Local Tax Law:
    - 8% heavy rate (`ownedHouses === 3`): >85m² = 0.6%, <=85m² = 0.2%.
    - 12% heavy rate (`ownedHouses >= 4`): >85m² = 1.0%, <=85m² = 0.4%.
    - Standard rate (`ownedHouses <= 2`): >85m² = 0.2%, <=85m² = 0%.
  - Fixed currency formatting rounding remainder bug in `formatEokMan`:
    - Value is now rounded first (`const rounded = Math.round(val)`), then `eok = Math.floor(rounded / 10000)` and `remainder = rounded % 10000`.
    - Eliminates remainder outputting `10000` (which previously produced `"10,000만 원"` or `"1억 10,000만 원"`).
- **`frontend/src/components/macro/RelocationTaxSimulator.tsx`**:
  - Fixed currency formatting rounding remainder bug in `formatKoreanPrice` (`Math.round(val)` first).
- **`frontend/src/components/consumer/AptFitFinder.tsx`**:
  - Removed `Math.max(50, ...)` floor clamp in `matchPercentage` calculation (`Math.min(99, Math.max(0, Math.round((score / 145) * 100)))`).
  - Preserves full match score distribution across 0% to 99%.

### 2. R2: Data Pipeline & Schema Integrity (M3)
- **`frontend/src/lib/services/officeTx.service.ts`**:
  - Hardened XML tag parsing using `safeParseInt` and `safeParseFloat` helper functions.
  - Sanitizes missing or non-numeric XML tags (`""`, invalid strings) before parsing or formatting.
  - Prevents `NaN` or `"NaN만원"`, cleanly falling back to `0` or `"0원"`.
- **`frontend/src/lib/validation/facade.schemas.ts`**:
  - Updated `SheetApartmentSchema` using `z.coerce.number()` to strictly validate Google Sheets SSOT data without dropping valid entries containing string numbers.
  - Hardened `TransactionRecordSchema` for Ministry of Land XML transaction records.
  - Added `HwaseongEnterpriseSchema` for Hwaseong enterprise and NPS macro stats data validation.
  - Added `MolTransactionXmlSchema` and `RedisCacheEnvelopeSchema` to validate XML tags and Upstash Redis L2 cache envelopes.

### 3. R3: Comprehensive Automated Audit Suite (M4)
- **`frontend/scripts/audit-pipeline.js`**:
  - Added `auditUnitTestSuite()` function that executes `npx jest` and evaluates exit code.
  - Added `unitTestsPassed` check in the final pipeline status gate so `npm run audit` requires 100% Jest test suite pass.
- **Jest Unit Test Suite**:
  - Updated `PropertyTaxCalculator.test.tsx` with tax formula and heavy rate tests.
  - Created `RelocationTaxSimulator.test.tsx` for price formatting and tax savings calculation tests.
  - Created `AptFitFinder.test.tsx` for match score distribution tests.
  - Created `officeTx.service.test.ts` for hardened XML parser tests.
  - Created `facade.schemas.test.ts` for Zod validation schemas integrity tests.

## Verification Results
- `npm test`: 39 passed out of 39 test suites (259 passed tests).
- `npx tsc --noEmit`: 0 errors.
- `npx eslint . --max-warnings=10`: 0 errors.
- `npm run audit`: PASSED (exit code 0).
