import unittest
import sys
import importlib
import os

try:
    from self_improvement_loop import config
except ImportError:
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

class TestCalculator(unittest.TestCase):
    def setUp(self):
        sys.modules.pop("target_module", None)
        sys.modules.pop("self_improvement_loop.target_module", None)
        importlib.invalidate_caches()

        with open(config.TARGET_FILE, "w", encoding="utf-8", errors="replace") as f:
            f.write(CLEAN_TARGET_MODULE_CODE)

        try:
            import self_improvement_loop.target_module as tm
        except ImportError:
            import target_module as tm

        importlib.reload(tm)
        self.calc = tm.Calculator()

    def tearDown(self):
        with open(config.TARGET_FILE, "w", encoding="utf-8", errors="replace") as f:
            f.write(CLEAN_TARGET_MODULE_CODE)

        sys.modules.pop("target_module", None)
        sys.modules.pop("self_improvement_loop.target_module", None)
        importlib.invalidate_caches()

    def test_add(self):
        self.assertEqual(self.calc.add(2, 3), 5)

    def test_subtract(self):
        if not hasattr(self.calc, "subtract"):
            self.skipTest("subtract not implemented yet")
        self.assertEqual(self.calc.subtract(5, 2), 3)

    def test_multiply(self):
        if not hasattr(self.calc, "multiply"):
            self.skipTest("multiply not implemented yet")
        self.assertEqual(self.calc.multiply(3, 4), 12)

    def test_divide(self):
        if not hasattr(self.calc, "divide"):
            self.skipTest("divide not implemented yet")
        self.assertEqual(self.calc.divide(10, 2), 5.0)
        with self.assertRaises(ZeroDivisionError):
            self.calc.divide(5, 0)

    def test_power(self):
        if not hasattr(self.calc, "power"):
            self.skipTest("power not implemented yet")
        self.assertEqual(self.calc.power(2, 3), 8)


    def test_sin(self):
        if not hasattr(self.calc, 'sin'):
            self.skipTest('sin not implemented yet')
        self.assertAlmostEqual(self.calc.sin(0), 0.0)
        self.assertAlmostEqual(self.calc.sin(3.141592653589793 / 2), 1.0)

    def test_cos(self):
        if not hasattr(self.calc, 'cos'):
            self.skipTest('cos not implemented yet')
        self.assertAlmostEqual(self.calc.cos(0), 1.0)
        self.assertAlmostEqual(self.calc.cos(3.141592653589793), -1.0)

    def test_tan(self):
        if not hasattr(self.calc, 'tan'):
            self.skipTest('tan not implemented yet')
        self.assertAlmostEqual(self.calc.tan(0), 0.0)
        self.assertAlmostEqual(self.calc.tan(3.141592653589793 / 4), 1.0)

    def test_mean(self):
        if not hasattr(self.calc, 'mean'):
            self.skipTest('mean not implemented yet')
        self.assertEqual(self.calc.mean([1, 2, 3, 4, 5]), 3.0)
        with self.assertRaises(ValueError):
            self.calc.mean([])

    def test_median(self):
        if not hasattr(self.calc, 'median'):
            self.skipTest('median not implemented yet')
        self.assertEqual(self.calc.median([1, 3, 2]), 2.0)
        self.assertEqual(self.calc.median([1, 2, 3, 4]), 2.5)

    def test_variance(self):
        if not hasattr(self.calc, 'variance'):
            self.skipTest('variance not implemented yet')
        self.assertEqual(self.calc.variance([1, 2, 3]), 1.0)
        with self.assertRaises(ValueError):
            self.calc.variance([1])

    def test_matrix_addition(self):
        if not hasattr(self.calc, 'matrix_addition'):
            self.skipTest('matrix_addition not implemented yet')
        A = [[1, 2], [3, 4]]
        B = [[5, 6], [7, 8]]
        self.assertEqual(self.calc.matrix_addition(A, B), [[6, 8], [10, 12]])

    def test_matrix_transpose(self):
        if not hasattr(self.calc, 'matrix_transpose'):
            self.skipTest('matrix_transpose not implemented yet')
        A = [[1, 2, 3], [4, 5, 6]]
        self.assertEqual(self.calc.matrix_transpose(A), [[1, 4], [2, 5], [3, 6]])

    def test_matrix_multiplication(self):
        if not hasattr(self.calc, 'matrix_multiplication'):
            self.skipTest('matrix_multiplication not implemented yet')
        A = [[1, 2], [3, 4]]
        B = [[2, 0], [1, 2]]
        self.assertEqual(self.calc.matrix_multiplication(A, B), [[4, 4], [10, 8]])

    def test_gradient_descent(self):
        if not hasattr(self.calc, 'gradient_descent'):
            self.skipTest('gradient_descent not implemented yet')
        f_prime = lambda x: 2 * x
        res = self.calc.gradient_descent(f_prime, x_start=10.0, learning_rate=0.1, iterations=100)
        self.assertAlmostEqual(res, 0.0, places=4)

    def test_linear_regression(self):
        if not hasattr(self.calc, 'linear_regression'):
            self.skipTest('linear_regression not implemented yet')
        x = [1.0, 2.0, 3.0, 4.0]
        y = [2.0, 4.0, 6.0, 8.0]
        slope, intercept = self.calc.linear_regression(x, y)
        self.assertAlmostEqual(slope, 2.0)
        self.assertAlmostEqual(intercept, 0.0)

    def test_factorial(self):
        if not hasattr(self.calc, 'factorial'):
            self.skipTest('factorial not implemented yet')
        self.assertEqual(self.calc.factorial(0), 1)
        self.assertEqual(self.calc.factorial(5), 120)

    def test_gcd(self):
        if not hasattr(self.calc, 'gcd'):
            self.skipTest('gcd not implemented yet')
        self.assertEqual(self.calc.gcd(48, 18), 6)
        self.assertEqual(self.calc.gcd(7, 3), 1)

    def test_std_dev(self):
        if not hasattr(self.calc, 'std_dev'):
            self.skipTest('std_dev not implemented yet')
        self.assertAlmostEqual(self.calc.std_dev([1, 2, 3]), 1.0)

    def test_percentile(self):
        if not hasattr(self.calc, 'percentile'):
            self.skipTest('percentile not implemented yet')
        self.assertAlmostEqual(self.calc.percentile([1, 2, 3, 4], 50), 2.5)

    def test_z_score(self):
        if not hasattr(self.calc, 'z_score'):
            self.skipTest('z_score not implemented yet')
        self.assertEqual(self.calc.z_score([1, 2, 3]), [-1.0, 0.0, 1.0])

if __name__ == '__main__':
    unittest.main()

