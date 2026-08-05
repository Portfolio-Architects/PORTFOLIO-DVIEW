# Technical Handoff Report — Requirement R2: Firestore DB Upsert & Data Integrity

**Summary**: Investigation of Firestore DB schema, composite key (`_key`) generation logic, query filters, composite index definitions, and unit area/pyeong conversions. Identified 6 critical bugs including rent transaction data loss due to missing `monthlyRent` in `_key`, inconsistent pyeong calculation logic across scripts, missing `_key` properties and mismatched document ID formats in CSV uploaders, and unindexed compound Firestore queries. Provided 5 actionable fix strategies for Worker implementation.

---

## 1. Observation

### 1.1 Firestore Schema & Upsert Logic Overview
Across the codebase, transaction records in the Firestore `transactions` collection are populated by 5 main paths:
1. `frontend/src/app/api/cron/sync-transactions/route.ts` (API route scheduled by Vercel Cron or called manually)
2. `frontend/scripts/fetch-rent.js` (CLI node script for rent data API sync)
3. `frontend/scripts/fetch-transactions.js` (CLI node script for trade data API sync)
4. `frontend/scripts/upload-rent-csv.js` (CLI node script for legacy CSV import)
5. `frontend/scripts/upload-rent-csv-fast.js` (CLI node script for batch CSV import)

The expected document schema for `transactions` includes:
- `aptName` (string): Apartment complex name
- `sigungu` (string): Sigungu / Dongtan district string
- `dong` (string): Legal dong name (e.g. `'청계동'`, `'오산동'`)
- `area` (number): Exclusive private area (`excluUseAr`) in m²
- `areaPyeong` (number): Pyeong area representation
- `contractYm` (string): 6-digit year-month (e.g. `'202607'`)
- `contractDay` (string): 2-digit day (e.g. `'15'`)
- `contractDate` (string): 8-digit date string (e.g. `'20260715'`)
- `price` (number): Trade price for 매매; deposit amount for 전세/월세 (for UI table compatibility)
- `deposit` (number): Deposit amount in 10,000 KRW
- `monthlyRent` (number): Monthly rent in 10,000 KRW (0 for 전세/매매)
- `floor` (number): Floor number
- `buildYear` (number): Completion year
- `dealType` (string): `'매매'`, `'전세'`, or `'월세'`
- `cancelDate` (string): Contract cancellation date (Trade only)
- `source` (string): Data origin identifier (`'govt_api'`, `'govt_api_rent'`, `'csv_rent_import'`)
- `_key` (string): Unique composite key used as the document ID and stored as a field

---

### 1.2 Verbatim Code & Key Generation Observations

#### Observation O1: Rent Composite Key (`_key`) Generation Formula
In `frontend/src/app/api/cron/sync-transactions/route.ts` (line 493):
```typescript
const key = `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${floor}`;
```
And in `frontend/scripts/fetch-rent.js` (line 196):
```javascript
_key: `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${floor}`,
```
Notice that `monthlyRent` is **completely missing** from the key string.

#### Observation O2: CSV Upload Script Composite ID Formats & Missing `_key` Field
In `frontend/scripts/upload-rent-csv-fast.js` (line 229):
```javascript
const docId = `rent_${normalizedName}_${validRecord.contractDate}_${validRecord.floor}_${validRecord.deposit}_${validRecord.monthlyRent}`;
```
And line 257:
```javascript
batch.set(docRef, item.record, { merge: true });
```
Notice that `docId` starts with lowercase `rent_`, uses `contractDate` (8 digits) instead of `ym` + `contractDay`, includes `monthlyRent`, and **does NOT include the `_key` property** in `item.record`.

In `frontend/scripts/upload-rent-csv.js` (line 257):
```javascript
await collRef.add(validRecord);
```
Notice that `upload-rent-csv.js` creates documents using `collRef.add()`, resulting in random auto-generated document IDs (e.g. `aB3k9x...`), leaving `_key` completely undefined.

#### Observation O3: Area & Pyeong Calculation Discrepancies
In `frontend/scripts/fetch-rent.js` (line 183) and `frontend/scripts/fetch-transactions.js` (line 232):
```javascript
areaPyeong: Math.round(area / 3.3058 * 10) / 10,
```
In `frontend/src/app/api/cron/sync-transactions/route.ts` (lines 356 & 505):
```typescript
areaPyeong: getSupplyPyeong(aptName, area, typeMap),
```
Where `getSupplyPyeong` (lines 104-123) maps `area` to supply pyeong via `TYPE_MAP` (e.g. 84.96㎡ -> 34평).

#### Observation O4: Unindexed Compound Firestore Queries
In `frontend/src/app/api/push/notify-new-high/route.ts` (lines 44-46 and 63-69):
```typescript
const txSnap = await db.collection('transactions')
  .where('dealType', '==', '매매')
  .where('contractDate', '>=', dateLimitStr)
  .get();
```
```typescript
const historySnap = await db.collection('transactions')
  .where('dealType', '==', '매매')
  .where('aptName', '==', aptName)
  .where('area', '==', area)
  .orderBy('price', 'desc')
  .limit(5)
  .get();
```
In `firebase.json` (lines 1-8):
```json
{
  "firestore": {
    "rules": "firestore.rules"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```
No `"indexes"` configuration is present, and no `firestore.indexes.json` file exists in the repository.

---

## 2. Logic Chain

1. **Rent Data Overwrite & Loss (From O1)**:
   - *Premise*: Firestore batch upserts use `collRef.doc(r._key).set(r, { merge: true })`.
   - *Step 1*: When two rent transactions occur on the same day in the same complex with identical area, floor, and deposit (e.g. A: 전세 보증금 5,000만원 / 월세 0, B: 월세 보증금 5,000만원 / 월세 40만원), their generated `_key` values (`RENT_${aptName}_${ym}_${contractDay}_${area}_5000_${floor}`) are identical because `monthlyRent` is omitted.
   - *Step 2*: Because `_key` is identical, document B overwrites document A during batch upsert.
   - *Conclusion*: Legitimate rent transactions are silently deleted/overwritten in Firestore.

2. **Duplicate Records & Broken Key Queries (From O2)**:
   - *Premise*: Different scripts populate rent data using different document ID formats (`RENT_...`, `rent_...`, random auto-id) and some omit `_key` in the payload.
   - *Step 1*: A rent transaction ingested by `upload-rent-csv-fast.js` gets ID `rent_동탄역시범더샵센트럴시티_20260715_10_50000_0` (no `_key` field).
   - *Step 2*: The same rent transaction synced by `sync-transactions/route.ts` gets ID `RENT_시범더샵센트럴시티_202607_15_84.796_50000_10` (with `_key` field).
   - *Conclusion*: Duplicate documents exist for the same transaction, and queries reading `doc.data()._key` encounter missing/undefined values.

3. **Data Integrity Violation in `areaPyeong` (From O3)**:
   - *Premise*: `fetch-rent.js` and `fetch-transactions.js` store `areaPyeong` as *exclusive pyeong* (`area / 3.3058` = 25.7평 for 84㎡).
   - *Step 1*: `sync-transactions/route.ts` stores `areaPyeong` as *supply pyeong* (`getSupplyPyeong()` = 34평 for 84㎡).
   - *Step 2*: The UI components (`TransactionSummaryMetrics`, `TransactionChartSection`, `TimelineItemCard`) render `areaPyeong` directly assuming it represents supply/sales pyeong (분양평형).
   - *Conclusion*: Transactions written by CLI fetch scripts display incorrect 25평 instead of 34평, creating user-facing data corruption.

4. **Production Firestore Query Exceptions (From O4)**:
   - *Premise*: Firestore requires a pre-built composite index for queries combining multiple equality filters with `orderBy` on a different field, or combining `where(==)` with `where(>=)`.
   - *Step 1*: `notify-new-high/route.ts` runs `.where('dealType', '==', '매매').where('aptName', '==', aptName).where('area', '==', area).orderBy('price', 'desc')`.
   - *Step 2*: Without `firestore.indexes.json` deployed to Firebase, Firestore rejects this query with a `FAILED_PRECONDITION` index required error.
   - *Conclusion*: Real-time push notifications and batch alerts crash due to unindexed Firestore queries.

---

## 3. Caveats

- **Existing Production Firestore Data**: Existing documents already saved in Firestore may contain legacy `_key` formats (`RENT_...` without `monthlyRent` or `rent_...` lowercase). A migration cleanup script is necessary alongside code fixes to clean orphaned legacy documents.
- **External Dependency**: `fetchTypeMap()` in `sync-transactions/route.ts` attempts to fetch Google Sheets live. If Google Sheets is unavailable, it falls back to `area * 0.3025 * 1.33`. `frontend/public/data/type-map.json` should be used as the primary or robust fallback source.

---

## 4. Conclusion

The current Firestore DB upsert and transaction data pipeline contains critical data integrity vulnerabilities:
1. **Rent Key Collision**: Rent transactions with identical deposit but different monthly rent overwrite each other due to missing `monthlyRent` in `_key`.
2. **Inconsistent Document Keys**: Inconsistent document ID formats (`RENT_` vs `rent_` vs random auto-ID) cause duplicate records and missing `_key` properties.
3. **Pyeong Formula Mismatch**: Mixed exclusive vs supply pyeong calculations corrupt `areaPyeong` fields in Firestore.
4. **Missing Composite Indexes**: Missing `firestore.indexes.json` causes compound Firestore queries to fail in production.

---

## 5. Verification Method & Actionable Fix Strategies

### 5.1 Actionable Fix Strategies for Worker Implementation

#### Fix Strategy 1: Standardize `_key` & Document ID Generation
Define a single unified key generator function across all sync scripts and API routes:
- **Rent Key Formula**:
  `RENT_${normalizeAptName(aptName)}_${contractDate}_${area}_${deposit}_${monthlyRent}_${floor}`
  (Includes `monthlyRent` to prevent rent collisions, `RENT_` prefix, normalized `aptName`, and 8-digit `contractDate`).
- **Trade Key Formula**:
  `TRADE_${normalizeAptName(aptName)}_${contractDate}_${area}_${price}_${floor}` (plus `_${occurrence}` if multiple trades match on same day/floor/price/area).
- Ensure `_key` is set BOTH as the document ID (`collRef.doc(_key)`) AND in the payload (`{ ..., _key }`).

#### Fix Strategy 2: Unified `areaPyeong` Calculation & Static `type-map.json` Fallback
- Create a shared helper module `frontend/src/lib/utils/areaConverter.ts`:
  - Import `frontend/public/data/type-map.json` statically.
  - Implement `getSupplyPyeong(aptName, area)`:
    1. Match exact `aptName` and `area` in `type-map.json`.
    2. Fallback to tolerance match (< 0.11m²).
    3. Fallback to formula: `Math.round(area * 0.3025 * 1.33 * 10) / 10`.
- Update all 5 ingestion scripts (`sync-transactions/route.ts`, `fetch-rent.js`, `fetch-transactions.js`, `upload-rent-csv.js`, `upload-rent-csv-fast.js`) to use this shared utility.

#### Fix Strategy 3: Create `firestore.indexes.json` & Update `firebase.json`
- Create `firestore.indexes.json` at project root with composite indexes for `transactions`:
  - `(dealType ASC, contractDate ASC)`
  - `(dealType ASC, aptName ASC, area ASC, price DESC)`
  - `(contractYm ASC, contractDate DESC)`
- Add `"indexes": "firestore.indexes.json"` to `firebase.json`.

#### Fix Strategy 4: Refactor CSV Upload Scripts for Zero-Read Batch Upsert
- Update `upload-rent-csv.js` to use deterministic `batch.set(collRef.doc(_key), record, { merge: true })` instead of `collRef.add()` and row-by-row `dupSnap.get()` queries.

---

### 5.2 Verification Method

1. **Static Type & Lint Check**:
   ```bash
   cd frontend
   npx tsc --noEmit
   ```
2. **Key Generation Unit Test**:
   Verify that two rent records with identical `aptName`, `contractDate`, `area`, `floor`, `deposit` but different `monthlyRent` (0 vs 50) produce distinct `_key` strings.
3. **Index JSON Schema Check**:
   Validate `firestore.indexes.json` syntax and confirm link in `firebase.json`.
