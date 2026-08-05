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

# Continuous optimization v8

# Continuous optimization v9

# Continuous optimization v10

# Continuous optimization v11

# Continuous optimization v12

# Continuous optimization v13

# Continuous optimization v14
