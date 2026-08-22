# Milestone 3 Empirical Challenge Report — Challenger 2

## Verdict: APPROVE

---

## 1. Observation

### 1.1 Source Code Verification
- **rontend/src/lib/services/staticDataService.ts**:
  - Implements memoryCache with 5-minute TTL (DEFAULT_FIRESTORE_CACHE_TTL = 300000).
  - Cache key partitioning: irestore-txs- prevents cross-contamination across differing lookback intervals.
  - Graceful fallback in lines 382–391: When Firestore queries fail due to quota exhaustion, offline network partitions, or uninitialized database connections, the service catches the error, logs via logger.error, and returns previously cached transactions (cached?.data || []) without propagating uncaught exceptions to React components.
  - Versioned static JSON fetchers (etchTxSummary, etchRecentTransactions, etchMacroTrend, etchLocationScores) accept optional signal?: AbortSignal and append ?v= query parameters for cache-busting.
- **rontend/src/lib/api/apiClient.ts**:
  - ApiClientError class cleanly extends Error (lines 19–49), preserving status, code, details, awResponse, isTimeout, and isAborted properties with Object.setPrototypeOf(this, ApiClientError.prototype).
  - Exponential backoff retry loop (lines 132–136): etryDelayMs * Math.pow(2, attempt - 1) triggered only on 5xx server errors (esponse.status >= 500) and transient network rejections (etch throws TypeError).
  - Client error fail-fast: HTTP 4xx statuses (400, 401, 403, 404, 422, 429) immediately throw ApiClientError without wasteful retries.
  - Abort & timeout handling (lines 138–156, 226–244): Combines timeout timer with external signal listeners, throwing 408 TIMEOUT on timeout expiry and 499 ABORTED on cancellation.

### 1.2 Empirical Challenge Test Suite (src/__tests__/m3_challenger2_empirical.test.ts)
Created and executed 23 adversarial tests across 3 challenge domains:
- **Domain 1: Caching, TTL & Fallback Behavior (Tests 1.1–1.8)**:
  - 1.1: Verified in-memory cache hit prevents redundant Firestore queries within 5 minutes. (PASS)
  - 1.2: Verified TTL expiry after 5 minutes triggers fresh Firestore query. (PASS)
  - 1.3: Verified orceRefresh = true bypasses cache before TTL expiry. (PASS)
  - 1.4: Verified cache key partitioning across differing day ranges (30 vs 60 days). (PASS)
  - 1.5: Verified graceful fallback to cached data when subsequent Firestore queries fail. (PASS)
  - 1.6: Verified graceful empty array [] return on total uninitialized/initial failure. (PASS)
  - 1.7: Verified malformed Firestore documents are filtered/sanitized by FirestoreTransactionSchema. (PASS)
  - 1.8: Verified clearCache() clears in-memory cache completely. (PASS)
- **Domain 2: Static JSON Fetchers & Domain Calculations (Tests 2.1–2.5)**:
  - 2.1: Verified versioned fetch with AbortSignal. (PASS)
  - 2.2: Verified HTTP error throwing on non-200 static JSON response. (PASS)
  - 2.3: Verified price parser parsePriceEokToMan on boundary values (null, 0, Korean string formats). (PASS)
  - 2.4: Verified 7-day rolling volume trend calculation and color coding. (PASS)
  - 2.5: Verified monthly rent deposit conversion formula (monthlyRent * 12) / 0.055. (PASS)
- **Domain 3: ApiClient Retry, Timeout & Error Extraction (Tests 3.1–3.10)**:
  - 3.1: Verified retry on 504 server error with exponential backoff. (PASS)
  - 3.2: Verified immediate fail-fast on 400 Bad Request (0 retries). (PASS)
  - 3.3: Verified retry on transient network errors. (PASS)
  - 3.4: Verified timeout abort (408 TIMEOUT, isTimeout: true). (PASS)
  - 3.5: Verified external AbortSignal cancellation (499 ABORTED, isAborted: true). (PASS)
  - 3.6: Verified standard envelope error extraction (RATE_LIMIT_EXCEEDED, status 429, details). (PASS)
  - 3.7: Verified plain text error response handling (502 Bad Gateway). (PASS)
  - 3.8: Verified query parameter serialization (preserves 0 and false, strips null/undefined). (PASS)
  - 3.9: Verified all HTTP methods (GET, POST, PUT, PATCH, DELETE, getEnvelope). (PASS)
  - 3.10: Verified pre-instantiated singleton piClient. (PASS)

### 1.3 Objective Verification Gate Results
1. 
px tsc --noEmit: Exited with code 0 (0 errors).
2. 
pm run lint: Exited with code 0 (0 errors, 0 warnings).
3. 
px jest src/__tests__/m3_challenger2_empirical.test.ts src/lib/services/__tests__/staticDataService.test.ts src/lib/api/__tests__/apiClient.test.ts src/hooks/__tests__/useMacroTechnoData.test.ts src/hooks/__tests__/usePostDetail.test.ts src/hooks/useApartmentDetails.test.ts: 6 test suites passed, 49 tests passed (100% pass rate).
4. 
pm run build: Next.js 16.2.6 Turbopack production build succeeded (177/177 pages prerendered, 0 compilation errors, exit code 0).

---

## 2. Logic Chain

1. **Isolation & In-Memory Caching Resilience**:
   - staticDataService.ts encapsulates all client-side Firestore queries and static JSON file fetching.
   - Observation 1.2 (Tests 1.1–1.8) proves empirically that transactions fetched from Firestore are stored in memoryCache with a 5-minute TTL. Within 5 minutes, subsequent calls do not invoke Firestore getDocs(), avoiding quota exhaustion and redundant network traffic.
   - If Firestore becomes unavailable after an initial fetch, the service logs the error and returns the cached dataset, preventing UI crashes during network flakiness.
2. **Resilient HTTP Communication via piClient.ts**:
   - Observation 1.2 (Tests 3.1–3.10) proves that piClient correctly distinguishes between transient server/network errors (5xx, network drops) and permanent client errors (4xx).
   - 5xx errors and network drops are retried with exponential backoff, while 4xx errors fail immediately.
   - Request timeouts and external cancellations trigger typed ApiClientError instances with status 408 and 499 respectively, cleaning up internal timers and event listeners.
3. **Zero Regression & Production Readiness**:
   - All 4 objective verification gates (	sc, lint, jest, uild) pass cleanly without errors or warnings.

---

## 3. Caveats

- In headless unit test environments where Firebase credentials (NEXT_PUBLIC_FIREBASE_API_KEY) are intentionally not configured in .env, irebaseConfig.ts exports db = null. staticDataService handles db = null gracefully by returning [] without throwing exceptions. Unit tests simulating active Firestore queries should provide a mock db object to test query execution paths.
- No caveats regarding regressions; 100% of challenge and regression tests pass.

---

## 4. Conclusion

The Milestone 3 refactoring of staticDataService.ts and piClient.ts satisfies all architectural invariants, error resilience requirements, and layer boundary rules. Both services withstand rigorous empirical stress testing across TTL expiration, in-memory caching, offline fallback, retry resilience, timeout aborts, and typed error responses.

**Verdict: APPROVE**

---

## 5. Verification Method

To independently verify all claims:

`ash
# 1. TypeScript strict type check
npx tsc --noEmit

# 2. ESLint check
npm run lint

# 3. Challenger 2 empirical test suite (23 tests)
npx jest src/__tests__/m3_challenger2_empirical.test.ts

# 4. M3 unit and integration suites (6 suites, 49 tests)
npx jest src/__tests__/m3_challenger2_empirical.test.ts src/lib/services/__tests__/staticDataService.test.ts src/lib/api/__tests__/apiClient.test.ts src/hooks/__tests__/useMacroTechnoData.test.ts src/hooks/__tests__/usePostDetail.test.ts src/hooks/useApartmentDetails.test.ts

# 5. Production build (Turbopack)
npm run build
`
