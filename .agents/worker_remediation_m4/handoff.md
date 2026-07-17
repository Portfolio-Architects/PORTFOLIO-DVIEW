# Handoff Report

## 1. Observation
- Found that `frontend/src/components/pwa/SWRProvider.tsx` preloads `/data/location-scores.json` on line 29:
  ```typescript
  const targets = [
    '/data/location-scores.json',
  ```
- Found that `frontend/src/hooks/useStaticData.ts` queries `/data/location-scores.json` on line 486 with version suffix:
  ```typescript
  const { data, error, isLoading } = useSWR<Record<string, LocationScoreItem>>(shouldFetch ? `/data/location-scores.json?v=${BUILD_VERSION}` : null, fetcher, {
  ```
- Identified `/api/apartments-by-dong` on line 31 in `SWRProvider.tsx` inside the preloading `targets` array.
- Verified build using `npm run build` in `frontend/` (background task `task-21`), which built successfully.
- Verified E2E test execution using `npm run test:e2e` in `frontend/` (background task `task-27`), which completed with "10 passed".
- Verified ESLint execution using `npm run lint` in `frontend/` (background task `task-35`), which finished with no errors.

## 2. Logic Chain
- Preloading cache key mismatch: The static data hook `useLocationScores` in `useStaticData.ts` queries `location-scores.json` using the versioned cache key `/data/location-scores.json?v=${BUILD_VERSION}`. However, `SWRProvider.tsx` preloaded `/data/location-scores.json` without the version suffix. Therefore, the preloaded SWR cache entry is never read, resulting in a cache miss. By updating the preload key in `SWRProvider.tsx` to `/data/location-scores.json?v=${BUILD_VERSION}`, the cache keys match perfectly.
- Unnecessary preloads: `/api/apartments-by-dong` is only used on the admin dashboard page. Preloading it for all normal users wastes client resources and server bandwidth. By removing it from the `targets` array in `SWRProvider.tsx`, we avoid preloading it on general page load, while the admin page can still query it when needed.

## 3. Caveats
- Checked whether the removal of `/api/apartments-by-dong` affected other SWR synchronization logic in `SWRProvider.tsx`. It is kept in the cache serialization target check (`key.startsWith('/api/apartments-by-dong')` on line 129) so that if it is loaded by the admin, it is still serialized to localStorage correctly, preventing any issues for admin dashboard navigation.

## 4. Conclusion
- The minor caching issues have been resolved. The preload cache key now matches the static data query key for `location-scores.json`, and unnecessary preloading of `/api/apartments-by-dong` has been removed. The application compiles correctly and passes all Playwright E2E tests and lint checks.

## 5. Verification Method
- **Production Build Check**: Run `npm run build` in `frontend/` to confirm that code compile completes successfully.
- **E2E Test Execution**: Run `npm run test:e2e` in `frontend/` to confirm all Playwright E2E tests pass.
- **Verify File Content**: Inspect `frontend/src/components/pwa/SWRProvider.tsx` to confirm that lines 28-34 match:
  ```typescript
  const targets = [
    `/data/location-scores.json?v=${BUILD_VERSION}`,
    '/api/local-notices?dongtan=true',
    '/api/dashboard-init',
    '/api/macro/rates',
    '/api/macro/news?limit=40'
  ];
  ```
