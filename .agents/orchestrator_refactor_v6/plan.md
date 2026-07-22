# Refactoring Master Plan v6 — D-VIEW Web App & Self-Improvement Engine

## Objectives
Achieve competition-winning quality across D-VIEW Real Estate & Techno-Valley Data Analytics Web Application and Python Self-Improvement Loop Engine.

1. **Web App Performance & UI/UX Perfection (`frontend/`)**:
   - Sub-100ms client route navigation across 5 main routes (`technovalley`, `office`, `lounge`, `overview`, `imjang`).
   - Zero Cumulative Layout Shift (CLS < 0.05) during tab switches and interactive state changes.
   - 100% active route & state synchronization between desktop `LoungeHeader` and `MobileDock`.
   - Programmatic prefetching and dark/light glassmorphism visual polish.

2. **Recursive Feedback & Self-Improvement Loop Engine (`self_improvement_loop/`)**:
   - Harden and expand `engine.py`, `simulator.py`, and `vcs.py`.
   - Automated code evaluation, recursive feedback ingestion, regression guardrails with automatic rollback, and continuous metric optimization.

3. **Automated Test Verification & Forensic Audit**:
   - Ensure 100% test pass rate across unit/integration test suites (`npm test` in `frontend/`, `npx playwright test` in `frontend/`, `pytest self_improvement_loop/`).
   - Ensure clean TypeScript build (`npm run build` in `frontend/`).
   - Generate a comprehensive forensic audit report summarizing performance gains, verification proof, and system architecture.

---

## Milestone Decomposition

### Milestone 1: Exploration & Baselining
- **Scope**: Inspect `frontend/src/` navigation, caching, dock/header sync, glassmorphic styles, and `self_improvement_loop/` code (`engine.py`, `simulator.py`, `vcs.py`). Run baseline tests (`npm run build`, `npm test`, `npx playwright test`, `pytest self_improvement_loop/`) via Explorer subagent.
- **Deliverables**: Comprehensive exploration report (`.agents/explorer_m1_v6/analysis.md`) detailing existing bottlenecks, current test statuses, and exact technical plan for M2 and M3.

### Milestone 2: Frontend Performance & UI/UX Perfection
- **Scope**: Refactor `frontend/src/components/` and `frontend/src/app/`:
  - `LoungeHeader.tsx` & `MobileDock.tsx` state and active route synchronization.
  - Next.js Link prefetching and SWR route pre-caching for sub-100ms transitions across `technovalley`, `office`, `lounge`, `overview`, `imjang`.
  - Fix CLS triggers during tab switches and state changes (enforce fixed aspect ratios / min-height containers).
  - Enhance dark/light glassmorphism styling (`globals.css`, cards, micro-interactions).
- **Deliverables**: Implementation by Worker subagent, review by Reviewer subagent, empirical validation by Challenger subagent.

### Milestone 3: Recursive Feedback & Self-Improvement Loop Engine Hardening
- **Scope**: Refactor `self_improvement_loop/`:
  - `engine.py`: Multi-step recursive feedback loop execution, metric evaluation, prompt/code optimization strategies.
  - `simulator.py`: Simulated performance metrics evaluation, edge-case simulation, stability under repeated iterations.
  - `vcs.py`: Git/snapshot revision management, automated rollback on metric regression, safety checks.
- **Deliverables**: Implementation by Worker subagent, review by Reviewer subagent, unit tests pass (`pytest self_improvement_loop/`).

### Milestone 4: Comprehensive Automated Test Verification & Integration
- **Scope**: Execute full verification suite:
  - `npm run build` in `frontend/` (zero TypeScript errors/warnings).
  - `npm test` in `frontend/` (Jest unit test suite 100% pass).
  - `npx playwright test` in `frontend/` (Playwright E2E test suite 100% pass).
  - `pytest self_improvement_loop/` (Pytest suite 100% pass).
- **Deliverables**: Verification report by Worker/Reviewer with exact commands and output logs.

### Milestone 5: Forensic Integrity Audit & Final System Architecture Report
- **Scope**: Run `teamwork_preview_auditor` to perform forensic integrity check on codebase, verify no test result hardcoding, fake metrics, or facades.
- **Deliverables**: Forensic audit report (`.agents/auditor_m5_v6/audit_report.md`) confirming CLEAN verdict, performance gains summary, and final notification to Sentinel.
