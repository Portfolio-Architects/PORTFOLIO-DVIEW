# DISPATCH — test_writer_e2e_1

## Identity
- Role: E2E Test Writer
- Type: teamwork_preview_test_writer
- Working Directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\test_writer_e2e_1

## Scope & Authoritative References
- Authoritative User Request: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\ORIGINAL_REQUEST.md` (Section `## 2026-09-16T15:20:16Z`)
- Project Scope Document: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\orchestrator_adsense_main\PROJECT.md`

## Exclusively Owned Files
- `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\TEST_INFRA.md`
- `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\TEST_READY.md`
- `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\src\__tests__\adsense_finance_ranking.test.tsx`

## Mission
1. Create `TEST_INFRA.md` at project root documenting test architecture and 4 tiers of test cases:
   - Tier 1: Feature Coverage (>=5 per feature for F1~F8)
   - Tier 2: Boundary & Corner Cases (zero/negative income, 0 deposit, max limits, 126% boundary)
   - Tier 3: Cross-Feature Combinations (switching tabs in ranking while policy widget is active, opening modal from ranking row)
   - Tier 4: Real-World Scenarios (Dongtan buyer calculating newborn loan, checking safe jeonse guarantee, inspecting top-10 new high complexes)
2. Author the comprehensive opaque-box test suite in `frontend/src/__tests__/adsense_finance_ranking.test.tsx`.
   - Use React Testing Library & Jest (`@testing-library/react`, `@testing-library/jest-dom`).
   - Mock SWR or use mock data where appropriate.
   - Verify Zero-CLS layout expectations (`min-h-[140px]`, `min-h-[250px]`, skeleton `data-testid="ad-slot-skeleton"`, sponsor badge `data-testid="ad-sponsor-badge"`).
3. Run `npm test -- src/__tests__/adsense_finance_ranking.test.tsx` and run full regression suite `npm test`.
4. When tests pass, create `TEST_READY.md` at project root with test command and coverage summary.
5. Write `handoff.md` and report back via `send_message`.
