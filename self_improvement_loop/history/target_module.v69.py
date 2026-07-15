import math

class Calculator:
    """A simple calculator class."""
    def add(self, a: float, b: float) -> float:
        """Returns the sum of a and b."""
        return a + b
    def subtract(self, a: float, b: float) -> float:
        """Returns the difference of a and b."""
        return a - b
    def multiply(self, a: float, b: float) -> float:
        """Returns the product of a and b."""
        return a * b
    def divide(self, a: float, b: float) -> float:
        """Returns the quotient of a and b."""
        if b == 0:
            raise ZeroDivisionError("division by zero")
        return a / b
    def power(self, a: float, b: float) -> float:
        """Returns a raised to the power of b."""
        return a ** b
    def sin(self, x: float) -> float:
        """Returns the sine of x (in radians)."""
        return math.sin(x)
    def cos(self, x: float) -> float:
        """Returns the cosine of x (in radians)."""
        return math.cos(x)
    def tan(self, x: float) -> float:
        """Returns the tangent of x (in radians)."""
        return math.tan(x)
    def mean(self, data: list) -> float:
        """Returns the arithmetic mean of data."""
        if not data:
            raise ValueError("data must not be empty")
        return sum(data) / len(data)
    def median(self, data: list) -> float:
        """Returns the median of data."""
        if not data:
            raise ValueError("data must not be empty")
        sorted_data = sorted(data)
        n = len(sorted_data)
        if n % 2 == 1:
            return sorted_data[n // 2]
        else:
            return (sorted_data[n // 2 - 1] + sorted_data[n // 2]) / 2.0
    def variance(self, data: list) -> float:
        """Returns the sample variance of data."""
        if len(data) < 2:
            raise ValueError("variance requires at least two data points")
        m = self.mean(data)
        return sum((x - m) ** 2 for x in data) / (len(data) - 1)
    def matrix_addition(self, A: list, B: list) -> list:
        """Returns the sum of two matrices A and B."""
        if len(A) != len(B) or len(A[0]) != len(B[0]):
            raise ValueError("Matrices must have the same dimensions")
        return [[A[i][j] + B[i][j] for j in range(len(A[0]))] for i in range(len(A))]
    def matrix_transpose(self, A: list) -> list:
        """Returns the transpose of matrix A."""
        return [[A[i][j] for i in range(len(A))] for j in range(len(A[0]))]
    def matrix_multiplication(self, A: list, B: list) -> list:
        """Returns the product of two matrices A and B."""
        if len(A[0]) != len(B):
            raise ValueError("Number of columns in A must equal number of rows in B")
        result = [[0.0 for _ in range(len(B[0]))] for _ in range(len(A))]
        for i in range(len(A)):
            for j in range(len(B[0])):
                for k in range(len(B)):
                    result[i][j] += A[i][k] * B[k][j]
        return result
    def gradient_descent(self, f_prime, x_start: float, learning_rate: float = 0.1, iterations: int = 100) -> float:
        """Performs gradient descent optimization."""
        x = x_start
        for _ in range(iterations):
            x = x - learning_rate * f_prime(x)
        return x
    def linear_regression(self, x: list, y: list) -> tuple:
        """Returns (slope, intercept) for linear regression y = mx + c."""
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
        """Returns the factorial of n."""
        if n < 0:
            raise ValueError("factorial not defined for negative numbers")
        result = 1
        for i in range(2, n + 1):
            result *= i
        return result
    def gcd(self, a: int, b: int) -> int:
        """Returns the greatest common divisor of a and b."""
        while b:
            a, b = b, a % b
        return abs(a)
    def std_dev(self, data: list) -> float:
        """Returns the standard deviation of data."""
        return math.sqrt(self.variance(data))
    def percentile(self, data: list, p: float) -> float:
        """Returns the p-th percentile of data."""
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
        """Returns Z-scores for the data."""
        if len(data) < 2:
            raise ValueError("z_score requires at least two data points")
        m = self.mean(data)
        sd = self.std_dev(data)
        if sd == 0:
            raise ValueError("standard deviation is zero, cannot compute Z-scores")
        return [(x - m) / sd for x in data]

# Continuous optimization v8

# Continuous optimization v9

# Continuous optimization v10

# Continuous optimization v11

# Continuous optimization v12

# Continuous optimization v13

# Continuous optimization v14

# Continuous optimization v15

# Continuous optimization v69
