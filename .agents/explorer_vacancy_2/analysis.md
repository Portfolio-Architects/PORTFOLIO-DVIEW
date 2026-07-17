# Analysis Report: Vacancy Estimation Algorithm (R3 & R4)

## Executive Summary
This report analyzes the existing Dongtan Techno Valley average vacancy estimation algorithm inside `frontend/src/app/api/technovalley/trend/route.ts` and proposes a comprehensive enhancement strategy for:
- **R3**: Building age (준공 연도) integration and dynamic turnover/decay models.
- **R4**: Outlier filtering and fallback smoothing using Exponential Moving Average (EMA).

---

## 1. Direct Observations & Code Analysis

### A. Location of Vacancy Estimation Logic
- **API Endpoint**: `frontend/src/app/api/technovalley/trend/route.ts`
- **Building Metadata Source**: `frontend/src/lib/data/yeongcheon_jisan_units.json`
- **NPS Macro Stats Source**: `frontend/src/lib/data/nps_stats.json`
- **Transaction Data Source**: `getOfficeTransactions` service defined in `frontend/src/lib/services/officeTx.service.ts`

### B. Existing Building Age (준공 연도) Calculation (R3)
- **Metadata Limitations**: The JSON database `yeongcheon_jisan_units.json` does **not** contain any constructed/completion year (`yearBuilt`) field.
- **Hardcoded Logic**: In `route.ts` (lines 376-382), building age is simulated statically by hardcoding building keys and a timeline boundary:
  ```typescript
  let turnoverRate = 0.2; // base +0.2% vacancy increase (turnover)
  if (['실리콘앨리', '금강 IX'].includes(key) && Number(ym) < 202601) {
     // Younger phase: filling up naturally faster
     turnoverRate = -0.5;
  }
  ```
  *Issue*: This logic is not scalable, does not dynamically compute age as the timeline shifts, and fails to generalize to other buildings.

### C. Existing Transaction Filtering & Zero-Transaction Handling (R4)
- **Transaction Filtering**: The algorithm filters transactions solely on the presence of `priceRaw` and `sizeSqM` (line 255):
  ```typescript
  if (!tx.priceRaw || !tx.sizeSqM) return;
  ```
  There is **no transaction-level outlier filtering** for abnormal sizes (e.g., storage units, massive whole-floor sales) or abnormal rent values.
- **Sanity Bounds & Fallback**: The only bounds checking is applied at the *aggregated building level* (lines 340-345):
  ```typescript
  if (calculatedAvg !== null && calculatedAvg >= 2.5 && calculatedAvg <= 5.5) {
    return calculatedAvg;
  }
  return fallback;
  ```
  *Issue*: A single outlier transaction can corrupt the entire month's average, forcing the system to discard calculated results and fall back to the static `FALLBACK_RENT_MAP`.
- **Zero-Transaction Handling**:
  - For **Rent**: It defaults to a static fallback `FALLBACK_RENT_MAP[ym]?.[key] || 3.5`.
  - For **Vacancy**: It calculates `finalReduction = 0`. The vacancy is updated as:
    ```typescript
    const estimatedVacancy = Math.max(2.0, currentVacancy[key] - finalReduction + turnoverRate - macroBonus);
    ```
    *Issue*: There is no temporal smoothing (e.g., EMA) applied. The vacancy rate jumps abruptly in high-transaction months and stays stagnant or shifts by fixed steps in zero-transaction months, leading to choppy trendlines.

---

## 2. Proposed Enhancement Strategy

### A. Dynamic Building Age & Turnover Model (R3)
1. **Extend Database Schema**:
   Add `yearBuilt` (number) to all buildings in `yeongcheon_jisan_units.json`.
   *Suggested Values*:
   - `'금강 IX'`: 2021
   - `'실리콘앨리'`: 2023
   - `'SH타임'`: 2018
   - `'더퍼스트'`: 2018
   - `'SK V1'`: 2019
   - `'에이팩시티'`: 2017
   - `'테라타워'`: 2020
   - `'IT타워'`: 2017
   - `'메가비즈타워'`: 2019
   - `'비즈타워'`: 2018
   - `'우미뉴브'`: 2022
   - `'더블유스페이스'`: 2023
   - `'이든앤스페이스'`: 2023

2. **Calculate Dynamic Building Age**:
   In the monthly loop of `route.ts`, parse the current timeline year from `ym`:
   ```typescript
   const currentYear = Math.floor(Number(ym) / 100);
   const buildingAge = Math.max(0, currentYear - yearBuilt);
   ```

3. **Dynamic Turnover Rate & Decay Factor**:
   Replace the hardcoded conditional block with a function of `buildingAge`:
   - **Turnover Rate (`turnoverRate`)**:
     - `buildingAge === 0` (New construction): `-0.8%` (High initial absorption rate)
     - `buildingAge === 1`: `-0.6%`
     - `buildingAge === 2`: `-0.4%`
     - `buildingAge > 2` (Established): `+0.2%` (Standard tenant turnover)
   - **Time-Series Decay Factor (`decayFactor`)**:
     Older buildings are stabilized; transaction volume has a smaller relative impact on reducing vacancy.
     ```typescript
     const decayFactor = buildingAge <= 2 ? 1.0 : Math.max(0.3, Math.exp(-0.15 * (buildingAge - 2)));
     const finalReduction = reductionPercent * buildingScaleFactor * decayFactor;
     ```

4. **Dynamic Frictional Vacancy Floor (`convergenceFloor`)**:
     Older buildings experience higher frictional vacancy (lease gaps).
     ```typescript
     const convergenceFloor = buildingAge <= 2 ? 2.0 : Math.min(5.0, 3.0 + (buildingAge - 2) * 0.5);
     ```

---

### B. Outlier Filtering & Fallback Smoothing (R4)
1. **Transaction-Level Outlier Filter**:
   Apply size and rent-per-pyeong filters during the loop:
   ```typescript
   // 1. Size bounds (filter out tiny storage units or massive blocks)
   if (tx.sizeSqM < 15 || tx.sizeSqM > 500) return;

   // 2. Rent per pyeong sanity check
   const pyeong = tx.sizeSqM / 3.3058;
   const pricePerPyeong = tx.priceRaw / pyeong;
   const calculatedRent = (pricePerPyeong * 0.035) / 12;
   if (calculatedRent < 1.5 || calculatedRent > 8.0) return;
   ```

2. **Rent EMA Smoothing**:
   Ensure rent transitions smoothly even in months with zero transactions or out-of-bound averages:
   - For each building `key` and month `t`:
     - If `count > 0` and the raw average `calculatedAvg` is valid, set `R_actual = calculatedAvg`.
     - If `count === 0` or invalid, set `R_actual = 0.7 * R_prev + 0.3 * R_static` (where `R_static` is the static fallback rent for that month).
     - Apply EMA:
       $$R_{smooth, t} = \alpha \cdot R_{actual} + (1 - \alpha) \cdot R_{smooth, t-1}$$
       *(Recommended $\alpha = 0.4$)*

3. **Vacancy EMA Smoothing**:
   Dampen high-frequency volatility in vacancy rate estimations:
   - Calculate raw vacancy for the month:
     $$V_{calc, t} = \max(convergenceFloor, V_{smooth, t-1} - finalReduction + turnoverRate - macroBonus)$$
   - Apply EMA:
     $$V_{smooth, t} = \beta \cdot V_{calc, t} + (1 - \beta) \cdot V_{smooth, t-1}$$
     *(Recommended $\beta = 0.5$)*
   - Store $V_{smooth, t}$ back into `currentVacancy[key]`.

---

## 3. Backward Compatibility
- The proposed changes only modify the *internal calculation logic* within `route.ts` and add metadata to `yeongcheon_jisan_units.json`.
- The JSON response payload structure (`date`, building keys, building rent keys, and `평균임대료`) will remain exactly identical, preserving complete backward compatibility with the frontend charts and layout components.
