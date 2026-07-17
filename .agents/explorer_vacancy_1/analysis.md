# Detailed Technical Analysis: Vacancy Estimation Algorithm

## 1. Executive Summary
This report analyzes the current vacancy estimation algorithm in the TechnoValley trend API, focusing on:
- **R1. Area-based weights (Tx Weight) & GFA scaling functions**
- **R2. National Pension Service (NPS) employment macro adjustments**

We identified critical deficiencies in the existing model:
- **Step-wise Discontinuities**: Sudden transaction weight jumps at threshold boundaries (50m² and 100m²).
- **Over-clamping of GFA**: Linear scaling clamped between `0.8` and `1.5` causes 8 out of 10 target buildings to sit on the hard limits, losing the actual resolution of the agglomeration effect.
- **Asymmetric Macro Adjustment**: The NPS growth factor ignores negative job growth (layoffs) and uses scale-sensitive arbitrary denominators.

We propose a set of continuous, sub-linear (logarithmic), and symmetric formulas to enhance the resolution and mathematical soundness of the vacancy model.

---

## 2. Codebase Context & File Roles

1. **Vacancy Logic Core**: `frontend/src/app/api/technovalley/trend/route.ts`
   - Handles API requests (`GET`) for historical and calculated trends of transaction volume, rents, and vacancy rates.
   - Iterates over months in `TARGET_MONTHS` sequentially, simulating the flow of transactions and updating building vacancy rates iteratively.

2. **NPS Local Statistics**: `frontend/src/lib/data/nps_stats.json`
   - Supplies the latest National Pension Service employment data for the Yeongcheon-dong region:
     - `companiesCount` (1,917 companies)
     - `totalEmployees` (25,257 employees)
     - `newHires` (918 hires)
     - `departures` (809 departures)

3. **Building Metadata**: `frontend/src/lib/data/yeongcheon_jisan_units.json`
   - Contains physical parameters of each building: `totalUnits`, `gfa` (Gross Floor Area), and `baselineVacancy`.

---

## 3. R1. Deep-Dive: Area-Based Weights & GFA Scaling

### Existing Weight Logic
```typescript
// Location: frontend/src/app/api/technovalley/trend/route.ts (lines 314-318)
let txWeight = 1.0;
if (tx.sizeSqM >= 100) txWeight = 1.5;
else if (tx.sizeSqM <= 50) txWeight = 0.5;
rentTxWeights[key] += txWeight;
```
*Issue*: Sudden jumps at boundaries. A transaction of `50.1 m²` has a weight of `1.0`, while `50.0 m²` has a weight of `0.5` (a 50% drop). A transaction of `99.9 m²` has a weight of `1.0`, while `100.0 m²` has a weight of `1.5` (a 50% increase).

### Existing GFA Scaling Logic
```typescript
// Location: frontend/src/app/api/technovalley/trend/route.ts (lines 371-375)
const buildingScaleFactor = Math.min(1.5, Math.max(0.8, gfa / 100000));
const finalReduction = reductionPercent * buildingScaleFactor;
```
*Issue*: With the divisor of `100,000` and bounds of `[0.8, 1.5]`, the actual scaling is extremely cramped. Let's calculate the factors for the target buildings:
- **금강 IX** (GFA 287,343 m²) $\rightarrow$ Factor `2.87` $\rightarrow$ Clamped to **`1.5`**
- **실리콘앨리** (GFA 238,615 m²) $\rightarrow$ Factor `2.38` $\rightarrow$ Clamped to **`1.5`**
- **SH타임** (GFA 42,358 m²) $\rightarrow$ Factor `0.42` $\rightarrow$ Clamped to **`0.8`**
- **더퍼스트** (GFA 58,490 m²) $\rightarrow$ Factor `0.58` $\rightarrow$ Clamped to **`0.8`**
- **SK V1** (GFA 89,300 m²) $\rightarrow$ Factor `0.89` $\rightarrow$ **`0.89`** (In range)
- **에이팩시티** (GFA 72,000 m²) $\rightarrow$ Factor `0.72` $\rightarrow$ Clamped to **`0.8`**
- **테라타워** (GFA 96,200 m²) $\rightarrow$ Factor `0.96` $\rightarrow$ **`0.96`** (In range)
- **IT타워** (GFA 38,900 m²) $\rightarrow$ Factor `0.389` $\rightarrow$ Clamped to **`0.8`**
- **메가비즈타워** (GFA 34,200 m²) $\rightarrow$ Factor `0.342` $\rightarrow$ Clamped to **`0.8`**
- **비즈타워** (GFA 33,100 m²) $\rightarrow$ Factor `0.331` $\rightarrow$ Clamped to **`0.8`**

*Result*: 80% of buildings are clustered at the extreme boundaries (`0.8` or `1.5`), making the "building-specific physical scale factor" lose all nuance between mid-size and micro-size buildings, as well as between large and massive buildings.

---

## 4. R2. Deep-Dive: NPS Macro Adjustments

### Existing NPS Stats Formula
```typescript
// Location: frontend/src/app/api/technovalley/trend/route.ts (lines 198-220)
// 1. Regional Scale Factor: based on total employee/employer size
const scaleFactor = (totalEmp / 100000) * (compCount / 10000); 

// 2. Job Growth Velocity Factor: based on net hires rate
const netHires = newHires - departures;
const jobGrowthRate = totalEmp > 0 ? (netHires / totalEmp) : 0;
const growthFactor = jobGrowthRate * 1.5; 

macroBonus = scaleFactor + Math.max(0, growthFactor);
```

### Issues Identified:
1. **Product Sensitivity**: Multiplying `(totalEmp / 100000)` by `(compCount / 10000)` causes the factor to scale quadratically with scale changes. It also uses arbitrary divisors without theoretical basis or normalizing parameters.
2. **Asymmetry**: Using `Math.max(0, growthFactor)` ignores negative growth completely. If regional employment is shrinking (departures exceed new hires), the vacancy estimation is unaffected, whereas in reality, job contraction should penalize vacancy reduction (increasing vacancy rates).
3. **Static Application**: The `macroBonus` is calculated once at startup and applied as a constant subtraction factor in every timeline month, lacking longitudinal dynamics.

---

## 5. Proposed Enhancement Strategy

### R1. Continuous Size & Sub-linear GFA Scaling
To remove threshold jumps and capture the diminishing marginal utility of building size (agglomeration effect):
1. **Continuous Weight Formula (`txWeight`)**:
   $$txWeight(S) = \begin{cases}
     0.3, & S \le 30 \\
     0.3 + \frac{S - 30}{150 - 30} \times (2.0 - 0.3), & 30 < S < 150 \\
     2.0, & S \ge 150
   \end{cases}$$
   where $S$ is `sizeSqM` (transaction size in square meters). This maps weights continuously from `0.3` (small unit) up to `2.0` (anchor unit).

2. **Logarithmic GFA Scaling Formula (`buildingScaleFactor`)**:
   $$\text{buildingScaleFactor} = \text{clamp}(0.6, 1.6, 0.70 \times \log_{10}(\text{gfa}) - 2.384)$$
   This maps buildings smoothly and monotonically without clustering:
   - **금강 IX** (GFA 287,343) $\rightarrow$ **`1.44`**
   - **실리콘앨리** (GFA 238,615) $\rightarrow$ **`1.38`**
   - **테라타워** (GFA 96,200) $\rightarrow$ **`1.11`**
   - **SK V1** (GFA 89,300) $\rightarrow$ **`1.08`**
   - **에이팩시티** (GFA 72,000) $\rightarrow$ **`1.02`**
   - **더퍼스트** (GFA 58,490) $\rightarrow$ **`0.95`**
   - **SH타임** (GFA 42,358) $\rightarrow$ **`0.85`**
   - **IT타워** (GFA 38,900) $\rightarrow$ **`0.83`**
   - **메가비즈타워** (GFA 34,200) $\rightarrow$ **`0.79`**
   - **비즈타워** (GFA 33,100) $\rightarrow$ **`0.78`**

### R2. Symmetric and Log-Normalized NPS Macro Adjustment
To ensure stability and physical soundness across growth and decline phases:
1. **Log-Normalized Scale Factor**:
   $$\text{scaleFactor} = 0.05 \times \frac{\log_{10}(\text{totalEmp})}{\log_{10}(\text{baselineEmp})} \times \frac{\log_{10}(\text{compCount})}{\log_{10}(\text{baselineComp})}$$
   where $\text{baselineEmp} = 25000$ and $\text{baselineComp} = 2000$. This prevents quadratic scaling shifts and maps cleanly around `0.05%` (equivalent to the current average).
2. **Symmetric Job Growth Factor**:
   Remove the `Math.max(0, growthFactor)` clamp, allowing the `macroBonus` to become negative (acting as a penalty to vacancy reduction during contraction).
   $$\text{growthFactor} = \frac{\text{newHires} - \text{departures}}{\text{totalEmp}} \times 2.0$$
3. **Timeline Dynamics**:
   If historical longitudinal monthly NPS data becomes available in `nps_stats.json`, the formula should compute `macroBonus` per target month dynamically. Otherwise, the static snapshot is computed and applied symmetrically.
