# Handoff Report: Vacancy Estimation Convergence Verification

## 1. Observation
We observed and analyzed the vacancy estimation and rent smoothing algorithms in the codebase:
- **File path**: `frontend/src/app/api/technovalley/trend/route.ts`
- **Lines 105-113 (Transaction size weight)**:
  ```typescript
  const getContinuousWeight = (sizeSqM: number): number => {
    const minSize = 30;
    const maxSize = 150;
    const minWeight = 0.3;
    const maxWeight = 2.0;
    if (sizeSqM <= minSize) return minWeight;
    if (sizeSqM >= maxSize) return maxWeight;
    return minWeight + ((sizeSqM - minSize) / (maxSize - minSize)) * (maxWeight - minWeight);
  };
  ```
- **Lines 357-368 (EMA Rent smoothing)**:
  ```typescript
  const getFinalRent = (key: string): number => {
    const data = bData[key];
    const calculatedAvg = data.count > 0 ? (data.sumRent / data.count) : null;
    
    const prevRent = currentRent[key]; // initialized from last element of STATIC_HISTORICAL_DATA
    let nextRent = prevRent;
    if (calculatedAvg !== null) {
      nextRent = 0.4 * calculatedAvg + 0.6 * prevRent;
    }
    currentRent[key] = parseFloat(nextRent.toFixed(2));
    return currentRent[key];
  };
  ```
- **Lines 386-421 (EMA Vacancy smoothing, Convergence floor, Dynamic turnover, Age decay, NPS macro bonus)**:
  ```typescript
  const getVacancyRate = (key: string): number => {
    const txWeightSum = rentTxWeights[key] || 0;
    const totalUnits = BUILDING_TOTAL_UNITS[key] || 500;
    const gfa = BUILDING_GFA[key] || 50000;
    
    // 1.5 base units moved per weight, scaled against total building units
    const reductionPercent = (txWeightSum * 1.5 / totalUnits) * 100;
    
    // GFA scaling (R1) - Logarithmic scaling
    const buildingScaleFactor = Math.min(1.6, Math.max(0.6, 0.70 * Math.log10(gfa) - 2.384));
    
    // Building Age (R3)
    const b = jisanDb.find((item: any) => item.id === key) || {};
    const currentYear = Number(ym.substring(0, 4));
    const currentMonth = Number(ym.substring(4, 6));
    const currentDecimalYear = currentYear + (currentMonth - 1) / 12;
    const age = Math.max(0, currentDecimalYear - (b.yearBuilt || 2018));
    
    // Turnover Rate (R3)
    const turnoverRate = age <= 2.0 ? -0.5 : 0.2;
    
    // Time-series decay (R3)
    const decayFactor = Math.max(0.3, Math.exp(-0.15 * age));
    const finalReduction = reductionPercent * buildingScaleFactor * decayFactor;
    
    // Convergence floor (R3)
    const convergenceFloor = age > 3.0 ? 4.0 : 2.0;
    
    // EMA vacancy smoothing (R4)
    const prevVacancy = currentVacancy[key]; // initialized from BASELINE_VACANCY_2411
    const rawVacancy = Math.max(convergenceFloor, prevVacancy - finalReduction + turnoverRate - macroBonus);
    const smoothedVacancy = 0.5 * rawVacancy + 0.5 * prevVacancy;
    currentVacancy[key] = smoothedVacancy;
    
    return smoothedVacancy;
  };
  ```

We executed the existing Jest test suite:
- **Command**: `npm test -- src/app/api/technovalley/trend/route.test.ts` (run in `frontend` folder)
- **Result**:
  ```
  PASS src/app/api/technovalley/trend/route.test.ts
    Technovalley Trend API Route
      √ should return correct API response structure and backward compatibility (145 ms)
      √ should compute rents and vacancy rate under normal operation with mocked transactions (21 ms)
      √ should fall back smoothly to previous values and respect minimum floor when transaction volume is zero (19 ms)
      √ should handle negative NPS employment growth symmetrically (33 ms)
      √ should accelerate fill-up for younger buildings and apply decay for older ones (22 ms)

  Test Suites: 1 passed, 1 total
  Tests:       5 passed, 5 total
  Time:        9.25 s
  ```

We ran custom simulations in `scratch/simulate_vacancy.js`:
- Under zero transactions, vacancy rate monotonically drifted upwards without oscillation:
  - SK V1 vacancy rose from 13.2% to 17.4479% over 60 months.
- Under high transactions, vacancy rate decreased to the floor and never went below the 2.0% absolute floor:
  - Silicon Alley reached 2.0% floor, then rose to 4.0% floor after age 3.0.
- Under alternating massive spikes, EMA smoothing successfully dampened shocks, converging smoothly:
  - Vacancy: $13.20\% \to 8.60\% \to 8.67\% \to 6.34\% \to 6.41\%$.
- Rent EMA step response converged asymptotically to step input (from 3.5 to 5.0):
  - Month 1: 4.10 (40%), Month 2: 4.46 (64%), Month 5: 4.89 (92.7%), Month 10: 4.99 (99.3%).
- Rent EMA outlier spike (single month 7.0, then 3.5):
  - Month 1: 4.90 (60% dampening), Month 2: 4.34, Month 3: 4.00, Month 5: 3.68.

---

## 2. Logic Chain
1. The Rent EMA smoothing is a first-order linear difference equation $y_t = 0.4 x_t + 0.6 y_{t-1}$. Its pole is $z = 0.6$. Because the pole lies inside the unit circle ($|0.6| < 1$), the filter is BIBO stable. Because the pole is real and positive, its step response is monotonic and cannot overshoot or oscillate. This is verified by Scenario F.
2. The Vacancy EMA smoothing is $V_t = 0.5 V^{\text{raw}}_t + 0.5 V_{t-1}$, where $V^{\text{raw}}_t \ge C_{t}$. Since the minimum possible value of $C_t$ is $2.0\%$ (for age $\le 3.0$) and $V_0 \ge 2.0\%$, the state $V_t$ is lower-bounded by $2.0\%$. By induction, the vacancy rate can never drop below 2.0% under any conditions. This is verified by Scenario B.
3. Discontinuities in parameters ($T_t$ changing from $-0.5\%$ to $+0.2\%$ at age 2.0, and $C_t$ changing from $2.0\%$ to $4.0\%$ at age 3.0) represent step functions. In a first-order system, parameter step changes do not generate frequency resonance or numerical oscillation. The state $V_t$ transitions asymptotically and monotonically to the new limits, as demonstrated by Scenario D where vacancy rate rose from 2.0% to 4.0% over 10 months following the age-3 transition.
4. Hence, both algorithms are mathematically stable, converge correctly, do not exhibit oscillations, and strictly maintain the 2.0% floor.

---

## 3. Caveats
- The simulations assume monthly sequential updates. The live route uses TARGET_MONTHS (`['202501', '202505', '202509', '202511', '202601', '202605']`), which has irregular time gaps (4 months, 4 months, 2 months, 2 months, 4 months). The irregular gaps mean that building age jumps by 0.33 or 0.17 years between updates, which is correctly handled by recalculating the age $A_{k, t}$ at each month dynamically.
- The NPS statistics are loaded as a static snapshot at calculation startup and applied to all TARGET_MONTHS because longitudinal historical monthly NPS data is not present in `nps_stats.json`. If such data is added in the future, the code is structured to support dynamic macro adjustments.

---

## 4. Conclusion
The vacancy estimation and rent smoothing algorithms are mathematically stable, free of feedback loops, do not oscillate, and strictly maintain the 2.0% absolute floor. The step-change transitions at age thresholds (age 2.0 and 3.0) are safely smoothed by the EMA filters, behaving exactly as expected for first-order systems. The verdict is a clear **PASS**.

---

## 5. Verification Method
To independently verify the convergence and stability:
1. Run the test command in the `frontend` folder:
   ```bash
   npm test -- src/app/api/technovalley/trend/route.test.ts
   ```
   Ensure all 5 tests pass successfully.
2. Inspect the mathematical simulation outputs by running the node scratch script in the root directory:
   ```bash
   node scratch/simulate_vacancy.js
   ```
   Verify that:
   - Scenario A shows stable upward drift without oscillations.
   - Scenario B shows Silicon Alley vacancy rate never going below 2.0%.
   - Scenario C shows alternating spikes are successfully smoothed without ringing.
   - Scenario D shows smooth asymptotic transition from 2.0% to 4.0% after age 3.0.
   - Scenario F shows monotonic convergence of rent step input without oscillation.
   - Scenario G shows smooth exponential decay of rent outliers.
