# Vacancy Estimation Algorithm Review Report

This report presents the quality and adversarial review of the enhanced hybrid vacancy estimation algorithm and its associated tests.

---

## Part 1: Quality Review

### Review Summary

**Verdict**: **APPROVE**

The implementation in `route.ts` and the configuration database `yeongcheon_jisan_units.json` successfully implement the enhanced vacancy estimation logic as requested. All 5 Jest tests passed without errors, and the full recursive self-improvement audit pipeline (`npm run audit`) succeeded, confirming TypeScript type safety, ESLint conformity, data consistency, asset sizes, and E2E integration.

---

### Findings

No critical or major findings were discovered during the quality review. The code is highly robust and conforms to best practices.

#### [Minor] Finding 1: Lack of Vacancy Upper Bound Constraint
- **What**: The calculated vacancy rate does not have an upper limit constraint.
- **Where**: `frontend/src/app/api/technovalley/trend/route.ts`, lines 417-418
- **Why**: In extreme market distress scenarios or long projection step sequences, the vacancy rate could theoretically exceed 100%.
- **Suggestion**: Add a `Math.min(100.0, ...)` constraint to the vacancy rate calculation to guarantee it never exceeds 100%.

---

### Verified Claims

- **Claim 1**: Jest unit tests run and pass.
  - Verified via: Running `npx jest src/app/api/technovalley/trend/route.test.ts` in the `frontend` folder.
  - Result: **PASS** (5 tests passed).
- **Claim 2**: Full audit pipeline (`npm run audit`) completes successfully.
  - Verified via: Running `npm run audit` in the `frontend` folder.
  - Result: **PASS** (All checks, including TypeScript type checking, ESLint hygiene, data consistency, bundle sizes, Playwright E2E tests, and Firestore billing projection, passed).
- **Claim 3**: Backward compatibility with the frontend is preserved.
  - Verified via: Direct code inspection of `TechnoValleyDashboard.tsx` and matching the returned JSON keys from `route.ts` (e.g. `'평균임대료'`, `'금강 IX'`, `'금강IX_임대료'`).
  - Result: **PASS** (Returned keys map perfectly to the dashboard requirements).

---

### Coverage Gaps

- **Memory cache invalidation** — risk level: **Low** — recommendation: **Accept Risk**.
  - The cache is in-memory and TTL is set to 10 minutes (`CACHE_TTL_MS = 600000`). For a dashboard API, this is perfectly fine.
- **File cache invalidation** — risk level: **Low** — recommendation: **Accept Risk**.
  - The local file cache at `scratch/trend-cache.json` does not have a lifetime validation check in `route.ts` when reading from the file. However, since the user can force a cache bypass using the `refresh=true` or `bypassCache=true` query parameters, any data stale issues can be manually resolved.

---

### Unverified Items

- None. All major claims and components were fully verified.

---

## Part 2: Adversarial Review

### Challenge Summary

**Overall risk assessment**: **LOW**

The vacancy estimation implementation is very resilient to atypical inputs. The logic uses robust bounds for sizes, prices, and ages.

---

### Challenges

#### [Low] Challenge 1: Absence of Hard Upper Bound on Vacancy Rate
- **Assumption challenged**: Assumes vacancy rate can never exceed 100% naturally.
- **Attack scenario**: If the input baseline vacancy is very high (e.g., 98%) and a sequence of negative NPS growth events (which subtract a negative macro bonus, effectively adding to vacancy) or natural churn is simulated, the vacancy rate can exceed 100%.
- **Blast radius**: Low. Displaying >100% vacancy rate on the charts would look physically impossible but would not crash the UI.
- **Mitigation**: Bound the final vacancy rate using `Math.min(100.0, smoothedVacancy)`.

#### [Low] Challenge 2: Future `yearBuilt` values
- **Assumption challenged**: Assumes all buildings have a `yearBuilt` <= current year.
- **Attack scenario**: If a new building is registered with a `yearBuilt` in the future (e.g., 2027), the calculated decimal age would be negative.
- **Blast radius**: Low. The implementation already guards against this by using `Math.max(0, currentDecimalYear - yearBuilt)`.
- **Mitigation**: Already mitigated in the code.

---

### Stress Test Results

- **Scenario 1**: Zero transactions in target months.
  - Expected behavior: The system should fall back to previous values of rents and respect the convergence floor for vacancy.
  - Actual behavior: Verified in Jest Test 3. Rent propagates without change, vacancy rate respects the convergence floor (>= 4.0% for older buildings).
  - Result: **PASS**
- **Scenario 2**: Extreme transaction size (e.g., 10 SqM or 1000 SqM).
  - Expected behavior: The transaction is filtered out and does not impact average rent or vacancy reduction.
  - Actual behavior: Verified by transaction outlier filter rules (`tx.sizeSqM < 15 || tx.sizeSqM > 500`).
  - Result: **PASS**
- **Scenario 3**: Negative NPS growth rate.
  - Expected behavior: Symmetrical handling of negative growth leading to higher vacancy.
  - Actual behavior: Verified in Jest Test 4. Negative growth correctly reduces the macro bonus (adds to vacancy), showing higher vacancy rates compared to positive growth.
  - Result: **PASS**
