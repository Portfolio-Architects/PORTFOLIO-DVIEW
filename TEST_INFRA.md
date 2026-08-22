# E2E Test Infra: D-VIEW Hyperlocal SuperApp

## Test Philosophy
- Opaque-box, requirement-driven regression prevention.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.
- Target: 100% Green test suite across 99+ test suites (1018+ tests) and 0 TypeScript compilation errors.

## Feature Inventory & Test Mapping
| # | Feature | Source | Tier 1 (Unit) | Tier 2 (Boundary) | Tier 3 (Integration) | Tier 4 (E2E) |
|---|---|---|---|---|---|---|
| 1 | Runtime Rendering & Memoization | R1 | Memo & Prop stability | Empty / Large datasets | Tab switching & filter churn | 60fps interaction simulation |
| 2 | Code Splitting & Dynamic Imports | R2 | next/dynamic mock resolution | SSR vs CSR fallback | Modal trigger load | Bundle chunk isolation |
| 3 | SWR Caching & Offline Resilience | R3 | Cache TTL & deduplication | Corrupted cache payload | Offline/Online reconnect | Background sync recovery |
| 4 | Error Boundaries & Fallback UI | R4 | Error throw capture | Nested error bubbling | Section retry triggers | Full page crash prevention |
| 5 | Regression & Multi-filter Integrity | R5 | Metric calculation & filters | Extreme filter ranges | Donut/Trend chart rendering | Full user exploration workflow |

## Test Architecture
- Test runner: Jest (`npm test`, `npx jest`)
- Test environment: `jest-environment-jsdom` with `@testing-library/react` and `@testing-library/jest-dom`
- Test files location: `frontend/__tests__/` and `frontend/src/**/__tests__/`

## Coverage Thresholds
- Unit & Component Test Suites: ≥ 99 suites
- Total Tests: ≥ 1018 tests (100% Passing)
- TypeScript Compilation: 0 errors (`npx tsc --noEmit`)
