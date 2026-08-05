# Comprehensive Technical Analysis: Requirement R2 (Evaluation & Verification Framework)

**Agent**: `explorer_survey_2`  
**Date**: 2026-08-04  
**Target Directory**: `C:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/self_improvement_loop` (and workspace root)  
**Objective**: Investigate codebase, benchmark routines, runtime environment, and requirement specifications for Requirement R2: Quantitative Benchmark Metric Measurement (pass rate, execution time, memory usage, accuracy) and Rollback Mechanism on Performance Degradation or Errors.

---

## Executive Summary

1. **Existing Baseline**: A prototype self-improvement loop exists in `self_improvement_loop/` comprising 11 Python files including `config.py`, `vcs.py`, `runner.py`, `engine.py`, `simulator.py`, `target_module.py`, and corresponding unit tests (`test_engine.py`, `test_simulator.py`, `test_target_module.py`, `test_vcs.py`).
2. **Core Verification Gap**: The existing system handles AST syntax validation (`ast.parse()`) and hard test failure detection (`returncode != 0`), but **lacks quantitative benchmark metrics measurement** (pass rate %, execution time latency, memory peak footprint, numerical accuracy) and **does not perform rollbacks when performance degrades** (e.g., code slowdown or memory leaks) while unit tests still pass.
3. **Actionable Roadmap**: To achieve full R2 compliance, we propose introducing:
   - A unified `BenchmarkEvaluator` & `MetricCollector` (`benchmark_runner.py`) using `time.perf_counter()` and `tracemalloc`.
   - A granular `TestResultParser` capturing passed/failed/total test counts to compute exact `pass_rate` (%).
   - A `PerformanceDegradationDetector` in `engine.py` with configurable degradation thresholds ($\tau_{time} = 15\%$, $\tau_{mem} = 20\%$, $\tau_{acc} = 1\%$).
   - An expanded multi-tier `Rollback` trigger in `vcs.py` / `engine.py` that reverts code on performance regression and provides feedback for alternative exploration.

---

## 1. Existing System Architecture & Code Inspection

### 1.1 Summary of Existing Files in `self_improvement_loop/`

| File Path | Lines | Core Responsibility | Compliance with Requirement R2 |
|---|---|---|---|
| `config.py` | 25 | Path configuration & execution safety limits | ⚠️ **Partial**: Lacks threshold configuration for performance metrics (latency, RAM, accuracy). |
| `runner.py` | 81 | Process execution of unit tests via `subprocess.run` | ⚠️ **Partial**: Returns process boolean `success`, but no timing, memory, or pass rate breakdown. |
| `vcs.py` | 103 | `CustomVCS` file versioning, patch creation, and rollback | ✅ **Strong**: Snapshot saving (`save_version`), diff generation (`generate_diff`), restore (`restore_version`/`rollback`). |
| `engine.py` | 481 | Self-improvement loop controller | ⚠️ **Partial**: Rollback triggers on syntax/test errors, but accepts candidate code if `returncode == 0` regardless of performance slowdown or memory leaks. |
| `simulator.py` | 802 | `MockLLMSimulator` & code quality metrics | ⚠️ **Partial**: `calculate_metrics()` measures static AST structure (lines, docstrings), NOT runtime benchmark metrics. |
| `target_module.py` | 159 | Target implementation (`Calculator` class) | Baseline target module under self-improvement. |
| `test_target_module.py` | 316 | Unit tests for `Calculator` | Baseline test suite covering basic arithmetic, trig, stats, matrix ops, optimization. |
| `run.py` | 100 | Entry point script running engine & test discovery | Entry script for E2E execution. |

---

### 1.2 Deep-Dive Line Analysis of Key R2-Related Components

#### A. `runner.py` (`C:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/self_improvement_loop/runner.py`)
- **Lines 19-35**: Dynamically resolves Python interpreter (`.venv/Scripts/python.exe` on Windows or `sys.executable`).
- **Lines 38-51**: Executes test runner:
  ```python
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
  ```
- **Evidentiary Limitation**:
  - `success` is strictly a binary `result.returncode == 0`.
  - Wall-clock runtime is not measured.
  - Process memory (RSS) is not tracked.
  - Test count breakdown (e.g. 15 passed, 2 failed out of 17) is missing.

#### B. `engine.py` (`C:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/self_improvement_loop/engine.py`)
- **Lines 319-373**: AST Syntax Pre-validation. Catches syntax errors before running tests. If invalid, logs `AST_SYNTAX_ERROR` and executes `self.vcs.rollback(version_idx)`.
- **Lines 386-472**: Test execution and baseline update logic:
  - If `test_result["success"] == True`:
    - Updates `version_idx = iteration`.
    - Updates `current_code` and `last_stable_code`.
    - Accepts code changes as successful.
  - If `test_result["success"] == False`:
    - Saves `target_module.v{iteration}.failed.py`.
    - Executes `self.vcs.rollback(version_idx)`.
    - Verifies rollback with `verify_result = self.runner.run_tests()`.
- **Evidentiary Limitation**:
  - `engine.py` **never measures performance regression**. If a candidate code change passes tests but takes 10 seconds instead of 10 milliseconds, `engine.py` marks it as `SUCCESS`.

#### C. `vcs.py` (`C:/Users/ocs56/OneDrive/바탕 화면/PORTFOLIO/PORTFOLIO - DVIEW/self_improvement_loop/vcs.py`)
- **Lines 64-94**: `restore_version(version_idx)` / `rollback(version_idx)`:
  - Cleanly overwrites `target_module.py` and `test_target_module.py` from stored snapshots `history/target_module.v{version_idx}.py`.
  - System capability: VCS infrastructure is fully functional and ready for performance rollback integration.

---

## 2. Requirement R2 Analysis: The 4 Core Verification Pillars

Requirement R2 explicitly mandates:
> **R2. Evaluation & Verification Framework**
> Program execution results, unit test pass rate, execution time, memory efficiency, and quantitative metric measurement engine. Rollback mechanism or alternative improvement exploration mechanism when improvement attempts fail to enhance quantitative indicators or encounter errors.

Below is the architectural blueprint to achieve 100% R2 compliance.

```
                    +-----------------------------------+
                    |   Candidate Code Generation (Vk)  |
                    +-----------------------------------+
                                      |
                                      v
                    +-----------------------------------+
                    |    Pillar 1: Metric Collector     |
                    |   - Pass Rate (%)                 |
                    |   - Execution Time (sec)          |
                    |   - Peak Memory (MB)              |
                    |   - Accuracy Score (0.0 - 1.0)    |
                    +-----------------------------------+
                                      |
                                      v
                    +-----------------------------------+
                    |   Pillar 2: Degradation Engine    |
                    |   Is Vk >= Vstable on all metrics?|
                    +-----------------------------------+
                               /         \
                             NO           YES
                            /               \
                           v                 v
            +-----------------------+   +-----------------------+
            |  Pillar 3: Rollback   |   |   Accept New Baseline |
            |  - VCS Restore        |   |   - Update Vstable        |
            |  - Verify Restored    |   |   - Save Patch Diff       |
            |  - Alternative Feedback|   +-----------------------+
            +-----------------------+
```

---

### Pillar 1: Quantitative Metric Measurement Suite

We define `BenchmarkMetrics` data model and metric calculation mechanisms:

#### 1. Pass Rate Metric ($P_{pass}$)
- Executed via `unittest.TextTestRunner` with custom `unittest.TestResult` collector or JSON runner.
- **Formula**:
  $$\text{Pass Rate (\%)} = \left( \frac{\text{Passed Tests}}{\text{Total Tests} - \text{Skipped Tests}} \right) \times 100.0$$

#### 2. Execution Time Metric ($T_{exec}$)
- Measured using high-precision wall-clock timer `time.perf_counter()`.
- Run micro-benchmarksuite over $N=5$ iterations to compute average latency ($\bar{T}_{exec}$) and standard deviation ($\sigma_T$).

#### 3. Memory Usage Metric ($M_{peak}$)
- Measured using Python standard library `tracemalloc`:
  ```python
  tracemalloc.start()
  # Execute target functions & test suite
  current_bytes, peak_bytes = tracemalloc.get_traced_memory()
  tracemalloc.stop()
  peak_memory_mb = peak_bytes / (1024.0 * 1024.0)
  ```
- Cross-platform compatible (Windows 11 AMD64, Linux, macOS).

#### 4. Accuracy & Numerical Precision Metric ($A_{acc}$)
- Evaluated on mathematical, statistical, and optimization functions in `target_module.py`:
  - Linear regression residual norm: $\|y - (mx + c)\|_2$
  - Gradient descent error relative to analytical minimum $x^*=0.0$
  - Matrix multiplication floating-point deviation
- **Formula**:
  $$A_{acc} = \max\left(0.0, 1.0 - \frac{\text{Mean Absolute Error}}{\text{Baseline Target Scale}}\right)$$

---

### Pillar 2: Baseline vs Candidate Comparison & Degradation Detection

Let $M_{stable} = (P_{base}, T_{base}, M_{base}, A_{base})$ be the metrics of the current stable version, and $M_{cand} = (P_{cand}, T_{cand}, M_{cand}, A_{cand})$ be the metrics of candidate iteration $k$.

The `DegradationDetector` applies the following quantitative evaluation rules:

1. **Compilation / Syntax Check**:
   $$\text{If } \text{ast\_valid} = \text{False} \implies \text{STATUS: AST\_SYNTAX\_ERROR}$$
2. **Unit Test Pass Rate Check**:
   $$\text{If } P_{cand} < P_{base} \implies \text{STATUS: REJECT\_PASS\_RATE\_DEGRADED}$$
3. **Execution Time Regression Check ($\tau_{time} = 0.15$)**:
   $$\text{If } T_{cand} > T_{base} \times (1.0 + \tau_{time}) \implies \text{STATUS: REJECT\_LATENCY\_DEGRADED}$$
4. **Memory Footprint Regression Check ($\tau_{mem} = 0.20$)**:
   $$\text{If } M_{cand} > M_{base} \times (1.0 + \tau_{mem}) \implies \text{STATUS: REJECT\_MEMORY\_DEGRADED}$$
5. **Accuracy Regression Check ($\tau_{acc} = 0.01$)**:
   $$\text{If } A_{cand} < A_{base} - \tau_{acc} \implies \text{STATUS: REJECT\_ACCURACY\_DEGRADED}$$

**ACCEPTANCE CONDITION**: Candidate is accepted **ONLY** when no degradation rules are triggered AND ($P_{cand} > P_{base} \lor T_{cand} < T_{base} \lor M_{cand} < M_{base} \lor A_{cand} > A_{base} \lor \text{Code quality enhanced}$).

---

### Pillar 3: Multi-Tier Rollback & Alternative Exploration Mechanism

When `DegradationDetector` returns a `REJECT_*` status:

1. **VCS Snapshot Rollback**:
   - Invoke `self.vcs.rollback(version_idx)`.
   - Restore `target_module.py` and `test_target_module.py` to stable snapshot version `version_idx`.
2. **Environment Verification Run**:
   - Re-run `BenchmarkMetrics` on restored code to ensure system returned to 100% baseline state.
3. **Degradation Rationale Feedback Injection**:
   - Generate rich feedback message for generator/LLM simulator:
     ```
     "REJECT_LATENCY_DEGRADED: Execution time increased from 0.0051s to 0.0384s (+652%). 
     Code change rolled back to v{version_idx}. 
     Please attempt optimization without increasing computational complexity."
     ```
4. **Stuck State Recovery & Search Strategy Perturbation**:
   - If 3 consecutive rollbacks occur due to performance degradation, trigger strategy mutation (e.g. switch from micro-optimization to algorithmic restructuring).

---

## 3. Concrete Code Specification & Proposed Implementation

To provide an actionable implementation guide for Worker agents, below is the exact code specification for `benchmark_runner.py` and the updates to `engine.py`.

### 3.1 Proposed New Module: `self_improvement_loop/benchmark_runner.py`

```python
import time
import tracemalloc
import unittest
import importlib
import sys
import os
from dataclasses import dataclass
from typing import Optional, Dict, Any

@dataclass
class BenchmarkMetrics:
    pass_rate: float            # 0.0 to 100.0
    passed_tests: int
    failed_tests: int
    total_tests: int
    execution_time_sec: float   # Seconds
    peak_memory_mb: float       # Megabytes
    accuracy_score: float       # 0.0 to 1.0
    ast_valid: bool
    error_message: Optional[str] = None

class BenchmarkRunner:
    def __init__(self, target_file: str, test_file: str):
        self.target_file = target_file
        self.test_file = test_file

    def run_benchmark(self) -> BenchmarkMetrics:
        # 1. AST Validation
        try:
            with open(self.target_file, "r", encoding="utf-8", errors="replace") as f:
                code = f.read()
            import ast
            ast.parse(code)
            ast_valid = True
        except Exception as e:
            return BenchmarkMetrics(
                pass_rate=0.0, passed_tests=0, failed_tests=0, total_tests=0,
                execution_time_sec=0.0, peak_memory_mb=0.0, accuracy_score=0.0,
                ast_valid=False, error_message=str(e)
            )

        # 2. Memory & Timing measurement during test suite execution
        tracemalloc.start()
        start_time = time.perf_counter()

        loader = unittest.TestLoader()
        suite = loader.discover(
            start_dir=os.path.dirname(self.test_file),
            pattern=os.path.basename(self.test_file)
        )
        
        result = unittest.TestResult()
        suite.run(result)

        end_time = time.perf_counter()
        current_mem, peak_mem = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        execution_time_sec = round(end_time - start_time, 6)
        peak_memory_mb = round(peak_mem / (1024.0 * 1024.0), 4)

        total_tests = result.testsRun
        failed_count = len(result.failures) + len(result.errors)
        passed_count = total_tests - failed_count - len(result.skipped)
        pass_rate = round((passed_count / max(1, total_tests - len(result.skipped))) * 100.0, 2)

        # 3. Accuracy Calculation (Evaluation on benchmark functions)
        accuracy_score = self._evaluate_accuracy()

        return BenchmarkMetrics(
            pass_rate=pass_rate,
            passed_tests=passed_count,
            failed_tests=failed_count,
            total_tests=total_tests,
            execution_time_sec=execution_time_sec,
            peak_memory_mb=peak_memory_mb,
            accuracy_score=accuracy_score,
            ast_valid=ast_valid,
            error_message=None if result.wasSuccessful() else "Tests failed"
        )

    def _evaluate_accuracy(self) -> float:
        try:
            sys.modules.pop("target_module", None)
            sys.modules.pop("self_improvement_loop.target_module", None)
            importlib.invalidate_caches()
            try:
                import self_improvement_loop.target_module as tm
            except ImportError:
                import target_module as tm
            importlib.reload(tm)
            calc = tm.Calculator()

            # Benchmark 1: Gradient Descent accuracy
            if hasattr(calc, "gradient_descent"):
                f_prime = lambda x: 2 * x
                res = calc.gradient_descent(f_prime, x_start=10.0, learning_rate=0.1, iterations=100)
                err1 = abs(res - 0.0)
            else:
                err1 = 0.0

            # Benchmark 2: Linear Regression accuracy
            if hasattr(calc, "linear_regression"):
                slope, intercept = calc.linear_regression([1.0, 2.0, 3.0], [2.0, 4.0, 6.0])
                err2 = abs(slope - 2.0) + abs(intercept - 0.0)
            else:
                err2 = 0.0

            total_err = err1 + err2
            return round(max(0.0, 1.0 - total_err), 4)
        except Exception:
            return 0.0
```

---

## 4. Verification & Testing Strategy for Requirement R2

To verify that Requirement R2 is functioning correctly once implemented:

1. **Unit Test Suite Verification**:
   - Command: `.venv\Scripts\python.exe -m unittest discover -s self_improvement_loop -p "test_*.py"`
   - Expected Output: All tests pass (21+ tests).

2. **Performance Degradation Injection Verification**:
   - Inject a slow candidate function (`time.sleep(0.5)` or $O(N^3)$ loop) into `get_improved_code()`.
   - Verify `engine.py` detects `REJECT_LATENCY_DEGRADED`, triggers `vcs.rollback()`, logs `ROLLBACK`, and continues loop without corrupting baseline.

3. **Memory Spike Injection Verification**:
   - Inject large list allocation (`[0] * 10_000_000`) into candidate code.
   - Verify `engine.py` detects `REJECT_MEMORY_DEGRADED`, triggers `vcs.rollback()`, logs memory delta, and restores baseline memory footprint.

---

## 5. Conclusion

The existing codebase in `self_improvement_loop/` has solid foundations for file versioning (`vcs.py`) and execution control (`engine.py`). However, full compliance with Requirement R2 requires implementing quantitative metric collection (`pass_rate`, `execution_time`, `peak_memory`, `accuracy`) and performance degradation rollback triggers. The detailed design and code specifications in this report provide a complete roadmap for implementation.
