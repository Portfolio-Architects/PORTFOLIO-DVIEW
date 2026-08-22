# Milestone 3 (Application & Hooks Layer Refactoring) — Reviewer 1 Report

## 1. Observation

### 1.1 Decoupling of `src/hooks/useStaticData.ts` from Firestore SDK
- **File Checked**: `src/hooks/useStaticData.ts` (lines 1–205)
- **Import Analysis**:
  - `src/hooks/useStaticData.ts` contains **zero direct imports** from `firebase/firestore`, `@firebase/*`, or direct database clients.
  - Line 20–26 imports:
    ```typescript
    import {
      staticDataService,
      FirestoreTransaction,
      FirestoreTransactionSchema,
      mergeTransactions,
      mergeRecentTransactions,
      computeRecent7DaysVolume,
    } from '@/lib/services/staticDataService';
    ```
  - Static JSON data fetching is delegated to `staticDataService.fetchJson<T>(url)` (line 31).
  - Real-time Firestore transaction fetching is delegated to `staticDataService.fetchRecentTransactionsFromFirestore(30)` (line 110).
  - Merged calculations (`mergedSummary`, `mergedRecentTxs`, `mergedRecent7DaysVolume`) invoke pure domain utilities exported by `staticDataService`.
  - Lifecycle cleanup is properly implemented using `requestIdleCallback` / `setTimeout` with `isMountedRef` cancellation (lines 42–68).

### 1.2 Encapsulation in `src/lib/services/staticDataService.ts`
- **File Checked**: `src/lib/services/staticDataService.ts` (lines 1–440)
- **Firestore Operations**:
  - Encapsulates `collection`, `query`, `where`, `getDocs` from `firebase/firestore` (line 8) and `db` from `@/lib/firebaseConfig` (line 9).
  - Validates document shapes at runtime via Zod schema `FirestoreTransactionSchema` (lines 21–35).
- **In-Memory Caching & TTL**:
  - Uses `memoryCache = new Map<string, CacheEntry<unknown>>()` with `DEFAULT_FIRESTORE_CACHE_TTL = 300000` (5 minutes) (lines 48–49).
  - `fetchRecentTransactionsFromFirestore(days, forceRefresh)` returns cached data if `!forceRefresh && cached && now - cached.timestamp < DEFAULT_FIRESTORE_CACHE_TTL` (lines 342–352).
  - Provides `clearCache(): void` for cache eviction (lines 436–438).
- **Offline & Error Resilience**:
  - Checks if `db` is unavailable (`if (!db) return cached?.data || [];`, lines 354–356).
  - Wraps query execution in `try / catch`, logs errors via `logger.error`, and gracefully falls back to cached data or empty array without throwing unhandled exceptions (lines 382–391).
- **Static File Fetching & Pure Domain Helpers**:
  - `fetchJson<T>`, `fetchTxSummary`, `fetchRecentTransactions`, `fetchMacroTrend`, `fetchLocationScores` with `AbortSignal` support (lines 397–431).
  - Pure calculation functions: `formatPriceEok`, `parsePriceEokToMan`, `updateSaleAveragesWithNewTx`, `mergeTransactions`, `mergeRecentTransactions`, `computeRecent7DaysVolume` (lines 54–333).

### 1.3 Typed API Client & Consumer Hooks
- **Typed API Client**: `src/lib/api/apiClient.ts` provides typed `get`, `post`, `put`, `patch`, `delete`, `getEnvelope` with `ApiResponse<T>` support, automatic JSON serialization, `AbortSignal` cancellation, 5xx exponential backoff retries, and typed `ApiClientError`.
- **Refactored Consumer Hooks**:
  - `src/hooks/useFavorites.ts`: Replaced raw `fetch()` with `apiClient`, added `AbortController` cancellation and `isMountedRef` lifecycle guards.
  - `src/hooks/useComments.ts`: Replaced push notification and Google Indexing API `fetch()` with `apiClient.post`.
  - `src/hooks/useApartmentDetails.ts`: Replaced view tracking `fetch()` with `apiClient.post`, integrated `AbortController`, and retained `activeRequestIdRef` to reject out-of-order stale responses.
  - `src/hooks/usePostDetail.ts`: Implemented `activeRequestIdRef` guards against race conditions on rapid post selection, and typed operations for likes and comments.
  - `src/hooks/useMacroData.ts` & `src/hooks/useTechnoValleyData.ts`: Encapsulated domain fetching with `apiClient` / `staticDataService`.
  - `src/hooks/useDashboardMeta.ts` & `src/hooks/usePreloadApartmentTx.ts`: Switched search data and preload fetchers to `apiClient`.

### 1.4 Verification Command Results
All 4 verification gates were independently executed in `frontend/`:
1. `npx tsc --noEmit`:
   - Exit code: `0`
   - Output: 0 errors
2. `npm run lint`:
   - Exit code: `0`
   - Output: 0 errors, 0 warnings
3. `npm test`:
   - Exit code: `0`
   - Output: 79 test suites passed, 610 tests passed (100% pass rate)
4. `npm run build`:
   - Exit code: `0`
   - Output: Next.js 16.2.6 (Turbopack) production build completed, 177/177 static pages generated.

---

## 2. Logic Chain

1. **Decoupling Verified**: Inspection of `src/hooks/useStaticData.ts` demonstrates complete elimination of direct `firebase/firestore` imports from the React hooks layer, satisfying R1.3 (Application & Hook Layer boundary) and R2.1 (clean dependency direction: Application → Infrastructure → Domain).
2. **Encapsulation & Resilience Verified**: `src/lib/services/staticDataService.ts` centralizes Firestore queries and static JSON file fetching behind a clean service repository interface with in-memory caching (5-min TTL), Zod schema validation, and graceful offline fallback.
3. **Concurrency & Race Condition Safety Verified**: Custom hooks (`useApartmentDetails.ts`, `usePostDetail.ts`, `useFavorites.ts`, `useComments.ts`) enforce `AbortController` cleanup and `activeRequestIdRef` / `isMountedRef` guards to prevent memory leaks and out-of-order state overwrites.
4. **Zero Regressions Across All Verification Gates**: All static analysis, linting, unit/integration test suites (79 suites / 610 tests), and production Turbopack builds pass with status code 0 and zero errors.
5. **No Integrity Violations**: No hardcoded test responses, dummy facades, or shortcuts were found in source code or test suites.

---

## 3. Caveats

- In `TechnoValleyDashboard.tsx`, dynamic property indexing for Recharts series is preserved via `apiClient.get<any>`, which maintains compatibility with the charting contract.
- No caveats regarding regressions or interface breaking changes; 100% of test suites and builds pass cleanly.

---

## 4. Conclusion

**Verdict: APPROVE**

The Milestone 3 implementation cleanly decouples `src/hooks/useStaticData.ts` from direct Firestore SDK imports, encapsulates data synchronization in `src/lib/services/staticDataService.ts` with in-memory TTL caching and offline fallback, introduces a robust typed `ApiClient`, hardens custom hooks against race conditions with `AbortController`, and satisfies all 4 verification gates with zero errors.

---

## 5. Verification Method

To independently verify the implementation:

```bash
cd frontend

# 1. Type check
npx tsc --noEmit

# 2. Lint check
npm run lint

# 3. Unit and integration tests (79 suites, 610 tests)
npm test

# 4. Production build (Turbopack)
npm run build
```
