# Forensic Integrity Audit Handoff Report — Milestone 4

**Work Product**: Milestone 4 Implementation (Rent Transaction Sync, Firestore Upsert, Frontend Timeline/Modal Updates)  
**Profile**: General Project  
**Integrity Mode**: Development Mode  
**Verdict**: **CLEAN**

---

## 1. Observation

Direct empirical evidence gathered from inspecting all 10 modified files in scope and running verification build tools:

### Target Files Inspected:
1. `frontend/src/app/api/cron/sync-transactions/route.ts`
   - Scans trade and rent transactions from MOLIT (국토부) API for 6 months (`LAWD_CDS`: '41590', '41597').
   - Uses `getTag(tagMap, ...)` helper for XML tag extractions and fallback matching (`umdNm`, `법정동`, `dong`, `deposit`, `보증금액`, `보증금`, `monthlyRent`, `월세금액`, `월세`).
   - Deterministic key generation:
     - Trade: `${aptName}_${ym}_${contractDay}_${area}_${price}_${floor}`
     - Rent: `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${monthlyRent}_${floor}`
   - Proper Zod schema (`transactionRecordSchema`) validation before Firestore batch write.
   - Comprehensive error handling: HTTP status checks, API `<resultCode>` checks, email notification triggers (`sendMail`), rate-limiting (`rateLimiter`).

2. `frontend/scripts/fetch-rent.js`
   - Node.js CLI script for MOLIT rent data synchronization over 17 months.
   - Validates data via `RentTransactionSchema` (Zod).
   - Handles XML and JSON response structures cleanly with robust retry loop (up to 3 attempts with 15s timeout).
   - Key generation matches cron route: `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${monthlyRent}_${floor}`.

3. `frontend/scripts/upload-rent-csv.js` & `frontend/scripts/upload-rent-csv-fast.js`
   - Parses EUC-KR encoded MOLIT rent CSV files (`iconv-lite`).
   - `RentCsvRecordSchema` Zod validation for every record before uploading.
   - `upload-rent-csv-fast.js` deduplicates in-memory using `Set<string>` and performs batch upsert (`merge: true`) with zero read operations.

4. `frontend/src/lib/utils/areaConverter.ts`
   - Resolves supply pyeong (`공급평형`) via 3-stage lookup pipeline:
     1. Exact match by normalized apt name & area in `type-map.json`
     2. Fallback tolerance match (`< 0.11 m²`)
     3. Formula fallback: `Math.round(area * 0.3025 * 1.33 * 10) / 10`
   - Defensive `try-catch` blocks around JSON file loading paths.

5. Configuration Files (`frontend/vercel.json`, `frontend/firebase.json`, `frontend/firestore.indexes.json`)
   - `vercel.json`: Cron path `/api/cron/sync-transactions` scheduled daily at `0 18 * * *`.
   - `firestore.indexes.json`: Defines composite indexes on `transactions` collection (`dealType` + `contractDate`, `dealType` + `aptName` + `area` + `price`, `contractYm` + `contractDate`).

6. `frontend/src/components/apartment-modal/TransactionSummaryMetrics.tsx`
   - Dynamic calculation of period averages (1M, 3M, 6M, 1Y, 3Y, 5Y, 10Y, ALL) and sale-jeonse gap (`gapPriceEok`, `jeonseRatio`).
   - Supports outlier filtering via IQR (`filterOutliersIQR`) with custom multipliers for rent (3.0/5.0).
   - Genuine mathematical computation using real `TransactionRecord[]` data.

7. `frontend/src/components/apartment-modal/TransactionTable.tsx`
   - Displays transactions filtered by `chartType` (`sale` vs `jeonse`).
   - Dynamic sorting: `date_desc`, `date_asc`, `price_desc`, `price_asc`.
   - Responsive layout adapting to screen size (`visibleCount`, batching).
   - Includes structured JSON-LD data generation (`schema.org/ItemList`).

8. `frontend/src/components/ApartmentModal.tsx`
   - Modal wrapper with lazy loading (`LazyRender`), intersection observers, and preloading.
   - Calculates DCF valuation (`calculateDynamicDCF`), education scores, and infrastructure scores dynamically.

9. `frontend/src/components/MacroDashboardClient.tsx`
   - Renders 2-row vertical layout for mobile timeline cards:
     - Row 1: `[신고가 Badge] + [동 / 평형 / 층수]`
     - Row 2: `[아파트 Full Name]`
   - Alignment optimizations between price/delta badges and detail button.

---

## 2. Verification Commands & Results

### Step 1: Static Type Check
- **Command**: `.\node_modules\.bin\tsc.cmd --noEmit`
- **Result**: `Exit Code 0` (100% Pass, 0 errors).

### Step 2: Next.js Production Build
- **Command**: `npm run build`
- **Result**: `Exit Code 0` (Successfully generated static pages and compiled server/client bundles).

---

## 3. Logic Chain

1. **No Hardcoded Test Data or Facades**:
   - Every file processes real input data (API responses, CSV streams, or Firestore documents).
   - Functions compute metrics algorithmically without hardcoded constant returns or short-circuits.
2. **Key Collision & Data Integrity**:
   - Key format `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${monthlyRent}_${floor}` uniquely identifies rent transactions by incorporating deposit, monthly rent, floor, area, and exact contract date.
   - Deduplication mechanisms (`existingMap` in cron sync, `processedKeys` Set in CSV fast uploader) prevent duplicate document creation.
3. **Robust Error & Tag Handling**:
   - `getTag` and `getJsonVal` helper functions query multiple fallback keys (`umdNm`, `법정동`, `dong`, `deposit`, `보증금액`, `보증금`, `monthlyRent`, `월세금액`, `월세`, `contractType`, `계약구분`, `useRRRight`, `갱신요구권사용여부`).
   - API error responses (`resultCode !== '00'`) trigger structured logging and email alerts without crashing the sync pipeline.
4. **Empirical Verification**:
   - Static typing and production build both executed clean without errors.

---

## 4. Caveats

- **External API Dependency**: Production runtime execution of `sync-transactions` requires valid `BUILDING_API_KEY` and Firestore Admin credentials. (Verified in code that missing credentials gracefully return 500 JSON errors with detailed logs).

---

## 5. Conclusion

The Milestone 4 work product meets all quality and integrity requirements. Logic is genuine, key collision risk is mitigated, tag extraction handles schema variations defensively, static type checking passes 100%, and the Next.js production build completes cleanly.

**Final Verdict**: **CLEAN**

---

## 6. Verification Method

To re-verify the audit findings independently:

1. Static Type Check:
   ```powershell
   cd "c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend"
   .\node_modules\.bin\tsc.cmd --noEmit
   ```
   *Expected Output*: Exit code 0 with no errors.

2. Production Build:
   ```powershell
   cd "c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend"
   npm run build
   ```
   *Expected Output*: Exit code 0 with `✓ Generating static pages...` success message.
