# Handoff Report: Vacancy Estimation Algorithm Enhancement

## 1. Observation

### Code and Logic Locations
- **Vacancy Estimation Logic file**: `frontend/src/app/api/technovalley/trend/route.ts`
- **NPS statistics data file**: `frontend/src/lib/data/nps_stats.json`
- **Building metadata file**: `frontend/src/lib/data/yeongcheon_jisan_units.json`

### Direct Code Excerpts
- **Area-based Transaction Weights** in `route.ts` (lines 314-318):
  ```typescript
  // Apply size-based heuristics (Larger areas have higher prob of actual occupancy)
  let txWeight = 1.0;
  if (tx.sizeSqM >= 100) txWeight = 1.5;
  else if (tx.sizeSqM <= 50) txWeight = 0.5;
  rentTxWeights[key] += txWeight;
  ```
- **Building GFA Scaling Factor** in `route.ts` (lines 371-375):
  ```typescript
  // 1. Building-specific physical scale factor (GFA agglomeration effect)
  // Larger buildings with rich infrastructure naturally attract and stabilize tenants faster.
  const buildingScaleFactor = Math.min(1.5, Math.max(0.8, gfa / 100000));
  const finalReduction = reductionPercent * buildingScaleFactor;
  ```
- **NPS Macro Stats Adjustment** in `route.ts` (lines 198-217):
  ```typescript
  // Load NPS Macro stats dynamically and calculate multi-factor macro market heat bonus
  let macroBonus = 0;
  try {
    const npsDbPath = path.join(process.cwd(), 'src/lib/data/nps_stats.json');
    if (fs.existsSync(npsDbPath)) {
      const npsData = JSON.parse(fs.readFileSync(npsDbPath, 'utf8'));
      const totalEmp = npsData.stats?.yeongcheonDong?.totalEmployees || 0;
      const compCount = npsData.stats?.yeongcheonDong?.companiesCount || 1;
      const newHires = npsData.stats?.yeongcheonDong?.newHires || 0;
      const departures = npsData.stats?.yeongcheonDong?.departures || 0;
      
      // 1. Regional Scale Factor: based on total employee/employer size
      const scaleFactor = (totalEmp / 100000) * (compCount / 10000); // e.g. ~0.048% reduction
      
      // 2. Job Growth Velocity Factor: based on net hires rate
      const netHires = newHires - departures;
      const jobGrowthRate = totalEmp > 0 ? (netHires / totalEmp) : 0;
      const growthFactor = jobGrowthRate * 1.5; // Scale net hiring velocity
      
      macroBonus = scaleFactor + Math.max(0, growthFactor);
    }
  ```

---

## 2. Logic Chain

1. **Step-wise weight discontinuity**: The transaction size weight (`txWeight`) uses hard thresholds of `50` and `100` sqm. Any transaction sizes close to the boundary (e.g., $99.9\text{ m}^2$ vs $100.0\text{ m}^2$) will experience a discrete jump from `1.0` to `1.5`, which creates artificial variance in the vacancy reductions between buildings.
2. **Agglomeration loss via over-clamping**: Out of 10 target buildings in the region, 8 fall outside the dynamic linear range `[80,000, 150,000]` for GFA. Large buildings like 금강 IX and 실리콘앨리 are clamped to `1.5`, while small/medium buildings like SH타임, 더퍼스트, 에이팩시티, IT타워, 메가비즈타워, and 비즈타워 are clamped to `0.8`. This leaves only 2 buildings behaving dynamically, erasing structural nuances.
3. **Logarithmic scaling solution**: By shifting to a base-10 logarithmic scaling model ($\log_{10}(GFA)$) normalized to regional bounds, all 10 buildings are mapped onto a smooth, monotonic scale factor range without hit-limit clustering.
4. **Asymmetric growth velocity**: The job growth factor uses `Math.max(0, growthFactor)`. Under economic downturns where departures > newHires, the macro adjustment remains at 0, failing to penalize vacancy reduction and capture macro contraction. A symmetric formula that allows negative macro growth values solves this.

---

## 3. Caveats

- We assumed that `nps_stats.json` remains a static region snapshot for Yeongcheon-dong. If the JSON data structure is updated in the future with dynamic monthly timestamps, the API logic will need to load them dynamically inside the loop rather than globally.
- The default fallback rent values and starting baseline vacancy rates are not modified as they are based on official local registry indices.

---

## 4. Conclusion

The vacancy estimation algorithm requires refinement in `frontend/src/app/api/technovalley/trend/route.ts` to replace step-wise weights with a continuous size-weighted interpolator, replace the linear clamped GFA factor with a log-scale factor, and make the NPS job growth factor symmetric.

---

## 5. Verification Method

- **Build/Lint test**: Run npm/pnpm lint or build command in the `frontend` directory to ensure no compilation/type errors.
- **API Response Check**: Hit the API endpoint `/api/technovalley/trend?refresh=true` (or run a test script) and verify:
  1. The vacancy trends of the target buildings decrease or adjust smoothly.
  2. The values computed remain within bounds (`Math.max(2.0, ...)` constraint is preserved).
- **Unit test or manual mock**: Mock `nps_stats.json` with a negative growth rate (e.g., `newHires: 100`, `departures: 1000`) and verify that vacancy rates increase faster or decrease slower than under positive growth rates.

---

## 6. Remaining Work (Implementation Steps for Implementer)

### Step 1: Update Transaction Size Weight Logic
Modify `frontend/src/app/api/technovalley/trend/route.ts` where `txWeight` is calculated inside `txs.forEach((tx) => { ... })`:
```typescript
// Replace:
// let txWeight = 1.0;
// if (tx.sizeSqM >= 100) txWeight = 1.5;
// else if (tx.sizeSqM <= 50) txWeight = 0.5;

// With:
const getContinuousWeight = (size: number): number => {
  const minSize = 30;
  const maxSize = 150;
  const minWeight = 0.3;
  const maxWeight = 2.0;
  if (size <= minSize) return minWeight;
  if (size >= maxSize) return maxWeight;
  return minWeight + ((size - minSize) / (maxSize - minSize)) * (maxWeight - minWeight);
};
let txWeight = getContinuousWeight(tx.sizeSqM);
```

### Step 2: Update GFA Scaling Logic
Modify `buildingScaleFactor` calculation inside `getVacancyRate` in `route.ts`:
```typescript
// Replace:
// const buildingScaleFactor = Math.min(1.5, Math.max(0.8, gfa / 100000));

// With:
const buildingScaleFactor = Math.min(1.6, Math.max(0.6, 0.70 * Math.log10(gfa) - 2.384));
```

### Step 3: Update NPS Macro Adjustment Formula
Modify the `macroBonus` calculation in `route.ts` (lines 198-217):
```typescript
// Replace the scaleFactor and growthFactor calculations:
// const scaleFactor = (totalEmp / 100000) * (compCount / 10000);
// const growthFactor = jobGrowthRate * 1.5;
// macroBonus = scaleFactor + Math.max(0, growthFactor);

// With:
const baselineEmp = 25000;
const baselineComp = 2000;
const scaleFactor = 0.05 * (Math.log10(totalEmp || 1) / Math.log10(baselineEmp)) * (Math.log10(compCount || 1) / Math.log10(baselineComp));

const growthFactor = jobGrowthRate * 2.0;
const macroBonus = scaleFactor + growthFactor; // Symmetric, allows negative values
```
