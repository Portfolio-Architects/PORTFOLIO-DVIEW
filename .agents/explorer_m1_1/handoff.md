# Milestone 1 (Core Engine & Safety Setup) Implementation Handoff Report

## 1. Observation

### Analyzed Baseline Prototype (`self_improvement_loop/`)
We conducted a comprehensive analysis of all modules in `self_improvement_loop/`:
1. `config.py` (25 lines):
   - Path definitions: `BASE_DIR`, `TARGET_FILE` (`target_module.py`), `TEST_FILE` (`test_target_module.py`), `HISTORY_DIR` (`history/`), `STOP_FLAG_FILE` (`stop.flag`), `COMMAND_FILE` (`command.txt`).
   - Safety thresholds: `MAX_ITERATIONS = 75`, `TIMEOUT_SECONDS = 18000`, `SESSION_TIMEOUT_SECONDS = 18000`, `MAX_API_REQUESTS = 500`, `TOTAL_TOKEN_BUDGET = 1000000`, `TOKEN_BUDGET_PER_ITERATION = 5000`.
2. `vcs.py` (103 lines):
   - `CustomVCS` class: dual-file snapshotting (`target_module.v{N}.py` and `test_target_module.v{N}.py`), diff patch creation using `difflib.unified_diff` saved to `patch_v{N}.diff`, and atomic dual-file rollback via `rollback(version_idx)`.
3. `runner.py` (81 lines):
   - `TestRunner` class: executes unit tests via `subprocess.run` using `.venv` python executable (or `sys.executable` fallback) with 60-second subprocess timeout. Captures `stdout`, `stderr`, `returncode`, `success`.
4. `simulator.py` (802 lines):
   - `MockLLMSimulator` class: calculates code metrics (`calculate_metrics`: LOC, method_count, docstrings_count, type_annotations_count, ast_valid, quality_score), dynamically updates `test_target_module.py` (`update_tests`), and simulates LLM optimization iterations (v1 to v16+), rate limits (`RateLimitError`), and stuck loop recovery.
5. `engine.py` (481 lines):
   - `SelfImprovementEngine` class: orchestrates loop, history resume detection (`target_module.v(\d+).py`), stop signal check (`check_stop_signal`), AST pre-validation (`ast.parse()`), stuck state detection (code hash tracking `recent_hashes`, normalized repeating error tracking `normalize_error_message`, consecutive rollback threshold `>=3`), rollback verification (`verify_result = runner.run_tests()`), event logging (`log_event`), and saving `history/execution_log.json`.
6. `target_module.py` (149 lines) & `test_target_module.py` (802 lines):
   - Baseline target module (`Calculator` class) and test suite.
7. `run.py` (100 lines):
   - CLI entrypoint: initializes engine, runs self-improvement loop, prints execution summary, and runs test discovery.
8. Unit Test Suite (`test_engine.py`, `test_simulator.py`, `test_vcs.py`):
   - 21 total unit tests covering engine safety guardrails, AST pre-validation, rate limit retries, stuck detection, VCS dual snapshots, diff generation, and rollback verification.

### Baseline Test Execution Results
Executed test suite discovery command:
```bash
python -m unittest discover -s self_improvement_loop -p "test_*.py"
```
Result:
```
Ran 21 tests in 0.127s
OK
```

### Current Target Directory Status
Directory `C:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/recursive_self_improvement/` does not exist yet.

---

## 2. Logic Chain

1. **Baseline Assessment**:
   - The baseline prototype in `self_improvement_loop/` provides a complete, robust, and verified implementation of the Core Engine and Safety Setup required for Milestone 1.
   - All 21 baseline unit tests pass cleanly.

2. **Milestone 1 Feature Mapping**:
   - **Feature 1 (Baseline Directory & Setup)**: Create `recursive_self_improvement/` directory structure and port code modules (`config`, `vcs`, `runner`, `simulator`, `engine`, `target_module`, `test_target_module`, `run`).
   - **Feature 2 (Self-Improvement Engine Loop - R1)**: Port `SelfImprovementEngine` with history auto-resume, code optimization loop, and stuck state detection/recovery.
   - **Feature 3 (AST Pre-Validation)**: Validate code syntax using `ast.parse()` before file write and test execution; log `AST_SYNTAX_ERROR`, save failed code snapshot, rollback VCS, and feed back error context.
   - **Feature 4 (Safety Guardrails & Limits)**: Enforce iteration timeouts, session timeouts, total token budget, MAX_API_REQUESTS, MAX_ITERATIONS, and graceful shutdown via `stop.flag` / `command.txt`.

3. **Required Code Adaptations for `recursive_self_improvement/`**:
   - Module imports must support relative or module-qualified imports (e.g., `from recursive_self_improvement import config`).
   - `BASE_DIR` in `config.py` must point to `recursive_self_improvement/`.
   - Test runner in `runner.py` must find `.venv` relative to workspace root (`Path(__file__).parent.parent.resolve() / ".venv"`).
   - Test discovery in `run.py` must target `recursive_self_improvement`.

---

## 3. Caveats

1. **Scope Boundary**: Milestone 1 focuses on Core Engine & Safety Setup. `evaluator.py` (M2 quantitative metric benchmark collector) and `reporter.py` (M3 markdown report generator) will be fully developed in subsequent milestones, but module boundaries established in `PROJECT.md` should be strictly maintained.
2. **Environment Dependency**: Tests rely on Python 3 environment. Subprocess test execution in `runner.py` uses `.venv` python executable if present, or `sys.executable` as fallback.

---

## 4. Conclusion

Milestone 1 is ready for implementation in `recursive_self_improvement/`. Below are the concrete step-by-step instructions and code specifications for the implementer agent.

---

## 5. Implementation Instructions & Code Specifications for Milestone 1

### Step 1: Create Directory Structure
Create directory `recursive_self_improvement/` and `recursive_self_improvement/history/`.

### Step 2: Implement `recursive_self_improvement/config.py`
```python
import os
from pathlib import Path

# Absolute path of recursive_self_improvement directory
BASE_DIR = str(Path(__file__).parent.resolve())

# Paths inside recursive_self_improvement
TARGET_FILE = str(Path(BASE_DIR) / "target_module.py")
TEST_FILE = str(Path(BASE_DIR) / "test_target_module.py")
HISTORY_DIR = str(Path(BASE_DIR) / "history")

# Stop flag and control files
STOP_FLAG_FILE = str(Path(BASE_DIR) / "stop.flag")
COMMAND_FILE = str(Path(BASE_DIR) / "command.txt")

# Loop settings & safety guardrails
MAX_ITERATIONS = 75
TIMEOUT_SECONDS = 18000
SESSION_TIMEOUT_SECONDS = 18000
MAX_API_REQUESTS = 500
TOTAL_TOKEN_BUDGET = 1000000
TOKEN_BUDGET_PER_ITERATION = 5000
INJECT_SYNTAX_ERROR_ITERATION = 4
```

### Step 3: Implement `recursive_self_improvement/vcs.py`
Implement `CustomVCS` class supporting:
- `save_version(version_idx, target_code, test_code=None)`
- `generate_diff(version_idx, old_code, new_code)` -> writes `history/patch_v{version_idx}.diff`
- `restore_version(version_idx)` & `rollback(version_idx)` -> restores target and test files
- `has_version(version_idx)`

### Step 4: Implement `recursive_self_improvement/runner.py`
Implement `TestRunner(test_file)` class:
- Resolves `.venv` python executable from workspace root `Path(__file__).parent.parent.resolve() / ".venv"`.
- Runs subprocess execution of `test_file` with timeout=60.
- Returns dict: `{"success": bool, "stdout": str, "stderr": str, "returncode": int}`.

### Step 5: Implement `recursive_self_improvement/simulator.py`
Implement `MockLLMSimulator` and `RateLimitError`:
- `calculate_metrics(code: str) -> dict`
- `update_tests(iteration: int) -> None`
- `get_improved_code(current_code, iteration, inject_syntax_error=False, perturbation_feedback=None, error_feedback=None) -> str`

### Step 6: Implement `recursive_self_improvement/engine.py`
Implement `SelfImprovementEngine`:
- Load configuration from `recursive_self_improvement.config`.
- Methods: `normalize_error_message`, `log_event`, `save_execution_log`, `check_stop_signal`, `run`.
- Features in `run()`:
  - History version detection (`target_module.v(\d+).py`).
  - AST pre-validation (`ast.parse()`) catching `SyntaxError`.
  - Guardrail checks: `check_stop_signal`, iteration timeout, session timeout, token budget, API limit, MAX_ITERATIONS.
  - Stuck loop detection: code hash matching (last 3 hashes), repeating error normalization, consecutive rollbacks (>=3).
  - Rollback verification via `runner.run_tests()`.
  - Event logging and `history/execution_log.json` output.

### Step 7: Port Target Module & Unit Tests
- `target_module.py`: Calculator baseline code.
- `test_target_module.py`: Initial test suite.
- Port test suite: `test_vcs.py`, `test_simulator.py`, `test_engine.py` targeting `recursive_self_improvement`.
- `run.py`: CLI entrypoint executing engine loop and running unittest discovery.

---

## 6. Verification Method

To verify the implementation of Milestone 1:

1. **Run Unit Test Suite**:
   ```bash
   python -m unittest discover -s recursive_self_improvement -p "test_*.py"
   ```
   *Expected Result*: All unit tests pass cleanly (21+ tests).

2. **Run E2E CLI Entrypoint**:
   ```bash
   python recursive_self_improvement/run.py
   ```
   *Expected Result*: Self-improvement loop executes, logs events, handles iterations, saves history snapshots/execution_log.json, and prints pass summary.
