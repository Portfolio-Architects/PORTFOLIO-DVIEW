import unittest
import os
import shutil
import time
import sys
import importlib
import gc
import stat

def _on_rm_error(func, path, exc_info):
    try:
        os.chmod(path, stat.S_IWRITE)
        func(path)
    except Exception:
        pass

def _safe_remove(path):
    if not path or not os.path.exists(path):
        return
    gc.collect()
    for _ in range(15):
        try:
            os.chmod(path, stat.S_IWRITE)
            os.remove(path)
            break
        except (PermissionError, OSError):
            time.sleep(0.1)
            gc.collect()
        except Exception:
            break

def _safe_rmtree(path):
    if not path or not os.path.exists(path):
        return
    gc.collect()
    for _ in range(15):
        try:
            shutil.rmtree(path, onerror=_on_rm_error)
            if not os.path.exists(path):
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


from recursive_self_improvement.engine import SelfImprovementEngine
from recursive_self_improvement import config

class TestSelfImprovementEngine(unittest.TestCase):
    def setUp(self):
        sys.modules.pop("target_module", None)
        sys.modules.pop("self_improvement_loop.target_module", None)
        sys.modules.pop("recursive_self_improvement.target_module", None)
        importlib.invalidate_caches()

        self.target_backup = config.TARGET_FILE + ".backup"
        if os.path.exists(config.TARGET_FILE):
            shutil.copyfile(config.TARGET_FILE, self.target_backup)

        self.test_backup = config.TEST_FILE + ".backup"
        if os.path.exists(config.TEST_FILE):
            shutil.copyfile(config.TEST_FILE, self.test_backup)

        initial_code = (
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        # BUG: Returns subtraction instead of addition\n"
            "        return a - b\n"
        )
        with open(config.TARGET_FILE, "w", encoding="utf-8", errors="replace") as f:
            f.write(initial_code)

        self.original_history_dir = config.HISTORY_DIR
        self.test_history_dir = os.path.join(config.BASE_DIR, f"test_history_{self._testMethodName}")
        config.HISTORY_DIR = self.test_history_dir
        if os.path.exists(self.test_history_dir):
            _safe_rmtree(self.test_history_dir)

    def tearDown(self):
        if hasattr(self, 'target_backup') and os.path.exists(self.target_backup):
            try:
                shutil.copyfile(self.target_backup, config.TARGET_FILE)
            except Exception:
                pass

        if hasattr(self, 'test_backup') and os.path.exists(self.test_backup):
            try:
                shutil.copyfile(self.test_backup, config.TEST_FILE)
            except Exception:
                pass

        if hasattr(self, 'target_backup'):
            _safe_remove(self.target_backup)

        if hasattr(self, 'test_backup'):
            _safe_remove(self.test_backup)

        if hasattr(self, 'test_history_dir'):
            _safe_rmtree(self.test_history_dir)

        if hasattr(self, 'original_history_dir'):
            config.HISTORY_DIR = self.original_history_dir

        sys.modules.pop("target_module", None)
        sys.modules.pop("self_improvement_loop.target_module", None)
        sys.modules.pop("recursive_self_improvement.target_module", None)
        importlib.invalidate_caches()

    def test_engine_initialization(self):
        engine = SelfImprovementEngine()
        self.assertEqual(engine.target_file, config.TARGET_FILE)
        self.assertEqual(engine.test_file, config.TEST_FILE)

    def test_engine_api_limit(self):
        engine = SelfImprovementEngine()
        engine.max_api_requests = 2
        engine.max_iterations = 5

        success = engine.run()
        
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("API_LIMIT", event_types)
        self.assertFalse(success)

    def test_engine_timeout(self):
        engine = SelfImprovementEngine()
        engine.timeout_seconds = -1.0

        success = engine.run()
        
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("TIMEOUT", event_types)
        self.assertFalse(success)

    def test_engine_session_timeout(self):
        engine = SelfImprovementEngine()
        engine.timeout_seconds = 100.0
        engine.session_timeout_seconds = -1.0

        success = engine.run()
        
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("SESSION_TIMEOUT", event_types)
        self.assertFalse(success)

    def test_engine_token_budget(self):
        engine = SelfImprovementEngine()
        engine.total_token_budget = 1500
        engine.token_budget_per_iteration = 1000

        success = engine.run()
        
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("TOKEN_BUDGET_EXCEEDED", event_types)
        self.assertFalse(success)

    def test_sync_rollback(self):
        engine = SelfImprovementEngine()
        engine.vcs.save_version(99, "target version 99", "test version 99")
        engine.vcs.rollback(99)
        
        with open(engine.target_file, "r", encoding="utf-8", errors="replace") as f:
            target_content = f.read()
        with open(engine.test_file, "r", encoding="utf-8", errors="replace") as f:
            test_content = f.read()
            
        self.assertEqual(target_content, "target version 99")
        self.assertEqual(test_content, "test version 99")

    def test_stuck_detection_by_hash(self):
        valid_code = (
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        return a + b\n"
        )
        with open(config.TARGET_FILE, "w", encoding="utf-8", errors="replace") as f:
            f.write(valid_code)

        engine = SelfImprovementEngine()
        engine.max_iterations = 3
        engine.simulator.simulate_stuck_hash = True
        
        success = engine.run()
        
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("STUCK_DETECTED", event_types)
        self.assertTrue(success)

    def test_stuck_detection_by_repeating_error(self):
        valid_code = (
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        return a + b\n"
        )
        with open(config.TARGET_FILE, "w", encoding="utf-8", errors="replace") as f:
            f.write(valid_code)

        engine = SelfImprovementEngine()
        engine.max_iterations = 3
        engine.simulator.simulate_stuck_error = True
        
        success = engine.run()
        
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("STUCK_DETECTED", event_types)
        self.assertTrue(success)

    def test_stuck_detection_by_consecutive_rollbacks(self):
        engine = SelfImprovementEngine()
        engine.max_iterations = 4
        
        calls = []
        mock_responses = [
            {"success": False, "stdout": "", "stderr": "Error A", "returncode": 1},
            {"success": True, "stdout": "", "stderr": ""},
            {"success": False, "stdout": "", "stderr": "Error B", "returncode": 1},
            {"success": True, "stdout": "", "stderr": ""},
            {"success": False, "stdout": "", "stderr": "Error C", "returncode": 1},
            {"success": True, "stdout": "", "stderr": ""},
        ]
        
        def mock_run_tests():
            if len(calls) < len(mock_responses):
                resp = mock_responses[len(calls)]
                calls.append(resp)
                return resp
            return {"success": True, "stdout": "", "stderr": ""}
            
        engine.runner.run_tests = mock_run_tests
        
        engine.run()
        
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("STUCK_DETECTED", event_types)

    def test_ast_pre_validation_catches_syntax_error(self):
        engine = SelfImprovementEngine()
        engine.max_iterations = 2
        engine.inject_syntax_error_iteration = 1

        engine.run()

        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("AST_SYNTAX_ERROR", event_types)

    def test_direct_error_feedback_ingestion(self):
        engine = SelfImprovementEngine()
        engine.max_iterations = 2
        
        passed_error_feedback = []
        original_get_improved_code = engine.simulator.get_improved_code

        def mock_get_improved_code(current_code, iteration, inject_syntax_error=False, perturbation_feedback=None, error_feedback=None):
            passed_error_feedback.append(error_feedback)
            return original_get_improved_code(current_code, iteration, inject_syntax_error, perturbation_feedback, error_feedback)

        engine.simulator.get_improved_code = mock_get_improved_code

        calls = []
        def mock_run_tests():
            if not calls:
                calls.append(1)
                return {"success": False, "stdout": "", "stderr": "NameError: name 'x' is not defined", "returncode": 1}
            return {"success": True, "stdout": "", "stderr": "", "returncode": 0}

        engine.runner.run_tests = mock_run_tests

        engine.run()

        self.assertGreaterEqual(len(passed_error_feedback), 2)
        self.assertIsNotNone(passed_error_feedback[1])
        self.assertIn("NameError", passed_error_feedback[1])

    def test_baseline_metrics_initialization(self):
        engine = SelfImprovementEngine()
        engine.max_iterations = 1
        engine.run()
        self.assertIsNotNone(engine.baseline_metrics)
        self.assertTrue(hasattr(engine.baseline_metrics, "pass_rate"))
        self.assertTrue(hasattr(engine.baseline_metrics, "execution_time_sec"))

    def test_evaluate_performance_degradation_latency(self):
        try:
            from recursive_self_improvement.evaluator import BenchmarkMetrics
        except ImportError:
            from evaluator import BenchmarkMetrics
        engine = SelfImprovementEngine()
        engine.stable_baseline_metrics = BenchmarkMetrics(
            pass_rate=100.0, passed_tests=2, failed_tests=0, total_tests=2,
            execution_time_sec=0.1, peak_memory_mb=1.0, accuracy_score=1.0,
            ast_valid=True, error_message=""
        )
        candidate = BenchmarkMetrics(
            pass_rate=100.0, passed_tests=2, failed_tests=0, total_tests=2,
            execution_time_sec=0.25, peak_memory_mb=1.0, accuracy_score=1.0,
            ast_valid=True, error_message=""
        )
        degraded_event, reasons = engine.evaluate_performance_degradation(candidate)
        self.assertEqual(degraded_event, "REJECT_LATENCY_DEGRADED")
        self.assertTrue(any("execution_time_sec" in r for r in reasons))

    def test_evaluate_performance_degradation_memory(self):
        try:
            from recursive_self_improvement.evaluator import BenchmarkMetrics
        except ImportError:
            from evaluator import BenchmarkMetrics
        engine = SelfImprovementEngine()
        engine.stable_baseline_metrics = BenchmarkMetrics(
            pass_rate=100.0, passed_tests=2, failed_tests=0, total_tests=2,
            execution_time_sec=0.1, peak_memory_mb=1.0, accuracy_score=1.0,
            ast_valid=True, error_message=""
        )
        candidate = BenchmarkMetrics(
            pass_rate=100.0, passed_tests=2, failed_tests=0, total_tests=2,
            execution_time_sec=0.1, peak_memory_mb=1.35, accuracy_score=1.0,
            ast_valid=True, error_message=""
        )
        degraded_event, reasons = engine.evaluate_performance_degradation(candidate)
        self.assertEqual(degraded_event, "REJECT_MEMORY_DEGRADED")
        self.assertTrue(any("peak_memory_mb" in r for r in reasons))

    def test_evaluate_performance_degradation_accuracy(self):
        try:
            from recursive_self_improvement.evaluator import BenchmarkMetrics
        except ImportError:
            from evaluator import BenchmarkMetrics
        engine = SelfImprovementEngine()
        engine.stable_baseline_metrics = BenchmarkMetrics(
            pass_rate=100.0, passed_tests=2, failed_tests=0, total_tests=2,
            execution_time_sec=0.1, peak_memory_mb=1.0, accuracy_score=1.0,
            ast_valid=True, error_message=""
        )
        candidate = BenchmarkMetrics(
            pass_rate=100.0, passed_tests=2, failed_tests=0, total_tests=2,
            execution_time_sec=0.1, peak_memory_mb=1.0, accuracy_score=0.95,
            ast_valid=True, error_message=""
        )
        degraded_event, reasons = engine.evaluate_performance_degradation(candidate)
        self.assertEqual(degraded_event, "REJECT_ACCURACY_DEGRADED")
        self.assertTrue(any("accuracy_score" in r for r in reasons))

    def test_engine_performance_degradation_rejection_loop(self):
        try:
            from recursive_self_improvement.evaluator import BenchmarkMetrics
        except ImportError:
            from evaluator import BenchmarkMetrics
        engine = SelfImprovementEngine()
        engine.max_iterations = 1

        engine.runner.run_tests = lambda: {"success": True, "stdout": "", "stderr": "", "returncode": 0}

        baseline_m = BenchmarkMetrics(
            pass_rate=100.0, passed_tests=2, failed_tests=0, total_tests=2,
            execution_time_sec=0.1, peak_memory_mb=1.0, accuracy_score=1.0,
            ast_valid=True, error_message=""
        )
        degraded_m = BenchmarkMetrics(
            pass_rate=100.0, passed_tests=2, failed_tests=0, total_tests=2,
            execution_time_sec=5.0, peak_memory_mb=1.0, accuracy_score=1.0,
            ast_valid=True, error_message=""
        )

        call_cnt = [0]
        def mock_run_benchmark():
            call_cnt[0] += 1
            if call_cnt[0] == 1:
                return baseline_m
            return degraded_m

        engine.evaluator.run_benchmark = mock_run_benchmark

        engine.run()

        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("REJECT_LATENCY_DEGRADED", event_types)
        self.assertIsNotNone(engine.perturbation_feedback)
        self.assertIn("REJECT_LATENCY_DEGRADED", engine.perturbation_feedback)



if __name__ == '__main__':
    unittest.main()


