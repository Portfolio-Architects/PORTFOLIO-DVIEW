import os
from pathlib import Path

# Absolute path of the recursive_self_improvement directory
BASE_DIR = str(Path(__file__).parent.resolve())

# Paths inside recursive_self_improvement
TARGET_FILE = str(Path(BASE_DIR) / "target_module.py")
TEST_FILE = str(Path(BASE_DIR) / "test_target_module.py")
HISTORY_DIR = str(Path(BASE_DIR) / "history")

# Stop flag and control files
STOP_FLAG_FILE = str(Path(BASE_DIR) / "stop.flag")
COMMAND_FILE = str(Path(BASE_DIR) / "command.txt")

# Loop settings
MAX_ITERATIONS = 75  # Loop iteration limit
TIMEOUT_SECONDS = 18000  # Iteration timeout in seconds
SESSION_TIMEOUT_SECONDS = 18000  # Session runtime timeout (5 hours)
MAX_API_REQUESTS = 500  # API request budget limit
TOTAL_TOKEN_BUDGET = 1000000  # Total session token budget limit
TOKEN_BUDGET_PER_ITERATION = 5000  # Token budget check limit per iteration
INJECT_SYNTAX_ERROR_ITERATION = 4  # Injection test iteration target

# Performance degradation thresholds
LATENCY_DEGRADATION_THRESHOLD = 0.15
MEMORY_DEGRADATION_THRESHOLD = 0.20
ACCURACY_DEGRADATION_THRESHOLD = 0.01

# Legacy aliases for backwards compatibility
LATENCY_REGRESSION_THRESHOLD = LATENCY_DEGRADATION_THRESHOLD
MEMORY_REGRESSION_THRESHOLD = MEMORY_DEGRADATION_THRESHOLD


