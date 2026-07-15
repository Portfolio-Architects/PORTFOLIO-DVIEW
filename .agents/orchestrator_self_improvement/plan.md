# Project: Self-Improvement Loop Prototype

## Architecture

The Self-Improvement Loop Prototype is a modular system implemented in Python that executes a target program, verifies it using a test suite, modifies the target program using a mock LLM simulator, tracks changes with a custom file-based version control system, performs automated rollbacks to the last stable state upon detecting compile/test failures, and enforces safety guardrails (loop iterations, execution time, cumulative session runtime limit of 5 hours, and cumulative API request limit).

### Module Boundaries and Structure
All files reside in the `self_improvement_loop/` directory:
- `config.py`: Configuration settings (paths, timeout, iteration limits, session timeout, API request limit).
- `vcs.py`: Implements custom file-based VCS (backup, rollback, diff generation).
- `runner.py`: Executes tests in a subprocess and parses results.
- `simulator.py`: Implements simulated LLM updates (mutates target code across iterations, injects errors).
- `engine.py`: Core workflow orchestrator (runs tests, invokes simulator, updates code, handles rollback/recovery, checks safety limits, records logs).
- `run.py`: Command line entry point for running the demonstration.
- `target_module.py`: The target module undergoing self-improvement (initially has a buggy Calculator).
- `test_target_module.py`: Test suite verifying target module functionality (incrementally checks add, subtract, multiply).
- `history/`: Directory for version backups, diff patches, and structured run logs.

### Data Flow
1. **Setup**: The engine reads the initial code from `target_module.py` and saves it as version 0.
2. **Execution**: The engine triggers `runner.py` to run the tests in `test_target_module.py`.
3. **Assessment**:
   - If tests pass: The engine saves the current code as a stable version, generates a diff against the previous version, logs the success, and proceeds to the next iteration.
   - If tests fail (or syntax error is detected): The engine logs the failure, rejects the changes, triggers `vcs.py` to restore the last stable version, verifies the restoration, and terminates.
4. **Safety Check**: Check if the cumulative session runtime has reached the limit (5 hours / 18,000s), cumulative API requests exceed the threshold, or remaining token budget is insufficient. The engine distributes the token budget intelligently across iterations. If any safety boundary is hit, the engine gracefully terminates and saves the final status report.
5. **Rate Limit Handling**: If a rate limit error (e.g. `RateLimitError` or HTTP 429) is caught, the engine parses the 'Reset Time' from headers or the error message, sleeps for the specified time, and automatically resumes the current step without losing state.
6. **Improvement**: If there are failing tests and the loop hasn't terminated, the engine queries `simulator.py` for improved code based on the current code, iteration, and error injection flag.
7. **Update**: The engine writes the new code to `target_module.py` and repeats the loop.

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Config & VCS | Create `config.py` and `vcs.py` to support file-based backups, restoring, and diff generation. | None | DONE |
| 2 | M2: Test Runner & Setup | Create `runner.py`, `target_module.py`, and `test_target_module.py`. Test running in subprocess. | M1 | DONE |
| 3 | M3: Mock LLM Simulator | Create `simulator.py` supporting 3 distinct improvement steps and a syntax error injection step. | None | DONE |
| 4 | M4: Orchestrator Engine | Create `engine.py` orchestrating the loop execution, timeout, rollback, cumulative runtime, request limit, token budget distribution, and rate-limit retry/auto-resume. | M1, M2, M3 | DONE |
| 5 | M5: E2E Verification & Demo | Create `run.py` CLI script, run E2E test suite to execute the loop, verify 3 successful steps and 1 rollback, verify safety guardrails, verify rate-limit auto-resume, output final reports. | M4 | DONE |

## Interface Contracts

### 1. `CustomVCS` (`vcs.py`)
- `__init__(history_dir: str, target_file: str)`: Initializes directories.
- `save_version(version_idx: int, code: str) -> None`: Saves version snapshots under `history/target_module.v{version_idx}.py`.
- `generate_diff(version_idx: int, old_code: str, new_code: str) -> str`: Generates unified diff patch under `history/patch_v{version_idx}.diff` and returns the diff content.
- `restore_version(version_idx: int) -> str`: Replaces `target_module.py` with version `version_idx` snapshot and returns the restored code.

### 2. `TestRunner` (`runner.py`)
- `__init__(test_file: str)`: Initializes with target test script.
- `run_tests() -> dict`: Executes test file via subprocess, returns `{"success": bool, "stdout": str, "stderr": str, "returncode": int}`.

### 3. `MockLLMSimulator` (`simulator.py`)
- `get_improved_code(current_code: str, iteration: int, inject_syntax_error: bool) -> str`: Returns improved code string based on iteration or broken code if syntax error requested. Can raise `RateLimitError` to simulate rate limits.

### 4. `SelfImprovementEngine` (`engine.py`)
- `__init__()`: Initializes VCS, Test Runner, and Mock LLM.
- `run() -> dict`: Executes the main self-improvement loop, logs events, handles errors, rollbacks if needed, implements token/time limits and rate-limit auto-resume, and returns final execution status.

## Code Layout
The target folder structure will be:
```
self_improvement_loop/
├── config.py
├── vcs.py
├── runner.py
├── simulator.py
├── engine.py
├── run.py
├── target_module.py
├── test_target_module.py
└── history/
```
