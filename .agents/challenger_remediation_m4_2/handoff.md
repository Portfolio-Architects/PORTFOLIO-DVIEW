# Handoff Report

## 1. Observation
- In `frontend/src/components/pwa/SWRProvider.tsx` line 29:
  ```typescript
  `/data/location-scores.json?v=${BUILD_VERSION}`,
  ```
- In `frontend/src/hooks/useStaticData.ts` line 486:
  ```typescript
  const { data, error, isLoading } = useSWR<Record<string, LocationScoreItem>>(shouldFetch ? `/data/location-scores.json?v=${BUILD_VERSION}` : null, fetcher, {
  ```
- Both `SWRProvider.tsx` and `useStaticData.ts` import `BUILD_VERSION` from `src/lib/build-version.ts`:
  ```typescript
  export const BUILD_VERSION = '1784302828304'; // value updated during build time
  ```
- In `SWRProvider.tsx` lines 28-34, `/api/apartments-by-dong` is omitted from the preloading `targets` array.
- Wrote and executed Playwright E2E test `frontend/tests/swr-preload-audit.spec.ts` using `npx playwright test tests/swr-preload-audit.spec.ts`.
- The test output confirmed that exactly one request was triggered for `location-scores.json`:
  ```
  Detected location-scores requests: [ 'http://localhost:5000/data/location-scores.json?v=1784302919211' ]
  ```
- Run `npm run lint` and `npm run build` in `frontend/` directory, both finished successfully with exit code 0.

## 2. Logic Chain
- Cache Key Match: The preload target in `SWRProvider.tsx` and the query key in `useStaticData.ts` both resolve to `/data/location-scores.json?v=${BUILD_VERSION}`. Because the SWR cache keys are identical, they map to the same cached resource.
- No Duplicate Fetch: SWR's cache sharing and request deduplication mechanism ensure that the client-side hook retrieves the data directly from the SWR cache populated by the preload execution, yielding exactly 1 network request (verified via E2E test).
- Preload Elimination: Removing `/api/apartments-by-dong` from the preload array prevents it from being fetched during the background preloading phase, eliminating unnecessary bandwidth usage on general page load.

## 3. Caveats
- Service Worker caching layer (e.g. Workbox/offline strategies) was not audited for query-string-based cache busting behavior.

## 4. Conclusion
- The SWR preloading audit is complete. The key misalignment has been resolved: `/data/location-scores.json?v=${BUILD_VERSION}` matches between `SWRProvider.tsx` and `useStaticData.ts` perfectly, resulting in exactly one network fetch on load. `/api/apartments-by-dong` has been successfully removed from preload targets.

## 5. Verification Method
- **Run SWR Preload Audit Test:** Run `npx playwright test tests/swr-preload-audit.spec.ts` in `frontend/` directory to verify key matching and fetch count.
- **Run Lint & Build:** Run `npm run lint` and `npm run build` in `frontend/` directory to verify there are no compilation or style issues.
