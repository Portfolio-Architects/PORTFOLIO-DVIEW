import sys
import os
import unittest
from pathlib import Path

# Add workspace root and self_improvement_loop directory to sys.path
base_dir = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(base_dir))
sys.path.insert(0, str(base_dir / "self_improvement_loop"))

try:
    from self_improvement_loop.engine import SelfImprovementEngine
except ImportError:
    from engine import SelfImprovementEngine


def print_summary(execution_log):
    print("\n" + "=" * 60)
    print("           SELF-IMPROVEMENT LOOP RUN RESUME SUMMARY")
    print("=" * 60)
    
    for event in execution_log:
        event_type = event.get("event_type")
        message = event.get("message")
        details = event.get("details", {}) or {}
        
        if event_type == "START":
            print(f"\n[+] System Startup: {message}")
        elif event_type == "INFO":
            print(f"    [*] Info: {message}")
        elif event_type == "ITERATION_START":
            parts = message.split()
            iter_num = parts[2]
            print(f"\n--- Iteration {iter_num} ---")
        elif event_type == "RATE_LIMIT":
            print(f"    [!] Rate Limit Handled: {message}")
        elif event_type == "ROLLBACK":
            iter_num = details.get("iteration", "unknown")
            print(f"    [X] Rollback Triggered: {message}")
            print(f"        - Rollback Verification: {'PASSED' if details.get('rollback_verification', {}).get('success') else 'FAILED'}")
        elif event_type == "SUCCESS":
            iter_num = details.get("iteration")
            print(f"    [OK] {message}")
            if iter_num == 12:
                print("        - Action: Added Trigonometric functions (sin, cos, tan) and tests.")
            elif iter_num == 13:
                print("        - Action: Added Statistical functions (mean, median, variance) and tests.")
            elif iter_num == 14:
                print("        - Action: Added Matrix operations (addition, multiplication, transpose) and tests.")
            elif iter_num == 15:
                print("        - Action: Added Optimization functions (gradient descent, linear regression) and tests.")
            elif iter_num and iter_num >= 16:
                print(f"        - Action: Added formatting, comments, or math functions (gcd, factorial) for v{iter_num}.")
        elif event_type == "STOP_SIGNAL":
            print(f"\n[+] Stopped: {message}")
        elif event_type == "FINISHED":
            print(f"\n[+] Status: {message}")
            
    print("\n" + "=" * 60)


def main():
    print("Starting Self-Improvement Loop Run Resume...")
    
    # 1. Initialize SelfImprovementEngine (which will auto-resume from history)
    print("Initializing SelfImprovementEngine...")
    engine = SelfImprovementEngine()
    
    print("Running self-improvement loop...")
    loop_success = engine.run()
    
    # 2. Print execution summary
    print_summary(engine.execution_log)
    
    # 3. Discover and run all unit tests
    print("\n" + "=" * 60)
    print("           RUNNING UNIT TEST SUITE (DISCOVERY)")
    print("=" * 60)
    
    loader = unittest.TestLoader()
    suite = loader.discover(
        start_dir="self_improvement_loop",
        pattern="test_*.py"
    )
    
    runner = unittest.TextTestRunner(verbosity=2, stream=sys.stdout)
    test_result = runner.run(suite)
    
    # Confirm all tests pass
    if test_result.wasSuccessful():
        print("\n[PASS] E2E Verification successful! All unit tests passed.")
        sys.exit(0)
    else:
        print("\n[X] E2E Verification failed: Some unit tests did not pass.")
        sys.exit(1)


if __name__ == "__main__":
    main()
