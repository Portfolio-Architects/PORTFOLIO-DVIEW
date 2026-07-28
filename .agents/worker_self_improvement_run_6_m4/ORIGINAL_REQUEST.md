## 2026-07-28T10:47:05Z
<USER_REQUEST>
You are Worker M4 for DVIEW Web/App 2nd Recursive Self-Improvement Loop.
Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_self_improvement_run_6_m4
Project root: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW
Explorer report: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_self_improvement_run_6_3\analysis.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Assigned Task: Implement R3 (Network Latency / Offline Defense & Auto-Sync).
Assigned Target Files ONLY:
- `frontend/public/sw.js`
- `frontend/src/components/SWRProvider.tsx`
- `frontend/src/hooks/useNetworkStatus.ts`
- `frontend/src/lib/offlineQueue.ts`
- `frontend/src/components/ui/OfflineBanner.tsx` (new file)
- `frontend/src/components/ui/TechnoValleySkeleton.tsx` (new file)
- `frontend/src/components/ui/MacroDashboardSkeleton.tsx` (new file)
- `frontend/src/components/ui/LoungeSkeleton.tsx` (new file)

Implementation Details (from Explorer 3 analysis):
1. `public/sw.js`: Enhance fetch handler so that GET requests to read-only API endpoints (e.g. `/api/dashboard-init`, `/api/location-scores`, `/api/local-notices`) use Stale-While-Revalidate or Network-First with dynamic cache fallback instead of hard bypass. Ensure `tx-summary.json` is included in SWR dynamic caching policy.
2. `OfflineBanner.tsx`: Create a non-intrusive, sleek `OfflineBanner` UI component that displays when the device is offline (`!isOnline`) or rendering stale cached data.
3. Skeleton Loaders: Create `TechnoValleySkeleton.tsx`, `MacroDashboardSkeleton.tsx`, and `LoungeSkeleton.tsx` in `frontend/src/components/ui/` so major views exhibit seamless Skeleton placeholders during slow 3G/offline loading.
4. Auto-Reconnection Sync in `SWRProvider.tsx` & `PWAProvider.tsx`: Ensure `revalidateOnReconnect` and `retryOfflineRequests()` trigger SWR cache revalidation (`mutate()`) across active keys seamlessly upon network reconnection without app crashes or data loss.

Verification Duties:
- Run `npm test` in `frontend/` and ensure all tests pass cleanly.
- Run `npm run build` in `frontend/` to confirm zero build/TypeScript errors.
- Document implemented changes and test results in `changes.md` and `handoff.md` in your working directory.
- Send completion message to parent when done.
</USER_REQUEST>
