import unittest
import os
import shutil
import tempfile
import time
import tracemalloc

try:
    from recursive_self_improvement.evaluator import BenchmarkRunner, BenchmarkMetrics
    from recursive_self_improvement import config
except ImportError:
    from evaluator import BenchmarkRunner, BenchmarkMetrics
    import config


class TestEvaluator(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="test_evaluator_")
        self.target_file = os.path.join(self.temp_dir, "target_module.py")
        self.test_file = os.path.join(self.temp_dir, "test_target_module.py")

        target_code = (
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        return a + b\n"
        )
        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write(target_code)

        test_code = (
            "import unittest\n"
            "import sys\n"
            "sys.path.insert(0, r'" + self.temp_dir + "')\n"
            "import target_module\n\n"
            "class TestCalc(unittest.TestCase):\n"
            "    def test_add(self):\n"
            "        calc = target_module.Calculator()\n"
            "        self.assertEqual(calc.add(2, 3), 5)\n\n"
            "if __name__ == '__main__':\n"
            "    unittest.main()\n"
        )
        with open(self.test_file, "w", encoding="utf-8") as f:
            f.write(test_code)

    def tearDown(self):
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_benchmark_metrics_calculation(self):
        runner = BenchmarkRunner(self.target_file, self.test_file)
        metrics = runner.run_benchmark()

        self.assertIsInstance(metrics, BenchmarkMetrics)
        self.assertTrue(metrics.ast_valid)
        self.assertEqual(metrics.pass_rate, 100.0)
        self.assertEqual(metrics.passed_tests, 1)
        self.assertEqual(metrics.failed_tests, 0)
        self.assertEqual(metrics.total_tests, 1)
        self.assertGreater(metrics.execution_time_sec, 0.0)
        self.assertGreaterEqual(metrics.peak_memory_mb, 0.0)
        self.assertGreaterEqual(metrics.accuracy_score, 0.0)
        self.assertLessEqual(metrics.accuracy_score, 1.0)
        self.assertEqual(metrics.error_message, "")

    def test_benchmark_syntax_error_handling(self):
        bad_target = os.path.join(self.temp_dir, "bad_target.py")
        with open(bad_target, "w", encoding="utf-8") as f:
            f.write("class BadSyntax:\n    def add(self, a, b)\n        return a + b\n")

        runner = BenchmarkRunner(bad_target, self.test_file)
        metrics = runner.run_benchmark()

        self.assertFalse(metrics.ast_valid)
        self.assertEqual(metrics.pass_rate, 0.0)
        self.assertEqual(metrics.passed_tests, 0)
        self.assertEqual(metrics.failed_tests, 1)
        self.assertEqual(metrics.accuracy_score, 0.0)
        self.assertIn("SyntaxError", metrics.error_message)

    def test_benchmark_failed_tests_handling(self):
        failing_test = os.path.join(self.temp_dir, "test_fail.py")
        fail_code = (
            "import unittest\n"
            "class TestFail(unittest.TestCase):\n"
            "    def test_1(self):\n"
            "        self.assertTrue(True)\n"
            "    def test_2(self):\n"
            "        self.assertTrue(False)\n"
            "if __name__ == '__main__':\n"
            "    unittest.main()\n"
        )
        with open(failing_test, "w", encoding="utf-8") as f:
            f.write(fail_code)

        runner = BenchmarkRunner(self.target_file, failing_test)
        metrics = runner.run_benchmark()

        self.assertTrue(metrics.ast_valid)
        self.assertEqual(metrics.total_tests, 2)
        self.assertEqual(metrics.passed_tests, 0)
        self.assertEqual(metrics.failed_tests, 2)
        self.assertEqual(metrics.pass_rate, 0.0)
        self.assertEqual(metrics.accuracy_score, 0.0)


    def test_accuracy_score_bounds(self):
        runner = BenchmarkRunner(self.target_file, self.test_file)
        score_100 = runner._evaluate_accuracy(100.0)
        score_0 = runner._evaluate_accuracy(0.0)
        self.assertGreaterEqual(score_100, 0.0)
        self.assertLessEqual(score_100, 1.0)
        self.assertEqual(score_0, 0.0)


if __name__ == '__main__':
    unittest.main()
