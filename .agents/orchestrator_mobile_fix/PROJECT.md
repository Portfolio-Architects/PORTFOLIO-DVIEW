# Project: D-VIEW Mobile Layout & Chart Rendering Defense

## Architecture Overview
The D-VIEW mobile application is built with Next.js (TypeScript), Tailwind CSS, Lucide Icons, and custom chart / canvas / SVG components.

## Milestones Tracker
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Baseline Exploration & Codebase Analysis | Audit current layout, chart components, CSS, test infrastructure | None | DONE |
| 2 | Mobile Layout & Outline Defense Refactoring (R1) | Implement min-w-0, responsive CSS, container overflow defense across 320px~768px | M1 | DONE |
| 3 | Chart Rendering Pipeline Defense & Modularization (R2) | ResizeObserver defense, timing, data null/undefined/empty fallbacks, logic decoupling | M1 | DONE |
| 4 | Mobile Performance & Regression Test Suite (R3) | Prevent layout thrashing, re-renders, add Jest/Playwright tests & checklist | M2, M3 | DONE |
| 5 | E2E Audit & Quality Verification (M5) | Full build & test passing, forensic audit verification | M4 | DONE |

## Code Layout (Key Paths)
- `frontend/src/components/` — UI components including dashboards, charts, mobile dock, headers, modals
- `frontend/src/` — Main React application logic
- `frontend/__tests__/` or `frontend/src/**/*.test.ts(x)` — Jest test suites
- `frontend/e2e/` — Playwright end-to-end test scripts
