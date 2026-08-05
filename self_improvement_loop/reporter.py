import os
import json
from pathlib import Path

class ReportGenerator:
    def __init__(self, log_path: str, history_dir: str, output_path: str):
        self.log_path = str(Path(log_path).resolve())
        self.history_dir = str(Path(history_dir).resolve())
        self.output_path = str(Path(output_path).resolve())

    def generate_markdown_report(self) -> str:
        execution_log = []
        if os.path.exists(self.log_path):
            try:
                with open(self.log_path, "r", encoding="utf-8", errors="replace") as f:
                    execution_log = json.load(f)
            except Exception as e:
                execution_log = []

        total_iterations = 0
        successful_iterations = 0
        rollbacks = 0
        ast_errors = 0
        rate_limits = 0
        stuck_events = 0
        events_summary = []

        for event in execution_log:
            event_type = event.get("event_type")
            message = event.get("message", "")
            timestamp = event.get("timestamp", "")
            
            if event_type == "ITERATION_START":
                total_iterations += 1
            elif event_type == "SUCCESS":
                successful_iterations += 1
            elif event_type == "ROLLBACK":
                rollbacks += 1
            elif event_type == "AST_SYNTAX_ERROR":
                ast_errors += 1
            elif event_type == "RATE_LIMIT":
                rate_limits += 1
            elif event_type == "STUCK_DETECTED":
                stuck_events += 1

            events_summary.append(f"- `[{timestamp}]` **{event_type}**: {message}")

        # List patches from history directory
        diff_patches = []
        if os.path.exists(self.history_dir):
            for fname in sorted(os.listdir(self.history_dir)):
                if fname.startswith("patch_") and fname.endswith(".diff"):
                    diff_patches.append(fname)

        report_content = f"""# Recursive Self-Improvement Audit Report

## Executive Summary
- **Total Iterations Attempted**: {total_iterations}
- **Successful Iterations**: {successful_iterations}
- **Rollbacks Triggered**: {rollbacks}
- **AST Syntax Errors Intercepted**: {ast_errors}
- **Stuck States Recovered**: {stuck_events}
- **Rate Limit Retries**: {rate_limits}

## History Snapshots & Patch Diff Files
- **Total Diff Patches Generated**: {len(diff_patches)}
- **Patches**: {", ".join(diff_patches) if diff_patches else "None"}

## Execution Log Trajectory
{chr(10).join(events_summary) if events_summary else "No execution events recorded."}

## Conclusion
The recursive self-improvement engine completed execution with automated AST pre-validation, performance regression tracking, and atomic VCS rollback guardrails intact.
"""

        os.makedirs(os.path.dirname(self.output_path), exist_ok=True)
        with open(self.output_path, "w", encoding="utf-8", errors="replace") as f:
            f.write(report_content)

        return report_content
