import os
import ast
import time
import subprocess
import tracemalloc
import re
import sys
import importlib
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
        tracemalloc.start()
        start_time = time.perf_counter()

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
            end_time = time.perf_counter()
            _, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            return BenchmarkMetrics(
                pass_rate=0.0,
                passed_tests=0,
                failed_tests=1,
                total_tests=1,
                execution_time_sec=round(end_time - start_time, 6),
                peak_memory_mb=round(peak / (1024.0 * 1024.0), 4),
                accuracy_score=0.0,
                ast_valid=False,
                error_message=error_message
            )

        # 2. Subprocess Execution of Tests
        curr_dir = Path(__file__).parent.resolve()
        if curr_dir.name == "recursive_self_improvement":
            base_dir = curr_dir.parent.resolve()
        else:
            base_dir = curr_dir.resolve()

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
            env = dict(os.environ)
            env["PYTHONIOENCODING"] = "utf-8"
            env["PYTHONUTF8"] = "1"
            env["RSI_TEST_HARNESS"] = "1"
            res = subprocess.run(
                [python_executable, self.test_file],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                timeout=60,
                env=env
            )
            end_time = time.perf_counter()
            _, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()

            stdout_stderr = res.stdout + "\n" + res.stderr
            total_tests = 0
            passed_tests = 0
            failed_tests = 0
            skipped_tests = 0

            match_ran = re.search(r"Ran (\d+) test", stdout_stderr)
            if match_ran:
                total_tests = int(match_ran.group(1))

            match_skipped = re.search(r"skipped=(\d+)", stdout_stderr)
            if match_skipped:
                skipped_tests = int(match_skipped.group(1))

            match_failures = re.search(r"failures=(\d+)", stdout_stderr)
            failures = int(match_failures.group(1)) if match_failures else 0

            match_errors = re.search(r"errors=(\d+)", stdout_stderr)
            errors = int(match_errors.group(1)) if match_errors else 0

            failed_tests = failures + errors

            if res.returncode == 0:
                if total_tests == 0:
                    total_tests = 1
                passed_tests = max(0, total_tests - skipped_tests)
                failed_tests = 0
                pass_rate = 100.0
                accuracy_score = self._evaluate_accuracy(pass_rate)
                error_message = ""
            else:
                if total_tests == 0:
                    total_tests = 1
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
                execution_time_sec=round(end_time - start_time, 6),
                peak_memory_mb=round(peak / (1024.0 * 1024.0), 4),
                accuracy_score=accuracy_score,
                ast_valid=True,
                error_message=error_message
            )
        except Exception as e:
            end_time = time.perf_counter()
            _, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            return BenchmarkMetrics(
                pass_rate=0.0,
                passed_tests=0,
                failed_tests=1,
                total_tests=1,
                execution_time_sec=round(end_time - start_time, 6),
                peak_memory_mb=round(peak / (1024.0 * 1024.0), 4),
                accuracy_score=0.0,
                ast_valid=True,
                error_message=str(e)
            )

    def _evaluate_accuracy(self, pass_rate: float) -> float:
        if pass_rate <= 0:
            return 0.0
        base_accuracy = pass_rate / 100.0
        try:
            sys.modules.pop("target_module", None)
            sys.modules.pop("self_improvement_loop.target_module", None)
            sys.modules.pop("recursive_self_improvement.target_module", None)
            importlib.invalidate_caches()
            try:
                import recursive_self_improvement.target_module as tm
            except ImportError:
                try:
                    import self_improvement_loop.target_module as tm
                except ImportError:
                    import target_module as tm
            importlib.reload(tm)
            if not hasattr(tm, "Calculator"):
                return round(base_accuracy, 4)
            calc = tm.Calculator()

            errors = []
            if hasattr(calc, "add"):
                try:
                    errors.append(abs(calc.add(2.0, 3.0) - 5.0))
                except Exception:
                    errors.append(1.0)
            if hasattr(calc, "gradient_descent"):
                try:
                    f_prime = lambda x: 2 * x
                    res = calc.gradient_descent(f_prime, x_start=10.0, learning_rate=0.1, iterations=100)
                    errors.append(abs(res - 0.0))
                except Exception:
                    errors.append(1.0)
            if hasattr(calc, "linear_regression"):
                try:
                    slope, intercept = calc.linear_regression([1.0, 2.0, 3.0], [2.0, 4.0, 6.0])
                    errors.append(abs(slope - 2.0) + abs(intercept - 0.0))
                except Exception:
                    errors.append(1.0)

            if errors:
                mean_err = sum(errors) / len(errors)
                num_score = max(0.0, 1.0 - mean_err)
                return round(min(base_accuracy, num_score), 4)
        except Exception:
            pass
        return round(base_accuracy, 4)

