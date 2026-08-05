# Survey & Architectural Analysis Report: Requirement R1 (Recursive Self-Improvement Engine)

**Author**: explorer_survey_1  
**Working Directory**: `C:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/.agents/explorer_survey_1`  
**Target Path**: `C:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/recursive_self_improvement`  
**Date**: 2026-08-04  

---

## 1. Executive Summary

This report delivers a comprehensive survey of the local environment, existing codebase, and architectural requirements for **Requirement R1 (Recursive Self-Improvement Engine / Loop)** as mandated in `ORIGINAL_REQUEST.md`.

### Key Findings
1. **Target Directory Status**: The target directory `C:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/recursive_self_improvement` does not yet exist on disk. However, a reference prototype directory `C:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/self_improvement_loop` already exists at the repository root.
2. **Existing Reference Implementation**: `self_improvement_loop/` contains a fully functional Python implementation of a self-improvement loop engine, complete with custom version control (`vcs.py`), test runner (`runner.py`), mock LLM simulator (`simulator.py`), and main engine controller (`engine.py`).
3. **Environment & Test Suite Execution**:
   - Local environment includes Python 3.13.1, Node.js v24.14.0, a root virtual environment `.venv/`, and git repository master branch.
   - Discovered 44 unit tests in `self_improvement_loop/` (`test_engine.py`, `test_simulator.py`, `test_target_module.py`, `test_vcs.py`). 43 tests pass cleanly.
   - Identified 1 edge-case bug in baseline `engine.py`: `test_engine_api_limit` raises `FileNotFoundError` during rollback when `MAX_API_REQUESTS` is reached on an unsaved version index.
4. **Architectural Blueprint for R1**: R1 requires an autonomous, self-contained loop engine capable of executing target code, evaluating results, detecting syntax/runtime/semantic errors, applying automated code modifications, handling stuck states, performing automatic rollbacks upon failure, and enforcing hard safety boundaries.

---

## 2. Environment & Tech Stack Survey

| Component | Detected Version / Details | Path / Environment Location | Status |
|-----------|---------------------------|-----------------------------|--------|
| **Python Interpreter** | Python 3.13.1 (Windows 64-bit) | `python` / `C:\Users\ocs56\.venv` | Ready & Operational |
| **Virtual Environment** | Python `.venv` | `C:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.venv` | Ready |
| **Node / NPM** | Node.js v24.14.0 | `node` | Operational (Frontend Stack) |
| **Testing Framework** | Standard library `unittest` | `python -m unittest discover -s self_improvement_loop` | 43/44 Tests Passing (1 edge-case fix needed) |
| **VCS / Repository** | Git (Branch: `master`, origin/master) | Workspace Root | Clean working tree |
| **Target Directory** | `recursive_self_improvement` | `C:\...\PORTFOLIO - DVIEW\recursive_self_improvement` | Needs creation / setup |
| **Reference Prototype** | `self_improvement_loop` | `C:\...\PORTFOLIO - DVIEW\self_improvement_loop` | Baseline source code |

---

## 3. Inventory & Analysis of Reference Prototype (`self_improvement_loop/`)

The existing `self_improvement_loop/` directory provides a clean, modular foundation for building the production engine under `recursive_self_improvement/`. Below is a component-by-component analysis:

### 3.1 `config.py` — Centralized Control Settings
- **Role**: Defines file paths, loop limits, timeouts, and resource budgets.
- **Key Parameters**:
  - `TARGET_FILE`: Path to target module (`target_module.py`).
  - `TEST_FILE`: Path to unit tests (`test_target_module.py`).
  - `HISTORY_DIR`: Directory storing generation snapshots (`history/`).
  - `STOP_FLAG_FILE` & `COMMAND_FILE`: Flag paths for graceful external shutdown (`stop.flag`, `command.txt`).
  - `MAX_ITERATIONS`: Configurable loop cap (default 75).
  - `TIMEOUT_SECONDS` & `SESSION_TIMEOUT_SECONDS`: Per-iteration (18,000s) and total session timeouts.
  - `MAX_API_REQUESTS` & `TOTAL_TOKEN_BUDGET`: Safety caps (500 requests, 1,000,000 tokens).

### 3.2 `vcs.py` (`CustomVCS`) — Version Tracking & Rollback Engine
- **Role**: Manages code snapshots, patch generation, and deterministic rollbacks.
- **Key Capabilities**:
  - `save_version(version_idx, target_code, test_code)`: Persists code snapshots as `target_module.v{idx}.py` and `test_target_module.v{idx}.py`.
  - `generate_diff(version_idx, old_code, new_code)`: Uses `difflib.unified_diff` to create and save `.diff` patches (`patch_v{idx}.diff`).
  - `rollback(version_idx)` / `restore_version(version_idx)`: Restores target and test files back to specified stable version snapshot upon verification failure.

### 3.3 `runner.py` (`TestRunner`) — Subprocess Execution Engine
- **Role**: Sandboxed test execution and result capture.
- **Key Capabilities**:
  - Automatically resolves Python executable: checks `.venv/Scripts/python.exe` (Windows) / `.venv/bin/python` (Unix) before falling back to `sys.executable`.
  - Runs tests via `subprocess.run(..., timeout=60, capture_output=True)`.
  - Captures `stdout`, `stderr`, and `returncode` cleanly in structured dictionary format.

### 3.4 `simulator.py` (`MockLLMSimulator`) — Code Generation & Metric Evaluator
- **Role**: Simulates code improvements, dynamic test generation, and metric scoring.
- **Key Capabilities**:
  - `calculate_metrics(code)`: Analyzes AST validity, lines of code (LOC), method count, docstrings count, and type annotations count to return a composite `quality_score` (0.0 – 100.0).
  - Dynamic test injection across iterations (e.g. adding trig, statistical, matrix, and ML test cases).
  - Handles `RateLimitError` simulation with reset timers.

### 3.5 `engine.py` (`SelfImprovementEngine`) — Autonomous Orchestration Engine & Edge Case Analysis
- **Role**: Core self-improvement loop controller.
- **Key Capabilities**:
  - **AST Pre-Validation**: Parses code (`ast.parse`) prior to execution; on syntax error, saves `target_module.v{N}.failed.py`, triggers rollback, and sets error feedback without corrupting execution state.
  - **Error Normalization**: `normalize_error_message()` strips volatile file paths and line numbers using regular expressions to ensure consistent error pattern matching.
  - **Stuck / Loop Detection**: MD5 hash tracking (last 3 iterations), error message repetition matching, and consecutive rollback tracking (triggers perturbation after 3 rollbacks).
  - **Execution Logging**: Appends all events (`START`, `ITERATION_START`, `SUCCESS`, `ROLLBACK`, `AST_SYNTAX_ERROR`, `STUCK_DETECTED`) to `execution_log.json`.
- **Empirical Edge-Case Bug Discovered**:
  - In `engine.py` lines 209, 217, 257, when `SESSION_TIMEOUT`, `TOKEN_BUDGET_EXCEEDED`, or `API_LIMIT` triggers on iteration $N$ before version snapshot $v_N$ is saved, `self.vcs.rollback(version_idx)` is called with `version_idx = N`. If $v_N$ snapshot does not exist in `history/`, `vcs.restore_version(N)` raises `FileNotFoundError: Version snapshot not found: target_module.v1.py`.
  - **Fix for Implementation**: `rollback()` must check `if self.vcs.has_version(version_idx)` or safely roll back to `last_stable_version_idx`.

---

## 4. Architectural Requirements & Blueprint for Requirement R1

Requirement R1 specifies:
> **R1. 재귀적 자기개선 루프 (Recursive Self-Improvement Engine)**  
> 대상이 되는 시스템/코드/알고리즘을 실행하고, 실행 결과를 수집하며, 실패 원인이나 성능 목표 격차를 분석하여 코드를 자동 수정 및 리팩토링한 후 재실행하는 자율 반복 루프(Self-Improvement Loop)를 구축합니다.

### 4.1 Core Architecture & Lifecycle Sequence

```
                      +-----------------------------+
                      |   1. Baseline Code / State  |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      |   2. Pre-Execution AST      |
                      |      Syntax Pre-Validation  |
                      +--------------+--------------+
                                     |
                       Pass / Valid  |  Fail / Syntax Error
              +----------------------+----------------------+
              |                                             |
              v                                             v
+---------------------------+                 +---------------------------+
| 3. Subprocess Test        |                 | Save Debug Failed Code    |
|    Execution (runner.py)  |                 | Log AST Syntax Error      |
+-------------+-------------+                 | Safe VCS Rollback Guard   |
              |                               +-------------+-------------+
              |                                             |
     Pass /   |   Fail /                                    |
     Passed   |   Unpassed                                  |
              v                                             v
+---------------------------+                 +---------------------------+
| 4. Save Version Snapshot  |                 | 5. Re-verify Baseline     |
|    Generate .diff Patch   |                 |    Inject Perturbation /  |
|    Reset Rollback Count   |                 |    Error Feedback to LLM  |
+-------------+-------------+                 +-------------+-------------+
              |                                             |
              +----------------------+----------------------+
                                     |
                                     v
                      +-----------------------------+
                      | 6. Check Safety Boundaries  |
                      |    (Iterations, Timeouts,   |
                      |     Token/API Budget, Stop) |
                      +--------------+--------------+
                                     |
                                     v
                      +-----------------------------+
                      | 7. Proceed to Next          |
                      |    Self-Improvement Iter    |
                      +-----------------------------+
```

### 4.2 Detailed Component Responsibilities for R1

1. **Self-Improvement Engine (`engine.py`)**:
   - Manages main execution loop (`while True` with configurable iteration limit).
   - Coordinates VCS, TestRunner, Metric Evaluator, and LLM Optimizer.
   - Performs error normalization (`re.sub` path/line stripper) for stable feedback.
   - Includes rollback safety guards (`has_version` check before restoring).
2. **Version Control System (`vcs.py`)**:
   - Manages atomic snapshot saving (`target_module.v{idx}.py`, `test_target_module.v{idx}.py`).
   - Generates standard unified diff files (`patch_v{idx}.diff`).
   - Guarantees 100% clean state restoration on rollback.
3. **Execution & Test Harness (`runner.py`)**:
   - Runs target tests in isolated Python process (`subprocess.run`).
   - Handles interpreter discovery (`.venv` priority) and execution timeouts (60s).
4. **Safety & Boundary Protection**:
   - `MAX_ITERATIONS` limit guard.
   - Iteration & Session timeout guards (`TIMEOUT_SECONDS`, `SESSION_TIMEOUT_SECONDS`).
   - API request count & total token budget guards (`MAX_API_REQUESTS`, `TOTAL_TOKEN_BUDGET`).
   - File-based graceful stop signal checking (`stop.flag`, `command.txt`).
5. **Stuck / Loop Detection & Resolution**:
   - Hash sliding window (last 3 iterations) to catch code duplication loops.
   - Consecutive rollback tracking (>= 3 consecutive failures).
   - Automatic perturbation feedback injection to prompt strategy shifts.

---

## 5. Target Directory Blueprint & Migration Plan

The implementation in `recursive_self_improvement/` will adopt the verified patterns from `self_improvement_loop/` while resolving discovered edge cases and enhancing modularity for Requirements R2 and R3.

### Recommended Directory Structure
```
recursive_self_improvement/
├── config.py                 # Configuration settings, paths, timeouts & budgets
├── vcs.py                    # CustomVCS: snapshot manager, diff generator, rollback engine (with safety guard)
├── runner.py                 # TestRunner: isolated subprocess test execution
├── evaluator.py              # MetricEvaluator: test pass rate, execution time, memory, AST quality
├── simulator.py              # LLM / Optimization simulator & code generator
├── engine.py                 # SelfImprovementEngine: R1 autonomous loop controller
├── reporter.py               # AuditReporter: R3 markdown report generator
├── target_module.py          # Baseline algorithm / module targeted for self-improvement
├── test_target_module.py     # Unit test suite for target module
├── run.py                    # Main CLI entrypoint
├── history/                  # Version snapshots, diff patches, failed attempts, execution logs
└── tests/                    # Unit test suite for the engine itself
    ├── test_config.py
    ├── test_vcs.py
    ├── test_runner.py
    ├── test_evaluator.py
    ├── test_simulator.py
    └── test_engine.py
```

---

## 6. Recommendations & Next Steps

1. **Directory Creation**: Implementers should create target directory `recursive_self_improvement/` and copy/refactor baseline modules.
2. **Rollback Guard Fix**: Ensure `vcs.rollback(version_idx)` in `recursive_self_improvement/vcs.py` checks `has_version(version_idx)` before restoring, defaulting to `last_stable_version_idx` to prevent `FileNotFoundError` when aborting early on budget/limit triggers.
3. **Engine Validation**: Run `python -m unittest discover -s recursive_self_improvement/tests` to achieve 100% test pass rate across all engine test cases.
4. **Integration with R2 & R3**:
   - Connect quantitative metric tracking (`evaluator.py`) to the R1 loop decision boundary.
   - Hook automated markdown report generation (`reporter.py`) to persist iteration history to `IMPROVEMENT_REPORT.md`.
