import os
import json
import tempfile
import shutil
import unittest
from pathlib import Path

try:
    from recursive_self_improvement.reporter import ReportGenerator
except ImportError:
    try:
        from self_improvement_loop.reporter import ReportGenerator
    except ImportError:
        from reporter import ReportGenerator


class TestReportGenerator(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="test_reporter_")
        self.history_dir = os.path.join(self.temp_dir, "history")
        os.makedirs(self.history_dir, exist_ok=True)
        self.log_file = os.path.join(self.history_dir, "execution_log.json")
        self.output_file = os.path.join(self.temp_dir, "IMPROVEMENT_REPORT.md")

    def tearDown(self):
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def test_report_formatting_and_sections(self):
        sample_log = [
            {
                "timestamp": "2026-08-04 12:00:00",
                "event_type": "START",
                "message": "Self-improvement loop started.",
                "details": {}
            },
            {
                "timestamp": "2026-08-04 12:00:01",
                "event_type": "BASELINE_METRICS",
                "message": "Baseline metrics calculated",
                "details": {
                    "pass_rate": 0.0,
                    "accuracy_score": 0.0,
                    "execution_time_sec": 0.15,
                    "peak_memory_mb": 0.04
                }
            },
            {
                "timestamp": "2026-08-04 12:00:02",
                "event_type": "ITERATION_START",
                "message": "Starting iteration 1 (Loop run 1).",
                "details": {}
            },
            {
                "timestamp": "2026-08-04 12:00:03",
                "event_type": "SUCCESS",
                "message": "Iteration 1 succeeded.",
                "details": {
                    "iteration": 1,
                    "diff": "--- v0\n+++ v1\n+def add(a, b): return a + b\n",
                    "metrics": {
                        "pass_rate": 100.0,
                        "accuracy_score": 1.0,
                        "execution_time_sec": 0.02,
                        "peak_memory_mb": 0.01
                    }
                }
            },
            {
                "timestamp": "2026-08-04 12:00:04",
                "event_type": "FINISHED",
                "message": "Reached max iterations.",
                "details": {}
            }
        ]
        with open(self.log_file, "w", encoding="utf-8") as f:
            json.dump(sample_log, f)

        reporter = ReportGenerator(self.log_file, self.history_dir, self.output_file)
        report = reporter.generate_markdown_report()

        self.assertIn("# Recursive Self-Improvement Audit Report", report)
        self.assertIn("## Executive Summary", report)
        self.assertIn("## Quantitative Performance Delta Table", report)
        self.assertIn("## Strategy Rationale", report)
        self.assertIn("## History Snapshots & Patch Diff Files", report)
        self.assertIn("## Execution Log Trajectory", report)
        self.assertIn("## Safety Audit Attestation", report)
        self.assertIn("**Total Iterations Attempted**: 1", report)
        self.assertIn("**Successful Iterations**: 1", report)

    def test_trajectory_table_rendering(self):
        sample_log = [
            {
                "timestamp": "2026-08-04 12:00:00",
                "event_type": "BASELINE_METRICS",
                "message": "Baseline",
                "details": {
                    "pass_rate": 0.0,
                    "accuracy_score": 0.0,
                    "execution_time_sec": 0.10,
                    "peak_memory_mb": 0.05
                }
            },
            {
                "timestamp": "2026-08-04 12:00:01",
                "event_type": "SUCCESS",
                "message": "Iter 1 success",
                "details": {
                    "iteration": 1,
                    "metrics": {
                        "pass_rate": 100.0,
                        "accuracy_score": 0.95,
                        "execution_time_sec": 0.03,
                        "peak_memory_mb": 0.02
                    }
                }
            }
        ]
        with open(self.log_file, "w", encoding="utf-8") as f:
            json.dump(sample_log, f)

        v1_path = os.path.join(self.history_dir, "target_module.v1.py")
        with open(v1_path, "w", encoding="utf-8") as f:
            f.write("class Calculator:\n    def add(self, a, b):\n        return a + b\n")

        reporter = ReportGenerator(self.log_file, self.history_dir, self.output_file)
        report = reporter.generate_markdown_report()

        self.assertIn("| Iteration | Event | Quality Score | LOC | Methods | Pass Rate (%) | Latency (s) | Memory (MB) | Accuracy |", report)
        self.assertIn("| 1 | SUCCESS |", report)
        self.assertIn("100.0%", report)

    def test_report_generator_quantitative_performance_delta_table(self):
        sample_log = [
            {
                "timestamp": "2026-08-04 12:00:00",
                "event_type": "BASELINE_METRICS",
                "message": "Baseline metrics",
                "details": {
                    "pass_rate": 0.0,
                    "accuracy_score": 0.0,
                    "execution_time_sec": 0.10,
                    "peak_memory_mb": 10.0
                }
            },
            {
                "timestamp": "2026-08-04 12:00:05",
                "event_type": "SUCCESS",
                "message": "Accepted version 1",
                "details": {
                    "iteration": 1,
                    "metrics": {
                        "pass_rate": 100.0,
                        "accuracy_score": 1.0,
                        "execution_time_sec": 0.05,
                        "peak_memory_mb": 5.0
                    }
                }
            }
        ]
        with open(self.log_file, "w", encoding="utf-8") as f:
            json.dump(sample_log, f)

        reporter = ReportGenerator(self.log_file, self.history_dir, self.output_file)
        report = reporter.generate_markdown_report()

        self.assertIn("## Quantitative Performance Delta Table", report)
        self.assertIn("Execution Time (sec)", report)
        self.assertIn("Pass Rate (%)", report)
        self.assertIn("Accuracy Score", report)
        self.assertIn("Peak Memory (MB)", report)

    def test_report_generator_strategy_rationale(self):
        sample_log = [
            {
                "timestamp": "2026-08-04 12:00:00",
                "event_type": "STRATEGY_FEEDBACK",
                "message": "Feedback issued",
                "details": {}
            }
        ]
        with open(self.log_file, "w", encoding="utf-8") as f:
            json.dump(sample_log, f)

        reporter = ReportGenerator(self.log_file, self.history_dir, self.output_file)
        report = reporter.generate_markdown_report()

        self.assertIn("## Strategy Rationale", report)
        self.assertIn("STRATEGY_FEEDBACK", report)

    def test_report_generator_safety_audit_attestation(self):
        sample_log = [
            {
                "timestamp": "2026-08-04 12:00:00",
                "event_type": "AST_SYNTAX_ERROR",
                "message": "Syntax error intercepted",
                "details": {}
            }
        ]
        with open(self.log_file, "w", encoding="utf-8") as f:
            json.dump(sample_log, f)

        reporter = ReportGenerator(self.log_file, self.history_dir, self.output_file)
        report = reporter.generate_markdown_report()

        self.assertIn("## Safety Audit Attestation", report)
        self.assertIn("AST Pre-Validation Interceptions", report)

    def test_diff_section_extraction(self):
        patch_file = os.path.join(self.history_dir, "patch_v1.diff")
        with open(patch_file, "w", encoding="utf-8") as f:
            f.write("--- target_module.v0.py\n+++ target_module.v1.py\n@@ -1,3 +1,3 @@\n-return a - b\n+return a + b\n")

        reporter = ReportGenerator(self.log_file, self.history_dir, self.output_file)
        report = reporter.generate_markdown_report()

        self.assertIn("patch_v1.diff", report)
        self.assertIn("return a + b", report)

    def test_file_output_creation(self):
        reporter = ReportGenerator(self.log_file, self.history_dir, self.output_file)
        reporter.generate_markdown_report()

        self.assertTrue(os.path.exists(self.output_file))
        history_report = os.path.join(self.history_dir, "IMPROVEMENT_REPORT.md")
        self.assertTrue(os.path.exists(history_report))

    def test_empty_or_corrupt_log_handling(self):
        with open(self.log_file, "w", encoding="utf-8") as f:
            f.write("invalid json {{{")

        reporter = ReportGenerator(self.log_file, self.history_dir, self.output_file)
        report = reporter.generate_markdown_report()

        self.assertIn("# Recursive Self-Improvement Audit Report", report)
        self.assertIn("No execution events recorded.", report)
        self.assertTrue(os.path.exists(self.output_file))


if __name__ == "__main__":
    unittest.main()
