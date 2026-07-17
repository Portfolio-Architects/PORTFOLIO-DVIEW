# Handoff Report: Vacancy Estimation Algorithm (R3 & R4)

## 1. Observation
- **Observation 1 (File Path & Database Source)**: The file `frontend/src/app/api/technovalley/trend/route.ts` imports building metadata dynamically from `src/lib/data/yeongcheon_jisan_units.json` (relative to the active runtime path) on lines 184-185:
  ```typescript
  const jisanDbPath = path.join(process.cwd(), 'src/lib/data/yeongcheon_jisan_units.json');
  const jisanDb = JSON.parse(fs.readFileSync(jisanDbPath, 'utf8'));
  ```
- **Observation 2 (Building Age Simulation)**: In `frontend/src/lib/data/yeongcheon_jisan_units.json`, there are no fields representing building age or completion year (e.g., `yearBuilt`). Instead, `route.ts` hardcodes the building age simulation on lines 376-382:
  ```typescript
  let turnoverRate = 0.2; // base +0.2% vacancy increase (turnover)
  if (['실리콘앨리', '금강 IX'].includes(key) && Number(ym) < 202601) {
     // Younger phase: filling up naturally faster
     turnoverRate = -0.5;
  }
  ```
- **Observation 3 (Filtering & Bounds Checking)**: Transactions are loaded via the `getOfficeTransactions` service and filtered on line 255:
  ```typescript
  if (!tx.priceRaw || !tx.sizeSqM) return;
  ```
  No outlier controls exist for individual transaction sizes or calculated rents. Sanity filtering is performed only on the monthly building average on lines 341-344:
  ```typescript
  if (calculatedAvg !== null && calculatedAvg >= 2.5 && calculatedAvg <= 5.5) {
    return calculatedAvg;
  }
  return fallback;
  ```
- **Observation 4 (Zero-Transaction & Fallbacks)**: Rents default directly to `FALLBACK_RENT_MAP[ym]?.[key]` when `calculatedAvg` is out of bounds or when transaction count is zero. There is no moving average or exponential smoothing for vacancy rate or rent; calculations apply raw changes directly per month.

---

## 2. Logic Chain
- **Step 1 (Dynamic Building Age)**: Since the database file `yeongcheon_jisan_units.json` does not store constructed year data (Observation 2), and the API route relies on a hardcoded list of keys and dates (Observation 2), the system cannot scale or dynamically determine a building's age. Therefore, we must add a `yearBuilt` field to `yeongcheon_jisan_units.json` and calculate `buildingAge = Math.max(0, currentYear - yearBuilt)` dynamically.
- **Step 2 (Dynamic Turnover and Decay)**: By utilizing the computed building age, we can replace the static turnover rate model (Observation 2) with a mathematical model that maps age to initial tenant absorption (e.g., negative turnover rate for age $\le 2$ years) and established tenant churn (e.g., $+0.2\%$ for age $> 2$). A time-series decay factor `decayFactor = Math.max(0.3, Math.exp(-0.15 * age))` can be applied to scale down transaction impacts in older, stabilized buildings. A dynamic frictional vacancy floor `convergenceFloor` can prevent established building vacancies from dropping below realistic bounds (e.g., $4.0\%$ or $5.0\%$).
- **Step 3 (Outlier Resilience)**: Currently, the system lacks transaction-level filtering (Observation 3). Single abnormal transactions can corrupt the average, triggering the monthly building fallback (Observation 3). Implementing size bounds (`15 <= sizeSqM <= 500`) and rent per pyeong sanity bounds (`1.5 <= rent <= 8.0`) at the transaction level resolves this fragility.
- **Step 4 (Smoothing)**: Sudden jumps in rent or vacancy occur because there is no temporal smoothing (Observation 4). Implementing an Exponential Moving Average (EMA) for both calculated rents ($\alpha = 0.4$) and vacancy rates ($\beta = 0.5$) guarantees smooth, continuous trends and realistic interpolation during zero-transaction months.

---

## 3. Caveats
- **Assumption on Completion Years**: The construction/completion years of the Dongtan buildings (e.g., 2021 for 금강 IX, 2023 for 실리콘앨리) are mapped based on historical property registers. Other buildings not specified are estimated based on Dongtan Techno Valley's development timeline (e.g., 2017-2019).
- **Public Data Key Fallback**: The repository falls back to `MOCK_XML_RESPONSE` if API keys are missing. The mock responses contain transactions for '금강펜테리움 IX타워', '현대 실리콘앨리 동탄', '동탄 IT타워', and 'SH타임스퀘어'.
- **Test Scope**: This investigation is strictly read-only and does not implement the proposed algorithms. Implementation will be handled by the implementer agent.

---

## 4. Conclusion
The current vacancy estimation logic lacks a robust time-series framework, relying on hardcoded building tags and fragile monthly boundaries. Refactoring the system to:
1. Fetch and calculate dynamic building age based on a `yearBuilt` database attribute.
2. Scale turnover rates, decay factors, and vacancy floors according to building age.
3. Filter outlier transactions at the input level to protect monthly averages.
4. Smooth rents and vacancy rates using EMA (particularly in zero-transaction periods).

will satisfy R3 and R4 while maintaining full backward compatibility with the frontend.

---

## 5. Verification Method
1. **Source Inspection**: Use `view_file` to inspect `frontend/src/app/api/technovalley/trend/route.ts` and verify that the hardcoded turnover logic and monthly average fallbacks exist as described.
2. **Database Verification**: Open `frontend/src/lib/data/yeongcheon_jisan_units.json` to verify the lack of `yearBuilt` metadata.
3. **Execution & Build Check**:
   Once implemented, verification should run:
   - `npm run test` (to confirm Jest unit tests validate the vacancy estimation calculations).
   - `npm run audit` (to verify that the compilation, ESLint, and build pipeline passes).
