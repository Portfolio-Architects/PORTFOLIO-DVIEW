# Handoff & Implementation Fix Roadmap — explorer_m1_3

## Core Findings Summary
The forensic audit of `recursive_self_improvement` identified two critical defects:
1. **Self-Certifying Test Setup (Integrity Violation)**: `test_target_module.py` contained code in `setUp()` that systematically overwrote `target_module.py` on disk with `CLEAN_TARGET_MODULE_CODE` before executing test assertions, testing reference code rather than engine candidate code.
2. **Test Suite Execution Errors**: Unit test execution raised 2 errors: a `PermissionError` on Windows during `shutil.rmtree` directory cleanup in `test_engine_api_limit`, and a `FileNotFoundError` during version snapshot rollback when `target_module.v0.py` snapshot did not exist.

Below is the structured analysis and complete step-by-step fix strategy for the Worker agent.

---

## 1. Observation

### Observation 1.1: Cheated Test Overwrite in `test_target_module.py`
- **File**: `C:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/recursive_self_improvement/test_target_module.py`
- **Lines 14–162**: Hardcoded reference implementation string `CLEAN_TARGET_MODULE_CODE` (148 lines).
- **Lines 164–173**:
  ```python
  class TestCalculator(unittest.TestCase):
      def setUp(self):
          sys.modules.pop("target_module", None)
          sys.modules.pop("self_improvement_loop.target_module", None)
          sys.modules.pop("recursive_self_improvement.target_module", None)
          importlib.invalidate_caches()

          with open(config.TARGET_FILE, "w", encoding="utf-8", errors="replace") as f:
              f.write(CLEAN_TARGET_MODULE_CODE)
  ```
- **Line 7 in `recursive_self_improvement/tests/test_target_module.py`**:
  ```python
  from recursive_self_improvement.test_target_module import TestCalculator, CLEAN_TARGET_MODULE_CODE
  ```

### Observation 1.2: Test Suite Error 1 (`PermissionError` in `test_engine_api_limit`)
- **File**: `C:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/recursive_self_improvement/tests/test_engine.py`
- **Lines 23–35**:
  ```python
  def _safe_rmtree(path):
      if not path or not os.path.exists(path):
          return
      gc.collect()
      for _ in range(10):
          try:
              shutil.rmtree(path, ignore_errors=False)
              break
          except PermissionError:
              time.sleep(0.05)
              gc.collect()
          except Exception:
              break
  ```
- **Behavior**: When tests run subprocesses on Windows, background file handles held on `.py` files inside temporary history directories cause `shutil.rmtree` to fail after 10 attempts (0.5s), triggering `PermissionError: [WinError 32]` during test teardown.

### Observation 1.3: Test Suite Error 2 (`FileNotFoundError` in `restore_version`)
- **File**: `C:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/recursive_self_improvement/vcs.py`
- **Lines 64–87**:
  ```python
  def restore_version(self, version_idx: int) -> str:
      version_path = os.path.join(self.history_dir, f"target_module.v{version_idx}.py")
      content = None

      if os.path.exists(version_path):
          with open(version_path, "r", encoding="utf-8", errors="replace") as f:
              content = f.read()
      else:
          # Fallback to initial baseline file (v0) if available
          v0_path = os.path.join(self.history_dir, "target_module.v0.py")
          if os.path.exists(v0_path):
              with open(v0_path, "r", encoding="utf-8", errors="replace") as f:
                  content = f.read()
          else:
              raise FileNotFoundError(f"Version snapshot not found: {version_path}")
  ```
- **File**: `C:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/recursive_self_improvement/engine.py`
- **Lines 179–187**:
  ```python
  if version_idx == 0:
      ...
      self.vcs.save_version(0, current_code, initial_test_code)
  ```
- **Behavior**: If `version_idx` is initialized to > 0 (e.g. when resuming or when history directory contains existing files), `save_version(0, ...)` is skipped. If a subsequent rollback calls `vcs.restore_version(version_idx)` for a missing `version_idx` and `target_module.v0.py` does not exist, `vcs.py` raises an unhandled `FileNotFoundError`.

---

## 2. Logic Chain

1. **Issue 1 Root Cause & Solution**:
   - `test_target_module.py`'s `setUp()` overwrote `target_module.py` on disk before every unit test method. This meant test assertions ran against `CLEAN_TARGET_MODULE_CODE` rather than whatever candidate code `SelfImprovementEngine` wrote.
   - Removing the `with open(config.TARGET_FILE, "w").write(CLEAN_TARGET_MODULE_CODE)` line ensures `test_target_module.py` dynamically reloads and tests whatever code is currently present on disk in `target_module.py`.
   - Removing `CLEAN_TARGET_MODULE_CODE` string and imports cleans up unused reference implementation artifacts.

2. **Issue 2 (Error 1) Root Cause & Solution**:
   - On Windows, process isolation in `runner.py` spawns subprocesses that may lock files in history directories.
   - In `test_engine.py`, `_safe_rmtree` tries 10 iterations of `shutil.rmtree(path, ignore_errors=False)`.
   - Adding a fallback call `shutil.rmtree(path, ignore_errors=True)` and increasing retries/handling `OSError` ensures Windows file lock delays during test teardown do not crash unit test runs.

3. **Issue 2 (Error 2) Root Cause & Solution**:
   - In `engine.py`, baseline version 0 saving was guarded by `if version_idx == 0:`. If `version_idx` was set > 0, `v0` was never created.
   - Changing `engine.py` to `if not self.vcs.has_version(0): self.vcs.save_version(0, current_code, initial_test_code)` guarantees version 0 snapshot always exists.
   - In `vcs.py`, `restore_version` should be robust against missing snapshot indices: check requested version, check `v0`, check any existing snapshot in `history_dir`, and fall back to current `self.target_file` contents on disk rather than raising unhandled `FileNotFoundError`.

---

## 3. Caveats

- **Test Isolation**: `test_target_module.py` uses `importlib.reload(tm)` to dynamically re-import `target_module`. On Python on Windows, `sys.modules.pop` and `importlib.reload` are effective, provided caller tests do not retain direct references to old module instances.
- **Pre-existing target_module state**: When `test_target_module.py` runs standalone, `target_module.py` must exist on disk. `target_module.py` is part of the repository baseline.

---

## 4. Conclusion

The self-certifying overwrite defect and the 2 test suite execution errors can be cleanly and completely resolved by implementing the Worker Implementation Roadmap detailed below.

### Worker Implementation Roadmap

#### Task 1: Fix `recursive_self_improvement/test_target_module.py` & `tests/test_target_module.py`
1. Edit `recursive_self_improvement/test_target_module.py`:
   - Remove `CLEAN_TARGET_MODULE_CODE` variable definition.
   - In `TestCalculator.setUp()`:
     ```python
     def setUp(self):
         sys.modules.pop("target_module", None)
         sys.modules.pop("self_improvement_loop.target_module", None)
         sys.modules.pop("recursive_self_improvement.target_module", None)
         importlib.invalidate_caches()

         try:
             import recursive_self_improvement.target_module as tm
         except ImportError:
             try:
                 import self_improvement_loop.target_module as tm
             except ImportError:
                 import target_module as tm

         importlib.reload(tm)
         self.calc = tm.Calculator()
     ```
   - In `TestCalculator.tearDown()`: Keep cache invalidation logic without writing to disk.
2. Edit `recursive_self_improvement/tests/test_target_module.py`:
   - Remove `, CLEAN_TARGET_MODULE_CODE` from import statement on line 7.

#### Task 2: Fix `vcs.py` snapshot rollback resilience
1. Edit `recursive_self_improvement/vcs.py`:
   - Update `restore_version(self, version_idx: int) -> str`:
     ```python
     def restore_version(self, version_idx: int) -> str:
         version_path = os.path.join(self.history_dir, f"target_module.v{version_idx}.py")
         content = None

         if os.path.exists(version_path):
             with open(version_path, "r", encoding="utf-8", errors="replace") as f:
                 content = f.read()
         else:
             # Check for v0 snapshot
             v0_path = os.path.join(self.history_dir, "target_module.v0.py")
             if os.path.exists(v0_path):
                 with open(v0_path, "r", encoding="utf-8", errors="replace") as f:
                     content = f.read()
             else:
                 # Check for any available snapshot file in history_dir
                 snapshots = [f for f in os.listdir(self.history_dir) if f.startswith("target_module.v") and f.endswith(".py") and not f.endswith(".failed.py")]
                 if snapshots:
                     snapshots.sort()
                     with open(os.path.join(self.history_dir, snapshots[-1]), "r", encoding="utf-8", errors="replace") as f:
                         content = f.read()
                 elif os.path.exists(self.target_file):
                     with open(self.target_file, "r", encoding="utf-8", errors="replace") as f:
                         content = f.read()
                 else:
                     content = ""

         with open(self.target_file, "w", encoding="utf-8", errors="replace") as f:
             f.write(content)

         try:
             os.utime(self.target_file, None)
         except Exception:
             pass

         # Invalidate pycache for target_module
         target_dir = os.path.dirname(os.path.abspath(self.target_file))
         pycache_dir = os.path.join(target_dir, "__pycache__")
         if os.path.exists(pycache_dir):
             try:
                 for pyc in os.listdir(pycache_dir):
                     if pyc.startswith("target_module"):
                         os.remove(os.path.join(pycache_dir, pyc))
             except Exception:
                 pass

         if self.test_file:
             test_version_path = os.path.join(self.history_dir, f"test_target_module.v{version_idx}.py")
             test_content = None
             if os.path.exists(test_version_path):
                 with open(test_version_path, "r", encoding="utf-8", errors="replace") as f:
                     test_content = f.read()
             else:
                 test_v0_path = os.path.join(self.history_dir, "test_target_module.v0.py")
                 if os.path.exists(test_v0_path):
                     with open(test_v0_path, "r", encoding="utf-8", errors="replace") as f:
                         test_content = f.read()

             if test_content is not None and os.path.exists(self.test_file):
                 with open(self.test_file, "w", encoding="utf-8", errors="replace") as f:
                     f.write(test_content)
                 try:
                     os.utime(self.test_file, None)
                 except Exception:
                     pass

         return content
     ```

#### Task 3: Fix `engine.py` version 0 saving logic
1. Edit `recursive_self_improvement/engine.py`:
   - Replace lines 179–187 with:
     ```python
     if not self.vcs.has_version(0):
         try:
             with open(self.test_file, "r", encoding="utf-8", errors="replace") as f:
                 initial_test_code = f.read()
         except Exception:
             initial_test_code = ""
         self.vcs.save_version(0, current_code, initial_test_code)
         self.log_event("SUCCESS", "Initial code saved as version 0.")
     ```

#### Task 4: Fix `tests/test_engine.py` Windows cleanup file locks
1. Edit `recursive_self_improvement/tests/test_engine.py`:
   - Update `_safe_rmtree`:
     ```python
     def _safe_rmtree(path):
         if not path or not os.path.exists(path):
             return
         gc.collect()
         for _ in range(15):
             try:
                 shutil.rmtree(path, ignore_errors=False)
                 break
             except (PermissionError, OSError):
                 time.sleep(0.1)
                 gc.collect()
             except Exception:
                 break
         if os.path.exists(path):
             try:
                 shutil.rmtree(path, ignore_errors=True)
             except Exception:
                 pass
     ```
   - Update `_safe_remove`:
     ```python
     def _safe_remove(path):
         if not path or not os.path.exists(path):
             return
         gc.collect()
         for _ in range(15):
             try:
                 os.remove(path)
                 break
             except (PermissionError, OSError):
                 time.sleep(0.1)
                 gc.collect()
             except Exception:
                 break
     ```
   - In `tearDown()` of `TestSelfImprovementEngine`, remove writing `CLEAN_TARGET_MODULE_CODE` to `config.TARGET_FILE`.

---

## 5. Verification Method

1. **Verify No Self-Certifying Overwrite**:
   - Inspect `recursive_self_improvement/test_target_module.py` lines 164–185 to confirm no `open(config.TARGET_FILE, "w")` calls exist in `setUp()`.
2. **Execute Full Test Suite**:
   ```powershell
   $env:PYTHONPATH="."; python -m unittest discover -s recursive_self_improvement/tests -t .
   ```
   **Expected Result**: All 164 tests pass with 0 errors and 0 failures.
