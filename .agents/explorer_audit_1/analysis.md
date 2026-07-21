# D-VIEW Web Application Data Integrity & Audit Report

**Date**: 2026-07-21  
**Target Module**: D-VIEW Frontend Data Layer, Tax Calculators, Matching Algorithms, Parsers, Schemas, Caching, and Test Suite (`frontend/`)  
**Auditor**: Explorer Subagent (`explorer_audit_1`)

---

## 1. Executive Summary

This report delivers an exhaustive data integrity and technical audit of the **D-VIEW** platform (`frontend/`). The investigation covered:
- **Tax Reduction & Capital Gains Calculators**: `RelocationTaxSimulator.tsx`, `PropertyTaxCalculator.tsx`, `SellTimingCalculator.tsx`, `sellTimingEngine.ts`, `valuationEngine.ts`.
- **Matching & Scoring Systems**: `AptFitFinder.tsx`, `CoLeasingBoard.tsx`, `scoring.ts`, `app/actions/scoring.ts`.
- **Data Mapping, Parsers & Zod Schemas**: `googleSheets.ts`, `facade.schemas.ts`, `sync-transactions.js`, `officeTx.service.ts`, `redis.ts`, `SWRProvider.tsx`.
- **Automated Test Suite & Build Pipeline**: Jest unit test suite, `npm run build`, `npm run audit` (`scripts/audit-pipeline.js`).

### Key Audit Discoveries & Severity Matrix

| Category | Component | Issue Summary | Severity |
| :--- | :--- | :--- | :--- |
| **Tax Simulation** | `PropertyTaxCalculator.tsx` | **Rural Special Tax Escalation Missing Bug**: Hardcodes Rural Special Tax at 0.2% for >85m² even when `ownedHouses` is 3 (8% acq tax) or 4 (12% acq tax). Ignores statutory heavy tax escalation to 0.6% and 1.0% under Rural Development Special Tax Act. Undercounts tax by up to 0.8% of purchase price (e.g. 8,000,000 KRW undercount on a 10억 property). | **CRITICAL** |
| **Tax Simulation** | `PropertyTaxCalculator.tsx` | **Premature Tax Rate Rounding Drift**: `acqTaxRate = Math.round(acqTaxRate * 100) / 100` prematurely rounds 6~9억 tax rates before multiplying purchase price, causing ~23,333 KRW rounding drift on 7억 purchase. | **MEDIUM** |
| **Tax Simulation** | `RelocationTaxSimulator.tsx` | **Statutory Exclusion of Minimum Tax & Special Rural Tax**: Calculates corporate tax savings as `annualCorpTax * 5` for 6-year relocation without applying Minimum Tax (최저한세, SME rate 7%) or Special Tax for Rural Development (농어촌특별세 20% surcharge on tax exempted portion). | **HIGH** |
| **Tax Simulation** | Multiple Engines | **Missing Statutory 10 KRW Truncation**: Perform intermediate rounding (`Math.round`) in `만원` units instead of maintaining exact KRW precision until final 10 KRW truncation (`Math.floor(val / 10) * 10`) under Local Tax Act Art. 47. | **MEDIUM** |
| **Matching Algorithm** | `AptFitFinder.tsx` | **Artificial Compatibility Floor/Ceiling Clamping**: Clamps match score to `Math.max(50, ...)` and `Math.min(99, ...)`. An apartment matching 0 user criteria displays a misleading 50% compatibility score. | **HIGH** |
| **Matching Algorithm** | `AptFitFinder.tsx` | **Hard Price Filter Null Exclusion Crash**: `if (salesPrice <= 0) return null;` excludes apartments lacking 3-month average price data from recommendations, ignoring fallback price estimators. | **HIGH** |
| **Roommate Matching** | `CoLeasingBoard.tsx` | **Mock Data Isolation & Non-Persistent State**: Share-Office / roommate co-leasing board operates purely on static in-memory array (`INITIAL_POSTS`). Form submissions trigger browser `alert()` and disappear on page refresh. Zero backend Firestore/Redis integration or matching scoring. | **HIGH** |
| **Zod Schemas** | `facade.schemas.ts` | **Parser Validation Coverage Gap**: Missing formal Zod validation schemas for Hwaseong enterprise datasets (`nps_stats.json`, `yeongcheon_jisan_units.json`) and raw MOLIT XML API responses. | **MEDIUM** |
| **Test Suite** | Unit & E2E Tests | **Missing Test Coverage**: Co-Leasing board, Hwaseong enterprise data parsing, and multi-house heavy tax escalation rules have 0 unit test coverage. | **MEDIUM** |

---

## 2. Tax Reduction Simulation Formulas Audit

### 2.1 Techno-Valley Relocation Tax Simulator (`RelocationTaxSimulator.tsx`)

**File Location**: `frontend/src/components/macro/RelocationTaxSimulator.tsx` (Lines 24-47)

```ts
// 법인세 감면: 수도권 과밀억제권역에서 이전 시 4년간 100%, 이후 2년간 50% 감면
const corpTaxSavings = useMemo(() => {
  if (existingLocation !== 'overconcentrated') return 0;
  return annualCorpTax * 5; // (annualCorpTax * 4 * 100%) + (annualCorpTax * 2 * 50%) = annualCorpTax * 5
}, [existingLocation, annualCorpTax]);

// 취득세 감면: 지식산업센터 최초 분양 취득 시 취득세(기본 4.6%)의 35% 감면 (지방세특례제한법 제58조의2)
const acquisitionTaxSavings = useMemo(() => {
  const standardAcqTaxRate = 0.046; // 4.6%
  const standardAcqTax = purchasePrice * standardAcqTaxRate;
  return Math.round(standardAcqTax * 0.35); // 35% 감면액
}, [purchasePrice]);

// 재산세 감면: 지식산업센터 취득 후 직접 사용 시 재산세의 35%를 5년간 감면
const propTaxSavings = useMemo(() => {
  return Math.round(annualPropTax * 0.35 * 5); // 35% * 5개년
}, [annualPropTax]);
```

#### Detailed Findings & Statutory Ordinance Evaluation:
1. **Corporate Tax Reduction (조세특례제한법 제63조 - 수도권 밖으로 이전하는 법인에 대한 세액감면)**:
   - **Formula**: Assumes 4 years 100% + 2 years 50% = 5.0 multiplier of annual corporate tax.
   - **Flaw**: Fails to incorporate **최저한세 (Minimum Tax Rate - 조세특례제한법 제132조)**. Small & Medium Enterprises (SMEs) must pay a minimum corporate tax rate of **7%** (or 10~17% for larger corporations). Therefore, a "100% tax reduction" yields a maximum effective tax reduction of **93%**, not 100%.
   - **Flaw**: Ignores **농어촌특별세 (Special Tax for Rural Development Act)**, which levies a **20% surcharge** on the corporate tax amount exempted under Restriction of Special Taxation Act.
   - **Impact**: Overstates projected 6-year corporate tax savings by approximately 15% to 27%.

2. **Acquisition Tax & Property Tax Exemption (지방세특례제한법 제58조의2 - 지식산업센터 등에 대한 감면)**:
   - **Acquisition Tax Rate**: Standard 4.6% (Acquisition Tax 4.0% + Local Education Tax 0.4% + Special Rural Tax 0.2%). Under Local Tax Exemption Act Art. 58-2, initial purchasers using the unit directly receive a 35% reduction on local tax (Acquisition + Local Education Tax).
   - **Precision & Unit Error**: Calculations operate in `만원` (10,000 KRW) units. `Math.round(standardAcqTax * 0.35)` rounds to the nearest 10,000 KRW. Under **지방세기본법 제61조 (원단위 절사)** and **국세기본법 제47조**, tax calculations require **10 KRW truncation (`Math.floor(value / 10) * 10`)**. Rounding in `만원` units produces rounding errors up to ±5,000 KRW per calculation.

---

### 2.2 Property & Acquisition Tax Calculator (`PropertyTaxCalculator.tsx`)

**File Location**: `frontend/src/components/consumer/PropertyTaxCalculator.tsx` (Lines 290-360)

```ts
// 1. Acquisition Tax Rate (취득세율)
let acqTaxRate = 1;
if (ownedHouses === 1 || ownedHouses === 2) {
  if (priceEok <= 6) {
    acqTaxRate = 1;
  } else if (priceEok <= 9) {
    acqTaxRate = priceEok * (2 / 3) - 3;
  } else {
    acqTaxRate = 3;
  }
} else if (ownedHouses === 3) {
  acqTaxRate = 8;
} else {
  acqTaxRate = 12;
}

// Round tax rate to 2 decimal places
acqTaxRate = Math.round(acqTaxRate * 100) / 100;

// 2. Taxes in Man-won
const acquisitionTax = Math.round(acquisitionPrice * (acqTaxRate / 100));

// 지방교육세 = 취득세율의 10%
const localEducationTaxRate = acqTaxRate * 0.1;
const localEducationTax = Math.round(acquisitionPrice * (localEducationTaxRate / 100));

// 농어촌특별세 = 85m2 초과 시 0.2%, 이하 시 0%
const ruralSpecialTaxRate = exclusiveArea === '85over' ? 0.2 : 0;
const ruralSpecialTax = Math.round(acquisitionPrice * (ruralSpecialTaxRate / 100));
```

#### Detailed Findings & Severe Calculation Bugs:
1. **CRITICAL BUG - Rural Special Tax (농어촌특별세) Heavy Escalation Undercount**:
   - **Current Implementation**: Line 318 hardcodes `ruralSpecialTaxRate = exclusiveArea === '85over' ? 0.2 : 0;` regardless of `ownedHouses`.
   - **Statutory Ordinance (농어촌특별세법 제5조 제1항 및 지방세법 제13조.5)**:
     - When acquisition tax is escalated due to multi-house ownership (3-house = 8%, 4-house = 12%), **Rural Special Tax is also escalated**:
       - 1~2 House (Standard 1~3% acq tax): Rural Special Tax = 0.2% for >85m² (0% for ≤85m²).
       - 3 House (Escalated 8% acq tax): Rural Special Tax = **0.6%** for >85m² (0.4% for ≤85m²).
       - 4+ House (Escalated 12% acq tax): Rural Special Tax = **1.0%** for >85m² (0.6% for ≤85m²).
   - **Financial Impact**: For a 4-house owner purchasing a 10억 (>85m²) apartment:
     - Implemented tax: `100,000만원 * 0.2% = 200만원`.
     - Actual statutory tax: `100,000만원 * 1.0% = 1,000만원`.
     - **Discrepancy: 8,000,000 KRW UNDERCOUNT (800만원 오차)**.

2. **Premature Rate Rounding Drift**:
   - Line 308 rounds `acqTaxRate` to 2 decimal places before computing tax amounts.
   - For a 7억원 property (`priceEok = 7`): `7 * (2/3) - 3 = 1.666666...%`.
   - `Math.round(1.666666... * 100) / 100 = 1.67%`.
   - Implemented tax: `70,000만원 * 1.67% = 1,169만원`.
   - Exact statutory tax: `70,000만원 * 1.6666667% = 1,166.6667만원` -> `1,166.6666만원`.
   - **Rounding Drift**: **23,333 KRW deviation** on a 7억 transaction.

---

### 2.3 Capital Gains Tax Engine (`sellTimingEngine.ts`)

**File Location**: `frontend/src/lib/utils/sellTimingEngine.ts` (Lines 171-309)

```ts
// 1세대 1주택 12억 초과 고가주택 안분 계산
taxableProfit = Math.round(transferProfit * ((transferPrice - 120000) / transferPrice));

// 장기보유특별공제
const janggiGongje = Math.round(taxableProfit * (janggiRate / 100));

// 산출세액
computedTax = Math.round((taxableBase * (taxRate / 100)) - nujinGongje);

// 지방소득세
const localTax = Math.round(computedTax * 0.1);
```

#### Detailed Findings:
1. **Income Tax Act Alignment (소득세법 제95조 제2항 및 제160조)**:
   - High-priced 1-house (>12억) allocation formula: `transferProfit * (transferPrice - 12억) / transferPrice`. Implemented correctly.
   - Long-term holding deduction (장기보유특별공제): Correctly implements 1-house 80% maximum (4% holding + 4% residence per year for ≥2yr residence) and 30% general maximum.
2. **Intermediate Rounding Cumulative Errors**:
   - Performs `Math.round()` in `만원` units at four sequential intermediate steps (`taxableProfit`, `janggiGongje`, `computedTax`, `localTax`).
   - Intermediate rounding in `만원` units degrades precision. All intermediate steps should maintain floating point or exact integer WON precision until final 10 KRW truncation.

---

## 3. FitFinder & Share-Office Roommate Matching Scoring Audit

### 3.1 Apt FitFinder Matching Scoring Logic (`AptFitFinder.tsx` & `scoring.ts`)

**File Locations**: `frontend/src/components/consumer/AptFitFinder.tsx` & `frontend/src/lib/utils/scoring.ts`

```ts
// AptFitFinder.tsx Lines 393-526
let score = 35; // baseline

// 1. Budget Question Matching (Total: 25pts)
// 2. Family Question Matching (Total: 20pts)
// 3. Transit Question Matching (Total: 20pts)
// 4. Lifestyle Question Matching (Total: 15pts)
// 5. Scale & Brand Preference (Total: 10pts)
// 6. Year Built Preference (Total: 10pts)
// 7. Investment Style Preference (Total: 10pts)

// Max absolute score is 145 (35 baseline + 110 from matched weights). Normalize to percentage.
const matchPercentage = Math.min(99, Math.max(50, Math.round((score / 145) * 100)));
```

#### Detailed Findings:
1. **Artificial Score Floor/Ceiling Clamping Bug**:
   - The normalization formula uses `Math.max(50, Math.min(99, Math.round((score / 145) * 100)))`.
   - **Consequence**: If an apartment matches **0 user criteria**, its raw score is `35`. `(35 / 145) * 100 = 24.13%`. However, due to `Math.max(50, ...)`, it is forced up to **50% match score**!
   - This creates an artificial match score inflation where completely incompatible apartments display a "50% 찰떡 매칭" badge to users.

2. **Hard Price Filter Exclusion Bug**:
   - Lines 386-391:
     ```ts
     if (salesPrice <= 0) return null; // Exclude apartments without price data
     ```
   - **Consequence**: If an apartment is newly completed or lacks 3-month transaction summary data (`salesPrice === 0`), it is immediately returned as `null` and removed from candidate recommendations, even when estimated dong price fallbacks exist (`getEstimatedMarketPrice`).

---

### 3.2 Share-Office Roommate Matching Board (`CoLeasingBoard.tsx`)

**File Location**: `frontend/src/components/macro/CoLeasingBoard.tsx` (Lines 86-390)

```ts
export default function CoLeasingBoard() {
  const [posts, setPosts] = useState<CoLeasePost[]>(INITIAL_POSTS);
  const [selectedBuilding, setSelectedBuilding] = useState<string>('전체 빌딩');
  const [maxRent, setMaxRent] = useState<number>(100);
```

#### Detailed Findings:
1. **Mock Data Isolation & Non-Persistent State**:
   - The Share-Office co-leasing board operates entirely on a static mock array (`INITIAL_POSTS`, 4 hardcoded posts).
   - Creating a post (`handleCreatePostSubmit`) or applying for a roommate share (`handleApplySubmit`) updates only local React state (`setPosts`) and displays a browser `alert()`.
   - **No Backend Integration**: There is zero Firestore database synchronization, zero Redis caching, and zero persistent storage. All user submissions disappear upon browser reload.
2. **Missing Matching Scoring Logic**:
   - Unlike `AptFitFinder.tsx` which uses multi-dimensional score weighting, `CoLeasingBoard` only offers simple text filtering by building name and maximum rent range (`post.rent <= maxRent`). There is no sector compatibility scoring or office roommate matching algorithm implemented.

---

## 4. Data Mapping, Parsers & Zod Validation Schemas Audit

### 4.1 Google Sheets SSOT Parser & Loader (`googleSheets.ts`)

**File Locations**: `frontend/src/lib/services/googleSheets.ts`, `frontend/src/lib/repositories/googleSheets.repository.ts`

- **Parsing Pipeline**: Parses Google Sheets CSV exports (`APARTMENTS`, `TYPE_MAP`, `RESTAURANTS`, `SBOYDS`).
- **Defensive Fallback**: Line 182 cross-references `FULL_DONG_DATA`. If an apartment exists in `FULL_DONG_DATA` but is missing from Google Sheets, it constructs a fallback `SheetApartment` record.
- **Zod Validation**: Validated via `SheetApartmentSchema` in `facade.schemas.ts`. Invalid rows are logged via `logger.warn` and filtered out without throwing unhandled exceptions.

---

### 4.2 MOLIT XML Transaction APIs Parser (`sync-transactions.js` & `officeTx.service.ts`)

**File Locations**: `frontend/scripts/sync-transactions.js`, `frontend/src/lib/services/officeTx.service.ts`

- **Validation**: `sync-transactions.js` uses `TransactionRecordSchema` (zod) to validate transaction records.
- **Outlier & Duplicate Removal**: Lines 416-464 deduplicate records based on composite key (`contractYm_day_price_deposit_rent_area_floor_dealType`) and rank records by richness score.
- **Pre-Completion Transaction Filtering**: Lines 300-305 automatically discard transactions logged with contract dates prior to the building's completion year (`contractYear < buildYear`).

---

### 4.3 Hwaseong Enterprise Data Parser (`sync-nps.js`, `nps_stats.json`, `yeongcheon_jisan_units.json`)

**File Locations**: `frontend/scripts/sync-nps.js`, `frontend/src/lib/data/nps_stats.json`, `frontend/src/lib/data/yeongcheon_jisan_units.json`

- **Coverage**: Contains National Pension Service (NPS) corporate statistics for Dongtan Techno-Valley enterprises (employee count, monthly payroll, growth rate).
- **Zod Schema Gap**: Unlike `SheetApartmentSchema` or `TransactionRecordSchema`, the NPS enterprise dataset relies on unchecked JSON imports without formal Zod validation schemas in `facade.schemas.ts`.

---

### 4.4 Upstash Redis L2 Caching & SWR Synchronization (`redis.ts` & `SWRProvider.tsx`)

**File Locations**: `frontend/src/lib/redis.ts`, `frontend/src/components/pwa/SWRProvider.tsx`

- **Multi-Tier Resilience**:
  1. **L1 Cache**: Server-side in-memory LRU cache (`serverLruCache`, 10s TTL).
  2. **L2 Cache**: Upstash Redis with 1.5s execution timeout wrapper (`withTimeout`).
  3. **Fallback Cache**: `MemoryCacheFallback` map if Upstash Redis credentials fail or time out.
- **SWR Cache Versioning**:
  - `SWRProvider.tsx` (lines 75-106) checks `BUILD_VERSION` query parameter against `localStorage.getItem('app-swr-version')`.
  - When a new deployment occurs, version mismatches trigger an automatic purge of stale local storage entries.

---

## 5. Automated Test Suite & Baseline Build Verification

### 5.1 Jest Unit Test Execution (`npm test`)

Ran `npm test` across the entire codebase (`frontend/`):
- **Test Suites**: **35 passed, 35 total**
- **Tests**: **240 passed, 240 total**
- **Execution Time**: 16.883 s
- **Pass Rate**: **100%**

```
PASS src/lib/utils/scoring.test.ts
PASS src/components/TimelineItemCardRender.test.tsx
PASS src/components/ui/ErrorBoundary.test.tsx
PASS src/components/pwa/SWRProvider.test.tsx
PASS src/components/apartment-modal/JeonseSafetyReport.test.tsx
PASS src/components/consumer/PropertyTaxCalculator.test.tsx
PASS src/components/consumer/MortgageCalculator.test.tsx
PASS src/components/consumer/AptCompareModal.test.tsx
...
Test Suites: 35 passed, 35 total
Tests:       240 passed, 240 total
```

---

### 5.2 Baseline Build (`npm run build`) & Audit Check (`npm run audit`)

- **Baseline Build (`npm run build`)**:
  - Successfully executed pre-build data sync (`sync-transactions.js`), service worker version update (`update-sw-version.js`), and Next.js Turbopack production compilation.
  - Successfully generated 148 apartment transaction summaries and 180 apartment JSON chunks in `public/tx-data/`.
  - Next.js production build output: **181 static pages generated in 11.0s** (`181/181`), with dynamic routes (`/lounge/[id]`, `/zone/[id]`, etc.) pre-rendered cleanly.
- **Audit Pipeline (`npm run audit` / `scripts/audit-pipeline.js`)**:
  - **TypeScript Compile Audit (`tsc --noEmit`)**: PASSED (0 compilation errors).
  - **ESLint Code Hygiene Audit**: PASSED.
  - **Data Consistency Audit**: PASSED (All 180 transaction JSON files verified).
  - **Asset Size Audit**: PASSED (All transaction JSON chunks within 3MB performance limit).
  - **Playwright E2E Integration Tests (`npm run test:e2e`)**: PASSED (16 passed, 1 flaky retried successfully).
  - **Firestore Cost Projection Audit**: PASSED (Average daily visits: 5.43, projected monthly reads cost: ₩4 / $0.003 USD, well within ₩5,000 budget limit).
  - **Pipeline Overall Status**: **SUCCESS** (`audit-results.json` generated).

---

### 5.3 Test Coverage Gaps

Despite 240 passing unit tests, the following critical modules currently have **0% test coverage**:
1. `CoLeasingBoard.tsx` (Share-Office roommate board logic and form handlers).
2. Heavy tax escalation rules in `PropertyTaxCalculator.tsx` for multi-house owners (3+ houses, >85m²).
3. Hwaseong enterprise data loader (`sync-nps.js`).

---

## 6. Concrete Recommendations & Actionable Remediation Plan

### Recommendation 1: Fix Rural Special Tax Heavy Escalation in `PropertyTaxCalculator.tsx`
- **File**: `frontend/src/components/consumer/PropertyTaxCalculator.tsx`
- **Action**: Replace fixed `0.2%` rural special tax rate with statutory escalation lookup based on `ownedHouses` and `exclusiveArea`:
  ```ts
  let ruralSpecialTaxRate = 0;
  if (exclusiveArea === '85over') {
    if (ownedHouses === 1 || ownedHouses === 2) ruralSpecialTaxRate = 0.2;
    else if (ownedHouses === 3) ruralSpecialTaxRate = 0.6;
    else ruralSpecialTaxRate = 1.0;
  } else {
    if (ownedHouses === 3) ruralSpecialTaxRate = 0.4;
    else if (ownedHouses >= 4) ruralSpecialTaxRate = 0.6;
  }
  ```

### Recommendation 2: Remove Artificial Compatibility Score Floor in `AptFitFinder.tsx`
- **File**: `frontend/src/components/consumer/AptFitFinder.tsx`
- **Action**: Modify line 526 to allow true 0-100% scaling without clamping unmapped candidates to 50%:
  ```ts
  // Remove Math.max(50, ...) floor clamping
  const matchPercentage = Math.min(99, Math.max(0, Math.round((score / 145) * 100)));
  ```

### Recommendation 3: Enforce Statutory 10 KRW Truncation (`Math.floor(val / 10) * 10`)
- **Files**: `PropertyTaxCalculator.tsx`, `RelocationTaxSimulator.tsx`, `sellTimingEngine.ts`
- **Action**: Replace `Math.round()` in `만원` intermediate steps with exact WON calculations using statutory 10 KRW truncation (`Math.floor(amountInWon / 10) * 10`).

### Recommendation 4: Connect `CoLeasingBoard.tsx` to Firestore & Implement Scoring Algorithm
- **File**: `frontend/src/components/macro/CoLeasingBoard.tsx`
- **Action**: Replace `INITIAL_POSTS` local state with Firestore collection queries (`collection(db, 'co_leasing_posts')`). Implement a sector & budget matching algorithm similar to `AptFitFinder`.

### Recommendation 5: Add Zod Schemas for Enterprise Data
- **File**: `frontend/src/lib/validation/facade.schemas.ts`
- **Action**: Define `NPSEnterpriseSchema` and `JisanUnitSchema` to validate Hwaseong enterprise data at build and runtime.

---
*Report generated by Explorer Subagent for D-VIEW Web Application Data Integrity Suite.*
