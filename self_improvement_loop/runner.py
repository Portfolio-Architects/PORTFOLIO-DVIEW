import sys
import os
import subprocess
from pathlib import Path

class TestRunner:
    def __init__(self, test_file: str):
        """
        Stores the test file path.
        """
        self.test_file = str(Path(test_file).resolve())

    def run_tests(self) -> dict:
        """
        Executes the test file via subprocess.run using the Python interpreter in .venv
        if available, falling back to sys.executable.
        Captures stdout/stderr and returns {"success": bool, "stdout": str, "stderr": str, "returncode": int}.
        """
        # Determine the Python interpreter in the .venv directory
        # The workspace root is the parent directory of this file's folder (self_improvement_loop)
        base_dir = Path(__file__).parent.parent.resolve()
        venv_dir = base_dir / ".venv"
        
        # Windows venv path
        venv_python_win = venv_dir / "Scripts" / "python.exe"
        # Unix/macOS venv path
        venv_python_unix = venv_dir / "bin" / "python"
        
        if venv_python_win.exists():
            python_executable = str(venv_python_win)
        elif venv_python_unix.exists():
            python_executable = str(venv_python_unix)
        else:
            python_executable = sys.executable

        try:
            # Execute the test script
            result = subprocess.run(
                [python_executable, self.test_file],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=60
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode
            }
        except subprocess.TimeoutExpired as e:
            return {
                "success": False,
                "stdout": e.stdout if e.stdout else "",
                "stderr": f"TimeoutExpired: {str(e)}\n" + (e.stderr if e.stderr else ""),
                "returncode": -1
            }
        except Exception as e:
            return {
                "success": False,
                "stdout": "",
                "stderr": f"Error running tests: {str(e)}",
                "returncode": -1
            }

if __name__ == '__main__':
    # When run directly, we can execute the test runner using the configured TEST_FILE
    try:
        from self_improvement_loop.config import TEST_FILE
    except ImportError:
        from config import TEST_FILE

    runner = TestRunner(TEST_FILE)
    res = runner.run_tests()
    print("--- Test Run Results ---")
    print(f"Success: {res['success']}")
    print(f"Return Code: {res['returncode']}")
    print(f"Stdout:\n{res['stdout']}")
    print(f"Stderr:\n{res['stderr']}")
