# DISPATCH — worker_m2_1

## Identity
- Role: Worker
- Type: teamwork_preview_worker
- Working Directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m2_1

## Scope & Authoritative References
- Authoritative User Request: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md` (Section `## 2026-09-16T15:20:16Z`)
- Project Scope Document: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\orchestrator_adsense_main\PROJECT.md`

## Exclusively Owned Files
- `frontend/src/lib/utils/rankingCalculations.ts`
- `frontend/src/components/ranking/RealtimeRankingBoard.tsx`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Requirements (M2: Real-time Ranking Board for Dwell Time & PV)
1. Implement `rankingCalculations.ts`:
   - Data models per `PROJECT.md § Interface Contracts`:
     - `RealtimeRankingItem`: rank, apartmentName, dong, metricValue, subText, badge, priceWon, dealDate.
     - `RealtimeRankingData`: newHighList (TOP 10), optimalGapList (TOP 10), weeklySurgeList (TOP 10).
   - Functions:
     - `calculateNewHighRankings(transactions, complexes)`:
       - Evaluates recent transactions against historical benchmarks or ranks highest price transactions in Dongtan.
       - Generates items with rank (1~10), complex name, dong, price text (e.g. "15.8억 (신고가 갱신)"), subText (pyeong/floor, date), badge ("신고가", "최고가").
     - `calculateOptimalGapRankings(complexes, transactions)`:
       - Calculates gap = Sale Price - Jeonse Price and jeonse rate = (Jeonse / Sale) * 100%.
       - Ranks complexes with optimal gap (e.g. 1.2억 ~ 2.5억) and safe jeonse rate (65% ~ 80%).
       - Generates items with rank (1~10), complex name, dong, metricValue (e.g. "갭 1.5억 (전세가율 74%)"), subText ("매매 6.0억 / 전세 4.5억").
     - `calculateWeeklySurgeRankings(transactions, complexes)`:
       - Aggregates transaction counts in the most recent 7-day window vs previous 7-14 days.
       - Ranks complexes by transaction surge volume and growth momentum.
       - Generates items with rank (1~10), complex name, dong, metricValue (e.g. "주간 7건 체결"), subText (trend indicator), badge ("거래급증", "핫단지").
     - Handles empty or fallback data gracefully so the widget always displays rich, realistic Dongtan ranking data even when initial live transactions are loading.

2. Implement `RealtimeRankingBoard.tsx`:
   - Interactive 3-tab segmented navigation:
     - Tab 1: `실시간 신고가 TOP 10`
     - Tab 2: `전세가율·갭 최적 단지`
     - Tab 3: `주간 거래량 급상승`
   - Shows rank badge (1, 2, 3 highlighted with distinct bronze/silver/gold or primary color badges, 4~10 clean pills).
   - Each ranking row is clickable! On row click:
     - Calls `onSelectComplex?.(item.apartmentName)` to trigger seamless opening of `ApartmentModal`.
     - Displays hover effects, active feedback, and keyboard accessible focus.
   - Smooth tab switching with zero layout shift.
   - Live badge or "실시간 갱신" indicator to boost user dwell time and interest.

3. Verification Requirements:
   - Run `npx tsc --noEmit` -> MUST pass with 0 errors.
   - Run `npx jest` -> MUST pass with 0 regressions.
   - Document commands, test results, and file paths in `handoff.md`.
