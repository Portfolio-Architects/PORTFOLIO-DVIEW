import unittest
try:
    from self_improvement_loop.simulator import MockLLMSimulator, RateLimitError
except ImportError:
    from simulator import MockLLMSimulator, RateLimitError


class TestMockLLMSimulator(unittest.TestCase):
    def setUp(self):
        self.simulator = MockLLMSimulator()
        self.initial_code = (
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        # BUG: Returns subtraction instead of addition\n"
            "        return a - b\n"
        )

    def test_iteration_1_fixes_bug(self):
        improved = self.simulator.get_improved_code(self.initial_code, iteration=1)
        self.assertIn("return a + b", improved)
        self.assertNotIn("return a - b", improved)

    def test_iteration_2_adds_subtract(self):
        fixed_code = (
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        return a + b\n"
        )
        self.simulator.iteration_2_attempts = 1
        improved = self.simulator.get_improved_code(fixed_code, iteration=2)
        self.assertIn("def subtract(self, a, b):", improved)
        self.assertIn("return a - b", improved)

    def test_iteration_3_adds_multiply(self):
        code_with_subtract = (
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        return a + b\n"
            "    def subtract(self, a, b):\n"
            "        return a - b\n"
        )
        improved = self.simulator.get_improved_code(code_with_subtract, iteration=3)
        self.assertIn("def multiply(self, a, b):", improved)
        self.assertIn("return a * b", improved)

    def test_syntax_error_injection(self):
        # Test iteration 1 with syntax error injection
        improved = self.simulator.get_improved_code(self.initial_code, iteration=1, inject_syntax_error=True)
        # The colon in "def add(self, a, b):" should be removed
        self.assertIn("def add(self, a, b)\n", improved)
        self.assertNotIn("def add(self, a, b):\n", improved)

        # Test iteration 2 with syntax error injection
        fixed_code = (
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        return a + b\n"
        )
        self.simulator.iteration_2_attempts = 1
        improved_2 = self.simulator.get_improved_code(fixed_code, iteration=2, inject_syntax_error=True)
        # Should inject syntax error in the first method signature
        self.assertIn("def add(self, a, b)\n", improved_2)

    def test_rate_limit_error_on_first_attempt(self):
        with self.assertRaises(RateLimitError):
            self.simulator.get_improved_code(self.initial_code, iteration=2)

    def test_fallback_other_iterations(self):
        improved = self.simulator.get_improved_code(self.initial_code, iteration=4)
        self.assertEqual(improved, self.initial_code)

        improved_zero = self.simulator.get_improved_code(self.initial_code, iteration=0)
        self.assertEqual(improved_zero, self.initial_code)

    def test_calculate_metrics(self):
        code = (
            "class Calculator:\n"
            "    \"\"\"Docstring\"\"\"\n"
            "    def add(self, a: float, b: float) -> float:\n"
            "        return a + b\n"
        )
        metrics = self.simulator.calculate_metrics(code)
        self.assertEqual(metrics["method_count"], 1)
        self.assertTrue(metrics["ast_valid"])
        self.assertGreater(metrics["quality_score"], 40.0)

    def test_error_feedback_ingestion(self):
        improved = self.simulator.get_improved_code(
            self.initial_code,
            iteration=1,
            error_feedback="SyntaxError: invalid syntax"
        )
        self.assertEqual(self.simulator.last_error_feedback, "SyntaxError: invalid syntax")
        self.assertIsNotNone(self.simulator.last_metrics)

if __name__ == '__main__':
    unittest.main()
