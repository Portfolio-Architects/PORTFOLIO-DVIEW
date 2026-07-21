# M5 Verification Handoff Report — Challenger 1

**Agent ID**: `challenger_m5_1`  
**Role**: EMPIRICAL CHALLENGER (critic, specialist)  
**Date**: 2026-07-21  
**Working Directory**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\challenger_m5_1`  

---

## 1. Observation

Direct empirical observations from source code inspection and test execution:

1. **PropertyTaxCalculator.tsx (`frontend/src/components/consumer/PropertyTaxCalculator.tsx`)**:
   - Lines 292-306: For 1 and 2 houses (비조정대상지역), acquisition tax rate is 1.0% for `<=6억`, `priceEok * (2/3) - 3` for `6억~9억`, and 3.0% for `>9억`.
   - Lines 313: Local Education Tax rate for 3+ houses is fixed at `0.4%` (지방세법 제151조), and `acqTaxRate * 0.1` for 1~2 houses.
   - Lines 318-326: Rural Special Tax rate for 3 houses is `0.2%` (`<=85m²`) / `0.6%` (`>85m²`), and for 4+ houses is `0.4%` (`<=85m²`) / `1.0%` (`>85m²`).
   - Lines 331-351: Brokerage fee tiers: `<5천만` (0.6%, cap 25만), `<2억` (0.5%, cap 80만), `<9억` (0.4%), `<12억` (0.5%), `<15억` (0.6%), `>=15억` (0.7%).
2. **Currency Formatters (`PropertyTaxCalculator.tsx:395`, `RelocationTaxSimulator.tsx:49`)**:
   - `formatEokMan`: Uses `Math.round(manWon)`. Boundary value `9999.6` -> `10000` -> `"1억원"`, `19999.6` -> `20000` -> `"2억원"`.
   - `formatKoreanPrice`: Uses `Math.round(valueManWon)`. Boundary value `9999.6` -> `10000` -> `"1억 원"`, `19999.6` -> `20000` -> `"2억 원"`.
3. **AptFitFinder.tsx (`frontend/src/components/consumer/AptFitFinder.tsx`)**:
   - Line 526: `matchPercentage = Math.min(99, Math.max(0, Math.round((score / 145) * 100)))`.
   - Without a 50% floor clamp, low-matching option profiles produce scores down to **32% ~ 39%** continuously.
4. **officeTx.service.ts (`frontend/src/lib/services/officeTx.service.ts`)**:
   - Lines 16-30: `safeParseInt` and `safeParseFloat` sanitize commas and return fallbacks on `NaN`/empty strings without throwing exceptions.
   - Lines 61-99: `parseOfficeXml` safely handles missing `<item>` tags, empty inner tags, and non-numeric strings.
5. **facade.schemas.ts (`frontend/src/lib/validation/facade.schemas.ts`)**:
   - Lines 83-100: `NicknameSchema` auto-trims whitespace and validates string length between 2 and 10 characters using spread operator for Unicode correctness.
   - Lines 171-233: `ObjectiveMetricsSchema` transforms `null` into standard defaults (`""`, `0`, `9999`).
6. **Automated Test Results (`npm test`)**:
   - `npm test -- m5_empirical_verification.test.ts`: **19 passed, 0 failed** (8.1s execution time).
   - Full `npm test` run: **40 test suites passed, 278 tests passed** (21.1s execution time).

---

## 2. Logic Chain

1. **Tax Calculator Verification**:
   - Tax rate tier logic was verified across all house count branches (1, 2, 3, 4+) and area limits (`<=85m²` vs `>85m²`).
   - Standard non-adjusted tax rates (1~3%), heavy tax rates (8% for 3 houses, 12% for 4+ houses), local education tax rates (0.1%~0.3% vs fixed 0.4%), and rural special tax rates (0%, 0.2%, 0.4%, 0.6%, 1.0%) match Korean Local Tax Law (지방세법 및 농어촌특별세법).
   - Brokerage fee caps at 5,000만원 (25만원 cap) and 20,000만원 (80만원 cap) execute accurately.

2. **Formatter Boundary Stress Verification**:
   - Inputs `9999.6` and `19999.6` undergo initial `Math.round`, converting to `10000` and `20000` prior to modulo operations (`10000 % 10000 = 0`), which cleanly returns `"1억원"` / `"1억 원"` and `"2억원"` / `"2억 원"`.
   - Minor formatting difference noticed: `formatEokMan` omits spaces (`"1억원"`), while `formatKoreanPrice` includes spaces (`"1억 원"`).

3. **AptFitFinder Match Distribution Verification**:
   - Empirical test harness generated synthetic low-scoring inputs. `matchPercentage` produced scores below 50% (39%), confirming removal of the 50% floor clamp and demonstrating smooth score distribution across 0%~99%.

4. **XML Parsing & Schema Resilience**:
   - Empty XML inputs, missing tag structures, and corrupted strings (`" 12,500 "`, `"84.95m2"`) were parsed without runtime errors or `NaN` outputs.
   - Zod schemas correctly coerce numeric strings, auto-trim inputs, and replace nulls with valid default structures.

---

## 3. Caveats

- **No modifications to core production codebase**: All verification was performed via inspect-and-test methodology using dedicated empirical test harnesses (`src/m5_empirical_verification.test.ts`).
- **Mocked Browser APIs**: Unit tests mock browser DOM/clipboard/Recharts methods. End-to-end user interaction relies on standard Next.js client component hydration.

---

## 4. Conclusion

All 5 verification targets in Milestone 5 (M5) are empirically verified and operate correctly under edge-case inputs and stress conditions. All 40 test suites in `frontend/` (278 individual tests) are passing.

---

## 5. Verification Method

To independently verify all findings and test suites:

```bash
cd "c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend"
npm test -- m5_empirical_verification.test.ts
npm test
```

Inspect the challenge report at:
`c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\challenger_m5_1\challenge.md`
