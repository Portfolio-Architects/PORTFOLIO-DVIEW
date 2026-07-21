# Handoff Report — Reviewer M5 1

## 1. Observation

- **Target Files Inspected**:
  - `frontend/src/components/consumer/PropertyTaxCalculator.tsx`
  - `frontend/src/components/macro/RelocationTaxSimulator.tsx`
  - `frontend/src/components/consumer/AptFitFinder.tsx`
  - `frontend/src/lib/services/officeTx.service.ts`
  - `frontend/src/lib/validation/facade.schemas.ts`
  - `frontend/scripts/audit-pipeline.js`

- **Verbatim Code Evidence**:
  - **Local Education Tax**: `frontend/src/components/consumer/PropertyTaxCalculator.tsx:314`
    `const localEducationTaxRate = ownedHouses >= 3 ? 0.4 : Math.round(acqTaxRate * 0.1 * 100) / 100;`
  - **Rural Special Tax**: `frontend/src/components/consumer/PropertyTaxCalculator.tsx:318-326`
    `ownedHouses === 3` -> 0.6% (>85m²) / 0.2% (<=85m²); `ownedHouses >= 4` -> 1.0% (>85m²) / 0.4% (<=85m²); `ownedHouses < 3` -> 0.2% (>85m²) / 0% (<=85m²).
  - **Currency Rounding (`formatEokMan`)**: `frontend/src/components/consumer/PropertyTaxCalculator.tsx:395-403`
    `const rounded = Math.round(manWon);` before modulo / division.
  - **Currency Rounding (`formatKoreanPrice`)**: `frontend/src/components/macro/RelocationTaxSimulator.tsx:49-58`
    `const rounded = Math.round(valueManWon);` and handles `rounded === 0` -> `'0원'`.
  - **Fit Score Clamping Removal**: `frontend/src/components/consumer/AptFitFinder.tsx:526`
    `const matchPercentage = Math.min(99, Math.max(0, Math.round((score / 145) * 100)));`
  - **XML Parser Error Handling**: `frontend/src/lib/services/officeTx.service.ts:61-112`
    Uses Cheerio XML mode, `safeParseInt`, `safeParseFloat` with fallback values, and `OfficeTxRepo.fetchOfficeXmlFromPublicPortal` try/catch fallback to `MOCK_XML_RESPONSE`.

- **Verification Command Results**:
  - `npx tsc --noEmit` in `frontend/`: **FAILED** (exit code 1).
    ```
    src/m5_empirical_verification.test.ts(6,10): error TS2459: Module '"@/lib/services/officeTx.service"' declares 'parseOfficeXml' locally, but it is not exported.
    src/m5_empirical_verification.test.ts(6,26): error TS2459: Module '"@/lib/services/officeTx.service"' declares 'safeParseInt' locally, but it is not exported.
    src/m5_empirical_verification.test.ts(6,40): error TS2459: Module '"@/lib/services/officeTx.service"' declares 'safeParseFloat' locally, but it is not exported.
    src/m5_empirical_verification.test.ts(6,56): error TS2459: Module '"@/lib/services/officeTx.service"' declares 'formatPrice' locally, but it is not exported.
    src/m5_empirical_verification.test.ts(544,7): error TS2578: Unused '@ts-expect-error' directive.
    src/m5_empirical_verification.test.ts(546,7): error TS2578: Unused '@ts-expect-error' directive.
    ```
  - `npm test` in `frontend/`: **PASSED** (exit code 0).
    ```
    Test Suites: 40 passed, 40 total
    Tests:       278 passed, 278 total
    Snapshots:   0 total
    Time:        25.203 s
    ```

## 2. Logic Chain

1. Direct inspection of all 6 target source files confirms that feature logic (Local Education Tax fixed 0.4%, Rural Special Tax rates, integer rounding in currency formatters, dynamic 0-99% fit score range, XML parser error handling) is correctly implemented.
2. Running `npm test` succeeded across all 40 test suites (278 tests).
3. However, running `npx tsc --noEmit` failed with 6 errors because `src/m5_empirical_verification.test.ts` attempts to import unexported private functions (`parseOfficeXml`, `safeParseInt`, `safeParseFloat`, `formatPrice`) from `@/lib/services/officeTx.service` and contains stale `@ts-expect-error` directives.
4. Additionally, `m5_empirical_verification.test.ts` duplicated source code functions locally inside the test file instead of importing the actual production code.
5. In accordance with the Reviewer & Adversarial Critic guidelines, type check failures and self-certifying test structures require a verdict of `REQUEST_CHANGES` tagged as a Critical finding.

## 3. Caveats

No caveats. All specified files and test commands were thoroughly verified.

## 4. Conclusion

**Verdict**: **REQUEST_CHANGES**

Feature code logic in production components is correct, but `npx tsc --noEmit` fails due to unexported symbol imports and invalid `@ts-expect-error` directives in `src/m5_empirical_verification.test.ts`.

## 5. Verification Method

To independently verify:
1. Run `npx tsc --noEmit` in `frontend/` and confirm errors in `src/m5_empirical_verification.test.ts`.
2. Export `parseOfficeXml`, `safeParseInt`, `safeParseFloat`, and `formatPrice` in `frontend/src/lib/services/officeTx.service.ts` or update test imports.
3. Remove unused `@ts-expect-error` directives from `src/m5_empirical_verification.test.ts`.
4. Re-run `npx tsc --noEmit` and `npm test` in `frontend/`.
