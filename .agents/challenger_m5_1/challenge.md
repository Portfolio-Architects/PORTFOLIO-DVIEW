# M5 Verification Challenge Report — Empirical Verification & Stress Testing

**Author**: Challenger 1 (EMPIRICAL CHALLENGER)  
**Date**: 2026-07-21  
**Target Project**: D-VIEW Data Integrity & Audit Suite  
**Working Directory**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\challenger_m5_1`  

---

## Challenge Summary

**Overall risk assessment**: **LOW**

Empirical verification and automated stress testing were conducted across all 5 key targets in M5:
1. Tax calculation formulas in `PropertyTaxCalculator.tsx` across house counts (1, 2, 3, 4+) and exclusive area options (`<=85m²`, `>85m²`).
2. Currency formatters (`formatEokMan`, `formatKoreanPrice`) with boundary values (`9999.6`, `19999.6`, `10000`, `20000`).
3. `AptFitFinder.tsx` match percentage distribution without 50% floor clamp.
4. `officeTx.service.ts` XML parser with empty tags, missing tags, and corrupted numeric strings.
5. Zod validation schemas in `facade.schemas.ts`.

All 40 Jest test suites in `frontend/` (including 278 individual assertions across 40 suites) passed successfully. The empirical verification test suite (`src/m5_empirical_verification.test.ts`) executed 19 dedicated stress assertions validating edge cases, boundary transitions, and schema transformations.

---

## Challenges

### [Low] Challenge 1: String Formatting Inconsistency Between `formatEokMan` and `formatKoreanPrice`

- **Assumption challenged**: Formatting routines across component views maintain uniform spacing and unit label representations.
- **Attack scenario**: `formatEokMan` outputs `"1억원"` (no space before `원`) and `"9,999만원"` (no space), whereas `formatKoreanPrice` outputs `"1억 원"` (with space before `원`) and `"5,000만 원"` (with space before `원`).
- **Blast radius**: Minor UI inconsistency in visual text presentation between consumer calculators and macro simulators.
- **Mitigation**: Standardize currency formatting into a single shared utility in `@/lib/utils/formatters.ts` with configurable spacing rules.

### [Low] Challenge 2: Discontinuity in Statutory Brokerage Fee Tiers at 9 Billion KRW (90,000만원)

- **Assumption challenged**: Brokerage fee calculations increase monotonically without abrupt jumps at boundary values.
- **Attack scenario**: At 89,999만원 (8.9999억원), upper limit rate is 0.4% (359.996만원 -> rounded to 360만원). At 90,000만원 (9억원), upper limit rate steps up to 0.5% (450만원). A 1만원 price increase results in a 90만원 fee jump due to statutory fee tier boundaries set by municipal ordinances.
- **Blast radius**: User confusion regarding sudden step-ups in estimated brokerage fees near the 9억원 threshold.
- **Mitigation**: Display a explanatory tooltip or footnote indicating that municipal ordinance fee caps shift from 0.4% (5억~9억 미만) to 0.5% (9억~12억 미만) at 9억원.

---

## Stress Test Results

| Target Item | Test Scenario / Input | Expected Behavior | Actual Behavior | Pass / Fail |
|---|---|---|---|---|
| **Property Tax (1-2 Houses)** | 50,000만원 (5억) | Acq tax 1% (500만), Local Ed 0.1% (50만), Rural 0% | Acq tax 1%, Local Ed 0.1%, Rural 0% | **PASS** |
| **Property Tax (7.5억)** | 75,000만원 (7.5억) | Acq tax 2% (1500만), Local Ed 0.2% (300만) | Acq tax 2%, Local Ed 0.2% | **PASS** |
| **Property Tax (3 Houses, <=85m²)** | 80,000만원, 3주택, <=85m² | Acq tax 8% (6400만), Local Ed 0.4% (320만), Rural 0.2% (160만) | Acq tax 8%, Local Ed 0.4%, Rural 0.2% | **PASS** |
| **Property Tax (3 Houses, >85m²)** | 80,000만원, 3주택, >85m² | Acq tax 8% (6400만), Local Ed 0.4% (320만), Rural 0.6% (480만) | Acq tax 8%, Local Ed 0.4%, Rural 0.6% | **PASS** |
| **Property Tax (4+ Houses, <=85m²)**| 100,000만원, 4주택, <=85m² | Acq tax 12% (12000만), Local Ed 0.4% (400만), Rural 0.4% (400만) | Acq tax 12%, Local Ed 0.4%, Rural 0.4% | **PASS** |
| **Property Tax (4+ Houses, >85m²)** | 100,000만원, 4주택, >85m² | Acq tax 12% (12000만), Local Ed 0.4% (400만), Rural 1.0% (1000만) | Acq tax 12%, Local Ed 0.4%, Rural 1.0% | **PASS** |
| **Brokerage Fee Cap (4,999만)** | 4,999만원 (<5,000만) | 0.6% rate (29.994만) capped at 25만원 | Capped at 25만원 | **PASS** |
| **Brokerage Fee Cap (19,999만)** | 19,999만원 (<20,000만) | 0.5% rate (99.995만) capped at 80만원 | Capped at 80만원 | **PASS** |
| **Currency Formatter (`formatEokMan`)** | `9999.6` | `Math.round(9999.6)` = 10000 -> `"1억원"` | `"1억원"` | **PASS** |
| **Currency Formatter (`formatEokMan`)** | `19999.6` | `Math.round(19999.6)` = 20000 -> `"2억원"` | `"2억원"` | **PASS** |
| **Currency Formatter (`formatEokMan`)** | `10000` | `"1억원"` | `"1억원"` | **PASS** |
| **Currency Formatter (`formatEokMan`)** | `20000` | `"2억원"` | `"2억원"` | **PASS** |
| **Currency Formatter (`formatKoreanPrice`)** | `9999.6` | `Math.round(9999.6)` = 10000 -> `"1억 원"` | `"1억 원"` | **PASS** |
| **Currency Formatter (`formatKoreanPrice`)** | `19999.6` | `Math.round(19999.6)` = 20000 -> `"2억 원"` | `"2억 원"` | **PASS** |
| **AptFitFinder Score Distribution** | Poor match profile (low specs) | `matchPercentage` drops below 50% (measured: 39%) | `matchPercentage` = 39% (< 50%) | **PASS** |
| **AptFitFinder Score Upper Bound** | Ideal match profile | `matchPercentage` reaches upper bound (clamped at 99%) | `matchPercentage` = 99% | **PASS** |
| **Office XML Parser (Empty XML)** | `""` or `<response></response>` | Return empty array `[]` without throwing exception | `[]` | **PASS** |
| **Office XML Parser (Empty Tags)** | `<item>` with missing child tags | Fallback defaults: date `1970-01-01`, price `0원`, building `미상 건물` | Correct defaults populated | **PASS** |
| **Office XML Parser (Corrupted Numbers)**| `<전용면적>84.95m2</전용면적>` | Parse float as `84.95`, strip non-numeric suffix | `sizeSqM` = 84.95 | **PASS** |
| **Zod Schema (`NicknameSchema`)** | `'  User_123  '`, `'a'`, `'11_char_name'` | Auto-trim `'User_123'`, reject length < 2 or > 10 | Parsed & rejected correctly | **PASS** |
| **Zod Schema (`SheetApartmentSchema`)** | Coerced string inputs (`lat: "37.2"`) | Coerce `"37.2"` to number `37.2` | `lat` = 37.2 | **PASS** |
| **Zod Schema (`ObjectiveMetricsSchema`)**| Null inputs (`brand: null`) | Transform `null` to empty string `""` / default fallback | `brand` = `""` | **PASS** |

---

## Unchallenged Areas

- **Backend Firestore Security Rules**: Live database write permissions were not evaluated in this local verification turn (out of frontend scope).
- **Kakao Talk Share API Runtime Integration**: Kakao Share API calls were verified via mock functions (`shareTaxToKakao`, `shareRecommendationsToKakao`) rather than live Kakao SDK network requests.
