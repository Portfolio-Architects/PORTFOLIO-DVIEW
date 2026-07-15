# Self-Improvement Loop Environment & Architecture Analysis

## 1. Runtime Environment Investigation

The available runtime environment on the host system was investigated directly by running shell commands:

### A. Python & pip in `.venv`
- **Python Version**: `Python 3.14.3` (verified via `& .venv\Scripts\python.exe --version`)
- **pip Version**: `pip 26.0.1` (verified via `& .venv\Scripts\python.exe -m pip --version`)
- **Installed Packages**: A clean virtual environment with only `pip` installed (verified via `& .venv\Scripts\python.exe -m pip list`).
- **Functionality**: Fully functional. It is isolated from the system Python, allowing clean script execution.

### B. Node.js & npm
- **Node.js Version**: `v24.14.0` (verified via `node --version`)
- **npm Version**: `11.9.0` (verified via `npm --version`)
- **Usage**: Node.js and npm are installed globally and are fully functional (managing the `frontend` workspace dependencies).

### C. Git Availability & Rollback Recommendations
- **Git Version**: `git version 2.55.0.windows.2` (verified via `git --version`)
- **Git VCS Suitability**: While git is available, we **strongly recommend implementing a custom file-based versioning/rollback system** for the Self-Improvement Loop prototype.
- **Why Custom File-Based VCS?**
  1. **Isolation**: A custom file-based system prevents polluting the project's global Git repository with numerous micro-commits generated during automated self-improvement iterations.
  2. **Simplicity & Speed**: File operations (saving copies, generating diffs via `difflib`, reverting files) are extremely fast, predictable, and do not suffer from Git lock files (`.git/index.lock` collisions) or stash/merge conflicts during concurrent agent tasks.
  3. **No Side Effects**: It is completely local to the prototype directory, preventing accidental modification of untracked files or branches in the main workspace.

---

## 2. Programming Language Recommendation

We highly recommend using **Python** for implementing the Self-Improvement Loop prototype.
- **Rationale**:
  - The workspace already contains a configured `.venv` running Python 3.14.3.
  - Python's standard library provides all the necessary modules out of the box, ensuring that the engine can run in **CODE_ONLY network mode** without needing to download external packages:
    - `unittest`: Standard framework for running tests and collecting status/failures.
    - `difflib`: Built-in diff utility to create clean, human-readable patch diffs between iterations.
    - `shutil` / `os` / `sys`: Robust file system operations (copying, moving, directory management) and execution subprocesses.
    - `json`: Parsing configurations and writing structured execution logs/history.
  - By using Python with the built-in standard library, we bypass the need to install dependencies (like `pytest` or external diff tools), guaranteeing 100% offline reliability.

---

## 3. Self-Improvement Loop Engine Architecture Design (R1, R2, R3)

The loop engine will be structured inside the `self_improvement_loop/` directory. The architecture separates the loop controller from the testing harness, the mock LLM, and the VCS manager.

```
self_improvement_loop/
├── config.py              # Configuration settings (iteration limits, timeout, target file path)
├── engine.py              # Main loop orchestration logic (R1, R3)
├── runner.py              # Test runner executing the target test suite (R1, R2)
├── simulator.py           # Mock LLM Simulator providing code improvements/errors (R1)
├── vcs.py                 # File-based versioning controller (backups, restore, diffs) (R3)
├── run.py                 # Entry point CLI script for execution
└── history/               # Directory storing copies of target code and diffs per iteration (R3)
```

### Architectural Mapping to Requirements:
- **R1 (Self-Improvement Loop Engine)**:
  - `engine.py` orchestrates the flow:
    1. Runs the test suite via `runner.py`.
    2. Gathers test execution outcomes (pass/fail, tracebacks).
    3. Feeds code + errors into `simulator.py` (Mock LLM) to get corrected/improved code.
    4. Applies the rewritten code to the target file.
    5. Backs up the new version using `vcs.py`.
    6. Loops until limits are met or all tests pass.
- **R2 (Test-Driven Expansion)**:
  - The `runner.py` executes a test suite (`test_target_module.py`).
  - The test suite is pre-written with incremental requirements or can be updated dynamically.
  - When code is rewritten, `runner.py` runs the entire suite, ensuring that previously passing tests do not break (regression prevention).
- **R3 (Safety & Rollback Guardrails)**:
  - `config.py` enforces a `MAX_ITERATIONS` limit (defaults to 10, max 10) and a loop execution timeout.
  - If a compile/syntax error or serious regression is introduced, `engine.py` detects the failure and invokes `vcs.py` to restore the last stable version from the `history/` directory.
  - Each iteration generates a structured log entry and a diff file (e.g., `history/iteration_X_diff.patch` using `difflib.unified_diff`) detailing what changed.

---

## 4. Mock LLM / Local Simulator Design

Since we are in **CODE_ONLY network mode** and cannot make external API calls, `simulator.py` implements a rule-based mock engine that mimics an LLM correcting code and adding features.

### Simulator Strategy
The simulator maintains a mapping of current target code characteristics or iteration counts to pre-defined code states. It takes three parameters:
1. `current_code`: The existing code of the target file.
2. `iteration`: The current loop iteration index.
3. `inject_syntax_error`: A boolean flag indicating whether the simulator should intentionally return broken syntax to trigger a rollback test.

### Simulated Code Evolution Mapping
To simulate a real self-improvement process, we define a target class `Calculator` that evolves step-by-step:

- **Initial State (Iteration 0)**:
  - The target file `target_module.py` contains a buggy `Calculator` class:
    ```python
    class Calculator:
        def add(self, a, b):
            # BUG: Returns subtraction instead of addition
            return a - b
    ```
- **Iteration 1 (Correcting Bug)**:
  - Simulator detects the subtraction bug (or checks `iteration == 1`) and rewrites it to:
    ```python
    class Calculator:
        def add(self, a, b):
            return a + b
    ```
- **Iteration 2 (Adding Subtraction)**:
  - Simulator expands functionality to support the `subtract` test case:
    ```python
    class Calculator:
        def add(self, a, b):
            return a + b
            
        def subtract(self, a, b):
            return a - b
    ```
- **Iteration 3 (Adding Multiplication)**:
  - Simulator expands functionality to support the `multiply` test case:
    ```python
    class Calculator:
        def add(self, a, b):
            return a + b
            
        def subtract(self, a, b):
            return a - b
            
        def multiply(self, a, b):
            return a * b
    ```
- **Syntax Error Injection (Requested on Iteration 4)**:
  - If `inject_syntax_error` is `True` (or iteration is configured to fail), the simulator intentionally introduces invalid Python syntax (e.g., missing colons, unbalanced brackets, or invalid operators):
    ```python
    class Calculator:
        def add(self, a, b) # Syntax Error: Missing colon
            return a + b
    ```

---

## 5. Demonstration Test Case & Rollback Scenario

To verify the loop, we will establish a target module and test file in the workspace:
- **Target File**: `self_improvement_loop/target_module.py`
- **Test File**: `self_improvement_loop/test_target_module.py`

### Step-by-Step Execution Scenario
1. **Setup**: Write the initial buggy `target_module.py` (v0) and the test script `test_target_module.py` containing three tests:
   - `test_add`: Asserts `add(2, 3) == 5`.
   - `test_subtract`: Asserts `subtract(5, 2) == 3`. (Initially absent in v0)
   - `test_multiply`: Asserts `multiply(3, 4) == 12`. (Initially absent in v0)
2. **Iteration 1**:
   - Engine runs tests $\rightarrow$ `test_add` fails due to buggy subtraction implementation.
   - Simulator generates corrected code (v1) resolving the bug.
   - Engine runs tests $\rightarrow$ `test_add` passes. `vcs.py` saves v1 to `history/` and logs the diff.
3. **Iteration 2**:
   - Engine runs tests with the next test case (`test_subtract` active) $\rightarrow$ Fails (missing method).
   - Simulator generates updated code (v2) adding `subtract(a, b)`.
   - Engine runs tests $\rightarrow$ `test_add` and `test_subtract` pass. `vcs.py` saves v2 and logs the diff.
4. **Iteration 3**:
   - Engine runs tests with the next test case (`test_multiply` active) $\rightarrow$ Fails (missing method).
   - Simulator generates updated code (v3) adding `multiply(a, b)`.
   - Engine runs tests $\rightarrow$ `test_add`, `test_subtract`, and `test_multiply` pass. `vcs.py` saves v3 and logs the diff.
   - **We have reached 3 successful improvement iterations!**
5. **Iteration 4 (Rollback Verification)**:
   - Engine commands the simulator to inject a syntax error (or triggers error injection mode).
   - Simulator writes broken code (v4) with a missing colon.
   - Engine attempts to run tests $\rightarrow$ Fails with a compile-time `SyntaxError` (or test execution crash).
   - **Guardrail Action**: Engine detects the failure, rejects the v4 change, and calls `vcs.py.rollback()`.
   - `vcs.py` restores `target_module.py` to the content of v3 (Iteration 3).
   - Engine runs tests one final time $\rightarrow$ Verifies all tests pass again.
   - Engine stops and writes a summary report (`history/final_report.json`).

---

## 6. Recommended File Structure & Implementation Plan

We recommend the following file structures and contents to be implemented by the worker agent:

### `self_improvement_loop/config.py`
Contains directory constants and parameter configurations.
```python
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TARGET_FILE = os.path.join(BASE_DIR, "target_module.py")
TEST_FILE = os.path.join(BASE_DIR, "test_target_module.py")
HISTORY_DIR = os.path.join(BASE_DIR, "history")
MAX_ITERATIONS = 10
TIMEOUT_SECONDS = 60
```

### `self_improvement_loop/vcs.py`
Implements copy-on-write version control, rollback, and diff generation.
```python
import os
import shutil
import difflib

class CustomVCS:
    def __init__(self, history_dir, target_file):
        self.history_dir = history_dir
        self.target_file = target_file
        os.makedirs(self.history_dir, exist_ok=True)

    def save_version(self, version_idx: int, code: str):
        # Save file snapshot
        version_path = os.path.join(self.history_dir, f"target_module.v{version_idx}.py")
        with open(version_path, "w", encoding="utf-8") as f:
            f.write(code)

    def generate_diff(self, version_idx: int, old_code: str, new_code: str) -> str:
        diff = list(difflib.unified_diff(
            old_code.splitlines(keepends=True),
            new_code.splitlines(keepends=True),
            fromfile=f"target_module.v{version_idx-1}.py",
            tofile=f"target_module.v{version_idx}.py"
        ))
        diff_text = "".join(diff)
        diff_path = os.path.join(self.history_dir, f"patch_v{version_idx}.diff")
        with open(diff_path, "w", encoding="utf-8") as f:
            f.write(diff_text)
        return diff_text

    def restore_version(self, version_idx: int) -> str:
        version_path = os.path.join(self.history_dir, f"target_module.v{version_idx}.py")
        if not os.path.exists(version_path):
            raise FileNotFoundError(f"Version v{version_idx} does not exist.")
        shutil.copy2(version_path, self.target_file)
        with open(self.target_file, "r", encoding="utf-8") as f:
            return f.read()
```

### `self_improvement_loop/simulator.py`
Implements rule-based code modification states mimicking LLM self-improvement.
```python
class MockLLMSimulator:
    def get_improved_code(self, current_code: str, iteration: int, inject_syntax_error: bool = False) -> str:
        if inject_syntax_error:
            # Returns broken python syntax
            return """class Calculator:
    def add(self, a, b) # Syntax Error: Missing colon
        return a + b
"""
        
        if iteration == 1:
            # Fix add function
            return """class Calculator:
    def add(self, a, b):
        return a + b
"""
        elif iteration == 2:
            # Add subtract function
            return """class Calculator:
    def add(self, a, b):
        return a + b

    def subtract(self, a, b):
        return a - b
"""
        elif iteration == 3:
            # Add multiply function
            return """class Calculator:
    def add(self, a, b):
        return a + b

    def subtract(self, a, b):
        return a - b

    def multiply(self, a, b):
        return a * b
"""
        return current_code
```

### `self_improvement_loop/runner.py`
Executes test files using a separate python subprocess.
```python
import subprocess
import sys

class TestRunner:
    def __init__(self, test_file):
        self.test_file = test_file

    def run_tests(self) -> dict:
        # Run tests using unittest in a clean Python subprocess
        res = subprocess.run(
            [sys.executable, self.test_file],
            capture_output=True,
            text=True
        )
        success = res.returncode == 0
        return {
            "success": success,
            "stdout": res.stdout,
            "stderr": res.stderr,
            "returncode": res.returncode
        }
```

### `self_improvement_loop/engine.py`
Orchestrates the entire iteration process, checks stability, and triggers rollback upon failures.
```python
import os
import json
from config import TARGET_FILE, TEST_FILE, HISTORY_DIR, MAX_ITERATIONS
from vcs import CustomVCS
from runner import TestRunner
from simulator import MockLLMSimulator

class SelfImprovementEngine:
    def __init__(self):
        self.vcs = CustomVCS(HISTORY_DIR, TARGET_FILE)
        self.runner = TestRunner(TEST_FILE)
        self.simulator = MockLLMSimulator()
        self.logs = []

    def log_event(self, iteration: int, status: str, details: dict):
        self.logs.append({
            "iteration": iteration,
            "status": status,
            "details": details
        })
        # Write logs out to history
        with open(os.path.join(HISTORY_DIR, "execution_log.json"), "w", encoding="utf-8") as f:
            json.dump(self.logs, f, indent=2)

    def run(self):
        # 1. Read original target code and save it as version 0
        with open(TARGET_FILE, "r", encoding="utf-8") as f:
            current_code = f.read()
        self.vcs.save_version(0, current_code)
        
        last_stable_version = 0
        
        for iteration in range(1, MAX_ITERATIONS + 1):
            print(f"--- Iteration {iteration} ---")
            
            # Decide if we should inject an error on iteration 4 to test rollback
            inject_error = (iteration == 4)
            
            # Get rewritten code from Simulator
            new_code = self.simulator.get_improved_code(current_code, iteration, inject_error)
            
            # Write to target file
            with open(TARGET_FILE, "w", encoding="utf-8") as f:
                f.write(new_code)
                
            # Run test suite
            test_results = self.runner.run_tests()
            
            if test_results["success"]:
                print(f"Iteration {iteration}: Tests PASSED.")
                self.vcs.save_version(iteration, new_code)
                diff = self.vcs.generate_diff(iteration, current_code, new_code)
                self.log_event(iteration, "SUCCESS", {
                    "diff": diff,
                    "test_output": test_results["stdout"] + test_results["stderr"]
                })
                current_code = new_code
                last_stable_version = iteration
            else:
                print(f"Iteration {iteration}: Tests FAILED. Triggering Rollback.")
                # Save version to history for debug reference
                self.vcs.save_version(iteration, new_code)
                diff = self.vcs.generate_diff(iteration, current_code, new_code)
                
                # Rollback target file to last stable version
                restored_code = self.vcs.restore_version(last_stable_version)
                print(f"Rollback complete. Restored to version {last_stable_version}.")
                
                self.log_event(iteration, "ROLLBACK", {
                    "diff": diff,
                    "failure_details": test_results["stderr"],
                    "restored_version": last_stable_version
                })
                
                # Verify that restored code compiles and passes tests
                final_check = self.runner.run_tests()
                if final_check["success"]:
                    print("Verification check PASSED after rollback.")
                else:
                    print("CRITICAL: Verification check FAILED even after rollback!")
                break
```
