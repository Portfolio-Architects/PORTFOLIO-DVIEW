import os
from pathlib import Path

# Absolute path of the self_improvement_loop directory
BASE_DIR = str(Path(__file__).parent.resolve())

# Paths inside self_improvement_loop
TARGET_FILE = str(Path(BASE_DIR) / "target_module.py")
TEST_FILE = str(Path(BASE_DIR) / "test_target_module.py")
HISTORY_DIR = str(Path(BASE_DIR) / "history")

# Stop flag and control files
STOP_FLAG_FILE = str(Path(BASE_DIR) / "stop.flag")
COMMAND_FILE = str(Path(BASE_DIR) / "command.txt")

# Loop settings
MAX_ITERATIONS = 1000  # Set high for continuous execution
TIMEOUT_SECONDS = 18000  # Increase to match the 5-hour session timeout
SESSION_TIMEOUT_SECONDS = 18000  # 5-hour timeout (18000 seconds)
MAX_API_REQUESTS = 500  # Elevated for continuous background run
TOTAL_TOKEN_BUDGET = 1000000  # Elevated for continuous background run
TOKEN_BUDGET_PER_ITERATION = 5000
