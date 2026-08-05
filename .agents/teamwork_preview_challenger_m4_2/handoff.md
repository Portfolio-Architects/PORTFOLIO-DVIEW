# Handoff Report — Milestone 4 Frontend UI & Metrics Stress Testing

**Agent**: `teamwork_preview_challenger_m4_2`  
**Verdict**: **REJECT**  
**Working Directory**: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_challenger_m4_2`

---

## 1. Observation

### Test 1: `TransactionSummaryMetrics` Gap Cards Rendering (`실구매 필요차액`, `전세가율`)
* **Target File**: `frontend/src/components/apartment-modal/TransactionSummaryMetrics.tsx`
* **Observed Code** (Lines 132-140 & 198-199):
```typescript
132: const periodTransactions = transactions.filter(tx => {
133:   if (periodDealType === 'sale' && (tx.dealType === '전세' || tx.dealType === '월세')) return false;
134:   if (periodDealType === 'jeonse' && tx.dealType !== '전세' && tx.dealType !== '월세') return false;
...
142: let baseTx = priceTypeFilter === 'ALL'
143:   ? periodTransactions
144:   : periodTransactions.filter(tx => String(tx.area) === priceTypeFilter);
...
198: const filteredSales = baseTx.filter(tx => tx.dealType !== '전세' && tx.dealType !== '월세');
199: const filteredJeonses = baseTx.filter(tx => tx.dealType === '전세' || tx.dealType === '월세');
```
* **Observed Test Execution Output** (`npx jest src/components/apartment-modal/M4_Frontend_Stress.test.tsx`):
```text
  console.log
    Gap Card Present: false

  console.log
    Jeonse Ratio Card Present: false

FAIL src/components/apartment-modal/M4_Frontend_Stress.test.tsx
  ● Milestone 4 Frontend UI & Metrics Stress Testing › 1. TransactionSummaryMetrics Gap Cards Verification
    expect(received).toBeInTheDocument()
    Received has value: null
```
* **Finding**: `baseTx` is derived from `periodTransactions`, which filters out `전세`/`월세` when `periodDealType === 'sale'`, and filters out `매매` when `periodDealType === 'jeonse'`. Because `filteredSales` and `filteredJeonses` are computed by filtering `baseTx`, one of them is ALWAYS an empty array `[]`. Consequently, `avgSalePrice` or `avgJeonsePrice` becomes `0`, making `{metrics.avgSalePrice > 0 && metrics.avgJeonsePrice > 0}` evaluate to `false`. The gap cards ("실구매 필요차액", "전세가율") NEVER render when `월세` (or any rent) contracts exist alongside sale contracts.

---

### Test 2: `TransactionTable` Sorting (`getP(t)`)
* **Target File**: `frontend/src/components/apartment-modal/TransactionTable.tsx`
* **Observed Code** (Lines 87-95):
```typescript
87: const getP = (t: TransactionRecord) => {
88:   if (t.dealType === '월세') {
89:     return (t.deposit || 0) + Math.round((t.monthlyRent || 0) * 12 / 0.055);
90:   }
91:   if (t.dealType === '전세') {
92:     return t.deposit || t.price || 0;
93:   }
94:   return t.price || t.deposit || 0;
95: };
```
* **Empirical Calculation**:
  * Record A (`월세`: 보증금 10,000만, 월세 50만): `getP(A) = 10000 + Math.round(50 * 12 / 0.055) = 20,909만` (approx. 2.09억 deposit equivalent).
  * Record B (`전세`: 보증금 1,500만, 월세 0만): `getP(B) = 1500만`.
* **Observed Test Execution Output**:
```text
  √ ranks deposit 10,000만 + monthly 50만 higher than deposit 1,500만 + monthly 0만 when sorted by price_desc (70 ms)
```
* **Finding**: `getP(t)` correctly calculates converted deposit value for `월세` contracts and ranks Record A (`20,909만`) higher than Record B (`1,500만`) in price descending order.

---

### Test 3: `MacroDashboardClient` `rentsByMonth` Conversion
* **Target File**: `frontend/src/components/MacroDashboardClient.tsx`
* **Observed Code** (Lines 1190-1197):
```typescript
1190: if (tx.dealType === '전세' || tx.dealType === '월세') {
1191:   const depositVal = tx.dealType === '월세'
1192:     ? ((tx.deposit || 0) + Math.round((tx.monthlyRent || 0) * 12 / 0.055)) / 10000
1193:     : (tx.deposit || tx.price || 0) / 10000;
1194:   if (depositVal > 0) {
1195:     if (!rentsByMonth[key]) rentsByMonth[key] = [];
1196:     rentsByMonth[key].push(depositVal);
1197:   }
1198: }
```
* **Observed Test Execution Output**:
```text
  √ verifies rentsByMonth includes 월세 records converted to deposit equivalent (8 ms)
```
* **Finding**: `MacroDashboardClient` correctly includes `월세` records converted to deposit equivalent (`(deposit + monthly * 12 / 0.055) / 10000`) into `rentsByMonth`.

---

### Test 4: Static Type Check & Build Verification
* **TypeScript Check**: `npx tsc --noEmit`
  * Output: Exited with code `0` (100% passed without type errors).
* **Unit Tests**: `npm test`
  * Output: 49 test suites passed, 352 unit tests passed.

---

## 2. Logic Chain

1. **Step 1 (Inspection of `TransactionSummaryMetrics.tsx`)**: Lines 132-144 filter `transactions` into `periodTransactions` based on `periodDealType` state (defaulting to `'sale'`). If `periodDealType === 'sale'`, all `전세` and `월세` records are removed.
2. **Step 2 (Trace Gap Calculation)**: Lines 198-199 define `filteredSales` and `filteredJeonses` by filtering `baseTx` (which is equal to `periodTransactions`). Because `baseTx` contains only sale transactions when `periodDealType === 'sale'`, `filteredJeonses` is an empty array `[]`.
3. **Step 3 (Trace Average Computation)**: Line 222 computes `avgJeonsePrice` via `getAvgForGap(filteredJeonses, recentJeonses)`. Since both arrays are empty, `avgJeonsePrice` returns `0`.
4. **Step 4 (Trace Rendering Guard)**: Line 320 guards the gap card section with `{metrics.avgSalePrice > 0 && metrics.avgJeonsePrice > 0 && (...)}`. Since `avgJeonsePrice` is `0`, the condition evaluates to `false`.
5. **Step 5 (Empirical Reproduction)**: We wrote `src/components/apartment-modal/M4_Frontend_Stress.test.tsx` providing a dataset containing both `매매` (15억) and `월세` (1억/50만) transactions. The test confirmed that the gap cards ("실구매 필요차액", "전세가율") fail to render (`Gap Card Present: false`).
6. **Step 6 (Conclusion of Failure)**: Requirement 1 explicitly states that gap cards must not disappear when `월세` contracts exist. The implementation fails this requirement.

---

## 3. Caveats

* **Implementation Modification Constraint**: As an adversarial reviewer operating under `review-only` constraints, no source code in `src/components/apartment-modal/TransactionSummaryMetrics.tsx` was modified. The bug must be remediated by the implementer.
* **Remediation Recommendation**: In `TransactionSummaryMetrics.tsx`, `filteredSales` and `filteredJeonses` should be computed from the full `transactions` array (filtered by area and contract date if applicable), rather than from `baseTx` which has already excluded rent or sale records based on `periodDealType`.

---

## 4. Conclusion

**Verdict: REJECT**

While `TransactionTable` sorting (`getP(t)`) and `MacroDashboardClient` monthly rent conversion (`rentsByMonth`) passed empirical testing, and `npx tsc --noEmit` passed with 0 errors, `TransactionSummaryMetrics` contains a critical logic bug where `filteredSales` and `filteredJeonses` are filtered from `baseTx` (which is pre-filtered by `periodDealType`). This causes `avgJeonsePrice` or `avgSalePrice` to evaluate to `0`, preventing the gap cards ("실구매 필요차액", "전세가율") from rendering whenever `월세` or `전세` contracts are present.

---

## 5. Verification Method

To independently verify this verdict:

1. Run the empirical stress test harness:
   ```bash
   cd frontend
   npx jest src/components/apartment-modal/M4_Frontend_Stress.test.tsx
   ```
2. Inspect the test failure for Test 1:
   * Expect `expect(gapCard).toBeInTheDocument()` to fail because `gapCard` is `null`.
3. Run TypeScript type check:
   ```bash
   npx tsc --noEmit
   ```
   (Expect 0 errors).
