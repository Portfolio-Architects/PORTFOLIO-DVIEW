## 2026-07-28T10:58:53Z
You are Worker M5 for DVIEW Web/App 2nd Recursive Self-Improvement Loop.
Working directory: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_self_improvement_run_6_m5
Project root: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Assigned Task: Implement R4 (2차 회귀 검증 & 자동 벤치마크 스크립트 구축).
Assigned Target Files:
- `frontend/scripts/benchmark.ts` (new file) or `frontend/scripts/benchmark.js`
- `frontend/package.json`
- `frontend/scripts/audit-pipeline.js`
- `frontend/tests/` (unit or benchmark test files if needed)

Implementation Details:
1. Create `frontend/scripts/benchmark.ts` (or `benchmark.js` / Playwright runner) that programmatically measures performance metrics under simulated user operations (scrolling, tab switching, chart re-renders):
   - **FPS**: Samples `requestAnimationFrame` timing over interaction loops (verifies FPS >= 60).
   - **CLS**: Measures Cumulative Layout Shift via PerformanceObserver `layout-shift` (verifies CLS < 0.01).
   - **Heap Memory Growth**: Measures `performance.memory` / `JSHeapUsedSize` over 10 continuous chart re-renders (verifies Heap growth <= 5%).
2. Add `"benchmark"` script to `frontend/package.json`.
3. Verify that `npm run audit` or `frontend/scripts/audit-pipeline.js` runs cleanly.
4. Execute `npm test` and `npm run build` in `frontend/` to confirm 100% green status.
5. Document implementation and test execution in `changes.md` and `handoff.md` in your working directory.
6. Send completion message to parent when done.
