import sys
import os
import time
import shutil
import tempfile
import unittest
import subprocess

# Add project root to sys.path
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from recursive_self_improvement.vcs import CustomVCS
from recursive_self_improvement.runner import TestRunner


class EmpiricalStressTest(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp(prefix="empirical_test_")
        self.target_file = os.path.join(self.test_dir, "target_module.py")
        self.test_file = os.path.join(self.test_dir, "test_target_module.py")
        self.history_dir = os.path.join(self.test_dir, "history")

        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write("# initial target\n")
        with open(self.test_file, "w", encoding="utf-8") as f:
            f.write("# initial test\n")

        self.vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)

    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir, ignore_errors=True)

    # -------------------------------------------------------------
    # RUNNER EMPIRICAL TESTS
    # -------------------------------------------------------------

    def test_runner_infinite_loop_timeout(self):
        """Test runner behavior under an infinite loop script."""
        inf_loop_script = os.path.join(self.test_dir, "test_inf_loop.py")
        with open(inf_loop_script, "w", encoding="utf-8") as f:
            f.write("import time\nwhile True:\n    time.sleep(0.1)\n")

        runner = TestRunner(inf_loop_script)
        # Note: default timeout in runner is 60s, but let's test if run_tests raises exception or catches timeout
        # To avoid waiting 60s during unit test, we test runner execution logic directly
        # or verify timeout exception handling format
        start_time = time.time()
        # Mocking or running directly if fast; let's check timeout behavior by running a python script
        res = runner.run_tests()
        elapsed = time.time() - start_time

        # Note: runner timeout is 60s in source code, so running res will take 60s if not modified or monkeypatched.
        self.assertFalse(res["success"])
        self.assertEqual(res["returncode"], -1)
        self.assertIn("TimeoutExpired", res["stderr"])

    def test_runner_unexpected_crash_sys_exit(self):
        """Test runner handling of sys.exit(139) / abnormal termination."""
        crash_script = os.path.join(self.test_dir, "test_crash.py")
        with open(crash_script, "w", encoding="utf-8") as f:
            f.write("import sys\nsys.exit(139)\n")

        runner = TestRunner(crash_script)
        res = runner.run_tests()

        self.assertFalse(res["success"])
        self.assertEqual(res["returncode"], 139)

    def test_runner_os_exit_hard_crash(self):
        """Test runner handling of os._exit(1) hard exit."""
        hard_exit_script = os.path.join(self.test_dir, "test_hard_exit.py")
        with open(hard_exit_script, "w", encoding="utf-8") as f:
            f.write("import os\nos._exit(255)\n")

        runner = TestRunner(hard_exit_script)
        res = runner.run_tests()

        self.assertFalse(res["success"])
        self.assertNotEqual(res["returncode"], 0)

    def test_runner_missing_test_file(self):
        """Test runner when test file path does not exist."""
        missing_script = os.path.join(self.test_dir, "non_existent_file.py")
        runner = TestRunner(missing_script)
        res = runner.run_tests()

        self.assertFalse(res["success"])
        self.assertNotEqual(res["returncode"], 0)
        self.assertTrue("can't open file" in res["stderr"] or "No such file" in res["stderr"] or res["returncode"] != 0)

    def test_runner_large_output_flooding(self):
        """Test runner handling of vast stdout/stderr output (10MB)."""
        flood_script = os.path.join(self.test_dir, "test_flood.py")
        with open(flood_script, "w", encoding="utf-8") as f:
            f.write("import sys\nfor _ in range(100000):\n    sys.stdout.write('A' * 100 + '\\n')\n")

        runner = TestRunner(flood_script)
        res = runner.run_tests()

        self.assertTrue(res["success"])
        self.assertGreater(len(res["stdout"]), 1000000)

    def test_runner_unicode_output(self):
        """Test runner handling of complex UTF-8 output (Korean, Emoji)."""
        unicode_script = os.path.join(self.test_dir, "test_unicode.py")
        with open(unicode_script, "w", encoding="utf-8") as f:
            f.write("print('한글 테스트 🚀🔥 성공')\n")

        runner = TestRunner(unicode_script)
        res = runner.run_tests()

        self.assertTrue(res["success"])
        self.assertIn("한글 테스트 🚀🔥 성공", res["stdout"])

    # -------------------------------------------------------------
    # VCS EMPIRICAL TESTS & EDGE CASES
    # -------------------------------------------------------------

    def test_vcs_dual_file_rollback_integrity(self):
        """Verify atomic dual-file rollback restores both target and test files."""
        self.vcs.save_version(0, "target_v0", "test_v0")
        self.vcs.save_version(1, "target_v1", "test_v1")

        # Corrupt files
        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write("CORRUPTED_TARGET")
        with open(self.test_file, "w", encoding="utf-8") as f:
            f.write("CORRUPTED_TEST")

        restored = self.vcs.rollback(0)
        self.assertEqual(restored, "target_v0")

        with open(self.target_file, "r", encoding="utf-8") as f:
            self.assertEqual(f.read(), "target_v0")
        with open(self.test_file, "r", encoding="utf-8") as f:
            self.assertEqual(f.read(), "test_v0")

    def test_vcs_missing_version_fallback(self):
        """Verify fallback to v0 when requested version snapshot is missing."""
        self.vcs.save_version(0, "target_v0", "test_v0")
        restored = self.vcs.rollback(50)
        self.assertEqual(restored, "target_v0")

    def test_vcs_no_v0_and_no_requested_version_raises_error(self):
        """Verify FileNotFoundError is raised when neither target_module.vN nor v0 exists."""
        with self.assertRaises(FileNotFoundError):
            self.vcs.rollback(10)

    def test_vcs_asymmetric_test_snapshot_rollback(self):
        """
        EDGE CASE: Target snapshot exists for v1, but test snapshot does NOT exist for v1 nor v0.
        What happens to test_file on rollback?
        """
        custom_target = os.path.join(self.test_dir, "target.py")
        custom_test = os.path.join(self.test_dir, "test.py")
        with open(custom_target, "w") as f: f.write("t1")
        with open(custom_test, "w") as f: f.write("test1")

        vcs = CustomVCS(self.history_dir, custom_target, custom_test)

        # Manually create only target snapshot v1 in history without test snapshot or v0
        v1_target_path = os.path.join(self.history_dir, "target_module.v1.py")
        with open(v1_target_path, "w", encoding="utf-8") as f:
            f.write("target_snap_v1")

        # Mutate test file
        with open(custom_test, "w", encoding="utf-8") as f:
            f.write("MUTATED_TEST_CODE")

        vcs.rollback(1)

        # Target file restored to target_snap_v1
        with open(custom_target, "r", encoding="utf-8") as f:
            self.assertEqual(f.read(), "target_snap_v1")

        # Test file was NOT restored because test_module.v1.py and test_module.v0.py don't exist!
        with open(custom_test, "r", encoding="utf-8") as f:
            self.assertEqual(f.read(), "MUTATED_TEST_CODE")

    def test_vcs_missing_target_directory_on_rollback(self):
        """
        EDGE CASE: What if target directory is missing when calling rollback?
        """
        nested_dir = os.path.join(self.test_dir, "nested_dir")
        nested_target = os.path.join(nested_dir, "target_module.py")
        os.makedirs(nested_dir, exist_ok=True)
        with open(nested_target, "w") as f: f.write("init")

        vcs = CustomVCS(self.history_dir, nested_target, None)
        vcs.save_version(0, "v0_code")

        # Delete nested_dir
        shutil.rmtree(nested_dir)

        # Calling rollback now will try to open(nested_target, "w") which fails if dir missing!
        with self.assertRaises(FileNotFoundError):
            vcs.rollback(0)

    def test_vcs_pycache_cleaning_custom_filename(self):
        """
        EDGE CASE: Check if pycache cleaning logic works when target_file is not named 'target_module.py'
        """
        custom_target = os.path.join(self.test_dir, "custom_module.py")
        pycache_dir = os.path.join(self.test_dir, "__pycache__")
        os.makedirs(pycache_dir, exist_ok=True)

        # Create dummy pycache files
        pyc1 = os.path.join(pycache_dir, "target_module.cpython-313.pyc")
        pyc2 = os.path.join(pycache_dir, "custom_module.cpython-313.pyc")
        with open(pyc1, "w") as f: f.write("pyc1")
        with open(pyc2, "w") as f: f.write("pyc2")

        vcs = CustomVCS(self.history_dir, custom_target, None)
        vcs.save_version(0, "v0_code")

        vcs.rollback(0)

        # Notice target_module.pyc was removed, but custom_module.pyc was NOT removed!
        self.assertFalse(os.path.exists(pyc1))
        self.assertTrue(os.path.exists(pyc2))  # BUG/LIMITATION: hardcoded "target_module" in pycache cleaner!


if __name__ == "__main__":
    unittest.main()
