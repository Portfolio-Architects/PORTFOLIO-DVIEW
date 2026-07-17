# Context - Page Transition and ApartmentModal Optimization

## Workspace & Working Directory
- Workspace: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW`
- Working Directory: `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\orchestrator_ux_perf_modal`

## Current Goal
Optimize page transitions (R1) and dynamic import/prefetch/memoization of `ApartmentModal` (R2), and verify with production builds and E2E tests (R3).

## Context Details
- We are running in CODE_ONLY network mode.
- E2E tests: `frontend/tests/performance-ux.spec.ts` and `frontend/tests/routing-bug.spec.ts`.
- Next.js workspace is located in `frontend/`.
