# Self-Improvement Loop Enhancement Plan

This plan details the implementation steps to enhance the self-improvement loop engine in `self_improvement_loop/` with test co-evolution, stuck and loop detection, rollback synchronization, and continuous optimization drives.

## Architecture & Requirements

### R1. Test Code Co-evolution & Rollback Sync
- **VCS Synchronization**: Update `CustomVCS` to manage both `target_module.py` and `test_target_module.py`.
  - `save_version(version_idx, target_code, test_code)`: Saves both files as `target_module.vX.py` and `test_target_module.vX.py`.
  - `rollback(version_idx)`: Restores both `target_module.py` and `test_target_module.py` back to their stable `v{version_idx}` versions in sync.
- **Dynamic Test Co-evolution**:
  - The simulator will generate target code and test code modifications.
  - The engine reads the test file state after the simulator updates it, and saves it in VCS alongside the target code.
  - On rollback, both files must be restored to their stable versions to prevent test stagnation or syntax mismatches.

### R2. Stuck & Loop Detection
- **Code Hash Tracking**: Hash each generated target code snippet. If the hash matches any of the last 3 iterations, it is flagged as stuck.
- **Error Loop Tracking**: Track consecutive failures. If the same error message (stderr/exception) repeats 2 or more times, or if 3 consecutive rollbacks occur, it is flagged as stuck.
- **Perturbation Feedback**: If a stuck state is detected, inject a perturbation feedback prompt (e.g., warnings to change the design/strategy) into the LLM/simulator.
- **Simulator Update**: Update `MockLLMSimulator` to support the perturbation feedback interface and break any simulated loops upon receiving it.

### R3. Optimization & Sustainability
- **Continuous Drive**: Update the mock simulator to propose new scenarios, optimization, or refactoring in higher iterations (e.g., iterations 34+).
- **Stable Execution**: Execute at least 20 stable iterations of the loop, verifying that tests pass and the engine logs all events correctly.

---

## Implementation Steps

### Phase 1: Assess and Prepare
- [ ] Inspect existing engine, VCS, and simulator code.
- [ ] Create test scenarios for loop/stuck detection and verification of dual rollback.

### Phase 2: Implement VCS and Engine Upgrades (Worker Task)
- [ ] Update `vcs.py` to support dual file saving and rollback.
- [ ] Update `engine.py` to track code hashes, track consecutive errors, detect stuck states, and inject perturbation feedback.
- [ ] Update `simulator.py` to accept the `perturbation_feedback` argument in `get_improved_code` and implement loop-breaking logic for testing.
- [ ] Add continuous optimization scenarios (e.g., standard deviation, percentile, Z-score) for iterations 34+ to show active expansion.

### Phase 3: Unit and Integration Testing (Reviewer / Challenger Task)
- [ ] Run `test_engine.py` and ensure existing tests pass.
- [ ] Write new tests in `test_engine.py` to verify:
  - Sync rollback of target and test files.
  - Stuck and loop detection (hash match and repeating error).
  - Injection of perturbation feedback and loop resolution.
- [ ] Execute `run.py` to run the self-improvement loop for at least 20 stable iterations (e.g., resuming from v33 to v54+).

### Phase 4: Verification & Handoff
- [ ] Confirm all tests pass.
- [ ] Verify execution log is written correctly.
- [ ] Write `handoff.md` and report completion to parent.
