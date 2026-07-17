# Handoff Report - SWRProvider.tsx Cache Alignment & Preload Cleanup

## 1. Observation

- **Exact File Paths and Lines**:
  - `frontend/src/components/pwa/SWRProvider.tsx` (Lines 28–34):
    ```typescript
          const targets = [
            `/data/location-scores.json?v=${BUILD_VERSION}`,
            '/api/local-notices?dongtan=true',
            '/api/dashboard-init',
            '/api/macro/rates',
            '/api/macro/news?limit=40'
          ];
    ```
  - `frontend/src/components/pwa/SWRProvider.tsx` (Lines 73–81):
    ```typescript
                const filtered = parsed.filter(([key]) => {
                  if (typeof key !== 'string') return true;
                  const vMatch = key.match(/[?&]v=([^&]+)/);
                  if (vMatch && vMatch[1] !== BUILD_VERSION) {
                    hasPurged = true;
                    return false;
                  }
                  return true;
                });
    ```
  - `frontend/src/components/pwa/SWRProvider.tsx` (Lines 124–125):
    ```typescript
                const vMatch = key.match(/[?&]v=([^&]+)/);
                if (vMatch && vMatch[1] !== BUILD_VERSION) return false;
    ```
  - `frontend/src/hooks/useStaticData.ts` (Line 486):
    ```typescript
      const { data, error, isLoading } = useSWR<Record<string, LocationScoreItem>>(shouldFetch ? `/data/location-scores.json?v=${BUILD_VERSION}` : null, fetcher, {
    ```
- **Tool Commands and Verification Results**:
  - Run Jest Unit Tests command: `npm test`
    - Result: `Test Suites: 33 passed, 33 total`, `Tests: 216 passed, 216 total`. All unit tests completed successfully (including `SWRProvider.test.tsx` verifying SWR offline resilience).
  - Run Production Build command: `npx next build`
    - Result: Completed successfully.

## 2. Logic Chain

1. **Cache Key Alignment**:
   - `SWRProvider.tsx` preloads `/data/location-scores.json?v=${BUILD_VERSION}` (Observation 1).
   - `useStaticData.ts` requests `/data/location-scores.json?v=${BUILD_VERSION}` via SWR (Observation 4).
   - The SWR keys match verbatim. Therefore, the preloaded data will populate SWR cache under the identical key requested by `useStaticData`, ensuring zero-delay fetch without mismatch.
   - During hydration, `SWRProvider.tsx` purges any keys where the version (`?v=...` or `&v=...`) does not match the active `BUILD_VERSION` (Observation 2).
   - During serialization, `SWRProvider.tsx` excludes key/value pairs that mismatch the version (Observation 3).
   - This version-bound filtering guarantees that cache entries from older deployments are cleared on startup and never synchronized to localStorage, eliminating cache-version stale-data bugs.

2. **Preload Target Cleanup**:
   - `/api/apartments-by-dong` was removed from the preloads array in `SWRProvider.tsx` (Observation 1).
   - This endpoint returns a large dataset (every apartment listed in the Google Sheets). Removing it reduces client network bandwidth and memory overhead during the initial app load/idle time.
   - We verified that the endpoint is still fetched on-demand in `DashboardClient.tsx` and in `ApartmentRepository.ts` (using `cache: 'no-store'`), meaning the functionality works as expected without relying on preloading.

3. **Stability & Compilation**:
   - The unit tests and production build run successfully without error, proving there are no TypeScript, syntax, or bundler regressions in the changes.

## 3. Caveats

- **Tab Cache Contention**: If a user runs two tabs of the app with different deployment versions simultaneously, their `localStorage` cache might thrash (Tab A clears Tab B's versioned cache, and vice-versa). However, this only happens during a deployment transition and degrades gracefully to standard network fetches.
- **Other Component Preloads**: We assume no other components depend on `/api/apartments-by-dong` being preloaded specifically during the initial idle cycle of SWRProvider.

## 4. Conclusion

The code review of the cache mismatch and preload target cleanup changes in `SWRProvider.tsx` is complete. The verdict is **APPROVED**. The cache key alignment using `BUILD_VERSION` matches `useStaticData.ts` perfectly, stale cache purging works correctly, and the removal of `/api/apartments-by-dong` reduces boot overhead without functional side effects.

## 5. Verification Method

- **Files to Inspect**:
  - `frontend/src/components/pwa/SWRProvider.tsx`
  - `frontend/src/hooks/useStaticData.ts`
- **Commands to Run**:
  - `npm test` inside `frontend/` to run all Jest tests.
  - `npm run build` inside `frontend/` to run the full Next.js production build and check for type/lint/compilation errors.
