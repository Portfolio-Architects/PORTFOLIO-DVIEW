# Challenger Report: Vacancy Estimation Convergence Verification

## Challenge Summary

**Overall risk assessment**: LOW

The vacancy estimation and rent smoothing algorithms in the TechnoValley dashboard API exhibit high mathematical stability, robust convergence properties, and correct time-series behavior. Through formal mathematical analysis and multi-scenario empirical simulations (up to 120 months), we verified that the model does not suffer from feedback instability or numerical oscillations. The minimum convergence floor of 2.0% is strictly and mathematically maintained across all scenarios.

We identified a minor edge case during age-based threshold transitions (where the convergence floor jumps from 2.0% to 4.0% at age 3.0), where the vacancy rate is temporarily below the *active* convergence floor, but it asymptotically adjusts to the new floor within ~10 months without overshoot or oscillation. This is an expected smoothing behavior of the Exponential Moving Average (EMA).

---

## Challenges

### [Low] Challenge 1: Temporal Delay in Convergence Floor Adaptation
- **Assumption challenged**: The convergence floor (which increases from 2.0% to 4.0% when a building's age exceeds 3.0 years) is instantly applied as a hard lower bound to the vacancy rate.
- **Attack scenario**: A highly successful building (like Silicon Alley) converges to the 2.0% vacancy floor before reaching age 3.0. In month 26 (age 3.08), the convergence floor jumps to 4.0%.
- **Blast radius**: The vacancy rate does not immediately jump to 4.0%. Instead, due to the EMA smoothing parameter $\alpha = 0.5$, it rises to 3.0% in the first month, 3.5% in the second month, and 3.75% in the third month, taking about 10 months to converge asymptotically to 4.0%. During this period, the reported vacancy rate is temporarily below the current floor $C_k = 4.0\%$.
- **Mitigation**: This behavior is benign as it prevents sudden step jumps in the user-facing charts. However, if strict instantaneous floor adherence is required, the EMA smoothing could be bypassed on the step-change month, or the floor could be applied *after* the EMA calculation rather than *before* it. Currently, it is applied as:
  $$V_{k, t} = 0.5 \times \max(C_{k, t}, V^{\text{raw}}_{k, t}) + 0.5 \times V_{k, t-1}$$
  If the max operator was applied *after* smoothing, the vacancy rate would instantly jump to 4.0%. The current behavior is more visually aesthetic for time-series charts as it avoids vertical jumps.

---

## Mathematical Stability Analysis

### 1. Rent EMA Smoothing
The rent smoothing algorithm utilizes a first-order Infinite Impulse Response (IIR) filter:
$$R_{k, t} = 0.4 \times R^{\text{avg}}_{k, t} + 0.6 \times R_{k, t-1}$$
- **BIBO Stability**: The system pole is located at $z = 0.6$. Since $|0.6| < 1$, the filter is Bounded-Input Bounded-Output (BIBO) stable. Any bounded transaction input will produce a bounded smoothed output.
- **Oscillation Profile**: Because the pole is real and positive, the step response is monotonic. It is mathematically impossible for this filter to overshoot or oscillate.
- **Noise Filtering**: A single-month outlier is dampened by 60% ($\alpha = 0.4$), and the transient decays exponentially back to the baseline at a rate of $0.6^t$, filtering out short-term market noise.

### 2. Vacancy EMA Smoothing & Dynamic Turnover Model
The vacancy estimation utilizes a non-linear first-order difference equation:
$$V_{k, t} = 0.5 \times \max(C_{k, t}, V_{k, t-1} - R_{k, t} + T_{k, t} - M_t) + 0.5 \times V_{k, t-1}$$
where $C_{k, t}$ is the convergence floor (2.0% or 4.0%), $R_{k, t} \ge 0$ is the transaction reduction, $T_{k, t} \in \{-0.5, 0.2\}$ is the turnover rate, and $M_t$ is the symmetric NPS macro adjustment.
- **Lower Bound (2.0% Floor)**: Since $C_{k, t} \ge 2.0\%$ for all $t$ and $V_{k, 0} \ge 2.0\%$, the raw vacancy term is bounded below by $2.0\%$. By induction, the smoothed vacancy rate $V_{k, t}$ can never drop below 2.0% under any input conditions (even under infinite transactions or massive positive macro adjustment).
- **Discontinuity Handling**: The step transitions in turnover rate $T_{k, t}$ (from $-0.5\%$ to $+0.2\%$ at age 2.0) and convergence floor $C_{k, t}$ (from $2.0\%$ to $4.0\%$ at age 3.0) represent step changes in parameters. In a first-order system, these parameter changes cannot induce resonance or oscillation. The system simply adjusts to the new steady state or drift rate asymptotically, as verified empirically.

---

## Stress Test Results

We executed a comprehensive simulation suite over 60–120 months to empirically stress-test the algorithm:

| Scenario | Input Conditions | Expected Behavior | Actual Behavior | Pass/Fail |
|---|---|---|---|---|
| **A: Zero Transactions** | $txWeightSum = 0$, $T_k = 0.2$, $M_t = 0.0584$ | Vacancy rate drifts upwards due to positive turnover drift ($+0.1416\%$ net per month). | Vacancy rate for SK V1 rose from 13.2% to 17.4479% over 60 months. Correct monotonic drift. | **PASS** |
| **B: Constant High Volume** | $txWeightSum = 500$, young building | Vacancy rate drops rapidly and converges to the floor without going below. | Silicon Alley vacancy dropped from 29.8% to 2.0% floor, then transitioned asymptotically to 4.0% floor after age 3.0. Minimum was strictly $\ge 2.0\%$. | **PASS** |
| **C: Alternating Spikes** | $txWeightSum \in \{1000, 0\}$ | EMA dampens high-frequency transaction shocks and prevents wild oscillations. | Vacancy rate converged smoothly: $13.2\% \to 8.6\% \to 8.67\% \to 6.34\% \to 6.41\%$. No unstable oscillation. | **PASS** |
| **D: Threshold Transitions** | Age transitions past 2.0 and 3.0 years | Smooth parameter transition without ringing or instability. | Turnover rate jump at age 2.0 was absorbed with no effect on floor. Floor jump at age 3.0 caused an asymptotic rise from 2.0% to 4.0% over 10 months. | **PASS** |
| **E: Symmetrical NPS Growth** | Extreme negative vs extreme positive growth | Symmetrical impact; negative growth increases vacancy rate. | Negative NPS macro bonus ($-0.102\%$) resulted in 15.01% vacancy at month 12; positive bonus ($+0.202\%$) resulted in 13.19%. Difference = 1.82%. | **PASS** |
| **F: Rent Step Change** | Step input from 3.5 to 5.0 | Monotonic asymptotic convergence to 5.0. | Month 1: 4.10 (40%), Month 2: 4.46 (64%), Month 5: 4.89 (92.7%). Converged asymptotically. | **PASS** |
| **G: Rent Outlier Spike** | Single spike to 7.0, then 3.5 | Dampened response, smooth decay back to 3.5. | Month 1: 4.90 (dampened), Month 2: 4.34, Month 3: 4.00, Month 5: 3.68. Correct decay. | **PASS** |

---

## Unchallenged Areas

- **Actual transaction data feeds**: The live endpoint fetches real transaction data from the MOLIT API. These simulated tests focused strictly on the mathematical processing and convergence properties of the algorithms, bypassing live network API calls since we are operating in `CODE_ONLY` network mode.
