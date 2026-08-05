import os
import sys
import unittest

# Add project root to sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from recursive_self_improvement import config

def test_target_module_state_isolation():
    print("=== Testing test_target_module.py State Isolation ===")
    
    # Step 1: Write custom content to target_module.py
    sentinel = "# SENTINEL_PRE_EXISTING_DEVELOPMENT_CODE_XYZ"
    original_content = sentinel + "\nclass Calculator:\n    def add(self, a, b):\n        return a + b\n"
    
    with open(config.TARGET_FILE, "w", encoding="utf-8") as f:
        f.write(original_content)
        
    print(f"[PRE-TEST] Wrote sentinel to {config.TARGET_FILE}")
    
    # Step 2: Import and run TestCalculator test suite
    from recursive_self_improvement.test_target_module import TestCalculator
    suite = unittest.TestLoader().loadTestsFromTestCase(TestCalculator)
    runner = unittest.TextTestRunner(verbosity=0)
    res = runner.run(suite)
    
    print(f"[TEST RUN] Executed {res.testsRun} tests. Errors: {len(res.errors)}, Failures: {len(res.failures)}")
    
    # Step 3: Check target_module.py content after test suite completed
    with open(config.TARGET_FILE, "r", encoding="utf-8") as f:
        post_test_content = f.read()
        
    sentinel_preserved = sentinel in post_test_content
    print(f"[POST-TEST] Sentinel preserved in target_module.py? {sentinel_preserved}")
    
    # Check sys.modules state
    target_in_sys_modules = "recursive_self_improvement.target_module" in sys.modules
    print(f"[POST-TEST] recursive_self_improvement.target_module in sys.modules? {target_in_sys_modules}")
    
    return {
        "sentinel_preserved": sentinel_preserved,
        "post_test_length": len(post_test_content),
        "target_in_sys_modules": target_in_sys_modules
    }

if __name__ == "__main__":
    results = test_target_module_state_isolation()
    print("Results:", results)
