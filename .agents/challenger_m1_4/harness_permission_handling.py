import os
import sys
import unittest
import shutil
import stat
import time

# Add project root to sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from recursive_self_improvement import config
from recursive_self_improvement.tests.test_engine import TestSelfImprovementEngine, _safe_rmtree, _safe_remove

def test_engine_target_backup_restoration():
    print("=== Testing test_engine.py Target Backup Restoration in tearDown ===")
    
    # Step 1: Write custom baseline content to target_module.py
    sentinel = "# CUSTOM_EVOLVED_TARGET_CODE_ABCDEF"
    original_target_content = sentinel + "\nclass Calculator:\n    def add(self, a, b):\n        return a + b\n"
    
    with open(config.TARGET_FILE, "w", encoding="utf-8") as f:
        f.write(original_target_content)
        
    print(f"[PRE-TEST] Wrote target sentinel to {config.TARGET_FILE}")
    
    # Step 2: Instantiate TestSelfImprovementEngine, call setUp and tearDown
    test_case = TestSelfImprovementEngine("test_engine_initialization")
    test_case.setUp()
    
    # Verify target backup file was created
    backup_exists = os.path.exists(test_case.target_backup)
    print(f"[IN-TEST] Target backup exists after setUp? {backup_exists}")
    
    # Run tearDown
    test_case.tearDown()
    
    # Check if original_target_content was restored
    with open(config.TARGET_FILE, "r", encoding="utf-8") as f:
        post_teardown_content = f.read()
        
    target_restored = sentinel in post_teardown_content
    print(f"[POST-TEARDOWN] Target sentinel restored to target_module.py? {target_restored}")
    
    return {
        "backup_exists_in_setup": backup_exists,
        "target_restored_in_teardown": target_restored
    }

def test_engine_windows_permission_handling():
    print("=== Testing test_engine.py Windows Permission Handling & _safe_rmtree ===")
    
    temp_dir = os.path.join(config.BASE_DIR, "test_perm_harness_dir")
    os.makedirs(temp_dir, exist_ok=True)
    
    # Scenario A: Locked file inside directory (simulating an unclosed file handle on Windows)
    locked_file = os.path.join(temp_dir, "locked_file.txt")
    f_handle = open(locked_file, "w")
    f_handle.write("locked content")
    f_handle.flush()
    # Handle is kept open!
    
    start_time = time.time()
    _safe_rmtree(temp_dir)
    elapsed = time.time() - start_time
    
    dir_exists_after_locked = os.path.exists(temp_dir)
    print(f"[LOCKED FILE TEST] Elapsed time: {elapsed:.2f}s, Directory still exists after _safe_rmtree? {dir_exists_after_locked}")
    
    # Close handle for cleanup
    f_handle.close()
    _safe_rmtree(temp_dir)
    
    # Scenario B: Read-only file inside directory
    os.makedirs(temp_dir, exist_ok=True)
    readonly_file = os.path.join(temp_dir, "readonly_file.txt")
    with open(readonly_file, "w") as f:
        f.write("readonly content")
    # Mark as read-only
    os.chmod(readonly_file, stat.S_IREAD)
    
    _safe_rmtree(temp_dir)
    dir_exists_after_readonly = os.path.exists(temp_dir)
    print(f"[READONLY FILE TEST] Directory still exists after _safe_rmtree? {dir_exists_after_readonly}")
    
    # Cleanup read-only file if left behind
    if os.path.exists(readonly_file):
        os.chmod(readonly_file, stat.S_IWRITE)
    _safe_rmtree(temp_dir)
    
    return {
        "dir_exists_after_locked": dir_exists_after_locked,
        "dir_exists_after_readonly": dir_exists_after_readonly
    }

if __name__ == "__main__":
    res1 = test_engine_target_backup_restoration()
    res2 = test_engine_windows_permission_handling()
    print("Backup Restoration Results:", res1)
    print("Permission Handling Results:", res2)
