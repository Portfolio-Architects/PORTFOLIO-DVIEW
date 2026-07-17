# Handoff Report — Vacancy Estimation Stress Testing

## 1. Observation

- **Target File**: `frontend/src/app/api/technovalley/trend/route.ts`
- **Anomalous sections**:
  - **Lines 210-231** (Macro stats log scale calculation):
    ```typescript
    const totalEmp = npsData.stats?.yeongcheonDong?.totalEmployees || 0;
    const compCount = npsData.stats?.yeongcheonDong?.companiesCount || 1;
    ...
    const scaleFactor = 0.05 * (Math.log10(totalEmp || 1) / Math.log10(baselineEmp)) * (Math.log10(compCount || 1) / Math.log10(baselineComp));
    ```
  - **Lines 397-402** (Building age calculation):
    ```typescript
    const b = jisanDb.find((item: any) => item.id === key) || {};
    ...
    const age = Math.max(0, currentDecimalYear - (b.yearBuilt || 2018));
    ```
- **Test execution commands**:
  - Custom challenge harness: `npx jest src/app/api/technovalley/trend/route.challenge.test.ts`
  - Full test command: `npm test`
- **Output from tests**:
  - Negative NPS stats values caused `null` (NaN) values to propagate to all estimated vacancy rates:
    ```json
    Negative NPS output sample: {
      date: '25.01',
      '금강 IX': null,
      '실리콘앨리': null,
      ...
    }
    ```
  - Non-numeric `yearBuilt` metadata caused vacancy rate calculations to fail with `null` (NaN) for that building:
    ```json
    NaN yearBuilt output sample: null
    ```
  - Transaction outlier filtration (`!tx.priceRaw || !tx.sizeSqM`) correctly intercepted `NaN` prices/sizes, returning valid data.

---

## 2. Logic Chain

1. **Negative NPS inputs**:
   - `totalEmployees` in `nps_stats.json` can be negative if database sync contains negative values.
   - When `totalEmployees = -500`, `totalEmp || 1` evaluates to `-500` (since `-500` is truthy).
   - This leads to `Math.log10(-500)` which returns `NaN`.
   - `macroBonus` thus becomes `NaN`, causing all vacancy calculations across all months/buildings to become `NaN` and be serialized as `null` in the API response.
2. **Non-numeric yearBuilt inputs**:
   - If `yearBuilt` is a non-numeric string (e.g. `"not-a-number"`), `currentDecimalYear - (b.yearBuilt || 2018)` becomes `NaN`.
   - `Math.max(0, NaN)` returns `NaN`.
   - Therefore, `age` is `NaN`, making `decayFactor` and the subsequent calculated vacancy rate `NaN`, outputting `null`.
3. **Graceful fallbacks**:
   - Zero or negative transaction values are correctly filtered by size and rent boundary checks (`calculatedRent < 1.5 || calculatedRent > 8.0` and `sizeSqM < 15 || sizeSqM > 500`).
   - If `totalUnits` is `0`, the fallback `totalUnits || 500` is triggered because `0` is falsy, preventing a division-by-zero crash.
   - If `gfa` is `NaN` or `null`, `gfa || 50000` evaluates to `50000`, preventing a logarithmic domain crash.

---

## 3. Caveats

- We assumed that database fields like `totalEmployees` or `yearBuilt` could be modified or corrupted. If upstream synchronization guarantees strict positive integers, these failure modes won't occur in production, but they remain risks.
- We did not challenge the underlying MOLIT OpenAPI response schema or XML parser (`officeTx.service.ts`) behavior under network timeouts.

---

## 4. Conclusion

The vacancy estimation route handler is mathematically robust against transaction outliers (prices, sizes, division-by-zero) but is highly vulnerable to data corruption from database files (`nps_stats.json` and `yeongcheon_jisan_units.json`). Unsanitized negative employee/company counts or non-numeric completion years will propagate `NaN` (`null`) silently to the output API response instead of triggering the built-in static fallbacks.

---

## 5. Verification Method

- **Command**: Run `npx jest src/app/api/technovalley/trend/route.challenge.test.ts` inside the `frontend` directory.
- **Files to inspect**:
  - `frontend/src/app/api/technovalley/trend/route.challenge.test.ts` (the challenge harness file).
  - `frontend/.agents/challenger_vacancy_1/challenger_report.md` (detailed report).
- **Invalidation conditions**:
  - If tests fail, it means the code has changed or environment lacks required dependencies.
  - If the output values do not propagate `null` under negative NPS or NaN build year, the bug may have been fixed.
