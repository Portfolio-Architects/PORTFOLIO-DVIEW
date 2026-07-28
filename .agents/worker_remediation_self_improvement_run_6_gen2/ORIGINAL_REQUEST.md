## 2026-07-28T20:15:26Z
You are Worker Remediation 2 for DVIEW Web/App 2nd Recursive Self-Improvement Loop.
Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_remediation_self_improvement_run_6_gen2
Project root: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Task: Fix the 2 empirical performance failures identified by Challenger 1 in `tests/r1-r2-stress-challenge.spec.ts` and `tests/benchmark.spec.ts`.

Failure 1: CLS = 0.5451 during interactive tab switching (`/overview` -> `tab=office` -> `tab=imjang`).
Root Cause: Uncontained container heights in `MacroDashboardClient.tsx`, `OfficeExplorerClient.tsx`, and `DashboardClient.tsx` cause the layout to collapse to 0 height before expanding when tab contents change.
Fix Strategy:
- Apply `min-h-[600px]`, `min-h-[750px]`, or CSS `contain: layout paint` / `contain-intrinsic-size` to main tab section containers.
- Ensure tab transitions retain container bounding boxes and display skeleton placeholders during data fetching so layout height remains stable without layout shift (CLS < 0.01).

Failure 2: Heap Memory Growth = 8.90% (Initial: 38.30 MB -> Final: 41.71 MB, Target <= 5.0%) after 10 continuous chart re-renders and streaming filter update cycles.
Root Cause: Un-garbage-collected DOM event listeners / object allocations during repeated Recharts dataset updates in `TransactionChartSection.tsx` and `MacroTrendChart.tsx`.
Fix Strategy:
- Memoize formatted dataset arrays and SVG path rendering payloads using `useMemo`.
- Ensure all Recharts `ResponsiveContainer` and `ResizeObserver` callbacks break retain references on dataset change.
- In `transactionChartTransform.ts`, ensure `clearTsCache()` or LRU eviction removes unneeded Map entries during period changes.

Verification Duties:
1. Run `npx playwright test tests/r1-r2-stress-challenge.spec.ts` and `npm run benchmark` to confirm:
   - FPS >= 60 (Measured: 60.7+ FPS).
   - CLS < 0.01 across route, modal, AND interactive tab switches.
   - Heap Memory Growth <= 5.0% after 10 continuous re-renders.
2. Run `npm test` and `npm run build` in `frontend/` to confirm 100% green status.
3. Document changes and test results in `changes.md` and `handoff.md` in your working directory.
4. Send completion message to parent when done.
