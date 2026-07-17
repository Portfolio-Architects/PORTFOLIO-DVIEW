## 2026-07-17T04:32:59Z

You are teamwork_preview_worker. Your task is to implement Milestones M2 (Memoization & Lazy) and M3 (Code Splitting) of the D-VIEW Overview page optimization task.

Your objectives:
1. Edit `frontend/src/components/MacroDashboardClient.tsx` to perform the following optimizations:
   - Remove the 11 unused computations to reduce CPU overhead:
     - `donutData` (lines 837-885)
     - `totalHouseholds` and `publicRentalHouseholds` (lines 887-901)
     - `enrichedAptList` (lines 1416-1449)
     - `gapInvestmentTop5` (lines 1485-1552)
     - `benchmarks` (line 904)
     - `getAptBriefingMessage` (line 1190)
     - `card3Data` (line 1317)
     - `card4Data` (line 1364)
     - `globalVotes` (line 1398)
     - `gapInvestment1st` (line 1452)
     - `averageJeonseRateText` (line 1555)
   - Convert the static imports of `TrafficNoticeBoard` and `LoungeTalkWidget` to Next.js `dynamic()` dynamic imports (with `ssr: false`).
   - Extract the inline map rendering of timeline items (lines 1822–1947) into a React.memo-wrapped `<TimelineItemCard>` component inside `MacroDashboardClient.tsx`. Ensure it takes stable callback props.
   - Remove the dynamic `key={selectedTimelineApt || 'all'}` prop from `<MacroTrendChart>` (around line 2136) so it updates properties incrementally instead of unmounting/remounting.
2. Build the project (`npm run build` or `npx tsc --noEmit` in the `frontend` directory) to verify no compiler/build errors.
3. Write your step-by-step progress to `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_worker_m2_m3\progress.md` and your final report to `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\teamwork_preview_worker_m2_m3\handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
