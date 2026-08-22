# Forensic Audit Report — Milestone 3 (Application & Hooks Layer Refactoring)

**Work Product**: Milestone 3 Codebase Modifications (`src/hooks/`, `src/lib/services/staticDataService.ts`, `src/lib/api/apiClient.ts`, `src/components/macro/TechnoValleyDashboard.tsx`, associated test suites)  
**Profile**: General Project  
**Integrity Mode**: Development Mode  
**Verdict**: **CLEAN**

---

## 1. Observation

### Implementation & Hook Files Inspected
1. `src/lib/services/staticDataService.ts` (440 lines): Encapsulated repository for Firestore real-time transaction synchronization, static JSON fetching (`tx-summary.json`, `recent-transactions.json`, `macro-trend.json`, `location-scores.json`), in-memory cache with 5-minute TTL, Zod schema validation (`FirestoreTransactionSchema`), weighted rolling averages calculation (`updateSaleAveragesWithNewTx`), deduplication (`mergeRecentTransactions`), Korean currency formatting/parsing (`formatPriceEok`, `parsePriceEokToMan`), and 7-day rolling transaction volume computation (`computeRecent7DaysVolume`).
2. `src/lib/api/apiClient.ts` (324 lines): Strongly-typed HTTP client class `ApiClient` and singleton `apiClient` supporting `get`, `post`, `put`, `patch`, `delete`, and `getEnvelope`. Features include exponential backoff retry on 5xx errors, `AbortController` timeout and cancellation signal chaining, query parameter serialization (`buildUrlWithParams`), automatic JSON body serialization, smart body parsing, standard `ApiResponse<T>` envelope unwrapping, and typed error extraction into `ApiClientError`.
3. `src/hooks/useStaticData.ts` (205 lines): Hook layer completely decoupled from raw Firestore SDK imports (`collection`, `query`, `where`, `getDocs`). Delegates all Firestore queries and JSON fetches to `staticDataService` with SWR caching, idle-callback deferral, and memoized merged summaries.
4. `src/hooks/useFavorites.ts` (354 lines): Hook managing user and guest favorites with optimistic UI updates, multi-tab storage synchronization (`dview_favorites_updated`), concurrent guest favorite migration using `Promise.allSettled`, `isMountedRef` lifecycle guards, `AbortController` cancellation, and typed backend persistence via `apiClient`.
5. `src/hooks/useComments.ts` (163 lines): Hook managing field report comments, real-time Firestore listeners via `dashboardFacade`, push notification dispatch via `apiClient.post('/api/push/notify-comment')`, Google indexing triggers, and `isMountedRef` lifecycle protection.
6. `src/hooks/useApartmentDetails.ts` (406 lines): Hook managing apartment detail views, transactional records, objective metrics, view tracking via `apiClient.post('/api/report-view')`, `activeRequestIdRef` stale-response rejection on rapid card switching, and memoized preload helpers.
7. `src/hooks/usePostDetail.ts` (179 lines): Hook managing post details, comments subscriptions, view tracking, and like toggling with active request ID race-condition guards and unmount teardown.
8. `src/hooks/useTechnoValleyData.ts` (95 lines) & `src/hooks/useMacroData.ts` (38 lines): Domain hooks encapsulating TechnoValley industrial metrics, vacancy/rent trends, knowledge industry center status (`jisan-status`), and macroeconomic trends via `apiClient` and `staticDataService`.
9. `src/hooks/useDashboardMeta.ts` (243 lines): Hook managing dashboard metadata, apartment name mapping, unit type mapping, and public rental sets with lazy fetching and request cancellation.
10. `src/hooks/usePreloadApartmentTx.ts` (90 lines): Hook and helper for resolving apartment file keys and preloading recent/full transaction JSON files via SWR and `apiClient`.

### Forensic Integrity Checks Output
1. **Hardcoded Cheats & Test Assertion Cheating**:
   - Searched `src/hooks/`, `src/lib/services/staticDataService.ts`, `src/lib/api/apiClient.ts`, and all test suites.
   - No hardcoded test returns, faked mock data shortcuts, or self-certifying dummy responses were found in production or hook code.
2. **Facade & Empty Stub Implementations**:
   - Inspected method bodies across `staticDataService.ts`, `apiClient.ts`, and custom hooks.
   - All modules implement genuine parsing, calculation, error handling, cancellation, and synchronization logic.
3. **Bypass & Suppression Directives**:
   - Zero `@ts-ignore`, `@ts-nocheck`, or `@ts-expect-error` directives in M3 code.
   - Zero `// eslint-disable` directives in M3 code.
   - Zero test skips (`it.skip`, `describe.skip`, `xit`, `xdescribe`) in M3 test files.
   - `tsconfig.json` and `eslint.config.mjs` were unmodified and maintain full strict type-checking and lint standards.

### Independent Verification Gate Results
1. **TypeScript Typecheck** (`npx tsc --noEmit`): Exited with code `0` (0 errors).
2. **ESLint Linting** (`npm run lint`): Exited with code `0` (0 errors, 0 warnings).
3. **Full Test Suite Execution** (`npm test`):
   - 84 test suites passed (84/84).
   - 710 unit and adversarial tests passed (710/710, 100% pass rate).
   - Test execution time: 54.6 seconds.
4. **Next.js Production Build** (`npm run build`):
   - Next.js 16.2.6 Turbopack production build succeeded.
   - Prerendered 177/177 static pages (SSG) with 0 compilation errors.

---

## 2. Logic Chain

1. **Layer Decoupling (Premise)**:
   - Milestone 3 required decoupling custom React hooks from direct Firestore database queries and ad-hoc `fetch()` calls.
   - `useStaticData.ts` now routes all data fetching through `staticDataService.ts` in the Infrastructure/Services layer (`src/lib/services/`).
   - `useFavorites.ts`, `useComments.ts`, `useApartmentDetails.ts`, `usePostDetail.ts`, `useTechnoValleyData.ts`, `useDashboardMeta.ts`, and `usePreloadApartmentTx.ts` now route network operations through `apiClient.ts` in the Infrastructure/API layer (`src/lib/api/`).
2. **Race-Condition & Lifecycle Hardening**:
   - `activeRequestIdRef` counters in `useApartmentDetails.ts` and `usePostDetail.ts` ensure that when a user rapidly clicks different apartments or posts, out-of-order delayed network responses for previous selections are discarded and cannot overwrite the currently selected entity.
   - `AbortController` instances in `apiClient.ts`, `useApartmentDetails.ts`, `useFavorites.ts`, and `useDashboardMeta.ts` ensure in-flight HTTP requests are cancelled on component unmount, preventing memory leaks and unmounted React state warnings.
3. **Adversarial & Empirical Validation**:
   - The adversarial challenger test suite (`src/__tests__/m3_challenger_adversarial.test.tsx`) subjected the hooks and client adapters to 5 sequential rapid switches with reverse promise resolution, in-flight component unmounting, corrupt Firestore schema payloads, and 5xx network error retries. All 17 challenger tests passed.
   - All 84 test suites (710 tests total) across the entire application passed with 0 failures under `npm test`.
4. **Conclusion**:
   - The work product satisfies all architectural invariants, contract requirements, and verification criteria with authentic logic and zero integrity violations.

---

## 3. Caveats

- In `TechnoValleyDashboard.tsx`, dynamic property indexing for dynamic Recharts series keys uses `apiClient.get<any>` to preserve compatibility with variable chart series names without requiring rigid key enumerations.
- No caveats regarding regressions; 100% of static checks, test suites, and production build pipelines pass without error.

---

## 4. Conclusion

**Verdict: CLEAN**

Milestone 3 (Application & Hooks Layer Refactoring) exhibits genuine, high-quality implementation:
- Raw Firestore queries and scatterings of ad-hoc `fetch()` calls have been eliminated from the custom hook layer.
- `staticDataService.ts` and `apiClient.ts` provide robust infrastructure services with caching, retry resilience, cancellation, and validation.
- All 4 objective verification gates (`tsc`, `lint`, `test`, `build`) pass with 0 errors.

---

## 5. Verification Method

To independently reproduce and verify all forensic audit results:

```bash
# 1. Strict TypeScript type check
cd frontend
npx tsc --noEmit

# 2. Strict ESLint validation
npm run lint

# 3. Complete test suite (84 test suites, 710 unit & adversarial tests)
npm test

# 4. Production build (Turbopack SSG prerender 177/177 pages)
npm run build
```
