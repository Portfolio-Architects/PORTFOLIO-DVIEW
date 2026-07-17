# Challenger Report — Vacancy Estimation Stress Testing

## Challenge Summary

**Overall risk assessment**: MEDIUM

While the API route handler does not crash or throw unhandled exceptions under extreme inputs (due to safe falsy checks and a top-level try-catch block), it is vulnerable to silent data corruption. Specifically, negative NPS macro counts or invalid building metadata values propagate `NaN` (represented as `null` in JSON output) to the estimated vacancy rates and rents of the buildings. Since the API returns HTTP 200 with `success: true` and corrupted `null` values, this bypasses the ultimate fallback data mechanisms and could break the frontend visualization.

---

## Challenges

### [High] Challenge 1: NPS Stats Negative Values causing NaN macroBonus

- **Assumption challenged**: The NPS database (`nps_stats.json`) always contains positive non-zero values for `totalEmployees` and `companiesCount`.
- **Attack scenario**: A negative value is entered or synchronised for `totalEmployees` (e.g. `-500`) or `companiesCount` (e.g. `-100`).
- **Blast radius**: `Math.log10(totalEmployees || 1)` evaluates to `Math.log10(-500)`, which is `NaN`. This makes `scaleFactor` and `macroBonus` `NaN`, propagating `NaN` (stringified to `null` in JSON response) to ALL building vacancy rates across all future timeline months, corrupting the entire timeline output.
- **Mitigation**: Ensure that values passed to logarithmic functions are strictly positive:
  ```typescript
  const compCountLog = Math.max(1, compCount);
  const totalEmpLog = Math.max(1, totalEmp);
  ```

### [Medium] Challenge 2: Non-numeric yearBuilt causing NaN building age

- **Assumption challenged**: The building database (`yeongcheon_jisan_units.json`) always contains valid numeric years for `yearBuilt`.
- **Attack scenario**: A building has a non-numeric `yearBuilt` value like `"not-a-number"` or `"TBD"`.
- **Blast radius**: The building age calculation evaluates to `NaN`. This propagates `NaN` (`null`) to the vacancy rate of that specific building, breaking its timeline.
- **Mitigation**: Parse `yearBuilt` explicitly to a number before calculation:
  ```typescript
  const builtYear = Number(b.yearBuilt) || 2018;
  ```

### [Low] Challenge 3: Lack of calculation validation allows silent data corruption

- **Assumption challenged**: The top-level try-catch block is sufficient to handle calculation anomalies.
- **Attack scenario**: Calculations return `NaN` or `Infinity`.
- **Blast radius**: The route handler does not throw an exception, so it skips the `catch` block (which returns the static fallback data) and returns HTTP 200 with `success: true` containing corrupted `null` values.
- **Mitigation**: Validate the final calculated dataset. If any crucial metrics are `NaN` or `null`, trigger the fallback or log a warning and fallback gracefully.

---

## Stress Test Results

| Scenario | Input Tested | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| **Scenario 1** | Transaction sizeSqM = NaN, priceRaw = NaN | Gracefully filtered out, no crash | Safely filtered out by falsy check `!tx.priceRaw \|\| !tx.sizeSqM` | **Pass** |
| **Scenario 2** | Outlier sizes (< 15 or > 500) | Transactions filtered out | Filtered out, default rent propagates | **Pass** |
| **Scenario 3** | Negative sizeSqM or priceRaw | Transactions filtered out | Filtered out by size check and rent boundary check | **Pass** |
| **Scenario 4** | Negative NPS employees or companies | Macro bonus safely computed | Propagated `NaN` (`null`) to all vacancy rate fields | **Fail** |
| **Scenario 5** | Massive NPS counts | Logs evaluated without crashing | Valid vacancy rates calculated | **Pass** |
| **Scenario 6** | Zero NPS counts | Safe division-by-zero checks | Handled successfully (totalEmp = 0 -> growthRate = 0) | **Pass** |
| **Scenario 7** | Future built years (yearBuilt = 2030) | Age clamped to 0 | Clamped to 0 via `Math.max(0, ...)` | **Pass** |
| **Scenario 8** | Non-numeric built year ("not-a-number") | Fallback built year used | Propagated `NaN` (`null`) to vacancy rate | **Fail** |
| **Scenario 9** | Zero totalUnits | Division-by-zero avoided | Fallback totalUnits (500) triggered via `||` | **Pass** |
| **Scenario 10** | NaN GFA | Building scale factor defaults | Defaults to `50000` due to JSON parsing converting `NaN` to `null` | **Pass** |

---

## Unchallenged Areas

- **MOLIT XML Parser Errors**: The XML parser in `officeTx.service.ts` uses Cheerio and is assumed correct, but its resilience to schema changes or malformed XML was not fully challenged as the route calls mock XML upon API failure.
