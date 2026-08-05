import os
import json
import time
import sys
import re
import hashlib
import ast
from typing import Optional, Tuple, List


try:
    from self_improvement_loop import config
    from self_improvement_loop.vcs import CustomVCS
    from self_improvement_loop.runner import TestRunner
    from self_improvement_loop.evaluator import BenchmarkRunner, BenchmarkMetrics
    from self_improvement_loop.simulator import MockLLMSimulator, RateLimitError
except ImportError:
    try:
        from recursive_self_improvement import config
        from recursive_self_improvement.vcs import CustomVCS
        from recursive_self_improvement.runner import TestRunner
        from recursive_self_improvement.evaluator import BenchmarkRunner, BenchmarkMetrics
        from recursive_self_improvement.simulator import MockLLMSimulator, RateLimitError
    except ImportError:
        import config
        from vcs import CustomVCS
        from runner import TestRunner
        from evaluator import BenchmarkRunner, BenchmarkMetrics
        from simulator import MockLLMSimulator, RateLimitError


class SelfImprovementEngine:
    def __init__(self):
        """
        Initializes the self-improvement loop engine.
        Loads configurations and initializes helper services.
        """
        self.target_file = config.TARGET_FILE
        self.test_file = config.TEST_FILE
        self.history_dir = config.HISTORY_DIR
        self.max_iterations = getattr(config, "MAX_ITERATIONS", 1000)
        self.timeout_seconds = config.TIMEOUT_SECONDS
        self.session_timeout_seconds = getattr(config, "SESSION_TIMEOUT_SECONDS", 18000)
        self.max_api_requests = getattr(config, "MAX_API_REQUESTS", 500)
        self.inject_syntax_error_iteration = getattr(config, "INJECT_SYNTAX_ERROR_ITERATION", 4)

        os.makedirs(self.history_dir, exist_ok=True)

        self.vcs = CustomVCS(self.history_dir, self.target_file, self.test_file)
        self.runner = TestRunner(self.test_file)
        self.evaluator = BenchmarkRunner(self.target_file, self.test_file)
        self.simulator = MockLLMSimulator()

        self.baseline_metrics = None
        self.latency_regression_threshold = getattr(config, "LATENCY_REGRESSION_THRESHOLD", 0.5)
        self.memory_regression_threshold = getattr(config, "MEMORY_REGRESSION_THRESHOLD", 5.0)

        # Stuck/loop detection state
        self.recent_hashes = []
        self.consecutive_rollbacks = 0
        self.last_error_message = None
        self.perturbation_feedback = None
        self.error_feedback = None

        self.api_requests_count = 0
        self.total_token_budget = getattr(config, "TOTAL_TOKEN_BUDGET", 1000000)
        self.token_budget_per_iteration = getattr(config, "TOKEN_BUDGET_PER_ITERATION", 5000)
        self.cumulative_tokens_used = 0
        self.execution_log = []

    def normalize_error_message(self, error_msg: str) -> str:
        """
        Normalizes error messages by stripping file paths, line numbers, and standardizing whitespace.
        This ensures dynamic tracebacks match properly.
        """
        if not error_msg:
            return ""
        normalized = re.sub(r'File\s+"[^"]+",\s+line\s+\d+', 'File "<path>", line <line>', error_msg)
        normalized = re.sub(r'\bline\s+\d+\b', 'line <line>', normalized)
        normalized = re.sub(r"(['\"])[^\n\r'\"]*?[/\\].*?\1", r"\1<path>\1", normalized)
        normalized = re.sub(r'[a-zA-Z]:\\[^\n\r\s:]+', '<path>', normalized)
        normalized = re.sub(r'/[^\n\r\s:]+/[^\n\r\s:]*', '<path>', normalized)
        lines = [line.strip() for line in normalized.splitlines() if line.strip()]
        return "\n".join(lines)

    def log_event(self, event_type: str, message: str, details: dict = None) -> None:
        """
        Logs an event during the execution of the loop to stdout/stderr and records it in execution_log.
        """
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime())
        log_entry = {
            "timestamp": timestamp,
            "event_type": event_type,
            "message": message,
            "details": details or {}
        }
        self.execution_log.append(log_entry)
        print(f"[{timestamp}] [{event_type}] {message}")
        if details:
            if "stdout" in details and details["stdout"]:
                print(f"Stdout:\n{details['stdout']}")
            if "stderr" in details and details["stderr"]:
                print(f"Stderr:\n{details['stderr']}", file=sys.stderr)

    def save_execution_log(self) -> None:
        """
        Writes the structured execution log list to history/execution_log.json.
        """
        log_path = os.path.join(self.history_dir, "execution_log.json")
        try:
            with open(log_path, "w", encoding="utf-8", errors="replace") as f:
                json.dump(self.execution_log, f, indent=4)
            print(f"Execution log saved to {log_path}")
        except Exception as e:
            print(f"Failed to save execution log: {e}", file=sys.stderr)

    def check_stop_signal(self) -> bool:
        """
        Checks if a stop flag file or a stop command is present.
        """
        stop_flag_file = getattr(config, "STOP_FLAG_FILE", os.path.join(config.BASE_DIR, "stop.flag"))
        if os.path.exists(stop_flag_file):
            try:
                os.remove(stop_flag_file)
            except Exception:
                pass
            return True

        command_file = getattr(config, "COMMAND_FILE", os.path.join(config.BASE_DIR, "command.txt"))
        if os.path.exists(command_file):
            try:
                with open(command_file, "r", encoding="utf-8", errors="replace") as f:
                    cmd = f.read().strip()
                if cmd in ("중단", "stop"):
                    try:
                        os.remove(command_file)
                    except Exception:
                        pass
                    return True
            except Exception:
                pass

        return False

    def evaluate_performance_degradation(self, candidate_metrics: BenchmarkMetrics) -> tuple[Optional[str], list[str]]:
        """
        Compares candidate metrics against baseline metrics for performance degradation.
        Returns (degraded_event_type: Optional[str], degradation_reasons: list[str]).
        Rejection categories:
        - REJECT_PASS_RATE_DEGRADED: pass_rate < baseline pass_rate
        - REJECT_ACCURACY_DEGRADED: accuracy_score drops below baseline
        - REJECT_LATENCY_DEGRADED: execution_time_sec exceeds baseline by latency regression threshold
        - REJECT_MEMORY_DEGRADED: peak_memory_mb exceeds baseline by memory regression threshold
        """
        base = getattr(self, "stable_baseline_metrics", None) or getattr(self, "baseline_metrics", None)
        if not base or not candidate_metrics:
            return None, []

        lat_reg = getattr(self, "latency_regression_threshold", getattr(config, "LATENCY_REGRESSION_THRESHOLD", 0.5))
        mem_reg = getattr(self, "memory_regression_threshold", getattr(config, "MEMORY_REGRESSION_THRESHOLD", 5.0))
        lat_deg = getattr(config, "LATENCY_DEGRADATION_THRESHOLD", 0.15)
        mem_deg = getattr(config, "MEMORY_DEGRADATION_THRESHOLD", 0.20)
        acc_deg = getattr(config, "ACCURACY_DEGRADATION_THRESHOLD", 0.001)

        reasons = []

        # 1. Pass rate degradation
        if candidate_metrics.pass_rate < base.pass_rate:
            reasons.append(f"pass_rate dropped from {base.pass_rate}% to {candidate_metrics.pass_rate}%")
            return "REJECT_PASS_RATE_DEGRADED", reasons

        # 2. Accuracy score degradation
        if candidate_metrics.accuracy_score < base.accuracy_score - acc_deg:
            reasons.append(f"accuracy_score dropped from {base.accuracy_score} to {candidate_metrics.accuracy_score}")
            return "REJECT_ACCURACY_DEGRADED", reasons

        # 3. Latency degradation
        is_lat_degraded = False
        if base.execution_time_sec > 0 and candidate_metrics.execution_time_sec > base.execution_time_sec * (1.0 + lat_deg) and (candidate_metrics.execution_time_sec - base.execution_time_sec > 0.001):
            is_lat_degraded = True
        elif candidate_metrics.execution_time_sec > base.execution_time_sec + lat_reg:
            is_lat_degraded = True

        if is_lat_degraded:
            reasons.append(f"execution_time_sec ({candidate_metrics.execution_time_sec:.6f}s) exceeded baseline ({base.execution_time_sec:.6f}s)")
            return "REJECT_LATENCY_DEGRADED", reasons

        # 4. Memory degradation
        is_mem_degraded = False
        if base.peak_memory_mb > 0 and candidate_metrics.peak_memory_mb > base.peak_memory_mb * (1.0 + mem_deg) and (candidate_metrics.peak_memory_mb - base.peak_memory_mb > 0.05):
            is_mem_degraded = True
        elif candidate_metrics.peak_memory_mb > base.peak_memory_mb + mem_reg:
            is_mem_degraded = True

        if is_mem_degraded:
            reasons.append(f"peak_memory_mb ({candidate_metrics.peak_memory_mb:.4f}MB) exceeded baseline ({base.peak_memory_mb:.4f}MB)")
            return "REJECT_MEMORY_DEGRADED", reasons

        return None, []

    def run(self) -> bool:
        """
        Runs the main loop for self-improvement.
        Returns True if successful/gracefully recovered/stopped, False on failure.
        """
        start_time = time.time()
        self.log_event("START", "Self-improvement loop started.")

        # Detect the latest version from history to support resume
        version_idx = 0
        latest_v = -1
        if os.path.exists(self.history_dir):
            for file_name in os.listdir(self.history_dir):
                match = re.match(r"target_module\.v(\d+)\.py", file_name)
                if match:
                    v = int(match.group(1))
                    if v > latest_v:
                        latest_v = v
        if latest_v >= 0:
            version_idx = latest_v
            self.log_event("INFO", f"Resuming improvement loop. Detected latest version from history: v{version_idx}")
        
        # Read current target code
        try:
            with open(self.target_file, "r", encoding="utf-8", errors="replace") as f:
                current_code = f.read()
        except Exception as e:
            self.log_event("ERROR", f"Failed to read current target code: {str(e)}")
            self.save_execution_log()
            return False

        if not self.vcs.has_version(0):
            try:
                with open(self.test_file, "r", encoding="utf-8", errors="replace") as f:
                    initial_test_code = f.read()
            except Exception:
                initial_test_code = ""
            self.vcs.save_version(0, current_code, initial_test_code)
            self.log_event("SUCCESS", "Initial code saved as version 0.")

        # Calculate baseline metrics before improvement iterations begin
        try:
            self.baseline_metrics = self.evaluator.run_benchmark()
            self.log_event(
                "BASELINE_METRICS",
                f"Baseline metrics calculated: pass_rate={self.baseline_metrics.pass_rate}%, "
                f"accuracy={self.baseline_metrics.accuracy_score}%, "
                f"execution_time={self.baseline_metrics.execution_time_sec}s, "
                f"peak_memory={self.baseline_metrics.peak_memory_mb}MB",
                {
                    "pass_rate": self.baseline_metrics.pass_rate,
                    "accuracy_score": self.baseline_metrics.accuracy_score,
                    "execution_time_sec": self.baseline_metrics.execution_time_sec,
                    "peak_memory_mb": self.baseline_metrics.peak_memory_mb,
                    "ast_valid": self.baseline_metrics.ast_valid
                }
            )
        except Exception as e:
            self.log_event("ERROR", f"Failed to calculate baseline metrics: {str(e)}")
            self.baseline_metrics = BenchmarkMetrics(
                pass_rate=0.0,
                passed_tests=0,
                failed_tests=1,
                total_tests=1,
                execution_time_sec=0.0,
                peak_memory_mb=0.0,
                accuracy_score=0.0,
                ast_valid=True,
                error_message=str(e)
            )

        last_stable_code = current_code
        loop_iteration = 0

        while True:
            iteration_start_time = time.time()
            loop_iteration += 1
            iteration = version_idx + 1

            if self.check_stop_signal():
                self.log_event("STOP_SIGNAL", "Graceful shutdown requested. Exiting loop.")
                self.save_execution_log()
                return True

            iteration_elapsed = time.time() - iteration_start_time
            if iteration_elapsed >= self.timeout_seconds:
                self.log_event("TIMEOUT", f"Aborting loop: Iteration duration {iteration_elapsed:.2f}s exceeded TIMEOUT_SECONDS of {self.timeout_seconds}s.")
                self.vcs.rollback(version_idx)
                self.save_execution_log()
                return False

            session_elapsed = time.time() - start_time
            if session_elapsed >= self.session_timeout_seconds:
                self.log_event("SESSION_TIMEOUT", f"Aborting loop: Total duration {session_elapsed:.2f}s exceeded SESSION_TIMEOUT_SECONDS of {self.session_timeout_seconds}s.")
                self.vcs.rollback(version_idx)
                self.save_execution_log()
                return False

            remaining_budget = self.total_token_budget - self.cumulative_tokens_used
            if remaining_budget < self.token_budget_per_iteration:
                self.log_event("TOKEN_BUDGET_EXCEEDED", f"Aborting loop: Remaining budget {remaining_budget} is insufficient for the next iteration budget of {self.token_budget_per_iteration}.")
                self.vcs.rollback(version_idx)
                self.save_execution_log()
                return False

            if loop_iteration > self.max_iterations:
                self.log_event("FINISHED", f"Reached configured MAX_ITERATIONS limit of {self.max_iterations}. Exiting.")
                self.save_execution_log()
                return True

            self.log_event("ITERATION_START", f"Starting iteration {iteration} (Loop run {loop_iteration}).")

            if getattr(self, "inject_syntax_error_iteration", None) is not None:
                inject_syntax_error = (loop_iteration == self.inject_syntax_error_iteration)
            else:
                inject_syntax_error = False

            improved_code = None
            while True:
                iteration_elapsed = time.time() - iteration_start_time
                if iteration_elapsed >= self.timeout_seconds:
                    self.log_event("TIMEOUT", f"Aborting loop: Iteration duration {iteration_elapsed:.2f}s exceeded TIMEOUT_SECONDS of {self.timeout_seconds}s.")
                    self.vcs.rollback(version_idx)
                    self.save_execution_log()
                    return False

                session_elapsed = time.time() - start_time
                if session_elapsed >= self.session_timeout_seconds:
                    self.log_event("SESSION_TIMEOUT", f"Aborting loop: Total duration {session_elapsed:.2f}s exceeded SESSION_TIMEOUT_SECONDS of {self.session_timeout_seconds}s.")
                    self.vcs.rollback(version_idx)
                    self.save_execution_log()
                    return False

                if self.api_requests_count >= self.max_api_requests:
                    self.log_event("API_LIMIT", f"Aborting loop: Total API requests {self.api_requests_count} reached MAX_API_REQUESTS limit of {self.max_api_requests}.")
                    self.vcs.rollback(version_idx)
                    self.save_execution_log()
                    return False

                self.api_requests_count += 1
                self.cumulative_tokens_used += 1000

                try:
                    improved_code = self.simulator.get_improved_code(
                        current_code,
                        iteration,
                        inject_syntax_error=inject_syntax_error,
                        perturbation_feedback=self.perturbation_feedback,
                        error_feedback=self.error_feedback
                    )
                    self.perturbation_feedback = None
                    self.error_feedback = None
                    break
                except RateLimitError as rle:
                    self.log_event("RATE_LIMIT", f"Rate limit encountered on iteration {iteration}. {str(rle)} Sleeping for {rle.reset_seconds}s before retry.")
                    sleep_end = time.time() + rle.reset_seconds
                    while time.time() < sleep_end:
                        if self.check_stop_signal():
                            self.log_event("STOP_SIGNAL", "Graceful shutdown requested during rate limit wait. Exiting loop.")
                            self.save_execution_log()
                            return True

                        iteration_elapsed = time.time() - iteration_start_time
                        if iteration_elapsed >= self.timeout_seconds:
                            self.log_event("TIMEOUT", f"Aborting loop: Iteration duration {iteration_elapsed:.2f}s exceeded TIMEOUT_SECONDS of {self.timeout_seconds}s during rate limit wait.")
                            self.vcs.rollback(version_idx)
                            self.save_execution_log()
                            return False

                        session_elapsed = time.time() - start_time
                        if session_elapsed >= self.session_timeout_seconds:
                            self.log_event("SESSION_TIMEOUT", f"Aborting loop: Total duration {session_elapsed:.2f}s exceeded SESSION_TIMEOUT_SECONDS of {self.session_timeout_seconds}s during rate limit wait.")
                            self.vcs.rollback(version_idx)
                            self.save_execution_log()
                            return False

                        time.sleep(0.5)
                    continue
                except Exception as e:
                    self.log_event("ERROR", f"Simulator query failed in iteration {iteration}: {str(e)}")
                    self.vcs.rollback(version_idx)
                    self.save_execution_log()
                    return False

            code_hash = hashlib.md5(improved_code.encode("utf-8")).hexdigest()
            if code_hash in self.recent_hashes:
                self.log_event("STUCK_DETECTED", f"Stuck state detected on iteration {iteration}: code hash matched one of the last 3 iterations.")
                self.perturbation_feedback = "Warning: Stuck state detected (code duplication loop). Please change your implementation or optimization strategy to produce different code."
            
            self.recent_hashes.append(code_hash)
            if len(self.recent_hashes) > 3:
                self.recent_hashes.pop(0)

            # AST Syntax Pre-validation
            try:
                ast.parse(improved_code)
            except SyntaxError as se:
                error_msg = f"SyntaxError: {se.msg} at line {se.lineno}"
                normalized_error_msg = self.normalize_error_message(error_msg)
                self.error_feedback = normalized_error_msg
                self.log_event("AST_SYNTAX_ERROR", f"AST syntax pre-validation failed on iteration {iteration}: {normalized_error_msg}")

                failed_path = os.path.join(self.history_dir, f"target_module.v{iteration}.failed.py")
                try:
                    with open(failed_path, "w", encoding="utf-8", errors="replace") as f:
                        f.write(improved_code)
                except Exception as e:
                    self.log_event("ERROR", f"Failed to save debug failed version: {str(e)}")

                diff_str = self.vcs.generate_diff(iteration, last_stable_code, improved_code)
                self.vcs.rollback(version_idx)

                is_stuck_by_error = (normalized_error_msg and normalized_error_msg == self.last_error_message)
                self.last_error_message = normalized_error_msg
                self.consecutive_rollbacks += 1
                is_stuck_by_rollbacks = self.consecutive_rollbacks >= 3

                if is_stuck_by_error or is_stuck_by_rollbacks:
                    self.log_event("STUCK_DETECTED", f"Stuck state detected on iteration {iteration}. Repeating error: {is_stuck_by_error}, rollbacks: {self.consecutive_rollbacks}.")
                    self.perturbation_feedback = "Warning: Stuck state detected due to repeating error or multiple rollbacks. Please change your design/strategy to fix the error."

                verify_result = self.runner.run_tests()
                verify_success = verify_result["success"]

                rollback_details = {
                    "iteration": iteration,
                    "diff": diff_str,
                    "test_failure": {
                        "stdout": "",
                        "stderr": error_msg,
                        "returncode": 1
                    },
                    "rollback_verification": {
                        "success": verify_success,
                        "stdout": verify_result["stdout"],
                        "stderr": verify_result["stderr"]
                    }
                }

                self.log_event("ROLLBACK", f"Iteration {iteration} failed AST syntax pre-validation. Rolled back to stable version {version_idx}.", rollback_details)

                if version_idx > 0 and not verify_success:
                    self.save_execution_log()
                    return False

                time.sleep(1.0)
                continue

            # Write improved code to target module
            try:
                with open(self.target_file, "w", encoding="utf-8", errors="replace") as f:
                    f.write(improved_code)
            except Exception as e:
                self.log_event("ERROR", f"Failed to write improved code to target module in iteration {iteration}: {str(e)}")
                self.vcs.rollback(version_idx)
                self.save_execution_log()
                return False

            # Execute unit tests via runner
            test_result = self.runner.run_tests()

            # Evaluate quantitative benchmark metrics if tests succeeded
            candidate_metrics = None
            is_degraded = False
            degradation_reasons = []

            if test_result["success"]:
                try:
                    candidate_metrics = self.evaluator.run_benchmark()
                    is_degraded, degradation_reasons = self.evaluate_performance_degradation(candidate_metrics)
                except Exception as e:
                    self.log_event("ERROR", f"Failed to evaluate candidate benchmark metrics in iteration {iteration}: {str(e)}")

            if test_result["success"] and not is_degraded:
                # Acceptance
                version_idx = iteration
                self.consecutive_rollbacks = 0
                self.last_error_message = None
                self.error_feedback = None

                try:
                    with open(self.test_file, "r", encoding="utf-8", errors="replace") as f:
                        test_code = f.read()
                except Exception:
                    test_code = ""

                # Dual-file VCS snapshot
                self.vcs.save_version(version_idx, improved_code, test_code)

                # Generate diff patch
                diff_str = self.vcs.generate_diff(version_idx, last_stable_code, improved_code)

                # Update baseline metrics to candidate metrics
                if candidate_metrics:
                    self.baseline_metrics = candidate_metrics

                log_details = {
                    "iteration": iteration,
                    "diff": diff_str,
                    "stdout": test_result["stdout"],
                    "stderr": test_result["stderr"]
                }
                if candidate_metrics:
                    log_details["metrics"] = {
                        "pass_rate": candidate_metrics.pass_rate,
                        "accuracy_score": candidate_metrics.accuracy_score,
                        "execution_time_sec": candidate_metrics.execution_time_sec,
                        "peak_memory_mb": candidate_metrics.peak_memory_mb
                    }

                self.log_event("SUCCESS", f"Iteration {iteration} succeeded. Tests passed and performance metrics accepted.", log_details)

                current_code = improved_code
                last_stable_code = improved_code
            else:
                # Rejection (due to test failure or performance degradation)
                failed_path = os.path.join(self.history_dir, f"target_module.v{iteration}.failed.py")
                try:
                    with open(failed_path, "w", encoding="utf-8", errors="replace") as f:
                        f.write(improved_code)
                except Exception as e:
                    self.log_event("ERROR", f"Failed to save debug failed version: {str(e)}")

                diff_str = self.vcs.generate_diff(iteration, last_stable_code, improved_code)

                # Dual-file atomic rollback
                self.vcs.rollback(version_idx)

                if is_degraded:
                    error_msg = "Performance degradation detected: " + "; ".join(degradation_reasons)
                else:
                    error_msg = test_result.get("stderr", "") or test_result.get("stdout", "")

                normalized_error_msg = self.normalize_error_message(error_msg)
                self.error_feedback = normalized_error_msg

                is_stuck_by_error = False
                if normalized_error_msg and normalized_error_msg == self.last_error_message:
                    is_stuck_by_error = True

                self.last_error_message = normalized_error_msg
                self.consecutive_rollbacks += 1
                is_stuck_by_rollbacks = self.consecutive_rollbacks >= 3

                if is_stuck_by_error or is_stuck_by_rollbacks:
                    self.log_event("STUCK_DETECTED", f"Stuck state detected on iteration {iteration}. Repeating error: {is_stuck_by_error}, rollbacks: {self.consecutive_rollbacks}.")
                    self.perturbation_feedback = "Warning: Stuck state detected due to repeating error or multiple rollbacks. Please change your design/strategy to fix the error."

                verify_result = self.runner.run_tests()
                verify_success = verify_result["success"]

                event_type = "PERFORMANCE_DEGRADATION" if is_degraded else "ROLLBACK"
                log_msg = f"Iteration {iteration} failed performance check ({'; '.join(degradation_reasons)}). Rolled back to stable version {version_idx}." if is_degraded else f"Iteration {iteration} failed unit tests. Rolled back to stable version {version_idx}."

                rollback_details = {
                    "iteration": iteration,
                    "diff": diff_str,
                    "test_failure": {
                        "stdout": test_result["stdout"],
                        "stderr": test_result["stderr"],
                        "returncode": test_result["returncode"]
                    },
                    "rollback_verification": {
                        "success": verify_success,
                        "stdout": verify_result["stdout"],
                        "stderr": verify_result["stderr"]
                    }
                }
                if is_degraded:
                    rollback_details["degradation_reasons"] = degradation_reasons

                self.log_event(event_type, log_msg, rollback_details)

                if version_idx > 0 and not verify_success:
                    self.save_execution_log()
                    return False

            time.sleep(1.0)


if __name__ == "__main__":
    engine = SelfImprovementEngine()
    engine.run()
