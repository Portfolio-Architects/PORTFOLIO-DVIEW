import unittest
import os
import shutil
import time
import sys
import importlib

try:
    from self_improvement_loop.engine import SelfImprovementEngine
    from self_improvement_loop import config
except ImportError:
    from engine import SelfImprovementEngine
    import config

CLEAN_TARGET_MODULE_CODE = """import math

class Calculator:
    \"\"\"A simple calculator class.\"\"\"
    def add(self, a: float, b: float) -> float:
        \"\"\"Returns the sum of a and b.\"\"\"
        return a + b

    def subtract(self, a: float, b: float) -> float:
        \"\"\"Returns the difference of a and b.\"\"\"
        return a - b

    def multiply(self, a: float, b: float) -> float:
        \"\"\"Returns the product of a and b.\"\"\"
        return a * b

    def divide(self, a: float, b: float) -> float:
        \"\"\"Returns the quotient of a and b.\"\"\"
        if b == 0:
            raise ZeroDivisionError("division by zero")
        return a / b

    def power(self, a: float, b: float) -> float:
        \"\"\"Returns a raised to the power of b.\"\"\"
        return a ** b

    def sin(self, x: float) -> float:
        \"\"\"Returns the sine of x (in radians).\"\"\"
        return math.sin(x)

    def cos(self, x: float) -> float:
        \"\"\"Returns the cosine of x (in radians).\"\"\"
        return math.cos(x)

    def tan(self, x: float) -> float:
        \"\"\"Returns the tangent of x (in radians).\"\"\"
        return math.tan(x)

    def mean(self, data: list) -> float:
        \"\"\"Returns the arithmetic mean of data.\"\"\"
        if not data:
            raise ValueError("data must not be empty")
        return sum(data) / len(data)

    def median(self, data: list) -> float:
        \"\"\"Returns the median of data.\"\"\"
        if not data:
            raise ValueError("data must not be empty")
        sorted_data = sorted(data)
        n = len(sorted_data)
        if n % 2 == 1:
            return sorted_data[n // 2]
        else:
            return (sorted_data[n // 2 - 1] + sorted_data[n // 2]) / 2.0

    def variance(self, data: list) -> float:
        \"\"\"Returns the sample variance of data.\"\"\"
        if len(data) < 2:
            raise ValueError("variance requires at least two data points")
        m = self.mean(data)
        return sum((x - m) ** 2 for x in data) / (len(data) - 1)

    def matrix_addition(self, A: list, B: list) -> list:
        \"\"\"Returns the sum of two matrices A and B.\"\"\"
        if len(A) != len(B) or len(A[0]) != len(B[0]):
            raise ValueError("Matrices must have the same dimensions")
        return [[A[i][j] + B[i][j] for j in range(len(A[0]))] for i in range(len(A))]

    def matrix_transpose(self, A: list) -> list:
        \"\"\"Returns the transpose of matrix A.\"\"\"
        return [[A[i][j] for i in range(len(A))] for j in range(len(A[0]))]

    def matrix_multiplication(self, A: list, B: list) -> list:
        \"\"\"Returns the product of two matrices A and B.\"\"\"
        if len(A[0]) != len(B):
            raise ValueError("Number of columns in A must equal number of rows in B")
        result = [[0.0 for _ in range(len(B[0]))] for _ in range(len(A))]
        for i in range(len(A)):
            for j in range(len(B[0])):
                for k in range(len(B)):
                    result[i][j] += A[i][k] * B[k][j]
        return result

    def gradient_descent(self, f_prime, x_start: float, learning_rate: float = 0.1, iterations: int = 100) -> float:
        \"\"\"Performs gradient descent optimization.\"\"\"
        x = x_start
        for _ in range(iterations):
            x = x - learning_rate * f_prime(x)
        return x

    def linear_regression(self, x: list, y: list) -> tuple:
        \"\"\"Returns (slope, intercept) for linear regression y = mx + c.\"\"\"
        if len(x) != len(y) or len(x) < 2:
            raise ValueError("x and y must have the same length and at least 2 points")
        x_mean = self.mean(x)
        y_mean = self.mean(y)
        num = sum((x[i] - x_mean) * (y[i] - y_mean) for i in range(len(x)))
        den = sum((x[i] - x_mean) ** 2 for i in range(len(x)))
        if den == 0:
            raise ValueError("Denominator is zero, cannot fit line")
        slope = num / den
        intercept = y_mean - slope * x_mean
        return slope, intercept

    def factorial(self, n: int) -> int:
        \"\"\"Returns the factorial of n.\"\"\"
        if n < 0:
            raise ValueError("factorial not defined for negative numbers")
        result = 1
        for i in range(2, n + 1):
            result *= i
        return result

    def gcd(self, a: int, b: int) -> int:
        \"\"\"Returns the greatest common divisor of a and b.\"\"\"
        while b:
            a, b = b, a % b
        return abs(a)

    def std_dev(self, data: list) -> float:
        \"\"\"Returns the standard deviation of data.\"\"\"
        return math.sqrt(self.variance(data))

    def percentile(self, data: list, p: float) -> float:
        \"\"\"Returns the p-th percentile of data.\"\"\"
        if not data:
            raise ValueError("data must not be empty")
        if not (0 <= p <= 100):
            raise ValueError("percentile must be between 0 and 100")
        sorted_data = sorted(data)
        k = (len(sorted_data) - 1) * (p / 100.0)
        f = math.floor(k)
        c = math.ceil(k)
        if f == c:
            return sorted_data[int(k)]
        d0 = sorted_data[int(f)] * (c - k)
        d1 = sorted_data[int(c)] * (k - f)
        return d0 + d1

    def z_score(self, data: list) -> list:
        \"\"\"Returns Z-scores for the data.\"\"\"
        if len(data) < 2:
            raise ValueError("z_score requires at least two data points")
        m = self.mean(data)
        sd = self.std_dev(data)
        if sd == 0:
            raise ValueError("standard deviation is zero, cannot compute Z-scores")
        return [(x - m) / sd for x in data]
"""

class TestSelfImprovementEngine(unittest.TestCase):
    def setUp(self):
        # Force uncache target_module and invalidate caches
        sys.modules.pop("target_module", None)
        sys.modules.pop("self_improvement_loop.target_module", None)
        importlib.invalidate_caches()

        # Backup target_module.py
        self.target_backup = config.TARGET_FILE + ".backup"
        if os.path.exists(config.TARGET_FILE):
            shutil.copyfile(config.TARGET_FILE, self.target_backup)

        # Backup test_target_module.py
        self.test_backup = config.TEST_FILE + ".backup"
        if os.path.exists(config.TEST_FILE):
            shutil.copyfile(config.TEST_FILE, self.test_backup)

        # Write initial Calculator code with the bug to target_module.py
        initial_code = (
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        # BUG: Returns subtraction instead of addition\n"
            "        return a - b\n"
        )
        with open(config.TARGET_FILE, "w", encoding="utf-8", errors="replace") as f:
            f.write(initial_code)

        # Use a temporary test history directory to avoid polluting actual run history
        self.original_history_dir = config.HISTORY_DIR
        self.test_history_dir = os.path.join(config.BASE_DIR, f"test_history_{self._testMethodName}")
        config.HISTORY_DIR = self.test_history_dir
        if os.path.exists(self.test_history_dir):
            shutil.rmtree(self.test_history_dir)

    def tearDown(self):
        # Restore target_module.py on disk to clean standard implementation
        with open(config.TARGET_FILE, "w", encoding="utf-8", errors="replace") as f:
            f.write(CLEAN_TARGET_MODULE_CODE)

        if os.path.exists(self.target_backup):
            os.remove(self.target_backup)

        # Restore test_target_module.py
        if os.path.exists(self.test_backup):
            shutil.copyfile(self.test_backup, config.TEST_FILE)
            os.remove(self.test_backup)

        # Clean up test history
        if os.path.exists(self.test_history_dir):
            shutil.rmtree(self.test_history_dir)

        # Restore config history dir path
        config.HISTORY_DIR = self.original_history_dir

        # Force uncache target_module and invalidate caches
        sys.modules.pop("target_module", None)
        sys.modules.pop("self_improvement_loop.target_module", None)
        importlib.invalidate_caches()

    def test_engine_initialization(self):
        engine = SelfImprovementEngine()
        self.assertEqual(engine.target_file, config.TARGET_FILE)
        self.assertEqual(engine.test_file, config.TEST_FILE)

    def test_engine_api_limit(self):
        engine = SelfImprovementEngine()
        # Set small API limit
        engine.max_api_requests = 2
        engine.max_iterations = 5

        # Run engine
        success = engine.run()
        
        # Verify that the API_LIMIT event is recorded
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("API_LIMIT", event_types)
        self.assertFalse(success)

    def test_engine_timeout(self):
        engine = SelfImprovementEngine()
        # Set negative/extremely small timeout
        engine.timeout_seconds = -1.0

        # Run engine
        success = engine.run()
        
        # Verify that the TIMEOUT event is recorded
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("TIMEOUT", event_types)
        self.assertFalse(success)

    def test_engine_session_timeout(self):
        engine = SelfImprovementEngine()
        # Set negative/extremely small session timeout
        engine.timeout_seconds = 100.0
        engine.session_timeout_seconds = -1.0

        # Run engine
        success = engine.run()
        
        # Verify that the SESSION_TIMEOUT event is recorded
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
        
        # Test dual file saving
        engine.vcs.save_version(99, "target version 99", "test version 99")
        
        # Restore/rollback to 99
        engine.vcs.rollback(99)
        
        # Verify both files are updated
        with open(engine.target_file, "r", encoding="utf-8", errors="replace") as f:
            target_content = f.read()
        with open(engine.test_file, "r", encoding="utf-8", errors="replace") as f:
            test_content = f.read()
            
        self.assertEqual(target_content, "target version 99")
        self.assertEqual(test_content, "test version 99")

    def test_stuck_detection_by_hash(self):
        # Write valid calculator code so version 0 passes tests
        valid_code = (
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        return a + b\n"
        )
        with open(config.TARGET_FILE, "w", encoding="utf-8", errors="replace") as f:
            f.write(valid_code)

        engine = SelfImprovementEngine()
        engine.max_iterations = 3
        # Configure simulator to simulate stuck by code hash
        engine.simulator.simulate_stuck_hash = True
        
        success = engine.run()
        
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("STUCK_DETECTED", event_types)
        # Should complete successfully once loop is broken
        self.assertTrue(success)

    def test_stuck_detection_by_repeating_error(self):
        # Write valid calculator code so version 0 passes tests
        valid_code = (
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        return a + b\n"
        )
        with open(config.TARGET_FILE, "w", encoding="utf-8", errors="replace") as f:
            f.write(valid_code)

        engine = SelfImprovementEngine()
        engine.max_iterations = 3
        # Configure simulator to simulate stuck by error
        engine.simulator.simulate_stuck_error = True
        
        success = engine.run()
        
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("STUCK_DETECTED", event_types)
        # Should complete successfully once loop is broken
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

if __name__ == '__main__':
    unittest.main()

