# Handoff Report - explorer_m1

## 1. Observation
We directly observed the following specific codebase layouts, prefetching triggers, caching hooks, service worker behavior, and rendering structures in the project repository:
1. **Prefetch Redundancy**:
   - In `frontend/src/components/LoungeHeader.tsx` (lines 41-43), we see:
     ```tsx
     prefetch={true}
     onMouseEnter={() => router.prefetch('/')}
     onTouchStart={() => router.prefetch('/')}
     ```
     This duplicate prefetching trigger is also found in `DashboardClient.tsx` (lines 852-854).
2. **Prefetching Gaps**:
   - In `frontend/src/components/DashboardClient.tsx` (lines 917-918), the "아파트 탐색" tab button is defined as:
     ```tsx
     onClick={() => router.push('/explore')}
     ```
     without any hover-based programmatic prefetching.
   - In `frontend/src/components/LoungeFeedClient.tsx` (lines 1174-1176), clicking a post uses:
     ```tsx
     onClick={() => {
       window.location.hash = `post=${post.id}`;
     }}
     ```
     without a Next.js `<Link>` component.
3. **Caching Mismatches**:
   - In `frontend/src/components/pwa/SWRProvider.tsx` (line 34), SWR preloads the key `/api/macro/news`.
   - In `frontend/src/app/news/NewsClient.tsx` (line 177), SWR requests `/api/macro/news?limit=40`.
   - In `frontend/src/components/pwa/SWRProvider.tsx` (line 33), SWR preloads `/api/macro/rates`.
   - In `frontend/src/components/consumer/AdvancedValuationMetrics.tsx` (line 232), it executes a native `fetch('/api/macro/rates')` call, bypassing SWR's cache.
   - In `frontend/src/components/pwa/SWRProvider.tsx` (line 32), SWR preloads `/api/dashboard-init`.
   - In `frontend/src/hooks/useDashboardMeta.ts` (line 164), it executes a native `fetch('/api/dashboard-init')` call, bypassing SWR's cache.
4. **Service Worker Rules**:
   - In `frontend/public/sw.js` (lines 101-103), all `/api/` calls are bypassed:
     ```javascript
     if (url.pathname.startsWith('/api/')) {
       return;
     }
     ```
   - Build assets (`/_next/`) use a Cache First strategy (lines 106-118).
   - `.json` data files (excluding `tx-summary.json` on line 122) use a Stale-While-Revalidate caching strategy (lines 120-151).
5. **Transitions and CLS**:
   - In `frontend/src/components/DashboardClient.tsx` (lines 773-780), tabs are conditionally mounted and visually toggled:
     ```tsx
     <section className={`w-full bg-transparent ${activeTab === 'office' ? 'block' : 'hidden'}`}>
       {activeTab === 'office' && (
         !mounted ? (
           <div className="w-full h-80 bg-black/5 dark:bg-surface/5 rounded-2xl animate-pulse" />
         ) : (
           <OfficeExplorerClient />
         )
       )}
     </section>
     ```
   - In `frontend/src/components/LoungeDetailClient.tsx` (lines 760-766), the loading state renders:
     ```tsx
     if (loading) {
       return (
         <div className="min-h-screen bg-body flex items-center justify-center">
           <div className="w-8 h-8 rounded-full border-2 border-toss-blue border-t-transparent animate-spin" />
         </div>
       );
     }
     ```
     This `min-h-screen` content is rendered inside the `h-fit` modal layout of `LoungeModalBackdrop.tsx` (line 113).
6. **Baseline Runs**:
   - `npm run build` executed successfully. Compiles `/` statically and `/overview`, `/lounge` dynamically.
   - `npm run test:e2e` ran 10 Playwright tests, and all 10 tests passed (1.1m duration).
   - `scratch/ui-ux-audit-results.json` records a color contrast warning for `.shadow-[0_2px_12px_rgba(0,0,0,0.06)] > span` (the `<span>아파트 탐색</span>` menu item text).

---

## 2. Logic Chain
1. **Prefetch Redundancy**: Since Next.js `<Link>` components automatically prefetch route bundles when they enter the viewport in production (using intersection observers), binding manual hover `onMouseEnter` prefetch triggers to the same URLs is duplicate and redundant.
2. **Prefetch Gaps**: Because the "아파트 탐색" tab button relies on a standard button element with an imperative `router.push`, it misses viewport-based prefetching. Similarly, since the Lounge feed card clicking changes the URL hash (`#post=id`) instead of navigating via `<Link href="/lounge/id">`, Next.js cannot prefetch post pages, and crawler engines cannot discover the links.
3. **Caching Mismatches**: SWR's cache key matching is strict; `/api/macro/news` is a distinct key from `/api/macro/news?limit=40`. Preloading the former does not populate the cache for the latter. Similarly, executing native `fetch` requests directly bypasses SWR's client cache lookup. Thus, preloading `/api/macro/rates` and `/api/dashboard-init` has zero caching utility and triggers duplicate network requests.
4. **Transition Bottlenecks**: Combining conditional rendering (`{activeTab === '...' && <Component />}`) with CSS display toggling (`block`/`hidden`) forces components to unmount, losing local state (e.g. scroll positions, active filter categories) and triggering fresh skeleton loading and refetches on switch.
5. **Modal CLS**: Rendering a `min-h-screen` loading layout inside an `h-fit` modal forces the modal dialog card to stretch to full viewport height, only to shrink back to fit the post size once the post data loads. This triggers major Cumulative Layout Shifts (CLS) on modal entry.

---

## 3. Caveats
- We did not write code changes or fixes to resolve these issues because our mission is strictly restricted to read-only investigation and baselining.
- We assume that the Playwright tests mock data and environment behavior (port 5000) are representative of production requirements.

---

## 4. Conclusion
The current codebase exhibits multiple performance bottlenecks: redundant programmatic prefetching, a missing prefetch layer on imperative buttons and hash-based modal routers, cache bypasses due to native `fetch` usage or mismatched query param keys, tab-switch unmounting state loss, and a severe CLS bottleneck in the Lounge detail modal loading state.
These issues can be actionably resolved in the implementation phase by:
- Cleaning up duplicate prefetching logic and implementing hover-based prefetching for imperative buttons.
- Aligning SWR cache keys and swapping native `fetch` requests with `useSWR` calls for preloaded data assets.
- Changing tab-rendering from conditional unmounting to persistent CSS visibility toggling (`block`/`hidden` without `&&` checks).
- Re-styling the modal loading spinner layout to fit the modal container instead of forcing a `min-h-screen` viewport height.

---

## 5. Verification Method
To independently verify the observations and baseline results:
1. **Next.js Production Build**:
   - Run `npm run build` inside `frontend/`. Check the generated compilation routes.
2. **Playwright E2E Tests**:
   - Run `npm run test:e2e` inside `frontend/` to run all 10 tests. Verify they all pass.
3. **Raw Audit Log**:
   - Inspect `frontend/scratch/ui-ux-audit-results.json` to confirm LCP (`1184ms`), CLS (`0.036`), and accessibility contrast warnings for `.shadow-[0_2px_12px_rgba(0,0,0,0.06)] > span`.
