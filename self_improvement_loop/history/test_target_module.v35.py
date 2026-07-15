import unittest
try:
    from self_improvement_loop.target_module import Calculator
except ImportError:
    from target_module import Calculator

class TestCalculator(unittest.TestCase):
    def setUp(self):
        self.calc = Calculator()

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

if __name__ == '__main__':
    unittest.main()

