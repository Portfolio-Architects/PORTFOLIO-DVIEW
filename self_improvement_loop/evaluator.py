import os
import ast
import time
import subprocess
import tracemalloc
from dataclasses import dataclass
from pathlib import Path

@dataclass
class BenchmarkMetrics:
    pass_rate: float
    passed_tests: int
    failed_tests: int
    total_tests: int
    execution_time_sec: float
    peak_memory_mb: float
    accuracy_score: float
    ast_valid: bool
    error_message: str

class BenchmarkRunner:
    def __init__(self, target_file: str, test_file: str):
        self.target_file = str(Path(target_file).resolve())
        self.test_file = str(Path(test_file).resolve())

    def run_benchmark(self) -> BenchmarkMetrics:
        start_time = time.time()
        tracemalloc.start()
        
        ast_valid = True
        error_message = ""
        
        # 1. AST Validation on target file
        try:
            if os.path.exists(self.target_file):
                with open(self.target_file, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
                ast.parse(content)
            else:
                ast_valid = False
                error_message = f"Target file not found: {self.target_file}"
        except SyntaxError as se:
            ast_valid = False
            error_message = f"SyntaxError: {se.msg} at line {se.lineno}"
        except Exception as e:
            ast_valid = False
            error_message = str(e)

        if not ast_valid:
            exec_time = time.time() - start_time
            _, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            return BenchmarkMetrics(
                pass_rate=0.0,
                passed_tests=0,
                failed_tests=1,
                total_tests=1,
                execution_time_sec=round(exec_time, 4),
                peak_memory_mb=round(peak / (1024 * 1024), 4),
                accuracy_score=0.0,
                ast_valid=False,
                error_message=error_message
            )

        # 2. Subprocess Execution of Tests
        import sys
        base_dir = Path(__file__).parent.parent.resolve()
        venv_dir = base_dir / ".venv"
        venv_python_win = venv_dir / "Scripts" / "python.exe"
        venv_python_unix = venv_dir / "bin" / "python"
        
        if venv_python_win.exists():
            python_executable = str(venv_python_win)
        elif venv_python_unix.exists():
            python_executable = str(venv_python_unix)
        else:
            python_executable = sys.executable

        try:
            res = subprocess.run(
                [python_executable, self.test_file],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=60
            )
            exec_time = time.time() - start_time
            _, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()

            # Parse test counts from unittest output if possible
            stdout_stderr = res.stdout + "\n" + res.stderr
            passed_tests = 0
            failed_tests = 0
            total_tests = 0

            import re
            match = re.search(r"Ran (\d+) test", stdout_stderr)
            if match:
                total_tests = int(match.group(1))
            else:
                total_tests = 1 if res.returncode == 0 else 1

            if res.returncode == 0:
                passed_tests = total_tests
                failed_tests = 0
                pass_rate = 100.0
                accuracy_score = 100.0
            else:
                passed_tests = 0
                failed_tests = total_tests
                pass_rate = 0.0
                accuracy_score = 0.0
                error_message = res.stderr or res.stdout

            return BenchmarkMetrics(
                pass_rate=pass_rate,
                passed_tests=passed_tests,
                failed_tests=failed_tests,
                total_tests=total_tests,
                execution_time_sec=round(exec_time, 4),
                peak_memory_mb=round(peak / (1024 * 1024), 4),
                accuracy_score=accuracy_score,
                ast_valid=True,
                error_message=error_message
            )
        except Exception as e:
            exec_time = time.time() - start_time
            _, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            return BenchmarkMetrics(
                pass_rate=0.0,
                passed_tests=0,
                failed_tests=1,
                total_tests=1,
                execution_time_sec=round(exec_time, 4),
                peak_memory_mb=round(peak / (1024 * 1024), 4),
                accuracy_score=0.0,
                ast_valid=True,
                error_message=str(e)
            )
