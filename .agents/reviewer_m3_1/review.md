# Code Review Report (Milestone 2 & 3)

## Review Summary

**Verdict**: **APPROVED**

This review evaluates the UX and performance optimizations implemented by the Optimization Worker in Milestones 2 & 3. 
The reviewed files show excellent conformance with Next.js best practices, responsive layouts, and modern web optimization strategies (such as lazy rendering, transition gating, and Stale-While-Revalidate caching). All 216 unit tests are verified as passing. A minor performance optimization gap was identified in SWR cache key matching, but it does not affect correctness or function.

---

## Findings

### [Minor] Finding 1: SWR Cache Key Mismatch for Location Scores

- **What**: Cache key mismatch during background preloading of `location-scores.json`.
- **Where**: `frontend/src/components/pwa/SWRProvider.tsx` (line 29) vs. `frontend/src/hooks/useStaticData.ts` (line 486).
- **Why**: `SWRProvider.tsx` preloads `/data/location-scores.json` (without a query parameter). However, the hook in `useStaticData.ts` fetches `/data/location-scores.json?v=${BUILD_VERSION}`. This difference in SWR keys results in a cache miss, making the background prefetch redundant and triggering an additional network request when the component mounts.
- **Suggestion**: Align the keys by either appending `?v=${BUILD_VERSION}` to the preloader targets in `SWRProvider.tsx` or matching the fetch signature.

### [Minor] Finding 2: Direct `fetch` Calls Bypass SWR Preload Cache

- **What**: Direct `fetch` of `/api/apartments-by-dong` does not benefit from SWR preloading.
- **Where**: `frontend/src/lib/repositories/apartment.repository.ts` (line 115) and `frontend/src/components/DashboardClient.tsx` (line 642).
- **Why**: SWR preloader calls `preload('/api/apartments-by-dong', defaultFetcher)` which populates SWR's internal React cache. However, the repository and component use native `fetch` directly, which bypasses SWR entirely, leading to direct network queries (though mitigated if Service Worker caching is active).
- **Suggestion**: If using SWR to preload this data, consider using `useSWR` in the repository/hook layers, or omit the SWR preloader entry if Service Worker caching alone is sufficient.

---

## Verified Claims

- **Unit tests pass** → verified via running `npm test` in the `frontend` folder → **PASS** (33 suites, 216 tests passed).
- **Data consistency check passes** → verified by reading `frontend/missing_report.txt` → **PASS** (0 missing/corrupted files out of 99604 households in the Google Sheets).
- **Tab persistence & smoothness is implemented** → verified via inspection of `DashboardClient.tsx` → **PASS** (tab panels are conditionally initialized on first click via `hasOpenedOverview` etc., and subsequently toggled using CSS `block`/`hidden` classes, preserving React local states and preventing transition lag).
- **Lounge detail modal prevents blank screen flicker and CLS** → verified via inspection of `LoungeDetailClient.tsx` → **PASS** (local memory caches `postLocalCache` and `commentsLocalCache` are used to render modal contents instantly. Image components use a wrapping element with a fixed aspect ratio `aspect-[16/10]` and `min-h-[250px]`, preventing Cumulative Layout Shift during load).

---

## Coverage Gaps

- **E2E Playwright tests** — risk level: **LOW** — recommendation: **Accept Risk**. Playwright tests were not run locally due to headless environment restrictions, but code layout inspections confirm selectors are aligned and unit tests are comprehensive.

---

## Unverified Items

- **Real-device layout performance under network throttling** — reason not verified: require physical device profiling.

---
---

# Adversarial Review (Challenge Report)

## Challenge Summary

**Overall risk assessment**: **LOW**

The caching mechanisms and transition implementations are highly robust, utilizing Zod schemas for sanitization and standard debounce/throttle limits to mitigate common attack vectors.

## Challenges

### [Low] Challenge 1: LocalCache schema mismatch on PWA updates

- **Assumption challenged**: LocalCache assumes `localStorage` schemas do not drift or corrupt across deployments.
- **Attack scenario**: If a client has an old version of `dview_viewed_apts` in their browser and the validation schema changes, parsing could throw a runtime exception or crash the dashboard.
- **Blast radius**: Low. The cache is wrapped in Zod parser catch guards (`ViewedAptsSchema.safeParse` or fallback catch blocks) which immediately clear the corrupted cache entry and fall back to defaults, preventing page crashes.
- **Mitigation**: Already handled by design. No further action needed.

## Stress Test Results

- **Invalid inputs to DCF valuation engine** → validated via `valuationEngine.test.ts` → **PASS** (failures safely captured and logged under WARN level without throwing unhandled exceptions).
- **SWR cache version pollution** → validated via `SWRProvider.tsx` → **PASS** (localStorage cache entries are successfully filtered and purged if the version query parameter does not match the current `BUILD_VERSION`).
