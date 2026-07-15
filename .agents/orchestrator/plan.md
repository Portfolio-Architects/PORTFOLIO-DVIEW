# Project Plan — Recursive Background Self-Improvement Loop

## Goal
Implement a recursive background self-improvement loop for `target_module.py` starting from version v12. The loop will continuously add mathematical, statistical, and optimization features, update unit tests, save history versions/patches, handle safety guardrails (5-hour timeout, API limits, rollbacks), and support graceful stop on a "중단" command.

## Complexity Assessment
- **Scope**: Modifying `engine.py`, `simulator.py`, `config.py`, or writing a continuous `run_background.py` script that can run asynchronously.
- **Risk**: Infinite loops without resource limits, rate limit issues, and test failures.
- **Complexity**: Medium. Requires a robust background task running Python, checking for stop flags, and saving incremental versions.

## Milestones & Decomposition

| Milestone | Name | Objective | Status |
|-----------|------|-----------|--------|
| M1 | Exploration & Design | Analyze existing loop engine, simulator, and test suite. Design the v12+ feature expansion and stop-signal mechanism. | PLANNED |
| M2 | Engine & Simulator Enhancement | Extend the simulator to support v12 (trigonometric), v13 (statistics), v14 (matrix operations), v15 (optimization), and infinite v16+ improvements. Ensure test cases are updated automatically. | PLANNED |
| M3 | Background Orchestration & Guardrails | Implement `run_background.py` supporting continuous execution, safety timeouts, token budgets, and checking for a "중단" flag file. | PLANNED |
| M4 | Execution & Monitoring | Launch the background loop, monitor its progress, and verify that it updates `target_module.py` to v12, v13, v14, etc. | PLANNED |
| M5 | Verification & Stop Handling | Verify that the stop signal gracefully shuts down the loop, saving the final stable version and status report. | PLANNED |

## Verification Strategy
- Run unit tests at each iteration.
- Verify `self_improvement_loop/history/` contains correct `.py` versions and `.diff` patches.
- Verify log events for rate limits, timeouts, and rollbacks.
- Verify stop flag file halts execution cleanly.
