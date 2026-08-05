# Requirement R3 Handoff Report: Frontend Integration & UI Display Verification

## Executive Summary
This report presents a thorough, read-only technical investigation into Requirement R3 (Frontend Integration & UI Display Verification for Dongtan apartment sales and rent data). We located and examined all relevant frontend components (`TransactionTable`, `TransactionChartSection`, `TransactionSummaryMetrics`, `ApartmentModal`, `MacroDashboardClient`, `useApartmentDetails`, and background sync routes/scripts). 

Six major defects were identified across metric calculations, UI state synchronization, sorting, macro trend aggregation, DB key collisions, and real-time sync hooks. Detailed evidence chains, root cause analyses, and precise implementation strategies are provided below.

---

## 1. Observation

### Finding 1: `TransactionSummaryMetrics` State Desynchronization
- **File**: `frontend/src/components/apartment-modal/TransactionSummaryMetrics.tsx` (Lines 43–45, 273–276) & `frontend/src/components/ApartmentModal.tsx` (Lines 789, 2052–2059, 2128–2134)
- **Observed Behavior**:
  - `ApartmentModal.tsx` holds the master `chartType` state (`const [chartType, setChartType] = useState<'sale' | 'jeonse'>('sale');`) controlled by a SegmentedControl (`매매` / `전월세`).
  - `TransactionSummaryMetrics.tsx` maintains an independent internal state (`const [periodDealType, setPeriodDealType] = useState<'sale' | 'jeonse'>('sale');`).
  - `TransactionSummaryMetrics` does NOT receive `chartType` or `setChartType` as props, nor does it sync `periodDealType` when `chartType` changes in the parent modal.
- **Code snippet**:
  ```tsx
  // TransactionSummaryMetrics.tsx:45
  const [periodDealType, setPeriodDealType] = useState<'sale' | 'jeonse'>('sale');
  ```
  ```tsx
  // ApartmentModal.tsx:2128
  <TransactionSummaryMetrics 
    transactions={filteredTransactions} 
    apartmentName={report.apartmentName}
    typeMap={typeMap}
    filterOutliers={filterOutliers}
  />
  ```

### Finding 2: Missing Rent / Disappearing Gap & Jeonse Ratio Cards in `TransactionSummaryMetrics`
- **File**: `frontend/src/components/apartment-modal/TransactionSummaryMetrics.tsx` (Lines 49–54, 189–216, 311–338)
- **Observed Behavior**:
  1. `filteredJeonses` is strictly filtered as `tx.dealType === '전세'` (excluding `월세` transactions).
  2. `getAvgForGap` computes averages using raw `tx.price` instead of converted Jeonse price (`getTxPrice(tx)` or `tx.deposit || tx.price`).
  3. If a Jeonse record has `price: 0` (only `deposit` populated), `tx.price` evaluates to 0.
  4. In complexes with zero pure `전세` contracts in the last 6 months (but active `월세` contracts), `filteredJeonses` / `recentJeonses` is empty, setting `avgJeonsePrice = 0`.
  5. Line 311 checks `metrics.avgSalePrice > 0 && metrics.avgJeonsePrice > 0`. Because `avgJeonsePrice = 0`, the entire "실구매 필요차액 (매매-전세 갭)" and "실거래 전세가율" cards completely disappear from the UI.
- **Code snippet**:
  ```ts
  // TransactionSummaryMetrics.tsx:189-215
  const filteredSales = baseTx.filter(tx => tx.dealType !== '전세' && tx.dealType !== '월세');
  const filteredJeonses = baseTx.filter(tx => tx.dealType === '전세'); // ⚠️ EXCLUDES '월세'

  const getAvgForGap = (txs: TransactionRecord[], recentTxs: TransactionRecord[]) => {
    const targetList = recentTxs.length > 0 ? recentTxs : txs;
    return targetList.length > 0 ? targetList.reduce((sum, tx) => sum + tx.price, 0) / targetList.length : 0; // ⚠️ Uses raw tx.price
  };
  ```

### Finding 3: Inaccurate Price Sorting in `TransactionTable` for Monthly Rent
- **File**: `frontend/src/components/apartment-modal/TransactionTable.tsx` (Lines 85–104)
- **Observed Behavior**:
  - `getP(t)` extracts price for sorting. For rent contracts (`전세` or `월세`), it evaluates `t.deposit || 0`.
  - When sorting by price (`price_desc` or `price_asc`), a monthly rent transaction with deposit 1,000만 / monthly 200만 is treated as 1,000만, ranking below deposit 2,000만 / monthly 0만.
- **Code snippet**:
  ```ts
  // TransactionTable.tsx:87
  const getP = (t: TransactionRecord) => (t.dealType === '전세' || t.dealType === '월세') ? (t.deposit || 0) : t.price;
  ```

### Finding 4: Discarded Monthly Rent (`월세`) in `MacroDashboardClient`
- **File**: `frontend/src/components/MacroDashboardClient.tsx` (Lines 1184–1203)
- **Observed Behavior**:
  - `MacroDashboardClient` processes transactions to calculate monthly macro averages for `salesByMonth` and `rentsByMonth`.
  - `if (tx.dealType === '전세')` pushes `tx.deposit` into `rentsByMonth[key]`.
  - `else if (tx.dealType !== '월세')` pushes `tx.price` into `salesByMonth[key]`.
  - Monthly rent (`월세`) transactions trigger the `else` check (`tx.dealType !== '월세'` evaluates to `false`), causing all `월세` transactions to be completely dropped.
- **Code snippet**:
  ```ts
  // MacroDashboardClient.tsx:1190-1202
  if (tx.dealType === '전세') {
    const depositVal = (tx.deposit || tx.price || 0) / 10000;
    if (depositVal > 0) {
      if (!rentsByMonth[key]) rentsByMonth[key] = [];
      rentsByMonth[key].push(depositVal);
    }
  } else if (tx.dealType !== '월세') { // ⚠️ '월세' is skipped!
    const priceVal = (tx.price || 0) / 10000;
    if (priceVal > 0) {
      if (!salesByMonth[key]) salesByMonth[key] = [];
      salesByMonth[key].push(priceVal);
    }
  }
  ```

### Finding 5: Firestore Document Key Collisions for Rent in `sync-transactions/route.ts`
- **File**: `frontend/src/app/api/cron/sync-transactions/route.ts` (Line 493)
- **Observed Behavior**:
  - Rent key generation is constructed as: `key = RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${floor}`.
  - `monthlyRent` is NOT included in the key string.
  - If two rent transactions occur on the same day in the same apartment, area, floor, and deposit amount (e.g. deposit 10,000만 / monthly 50만 vs deposit 10,000만 / monthly 80만), both generate identical `_key` strings. The second transaction overwrites or is skipped as a duplicate in Firestore.
- **Code snippet**:
  ```ts
  // sync-transactions/route.ts:493
  const key = `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${floor}`;
  ```

### Finding 6: SWR Cache Revalidation & Real-Time Sync Gap
- **File**: `frontend/src/hooks/useApartmentDetails.ts` (Lines 146–166)
- **Observed Behavior**:
  - `useApartmentDetails` fetches `/tx-data/${encodeURIComponent(fileKey)}-recent.json` and `/tx-data/${encodeURIComponent(fileKey)}.json` with `dedupingInterval: 3600000` (1 hour).
  - When the background sync API (`/api/cron/sync-transactions`) adds new rent transactions to Firestore, the static JSON files on disk are not updated dynamically in real-time, and SWR has no fallback listener or query to Firestore for newly added records.

---

## 2. Logic Chain

1. **State Disconnect (`TransactionSummaryMetrics`)**:
   - `ApartmentModal` controls `chartType` (`sale` vs `jeonse`).
   - `TransactionChartSection` and `TransactionTable` re-render upon `chartType` change.
   - `TransactionSummaryMetrics` uses its own `periodDealType` state. Without prop binding or `useEffect` sync, user actions on the modal toggle (`매매` <-> `전월세`) update the chart & table, but leave the metrics table displaying stale/mismatched data.

2. **Metrics & Card Erasure (`getAvgForGap`)**:
   - In Korea real estate market, `월세` deals with high conversion ratios function as rent substitutes.
   - Excluding `월세` from `filteredJeonses` and querying raw `tx.price` instead of converted Jeonse deposit (`(deposit) + (monthlyRent * 12 / 0.055)`) yields `avgJeonsePrice = 0` whenever raw `tx.price` is missing or when only `월세` transactions exist.
   - This causes `metrics.gapPriceEok` and `jeonseRatio` checks to fail, hiding crucial financial metrics from users.

3. **Macro Trend Distortion (`MacroDashboardClient`)**:
   - Dropping `월세` transactions from `rentsByMonth` reduces sample size for monthly rent averages, distorting macro trends for complexes with high rent turnover.

4. **Data Integrity & Key Collisions (`sync-transactions/route.ts`)**:
   - Omitting `monthlyRent` from the composite document key `_key` violates key uniqueness requirements for multi-unit apartment complexes.

---

## 3. Caveats
- **Static JSON pre-rendering vs Real-time Firestore**: The site uses static JSON partitioning (`public/tx-data/*.json`) to achieve instant modal loading without Firestore quota/latency overhead. Direct client-side Firestore queries for every modal open could degrade performance and increase Firebase costs.
- **Conversion Rate Constant**: Standard Jeonse conversion rate in the codebase is set to 5.5% (`0.055`), which matches standard Korean real estate conversion practices.

---

## 4. Conclusion

Requirement R3 analysis reveals that while basic UI components for displaying rent data exist, key metric calculations, component state synchronization, sorting algorithms, and background data aggregation pipelines contain critical gaps for rent ('전세' / '월세') data. Fixing these issues will restore full accuracy and consistency across all views.

---

## 5. Verification Method & Actionable Fix Strategies for Worker

### Strategy 1: Sync `TransactionSummaryMetrics` with `chartType`
- **File**: `frontend/src/components/apartment-modal/TransactionSummaryMetrics.tsx`
- **Action**: Add `chartType` to props and update internal state via `useEffect` or controlled prop:
  ```tsx
  interface TransactionSummaryMetricsProps {
    transactions: TransactionRecord[];
    apartmentName: string;
    typeMap: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
    filterOutliers?: boolean;
    chartType?: 'sale' | 'jeonse'; // Add prop
  }

  // Inside component:
  useEffect(() => {
    if (chartType) setPeriodDealType(chartType);
  }, [chartType]);
  ```
- **File**: `frontend/src/components/ApartmentModal.tsx`
- **Action**: Pass `chartType={chartType}` to `<TransactionSummaryMetrics />`.

### Strategy 2: Fix `TransactionSummaryMetrics` Rent Metric & Gap Calculations
- **File**: `frontend/src/components/apartment-modal/TransactionSummaryMetrics.tsx`
- **Action**:
  1. Fix `getTxPrice` to handle `전세` deposit fallback:
     ```ts
     const getTxPrice = (tx: TransactionRecord) => {
       if (tx.dealType === '월세') {
         return (tx.deposit || 0) + Math.round((tx.monthlyRent || 0) * 12 / 0.055);
       }
       if (tx.dealType === '전세') {
         return tx.deposit || tx.price || 0;
       }
       return tx.price || tx.deposit || 0;
     };
     ```
  2. Include `월세` (with converted deposit) in `filteredJeonses` and use `getTxPrice(tx)` in `getAvgForGap`:
     ```ts
     const filteredJeonses = baseTx.filter(tx => tx.dealType === '전세' || tx.dealType === '월세');
     const getAvgForGap = (txs: TransactionRecord[], recentTxs: TransactionRecord[]) => {
       const targetList = recentTxs.length > 0 ? recentTxs : txs;
       return targetList.length > 0 ? targetList.reduce((sum, tx) => sum + getTxPrice(tx), 0) / targetList.length : 0;
     };
     ```

### Strategy 3: Fix Rent Sorting in `TransactionTable`
- **File**: `frontend/src/components/apartment-modal/TransactionTable.tsx`
- **Action**: Update `getP` helper to account for converted monthly rent value when sorting:
  ```ts
  const getP = (t: TransactionRecord) => {
    if (t.dealType === '월세') {
      return (t.deposit || 0) + Math.round((t.monthlyRent || 0) * 12 / 0.055);
    }
    if (t.dealType === '전세') {
      return t.deposit || t.price || 0;
    }
    return t.price || t.deposit || 0;
  };
  ```

### Strategy 4: Include Monthly Rent in `MacroDashboardClient` Aggregation
- **File**: `frontend/src/components/MacroDashboardClient.tsx`
- **Action**: Convert `월세` to Jeonse deposit value when aggregating `rentsByMonth`:
  ```ts
  if (tx.dealType === '전세' || tx.dealType === '월세') {
    const depositVal = tx.dealType === '월세'
      ? ((tx.deposit || 0) + Math.round((tx.monthlyRent || 0) * 12 / 0.055)) / 10000
      : (tx.deposit || tx.price || 0) / 10000;
    if (depositVal > 0) {
      if (!rentsByMonth[key]) rentsByMonth[key] = [];
      rentsByMonth[key].push(depositVal);
    }
  } else {
    const priceVal = (tx.price || 0) / 10000;
    if (priceVal > 0) {
      if (!salesByMonth[key]) salesByMonth[key] = [];
      salesByMonth[key].push(priceVal);
    }
  }
  ```

### Strategy 5: Fix Firestore Rent Key Uniqueness in `sync-transactions/route.ts`
- **File**: `frontend/src/app/api/cron/sync-transactions/route.ts`
- **Action**: Update `_key` generation for rent records:
  ```ts
  const key = `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${monthlyRent}_${floor}`;
  ```

### Independent Verification Method
1. **TypeScript Type Check**:
   ```bash
   npx tsc --noEmit
   ```
2. **Next.js Production Build**:
   ```bash
   npm run build
   ```
3. **Unit / Integration Tests**:
   ```bash
   npm test -- TransactionChartSection.test.tsx
   ```
