import os
import json
import time
import sys
import re
import hashlib

try:
    from self_improvement_loop import config
    from self_improvement_loop.vcs import CustomVCS
    from self_improvement_loop.runner import TestRunner
    from self_improvement_loop.simulator import MockLLMSimulator, RateLimitError
except ImportError:
    import config
    from vcs import CustomVCS
    from runner import TestRunner
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
        self.simulator = MockLLMSimulator()

        # Stuck/loop detection state
        self.recent_hashes = []
        self.consecutive_rollbacks = 0
        self.last_error_message = None
        self.perturbation_feedback = None

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
        # Remove line numbers from python tracebacks (e.g., File "...", line 123)
        normalized = re.sub(r'File\s+"[^"]+",\s+line\s+\d+', 'File "<path>", line <line>', error_msg)
        
        # Remove line numbers from standard formats
        normalized = re.sub(r'\bline\s+\d+\b', 'line <line>', normalized)
        
        # Replace paths in single or double quotes
        normalized = re.sub(r"(['\"])[^\n\r'\"]*?[/\\].*?\1", r"\1<path>\1", normalized)
        
        # Replace unquoted Windows paths (drive letter followed by backslash and path chars)
        normalized = re.sub(r'[a-zA-Z]:\\[^\n\r\s:]+', '<path>', normalized)
        
        # Replace unquoted Unix paths (must contain at least one slash)
        normalized = re.sub(r'/[^\n\r\s:]+/[^\n\r\s:]*', '<path>', normalized)
        
        # Strip all lines and join them to ignore minor whitespace differences
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
            with open(log_path, "w", encoding="utf-8") as f:
                json.dump(self.execution_log, f, indent=4)
            print(f"Execution log saved to {log_path}")
        except Exception as e:
            print(f"Failed to save execution log: {e}", file=sys.stderr)

    def check_stop_signal(self) -> bool:
        """
        Checks if a stop flag file or a stop command is present.
        """
        # Check stop.flag file
        stop_flag_file = getattr(config, "STOP_FLAG_FILE", os.path.join(config.BASE_DIR, "stop.flag"))
        if os.path.exists(stop_flag_file):
            try:
                os.remove(stop_flag_file)
            except Exception:
                pass
            return True

        # Check command.txt file
        command_file = getattr(config, "COMMAND_FILE", os.path.join(config.BASE_DIR, "command.txt"))
        if os.path.exists(command_file):
            try:
                with open(command_file, "r", encoding="utf-8") as f:
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
        
        # Read the current target code
        try:
            with open(self.target_file, "r", encoding="utf-8") as f:
                current_code = f.read()
        except Exception as e:
            self.log_event("ERROR", f"Failed to read current target code: {str(e)}")
            self.save_execution_log()
            return False

        if version_idx == 0:
            try:
                with open(self.test_file, "r", encoding="utf-8") as f:
                    initial_test_code = f.read()
            except Exception:
                initial_test_code = ""
            self.vcs.save_version(0, current_code, initial_test_code)
            self.log_event("SUCCESS", "Initial code saved as version 0.")

        last_stable_code = current_code
        loop_iteration = 0

        # Loop executes continuously until stopped or limit reached
        while True:
            iteration_start_time = time.time()
            loop_iteration += 1
            iteration = version_idx + 1

            # Check graceful stop signal
            if self.check_stop_signal():
                self.log_event("STOP_SIGNAL", "Graceful shutdown requested. Exiting loop.")
                self.save_execution_log()
                return True

            # Check iteration-level timeout
            iteration_elapsed = time.time() - iteration_start_time
            if iteration_elapsed >= self.timeout_seconds:
                self.log_event("TIMEOUT", f"Aborting loop: Iteration duration {iteration_elapsed:.2f}s exceeded TIMEOUT_SECONDS of {self.timeout_seconds}s.")
                self.vcs.rollback(version_idx)
                self.save_execution_log()
                return False

            # Check cumulative session runtime limit (elapsed run time across iterations)
            session_elapsed = time.time() - start_time
            if session_elapsed >= self.session_timeout_seconds:
                self.log_event("SESSION_TIMEOUT", f"Aborting loop: Total duration {session_elapsed:.2f}s exceeded SESSION_TIMEOUT_SECONDS of {self.session_timeout_seconds}s.")
                self.vcs.rollback(version_idx)
                self.save_execution_log()
                return False

            # Check remaining token budget
            remaining_budget = self.total_token_budget - self.cumulative_tokens_used
            if remaining_budget < self.token_budget_per_iteration:
                self.log_event("TOKEN_BUDGET_EXCEEDED", f"Aborting loop: Remaining budget {remaining_budget} is insufficient for the next iteration budget of {self.token_budget_per_iteration}.")
                self.vcs.rollback(version_idx)
                self.save_execution_log()
                return False

            # Check max loop iterations limit
            if iteration > self.max_iterations:
                self.log_event("FINISHED", f"Reached configured MAX_ITERATIONS limit of {self.max_iterations}. Exiting.")
                self.save_execution_log()
                return True

            self.log_event("ITERATION_START", f"Starting iteration {iteration} (Loop run {loop_iteration}).")

            # Trigger a syntax error injection if configured and matches current iteration
            if getattr(self, "inject_syntax_error_iteration", None) is not None:
                inject_syntax_error = (loop_iteration == self.inject_syntax_error_iteration)
            else:
                inject_syntax_error = False

            # Query the simulator with RateLimitError retry handling
            improved_code = None
            while True:
                # Check iteration-level timeout inside retry loop
                iteration_elapsed = time.time() - iteration_start_time
                if iteration_elapsed >= self.timeout_seconds:
                    self.log_event("TIMEOUT", f"Aborting loop: Iteration duration {iteration_elapsed:.2f}s exceeded TIMEOUT_SECONDS of {self.timeout_seconds}s.")
                    self.vcs.rollback(version_idx)
                    self.save_execution_log()
                    return False

                # Check cumulative session runtime limit inside retry loop
                session_elapsed = time.time() - start_time
                if session_elapsed >= self.session_timeout_seconds:
                    self.log_event("SESSION_TIMEOUT", f"Aborting loop: Total duration {session_elapsed:.2f}s exceeded SESSION_TIMEOUT_SECONDS of {self.session_timeout_seconds}s.")
                    self.vcs.rollback(version_idx)
                    self.save_execution_log()
                    return False

                # Check cumulative API/Request Limit
                if self.api_requests_count >= self.max_api_requests:
                    self.log_event("API_LIMIT", f"Aborting loop: Total API requests {self.api_requests_count} reached MAX_API_REQUESTS limit of {self.max_api_requests}.")
                    self.vcs.rollback(version_idx)
                    self.save_execution_log()
                    return False

                # Increment API requests and mock token usage (1000 tokens per call)
                self.api_requests_count += 1
                self.cumulative_tokens_used += 1000

                try:
                    improved_code = self.simulator.get_improved_code(
                        current_code,
                        iteration,
                        inject_syntax_error=inject_syntax_error,
                        perturbation_feedback=self.perturbation_feedback
                    )
                    self.perturbation_feedback = None
                    break
                except RateLimitError as rle:
                    self.log_event("RATE_LIMIT", f"Rate limit encountered on iteration {iteration}. {str(rle)} Sleeping for {rle.reset_seconds}s before retry.")
                    # Sleep, but also check for stop flag during wait
                    sleep_end = time.time() + rle.reset_seconds
                    while time.time() < sleep_end:
                        if self.check_stop_signal():
                            self.log_event("STOP_SIGNAL", "Graceful shutdown requested during rate limit wait. Exiting loop.")
                            self.save_execution_log()
                            return True

                        # Check timeouts during sleep
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

            # Stuck detection by code hash tracking
            code_hash = hashlib.md5(improved_code.encode("utf-8")).hexdigest()
            if code_hash in self.recent_hashes:
                self.log_event("STUCK_DETECTED", f"Stuck state detected on iteration {iteration}: code hash matched one of the last 3 iterations.")
                self.perturbation_feedback = "Warning: Stuck state detected (code duplication loop). Please change your implementation or optimization strategy to produce different code."
            
            self.recent_hashes.append(code_hash)
            if len(self.recent_hashes) > 3:
                self.recent_hashes.pop(0)

            # Write the improved code to the target module
            try:
                with open(self.target_file, "w", encoding="utf-8") as f:
                    f.write(improved_code)
            except Exception as e:
                self.log_event("ERROR", f"Failed to write improved code to target module in iteration {iteration}: {str(e)}")
                self.vcs.rollback(version_idx)
                self.save_execution_log()
                return False

            # Run tests using the test runner
            test_result = self.runner.run_tests()

            if test_result["success"]:
                # Save the new code version
                version_idx = iteration
                self.consecutive_rollbacks = 0
                self.last_error_message = None
                self.perturbation_feedback = None

                try:
                    with open(self.test_file, "r", encoding="utf-8") as f:
                        test_code = f.read()
                except Exception:
                    test_code = ""
                self.vcs.save_version(version_idx, improved_code, test_code)

                # Generate and save the diff patch
                diff_str = self.vcs.generate_diff(version_idx, last_stable_code, improved_code)

                self.log_event("SUCCESS", f"Iteration {iteration} succeeded. Tests passed.", {
                    "iteration": iteration,
                    "diff": diff_str,
                    "stdout": test_result["stdout"],
                    "stderr": test_result["stderr"]
                })

                # Update the current code state and last stable version index
                current_code = improved_code
                last_stable_code = improved_code
            else:
                # Tests failed (including compile or syntax errors)
                # Save the failed version for debug reference
                failed_path = os.path.join(self.history_dir, f"target_module.v{iteration}.failed.py")
                try:
                    with open(failed_path, "w", encoding="utf-8") as f:
                        f.write(improved_code)
                except Exception as e:
                    self.log_event("ERROR", f"Failed to save debug failed version: {str(e)}")

                # Generate the diff patch comparing last stable code with this failed code
                diff_str = self.vcs.generate_diff(iteration, last_stable_code, improved_code)

                # Trigger rollback back to the last stable version
                self.vcs.rollback(version_idx)

                # Stuck detection: error message & rollback count
                error_msg = test_result.get("stderr", "") or test_result.get("stdout", "")
                normalized_error_msg = self.normalize_error_message(error_msg)
                
                is_stuck_by_error = False
                if normalized_error_msg and normalized_error_msg == self.last_error_message:
                    is_stuck_by_error = True
                
                self.last_error_message = normalized_error_msg
                self.consecutive_rollbacks += 1
                is_stuck_by_rollbacks = self.consecutive_rollbacks >= 3

                if is_stuck_by_error or is_stuck_by_rollbacks:
                    self.log_event("STUCK_DETECTED", f"Stuck state detected on iteration {iteration}. Repeating error: {is_stuck_by_error}, rollbacks: {self.consecutive_rollbacks}.")
                    self.perturbation_feedback = "Warning: Stuck state detected due to repeating error or multiple rollbacks. Please change your design/strategy to fix the error."

                # Run tests one final time to verify that the restored code is clean and passes tests
                verify_result = self.runner.run_tests()
                verify_success = verify_result["success"]

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

                self.log_event("ROLLBACK", f"Iteration {iteration} failed. Rolled back to stable version {version_idx}.", rollback_details)

                if not verify_success:
                    self.save_execution_log()
                    return False

            # Add a brief sleep between background runs
            time.sleep(1.0)


if __name__ == "__main__":
    engine = SelfImprovementEngine()
    engine.run()
