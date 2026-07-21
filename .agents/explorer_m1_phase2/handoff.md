# Handoff Report: D-VIEW Data Integrity, Tax Formulas, Matching Algorithms & Schema Verification

**Role**: Explorer Subagent (`explorer_m1_phase2`)  
**Target Path**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_m1_phase2\handoff.md`  
**Date**: 2026-07-21  

---

## 1. Observation

Direct observations from source code examination under `frontend/src/` and `frontend/scripts/`:

1. **Local Education Tax Heavy Rate Calculation Defect (`PropertyTaxCalculator.tsx:313-315`)**:
   ```typescript
   // 지방교육세 = 취득세율의 10%
   const localEducationTaxRate = acqTaxRate * 0.1;
   const localEducationTax = Math.round(acquisitionPrice * (localEducationTaxRate / 100));
   ```
   When `ownedHouses === 3` (`acqTaxRate` = 8%) or `ownedHouses === 4` (`acqTaxRate` = 12%), `localEducationTaxRate` is calculated as `0.8%` and `1.2%`. Under Korean Local Tax Law (지방세법 Article 151), residential heavy acquisition tax sets Local Education Tax to a **fixed 0.4%**.

2. **Rural Special Tax Heavy Rate Defect (`PropertyTaxCalculator.tsx:318`)**:
   ```typescript
   const ruralSpecialTaxRate = exclusiveArea === '85over' ? 0.2 : 0;
   ```
   Under Korean Local Tax Law, when heavy acquisition taxation (8% / 12%) applies:
   - For > 85m²: Rural Special Tax is **0.6%** (8% heavy rate) and **1.0%** (12% heavy rate), NOT 0.2%.
   - For <= 85m²: Rural Special Tax is **0.2%** (8% heavy rate) and **0.4%** (12% heavy rate), NOT 0%.

3. **Korean Currency Formatting Remainder Rounding Bug (`RelocationTaxSimulator.tsx:49-57` & `PropertyTaxCalculator.tsx:388-395`)**:
   ```typescript
   const eok = Math.floor(valueManWon / 10000);
   const remainder = Math.round(valueManWon % 10000);
   if (eok === 0) return `${remainder.toLocaleString()}만 원`;
   if (remainder === 0) return `${eok}억 원`;
   return `${eok}억 ${remainder.toLocaleString()}만 원`;
   ```
   When `valueManWon = 9999.6`: `eok = 0`, `remainder = Math.round(9999.6) = 10000`. Returns `"10,000만 원"` instead of `"1억 원"`. When `valueManWon = 19999.6`: returns `"1억 10,000만 원"` instead of `"2억 원"`.

4. **Fit Matching Floor Clamping (`AptFitFinder.tsx:526`)**:
   ```typescript
   const matchPercentage = Math.min(99, Math.max(50, Math.round((score / 145) * 100)));
   ```
   Clamps all raw match scores to a minimum floor of 50%, compressing low-match properties into 50%–60% match rates.

5. **Office XML Tag Parsing Fragility (`officeTx.service.ts:52, 64`)**:
   ```typescript
   const priceRaw = $item.find('거래금액').text().trim();
   const depositRaw = $item.find('보증금액').text().trim();
   const priceVal = parseInt(priceRaw.replace(/,/g, ''), 10) || 0;
   ```
   When XML tag is empty (`""`), whitespace, or invalid, `formatPrice` produces output containing `"NaN만원"` or `"보증금 NaN만"`.

6. **Audit Pipeline Omits Unit Tests (`scripts/audit-pipeline.js:377-428`)**:
   `audit-pipeline.js` executes `tsc --noEmit`, `eslint`, `auditDataConsistency`, `auditBundleSizes`, `test:e2e`, and `auditFirestoreCosts`. It **does not execute** Jest unit tests (`npm test` / `npx jest`).

---

## 2. Logic Chain

1. **From Observation 1 & 2 to Conclusion 1**:
   In `PropertyTaxCalculator.tsx`, `localEducationTaxRate` and `ruralSpecialTaxRate` use static proportional formulas (`acqTaxRate * 0.1` and `exclusiveArea === '85over' ? 0.2 : 0`). Under Korean Local Tax Law Articles 151 and 152, heavy taxation (8% and 12% for 3+ homes) modifies the tax bases for Local Education Tax (fixed at 0.4%) and Rural Special Tax (scaled to 0.6%/1.0% for >85m² and 0.2%/0.4% for <=85m²). Therefore, the calculator produces incorrect tax totals for multi-home buyers.

2. **From Observation 3 to Conclusion 2**:
   Both `formatKoreanPrice` in `RelocationTaxSimulator.tsx` and `formatEokMan` in `PropertyTaxCalculator.tsx` execute `Math.floor` and `Math.round` independently. When floating point arithmetic produces a remainder between `9999.5` and `9999.999`, `Math.round(valueManWon % 10000)` yields `10000` while `eok` remains unchanged. This produces invalid strings such as `"10,000만 원"`.

3. **From Observation 4 to Conclusion 3**:
   In `AptFitFinder.tsx`, `Math.max(50, ...)` forces all match percentages to be at least 50%. A property with a raw score of 20/145 (13.8%) is displayed to the user as a 50% match, masking low compatibility.

4. **From Observation 5 to Conclusion 4**:
   In `officeTx.service.ts`, `formatPrice` receives string primitives directly from Cheerio XML queries without validating that `priceRaw` or `depositRaw` are valid digits. When parsing fails, `parseInt` returns `NaN`, which is stringified into the final UI output.

5. **From Observation 6 to Conclusion 5**:
   `audit-pipeline.js` does not invoke `npm test`. Because unit tests are omitted from `npm run audit`, any regressions in tax math, scoring algorithms, XML parsing, or Zod schemas pass automated audit verification silently.

---

## 3. Caveats

* **Local Tax Ordinance Variations**: Hwaseong City / Gyeonggi Province local tax ordinances for Dongtan Techno-Valley migration (지방세특례제한법 Article 58-2) may have periodic legislative revisions (e.g. extension of reduction expiration dates). The simulator currently hardcodes a 35% reduction rate.
* **Serverless Redis Instance Isolation**: In serverless production environments (Vercel/Lambda), `ResilientRedisWrapper`'s `MemoryCacheFallback` is container-scoped. If Upstash Redis experiences transient connection latency (>1.5s), container memory cache fallbacks can diverge between concurrent requests.

---

## 4. Conclusion

The analysis identified critical defects in tax calculation logic (Local Education Tax & Rural Special Tax heavy rate miscalculations), currency formatting rounding bugs (`"10,000만 원"`), fit matching score compression (50% floor clamp), fragile XML tag parsing (`NaN` formatting), and a major gap in the automated audit pipeline (`audit-pipeline.js` omits `npm test`).

### Required Fixes Summary:
1. **Fix `PropertyTaxCalculator.tsx` Tax Math**:
   - For `ownedHouses >= 3`: set Local Education Tax rate to a fixed **0.4%**.
   - Adjust Rural Special Tax rates for 8% and 12% heavy tax categories according to exclusive area (>85m² vs <=85m²).
2. **Fix Price Formatting Functions**:
   - Refactor `formatKoreanPrice` and `formatEokMan` to round total `valueManWon` to nearest integer before computing `eok` (`Math.floor(rounded / 10000)`) and `remainder` (`rounded % 10000`).
3. **Refactor Fit Score Clamping**:
   - Remove `Math.max(50, ...)` or lower minimum bound in `AptFitFinder.tsx` to preserve score distribution across 0%–100%.
4. **Harden XML Parser in `officeTx.service.ts`**:
   - Add input validation and default zero fallbacks before calling `parseInt` or formatting price strings.
5. **Integrate Unit Testing into `audit-pipeline.js`**:
   - Add a step to `audit-pipeline.js` that runs `npm test` (`npx jest`) to enforce regression testing for tax math, scoring algorithms, XML parsers, and Zod schemas.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Tax Math Heavy Rate Defect**:
   - Inspect `frontend/src/components/consumer/PropertyTaxCalculator.tsx` lines 313–318.
   - Run tests or evaluate `acqTaxRate = 8`, `ownedHouses = 3`. Note `localEducationTaxRate = 0.8%` instead of `0.4%`.

2. **Verify Currency Formatting Bug**:
   - In browser console or Node.js, run:
     ```javascript
     const formatEokMan = (manWon) => {
       const eok = Math.floor(manWon / 10000);
       const man = Math.round(manWon % 10000);
       if (eok > 0) return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
       return `${man.toLocaleString()}만원`;
     };
     console.log(formatEokMan(9999.6)); // Output: "10,000만원"
     ```

3. **Verify Audit Pipeline Gap**:
   - View `frontend/scripts/audit-pipeline.js` lines 377–428 (`run()` function). Observe that `jest` or `npm test` is never called.

4. **Run Project Test Suite**:
   - Execute `npm test` in `frontend/` to run all existing Jest unit tests.
