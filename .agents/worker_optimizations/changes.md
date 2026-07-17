# Optimization Changes Report

## 1. Fix Prefetch Redundancy
- **Files Modified**:
  - `frontend/src/components/LoungeHeader.tsx`
  - `frontend/src/components/DashboardClient.tsx`
- **Details**:
  - Removed manual `onMouseEnter` and `onTouchStart` event handlers that programmatically called `router.prefetch('/')` on Links that already had Next.js native `prefetch={true}` (or default prefetch).

## 2. Fix Prefetch Gaps
- **Files Modified**:
  - `frontend/src/components/DashboardClient.tsx`
  - `frontend/src/app/news/NewsClient.tsx`
- **Details**:
  - Added programmatic hover/touch prefetch handlers (`onMouseEnter` and `onTouchStart` calling `router.prefetch('/explore')`) to buttons where route transitions were triggered programmatically via `router.push('/explore')`.

## 3. Fix SWR / Caching Mismatches
- **Files Modified**:
  - `frontend/src/components/pwa/SWRProvider.tsx`
  - `frontend/src/components/consumer/AdvancedValuationMetrics.tsx`
  - `frontend/src/hooks/useDashboardMeta.ts`
- **Details**:
  - Aligned background preload URLs in `SWRProvider.tsx` (`/api/macro/news?limit=40` and `/api/local-notices?dongtan=true`) with the actual query parameters utilized in SWR hook fetches.
  - Refactored `AdvancedValuationMetrics.tsx` and `useDashboardMeta.ts` to utilize the SWR cache (`useSWR` hook) rather than bypassing it via native `fetch` inside `useEffect`, preventing redundant API requests and maximizing deduplication.

## 4. Fix Tab Transitions and State Loss
- **Files Modified**:
  - `frontend/src/components/DashboardClient.tsx`
- **Details**:
  - Tracked whether heavy tabs (Overview, Office, Lounge) were opened using state boolean flags (`hasOpenedOverview`, `hasOpenedOffice`, `hasOpenedLounge`).
  - Adjusted conditional rendering in `memoizedTabContents` to check for active state or prior opened state, combined with CSS visibility classes (`block` vs `hidden`) on the wrapper `section` nodes. This keeps rendered tabs alive, retaining scroll state and sub-component states.

## 5. Fix Modal CLS (Cumulative Layout Shift)
- **Files Modified**:
  - `frontend/src/components/LoungeDetailClient.tsx`
- **Details**:
  - Adjusted loading and fallback page containers to use `min-h-[300px]` instead of `min-h-screen` when `isModal` is true, avoiding 100vh layout shifts during modal mounting.
