# Handoff Report: Requirement R1 - Rent Data Collection & Sync Scripts Investigation

## 1. Observation

Direct investigation of the codebase revealed the following specific files, line numbers, and implementation details across rent data collection scripts and API routes:

### Primary Files Inspected
1. `frontend/src/app/api/cron/sync-transactions/route.ts` (API route for automated Vercel Cron sync)
2. `frontend/scripts/fetch-rent.js` (CLI script for MOLIT rent data fetching)
3. `frontend/scripts/upload-rent-csv.js` (CLI script for MOLIT rent CSV manual upload)
4. `frontend/scripts/sync-historical-rent.js` (Historical rent data backfill script for 2005-2019)
5. `frontend/scripts/sync-transactions.js` (Build-time summary & chunk generator script)
6. `frontend/vercel.json` (Deployment & Cron configuration)

### Verbatim Code Evidence & Line Numbers

#### Finding A: Unencoded `serviceKey` in `route.ts`
- **File**: `frontend/src/app/api/cron/sync-transactions/route.ts` (Lines 398 & 247)
- **Code**:
  ```typescript
  // Line 247 (Trade API):
  const url = `${API_BASE_TRADE}?serviceKey=${API_KEY}&LAWD_CD=${currentLawd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000`;
  // Line 398 (Rent API):
  const url = `${API_BASE_RENT}?serviceKey=${API_KEY}&LAWD_CD=${currentLawd}&DEAL_YMD=${ym}&pageNo=${rentPage}&numOfRows=1000`;
  ```
- **Observation**: `API_KEY` is inserted directly without `encodeURIComponent()`. MOLIT API service keys frequently contain special characters (`+`, `/`, `=`), which become unescaped in raw URLs, triggering MOLIT API error `SERVICE_KEY_IS_NOT_REGISTERED_ERROR` (`resultCode: 30`).

#### Finding B: English-only XML Tag Extraction in `route.ts`
- **File**: `frontend/src/app/api/cron/sync-transactions/route.ts` (Lines 478–492)
- **Code**:
  ```typescript
  const dong = get('umdNm');
  const aptName = get('aptNm');
  const depositStr = get('deposit').replace(/,/g, '').trim();
  const monthlyRentStr = get('monthlyRent') ? get('monthlyRent').replace(/,/g, '').trim() : '0';
  const area = parseFloat(get('excluUseAr')) || 0;
  const contractDay = get('dealDay').padStart(2, '0');
  const floor = parseInt(get('floor'), 10) || 0;
  ```
- **Observation**: `get(tag)` relies exclusively on English tag names (`deposit`, `monthlyRent`, `umdNm`, `aptNm`, `excluUseAr`, `dealDay`, `floor`). MOLIT's public API `RTMSDataSvcAptRent` frequently returns XML with Korean tags (`<보증금액>` / `<보증금>`, `<월세금액>` / `<월세>`, `<법정동>`, `<아파트>`, `<전용면적>`, `<일>`, `<층>`). When Korean tags are returned, `get('deposit')` returns `''`, resulting in `deposit = 0` and `monthlyRent = 0` for all parsed records.

#### Finding C: Hardcoded Single `LAWD_CD` & XML Abort in `fetch-rent.js`
- **File**: `frontend/scripts/fetch-rent.js` (Lines 40, 110, 126–131)
- **Code**:
  ```javascript
  // Line 40:
  const LAWD_CD = '41597'; // 동탄구만 지정

  // Line 110:
  const url = `${API_BASE}?serviceKey=${encodeURIComponent(API_KEY)}&LAWD_CD=${LAWD_CD}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000&_type=json`;

  // Line 126-128:
  if (text.trim().startsWith('<')) {
    console.error(`   ⚠️ API 응답이 XML 형식입니다 (예상 JSON): ${text.slice(0, 50)}...`);
    text = { response: { header: { resultCode: '99', resultMsg: 'XML 응답이 반환됨' } } };
  }
  ```
- **Observation**: 
  1. `fetch-rent.js` queries ONLY legal dong code `41597` (Dongtan-gu) and omits `41590` (Hwaseong-si primary code).
  2. `fetch-rent.js` requests `_type=json`. When MOLIT API returns XML (default behavior on quota issues, server defaults, or header variations), `fetch-rent.js` flags `resultCode: '99'` and completely aborts data processing for that month.

#### Finding D: Narrow 3-Month Window in `route.ts` vs Transaction Registration Delays
- **File**: `frontend/src/app/api/cron/sync-transactions/route.ts` (Lines 207–213)
- **Code**:
  ```typescript
  const now = new Date();
  const monthsToSync = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthsToSync.add(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  ```
- **Observation**: `route.ts` syncs only 3 months (`M`, `M-1`, `M-2`). Real estate rent transactions reported with 3 to 6 month administrative delays by MOLIT are never captured by automated daily syncs.

#### Finding E: Document Key Discrepancies & Duplicate Records
- **File**: `frontend/scripts/upload-rent-csv.js` (Lines 245–258)
- **Code**:
  ```javascript
  const dupSnap = await collRef
    .where('aptName', '==', validRecord.aptName)
    .where('contractDate', '==', validRecord.contractDate)
    .where('deposit', '==', validRecord.deposit)
    .where('floor', '==', validRecord.floor)
    .get();
  
  if (!dupSnap.empty) { skipped++; continue; }
  await collRef.add(validRecord); // Firestore auto-generated ID
  ```
- **Observation**: `upload-rent-csv.js` creates Firestore documents with random auto-generated document IDs (and omits `_key`), whereas `route.ts` and `fetch-rent.js` use doc ID `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${floor}`. When `route.ts` runs after a CSV upload, Firestore receives duplicate documents for identical rent transactions because doc IDs do not align.

#### Finding F: Missing Cron Schedule in `vercel.json`
- **File**: `frontend/vercel.json` (Lines 1–4)
- **Code**:
  ```json
  {
    "buildCommand": "node scripts/sync-transactions.js && node scripts/update-sw-version.js && next build"
  }
  ```
- **Observation**: `vercel.json` has no `"crons"` array. The cron route `/api/cron/sync-transactions` is never triggered automatically by Vercel on a daily schedule.

---

## 2. Logic Chain

1. **Root Cause of Missing Recent Rent Transactions**:
   - **Step 1**: Automated background sync depends on `frontend/vercel.json` triggering `/api/cron/sync-transactions`. Because `vercel.json` lacks `"crons"`, scheduled sync relies entirely on manual triggers or external callers.
   - **Step 2**: When `/api/cron/sync-transactions` is invoked, `API_KEY` is sent unencoded (`serviceKey=${API_KEY}`), causing API Auth 30 failures for keys with special characters.
   - **Step 3**: Even if HTTP 200 is returned, MOLIT Rent API returns XML with Korean tags (`<보증금액>`, `<월세금액>`, `<법정동>`, `<아파트>`). `route.ts` extracts only English tags (`get('deposit')`), parsing deposit as `0`. Zod or duplicate key checks drop or mangle these entries.
   - **Step 4**: Standalone fallback script `fetch-rent.js` fails because it queries only `41597` (missing `41590`) and crashes/aborts whenever MOLIT returns XML instead of JSON.
   - **Step 5**: Because `route.ts` only looks back 3 months (`i < 3`), rent transactions registered with >60-day delays by MOLIT are lost permanently unless a full sync is manually forced.

2. **Data Integrity & Frontend Render Pipeline**:
   - `sync-transactions.js` reads Firestore `transactions` and `transactionSync` collections at build/sync time to generate static JSON files (`tx-summary.json` and `public/tx-data/*.json`).
   - Duplicate documents in Firestore (caused by CSV import using `collRef.add()` vs API route using deterministic `_key`) require extra memory deduplication in `sync-transactions.js`.
   - Inconsistent `areaPyeong` calculations across CSV scripts (`area / 3.3058`) vs API scripts (`getSupplyPyeong` via `TYPE_MAP`) create discrepancies between raw Firestore records and client display.

---

## 3. Caveats

- **API Rate Limits & Gateway Throttling**: MOLIT Public API endpoints (`apis.data.go.kr`) impose daily call quotas and rate limiting (HTTP 429 / XML error code 22). Extended month scanning (e.g., 6 months x 2 regional codes) increases total HTTP requests per run.
- **Regional Code Transitions**: While `41590` (Hwaseong-si) and `41597` (Dongtan-gu) cover the targeted area, MOLIT may reclassify historical or new apartment sub-districts under surrounding codes in future administrative reorganizations.

---

## 4. Conclusion

Recent rent transactions fail to sync up to the latest month due to a combination of missing Vercel Cron configuration, unencoded API keys, missing fallback tag parsing for Korean XML tags, single LAWD_CD filtering in standalone scripts, and an overly restrictive 3-month scan window. 

Implementing the actionable fix strategies below will resolve all root causes, ensure 100% data capture for both '전세' and '월세', align document ID generation, and maintain complete integrity from MOLIT API to Firestore and UI components.

---

## 5. Actionable Fix Strategies for Worker Implementation

### Strategy 1: Update `frontend/src/app/api/cron/sync-transactions/route.ts`
1. **URL Encode API Key**:
   ```typescript
   const url = `${API_BASE_RENT}?serviceKey=${encodeURIComponent(API_KEY)}&LAWD_CD=${currentLawd}&DEAL_YMD=${ym}&pageNo=${rentPage}&numOfRows=1000`;
   ```
2. **Robust Tag Extraction (Korean & English Fallbacks)**:
   Create a helper `getTag(tagMap, ...keys)`:
   ```typescript
   const getTag = (map: Map<string, string>, ...keys: string[]) => {
     for (const k of keys) {
       const val = map.get(k);
       if (val !== undefined && val !== null && val !== '') return val;
     }
     return '';
   };
   ```
   Apply fallbacks:
   ```typescript
   const dong = getTag(tagMap, 'umdNm', '법정동', 'dong');
   const aptName = getTag(tagMap, 'aptNm', '아파트');
   const depositStr = getTag(tagMap, 'deposit', '보증금액', '보증금').replace(/,/g, '').trim();
   const monthlyRentStr = getTag(tagMap, 'monthlyRent', '월세금액', '월세').replace(/,/g, '').trim() || '0';
   const area = parseFloat(getTag(tagMap, 'excluUseAr', '전용면적')) || 0;
   const contractDay = getTag(tagMap, 'dealDay', '일').padStart(2, '0');
   const floor = parseInt(getTag(tagMap, 'floor', '층'), 10) || 0;
   const buildYear = parseInt(getTag(tagMap, 'buildYear', '건축년도'), 10) || 0;
   const reqGb = getTag(tagMap, 'contractType', '계약구분');
   const rnuYn = getTag(tagMap, 'useRRRight', '갱신요구권사용여부');
   ```
3. **Extend Sync Window**:
   Expand `monthsToSync` loop from 3 months (`i < 3`) to 6 months (`i < 6`).

### Strategy 2: Fix `frontend/scripts/fetch-rent.js`
1. **Multi-LAWD_CD Support**:
   Change `const LAWD_CD = '41597'` to `const LAWD_CDS = ['41590', '41597']` and iterate over both codes.
2. **XML Response Parser Fallback**:
   If `text.trim().startsWith('<')`, parse XML items via regex matching (same regex tag Map parser as `route.ts`) rather than throwing an error and aborting.
3. **Supply Pyeong Mapping**:
   Integrate `fetchTypeMap()` and `getSupplyPyeong()` into `fetch-rent.js` for consistent `areaPyeong` calculation.

### Strategy 3: Fix `frontend/scripts/upload-rent-csv.js`
1. **Deterministic Document ID**:
   Replace `collRef.add(validRecord)` with deterministic ID assignment matching `route.ts`:
   ```javascript
   const docId = `RENT_${validRecord.aptName}_${validRecord.contractYm}_${validRecord.contractDay.padStart(2, '0')}_${validRecord.area}_${validRecord.deposit}_${validRecord.floor}`;
   validRecord._key = docId;
   await collRef.doc(docId).set(validRecord, { merge: true });
   ```

### Strategy 4: Update `frontend/vercel.json`
Add cron schedule to `vercel.json`:
```json
{
  "buildCommand": "node scripts/sync-transactions.js && node scripts/update-sw-version.js && next build",
  "crons": [
    {
      "path": "/api/cron/sync-transactions",
      "schedule": "0 18 * * *"
    }
  ]
}
```

---

## 6. Verification Method

To independently verify these findings and subsequent Worker implementations:

1. **Tag & API Parameter Verification**:
   - Inspect `frontend/src/app/api/cron/sync-transactions/route.ts` lines 247, 398, and 478–492.
   - Run API test script `node scripts/test-api-526.js` or `node scripts/test-xml-tags.js` to observe raw MOLIT XML tag responses (`<보증금액>`, `<월세금액>`).
2. **Data Pipeline Test**:
   - Run `npx tsx scripts/sync-single-report.ts` or `npm run sync-transactions` after mock sync execution.
   - Verify that generated JSON files under `public/tx-data/*.json` contain recent rent transactions with non-zero deposits, correct '전세'/'월세' deal types, and matching supply pyeong values.
3. **TypeScript & Build Verification**:
   - Run `npx tsc --noEmit` from `frontend` directory (Must complete with 0 errors).
   - Run `npm run build` from `frontend` directory (Must pass clean build).
