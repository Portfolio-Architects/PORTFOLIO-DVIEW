## 2026-07-17T04:47:28Z
You are an Explorer agent. Analyze the codebase to address the page transition and ApartmentModal rendering optimization requirements.

Your tasks:
1. Locate where Next.js pages/routes, Links, and transitions are handled.
2. Locate the service worker file `public/sw.js` (or similar) and review its caching policy for static JS chunks and JSON data.
3. Locate SWR/React Context definitions used for data fetching/caching during transitions.
4. Find the `ApartmentModal` component and its heavy child components (recharts, comments list, photos upload, calculators).
5. Suggest:
   - How to optimize Link prefetching and implement hover-based programmatic prefetching.
   - How to improve the service worker cache policy.
   - How to ensure SWR/Context cache prevents duplicate requests.
   - How to dynamic-import `ApartmentModal` and its heavy parts, including preloading them on hover/focus before modal open.
   - Where to apply React.memo/useMemo/useCallback to solve render lag (Jank).
   
Write your detailed analysis to `analysis.md` and a summary handoff to `handoff.md` in your working directory: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_ux_perf_modal_m1`.
Do not write or modify any source code files. Keep all your output within your working directory.
