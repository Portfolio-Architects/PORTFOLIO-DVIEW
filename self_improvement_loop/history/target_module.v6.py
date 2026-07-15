class Calculator:
    """A simple calculator class."""
    def add(self, a, b):
        """Returns the sum of a and b."""
        # BUG: Returns subtraction instead of addition
        return a + b
    def subtract(self, a, b):
        """Returns the difference of a and b."""
        return a - b
    def multiply(self, a, b):
        """Returns the product of a and b."""
        return a * b
    def divide(self, a, b):
        """Returns the quotient of a and b."""
        if b == 0:
            raise ZeroDivisionError("division by zero")
        return a / b
    def power(self, a, b):
        """Returns a raised to the power of b."""
        return a ** b
