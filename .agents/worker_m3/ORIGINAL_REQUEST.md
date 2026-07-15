## 2026-07-14T15:00:13Z

You are the Worker for Milestone 3 (Mock LLM Simulator) of the Self-Improvement Loop project.
Your working directory is: c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m3.

Your task is to:
1. Implement `self_improvement_loop/simulator.py` containing the `MockLLMSimulator` class:
   - `get_improved_code(current_code: str, iteration: int, inject_syntax_error: bool = False) -> str`: Returns updated target code.
   - Design the simulator states:
     - **Iteration 1**: Fixes the bug in `add` (changing `return a - b` to `return a + b`).
     - **Iteration 2**: Adds the `subtract` method (returns `a - b`).
     - **Iteration 3**: Adds the `multiply` method (returns `a * b`).
     - **Syntax Error Injection**: If `inject_syntax_error` is True, returns code with a syntax error (e.g. missing a colon in a method signature).
     - **Fallback**: For any other iteration, return `current_code`.
2. Verify your implementation:
   - Run a short check in `.venv\Scripts\python.exe` to verify that `MockLLMSimulator` returns the correct strings for each state and iteration.
3. Record your changes in `c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\.agents\worker_m3\changes.md`.
4. Write a handoff.md and send a completion message to the parent orchestrator.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT
hardcode test results, create dummy/facade implementations, or
circumvent the intended task. A Forensic Auditor will independently
verify your work. Integrity violations WILL be detected and your
work WILL be rejected.
