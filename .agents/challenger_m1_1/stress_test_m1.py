import unittest
import os
import sys
import tempfile
import shutil
import time
import json
import ast
from pathlib import Path
from unittest.mock import patch, MagicMock

# Ensure project root is in sys.path
base_dir = Path(__file__).parent.parent.parent.resolve()
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

rec_dir = str(base_dir / "recursive_self_improvement")
if str(rec_dir) not in sys.path:
    sys.path.insert(0, str(rec_dir))

from recursive_self_improvement import config
from recursive_self_improvement.engine import SelfImprovementEngine
from recursive_self_improvement.runner import TestRunner
from recursive_self_improvement.vcs import CustomVCS
from recursive_self_improvement.simulator import RateLimitError


INITIAL_TARGET_CODE = """class TargetCalculator:
    def compute(self, x, y):
        return x + y
"""

INITIAL_TEST_CODE = """import unittest
from target_module import TargetCalculator

class TestTarget(unittest.TestCase):
    def test_compute(self):
        c = TargetCalculator()
        self.assertEqual(c.compute(2, 3), 5)

if __name__ == "__main__":
    unittest.main()
"""


class TestASTPreValidationStress(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="stress_ast_")
        self.target_file = os.path.join(self.temp_dir, "target_module.py")
        self.test_file = os.path.join(self.temp_dir, "test_target_module.py")
        self.history_dir = os.path.join(self.temp_dir, "history")

        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write(INITIAL_TARGET_CODE)
        with open(self.test_file, "w", encoding="utf-8") as f:
            f.write(INITIAL_TEST_CODE)

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_syntax_error_prevalidation_prevents_disk_write(self):
        """Verify that invalid AST code is NEVER written to target_module.py on disk."""
        invalid_code = "def bad_syntax(:\n    pass"

        with patch.object(config, "TARGET_FILE", self.target_file), \
             patch.object(config, "TEST_FILE", self.test_file), \
             patch.object(config, "HISTORY_DIR", self.history_dir), \
             patch.object(config, "MAX_ITERATIONS", 1), \
             patch.object(config, "MAX_API_REQUESTS", 2), \
             patch.object(config, "INJECT_SYNTAX_ERROR_ITERATION", None):

            engine = SelfImprovementEngine()
            engine.simulator.get_improved_code = MagicMock(return_value=invalid_code)

            engine.run()

            # Verify target_module.py content on disk remained clean INITIAL_TARGET_CODE
            with open(self.target_file, "r", encoding="utf-8") as f:
                content_on_disk = f.read()

            self.assertEqual(content_on_disk, INITIAL_TARGET_CODE)

            # Verify debug failed version WAS saved in history
            failed_file = os.path.join(self.history_dir, "target_module.v1.failed.py")
            self.assertTrue(os.path.exists(failed_file))
            with open(failed_file, "r", encoding="utf-8") as f:
                failed_content = f.read()
            self.assertEqual(failed_content, invalid_code)

            # Verify AST_SYNTAX_ERROR event was logged
            ast_logs = [log for log in engine.execution_log if log["event_type"] == "AST_SYNTAX_ERROR"]
            self.assertTrue(len(ast_logs) > 0)

    def test_indentation_and_tab_errors_caught_by_ast(self):
        """Verify IndentationError and TabError are caught by AST pre-validation."""
        indent_error_code = "def foo():\nreturn 42"
        tab_error_code = "def foo():\n\tprint('tab')\n    print('space')"

        for code in [indent_error_code, tab_error_code]:
            with patch.object(config, "TARGET_FILE", self.target_file), \
                 patch.object(config, "TEST_FILE", self.test_file), \
                 patch.object(config, "HISTORY_DIR", self.history_dir), \
                 patch.object(config, "MAX_ITERATIONS", 1), \
                 patch.object(config, "MAX_API_REQUESTS", 1), \
                 patch.object(config, "INJECT_SYNTAX_ERROR_ITERATION", None):

                engine = SelfImprovementEngine()
                engine.simulator.get_improved_code = MagicMock(return_value=code)

                engine.run()

                with open(self.target_file, "r", encoding="utf-8") as f:
                    content_on_disk = f.read()
                self.assertEqual(content_on_disk, INITIAL_TARGET_CODE)

    def test_ast_deep_recursion_exception_handling(self):
        """Stress test: Check how AST pre-validation handles deeply nested structures that might cause RecursionError or unexpected exceptions."""
        deeply_nested_code = "(" * 1000 + "1" + ")" * 1000
        with patch.object(config, "TARGET_FILE", self.target_file), \
             patch.object(config, "TEST_FILE", self.test_file), \
             patch.object(config, "HISTORY_DIR", self.history_dir), \
             patch.object(config, "MAX_ITERATIONS", 1), \
             patch.object(config, "MAX_API_REQUESTS", 1), \
             patch.object(config, "INJECT_SYNTAX_ERROR_ITERATION", None):

            engine = SelfImprovementEngine()
            engine.simulator.get_improved_code = MagicMock(return_value=deeply_nested_code)

            engine.run()
            with open(self.target_file, "r", encoding="utf-8") as f:
                content = f.read()
            self.assertEqual(content, INITIAL_TARGET_CODE)


class TestMD5StuckWindowStress(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="stress_md5_")
        self.target_file = os.path.join(self.temp_dir, "target_module.py")
        self.test_file = os.path.join(self.temp_dir, "test_target_module.py")
        self.history_dir = os.path.join(self.temp_dir, "history")

        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write(INITIAL_TARGET_CODE)
        with open(self.test_file, "w", encoding="utf-8") as f:
            f.write(INITIAL_TEST_CODE)

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_duplicate_code_stuck_detection(self):
        """Verify duplicate code in consecutive iterations triggers STUCK_DETECTED event."""
        valid_code_v1 = """class TargetCalculator:
    def compute(self, x, y):
        # Version 1 improvement
        return (x + y)
"""
        with patch.object(config, "TARGET_FILE", self.target_file), \
             patch.object(config, "TEST_FILE", self.test_file), \
             patch.object(config, "HISTORY_DIR", self.history_dir), \
             patch.object(config, "MAX_ITERATIONS", 3), \
             patch.object(config, "MAX_API_REQUESTS", 3), \
             patch.object(config, "INJECT_SYNTAX_ERROR_ITERATION", None):

            engine = SelfImprovementEngine()
            # Return same valid code every iteration
            engine.simulator.get_improved_code = MagicMock(return_value=valid_code_v1)

            engine.run()

            stuck_logs = [log for log in engine.execution_log if log["event_type"] == "STUCK_DETECTED"]
            self.assertTrue(len(stuck_logs) >= 2, f"Expected at least 2 STUCK_DETECTED events, got {len(stuck_logs)}")

    def test_perturbation_feedback_erasure_bug(self):
        """Empirically test whether perturbation_feedback set during STUCK_DETECTED is wiped when tests pass."""
        valid_code = """class TargetCalculator:
    def compute(self, x, y):
        return x + y
"""
        received_feedbacks = []

        def mock_get_improved(current_code, iteration, inject_syntax_error=False, perturbation_feedback=None, error_feedback=None):
            received_feedbacks.append(perturbation_feedback)
            return valid_code

        with patch.object(config, "TARGET_FILE", self.target_file), \
             patch.object(config, "TEST_FILE", self.test_file), \
             patch.object(config, "HISTORY_DIR", self.history_dir), \
             patch.object(config, "MAX_ITERATIONS", 3), \
             patch.object(config, "MAX_API_REQUESTS", 3), \
             patch.object(config, "INJECT_SYNTAX_ERROR_ITERATION", None):

            engine = SelfImprovementEngine()
            engine.simulator.get_improved_code = MagicMock(side_effect=mock_get_improved)

            engine.run()

            # Iteration 1: received_feedbacks[0] == None
            # Iteration 2: received_feedbacks[1] == Warning string (from iteration 1 STUCK check? No, iteration 1 was not stuck, iteration 2 detected stuck and set feedback)
            # Iteration 3: received_feedbacks[2] -> what did iteration 3 receive?
            print(f"\n[EMPIRICAL LOG] Perturbation feedback received by simulator across iterations: {received_feedbacks}")
            # Assert whether iteration 3 received None (demonstrating the bug)
            self.assertIsNone(received_feedbacks[2], "CONFIRMED BUG: perturbation_feedback was erased on test success before simulator on iteration 3 could read it!")

    def test_max_iterations_infinite_loop_bug(self):
        """Empirically prove that MAX_ITERATIONS fails to stop loop when code failures occur."""
        invalid_syntax_code = "def invalid_func(:"

        with patch.object(config, "TARGET_FILE", self.target_file), \
             patch.object(config, "TEST_FILE", self.test_file), \
             patch.object(config, "HISTORY_DIR", self.history_dir), \
             patch.object(config, "MAX_ITERATIONS", 2), \
             patch.object(config, "MAX_API_REQUESTS", 5), \
             patch.object(config, "INJECT_SYNTAX_ERROR_ITERATION", None):

            engine = SelfImprovementEngine()
            engine.simulator.get_improved_code = MagicMock(return_value=invalid_syntax_code)

            engine.run()

            # MAX_API_REQUESTS=5 caused it to stop after 5 attempts.
            # But version_idx remained 0, so engine thought it was still on iteration 1 for all 5 attempts!
            iterations_logged = [log["message"] for log in engine.execution_log if log["event_type"] == "ITERATION_START"]
            print(f"\n[EMPIRICAL LOG] Iteration start log messages with MAX_ITERATIONS=2 and 5 attempts: {iterations_logged}")
            # All 5 logged "Starting iteration 1" because version_idx stayed 0!
            self.assertEqual(len(iterations_logged), 5)
            self.assertTrue(all("Starting iteration 1" in msg for msg in iterations_logged))


class TestTimeoutHandlingStress(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="stress_timeout_")
        self.target_file = os.path.join(self.temp_dir, "target_module.py")
        self.test_file = os.path.join(self.temp_dir, "test_target_module.py")
        self.history_dir = os.path.join(self.temp_dir, "history")

        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write(INITIAL_TARGET_CODE)
        with open(self.test_file, "w", encoding="utf-8") as f:
            f.write(INITIAL_TEST_CODE)

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_iteration_timeout_triggers_abort_and_rollback(self):
        """Verify that when iteration duration exceeds TIMEOUT_SECONDS, engine aborts and rolls back."""
        with patch.object(config, "TARGET_FILE", self.target_file), \
             patch.object(config, "TEST_FILE", self.test_file), \
             patch.object(config, "HISTORY_DIR", self.history_dir), \
             patch.object(config, "TIMEOUT_SECONDS", 0.3), \
             patch.object(config, "MAX_ITERATIONS", 5), \
             patch.object(config, "MAX_API_REQUESTS", 5), \
             patch.object(config, "INJECT_SYNTAX_ERROR_ITERATION", None):

            engine = SelfImprovementEngine()

            def slow_simulator(*args, **kwargs):
                time.sleep(0.5)
                return INITIAL_TARGET_CODE

            engine.simulator.get_improved_code = MagicMock(side_effect=slow_simulator)

            res = engine.run()

            self.assertFalse(res)
            timeout_logs = [log for log in engine.execution_log if log["event_type"] == "TIMEOUT"]
            self.assertTrue(len(timeout_logs) > 0)

    def test_session_timeout_triggers_abort(self):
        """Verify that total elapsed time exceeding SESSION_TIMEOUT_SECONDS triggers abort."""
        with patch.object(config, "TARGET_FILE", self.target_file), \
             patch.object(config, "TEST_FILE", self.test_file), \
             patch.object(config, "HISTORY_DIR", self.history_dir), \
             patch.object(config, "TIMEOUT_SECONDS", 10.0), \
             patch.object(config, "SESSION_TIMEOUT_SECONDS", 0.3), \
             patch.object(config, "MAX_ITERATIONS", 5), \
             patch.object(config, "MAX_API_REQUESTS", 5), \
             patch.object(config, "INJECT_SYNTAX_ERROR_ITERATION", None):

            engine = SelfImprovementEngine()

            def slow_simulator(*args, **kwargs):
                time.sleep(0.5)
                return INITIAL_TARGET_CODE

            engine.simulator.get_improved_code = MagicMock(side_effect=slow_simulator)

            res = engine.run()

            self.assertFalse(res)
            session_timeout_logs = [log for log in engine.execution_log if log["event_type"] == "SESSION_TIMEOUT"]
            self.assertTrue(len(session_timeout_logs) > 0)

    def test_rate_limit_wait_timeout(self):
        """Verify timeouts occurring while sleeping during RateLimitError are handled cleanly."""
        with patch.object(config, "TARGET_FILE", self.target_file), \
             patch.object(config, "TEST_FILE", self.test_file), \
             patch.object(config, "HISTORY_DIR", self.history_dir), \
             patch.object(config, "TIMEOUT_SECONDS", 0.5), \
             patch.object(config, "MAX_ITERATIONS", 2), \
             patch.object(config, "MAX_API_REQUESTS", 2), \
             patch.object(config, "INJECT_SYNTAX_ERROR_ITERATION", None):

            engine = SelfImprovementEngine()

            def rate_limiting_simulator(*args, **kwargs):
                raise RateLimitError("Rate limit hit", reset_seconds=5)

            engine.simulator.get_improved_code = MagicMock(side_effect=rate_limiting_simulator)

            res = engine.run()

            self.assertFalse(res)
            timeout_logs = [log for log in engine.execution_log if log["event_type"] == "TIMEOUT"]
            self.assertTrue(len(timeout_logs) > 0)

    def test_infinite_loop_in_target_code_handled_by_runner(self):
        """Stress test: Candidate code contains infinite loop, test runner times out, rollback occurs."""
        infinite_loop_code = """class TargetCalculator:
    def compute(self, x, y):
        while True:
            pass
"""
        with patch.object(config, "TARGET_FILE", self.target_file), \
             patch.object(config, "TEST_FILE", self.test_file), \
             patch.object(config, "HISTORY_DIR", self.history_dir), \
             patch.object(config, "MAX_ITERATIONS", 2), \
             patch.object(config, "MAX_API_REQUESTS", 2), \
             patch.object(config, "INJECT_SYNTAX_ERROR_ITERATION", None):

            engine = SelfImprovementEngine()

            def mock_run_tests():
                if getattr(mock_run_tests, 'call_count', 0) == 0:
                    mock_run_tests.call_count = 1
                    return {
                        "success": False,
                        "stdout": "",
                        "stderr": "TimeoutExpired: Command '['python', 'test.py']' timed out after 60 seconds",
                        "returncode": -1
                    }
                else:
                    return {
                        "success": True,
                        "stdout": "OK",
                        "stderr": "",
                        "returncode": 0
                    }

            engine.runner.run_tests = MagicMock(side_effect=mock_run_tests)
            engine.simulator.get_improved_code = MagicMock(return_value=infinite_loop_code)

            engine.run()

            with open(self.target_file, "r", encoding="utf-8") as f:
                restored_code = f.read()
            self.assertEqual(restored_code, INITIAL_TARGET_CODE)

            rollback_logs = [log for log in engine.execution_log if log["event_type"] == "ROLLBACK"]
            self.assertTrue(len(rollback_logs) > 0)


if __name__ == "__main__":
    unittest.main()
