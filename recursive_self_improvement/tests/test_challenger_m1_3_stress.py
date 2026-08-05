import unittest
import os
import shutil
import tempfile
import sys
import gc
import time

def _safe_remove(path):
    if not path or not os.path.exists(path):
        return
    gc.collect()
    for _ in range(10):
        try:
            os.remove(path)
            break
        except PermissionError:
            time.sleep(0.05)
            gc.collect()
        except Exception:
            break

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

try:
    from recursive_self_improvement.runner import TestRunner
    from recursive_self_improvement.vcs import CustomVCS
    from recursive_self_improvement.engine import SelfImprovementEngine
    from recursive_self_improvement import config
except ImportError:
    from runner import TestRunner
    from vcs import CustomVCS
    from engine import SelfImprovementEngine
    import config



class RunnerUTF8StressTest(unittest.TestCase):
    """
    Stress-test runner.py for Unicode UTF-8 stdout/stderr handling.
    """
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="stress_runner_")

    def tearDown(self):
        _safe_rmtree(self.temp_dir)

    def test_utf8_korean_and_emoji_output(self):
        test_file = os.path.join(self.temp_dir, "test_unicode.py")
        code = (
            "import sys\n"
            "print('테스트 실행 성공! 🚀 [신고가 뱃지 + 동/평형]')\n"
            "sys.stderr.write('경고: 아파트 이름 가독성 개편 필요 ⚠️\\n')\n"
        )
        with open(test_file, "w", encoding="utf-8") as f:
            f.write(code)

        runner = TestRunner(test_file)
        res = runner.run_tests()

        self.assertTrue(res["success"])
        self.assertEqual(res["returncode"], 0)
        self.assertIn("테스트 실행 성공!", res["stdout"])
        self.assertIn("🚀", res["stdout"])
        self.assertIn("[신고가 뱃지 + 동/평형]", res["stdout"])
        self.assertIn("경고: 아파트 이름 가독성 개편 필요 ⚠️", res["stderr"])

    def test_utf8_large_volume_output(self):
        test_file = os.path.join(self.temp_dir, "test_large_utf8.py")
        code = (
            "import sys\n"
            "for i in range(1000):\n"
            "    print(f'Line {i}: 아파트 이름 생략(...) 및 신고가 뱃지 겹침 무결성 검증 🏢✨')\n"
        )
        with open(test_file, "w", encoding="utf-8") as f:
            f.write(code)

        runner = TestRunner(test_file)
        res = runner.run_tests()

        self.assertTrue(res["success"])
        self.assertEqual(res["returncode"], 0)
        self.assertIn("Line 999: 아파트 이름 생략(...)", res["stdout"])

    def test_utf8_invalid_bytes_replacement(self):
        test_file = os.path.join(self.temp_dir, "test_invalid_bytes.py")
        code = (
            "import sys\n"
            "sys.stdout.buffer.write(b'Valid UTF-8: \\xec\\x95\\x84\\xed\\x8c\\x8c\\xed\\x8a\\xb8 Invalid: \\xff\\xfe\\xfa\\n')\n"
            "sys.stdout.buffer.flush()\n"
        )
        with open(test_file, "w", encoding="utf-8") as f:
            f.write(code)

        runner = TestRunner(test_file)
        res = runner.run_tests()

        self.assertTrue(res["success"])
        self.assertEqual(res["returncode"], 0)
        self.assertIn("Valid UTF-8: 아파트", res["stdout"])
        # Replacement character for invalid bytes
        self.assertIn("Invalid:", res["stdout"])


class VCSMissingSnapshotFallbackStressTest(unittest.TestCase):
    """
    Stress-test vcs.py for missing snapshot fallbacks and rollback behavior.
    """
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="stress_vcs_")
        self.target_file = os.path.join(self.temp_dir, "target_module.py")
        self.test_file = os.path.join(self.temp_dir, "test_target_module.py")
        self.history_dir = os.path.join(self.temp_dir, "history")

        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write("# Target Module Baseline v0\n")
        with open(self.test_file, "w", encoding="utf-8") as f:
            f.write("# Test Module Baseline v0\n")

        self.vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)

    def tearDown(self):
        _safe_rmtree(self.temp_dir)

    def test_rollback_missing_version_falls_back_to_v0(self):
        # Save version 0
        self.vcs.save_version(0, "# Code v0", "# Test v0")

        # Mutate target and test files
        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write("# Corrupted candidate code")
        with open(self.test_file, "w", encoding="utf-8") as f:
            f.write("# Corrupted candidate test")

        # Rollback to missing version 10 (never saved)
        self.assertFalse(self.vcs.has_version(10))
        restored_code = self.vcs.rollback(10)

        self.assertEqual(restored_code, "# Code v0")
        with open(self.target_file, "r", encoding="utf-8") as f:
            self.assertEqual(f.read(), "# Code v0")
        with open(self.test_file, "r", encoding="utf-8") as f:
            self.assertEqual(f.read(), "# Test v0")

    def test_rollback_missing_version_raises_when_no_v0(self):
        # Do not save v0 or any version
        self.assertFalse(self.vcs.has_version(0))
        self.assertFalse(self.vcs.has_version(5))

        with self.assertRaises(FileNotFoundError):
            self.vcs.rollback(5)

    def test_utf8_diff_generation(self):
        old_code = "def get_title():\n    return '아파트 생략'\n"
        new_code = "def get_title():\n    return '신고가 뱃지 + 동/평형'\n"
        diff = self.vcs.generate_diff(1, old_code, new_code)

        self.assertIn("-    return '아파트 생략'", diff)
        self.assertIn("+    return '신고가 뱃지 + 동/평형'", diff)


class EngineMaxIterationCapRollbackStressTest(unittest.TestCase):
    """
    Stress-test engine.py max iteration cap and consecutive rollbacks.
    """
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="stress_engine_")
        self.target_file = os.path.join(self.temp_dir, "target_module.py")
        self.test_file = os.path.join(self.temp_dir, "test_target_module.py")
        self.history_dir = os.path.join(self.temp_dir, "history")

        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write("def compute(x):\n    return x * 2\n")
        with open(self.test_file, "w", encoding="utf-8") as f:
            f.write("import unittest\nfrom target_module import compute\nclass T(unittest.TestCase):\n    def test_compute(self):\n        self.assertEqual(compute(2), 4)\nif __name__ == '__main__':\n    unittest.main()\n")

        self.original_target = config.TARGET_FILE
        self.original_test = config.TEST_FILE
        self.original_history = config.HISTORY_DIR

        config.TARGET_FILE = self.target_file
        config.TEST_FILE = self.test_file
        config.HISTORY_DIR = self.history_dir

    def tearDown(self):
        config.TARGET_FILE = self.original_target
        config.TEST_FILE = self.original_test
        config.HISTORY_DIR = self.original_history
        _safe_rmtree(self.temp_dir)

    def test_all_failing_iterations_respect_max_iterations_cap(self):
        """
        Verify that when EVERY iteration fails and rolls back, the engine stops
        when loop_iteration > MAX_ITERATIONS without infinite looping.
        """
        engine = SelfImprovementEngine()
        engine.max_iterations = 5

        # Mock runner so tests ALWAYS fail on candidate code, but PASS on restored target code
        def mock_run_tests():
            with open(engine.target_file, "r", encoding="utf-8") as f:
                content = f.read()
            if "FAILING_CODE" in content:
                return {"success": False, "stdout": "", "stderr": "AssertionError: candidate failed", "returncode": 1}
            return {"success": True, "stdout": "Passed", "stderr": "", "returncode": 0}

        # Mock simulator to return bad code on every iteration
        def mock_get_improved_code(current_code, iteration, **kwargs):
            return f"def compute(x):\n    # FAILING_CODE iteration {iteration}\n    return -1\n"

        engine.runner.run_tests = mock_run_tests
        engine.simulator.get_improved_code = mock_get_improved_code

        res = engine.run()

        self.assertTrue(res)  # Should return True on MAX_ITERATIONS limit reached
        
        # Verify event log contains FINISHED and 5 ROLLBACK events
        finished_events = [e for e in engine.execution_log if e["event_type"] == "FINISHED"]
        rollback_events = [e for e in engine.execution_log if e["event_type"] == "ROLLBACK"]
        stuck_events = [e for e in engine.execution_log if e["event_type"] == "STUCK_DETECTED"]

        self.assertEqual(len(finished_events), 1)
        self.assertEqual(len(rollback_events), 5)
        self.assertGreaterEqual(len(stuck_events), 1)

    def test_ast_syntax_errors_respect_max_iterations_cap(self):
        """
        Verify that AST syntax errors in 100% of iterations also trigger rollback
        and respect MAX_ITERATIONS cap.
        """
        engine = SelfImprovementEngine()
        engine.max_iterations = 3

        def mock_get_improved_code(current_code, iteration, **kwargs):
            return f"def invalid_syntax_{iteration} (\n"  # Missing closing paren & body

        engine.simulator.get_improved_code = mock_get_improved_code

        res = engine.run()

        self.assertTrue(res)
        ast_errors = [e for e in engine.execution_log if e["event_type"] == "AST_SYNTAX_ERROR"]
        rollback_events = [e for e in engine.execution_log if e["event_type"] == "ROLLBACK"]
        finished_events = [e for e in engine.execution_log if e["event_type"] == "FINISHED"]

        self.assertEqual(len(ast_errors), 3)
        self.assertEqual(len(rollback_events), 3)
        self.assertEqual(len(finished_events), 1)


if __name__ == "__main__":
    unittest.main()
