# Master Execution Plan: Mobile Layout & Chart Rendering Defense

## Objective
Execute a multi-milestone refactoring and hardening pipeline for the D-VIEW mobile layout and chart rendering system to eliminate layout breaks/overlapping outlines (320px~768px), guarantee robust dynamic chart rendering with modularized calculation/drawing logic, and optimize mobile performance with full regression testing.

## Milestones Breakdown

### Milestone 1: Exploration & Codebase Analysis (M1)
- Assign `teamwork_preview_explorer` to inspect existing mobile components (`frontend/src/components/...`), chart components (`DashboardClient`, `MacroDashboardClient`, Chart wrappers, Canvas/SVG components), CSS/Tailwind layouts, ResizeObservers, and tests.
- Identify current layout break points, overflow issues, unhandled chart null/undefined/empty data scenarios, and performance bottlenecks.
- Produce comprehensive exploration report in `.agents/explorer_m1/analysis.md`.

### Milestone 2: R1. Mobile Layout & Outline Defense Refactoring (M2)
- Target 320px ~ 768px viewports in both portrait and landscape orientations.
- Apply `min-width: 0`, proper flex/grid overflow settings (`overflow-hidden`, `overflow-x-auto`, `min-w-0`), relative responsive CSS (`vw`, `%`, `rem`, clamp), touch target hygiene, and outline isolation.
- Prevent horizontal scroll leaks, modal clipping, sticky header drift, and content outline collisions.
- Assign `teamwork_preview_worker` to implement, run tests/builds, and report changes.
- Assign `teamwork_preview_reviewer` and `teamwork_preview_challenger` to verify layout defense across viewports.

### Milestone 3: R2. Graph/Chart Rendering Pipeline Defense & Modularization (M3)
- Hardening chart canvas/SVG dimension calculation and timing during dynamic resize (ResizeObserver, orientationchange, debounce/throttle).
- Implement robust exception handling for chart data (null, undefined, empty array `[]`, zero/abnormal viewport dimensions). Display elegant Fallback UI without console errors.
- Modularize chart codebase: strictly decouple data calculation / transformation logic (pure functions) from DOM / Canvas / SVG rendering logic.
- Assign `teamwork_preview_worker` to implement refactoring and logic separation.
- Assign `teamwork_preview_reviewer` and `teamwork_preview_challenger` for verification.

### Milestone 4: R3. Mobile Performance Optimization & Regression Verification (M4)
- Minimize layout thrashing (reflows) and re-render count on mobile screen resize / orientation changes.
- Implement React memoization (`useMemo`, `useCallback`, `React.memo`), efficient RAF/ResizeObserver callbacks, and optimized state updates.
- Create automated unit/integration tests in Jest and/or Playwright covering mobile outline defense, zero layout overflows, chart fallback states, and data edge cases.
- Create verification checklist for manual & automated mobile testing.
- Assign `teamwork_preview_worker` to implement optimizations & test suites.

### Milestone 5: End-to-End Verification & Forensic Audit (M5)
- Run full build (`npm run build`), unit test suite (`npm test`), and Playwright E2E tests in `frontend/`.
- Dispatch `teamwork_preview_auditor` to conduct forensic audit (checking code authenticity, zero hardcoded values, zero fake fallbacks, compliance with mobile defense standards).
- Synthesize all findings and produce final completion report.
