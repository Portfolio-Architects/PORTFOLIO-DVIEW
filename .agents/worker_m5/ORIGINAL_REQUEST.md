## 2026-07-15T00:04:56+09:00
You are the Worker for Milestone 5 (E2E Verification & Demo) of the Self-Improvement Loop project.
Your working directory is: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m5.

Your task is to:
1. Implement `self_improvement_loop/run.py` to act as the main CLI entry point:
   - It should reset the `target_module.py` file to the initial buggy state (Calculator with buggy `add` method, lacking `subtract` and `multiply`).
   - It should run the `SelfImprovementEngine` loop.
   - It should print a clear, readable execution summary of the self-improvement loop to stdout, detailing what happened at each iteration (bug fix in v1, rate limit handled & subtract added in v2, multiply added in v3, syntax error caught and rollback to v3 in v4).
   - It should discover and execute all unit tests inside the `self_improvement_loop` directory (using python's built-in `unittest` discovery), displaying the test results and confirming that all tests pass.
2. Execute `run.py` using the virtual environment `.venv\Scripts\python.exe` and capture the entire output.
3. Verify that the output shows the loop starting, the 3 successful improvements (v1, v2, v3), the rate limit retry, the rollback to v3 on iteration 4, and the final unit test suite execution passing successfully.
4. Record your changes and the captured execution output in `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m5\changes.md`.
5. Write a handoff.md and send a completion message to the parent orchestrator.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT
hardcode test results, create dummy/facade implementations, or
circumvent the intended task. A Forensic Auditor will independently
verify your work. Integrity violations WILL be detected and your
work WILL be rejected.
