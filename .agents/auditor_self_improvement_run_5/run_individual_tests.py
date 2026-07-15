import subprocess
import sys

tests = [
    # Engine tests
    "self_improvement_loop.test_engine.TestSelfImprovementEngine.test_engine_initialization",
    "self_improvement_loop.test_engine.TestSelfImprovementEngine.test_engine_api_limit",
    "self_improvement_loop.test_engine.TestSelfImprovementEngine.test_engine_timeout",
    "self_improvement_loop.test_engine.TestSelfImprovementEngine.test_engine_session_timeout",
    "self_improvement_loop.test_engine.TestSelfImprovementEngine.test_engine_token_budget",
    "self_improvement_loop.test_engine.TestSelfImprovementEngine.test_sync_rollback",
    "self_improvement_loop.test_engine.TestSelfImprovementEngine.test_stuck_detection_by_hash",
    "self_improvement_loop.test_engine.TestSelfImprovementEngine.test_stuck_detection_by_repeating_error",
    "self_improvement_loop.test_engine.TestSelfImprovementEngine.test_stuck_detection_by_consecutive_rollbacks",
    # Simulator tests
    "self_improvement_loop.test_simulator.TestMockLLMSimulator",
    # Target module tests
    "self_improvement_loop.test_target_module.TestCalculator"
]

all_passed = True
results = []

for test in tests:
    print(f"Running {test}...")
    res = subprocess.run(
        [sys.executable, "-m", "unittest", test],
        capture_output=True,
        text=True
    )
    passed = res.returncode == 0
    results.append((test, passed, res.stdout, res.stderr))
    if passed:
        print(f"  [PASS]")
    else:
        print(f"  [FAIL]")
        print(res.stderr)
        all_passed = False

print("\n=== Summary ===")
for test, passed, _, _ in results:
    status = "PASS" if passed else "FAIL"
    print(f"{test}: {status}")

if all_passed:
    print("\nAll tests passed successfully when run individually!")
    sys.exit(0)
else:
    print("\nSome tests failed.")
    sys.exit(1)
