# Analysis Report: Self-Improvement Loop Codebase and Plan

## Executive Summary
This report analyzes the existing `self_improvement_loop` codebase and provides a detailed design plan to resume the self-improvement loop from version 11 (the current state) to versions 12, 13, 14, 15, and 16+ continuously in the background. It also implements graceful shutdown capabilities and updates unit tests dynamically using a backward-compatible method.

---

## 1. Existing Codebase Analysis

The codebase consists of the following components:
*   `config.py`: Stores baseline settings such as paths, loop iterations, timeouts, and API budgets.
*   `vcs.py`: Implements a simple custom version control system (`CustomVCS`) that registers snapshots of `target_module.py` in `history/target_module.v{idx}.py`, generates unified diff patches, and handles rollbacks to the last stable snapshot.
*   `runner.py`: Implements `TestRunner` which executes tests by locating the virtual environment python interpreter (`.venv`) or falling back to `sys.executable`.
*   `simulator.py`: Implements `MockLLMSimulator` which simulates the improvement suggestions from an LLM. It generates new versions of `target_module.py` based on the iteration counter and injects syntax errors/rate limit exceptions for testing.
*   `engine.py`: Implements the `SelfImprovementEngine` orchestrating the feedback loop: reading code, fetching improvements, writing target module, running tests, tracking budgets/limits, and rolling back if tests fail.
*   `run.py`: Serves as the main script, resetting the loop back to iteration 1 by overwriting the target file with the original buggy addition code and running the engine.
*   `target_module.py`: The target calculator class (`Calculator`) under improvement, currently at version 11.
*   `test_target_module.py`: Contains unit tests for the `Calculator` using `unittest`.

---

## 2. Proposed Changes

### Configuration Updates (`config.py` -> `proposed_config.py`)
1.  **Continuous Execution**: Increase `MAX_ITERATIONS` to a high number (e.g. 1000) or run indefinitely.
2.  **Graceful Stop Flags**: Add definitions for control files:
    *   `STOP_FLAG_FILE`: Path to `stop.flag` file.
    *   `COMMAND_FILE`: Path to `command.txt` file.
3.  **Safety Limits**: Maintain the 5-hour timeout limit (`SESSION_TIMEOUT_SECONDS = 18000`) and raise `MAX_API_REQUESTS` to `500` to support a longer background run.

### Simulator Updates (`simulator.py` -> `proposed_simulator.py`)
1.  **Mathematical Version Specifications**:
    *   **v12 (Trigonometry)**: Imports `math`, appends `sin(self, x)`, `cos(self, x)`, and `tan(self, x)` to `Calculator`.
    *   **v13 (Statistics)**: Appends `mean(self, data)`, `median(self, data)`, and `variance(self, data)` methods.
    *   **v14 (Matrix Operations)**: Appends `matrix_addition(self, A, B)`, `matrix_transpose(self, A)`, and `matrix_multiplication(self, A, B)`.
    *   **v15 (Numerical Optimization)**: Appends `gradient_descent(self, f_prime, x_start, learning_rate=0.1, iterations=100)` and `linear_regression(self, x, y)`.
    *   **v16+ (Enhancements)**: Adds `factorial(self, n)` and `gcd(self, a, b)` methods along with continuous optimization comments.
2.  **Dynamic Test Suite Updates**:
    *   Implement an `update_tests(self, iteration)` helper inside the simulator. Before code generation, it checks if corresponding tests are in `test_target_module.py`. If missing, it appends the test methods using `hasattr` checks to skip tests if the target code is rolled back.

### Engine Updates (`engine.py` -> `proposed_engine.py`)
1.  **Auto-Resume Capability**: Detect the latest version in the `history/` directory matching `target_module.v(\d+).py` and initialize `version_idx` to this value (11 in this case).
2.  **Graceful Stop Check**: At the beginning of each iteration (and during rate limit sleeps), the engine checks for the presence of `stop.flag` or `command.txt` containing `중단` or `stop`. If found, it clears the flags, saves the log, and exits gracefully with success status.
3.  **Limits & Safety**: Supports the 5-hour session timeout, token budget checks, and request limit verification in a daemonized continuous loop with a brief sleep interval (`time.sleep(1.0)`) between iterations.

---

## 3. Reference Implementations
Proposed replacements are fully written and stored in the working directory:
*   `proposed_config.py`
*   `proposed_simulator.py`
*   `proposed_engine.py`
*   `proposed_run.py`

These files can be deployed directly into `self_improvement_loop` to start the resumed loop execution.
