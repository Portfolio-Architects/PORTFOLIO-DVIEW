# Handoff Report — Milestone 4 Backend Data Integrity Stress Testing

## Verdict
**REJECT**

---

## 1. Observation

### O1. `_key` Uniqueness Verification
- **Code locations**:
  - `frontend/src/app/api/cron/sync-transactions/route.ts` line 478
  - `frontend/scripts/fetch-rent.js` lines 191 & 269
  - `frontend/scripts/upload-rent-csv.js` lines 200 & 249
  - `frontend/scripts/upload-rent-csv-fast.js` lines 185 & 229
- **Formula**: `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${monthlyRent}_${floor}`
- **Empirical Execution**: Executed `test_m4_data_integrity.js` Test Group 1.
  - Record A (`monthlyRent`: 0): `RENT_시범더샵센트럴시티_202608_15_84.796_50000_0_10`
  - Record B (`monthlyRent`: 50): `RENT_시범더샵센트럴시티_202608_15_84.796_50000_50_10`
  - Result: `keyA !== keyB`. Set size = 2. No collisions observed across multiple rent amounts (0, 30, 50, 100). (PASSED)

### O2. `getSupplyPyeong` Conversion Logic
- **Code location**: `frontend/src/lib/utils/areaConverter.ts` lines 69–93
- **Data location**: `frontend/public/data/type-map.json`
- **Empirical Execution**: Executed `test_m4_data_integrity.js` Test Group 2.
  1. **Exact match**: `getSupplyPyeong("KCC스위첸아파트", 84.01)` returned `32.7` (exact match in `type-map.json`). (PASSED)
  2. **Tolerance match (< 0.11m²)**: `getSupplyPyeong("METAPOLIS", 96.25)` matched entry `96.22` (|96.25 - 96.22| = 0.03 < 0.11m²) and returned `40.8`. (PASSED)
  3. **Formula fallback**: `getSupplyPyeong("UnknownApt", 84.0)` returned `33.8` via formula `Math.round(84.0 * 0.3025 * 1.33 * 10) / 10`. `getSupplyPyeong("KCC스위첸아파트", 200.0)` returned `80.5` via formula fallback when area diff >= 0.11m². (PASSED)

### O3. XML Parsing for Korean & English Tags
- **Code location**: `frontend/src/app/api/cron/sync-transactions/route.ts` lines 458–475 and `frontend/scripts/fetch-rent.js` lines 162–185
- **Helper function**: `getTag(map, ...keys)` matching `/<([^>]+)>([^<]*)<\/\1>/g`
- **Empirical Execution**: Executed `test_m4_data_integrity.js` Test Group 3.
  - Korean XML payload (`<법정동>`, `<아파트>`, `<보증금액>`, `<월세금액>`, `<전용면적>`, `<일>`, `<층>`): parsed deposit as `50000` and monthlyRent as `50` (neither returned `0` nor `undefined`). (PASSED)
  - English XML payload (`<umdNm>`, `<aptNm>`, `<deposit>`, `<monthlyRent>`, `<excluUseAr>`, `<dealDay>`, `<floor>`): parsed deposit as `50000` and monthlyRent as `50` (neither returned `0` nor `undefined`). (PASSED)
  - Jeonse XML payload with `<월세금액> 0 </월세금액>`: parsed deposit as `45000` and monthlyRent as `0`. (PASSED)

### O4. TypeScript & Production Build Checks
- **TypeScript Check**: Ran `npx tsc --noEmit` in `frontend/`. Output: `exited with code 0` (0 errors). (PASSED)
- **Production Build (`npm run build`)**: Ran `npm run build` in `frontend/`. **FAILED (exited with code 1)**.
  - **Verbatim Error Output**:
    ```
    Turbopack build encountered 2 warnings:
    ./src/lib/utils/areaConverter.ts:9:21
    Module not found: Can't resolve '../public/data/type-map.json'

    ./src/lib/utils/areaConverter.ts:6:19
    Module not found: Can't resolve './public/data/type-map.json'

    > Build error occurred
    Error: ENOENT: no such file or directory, open 'C:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\.next\static\...\ _buildManifest.js.tmp...'
    ```

---

## 2. Logic Chain

1. **Premise**: In Milestone 4 Acceptance Criteria and Dispatch requirements, `npm run build` must pass cleanly without build errors.
2. **Step 1 (Source of Failure)**: In `frontend/src/lib/utils/areaConverter.ts` lines 1–14, `typeMapData` loading attempts nested `try...catch` fallback `require()` calls:
   ```ts
   try {
     typeMapData = require('../../../public/data/type-map.json');
   } catch {
     try {
       typeMapData = require('./public/data/type-map.json');
     } catch {
       try {
         typeMapData = require('../public/data/type-map.json');
       } catch {}
     }
   }
   ```
3. **Step 2 (Turbopack Behavior)**: Next.js Turbopack statically analyzes all `require('...')` expressions at build time regardless of runtime `try...catch` blocks.
4. **Step 3 (Module Resolution Failure)**: Relative to `frontend/src/lib/utils/areaConverter.ts`, `./public/data/type-map.json` and `../public/data/type-map.json` do not exist. Turbopack fails to resolve these missing modules during static optimization.
5. **Step 4 (Build Crash)**: The unresolved module references interrupt Next.js static asset compilation, producing `Module not found` and `ENOENT: no such file or directory` errors, causing `npm run build` to crash with exit code 1.
6. **Conclusion**: Because `npm run build` fails, the build integrity criterion is violated.

---

## 3. Caveats

- Unit tests (`_key` uniqueness, pyeong calculation, XML parsing) and TypeScript type check (`npx tsc --noEmit`) all pass successfully.
- The failure is isolated to bundler static module resolution of invalid fallback `require()` paths in `areaConverter.ts` during Next.js production build (`npm run build`).

---

## 4. Conclusion

Milestone 4 Backend Data Integrity unit/logic requirements pass empirical tests, but **production build integrity fails**. `npm run build` in `frontend/` exits with code 1 due to Turbopack module resolution errors for invalid relative `require()` paths in `frontend/src/lib/utils/areaConverter.ts`.

**Final Verdict: REJECT** (Worker must fix `areaConverter.ts` to remove non-existent relative `require()` fallback paths so Turbopack can build cleanly).

---

## 5. Verification Method

To reproduce the build failure empirically:

```bash
cd "c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend"
npm run build
```

Expected result: Process terminates with exit code 1, displaying `Module not found: Can't resolve './public/data/type-map.json'` and `Module not found: Can't resolve '../public/data/type-map.json'`.
