import unittest
import os
import shutil
import tempfile

from recursive_self_improvement.runner import TestRunner
from recursive_self_improvement import config


class TestRunnerTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp(prefix="test_runner_")
        self.passing_test_file = os.path.join(self.temp_dir, "test_pass.py")
        with open(self.passing_test_file, "w", encoding="utf-8") as f:
            f.write("import unittest\n\nclass TestPass(unittest.TestCase):\n    def test_ok(self):\n        self.assertTrue(True)\n\nif __name__ == '__main__':\n    unittest.main()\n")

        self.failing_test_file = os.path.join(self.temp_dir, "test_fail.py")
        with open(self.failing_test_file, "w", encoding="utf-8") as f:
            f.write("import unittest\n\nclass TestFail(unittest.TestCase):\n    def test_err(self):\n        self.assertTrue(False)\n\nif __name__ == '__main__':\n    unittest.main()\n")

        self.syntax_error_file = os.path.join(self.temp_dir, "test_syntax.py")
        with open(self.syntax_error_file, "w", encoding="utf-8") as f:
            f.write("class BadSyntax\n    def test_x(self):\n        pass\n")

    def tearDown(self):
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)

    def test_runner_initialization(self):
        runner = TestRunner(self.passing_test_file)
        self.assertEqual(runner.test_file, os.path.abspath(self.passing_test_file))

    def test_run_tests_success(self):
        runner = TestRunner(self.passing_test_file)
        result = runner.run_tests()
        self.assertTrue(result["success"])
        self.assertEqual(result["returncode"], 0)

    def test_run_tests_failure(self):
        runner = TestRunner(self.failing_test_file)
        result = runner.run_tests()
        self.assertFalse(result["success"])
        self.assertNotEqual(result["returncode"], 0)

    def test_run_tests_syntax_error(self):
        runner = TestRunner(self.syntax_error_file)
        result = runner.run_tests()
        self.assertFalse(result["success"])
        self.assertNotEqual(result["returncode"], 0)


if __name__ == '__main__':
    unittest.main()
