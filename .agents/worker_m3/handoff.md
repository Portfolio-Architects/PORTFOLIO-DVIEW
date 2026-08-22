# Milestone 3: Application & Hooks Layer Refactoring — Handoff Report

## 1. Observation
- **Direct Firestore Leaks in Hooks**:
  - `src/hooks/useStaticData.ts` previously imported `collection`, `query`, `where`, `getDocs` directly from `firebase/firestore` and initialized database queries directly inside React custom hooks.
  - Scatterings of raw `fetch()` calls with untyped error parsing existed in `src/hooks/useFavorites.ts`, `src/hooks/useComments.ts`, `src/hooks/useApartmentDetails.ts`, `src/hooks/useDashboardMeta.ts`, `src/hooks/usePreloadApartmentTx.ts`, and `src/components/macro/TechnoValleyDashboard.tsx`.
- **Missing AbortSignal / Lifecycle Guards**:
  - Multiple asynchronous network calls lacked `AbortController` cancellation or active request tracking (`activeRequestIdRef`), risking unmounted component state updates and race conditions on rapid selection/switching.
- **Verification Outputs**:
  - `npx tsc --noEmit`: Exited with code 0 (0 errors).
  - `npm run lint`: Exited with code 0 (0 errors, 0 warnings).
  - `npm test`: 79 test suites passed, 610 tests passed (100% pass rate).
  - `npm run build`: Next.js 16.2.6 (Turbopack) production build completed successfully with SSG page prerendering (177/177 pages) and 0 compilation errors.

## 2. Logic Chain
1. **Encapsulated Static Data Repository (`src/lib/services/staticDataService.ts`)**:
   - Extracted all Firestore query operations and static JSON file fetchers (`tx-summary.json`, `recent-transactions.json`, `macro-trend.json`, `location-scores.json`) into `staticDataService`.
   - Built in-memory caching with 5-minute TTL and graceful offline/local fallback. If Firestore or network is unavailable, cached data or local state is returned without throwing uncaught exceptions.
   - Refactored `useStaticData.ts` to consume `staticDataService`, removing all direct Firebase SDK imports.
2. **Typed Client API Client (`src/lib/api/apiClient.ts`)**:
   - Created a typed `ApiClient` class and singleton `apiClient` supporting `get`, `post`, `put`, `patch`, `delete`, and `getEnvelope`.
   - Integrated support for standard `ApiResponse<T>` envelopes (`ApiSuccessResponse` and `ApiErrorResponse`), query param formatting, automatic JSON body serialization, smart body parsing, timeout management with `AbortController`, and retry resilience with exponential backoff on 5xx errors.
   - Standardized error extraction into strongly-typed `ApiClientError` instances containing HTTP status, error code, and error details.
3. **Hook Refactoring & Race Condition Prevention**:
   - `src/hooks/useFavorites.ts`: Replaced ad-hoc `fetch()` calls with `apiClient` methods. Added `AbortController` cleanup and `isMountedRef` guards to prevent memory leaks and unmounted state updates during multi-tab sync, login migration, and toggling.
   - `src/hooks/useComments.ts`: Replaced ad-hoc push notification and indexing `fetch()` calls with `apiClient.post` and mounted lifecycle checks.
   - `src/hooks/useApartmentDetails.ts`: Replaced view tracking `fetch()` with `apiClient.post`, integrated `AbortController`, and retained `activeRequestIdRef` to reject stale responses when rapidly switching apartment cards.
   - `src/hooks/usePostDetail.ts`: Created typed hook for retrieving single post details, comments, likes, and views with request cancellation and race condition defense.
   - `src/hooks/useTechnoValleyData.ts` & `src/hooks/useMacroData.ts`: Created dedicated domain hooks encapsulating TechnoValley and macroeconomic trend fetching.
   - `src/hooks/useDashboardMeta.ts` & `src/hooks/usePreloadApartmentTx.ts`: Switched all search data and preload fetchers to `apiClient`.
4. **Preservation of Interface Contracts**:
   - Preserved all hook function signatures, parameter names, return objects, and event callbacks.

## 3. Caveats
- `TechnoValleyDashboard.tsx` relies on dynamic properties for historical trend charting keys; `apiClient.get<any>` was used to preserve dynamic indexing without breaking the Recharts series.
- No caveats regarding regressions; 100% of existing and new test suites pass.

## 4. Conclusion
Milestone 3 is complete. The application and hook layer is now completely decoupled from raw Firestore queries, all custom hooks use typed data fetching via `apiClient` with proper `AbortController` cancellation and race-condition guards, and all 4 verification gates (`tsc`, `lint`, `test`, `build`) pass with 0 errors.

## 5. Verification Method
To independently verify the implementation:
```bash
# 1. Type check
npx tsc --noEmit

# 2. Lint check
npm run lint

# 3. Unit and integration tests (79 suites, 610 tests)
npm test

# 4. Production build (Turbopack)
npm run build
```
