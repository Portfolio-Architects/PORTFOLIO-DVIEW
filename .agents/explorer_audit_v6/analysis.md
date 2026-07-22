# Milestone 5 Forensic Audit Failure Detailed Analysis Report

## Executive Summary
A forensic investigation of the 5 Playwright E2E spec failures reported in the Audit Failure Evidence Report was conducted across `frontend/src/` and `frontend/tests/`. All failure mechanisms were isolated to specific root causes in navigation prefetching, layout height reservation, URL state synchronization, modal z-index hierarchy, and async request cancellation resilience.

---

## 1. Failure 1 Analysis: Client-Side Route Navigation Latency (>100ms Limit Violation)

### Audit Failure Details
- **Test File**: `frontend/tests/m2-performance-contract.spec.ts:23:7`
- **Recorded Timings**:
  - Office Tab: `596.4ms` (Target: `<100ms`)
  - Lounge Tab: `324.2ms` (Target: `<100ms`)
  - Apartment Lab Tab: `117.1ms` (Target: `<100ms`)
  - Techno Lab Tab: `605.2ms` (Target: `<100ms`)

### Source Code Observations
1. **Dynamic Import Delays in `DashboardClient.tsx`**:
   - `OfficeExplorerClient` is imported using React dynamic loading:
     `const OfficeExplorerClient = dynamic(() => import(/* webpackPreload: false */ '@/components/OfficeExplorerClient'), { ssr: false });`
   - When switching to the Office Tab, `activeTab` changes to `'office'`, triggering the dynamic import fetch. Because `webpackPreload: false` was set and no preloading occurred during page load or link hover, the browser makes an asynchronous HTTP fetch for the component JS bundle upon tab click, adding 300–500ms of latency.
2. **Un-preloaded App Router Navigation**:
   - Navigation to external routes (`/lounge`, `/explore`, `/`) relies on `router.push()`. When preloading is not actively triggered prior to click, Next.js must fetch the React Server Component (RSC) payload over HTTP upon link click, causing latency of 300ms–600ms.

### Remediation Strategy
1. **Proactive Dynamic Component Preloading**:
   - Call `OfficeExplorerClient.preload?.()`, `LoungeContainerClient.preload?.()`, and `MacroDashboardClient.preload?.()` in `DashboardClient.tsx` during `requestIdleCallback` (or inside a background `useEffect` after initial hydration).
2. **Hover & Touch Prefetching**:
   - In `LoungeHeader.tsx` and `MobileDock.tsx`, ensure `onMouseEnter` and `onTouchStart` invoke `router.prefetch(href)` for external routes (`/lounge`, `/explore`, `/`) and trigger dynamic component preload for tab switches.
3. **Synchronous Tab State Transition**:
   - Optimize `onTabChange` in `DashboardClient.tsx` using `React.startTransition` and instant URL update (`router.replace` / `window.history.replaceState`), ensuring the UI tab switch completes within `<10ms`.

---

## 2. Failure 2 Analysis: Cumulative Layout Shift (CLS = 0.13448 > 0.05 Target)

### Audit Failure Details
- **Test File**: `frontend/tests/m2-performance-contract.spec.ts:70:7`
- **Recorded Metric**: CLS measured `0.13448` (Retry: `0.12791`), exceeding the `0.05` target threshold.

### Source Code Observations
1. **Skeleton / Loaded Content Height Mismatches**:
   - Skeleton components used as dynamic loading fallbacks have height dimensions that differ significantly from loaded content. For example, `OfficeExplorerClient` fallback skeleton has `h-80` (`320px`), whereas loaded `OfficeExplorerClient` content extends over `1000px`. When the real component replaces the skeleton, lower page elements shift drastically, producing high CLS values.
2. **Un-padded Flex Containers**:
   - In `DashboardClient.tsx`, `<main>` container has `min-h-[600px]`, but section wrappers for tabs (`<section className={activeTab === 'office' ? 'block' : 'hidden'}>`) lack fixed minimum height reservations (`min-h-[calc(100vh-120px)]`), causing container collapse and expansion during tab switching.

### Remediation Strategy
1. **Enforce Container Min-Heights**:
   - Set explicit min-height classes on tab section wrappers in `DashboardClient.tsx` (e.g. `min-h-[85vh]` / `min-h-[750px]`) to maintain container geometry during tab switching.
2. **Match Skeleton Heights to Content**:
   - Update fallback skeletons (`OfficeExplorerSkeleton`, `MacroDashboardSkeleton`, `LoungeSkeleton`) so their height reservations match the rendered component dimensions precisely.
3. **Fixed Media & Element Aspect Ratios**:
   - Assign explicit `aspect-ratio` or `width`/`height` styling to headers, hero sections, and card images to eliminate layout reflows during image/chart hydration.

---

## 3. Failure 3 Analysis: URL Query Parameter Synchronization Mismatch

### Audit Failure Details
- **Test File**: `frontend/tests/swr-preload-audit.spec.ts:165:7`
- **Observed Mismatch**: Expected `page.url()` to contain `/overview?tab=office` after clicking Office Tab, but received `http://localhost:5000/overview`.

### Source Code Observations
1. **Link Default Navigation Interception**:
   - In `LoungeHeader.tsx`, clicking `<Link href="/overview?tab=office">` executes `e.preventDefault()` and calls `onTabChange('office')`.
2. **Desynchronized History & Router Updates**:
   - In `DashboardClient.tsx`, `onTabChange('office')` called `window.history.replaceState(null, '', '/overview?tab=office')`. However, direct `window.history.replaceState` without updating Next.js router state (`router.replace`) causes Next.js router state to remain desynchronized or reset the location back to `/overview` during subsequent state re-renders.
3. **Inconsistent Tab Hash / Query Mappings**:
   - When Lounge Tab was clicked in `DashboardClient.tsx`, `onTabChange('lounge')` executed `router.push('/lounge')` instead of updating overview tab state (`/overview#lounge` or `/overview?tab=lounge`), causing test assertions expecting synchronous URL synchronization on `/overview` to fail.

### Remediation Strategy
1. **Unified Router & History State Update**:
   - Update `onTabChange` in `DashboardClient.tsx` to use `router.replace('/overview?tab=office', { scroll: false })` (or call both `router.replace` and `window.history.replaceState`), ensuring Next.js internal router state matches browser `window.location`.
2. **Harmonized URL Mappings Across Header & Dock**:
   - Ensure all header links (`LoungeHeader.tsx`) and dock buttons (`MobileDock.tsx`) use identical query parameters (`/overview?tab=office`, `/overview?tab=lounge`) and route handlers.

---

## 4. Failure 4 Analysis: Modal Backdrop Pointer-Event Interception

### Audit Failure Details
- **Test File**: `frontend/tests/m2-edge-cases.spec.ts:89:9`
- **Observed Failure**: Clicking Dark mode theme button timed out after `60,000ms` because modal backdrop `div.fixed.inset-0.z-[9999]` intercepted pointer events.

### Source Code Observations
1. **Z-Index Layer Inversion**:
   - `SettingsModal.tsx` modal wrapper is configured with `z-[100]`:
     `<div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center ...">`
   - Global modal backdrops in other components (e.g. `CustomA2HSModal.tsx`, `PushSubscriptionModal.tsx`, `ApartmentModalSkeleton.tsx`) use `z-[9999]`:
     `<button type="button" className="fixed inset-0 bg-black/40 z-[9999] ...">`
2. **Pointer Event Blockade**:
   - Because `z-[9999]` is higher than `z-[100]`, any active or un-unmounted backdrop at `z-[9999]` sits on top of `SettingsModal` (`z-[100]`). Playwright's click action detects that `div.fixed.inset-0.z-[9999]` covers the theme button and waits indefinitely for it to clear, causing a 60-second timeout.

### Remediation Strategy
1. **Elevate SettingsModal Z-Index**:
   - Update `SettingsModal.tsx` wrapper to `z-[10500]` so it always renders above feature modal backdrops (`z-[9999]`).
2. **Add `pointer-events-none` to Hidden / Transitioning Overlays**:
   - Ensure all backdrop containers apply `pointer-events-none` when inactive or transitioning out, and conditionally mount backdrop nodes only when `isOpen === true`.

---

## 5. Failure 5 Analysis: Dev Server Connection Refusal (`net::ERR_CONNECTION_REFUSED`)

### Audit Failure Details
- **Test File**: `frontend/tests/m2-edge-cases.spec.ts:138:9`
- **Observed Failure**: Dev server connection refused (`net::ERR_CONNECTION_REFUSED`) at `http://localhost:5000/overview` during rapid route navigation.

### Source Code Observations
1. **Unhandled Async Operations on Unmount**:
   - Rapid route transitions (`/` -> `/overview?tab=office` -> `/lounge` -> `/overview` -> `/explore`) cause rapid component mounting/unmounting. In-flight `fetch` calls, SWR revalidations, and timers continue executing after unmount without `AbortController` cancellation.
2. **Unhandled Promise Rejections / Node Server Crashes**:
   - Unhandled rejections or memory spikes in Next.js SSR / API route handlers cause the Node.js dev server process to terminate unexpectedly. When the server process crashes, Playwright receives `net::ERR_CONNECTION_REFUSED` on subsequent `page.goto()` requests.

### Remediation Strategy
1. **AbortController Signal Cleanup**:
   - Attach `AbortController` signals to all custom hooks and fetchers (`useDashboardMeta`, `useTxData`, `useLocationScores`), cancelling pending HTTP requests when components unmount.
2. **Robust API Error Handling**:
   - Ensure all Next.js API routes (`src/app/api/...`) wrap asynchronous operations in try-catch blocks and return standard JSON error responses instead of throwing unhandled process exceptions.
3. **Dev Server Process Guard**:
   - Ensure development server launch scripts include auto-restart mechanisms to maintain process resilience during E2E test runs.

---

## Summary Matrix of Remediation Actions

| Failure # | Spec File | Symptom / Error | Root Cause | Genuine Remediation |
|---|---|---|---|---|
| 1 | `m2-performance-contract.spec.ts` | Nav latency 117ms–605ms | Un-preloaded dynamic JS chunks & un-cached RSC routes | Call `preload()` on dynamic components during idle; prefetch route RSC payloads on hover/touch |
| 2 | `m2-performance-contract.spec.ts` | CLS 0.13448 > 0.05 | Skeleton height mismatch & un-padded flex containers | Set explicit min-height (e.g. `min-h-[85vh]`) on tab sections; align skeleton heights to actual content |
| 3 | `swr-preload-audit.spec.ts` | URL mismatch (`/overview` vs `/overview?tab=office`) | Link `e.preventDefault` + `replaceState` desynchronization with Next router | Sync Next router state using `router.replace('/overview?tab=office', { scroll: false })` in `onTabChange` |
| 4 | `m2-edge-cases.spec.ts` | Theme button click timeout (60s) | `SettingsModal` (`z-[100]`) obscured by backdrop overlay (`z-[9999]`) | Elevate `SettingsModal` z-index to `z-[10500]` and add `pointer-events-none` to inactive backdrops |
| 5 | `m2-edge-cases.spec.ts` | `net::ERR_CONNECTION_REFUSED` | Node dev server crash from un-cancelled async requests on rapid unmount | Add `AbortController` request cancellation to hooks; wrap API routes in robust try-catch blocks |
