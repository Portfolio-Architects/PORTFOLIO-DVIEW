## 2026-07-14T14:59:20Z
You are the Worker for Milestone 2 (Test Runner & Setup) of the Self-Improvement Loop project.
Your working directory is: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m2.

Your task is to:
1. Implement `self_improvement_loop/runner.py` containing the `TestRunner` class:
   - `__init__(test_file: str)`: Stores the test file path.
   - `run_tests() -> dict`: Executes the test file via `subprocess.run` using the Python interpreter in `.venv` (you can get the interpreter path dynamically or use `sys.executable`). It must capture stdout/stderr and return `{"success": bool, "stdout": str, "stderr": str, "returncode": int}`.
2. Implement the initial `self_improvement_loop/target_module.py` with a buggy `Calculator` class:
   ```python
   class Calculator:
       def add(self, a, b):
           # BUG: Returns subtraction instead of addition
           return a - b
   ```
3. Implement `self_improvement_loop/test_target_module.py` using Python's built-in `unittest` module. It must contain:
   - `test_add` asserting `add(2, 3) == 5`.
   - `test_subtract` asserting `subtract(5, 2) == 3`.
   - `test_multiply` asserting `multiply(3, 4) == 12`.
   - Ensure the test script runs when executed (i.e., has `if __name__ == '__main__': unittest.main()`).
4. Verify your implementation by running a script or test command using `.venv\Scripts\python.exe` to run `runner.py` and execute the tests on the initial buggy module. Check that the tests fail and the output captures the failures (both `test_add` failure and missing attributes/methods error for `subtract` and `multiply`).
5. Record your changes in `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m2\changes.md`.
6. Write a handoff.md and send a completion message to the parent orchestrator.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT
hardcode test results, create dummy/facade implementations, or
circumvent the intended task. A Forensic Auditor will independently
verify your work. Integrity violations WILL be detected and your
work WILL be rejected.
