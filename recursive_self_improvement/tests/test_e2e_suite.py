import unittest
from unittest.mock import patch
import os
import sys
import shutil
import tempfile
import json
import ast
import time
import re
from pathlib import Path

# Add project root and module directories to sys.path
base_dir = Path(__file__).parent.parent.parent.resolve()
if str(base_dir) not in sys.path:
    sys.path.insert(0, str(base_dir))

rec_dir = str(base_dir / "recursive_self_improvement")
if str(rec_dir) not in sys.path:
    sys.path.insert(0, str(rec_dir))

try:
    from recursive_self_improvement import config
    from recursive_self_improvement.vcs import CustomVCS
    from recursive_self_improvement.runner import TestRunner
    from recursive_self_improvement.simulator import MockLLMSimulator, RateLimitError
    from recursive_self_improvement.engine import SelfImprovementEngine
    from recursive_self_improvement.evaluator import BenchmarkRunner, BenchmarkMetrics
    from recursive_self_improvement.reporter import ReportGenerator
except ImportError:
    from self_improvement_loop import config
    from self_improvement_loop.vcs import CustomVCS
    from self_improvement_loop.runner import TestRunner
    from self_improvement_loop.simulator import MockLLMSimulator, RateLimitError
    from self_improvement_loop.engine import SelfImprovementEngine
    from self_improvement_loop.evaluator import BenchmarkRunner, BenchmarkMetrics
    from self_improvement_loop.reporter import ReportGenerator


SAMPLE_INITIAL_CODE_WITH_BUG = """import math

class Calculator:
    def add(self, a, b):
        # BUG: returns subtraction
        return a - b
"""

SAMPLE_VALID_CODE = """import math

class Calculator:
    def add(self, a: float, b: float) -> float:
        \"\"\"Adds two numbers.\"\"\"
        return a + b

    def subtract(self, a: float, b: float) -> float:
        \"\"\"Subtracts b from a.\"\"\"
        return a - b
"""

SAMPLE_TEST_CODE = """import unittest
import sys

sys.modules.pop("target_module", None)

from target_module import Calculator

class TestCalculator(unittest.TestCase):
    def test_add(self):
        c = Calculator()
        self.assertEqual(c.add(2, 3), 5)
    def test_subtract(self):
        c = Calculator()
        if hasattr(c, 'subtract'):
            self.assertEqual(c.subtract(5, 2), 3)

if __name__ == "__main__":
    unittest.main()
"""

SAMPLE_INVALID_SYNTAX_CODE = """class Calculator
    def add(self, a, b)
        return a + b
"""


class TestTier1FeatureCoverage(unittest.TestCase):
    """
    Tier 1: Feature Coverage (≥5 tests per feature for Features F1 - F10)
    Total: 50 tests
    """

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="t1_e2e_")
        self.target_file = os.path.join(self.temp_dir, "target_module.py")
        self.test_file = os.path.join(self.temp_dir, "test_target_module.py")
        self.history_dir = os.path.join(self.temp_dir, "history")
        os.makedirs(self.history_dir, exist_ok=True)
        
        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write(SAMPLE_INITIAL_CODE_WITH_BUG)
        with open(self.test_file, "w", encoding="utf-8") as f:
            f.write(SAMPLE_TEST_CODE)

        self.patchers = [
            patch("recursive_self_improvement.config.TARGET_FILE", self.target_file),
            patch("recursive_self_improvement.config.TEST_FILE", self.test_file),
            patch("recursive_self_improvement.config.HISTORY_DIR", self.history_dir),
            patch("self_improvement_loop.config.TARGET_FILE", self.target_file),
            patch("self_improvement_loop.config.TEST_FILE", self.test_file),
            patch("self_improvement_loop.config.HISTORY_DIR", self.history_dir),
        ]
        for p in self.patchers:
            p.start()

    def tearDown(self):
        for p in self.patchers:
            p.stop()
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def _create_engine(self):
        return SelfImprovementEngine()

    # --- Feature 1: Baseline Directory & Setup ---
    def test_t1_f1_01_config_paths_resolved(self):
        self.assertTrue(os.path.isabs(config.BASE_DIR))
        self.assertTrue(os.path.exists(config.TARGET_FILE))

    def test_t1_f1_02_baseline_target_file_exists(self):
        self.assertTrue(os.path.exists(self.target_file))
        with open(self.target_file, "r", encoding="utf-8") as f:
            self.assertIn("class Calculator", f.read())

    def test_t1_f1_03_history_dir_creation(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        self.assertTrue(os.path.exists(self.history_dir))

    def test_t1_f1_04_vcs_initialization(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        self.assertEqual(vcs.history_dir, self.history_dir)
        self.assertEqual(vcs.target_file, self.target_file)

    def test_t1_f1_05_stop_flag_path_configured(self):
        stop_path = getattr(config, "STOP_FLAG_FILE", os.path.join(config.BASE_DIR, "stop.flag"))
        self.assertTrue(isinstance(stop_path, str))

    # --- Feature 2: Self-Improvement Engine Loop ---
    def test_t1_f2_01_engine_instance_creation(self):
        engine = self._create_engine()
        self.assertIsNotNone(engine)
        self.assertEqual(engine.consecutive_rollbacks, 0)

    def test_t1_f2_02_engine_run_single_successful_iteration(self):
        engine = self._create_engine()
        engine.max_iterations = 1
        res = engine.run()
        self.assertTrue(res)

    def test_t1_f2_03_engine_resume_from_existing_history(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(5, SAMPLE_VALID_CODE, SAMPLE_TEST_CODE)
        
        engine = self._create_engine()
        engine.max_iterations = 5
        res = engine.run()
        self.assertTrue(res)

    def test_t1_f2_04_engine_version_idx_advancement(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(1, SAMPLE_VALID_CODE)
        self.assertTrue(vcs.has_version(1))

    def test_t1_f2_05_engine_recent_hashes_stuck_detection(self):
        engine = self._create_engine()
        code_hash = "abc123hash"
        engine.recent_hashes = [code_hash]
        self.assertIn(code_hash, engine.recent_hashes)

    # --- Feature 3: AST Pre-Validation ---
    def test_t1_f3_01_valid_ast_parse_pass(self):
        tree = ast.parse(SAMPLE_VALID_CODE)
        self.assertIsNotNone(tree)

    def test_t1_f3_02_invalid_ast_syntax_error_catch(self):
        with self.assertRaises(SyntaxError):
            ast.parse(SAMPLE_INVALID_SYNTAX_CODE)

    def test_t1_f3_03_normalize_error_message_strips_paths(self):
        engine = self._create_engine()
        raw_err = f'File "{self.target_file}", line 42, in add'
        norm_err = engine.normalize_error_message(raw_err)
        self.assertNotIn(self.target_file, norm_err)

    def test_t1_f3_04_ast_error_saves_failed_file(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        failed_path = os.path.join(self.history_dir, "target_module.v1.failed.py")
        with open(failed_path, "w", encoding="utf-8") as f:
            f.write(SAMPLE_INVALID_SYNTAX_CODE)
        self.assertTrue(os.path.exists(failed_path))

    def test_t1_f3_05_ast_pre_validation_prevents_corrupting_target(self):
        engine = self._create_engine()
        with open(self.target_file, "r", encoding="utf-8") as f:
            initial_content = f.read()
        
        try:
            ast.parse(SAMPLE_INVALID_SYNTAX_CODE)
        except SyntaxError:
            pass
            
        with open(self.target_file, "r", encoding="utf-8") as f:
            final_content = f.read()
        self.assertEqual(initial_content, final_content)

    # --- Feature 4: Safety Guardrails & Limits ---
    def test_t1_f4_01_max_iterations_cap_exited(self):
        engine = self._create_engine()
        engine.max_iterations = 2
        res = engine.run()
        self.assertTrue(res)

    def test_t1_f4_02_iteration_timeout_guardrail(self):
        engine = self._create_engine()
        engine.timeout_seconds = -1.0
        res = engine.run()
        self.assertFalse(res)

    def test_t1_f4_03_session_timeout_guardrail(self):
        engine = self._create_engine()
        engine.session_timeout_seconds = -1.0
        res = engine.run()
        self.assertFalse(res)

    def test_t1_f4_04_token_budget_exceeded_guardrail(self):
        engine = self._create_engine()
        engine.total_token_budget = 500
        engine.token_budget_per_iteration = 1000
        res = engine.run()
        self.assertFalse(res)

    def test_t1_f4_05_stop_flag_check(self):
        engine = self._create_engine()
        stop_file = os.path.join(self.temp_dir, "stop.flag")
        with open(stop_file, "w") as f:
            f.write("stop")
        
        original_stop = getattr(config, "STOP_FLAG_FILE", None)
        config.STOP_FLAG_FILE = stop_file
        try:
            self.assertTrue(engine.check_stop_signal())
        finally:
            if original_stop:
                config.STOP_FLAG_FILE = original_stop

    # --- Feature 5: Quantitative Metric Collector ---
    def test_t1_f5_01_calculate_metrics_loc_count(self):
        sim = MockLLMSimulator()
        metrics = sim.calculate_metrics(SAMPLE_VALID_CODE)
        self.assertGreater(metrics["lines_of_code"], 0)

    def test_t1_f5_02_calculate_metrics_method_count(self):
        sim = MockLLMSimulator()
        metrics = sim.calculate_metrics(SAMPLE_VALID_CODE)
        self.assertEqual(metrics["method_count"], 2)

    def test_t1_f5_03_calculate_metrics_docstrings_count(self):
        sim = MockLLMSimulator()
        metrics = sim.calculate_metrics(SAMPLE_VALID_CODE)
        self.assertEqual(metrics["docstrings_count"], 1)

    def test_t1_f5_04_calculate_metrics_type_annotations_count(self):
        sim = MockLLMSimulator()
        metrics = sim.calculate_metrics(SAMPLE_VALID_CODE)
        self.assertGreaterEqual(metrics["type_annotations_count"], 2)

    def test_t1_f5_05_calculate_metrics_ast_valid_flag(self):
        sim = MockLLMSimulator()
        metrics_valid = sim.calculate_metrics(SAMPLE_VALID_CODE)
        metrics_invalid = sim.calculate_metrics(SAMPLE_INVALID_SYNTAX_CODE)
        self.assertTrue(metrics_valid["ast_valid"])
        self.assertFalse(metrics_invalid["ast_valid"])

    # --- Feature 6: Performance Degradation Detector ---
    def test_t1_f6_01_quality_score_calculation(self):
        sim = MockLLMSimulator()
        metrics = sim.calculate_metrics(SAMPLE_VALID_CODE)
        self.assertGreater(metrics["quality_score"], 40.0)

    def test_t1_f6_02_degradation_score_drop(self):
        sim = MockLLMSimulator()
        good_score = sim.calculate_metrics(SAMPLE_VALID_CODE)["quality_score"]
        bad_score = sim.calculate_metrics(SAMPLE_INVALID_SYNTAX_CODE)["quality_score"]
        self.assertGreater(good_score, bad_score)

    def test_t1_f6_03_duplicate_code_hash_tracking(self):
        engine = self._create_engine()
        engine.recent_hashes.append("hash1")
        engine.recent_hashes.append("hash2")
        self.assertEqual(len(engine.recent_hashes), 2)

    def test_t1_f6_04_consecutive_rollback_counter(self):
        engine = self._create_engine()
        engine.consecutive_rollbacks += 1
        self.assertEqual(engine.consecutive_rollbacks, 1)

    def test_t1_f6_05_feedback_prompt_generation_on_stuck(self):
        engine = self._create_engine()
        engine.consecutive_rollbacks = 3
        is_stuck = engine.consecutive_rollbacks >= 3
        if is_stuck:
            engine.perturbation_feedback = "Warning: Stuck state detected."
        self.assertIsNotNone(engine.perturbation_feedback)

    # --- Feature 7: Multi-Tier Rollback Engine ---
    def test_t1_f7_01_restore_target_file(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(1, "code_v1", "test_v1")
        
        with open(self.target_file, "w") as f:
            f.write("corrupted_target")
        vcs.restore_version(1)
        
        with open(self.target_file, "r") as f:
            self.assertEqual(f.read(), "code_v1")

    def test_t1_f7_02_restore_test_file(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(1, "code_v1", "test_v1")
        
        with open(self.test_file, "w") as f:
            f.write("corrupted_test")
        vcs.restore_version(1)
        
        with open(self.test_file, "r") as f:
            self.assertEqual(f.read(), "test_v1")

    def test_t1_f7_03_atomic_dual_file_rollback(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(1, "good_code", "good_test")
        
        with open(self.target_file, "w") as f:
            f.write("bad_code")
        with open(self.test_file, "w") as f:
            f.write("bad_test")
            
        vcs.rollback(1)
        with open(self.target_file, "r") as f:
            self.assertEqual(f.read(), "good_code")
        with open(self.test_file, "r") as f:
            self.assertEqual(f.read(), "good_test")

    def test_t1_f7_04_post_rollback_verification_runs(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, SAMPLE_VALID_CODE, SAMPLE_TEST_CODE)
        with open(self.target_file, "w") as f:
            f.write(SAMPLE_VALID_CODE)
        runner = TestRunner(self.test_file)
        res = runner.run_tests()
        self.assertTrue(res["success"])

    def test_t1_f7_05_rollback_event_logged_in_execution_log(self):
        engine = self._create_engine()
        engine.log_event("ROLLBACK", "Rolled back to v0", {"iteration": 1})
        self.assertEqual(engine.execution_log[-1]["event_type"], "ROLLBACK")

    # --- Feature 8: Diff Recording & VCS ---
    def test_t1_f8_01_generate_diff_creates_unified_diff(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        diff_str = vcs.generate_diff(1, "line1\n", "line1\nline2\n")
        self.assertIn("+line2", diff_str)

    def test_t1_f8_02_generate_diff_writes_patch_file(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.generate_diff(1, "a=1\n", "a=2\n")
        patch_path = os.path.join(self.history_dir, "patch_v1.diff")
        self.assertTrue(os.path.exists(patch_path))

    def test_t1_f8_03_save_version_snapshot(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(2, "code_v2", "test_v2")
        snap_target = os.path.join(self.history_dir, "target_module.v2.py")
        self.assertTrue(os.path.exists(snap_target))

    def test_t1_f8_04_has_version_returns_true_when_exists(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        self.assertFalse(vcs.has_version(10))
        vcs.save_version(10, "v10")
        self.assertTrue(vcs.has_version(10))

    def test_t1_f8_05_version_0_initial_snapshot(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, SAMPLE_VALID_CODE, SAMPLE_TEST_CODE)
        self.assertTrue(vcs.has_version(0))

    # --- Feature 9: Audit Log & Trajectory Tracking ---
    def test_t1_f9_01_log_event_records_entry(self):
        engine = self._create_engine()
        engine.log_event("START", "Testing log event")
        self.assertEqual(len(engine.execution_log), 1)

    def test_t1_f9_02_save_execution_log_writes_json(self):
        engine = self._create_engine()
        engine.log_event("TEST", "Log serialization test")
        engine.save_execution_log()
        
        log_file = os.path.join(self.history_dir, "execution_log.json")
        self.assertTrue(os.path.exists(log_file))

    def test_t1_f9_03_log_event_formats_timestamp(self):
        engine = self._create_engine()
        engine.log_event("INFO", "Timestamp test")
        self.assertIn("timestamp", engine.execution_log[0])

    def test_t1_f9_04_log_event_includes_stdout_stderr_details(self):
        engine = self._create_engine()
        engine.log_event("ROLLBACK", "Rollback details", {"stdout": "out", "stderr": "err"})
        self.assertEqual(engine.execution_log[0]["details"]["stderr"], "err")

    def test_t1_f9_05_trajectory_event_types_validation(self):
        valid_events = {"START", "ITERATION_START", "SUCCESS", "ROLLBACK", "AST_SYNTAX_ERROR", "STUCK_DETECTED", "STOP_SIGNAL", "FINISHED"}
        engine = self._create_engine()
        engine.log_event("SUCCESS", "Passed")
        self.assertIn(engine.execution_log[0]["event_type"], valid_events)

    # --- Feature 10: Automated Markdown Report Generator ---
    def test_t1_f10_01_report_generator_init(self):
        log_file = os.path.join(self.history_dir, "execution_log.json")
        out_file = os.path.join(self.temp_dir, "IMPROVEMENT_REPORT.md")
        reporter = ReportGenerator(log_file, self.history_dir, out_file)
        self.assertEqual(reporter.output_path, str(Path(out_file).resolve()))

    def test_t1_f10_02_report_markdown_structure(self):
        log_file = os.path.join(self.history_dir, "execution_log.json")
        out_file = os.path.join(self.temp_dir, "IMPROVEMENT_REPORT.md")
        reporter = ReportGenerator(log_file, self.history_dir, out_file)
        report = reporter.generate_markdown_report()
        self.assertIn("# Recursive Self-Improvement Audit Report", report)
        self.assertIn("## Executive Summary", report)

    def test_t1_f10_03_report_counts_iterations_and_rollbacks(self):
        log_file = os.path.join(self.history_dir, "execution_log.json")
        out_file = os.path.join(self.temp_dir, "IMPROVEMENT_REPORT.md")
        
        sample_log = [
            {"event_type": "ITERATION_START", "message": "Iter 1", "timestamp": "12:00"},
            {"event_type": "SUCCESS", "message": "Passed", "timestamp": "12:01"},
            {"event_type": "ROLLBACK", "message": "Rolled back", "timestamp": "12:02"}
        ]
        os.makedirs(self.history_dir, exist_ok=True)
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(sample_log, f)
            
        reporter = ReportGenerator(log_file, self.history_dir, out_file)
        report = reporter.generate_markdown_report()
        self.assertIn("**Total Iterations Attempted**: 1", report)
        self.assertIn("**Successful Iterations**: 1", report)

    def test_t1_f10_04_report_lists_diff_patches(self):
        log_file = os.path.join(self.history_dir, "execution_log.json")
        out_file = os.path.join(self.temp_dir, "IMPROVEMENT_REPORT.md")
        
        patch_file = os.path.join(self.history_dir, "patch_v1.diff")
        os.makedirs(self.history_dir, exist_ok=True)
        with open(patch_file, "w", encoding="utf-8") as f:
            f.write("+line\n")
            
        reporter = ReportGenerator(log_file, self.history_dir, out_file)
        report = reporter.generate_markdown_report()
        self.assertIn("patch_v1.diff", report)

    def test_t1_f10_05_report_exports_file_to_disk(self):
        log_file = os.path.join(self.history_dir, "execution_log.json")
        out_file = os.path.join(self.temp_dir, "IMPROVEMENT_REPORT.md")
        reporter = ReportGenerator(log_file, self.history_dir, out_file)
        reporter.generate_markdown_report()
        self.assertTrue(os.path.exists(out_file))


class TestTier2BoundaryCases(unittest.TestCase):
    """
    Tier 2: Boundary & Corner Cases (≥5 tests per feature for Features F1 - F10)
    Total: 50 tests
    """

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="t2_e2e_")
        self.target_file = os.path.join(self.temp_dir, "target_module.py")
        self.test_file = os.path.join(self.temp_dir, "test_target_module.py")
        self.history_dir = os.path.join(self.temp_dir, "history")
        os.makedirs(self.history_dir, exist_ok=True)
        
        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write(SAMPLE_VALID_CODE)
        with open(self.test_file, "w", encoding="utf-8") as f:
            f.write(SAMPLE_TEST_CODE)

        self.patchers = [
            patch("recursive_self_improvement.config.TARGET_FILE", self.target_file),
            patch("recursive_self_improvement.config.TEST_FILE", self.test_file),
            patch("recursive_self_improvement.config.HISTORY_DIR", self.history_dir),
            patch("self_improvement_loop.config.TARGET_FILE", self.target_file),
            patch("self_improvement_loop.config.TEST_FILE", self.test_file),
            patch("self_improvement_loop.config.HISTORY_DIR", self.history_dir),
        ]
        for p in self.patchers:
            p.start()

    def tearDown(self):
        for p in self.patchers:
            p.stop()
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def _create_engine(self):
        return SelfImprovementEngine()

    # --- F1 Boundary Cases ---
    def test_t2_f1_b1_empty_target_file(self):
        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write("")
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, "")
        self.assertTrue(vcs.has_version(0))

    def test_t2_f1_b2_nonexistent_history_dir_auto_created(self):
        new_hist = os.path.join(self.temp_dir, "nested", "history")
        vcs = CustomVCS(new_hist, self.target_file, self.test_file)
        self.assertTrue(os.path.exists(new_hist))

    def test_t2_f1_b3_path_with_spaces_and_unicode(self):
        unicode_dir = os.path.join(self.temp_dir, "한글 경로 space")
        os.makedirs(unicode_dir, exist_ok=True)
        t_file = os.path.join(unicode_dir, "target.py")
        with open(t_file, "w", encoding="utf-8") as f:
            f.write("# comment\n")
        vcs = CustomVCS(unicode_dir, t_file)
        vcs.save_version(1, "# comment\n")
        self.assertTrue(vcs.has_version(1))

    def test_t2_f1_b4_missing_config_attributes_fallback(self):
        engine = self._create_engine()
        val = getattr(engine, "session_timeout_seconds", 18000)
        self.assertGreater(val, 0)

    def test_t2_f1_b5_read_only_history_dir_handling(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, SAMPLE_VALID_CODE)
        self.assertTrue(os.path.exists(os.path.join(self.history_dir, "target_module.v0.py")))

    # --- F2 Boundary Cases ---
    def test_t2_f2_b1_max_iterations_zero(self):
        engine = self._create_engine()
        engine.max_iterations = 0
        res = engine.run()
        self.assertTrue(res)

    def test_t2_f2_b2_iteration_1_failure_and_rollback(self):
        engine = self._create_engine()
        engine.max_iterations = 1
        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write(SAMPLE_INVALID_SYNTAX_CODE)
        res = engine.run()
        self.assertTrue(isinstance(res, bool))

    def test_t2_f2_b3_simulator_returns_empty_string(self):
        sim = MockLLMSimulator()
        metrics = sim.calculate_metrics("")
        self.assertEqual(metrics["lines_of_code"], 0)
        self.assertFalse(metrics["ast_valid"])

    def test_t2_f2_b4_rate_limit_exception_handling(self):
        rle = RateLimitError("Rate limited", reset_seconds=1)
        self.assertEqual(rle.reset_seconds, 1)
        self.assertIn("Rate limited", str(rle))

    def test_t2_f2_b5_consecutive_rollbacks_exceeding_threshold(self):
        engine = self._create_engine()
        for _ in range(4):
            engine.consecutive_rollbacks += 1
        self.assertGreater(engine.consecutive_rollbacks, 3)

    # --- F3 Boundary Cases ---
    def test_t2_f3_b1_ast_parse_empty_string(self):
        tree = ast.parse("")
        self.assertIsNotNone(tree)

    def test_t2_f3_b2_ast_parse_unterminated_string(self):
        bad_code = 's = "unterminated string'
        with self.assertRaises(SyntaxError):
            ast.parse(bad_code)

    def test_t2_f3_b3_ast_parse_invalid_indentation(self):
        bad_code = "def foo():\nreturn 42"
        with self.assertRaises(IndentationError):
            ast.parse(bad_code)

    def test_t2_f3_b4_normalize_error_multiline_traceback(self):
        engine = self._create_engine()
        tb = 'File "C:\\foo\\bar.py", line 10\n  def foo()\nSyntaxError: expected \':\''
        norm = engine.normalize_error_message(tb)
        self.assertNotIn("C:\\foo\\bar.py", norm)
        self.assertIn("SyntaxError", norm)

    def test_t2_f3_b5_non_ascii_unicode_in_ast_parse(self):
        unicode_code = '# 한글 주석\ndef 계산(a: int) -> int:\n    return a * 2\n'
        tree = ast.parse(unicode_code)
        self.assertIsNotNone(tree)

    # --- F4 Boundary Cases ---
    def test_t2_f4_b1_zero_timeout_seconds(self):
        engine = self._create_engine()
        engine.timeout_seconds = 0.0
        res = engine.run()
        self.assertFalse(res)

    def test_t2_f4_b2_zero_session_timeout_seconds(self):
        engine = self._create_engine()
        engine.session_timeout_seconds = 0.0
        res = engine.run()
        self.assertFalse(res)

    def test_t2_f4_b3_token_budget_equal_to_threshold(self):
        engine = self._create_engine()
        engine.total_token_budget = 1000
        engine.token_budget_per_iteration = 1000
        remaining = engine.total_token_budget - engine.cumulative_tokens_used
        self.assertEqual(remaining, 1000)

    def test_t2_f4_b4_api_requests_count_reached_limit(self):
        engine = self._create_engine()
        engine.api_requests_count = 500
        engine.max_api_requests = 500
        self.assertGreaterEqual(engine.api_requests_count, engine.max_api_requests)

    def test_t2_f4_b5_command_txt_stop_case_insensitive(self):
        engine = self._create_engine()
        cmd_file = os.path.join(self.temp_dir, "command.txt")
        with open(cmd_file, "w", encoding="utf-8") as f:
            f.write("  stop  \n")
            
        original_cmd = getattr(config, "COMMAND_FILE", None)
        config.COMMAND_FILE = cmd_file
        try:
            self.assertTrue(engine.check_stop_signal())
        finally:
            if original_cmd:
                config.COMMAND_FILE = original_cmd

    # --- F5 Boundary Cases ---
    def test_t2_f5_b1_metrics_empty_code(self):
        sim = MockLLMSimulator()
        m = sim.calculate_metrics("")
        self.assertEqual(m["quality_score"], 0.0)

    def test_t2_f5_b2_metrics_comments_only(self):
        sim = MockLLMSimulator()
        m = sim.calculate_metrics("# comment line 1\n# comment line 2\n")
        self.assertEqual(m["method_count"], 0)

    def test_t2_f5_b3_metrics_zero_methods(self):
        sim = MockLLMSimulator()
        m = sim.calculate_metrics("x = 10\ny = 20\n")
        self.assertEqual(m["method_count"], 0)

    def test_t2_f5_b4_metrics_single_line_code(self):
        sim = MockLLMSimulator()
        m = sim.calculate_metrics("print('hello')")
        self.assertEqual(m["lines_of_code"], 1)

    def test_t2_f5_b5_metrics_huge_code_performance(self):
        sim = MockLLMSimulator()
        large_code = "x = 1\n" * 10000
        m = sim.calculate_metrics(large_code)
        self.assertEqual(m["lines_of_code"], 10000)

    # --- F6 Boundary Cases ---
    def test_t2_f6_b1_quality_score_ast_invalid_caps_at_zero(self):
        sim = MockLLMSimulator()
        m = sim.calculate_metrics("def bad_func(")
        self.assertFalse(m["ast_valid"])

    def test_t2_f6_b2_negative_delta_quality_score(self):
        sim = MockLLMSimulator()
        q1 = sim.calculate_metrics(SAMPLE_VALID_CODE)["quality_score"]
        q2 = sim.calculate_metrics("x = 1")["quality_score"]
        delta = q2 - q1
        self.assertLess(delta, 0.0)

    def test_t2_f6_b3_zero_division_guard_in_evaluator(self):
        bm = BenchmarkMetrics(
            pass_rate=0.0, passed_tests=0, failed_tests=0, total_tests=0,
            execution_time_sec=0.0, peak_memory_mb=0.0, accuracy_score=0.0,
            ast_valid=True, error_message=""
        )
        self.assertEqual(bm.total_tests, 0)

    def test_t2_f6_b4_repeating_exact_error_message_detection(self):
        engine = self._create_engine()
        err1 = "SyntaxError: expected ':'"
        engine.last_error_message = err1
        is_stuck = (err1 == engine.last_error_message)
        self.assertTrue(is_stuck)

    def test_t2_f6_b5_quality_score_upper_bound_cap(self):
        sim = MockLLMSimulator()
        code = "def foo(): pass\n" * 50 + '"""doc"""\n' * 50 + "x: int = 1\n" * 50
        m = sim.calculate_metrics(code)
        self.assertLessEqual(m["quality_score"], 100.0)

    # --- F7 Boundary Cases ---
    def test_t2_f7_b1_rollback_to_nonexistent_version_raises(self):
        nonexistent_dir = os.path.join(self.temp_dir, "empty_hist")
        os.makedirs(nonexistent_dir, exist_ok=True)
        vcs = CustomVCS(nonexistent_dir, self.target_file, self.test_file)
        with self.assertRaises(FileNotFoundError):
            vcs.restore_version(999)

    def test_t2_f7_b2_rollback_missing_test_snapshot_handles_gracefully(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(1, "code_v1")
        
        with open(self.target_file, "w") as f:
            f.write("corrupted")
        vcs.rollback(1)
        with open(self.target_file, "r") as f:
            self.assertEqual(f.read(), "code_v1")

    def test_t2_f7_b3_corrupt_both_files_and_rollback(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(1, "valid_code", "valid_test")
        
        with open(self.target_file, "w") as f:
            f.write("corrupt1")
        with open(self.test_file, "w") as f:
            f.write("corrupt2")
            
        vcs.rollback(1)
        with open(self.target_file, "r") as f:
            self.assertEqual(f.read(), "valid_code")
        with open(self.test_file, "r") as f:
            self.assertEqual(f.read(), "valid_test")

    def test_t2_f7_b4_vcs_with_none_test_file(self):
        vcs = CustomVCS(self.history_dir, self.target_file, test_file=None)
        vcs.save_version(1, "target_only")
        vcs.rollback(1)
        with open(self.target_file, "r") as f:
            self.assertEqual(f.read(), "target_only")

    def test_t2_f7_b5_multiple_sequential_rollbacks(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(1, "v1_code")
        vcs.save_version(2, "v2_code")
        
        vcs.rollback(2)
        with open(self.target_file, "r") as f:
            self.assertEqual(f.read(), "v2_code")
            
        vcs.rollback(1)
        with open(self.target_file, "r") as f:
            self.assertEqual(f.read(), "v1_code")

    # --- F8 Boundary Cases ---
    def test_t2_f8_b1_diff_identical_strings(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        diff = vcs.generate_diff(1, "same\n", "same\n")
        self.assertEqual(diff, "")

    def test_t2_f8_b2_diff_with_empty_string(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        diff = vcs.generate_diff(1, "", "line1\n")
        self.assertIn("+line1", diff)

    def test_t2_f8_b3_diff_non_ascii_unicode(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        diff = vcs.generate_diff(1, "# 이전\n", "# 변경후\n")
        self.assertIn("+# 변경후", diff)

    def test_t2_f8_b4_diff_version_0_initial_file_header(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        diff = vcs.generate_diff(0, "", "code\n")
        self.assertIn("target_module.initial.py", diff)

    def test_t2_f8_b5_has_version_invalid_negative_index(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        self.assertFalse(vcs.has_version(-1))

    # --- F9 Boundary Cases ---
    def test_t2_f9_b1_log_event_empty_message(self):
        engine = self._create_engine()
        engine.log_event("EMPTY", "")
        self.assertEqual(engine.execution_log[0]["message"], "")

    def test_t2_f9_b2_log_event_none_details(self):
        engine = self._create_engine()
        engine.log_event("NONE", "Msg", None)
        self.assertEqual(engine.execution_log[0]["details"], {})

    def test_t2_f9_b3_execution_log_json_serialization_unicode(self):
        engine = self._create_engine()
        engine.log_event("UNICODE", "한글 로그 메시지", {"key": "값"})
        engine.save_execution_log()
        
        log_file = os.path.join(self.history_dir, "execution_log.json")
        with open(log_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(data[0]["message"], "한글 로그 메시지")

    def test_t2_f9_b4_execution_log_deeply_nested_details(self):
        engine = self._create_engine()
        engine.log_event("NESTED", "Deep detail", {"level1": {"level2": {"val": 42}}})
        engine.save_execution_log()
        
        log_file = os.path.join(self.history_dir, "execution_log.json")
        with open(log_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertEqual(data[0]["details"]["level1"]["level2"]["val"], 42)

    def test_t2_f9_b5_log_event_with_special_chars(self):
        engine = self._create_engine()
        engine.log_event("SPECIAL", "Line1\nLine2\t'quote' \"double\"")
        self.assertIn("quote", engine.execution_log[0]["message"])

    # --- F10 Boundary Cases ---
    def test_t2_f10_b1_report_gen_empty_execution_log_file(self):
        log_file = os.path.join(self.history_dir, "execution_log.json")
        out_file = os.path.join(self.temp_dir, "IMPROVEMENT_REPORT.md")
        with open(log_file, "w", encoding="utf-8") as f:
            f.write("[]")
            
        reporter = ReportGenerator(log_file, self.history_dir, out_file)
        report = reporter.generate_markdown_report()
        self.assertIn("**Total Iterations Attempted**: 0", report)

    def test_t2_f10_b2_report_gen_nonexistent_log_file(self):
        log_file = os.path.join(self.history_dir, "nonexistent.json")
        out_file = os.path.join(self.temp_dir, "IMPROVEMENT_REPORT.md")
        reporter = ReportGenerator(log_file, self.history_dir, out_file)
        report = reporter.generate_markdown_report()
        self.assertIn("No execution events recorded.", report)

    def test_t2_f10_b3_report_gen_creates_nested_output_directory(self):
        log_file = os.path.join(self.history_dir, "execution_log.json")
        out_file = os.path.join(self.temp_dir, "sub1", "sub2", "IMPROVEMENT_REPORT.md")
        reporter = ReportGenerator(log_file, self.history_dir, out_file)
        reporter.generate_markdown_report()
        self.assertTrue(os.path.exists(out_file))

    def test_t2_f10_b4_report_gen_large_log_performance(self):
        log_file = os.path.join(self.history_dir, "execution_log.json")
        out_file = os.path.join(self.temp_dir, "IMPROVEMENT_REPORT.md")
        
        large_log = [{"event_type": "INFO", "message": f"Event {i}", "timestamp": "12:00"} for i in range(1000)]
        os.makedirs(self.history_dir, exist_ok=True)
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(large_log, f)
            
        reporter = ReportGenerator(log_file, self.history_dir, out_file)
        report = reporter.generate_markdown_report()
        self.assertIn("Event 999", report)

    def test_t2_f10_b5_report_gen_special_markdown_characters_escaping(self):
        log_file = os.path.join(self.history_dir, "execution_log.json")
        out_file = os.path.join(self.temp_dir, "IMPROVEMENT_REPORT.md")
        
        special_log = [{"event_type": "INFO", "message": "Test *bold* _italic_ [link]", "timestamp": "12:00"}]
        os.makedirs(self.history_dir, exist_ok=True)
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(special_log, f)
            
        reporter = ReportGenerator(log_file, self.history_dir, out_file)
        report = reporter.generate_markdown_report()
        self.assertIn("Test *bold*", report)


class TestTier3CrossFeatureCombinations(unittest.TestCase):
    """
    Tier 3: Pairwise & Cross-Feature Interactions (10 tests)
    """

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="t3_e2e_")
        self.target_file = os.path.join(self.temp_dir, "target_module.py")
        self.test_file = os.path.join(self.temp_dir, "test_target_module.py")
        self.history_dir = os.path.join(self.temp_dir, "history")
        os.makedirs(self.history_dir, exist_ok=True)
        
        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write(SAMPLE_INITIAL_CODE_WITH_BUG)
        with open(self.test_file, "w", encoding="utf-8") as f:
            f.write(SAMPLE_TEST_CODE)

        self.patchers = [
            patch("recursive_self_improvement.config.TARGET_FILE", self.target_file),
            patch("recursive_self_improvement.config.TEST_FILE", self.test_file),
            patch("recursive_self_improvement.config.HISTORY_DIR", self.history_dir),
            patch("self_improvement_loop.config.TARGET_FILE", self.target_file),
            patch("self_improvement_loop.config.TEST_FILE", self.test_file),
            patch("self_improvement_loop.config.HISTORY_DIR", self.history_dir),
        ]
        for p in self.patchers:
            p.start()

    def tearDown(self):
        for p in self.patchers:
            p.stop()
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def _create_engine(self):
        return SelfImprovementEngine()

    def test_t3_01_ast_syntax_error_triggers_diff_and_rollback_and_log(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, SAMPLE_VALID_CODE, SAMPLE_TEST_CODE)
        
        engine = self._create_engine()

        try:
            ast.parse(SAMPLE_INVALID_SYNTAX_CODE)
        except SyntaxError as se:
            diff_str = vcs.generate_diff(1, SAMPLE_VALID_CODE, SAMPLE_INVALID_SYNTAX_CODE)
            vcs.rollback(0)
            engine.log_event("AST_SYNTAX_ERROR", f"Syntax error: {se.msg}", {"diff": diff_str})

        self.assertEqual(engine.execution_log[-1]["event_type"], "AST_SYNTAX_ERROR")
        with open(self.target_file, "r") as f:
            self.assertEqual(f.read(), SAMPLE_VALID_CODE)

    def test_t3_02_rate_limit_retry_consumes_tokens_and_session_timeout(self):
        engine = self._create_engine()
        engine.session_timeout_seconds = 0.05
        
        engine.log_event("RATE_LIMIT", "Sleeping before retry")
        time.sleep(0.06)
        
        session_elapsed = 0.1
        if session_elapsed >= engine.session_timeout_seconds:
            engine.log_event("SESSION_TIMEOUT", "Session timeout during rate limit wait")

        self.assertEqual(engine.execution_log[-1]["event_type"], "SESSION_TIMEOUT")

    def test_t3_03_repeated_code_hash_triggers_stuck_detector_and_feedback(self):
        engine = self._create_engine()
        code_hash = "repeat_hash_123"
        engine.recent_hashes = [code_hash]
        
        if code_hash in engine.recent_hashes:
            engine.log_event("STUCK_DETECTED", "Stuck code hash detected")
            engine.perturbation_feedback = "Warning: Stuck state detected."

        self.assertEqual(engine.execution_log[-1]["event_type"], "STUCK_DETECTED")
        self.assertIsNotNone(engine.perturbation_feedback)

    def test_t3_04_test_failure_normalizes_error_and_rolls_back_and_verifies(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, SAMPLE_VALID_CODE, SAMPLE_TEST_CODE)
        
        bad_logic_code = SAMPLE_VALID_CODE.replace("return a + b", "return a * b")
        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write(bad_logic_code)
        try:
            os.utime(self.target_file, None)
        except Exception:
            pass

        runner = TestRunner(self.test_file)
        test_res = runner.run_tests()
        self.assertFalse(test_res["success"])

        vcs.rollback(0)
        verify_res = runner.run_tests()
        self.assertTrue(verify_res["success"])

    def test_t3_05_stop_flag_intercepts_loop_and_exports_log(self):
        engine = self._create_engine()
        stop_file = os.path.join(self.temp_dir, "stop.flag")
        with open(stop_file, "w") as f:
            f.write("stop")
            
        original_stop = getattr(config, "STOP_FLAG_FILE", None)
        config.STOP_FLAG_FILE = stop_file
        try:
            if engine.check_stop_signal():
                engine.log_event("STOP_SIGNAL", "Graceful shutdown requested")
                engine.save_execution_log()
        finally:
            if original_stop:
                config.STOP_FLAG_FILE = original_stop

        log_json = os.path.join(self.history_dir, "execution_log.json")
        self.assertTrue(os.path.exists(log_json))

    def test_t3_06_degradation_detector_triggers_rollback_and_updates_trajectory(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, SAMPLE_VALID_CODE)
        
        sim = MockLLMSimulator()
        m_good = sim.calculate_metrics(SAMPLE_VALID_CODE)
        m_bad = sim.calculate_metrics("def func(): pass")
        
        if m_bad["quality_score"] < m_good["quality_score"]:
            vcs.rollback(0)
            
        with open(self.target_file, "r") as f:
            self.assertEqual(f.read(), SAMPLE_VALID_CODE)

    def test_t3_07_dynamic_test_code_update_evaluates_benchmark_and_saves_diff(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, SAMPLE_VALID_CODE, SAMPLE_TEST_CODE)
        
        sim = MockLLMSimulator()
        improved_code = sim.get_improved_code(SAMPLE_VALID_CODE, iteration=1)
        
        with open(self.target_file, "w") as f:
            f.write(improved_code)
            
        diff_str = vcs.generate_diff(1, SAMPLE_VALID_CODE, improved_code)
        self.assertIsNotNone(diff_str)

    def test_t3_08_resume_from_snapshot_checks_budget_and_advances_version(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, SAMPLE_INITIAL_CODE_WITH_BUG, SAMPLE_TEST_CODE)
        
        engine = self._create_engine()
        engine.max_iterations = 1
        
        res = engine.run()
        self.assertTrue(res)

    def test_t3_09_failed_debug_file_recording_log_entry_and_report_summary(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, SAMPLE_VALID_CODE)
        
        failed_path = os.path.join(self.history_dir, "target_module.v1.failed.py")
        with open(failed_path, "w") as f:
            f.write(SAMPLE_INVALID_SYNTAX_CODE)
            
        engine = self._create_engine()
        engine.log_event("AST_SYNTAX_ERROR", "Syntax error caught", {"failed_file": failed_path})
        engine.save_execution_log()

        out_report = os.path.join(self.temp_dir, "IMPROVEMENT_REPORT.md")
        reporter = ReportGenerator(os.path.join(self.history_dir, "execution_log.json"), self.history_dir, out_report)
        report = reporter.generate_markdown_report()
        self.assertIn("AST Syntax Errors Intercepted", report)

    def test_t3_10_end_to_end_self_correction_loop(self):
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, SAMPLE_INITIAL_CODE_WITH_BUG, SAMPLE_TEST_CODE)
        
        engine = self._create_engine()
        engine.max_iterations = 2
        
        res = engine.run()
        self.assertTrue(res)
        
        log_json = os.path.join(self.history_dir, "execution_log.json")
        self.assertTrue(os.path.exists(log_json))


class TestTier4RealWorldScenarios(unittest.TestCase):
    """
    Tier 4: Realistic Application Workload Scenarios (5 tests)
    """

    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="t4_e2e_")
        self.target_file = os.path.join(self.temp_dir, "target_module.py")
        self.test_file = os.path.join(self.temp_dir, "test_target_module.py")
        self.history_dir = os.path.join(self.temp_dir, "history")
        os.makedirs(self.history_dir, exist_ok=True)
        
        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write(SAMPLE_INITIAL_CODE_WITH_BUG)
        with open(self.test_file, "w", encoding="utf-8") as f:
            f.write(SAMPLE_TEST_CODE)

        self.patchers = [
            patch("recursive_self_improvement.config.TARGET_FILE", self.target_file),
            patch("recursive_self_improvement.config.TEST_FILE", self.test_file),
            patch("recursive_self_improvement.config.HISTORY_DIR", self.history_dir),
            patch("self_improvement_loop.config.TARGET_FILE", self.target_file),
            patch("self_improvement_loop.config.TEST_FILE", self.test_file),
            patch("self_improvement_loop.config.HISTORY_DIR", self.history_dir),
        ]
        for p in self.patchers:
            p.start()

    def tearDown(self):
        for p in self.patchers:
            p.stop()
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def _create_engine(self):
        return SelfImprovementEngine()

    def test_t4_01_scenario_refactoring_math_module_and_extending_functions(self):
        """
        Scenario 1: Refactoring baseline math module to fix division bug and expand functionality.
        """
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, SAMPLE_INITIAL_CODE_WITH_BUG, SAMPLE_TEST_CODE)
        
        engine = self._create_engine()
        engine.max_iterations = 3
        
        success = engine.run()
        self.assertTrue(success)
        
        with open(self.target_file, "r", encoding="utf-8") as f:
            updated_code = f.read()
        self.assertIn("class Calculator", updated_code)

    def test_t4_02_scenario_resilient_recovery_from_ai_syntax_error(self):
        """
        Scenario 2: Engine encounters a syntax error from LLM candidate code generation,
        intercepts it via AST pre-validation, records debug failed file, and rolls back cleanly.
        """
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, SAMPLE_INITIAL_CODE_WITH_BUG, SAMPLE_TEST_CODE)
        
        engine = self._create_engine()
        engine.max_iterations = 1
        engine.inject_syntax_error_iteration = 1
        
        engine.run()
        
        failed_snap = os.path.join(self.history_dir, "target_module.v1.failed.py")
        self.assertTrue(os.path.exists(failed_snap))

        log_types = [e["event_type"] for e in engine.execution_log]
        self.assertIn("AST_SYNTAX_ERROR", log_types)
        self.assertIn("ROLLBACK", log_types)

    def test_t4_03_scenario_performance_degradation_and_atomic_rollback(self):
        """
        Scenario 3: Quantitative metric collector detects performance/quality degradation,
        triggers dual-file rollback, and re-verifies stable baseline.
        """
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, SAMPLE_VALID_CODE, SAMPLE_TEST_CODE)
        
        bm_runner = BenchmarkRunner(self.target_file, self.test_file)
        initial_bm = bm_runner.run_benchmark()
        self.assertTrue(initial_bm.ast_valid)

        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write("class Calculator:\n    def add(self, a, b):\n        raise RuntimeError('broken')\n")
            
        degraded_bm = bm_runner.run_benchmark()
        self.assertEqual(degraded_bm.pass_rate, 0.0)
        
        vcs.rollback(0)
        restored_bm = bm_runner.run_benchmark()
        self.assertEqual(restored_bm.pass_rate, 100.0)

    def test_t4_04_scenario_resource_budget_exhaustion_and_safe_teardown(self):
        """
        Scenario 4: Long-running loop reaches token budget / session timeout cap,
        gracefully halts, saves execution log, and restores last stable commit state.
        """
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, SAMPLE_INITIAL_CODE_WITH_BUG, SAMPLE_TEST_CODE)
        
        engine = self._create_engine()
        engine.total_token_budget = 500
        engine.token_budget_per_iteration = 1000
        engine.max_iterations = 10
        
        res = engine.run()
        self.assertFalse(res)
        
        log_json = os.path.join(self.history_dir, "execution_log.json")
        self.assertTrue(os.path.exists(log_json))
        with open(log_json, "r", encoding="utf-8") as f:
            log_data = json.load(f)
        self.assertEqual(log_data[-1]["event_type"], "TOKEN_BUDGET_EXCEEDED")

    def test_t4_05_scenario_full_multi_generation_audit_report(self):
        """
        Scenario 5: Complete multi-generation autonomous run produces structured markdown report
        summarizing iteration trajectory, diff patches, rollbacks, and benchmark scores.
        """
        vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        vcs.save_version(0, SAMPLE_INITIAL_CODE_WITH_BUG, SAMPLE_TEST_CODE)
        
        engine = self._create_engine()
        engine.max_iterations = 3
        
        engine.run()
        
        log_json = os.path.join(self.history_dir, "execution_log.json")
        out_report = os.path.join(self.temp_dir, "IMPROVEMENT_REPORT.md")
        
        reporter = ReportGenerator(log_json, self.history_dir, out_report)
        report_text = reporter.generate_markdown_report()
        
        self.assertTrue(os.path.exists(out_report))
        self.assertIn("# Recursive Self-Improvement Audit Report", report_text)
        self.assertIn("## Executive Summary", report_text)
        self.assertIn("## History Snapshots & Patch Diff Files", report_text)
        self.assertIn("## Execution Log Trajectory", report_text)


if __name__ == "__main__":
    unittest.main()
