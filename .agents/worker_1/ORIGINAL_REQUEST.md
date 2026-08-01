## 2026-08-01T07:27:15Z
<USER_REQUEST>
You are Worker 1 for DVIEW Apt Lab mobile UI refactoring.
Working Directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_1
Project Directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Instructions:
1. Initialize your working directory `.agents/worker_1`.
2. Read the layout specification in `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\explorer_2\handoff.md`.
3. Open `frontend/src/components/MacroDashboardClient.tsx` and refactor `TimelineItemCard` (Lines 386–517) to implement the 2-row vertical mobile layout:
   - Row 1: [신고가 Badge] (if item.type === 'high') + [동 / 평형 / 층수]
   - Row 2: [아파트 Full Name] (full width flex-1 min-w-0, zero truncation bottleneck)
   - Right section: Price & change delta badge column, and vertically aligned [상세] button with border separation.
   - Maintain `const isRising = item.delta > 0;` and standard `aria-label` for test compatibility.
4. Execute verification commands in `frontend/`:
   - `npm test -- src/components/TimelineItemCardRender.test.tsx`
   - `npx tsc --noEmit`
   - `npm run build`
5. Document all code changes and build/test outputs in `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_1\handoff.md`.
6. Send a message to parent (`3a61764d-d22a-41ce-9435-67c4cdc6e465`) with your handoff summary.
</USER_REQUEST>
