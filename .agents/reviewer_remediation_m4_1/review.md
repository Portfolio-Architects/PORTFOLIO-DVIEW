# Code Review Report - SWRProvider.tsx Cache Alignment & Preload Cleanup

## Review Summary

**Verdict**: APPROVED

This review assesses the cache key alignment and preload target cleanup implemented in `SWRProvider.tsx` and its integration with `useStaticData.ts`. Based on codebase analysis, unit testing, and production build execution, the remediation is correct, safe, and robust.

---

## Findings

No major issues or integrity violations were detected. Below are minor observations regarding performance optimizations.

### [Minor] Finding 1: Key Format Consistency across Components
- **What**: Difference in query parameters for `/api/local-notices` and `/api/macro/news` between components.
- **Where**: `SWRProvider.tsx` (lines 30, 33), `NewsClient.tsx` (lines 177, 188) vs `LoungeContainerClient.tsx` (lines 208, 214).
- **Why**: `SWRProvider.tsx` preloads `/api/local-notices?dongtan=true` and `/api/macro/news?limit=40` (aligned with `NewsClient.tsx`). However, `LoungeContainerClient.tsx` queries SWR using keys without query params (`/api/local-notices` and `/api/macro/news`), meaning they do not share the preloaded cache entries.
- **Suggestion**: This is a minor issue because `LoungeContainerClient.tsx` utilizes SSR-injected `fallbackData`, rendering the lack of SWR cache sharing harmless. In the future, aligning the cache key patterns for these auxiliary API routes would fully optimize client caching.

---

## Verified Claims

- **Claim 1**: Cache key alignment for `location-scores.json` using `BUILD_VERSION` resolves the mismatch with `useStaticData.ts` -> **VERIFIED** -> **PASS**
  - *Method*: Checked `useStaticData.ts` (line 486) and `SWRProvider.tsx` (line 29). Both utilize the identical string key format: `/data/location-scores.json?v=${BUILD_VERSION}`.
  - *Cache Hydration/Sync*: Checked that `SWRProvider.tsx` filters and purges mismatched version keys during `getCache` from `localStorage` (lines 73-81) and prevents syncing mismatched versions to localStorage during `syncToLocalStorage` (lines 124-125).

- **Claim 2**: `/api/apartments-by-dong` has been safely removed from preloads without side effects -> **VERIFIED** -> **PASS**
  - *Method*: Checked `SWRProvider.tsx` targets array (lines 28-34) and verified the endpoint is removed. Checked all occurrences of `/api/apartments-by-dong` across the codebase.
  - *Side Effects*: Verified that `DashboardClient.tsx` fetches it dynamically on-demand only if `householdCount` is missing, and `ApartmentRepository.ts` bypasses cache via `{ cache: 'no-store' }`. Removing the eager preload prevents network hammering of a large JSON payload during page mount without breaking functionality.

- **Claim 3**: Changes compile cleanly and do not break the project build -> **VERIFIED** -> **PASS**
  - *Method*: Executed Jest unit tests (`npm test` passed 33 test suites / 216 tests) and the Next.js production build (`npx next build` completed successfully).

---

## Coverage Gaps

- None. All related files and endpoints were fully mapped and verified.

---

## Unverified Items

- None. All functional and build claims were independently verified.
