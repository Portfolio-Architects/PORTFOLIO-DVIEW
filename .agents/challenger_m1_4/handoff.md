# Handoff Report — challenger_m1_4

## Verdict
**REQUEST_CHANGES**

---

## 1. Observation

### Observation 1: `test_target_module.py` Destroys Disk State Without Restoration
In `recursive_self_improvement/test_target_module.py` (lines 165–189):
```python
165:     def setUp(self):
166:         sys.modules.pop("target_module", None)
...
171:         with open(config.TARGET_FILE, "w", encoding="utf-8", errors="replace") as f:
172:             f.write(CLEAN_TARGET_MODULE_CODE)
...
185:     def tearDown(self):
186:         sys.modules.pop("target_module", None)
187:         sys.modules.pop("self_improvement_loop.target_module", None)
188:         sys.modules.pop("recursive_self_improvement.target_module", None)
189:         importlib.invalidate_caches()
```
`setUp()` overwrites `config.TARGET_FILE` (`target_module.py`) on disk without creating a backup. `tearDown()` only clears `sys.modules` caches and does not restore `config.TARGET_FILE` to its original pre-test content.

**Empirical Verification Command**:
`python .agents/challenger_m1_4/harness_state_isolation.py`

**Empirical Result**:
```
[PRE-TEST] Wrote sentinel to C:\Users\ocs56\OneDrive\...\recursive_self_improvement\target_module.py
[TEST RUN] Executed 21 tests. Errors: 0, Failures: 0
[POST-TEST] Sentinel preserved in target_module.py? False
[POST-TEST] recursive_self_improvement.target_module in sys.modules? False
```
Pre-existing code in `target_module.py` was permanently overwritten with `CLEAN_TARGET_MODULE_CODE`.

---

### Observation 2: `test_engine.py` `tearDown` Fails to Restore Target File Backup
In `recursive_self_improvement/tests/test_engine.py` (lines 198–240):
```python
198:         self.target_backup = config.TARGET_FILE + ".backup"
199:         if os.path.exists(config.TARGET_FILE):
200:             shutil.copyfile(config.TARGET_FILE, self.target_backup)

221:     def tearDown(self):
222:         try:
223:             with open(config.TARGET_FILE, "w", encoding="utf-8", errors="replace") as f:
224:                 f.write(CLEAN_TARGET_MODULE_CODE)
225:         except Exception:
226:             pass
227: 
228:         if hasattr(self, 'test_backup') and os.path.exists(self.test_backup):
229:             try:
230:                 shutil.copyfile(self.test_backup, config.TEST_FILE)
231:             except Exception:
232:                 pass
233: 
234:         if hasattr(self, 'target_backup'):
235:             _safe_remove(self.target_backup)
```
In `setUp()`, `config.TARGET_FILE` is backed up to `self.target_backup`. In `tearDown()`, line 223 overwrites `config.TARGET_FILE` with `CLEAN_TARGET_MODULE_CODE` and line 235 deletes `self.target_backup` without copying `self.target_backup` back to `config.TARGET_FILE`. Contrast with line 230 where `self.test_backup` IS correctly copied back to `config.TEST_FILE`.

**Empirical Verification Command**:
`python .agents/challenger_m1_4/harness_permission_handling.py`

**Empirical Result**:
```
[PRE-TEST] Wrote target sentinel to C:\Users\ocs56\OneDrive\...\recursive_self_improvement\target_module.py
[IN-TEST] Target backup exists after setUp? True
[POST-TEARDOWN] Target sentinel restored to target_module.py? False
```
Pre-existing code in `target_module.py` is lost and replaced with `CLEAN_TARGET_MODULE_CODE` when `test_engine.py` runs.

---

### Observation 3: `_safe_rmtree` Silently Fails on Locked and Read-Only Files on Windows
In `recursive_self_improvement/tests/test_engine.py` (lines 23–35):
```python
23: def _safe_rmtree(path):
24:     if not path or not os.path.exists(path):
25:         return
26:     gc.collect()
27:     for _ in range(10):
28:         try:
29:             shutil.rmtree(path, ignore_errors=False)
30:             break
31:         except PermissionError:
32:             time.sleep(0.05)
33:             gc.collect()
34:         except Exception:
35:             break
```
On Windows:
1. If an unclosed file handle is active (or a subprocess holds a handle), `shutil.rmtree` raises `PermissionError`. `_safe_rmtree` retries 10 times (0.5s total), then hits `except Exception: break` and exits silently without deleting the directory or reporting an error.
2. If files inside `path` have read-only attributes (`stat.S_IREAD`), `shutil.rmtree` without an `onerror`/`onexc` permission handler raises `PermissionError` every time. All 10 retries fail and `_safe_rmtree` leaves the test history directory on disk silently.

**Empirical Verification Command**:
`python .agents/challenger_m1_4/harness_permission_handling.py`

**Empirical Result**:
```
[LOCKED FILE TEST] Elapsed time: 0.53s, Directory still exists after _safe_rmtree? True
[READONLY FILE TEST] Directory still exists after _safe_rmtree? True
```

---

## 2. Logic Chain

1. **State Isolation in `test_target_module.py`**:
   - `setUp()` writes `CLEAN_TARGET_MODULE_CODE` directly to `config.TARGET_FILE` on disk without backing up existing contents.
   - `tearDown()` does not restore `config.TARGET_FILE`.
   - *Logic*: Running `test_target_module.py` side-effects the disk environment by wiping user/baseline code in `target_module.py`.

2. **Target File Restoration in `test_engine.py`**:
   - `setUp()` creates `self.target_backup` from `config.TARGET_FILE`.
   - `tearDown()` writes `CLEAN_TARGET_MODULE_CODE` to `config.TARGET_FILE` and deletes `self.target_backup` without copying `self.target_backup` back to `config.TARGET_FILE`.
   - *Logic*: `TestSelfImprovementEngine` fails to restore state isolation, leaving `config.TARGET_FILE` overwritten by boilerplate code instead of restoring the original file.

3. **Windows `tearDown` Permission Handling in `test_engine.py`**:
   - `_safe_rmtree` lacks a permission error handler for read-only files (`stat.S_IREAD`).
   - `_safe_rmtree` swallows permission failures silently after 10 retries.
   - *Logic*: On Windows environments, locked or read-only files created during test runs will silently prevent cleanup, leaking `test_history_*` directories on disk.

4. **Synthesis**:
   - The test suite exhibits state pollution bugs and incomplete permission handling on Windows.

---

## 3. Caveats

No caveats. All findings were verified empirically on Windows 11 with Python 3.13.

---

## 4. Conclusion

The implementation has 3 concrete state isolation and cleanup defects. Explicit Verdict: **REQUEST_CHANGES**.

### Actionable Remediation Items:
1. **Fix `test_target_module.py` State Isolation**: Modify `TestCalculator` `setUp` and `tearDown` to back up and restore `config.TARGET_FILE`, or use a temporary target file during unit testing.
2. **Fix `test_engine.py` Target Restoration**: In `TestSelfImprovementEngine.tearDown()`, change lines 222–226 to restore `config.TARGET_FILE` from `self.target_backup` (`shutil.copyfile(self.target_backup, config.TARGET_FILE)`) before removing `self.target_backup`.
3. **Fix `_safe_rmtree` for Windows**: In `test_engine.py`, add an `onexc` / `onerror` handler to `shutil.rmtree` that clears read-only attributes (`os.chmod(path, stat.S_IWRITE)`) and logs or raises an exception if cleanup fails rather than silently swallowing directory leaks.

---

## 5. Verification Method

To verify fixes independently, run the empirical challenge scripts:
1. `python .agents/challenger_m1_4/harness_state_isolation.py`
   - **Pass condition**: `Sentinel preserved in target_module.py? True`
2. `python .agents/challenger_m1_4/harness_permission_handling.py`
   - **Pass condition**: `Target sentinel restored to target_module.py? True`
   - **Pass condition**: `Directory still exists after _safe_rmtree? False` (for read-only files)
