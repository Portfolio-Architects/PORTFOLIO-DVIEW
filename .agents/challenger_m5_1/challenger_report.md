# Adversarial Hardening Report — Milestone 5 Challenger 1

## Challenge Summary

**Overall risk assessment**: HIGH

Through white-box review of the navigation, transition, and caching logic, we identified several critical gaps:
1. **Critical Route Mismatch in NewsClient Navigation**: The navigation buttons on `/news` navigate to `/#overview`, `/#lounge`, and `/#gap` on the root page (`/`), which does not handle these hashes. This completely breaks navigation back to the Apartment Lab page from `/news`.
2. **SWR Cache Versionless Poisoning/Persistence**: Versionless API endpoints (such as `/api/macro/rates` and `/api/dashboard-init`) bypass the build version filter during local cache synchronization and purging in `SWRProvider.tsx`. As a result, stale or poisoned responses for these APIs remain cached in `localStorage` indefinitely across new deployments and build updates.
3. **Missing Preload Targets**: Critical static data files `/data/tx-summary.json`, `/data/recent-transactions.json`, and `/data/macro-trend.json` are not preloaded by `SWRProvider.tsx`, resulting in dashboard startup lag (cache misses).
4. **Race Conditions & UI Janks**:
   - `LoungeHeader.tsx` triggers `window.scrollTo` via a static 50ms timeout during route navigation, causing scroll-to-top to fire on the old page before the new route is ready.
   - `DashboardClient.tsx` updates `window.history.replaceState` synchronously while React's state change is deferred via `startTransition`, causing transient mismatch between URL state and active tab.

---

## Challenges

### [High] Challenge 1: Stale / Poisoned Cache Persistence Across Build Versions
- **Assumption challenged**: The cache versioning mechanism `v=${BUILD_VERSION}` guarantees that no stale cache entries survive a build deployment.
- **Attack scenario**: Versionless API calls (like `/api/macro/rates` or `/api/dashboard-init`) do not include `?v=` query parameters. When `SWRProvider.tsx` synchronizes SWR cache to `localStorage` or loads it back, the filter regex `key.match(/[?&]v=([^&]+)/)` returns null for these keys, so they are kept. A stale or manipulated response stored in `localStorage` from a previous build will persist and be loaded, bypass network requests (due to `dedupingInterval`), and render stale data to the user.
- **Blast radius**: Displaying incorrect interest rates, home valuations, and stale site configuration across deployments.
- **Mitigation**: Clear versionless keys or use an explicit version wrapper in the parent structure of the cache storage (e.g., namespace the entire `app-swr-cache` key under the current `BUILD_VERSION`, like `app-swr-cache-${BUILD_VERSION}`).

### [High] Challenge 2: Broken Navigation (Route Mismatches) on News page
- **Assumption challenged**: Navigation items on all pages point to valid, active routing paths.
- **Attack scenario**: Navigating to `/news` and clicking "데이터 랩" or "커뮤니티" triggers router push to `/#overview` or `/#lounge`. Since `/` maps to `TechnoValleyClient` which has no hash state handler, these hashes are ignored, leaving the user on the home/Techno page rather than navigating back to the corresponding tabs on `/overview`.
- **Blast radius**: Complete breakdown of header navigation tabs when visiting `/news`.
- **Mitigation**: Update routing paths in `NewsClient.tsx` to point to `/overview#overview`, `/overview#lounge`, and `/overview#gap` instead of root hashes.

### [Medium] Challenge 3: Scroll restoration race condition in LoungeHeader
- **Assumption challenged**: A 50ms setTimeout is sufficient to ensure scrolling occurs after route navigation.
- **Attack scenario**: Clicking a Link in LoungeHeader to navigate to `/overview` when the network is slow or page compilation takes time. The 50ms timeout fires, scrolling the current page to top, and then Next.js loads the new page, which might start at a random scroll position or ignore scroll restoration.
- **Blast radius**: Janky transition feel, failure to scroll to the top of the newly loaded page.
- **Mitigation**: Avoid mixing programmatic scroll timing with Link navigation, or rely on Next.js's native scroll restoration behavior.

---

## Stress Test Results

- **NewsClient navigation button click** → Should navigate to `/overview` tabs → Navigates to root page (`/`) with unhandled hash → **FAIL** (Confirmed Route Mismatch)
- **Stale versioned cache entry in localStorage** → Should be purged on initialization → Purged successfully → **PASS**
- **Stale versionless cache entry in localStorage** → Should be purged on initialization → Persists in localStorage indefinitely → **FAIL** (Confirmed Cache Poisoning Risk)
- **Location scores preloading** → Should trigger exactly one request with version → SWR deduping works correctly → **PASS**

---

## Unchallenged Areas

- **Firebase transaction sync performance** — Out of scope. Focus was restricted to SWR caching alignments, prefetching, and navigation headers.
