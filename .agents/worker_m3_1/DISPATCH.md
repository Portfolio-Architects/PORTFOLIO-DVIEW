# DISPATCH — worker_m3_1

## Identity
- Role: Worker
- Type: teamwork_preview_worker
- Working Directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m3_1

## Scope & Authoritative References
- Authoritative User Request: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md` (Section `## 2026-09-16T15:20:16Z`)
- Project Scope Document: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\orchestrator_adsense_main\PROJECT.md`
- Test Readiness: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\TEST_READY.md`

## Exclusively Owned Files
- `frontend/src/components/MacroDashboardClient.tsx`

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Detailed Requirements (M3: Layout Integration & Zero-CLS AdSlot Optimization)
1. In `frontend/src/components/MacroDashboardClient.tsx`:
   - Import `HighCpcFinanceSection` from `@/components/finance/HighCpcFinanceSection`.
   - Import `RealtimeRankingBoard` from `@/components/ranking/RealtimeRankingBoard`.
   - Import `AdSlot` from `@/components/ads/AdSlot`.
   - Position `HighCpcFinanceSection` prominently near the top of the main overview tab (below the PageHeroHeader / MacroHeader area and above the timeline/feed).
     - Pass `onOpenMortgageModal={() => setIsMortgageModalOpen(true)}` and `onOpenJeonseSafetyModal={() => setIsJeonseSafetyModalOpen(true)}`.
   - Position responsive `AdSlot` with `format="in-feed"` between `HighCpcFinanceSection` and `RealtimeRankingBoard` (wrapped in a clean container with padding and zero layout shift).
   - Position `RealtimeRankingBoard` directly beneath the ad slot, passing `onSelectComplex={(name) => onSelectApt(name)}`, `recentTransactions={recentTransactions}`, and `sheetApartments={sheetApartments}`.
   - Position a second `AdSlot` (format="in-feed" or "banner") between the ranking board and the timeline controls/feed.
2. Ensure Zero-CLS standards:
   - No flickering or cumulative layout shifts on load.
   - Maintain existing memoization and prop stability patterns (`useCallback` for modal triggers, stable references).
3. Verification:
   - Run `npx tsc --noEmit` -> MUST pass with 0 errors.
   - Run `npm test -- src/__tests__/adsense_finance_ranking.test.tsx` -> MUST pass 100%.
   - Run `npm test` -> All 89+ test suites MUST pass with 0 regressions.
4. Write handoff.md and send a completion message to the caller.
