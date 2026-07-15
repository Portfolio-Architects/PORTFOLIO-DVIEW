# Milestone 1: Config & VCS Changes

Implemented the required modules for Milestone 1 of the Self-Improvement Loop project:

## Created Files

### 1. `self_improvement_loop/config.py`
- Stores configuration constants:
  - `BASE_DIR`: Dynamically determined absolute path of the `self_improvement_loop` directory.
  - `TARGET_FILE`: Path to `target_module.py`.
  - `TEST_FILE`: Path to `test_target_module.py`.
  - `HISTORY_DIR`: Path to `history/` subdirectory.
  - `MAX_ITERATIONS`: 10.
  - `TIMEOUT_SECONDS`: 60.

### 2. `self_improvement_loop/vcs.py`
- Provides the `CustomVCS` class managing:
  - `__init__(history_dir: str, target_file: str)`: Initializes paths and creates `history_dir` if it does not exist.
  - `save_version(version_idx: int, code: str) -> None`: Saves version snapshots under `history/target_module.v{version_idx}.py`.
  - `generate_diff(version_idx: int, old_code: str, new_code: str) -> str`: Compares code versions using `difflib.unified_diff`, writes the patch to `history/patch_v{version_idx}.diff`, and returns the patch string.
  - `restore_version(version_idx: int) -> str`: Replaces the current `target_module.py` content with the snapshot for `version_idx`, returning the restored content.

## Verification

A temporary Python verification script `scratch/test_vcs.py` was executed using the virtual environment `.venv`:
- Commands executed:
  ```powershell
  .venv\Scripts\python.exe scratch\test_vcs.py
  ```
- Verification outcome:
  - Version saving successfully generated snapshot files.
  - Diff generation successfully produced unified diffs matching the expected modifications and wrote patch files.
  - Restoration successfully copied snapshot content back to the target file.
  - Terminal output:
    ```
    OK: Snapshot files saved successfully.
    Generated diff:
    --- target_module.v0.py
    +++ target_module.v1.py
    @@ -1,2 +1,3 @@
     def add(a, b):
    +    # Optimized
         return a + b

    OK: Diff generated and saved successfully.
    OK: Restore version 1 successfully.
    All CustomVCS tests passed!
    ```
