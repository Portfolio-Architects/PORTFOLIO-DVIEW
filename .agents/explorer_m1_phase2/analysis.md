# Comprehensive Technical Analysis: Tax Formulas, Matching Algorithms, Data Pipeline & Audit Suite

**Project**: D-VIEW (Portfolio-Architects/PORTFOLIO-DTDLS)  
**Module**: `frontend/src/` & `frontend/scripts/`  
**Date**: 2026-07-21  
**Investigator**: Explorer Subagent (`explorer_m1_phase2`)  

---

## 1. Executive Summary

This investigation analyzed three core subsystems of D-VIEW:
1. **R1: Tax Benefit & Business Matching Algorithms** (Relocation tax simulator, acquisition/property tax calculator, apartment fit finder, scoring engine).
2. **R2: Data Pipeline & Schema Integrity** (Zod validation schemas, Google Sheets parser, Ministry of Land XML transaction parser, Upstash Redis L2 cache, SWR caching, DashboardFacade).
3. **R3: Automated Audit Suite** (`audit-pipeline.js`, existing Jest unit test coverage).

### Major Findings & Key Risks:
* **Tax Calculation Defect (High Risk)**: `PropertyTaxCalculator.tsx` incorrectly calculates Local Education Tax (`지방교육세`) for multi-house buyers (3-house and 4+ house heavy tax rates) by applying `acqTaxRate * 0.1` (0.8% and 1.2%) instead of the legally fixed **0.4%** under Korean Local Tax Law Article 151. It also miscalculates Rural Special Tax (`농어촌특별세`) for heavy tax rates by ignoring heavy tax multipliers.
* **Currency Formatting Rounding Drift Bug (Medium Risk)**: In `RelocationTaxSimulator.tsx` (`formatKoreanPrice`) and `PropertyTaxCalculator.tsx` (`formatEokMan`), rounding floating point values near 10,000 (e.g. `9999.6만 원`) causes `remainder` to round to `10000` while `eok` remains unincremented, rendering corrupted strings like `"10,000만 원"` or `"1억 10,000만 원"`.
* **Fit Matching Floor Clamping (Medium Risk)**: `AptFitFinder.tsx` clamps all match percentages to a minimum of 50%, compressing low-match properties artificially into 50%~60% match rates and disguising low compatibility.
* **Audit Pipeline Testing Bypass (Critical Risk)**: `scripts/audit-pipeline.js` (`npm run audit`) completely omits Jest unit test execution (`npm test`). Tax formula bugs, scoring errors, and XML parser failures pass CI/CD and audit checks without warning.

---

## 2. R1: Tax Benefit & Business Matching Algorithms Analysis

### 2.1 Relocation Tax Simulator (`RelocationTaxSimulator.tsx`)

#### 1. Corporate Tax Reduction Simulation Formula (조세특례제한법 Article 63)
* **Code Location**: Lines 26–29
* **Implementation**:
  ```typescript
  const corpTaxSavings = useMemo(() => {
    if (existingLocation !== 'overconcentrated') return 0;
    return annualCorpTax * 5; // (annualCorpTax * 4 * 100%) + (annualCorpTax * 2 * 50%) = annualCorpTax * 5
  }, [existingLocation, annualCorpTax]);
  ```
* **Issues & Analysis**:
  * **Scope Assumptions**: Assumes a flat 5x multiplier (4 years 100% + 2 years 50% = 500% cumulative) for any company relocating from an overconcentrated growth management area (`existingLocation === 'overconcentrated'`).
  * **Unchecked Legal Conditions**: Does not check whether the corporation has continuously operated in the overconcentrated area for at least 2 or 3 years prior to relocation, whether the business line is eligible (manufacturing/IT vs ineligible retail/entertainment), or whether maximum statutory tax deduction caps apply.

#### 2. Acquisition Tax Reduction Formula (지방세특례제한법 Article 58-2)
* **Code Location**: Lines 32–36
* **Implementation**:
  ```typescript
  const standardAcqTaxRate = 0.046; // 4.6%
  const standardAcqTax = purchasePrice * standardAcqTaxRate;
  return Math.round(standardAcqTax * 0.35); // 35% 감면액
  ```
* **Issues & Analysis**:
  * **Fixed Rate Assumption**: Assumes standard acquisition tax rate is fixed at 4.6% (4.0% acquisition + 0.4% local education + 0.2% rural special tax) and reduction is fixed at 35% for initial buyers of Knowledge Industry Center (`지식산업센터`).
  * **Floating Point Drift**: `purchasePrice * 0.046` suffers from standard JS double-precision floating point drift (e.g. `60000 * 0.046 = 2760.0000000000005`). `Math.round(standardAcqTax * 0.35)` masks the drift at integer level, but intermediate variables retain drift.

#### 3. Korean Price Formatting Rounding Bug (`formatKoreanPrice`)
* **Code Location**: Lines 49–57
* **Implementation**:
  ```typescript
  const formatKoreanPrice = (valueManWon: number) => {
    if (valueManWon === 0) return '0원';
    const eok = Math.floor(valueManWon / 10000);
    const remainder = Math.round(valueManWon % 10000);
    
    if (eok === 0) return `${remainder.toLocaleString()}만 원`;
    if (remainder === 0) return `${eok}억 원`;
    return `${eok}억 ${remainder.toLocaleString()}만 원`;
  };
  ```
* **Bug Demonstration**:
  * If `valueManWon = 9999.6`: `eok = Math.floor(0.99996) = 0`, `remainder = Math.round(9999.6) = 10000`. Output is `"10,000만 원"` instead of `"1억 원"`.
  * If `valueManWon = 19999.6`: `eok = 1`, `remainder = 10000`. Output is `"1억 10,000만 원"` instead of `"2억 원"`.
  * **Root Cause**: `Math.floor` and `Math.round` are calculated independently on fractional inputs without propagating remainder overflow to `eok`.

---

### 2.2 Property Tax & Acquisition Tax Calculator (`PropertyTaxCalculator.tsx`)

#### 1. Acquisition & Local Education Tax Formula Error
* **Code Location**: Lines 290–316
* **Implementation**:
  ```typescript
  if (ownedHouses === 1 || ownedHouses === 2) {
    if (priceEok <= 6) acqTaxRate = 1;
    else if (priceEok <= 9) acqTaxRate = priceEok * (2 / 3) - 3;
    else acqTaxRate = 3;
  } else if (ownedHouses === 3) {
    acqTaxRate = 8;
  } else {
    acqTaxRate = 12;
  }
  acqTaxRate = Math.round(acqTaxRate * 100) / 100;
  const acquisitionTax = Math.round(acquisitionPrice * (acqTaxRate / 100));

  // 지방교육세 = 취득세율의 10%
  const localEducationTaxRate = acqTaxRate * 0.1;
  const localEducationTax = Math.round(acquisitionPrice * (localEducationTaxRate / 100));
  ```
* **CRITICAL TAX LAW DEFECT**:
  * For 1 and 2 houses in non-adjusted area (Dongtan), standard tax rates are 1% ~ 3%, and Local Education Tax is indeed 10% of `acqTaxRate` (0.1% ~ 0.3%).
  * For **3 houses** (`acqTaxRate` = 8%) and **4+ houses** (`acqTaxRate` = 12%), the code calculates `localEducationTaxRate` as `8% * 0.1 = 0.8%` and `12% * 0.1 = 1.2%`.
  * Under **Korean Local Tax Law (지방세법 Article 151)**, heavy acquisition tax rates (8% and 12%) for residential property set the Local Education Tax base to 20% of the standard 2% rate base, resulting in a **FIXED 0.4% Local Education Tax Rate**.
  * **Impact**: The calculator overcharges Local Education Tax by **2x** (0.8% instead of 0.4% for 3-house buyers) and **3x** (1.2% instead of 0.4% for 4-house buyers), leading to incorrect tax simulation results.

#### 2. Rural Special Tax Formula Defect
* **Code Location**: Line 318
* **Implementation**:
  ```typescript
  const ruralSpecialTaxRate = exclusiveArea === '85over' ? 0.2 : 0;
  ```
* **CRITICAL TAX LAW DEFECT**:
  * Under Korean Local Tax Law, when heavy acquisition taxation applies (8% or 12%):
    * For exclusive area > 85m²: Rural Special Tax rate is **0.6%** (for 8% heavy rate) and **1.0%** (for 12% heavy rate), NOT 0.2%.
    * For exclusive area <= 85m²: Rural Special Tax is **0.2%** (for 8% heavy rate) and **0.4%** (for 12% heavy rate), NOT 0%.
  * **Impact**: The calculator significantly underestimates Rural Special Tax for buyers purchasing 3 or more houses.

#### 3. Korean Price Formatting Rounding Bug (`formatEokMan`)
* **Code Location**: Lines 388–395
* **Implementation**: Same dual `Math.floor` / `Math.round` issue as `RelocationTaxSimulator.tsx`, causing `"10,000만원"` or `"1억 10,000만원"` output for boundary numbers.

---

### 2.3 Apt Fit Finder & Scoring Algorithm (`AptFitFinder.tsx` & `scoring.ts`)

#### 1. Weight Normalization & Minimum Score Clamping
* **Code Location**: `AptFitFinder.tsx` Line 526
* **Implementation**:
  ```typescript
  const matchPercentage = Math.min(99, Math.max(50, Math.round((score / 145) * 100)));
  ```
* **Analysis**:
  * Maximum possible raw score is `145` (35 baseline + 110 max section weights).
  * Low raw scores (e.g. 20/145 = 13.8%) are artificially clamped upward to `50%`.
  * **Effect**: Poorly matching apartments receive an inflated score of 50%, compressing score distinction between good and bad matches.

#### 2. Scoring Metric Interpolation & Fallback Integrity (`scoring.ts`)
* **Code Location**: `scoring.ts` Lines 196–230 (`interpolateScore`) & Lines 347–370 (`yearBuilt` age U-curve)
* **Analysis**:
  * `interpolateScore` handles empty or zero denominator gracefully (`if (denominator === 0) return p1.pct;`).
  * `calculatePremiumScores` validates metrics via `ScoringMetricsSchema.safeParse`. If parsing fails, `getSafeMetrics` cleans inputs safely to prevent `NaN` or `undefined` runtime errors.

---

## 3. R2: Data Pipeline & Schema Integrity Analysis

### 3.1 Zod Validation Schemas (`facade.schemas.ts`)

#### 1. Missing Input Validation Schemas
* `RelocationTaxSimulator`: Lacks Zod schema for input parameters (`annualCorpTax`, `purchasePrice`, `annualPropTax`, `existingLocation`).
* `PropertyTaxCalculator`: Lacks Zod schema for calculator inputs (`acquisitionPrice`, `ownedHouses`, `exclusiveArea`).
* `AptFitFinder`: `QuizAnswerSchema` exists, but does not enforce enum constraints for options (e.g., `budget: z.enum(['3eok', '5eok', '8eok', '12eok', 'unlimited'])`).

#### 2. Overly Permissive Schemas & Type Weakening
* `FieldReportDataSchema`: Uses `z.unknown().optional()` for `premiumScores`, `metrics`, and `images`, disabling structural validation for core report data.
* `InitialPageDataSchema`: Marks `sheetApartments`, `txSummary`, `kpis`, `macroTrend` as `.optional()`. Components relying on `InitialPageData` can crash if data payload omitted by backend.

---

### 3.2 Google Sheets SSOT Parser (`googleSheets.ts`)

* **Implementation**: `fetchSheetApartmentsByDong` reads `SHEET_TABS.APARTMENTS`. Each row is validated against `SheetApartmentSchema`. Invalid rows are skipped (`logger.warn`).
* **Fallback Behavior**: If network fetch fails, parser falls back to static JSON `apartmentsByDongStatic`.
* **Risk**: Static JSON files in `public/data/` may become stale compared to live Google Sheets updates, leading to data desynchronization if network request fails silently.

---

### 3.3 Public XML Transaction Parser (`officeTx.service.ts` & `fetch-transactions.js`)

#### 1. Office XML Parsing Fragility (`officeTx.service.ts`)
* **Code Location**: Lines 42–79 (`parseOfficeXml`) & Lines 20–37 (`formatPrice`)
* **Analysis**:
  * Tag extraction uses cheerio text parsing: `$item.find('거래금액').text().trim()`.
  * `formatPrice` calls `parseInt(priceRaw.replace(/,/g, ''), 10)`.
  * **Failure Cases**: If XML tag is missing, contains non-numeric strings, or has unexpected whitespace/newlines, `parseInt` returns `NaN`. `formatPrice` then renders string outputs containing `"NaN만원"` or `"보증금 NaN만"`.
  * Date construction (`${year}-${month}-${day}`) produces malformed strings like `"2026--"` if `<월>` or `<일>` tags are missing.

#### 2. Transaction Sync Script Validation (`fetch-transactions.js`)
* **Analysis**: `fetch-transactions.js` validates transactions using `AptTransactionRecordSchema.safeParse`. Invalid records are skipped via `console.warn`. No dead-letter logging or administrative alert is dispatched.

---

### 3.4 Upstash Redis L2 Cache & SWR Caching Layer (`redis.ts` & `SWRProvider.tsx`)

#### 1. Upstash Redis Fallback Desync Risk (`redis.ts`)
* **Code Location**: Lines 103–256 (`ResilientRedisWrapper`)
* **Analysis**:
  * Wraps Redis calls with `REDIS_TIMEOUT_MS = 1500`. On timeout or error, it falls back to `MemoryCacheFallback` (an in-memory `Map`).
  * **Desync Risk**: In Next.js serverless runtimes (Vercel / AWS Lambda), in-memory fallback cache is isolated per lambda instance and lost on container recycles. Concurrent API requests served by different lambda instances see inconsistent cached states.

#### 2. SWR LocalStorage Cache Version Purge (`SWRProvider.tsx`)
* **Code Location**: Lines 59–120 (`getCache`) & Lines 125–172 (`syncToLocalStorage`)
* **Analysis**:
  * LocalStorage cache stores entries under key `app-swr-cache` with version key `app-swr-version`.
  * `getCache` purges entries whose `v=` query param does not match `BUILD_VERSION`.
  * **Race Condition Risk**: When a new version is deployed (`BUILD_VERSION` updated), any client tab open during deployment will serialize its old in-memory cache to `localStorage` on `pagehide`, overwriting fresh cache data.

---

## 4. R3: Automated Audit Suite Analysis

### 4.1 Audit Pipeline Script (`scripts/audit-pipeline.js`)

* **Execution Commands**: `npm run audit` runs `node scripts/audit-pipeline.js`.
* **Pipeline Audit Steps**:
  1. `auditTypeScript()`: Runs `npx tsc --noEmit`.
  2. `auditESLint()`: Runs `npx eslint . --max-warnings=10`.
  3. `auditDataConsistency()`: Verifies `public/tx-data/_index.json` and transaction files.
  4. `auditBundleSizes()`: Checks `public/tx-data/*.json` file sizes (<3MB).
  5. `auditE2ETests()`: Runs `npm run test:e2e` (Playwright).
  6. `auditFirestoreCosts()`: Queries `daily_stats` and estimates Firestore read costs.

#### CRITICAL AUDIT PIPELINE GAP:
* `audit-pipeline.js` **DOES NOT RUN Jest unit tests** (`npm test` / `npx jest`).
* Unit tests for tax formulas, scoring algorithms, XML parsers, and Zod schemas are completely excluded from the automated audit process!

---

### 4.2 Unit Test Coverage Gap Analysis

| Subsystem / Module | Test File Location | Coverage Status | Missing Test Scenarios |
| :--- | :--- | :--- | :--- |
| **Relocation Tax Simulator** | None | **0%** | No unit tests exist for corporate, acquisition, or property tax reduction formulas. |
| **Property Tax Calculator** | `src/components/consumer/PropertyTaxCalculator.test.tsx` | Partial (UI only) | Lacks tests for 3-house and 4-house heavy acquisition tax rates, Local Education Tax cap (0.4%), Rural Special Tax, and `formatEokMan` boundary rounding. |
| **Apt Fit Finder & Scoring** | `src/lib/utils/scoring.test.ts` | Good | Tests `getBrandMultiplier`, `calculatePremiumScores`, and `calculateInfraScore`. Lacks tests for `AptFitFinder.tsx` fit percentage floor clamping. |
| **Office Transaction XML Service** | None | **0%** | No unit tests for `parseOfficeXml`, missing XML tags, empty numeric strings, or `NaN` price formatting. |
| **Zod Facade Schemas** | None | **0%** | No unit tests verifying `ObjectiveMetricsSchema`, `AptTxSummarySchema`, or `FieldReportDataSchema`. |

---

## 5. Summary Matrix of Identified Deficiencies

| ID | Category | Affected File | Description | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **DEF-01** | R1 (Tax Math) | `PropertyTaxCalculator.tsx` | Local Education Tax rate for 3-house (8%) and 4-house (12%) heavy tax is calculated as `acqTaxRate * 0.1` (0.8% and 1.2%) instead of fixed **0.4%** under Local Tax Law Art. 151. | Overcharges Local Education Tax by 2x to 3x on heavy tax simulations. |
| **DEF-02** | R1 (Tax Math) | `PropertyTaxCalculator.tsx` | Rural Special Tax rate under heavy tax (8%/12%) is hardcoded to `0.2%` for >85m² and `0%` for <=85m² instead of 0.6%/1.0% (>85m²) and 0.2%/0.4% (<=85m²). | Underestimates Rural Special Tax for multi-house buyers. |
| **DEF-03** | R1 (Formatting) | `RelocationTaxSimulator.tsx` & `PropertyTaxCalculator.tsx` | Dual `Math.floor` / `Math.round` in price formatting (`formatKoreanPrice` & `formatEokMan`) fails when remainder rounds to 10,000 (e.g. `9999.6만 원`), outputting `"10,000만 원"`. | Corrupted UI text string rendering. |
| **DEF-04** | R1 (Matching) | `AptFitFinder.tsx` | Match percentage formula clamps lowest scores to `50%` (`Math.max(50, ...)`). | Artificially inflates compatibility score for low-matching apartments. |
| **DEF-05** | R2 (Schema) | `facade.schemas.ts` | Missing Zod validation schemas for tax calculator inputs; `FieldReportDataSchema` uses `z.unknown()` for core report data. | Bypasses structural validation on report payloads and calculator inputs. |
| **DEF-06** | R2 (Parsing) | `officeTx.service.ts` | XML tag parsing uses `parseInt` directly on raw string content. Empty/missing tags produce `NaN` values formatted as `"NaN만원"`. | Invalid text output on missing or malformed public XML data. |
| **DEF-07** | R2 (Cache) | `redis.ts` | Redis fallback uses in-memory `Map`, which is non-persistent and instance-isolated across Next.js serverless lambda functions. | Potential cache desynchronization across concurrent client requests. |
| **DEF-08** | R3 (Audit) | `scripts/audit-pipeline.js` | Automated audit script (`npm run audit`) omits Jest unit test execution (`npm test`). | Math bugs, schema failures, and parser errors bypass continuous diagnostics unnoticed. |
