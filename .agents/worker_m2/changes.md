# Milestone 2: Test Runner & Setup Changes

## Implemented Files
1. **`self_improvement_loop/runner.py`**:
   - Implemented the `TestRunner` class.
   - Designed dynamic resolution of the Python executable inside the virtual environment (`.venv`), falling back to `sys.executable` if not present.
   - Used `subprocess.run` to execute the specified test file and capture stdout/stderr, returning a structured dict: `{"success": bool, "stdout": str, "stderr": str, "returncode": int}`.
   - Added direct script execution support for local debugging and manual runs.

2. **`self_improvement_loop/target_module.py`**:
   - Initial implementation of the `Calculator` class with the buggy `add` method (`return a - b`) and missing `subtract`/`multiply` methods to act as the test target.

3. **`self_improvement_loop/test_target_module.py`**:
   - Implemented `unittest.TestCase` suite with:
     - `test_add` asserting `add(2, 3) == 5`.
     - `test_subtract` asserting `subtract(5, 2) == 3`.
     - `test_multiply` asserting `multiply(3, 4) == 12`.
   - Included fallback importing logic supporting both localized import and module paths.
   - Added `if __name__ == '__main__': unittest.main()`.

## Test Execution Results (Buggy Initial Run)
Running `.venv\Scripts\python.exe self_improvement_loop\runner.py` produced:
```
--- Test Run Results ---
Success: False
Return Code: 1
Stdout:

Stderr:
FEE
======================================================================
ERROR: test_multiply (__main__.TestCalculator.test_multiply)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\self_improvement_loop\test_target_module.py", line 18, in test_multiply
    self.assertEqual(self.calc.multiply(3, 4), 12)
                     ^^^^^^^^^^^^^^^^^^
AttributeError: 'Calculator' object has no attribute 'multiply'

======================================================================
ERROR: test_subtract (__main__.TestCalculator.test_subtract)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\self_improvement_loop\test_target_module.py", line 15, in test_subtract
    self.assertEqual(self.calc.subtract(5, 2), 3)
                     ^^^^^^^^^^^^^^^^^^
AttributeError: 'Calculator' object has no attribute 'subtract'

======================================================================
FAIL: test_add (__main__.TestCalculator.test_add)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\self_improvement_loop\test_target_module.py", line 12, in test_add
    self.assertEqual(self.calc.add(2, 3), 5)
    ~~~~~~~~~~~~~~~~^^^^^^^^^^^^^^^^^^^^^^^^
AssertionError: -1 != 5

----------------------------------------------------------------------
Ran 3 tests in 0.003s

FAILED (failures=1, errors=2)
```
As expected, `test_add` failed, and `test_subtract` / `test_multiply` raised `AttributeError` due to missing methods.
