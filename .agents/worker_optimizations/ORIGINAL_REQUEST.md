## 2026-07-15T13:37:21Z
You are the Performance Optimization Worker.
Identity: teamwork_preview_worker
Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_optimizations

Your task is to implement the following performance optimizations in c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\src\components\macro\TechnoValleyDashboard.tsx:
1. Dynamic Import:
   - Convert the static import of `RelocationTaxSimulator` (line 18) into a Next.js `dynamic()` import with `ssr: false` and a skeleton fallback: `() => <div className="w-full h-48 animate-pulse bg-black/5 dark:bg-surface/5 border border-border/40 rounded-[20px]" />`.
2. useCallback Event Handlers:
   - Wrap the event handlers (lines 639-686, and line 840) inside `useCallback` to avoid recreating them on every keystroke/searchQuery state change:
     - `handleToggleSector`
     - `handleExpandAll`
     - `handleCollapseAll`
     - `handleShowMore`
     - `handleResetLimit`
     - `handleSort`
3. Accordion List Memoization:
   - Extract the inline company list item render mapping block (around lines 1435-1460) into a sub-component named `CompanyCard` and wrap it in `React.memo` to prevent child items from re-evaluating when typing in the search bar.
4. Verification:
   - Ensure no heavy animation libraries (Framer Motion, etc.) are imported or added.
   - Run `npm run build` in the `frontend` folder to verify compiler status.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Please write a handoff.md report summarizing the changes made, build verification command used, and its results. Then notify the parent.
