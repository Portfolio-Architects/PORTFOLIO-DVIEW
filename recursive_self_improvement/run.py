import sys
import os
import unittest
from pathlib import Path

# Add workspace root and recursive_self_improvement directory to sys.path
base_dir = Path(__file__).parent.parent.resolve()
rsi_dir = Path(__file__).parent.resolve()
sys.path.insert(0, str(base_dir))
sys.path.insert(0, str(rsi_dir))

try:
    from recursive_self_improvement.engine import SelfImprovementEngine
    from recursive_self_improvement.reporter import ReportGenerator
    from recursive_self_improvement import config
except ImportError:
    from engine import SelfImprovementEngine
    from reporter import ReportGenerator
    import config


def print_summary(execution_log):
    print("\n" + "=" * 60)
    print("           SELF-IMPROVEMENT LOOP RUN RESUME SUMMARY")
    print("=" * 60)
    
    for event in execution_log:
        event_type = event.get("event_type")
        message = event.get("message")
        details = event.get("details", {}) or {}
        
        if event_type in ("START", "LOOP_START"):
            print(f"\n[+] System Startup: {message}")
        elif event_type == "INFO":
            print(f"    [*] Info: {message}")
        elif event_type == "ITERATION_START":
            parts = message.split()
            iter_num = parts[2] if len(parts) > 2 else "X"
            print(f"\n--- Iteration {iter_num} ---")
        elif event_type == "RATE_LIMIT":
            print(f"    [!] Rate Limit Handled: {message}")
        elif event_type == "ROLLBACK":
            iter_num = details.get("iteration", "unknown")
            print(f"    [X] Rollback Triggered: {message}")
            print(f"        - Rollback Verification: {'PASSED' if details.get('rollback_verification', {}).get('success') else 'FAILED'}")
        elif event_type in ("SUCCESS", "ACCEPT_NEW_BASELINE"):
            iter_num = details.get("iteration")
            print(f"    [OK] {message}")
        elif event_type == "STOP_SIGNAL":
            print(f"\n[+] Stopped: {message}")
        elif event_type == "FINISHED":
            print(f"\n[+] Status: {message}")
        elif event_type == "REPORT_GENERATED":
            print(f"\n[+] Report Generated: {message}")
            
    print("\n" + "=" * 60)


def main():
    print("Starting Self-Improvement Loop Run Resume...")
    
    # 1. Initialize SelfImprovementEngine (which will auto-resume from history)
    print("Initializing SelfImprovementEngine...")
    engine = SelfImprovementEngine()
    
    print("Running self-improvement loop...")
    loop_success = engine.run()
    
    # 2. Ensure ReportGenerator CLI step generates final report
    log_path = os.path.join(engine.history_dir, "execution_log.json")
    report_output_path = getattr(config, "REPORT_OUTPUT_PATH", os.path.join(config.BASE_DIR, "IMPROVEMENT_REPORT.md"))
    
    print("Generating audit report with ReportGenerator...")
    reporter = ReportGenerator(log_path, engine.history_dir, report_output_path)
    report_content = reporter.generate_markdown_report()
    print(f"Report successfully saved to {report_output_path}")

    # 3. Print execution summary
    print_summary(engine.execution_log)
    
    # 4. Discover and run all unit tests
    print("\n" + "=" * 60)
    print("           RUNNING UNIT TEST SUITE (DISCOVERY)")
    print("=" * 60)
    
    loader = unittest.TestLoader()
    suite = loader.discover(
        start_dir=str(rsi_dir),
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
