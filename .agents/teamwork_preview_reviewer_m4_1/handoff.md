# Milestone 4 Handoff & Quality Review Report (Backend & Data Sync)

**Reviewer**: `teamwork_preview_reviewer_m4_1`  
**Target Milestone**: Milestone 4 (Backend & Data Sync Optimization)  
**Verdict**: **REQUEST_CHANGES**

---

## 1. Quality & Adversarial Review Summary

- **Verdict**: **REQUEST_CHANGES**
- **Integrity Status**: **PASSED** (No dummy implementations, hardcoded test results, facade shortcuts, or self-certifying artifacts detected).
- **TypeScript Type Check**: Passed (`npx tsc --noEmit` exited with code 0).
- **Production Build**: **FAILED** (`npm run build` exited with code 1 due to Turbopack module resolution errors in `areaConverter.ts`).

---

## 2. Findings

### [Major] Finding 1: Turbopack Build Failure in `areaConverter.ts` due to Invalid `require` Paths
- **What**: `npm run build` fails during Turbopack production compilation.
- **Where**: `frontend/src/lib/utils/areaConverter.ts`, lines 5-13:
  ```ts
  let typeMapData: TypeMapItem[] = [];
  try {
    typeMapData = require('../../../public/data/type-map.json');
  } catch {
    try {
      typeMapData = require('./public/data/type-map.json');
    } catch {
      try {
        typeMapData = require('../public/data/type-map.json');
      } catch {
        // ignore
      }
    }
  }
  ```
- **Why**: Turbopack performs static dependency analysis on all `require()` calls at build time, ignoring runtime `try...catch` blocks. The relative paths `./public/data/type-map.json` and `../public/data/type-map.json` do not exist relative to `frontend/src/lib/utils/`. Turbopack emits `Module not found` errors which corrupt Next.js manifest generation (`_buildManifest.js.tmp`), causing `npm run build` to fail with Exit Code 1.
- **Suggestion**: Remove the invalid fallback `require` branches (`./public/data/type-map.json` and `../public/data/type-map.json`) so only valid relative paths exist, or use a single static import/require:
  ```ts
  let typeMapData: TypeMapItem[] = [];
  try {
    typeMapData = require('../../../public/data/type-map.json');
  } catch {
    // fallback or empty array
  }
  ```

---

## 3. Findings & Verification Checklist

### V1. API_KEY URL Encoding (`encodeURIComponent`)
- **Observation**:
  - `frontend/src/app/api/cron/sync-transactions/route.ts` line 236 & line 385:
    `const url = \`${API_BASE_TRADE}?serviceKey=${encodeURIComponent(API_KEY)}&LAWD_CD=${currentLawd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000\`;`
    `const url = \`${API_BASE_RENT}?serviceKey=${encodeURIComponent(API_KEY)}&LAWD_CD=${currentLawd}&DEAL_YMD=${ym}&pageNo=${rentPage}&numOfRows=1000\`;`
  - `frontend/scripts/fetch-rent.js` line 111:
    `const url = \`${API_BASE}?serviceKey=${encodeURIComponent(API_KEY)}&LAWD_CD=${currentLawd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000&_type=json\`;`
- **Assessment**: PASS. Special characters (`=`, `+`, `/`, `%`) present in data.go.kr service keys are correctly URL-encoded, preventing authentication failures during automated sync.

### V2. Dual-Language Tag Extraction (Korean & English XML/JSON)
- **Observation**:
  - `frontend/src/app/api/cron/sync-transactions/route.ts` lines 317-322 & 463-469:
    `getTag(tagMap, 'umdNm', '법정동', 'dong')`
    `getTag(tagMap, 'aptNm', '아파트')`
    `getTag(tagMap, 'deposit', '보증금액', '보증금')`
    `getTag(tagMap, 'monthlyRent', '월세금액', '월세')`
  - `frontend/scripts/fetch-rent.js` lines 176-181 & 254-259:
    Supports XML tag Map lookup and JSON property fallback for both English and Korean tags (`<보증금액>`, `<월세금액>`, `<법정동>`, `<아파트>`).
- **Assessment**: PASS. Robust parsing handles both standard MOLIT XML responses and JSON proxy responses without schema mismatch.

### V3. Dual LAWD_CD & 6-Month Scan Window
- **Observation**:
  - `frontend/src/app/api/cron/sync-transactions/route.ts` line 20 & lines 199-202:
    `const LAWD_CDS = ['41590', '41597'];` (Hwaseong-si & Dongtan-gu)
    Calculates `monthsToSync` for 6 months (`i = 0..5` -> `M` through `M-5`).
  - `frontend/scripts/fetch-rent.js` line 41 & lines 92-95:
    `const LAWD_CDS = ['41590', '41597'];` and scans 17 months.
- **Assessment**: PASS. Scans both region codes to prevent data omission across administrative re-zoning, and covers the mandatory 6-month window to capture delayed transaction filings.

### V4. Deterministic `_key` Formula (Including `monthlyRent`)
- **Observation**:
  - `frontend/src/app/api/cron/sync-transactions/route.ts` line 478:
    `const _key = \`RENT_\${aptName}_\${ym}_\${contractDay}_\${area}_\${deposit}_\${monthlyRent}_\${floor}\`;`
  - `frontend/scripts/fetch-rent.js` lines 191 & 269
  - `frontend/scripts/upload-rent-csv.js` lines 200 & 249
  - `frontend/scripts/upload-rent-csv-fast.js` lines 185 & 229
- **Assessment**: PASS. Including `monthlyRent` ensures Jeonse (`monthlyRent = 0`) and Wolse transactions on the same date/floor/deposit maintain unique document keys in Firestore, eliminating key collision overwrites.

### V5. Shared Supply Pyeong Helper (`areaConverter.ts`)
- **Observation**:
  - `frontend/src/lib/utils/areaConverter.ts`:
    Exposes `getSupplyPyeong(aptName, area)` with exact match, tolerance match (<0.11m²), and standard formula fallback (`area * 0.3025 * 1.33`).
    Exported for both ES modules (`export function getSupplyPyeong`) and CommonJS (`module.exports = { getSupplyPyeong }`).
  - Used uniformly across `sync-transactions/route.ts`, `fetch-rent.js`, `upload-rent-csv.js`, and `upload-rent-csv-fast.js`.
- **Assessment**: FAIL (due to invalid `require` relative paths causing Turbopack build failure).

### V6. Config Files (`vercel.json`, `firebase.json`, `firestore.indexes.json`)
- **Observation**:
  - `frontend/vercel.json`: Cron schedule `0 18 * * *` configured for `/api/cron/sync-transactions`.
  - `frontend/firebase.json` & `firebase.json`: Links `firestore.indexes.json`.
  - `frontend/firestore.indexes.json`: Composite indexes for `transactions` collection (`dealType` + `contractDate`, `dealType` + `aptName` + `area` + `price`, `contractYm` + `contractDate`).
- **Assessment**: PASS. Correct configuration for serverless automated execution and compound Firestore queries.

---

## 4. Adversarial Challenge & Stress Test Results

| Attack Vector / Scenario | Hypothesized Failure Mode | Observed / Verified Mitigation | Result |
|--------------------------|--------------------------|--------------------------------|--------|
| Special characters in API key (`=`, `+`, `/`) | HTTP 401/403 request error | `encodeURIComponent(API_KEY)` escapes special chars | PASS |
| Overwriting Jeonse with Wolse on same day & floor | Document key collision in Firestore | Key formula includes `monthlyRent` (`RENT_..._${deposit}_${monthlyRent}_${floor}`) | PASS |
| Delayed transaction reporting (>30 days) | Omission of backdated entries | 6-month scan window (`M`..`M-5`) in Cron sync | PASS |
| Mixed Korean/English XML response tags | Unparsed null fields | Multi-key fallback map (`getTag(tagMap, 'umdNm', '법정동', 'dong')`) | PASS |
| Next.js Turbopack build with static analysis | Module not found build failure | Invalid `require()` paths in `areaConverter.ts` cause build exit code 1 | **FAIL** |

---

## 5. Integrity Assessment

- **Hardcoded test data**: None found.
- **Facade implementations**: None found; XML and JSON parsing logic, Firestore batch upserts, and fallback area calculations are fully implemented.
- **Bypass / Shortcuts**: None found.
- **Verification validity**: Verified via `npx tsc --noEmit` (PASS) and `npm run build` (FAIL due to Turbopack module resolution).

---

## 6. Handoff Protocol (5 Components)

### 1. Observation
- Ran `npx tsc --noEmit` in `frontend/`: Exit Code `0` (Zero TypeScript errors).
- Ran `npm run build` in `frontend/`: Exit Code `1` with Turbopack errors:
  - `./src/lib/utils/areaConverter.ts:6:19 Module not found: Can't resolve './public/data/type-map.json'`
  - `./src/lib/utils/areaConverter.ts:9:21 Module not found: Can't resolve '../public/data/type-map.json'`
- Verified `frontend/src/app/api/cron/sync-transactions/route.ts`:
  - `encodeURIComponent(API_KEY)` at lines 236 & 385.
  - Korean/English tag fallback `getTag` at lines 317-322, 463-469.
  - Dual LAWD_CD `['41590', '41597']` at line 20.
  - 6-month scan window at lines 199-202.
  - `_key` with `monthlyRent` at line 478.
- Verified `frontend/scripts/fetch-rent.js`:
  - Uses `getSupplyPyeong` from `areaConverter.ts` (line 16).
  - Encodes `API_KEY` (line 111).
  - Handles XML and JSON payloads with dual-language tag support.
  - `_key` includes `monthlyRent` (lines 191, 269).
- Verified `frontend/scripts/upload-rent-csv.js` & `upload-rent-csv-fast.js`:
  - Deterministic `_key` formula with `monthlyRent` and `contractDayPadded`.
- Verified `frontend/src/lib/utils/areaConverter.ts`.
- Verified `frontend/vercel.json`, `firebase.json`, `firestore.indexes.json`.

### 2. Logic Chain
1. `npx tsc --noEmit` passes because TypeScript runtime types are valid.
2. `npm run build` fails because Turbopack statically analyzes `require()` calls in `areaConverter.ts` duringNext.js bundling.
3. The invalid relative paths `./public/data/type-map.json` and `../public/data/type-map.json` do not exist relative to `frontend/src/lib/utils/areaConverter.ts`.
4. As a result, Next.js build fails static bundling and manifest generation.

### 3. Caveats
- Fixing `areaConverter.ts` by removing invalid `require` branches will immediately resolve the Turbopack build failure.

### 4. Conclusion
While all business requirements (API key encoding, Korean/English tags, 6-month window, dual LAWD_CDs, deterministic `_key` with `monthlyRent`, composite indexes) are correctly implemented, the production build (`npm run build`) fails due to Turbopack module resolution errors in `areaConverter.ts`. Verdict: **REQUEST_CHANGES**.

### 5. Verification Method
1. Fix `frontend/src/lib/utils/areaConverter.ts` to remove invalid `require()` fallbacks.
2. Run `cd frontend && npx tsc --noEmit` -> Must return exit code 0.
3. Run `cd frontend && npm run build` -> Must return exit code 0 cleanly.
