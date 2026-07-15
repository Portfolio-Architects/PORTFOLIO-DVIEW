import unittest
import os
import shutil
import time

try:
    from self_improvement_loop.engine import SelfImprovementEngine
    from self_improvement_loop import config
except ImportError:
    from engine import SelfImprovementEngine
    import config

class TestSelfImprovementEngine(unittest.TestCase):
    def setUp(self):
        # Backup target_module.py
        self.target_backup = config.TARGET_FILE + ".backup"
        if os.path.exists(config.TARGET_FILE):
            shutil.copyfile(config.TARGET_FILE, self.target_backup)

        # Backup test_target_module.py
        self.test_backup = config.TEST_FILE + ".backup"
        if os.path.exists(config.TEST_FILE):
            shutil.copyfile(config.TEST_FILE, self.test_backup)

        # Write initial Calculator code with the bug to target_module.py
        initial_code = (
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        # BUG: Returns subtraction instead of addition\n"
            "        return a - b\n"
        )
        with open(config.TARGET_FILE, "w", encoding="utf-8") as f:
            f.write(initial_code)

        # Use a temporary test history directory to avoid polluting actual run history
        self.original_history_dir = config.HISTORY_DIR
        self.test_history_dir = os.path.join(config.BASE_DIR, f"test_history_{self._testMethodName}")
        config.HISTORY_DIR = self.test_history_dir
        if os.path.exists(self.test_history_dir):
            shutil.rmtree(self.test_history_dir)

    def tearDown(self):
        # Restore target_module.py
        if os.path.exists(self.target_backup):
            shutil.copyfile(self.target_backup, config.TARGET_FILE)
            os.remove(self.target_backup)

        # Restore test_target_module.py
        if os.path.exists(self.test_backup):
            shutil.copyfile(self.test_backup, config.TEST_FILE)
            os.remove(self.test_backup)

        # Clean up test history
        if os.path.exists(self.test_history_dir):
            shutil.rmtree(self.test_history_dir)

        # Restore config history dir path
        config.HISTORY_DIR = self.original_history_dir

        # Force uncache target_module to avoid test pollution via sys.modules
        import sys
        for key in list(sys.modules.keys()):
            if "target_module" in key:
                del sys.modules[key]

    def test_engine_initialization(self):
        engine = SelfImprovementEngine()
        self.assertEqual(engine.target_file, config.TARGET_FILE)
        self.assertEqual(engine.test_file, config.TEST_FILE)

    def test_engine_api_limit(self):
        engine = SelfImprovementEngine()
        # Set small API limit
        engine.max_api_requests = 2
        engine.max_iterations = 5

        # Run engine
        success = engine.run()
        
        # Verify that the API_LIMIT event is recorded
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("API_LIMIT", event_types)
        self.assertFalse(success)

    def test_engine_timeout(self):
        engine = SelfImprovementEngine()
        # Set negative/extremely small timeout
        engine.timeout_seconds = -1.0

        # Run engine
        success = engine.run()
        
        # Verify that the TIMEOUT event is recorded
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("TIMEOUT", event_types)
        self.assertFalse(success)

    def test_engine_session_timeout(self):
        engine = SelfImprovementEngine()
        # Set negative/extremely small session timeout
        engine.timeout_seconds = 100.0
        engine.session_timeout_seconds = -1.0

        # Run engine
        success = engine.run()
        
        # Verify that the SESSION_TIMEOUT event is recorded
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("SESSION_TIMEOUT", event_types)
        self.assertFalse(success)

    def test_engine_token_budget(self):
        engine = SelfImprovementEngine()
        engine.total_token_budget = 1500
        engine.token_budget_per_iteration = 1000

        success = engine.run()
        
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("TOKEN_BUDGET_EXCEEDED", event_types)
        self.assertFalse(success)

    def test_sync_rollback(self):
        engine = SelfImprovementEngine()
        
        # Test dual file saving
        engine.vcs.save_version(99, "target version 99", "test version 99")
        
        # Restore/rollback to 99
        engine.vcs.rollback(99)
        
        # Verify both files are updated
        with open(engine.target_file, "r", encoding="utf-8") as f:
            target_content = f.read()
        with open(engine.test_file, "r", encoding="utf-8") as f:
            test_content = f.read()
            
        self.assertEqual(target_content, "target version 99")
        self.assertEqual(test_content, "test version 99")

    def test_stuck_detection_by_hash(self):
        # Write valid calculator code so version 0 passes tests
        valid_code = (
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        return a + b\n"
        )
        with open(config.TARGET_FILE, "w", encoding="utf-8") as f:
            f.write(valid_code)

        engine = SelfImprovementEngine()
        engine.max_iterations = 3
        # Configure simulator to simulate stuck by code hash
        engine.simulator.simulate_stuck_hash = True
        
        success = engine.run()
        
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("STUCK_DETECTED", event_types)
        # Should complete successfully once loop is broken
        self.assertTrue(success)

    def test_stuck_detection_by_repeating_error(self):
        # Write valid calculator code so version 0 passes tests
        valid_code = (
            "class Calculator:\n"
            "    def add(self, a, b):\n"
            "        return a + b\n"
        )
        with open(config.TARGET_FILE, "w", encoding="utf-8") as f:
            f.write(valid_code)

        engine = SelfImprovementEngine()
        engine.max_iterations = 3
        # Configure simulator to simulate stuck by error
        engine.simulator.simulate_stuck_error = True
        
        success = engine.run()
        
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("STUCK_DETECTED", event_types)
        # Should complete successfully once loop is broken
        self.assertTrue(success)

    def test_stuck_detection_by_consecutive_rollbacks(self):
        engine = SelfImprovementEngine()
        engine.max_iterations = 4
        
        calls = []
        mock_responses = [
            {"success": False, "stdout": "", "stderr": "Error A", "returncode": 1},
            {"success": True, "stdout": "", "stderr": ""},
            {"success": False, "stdout": "", "stderr": "Error B", "returncode": 1},
            {"success": True, "stdout": "", "stderr": ""},
            {"success": False, "stdout": "", "stderr": "Error C", "returncode": 1},
            {"success": True, "stdout": "", "stderr": ""},
        ]
        
        def mock_run_tests():
            if len(calls) < len(mock_responses):
                resp = mock_responses[len(calls)]
                calls.append(resp)
                return resp
            return {"success": True, "stdout": "", "stderr": ""}
            
        engine.runner.run_tests = mock_run_tests
        
        engine.run()
        
        event_types = [entry["event_type"] for entry in engine.execution_log]
        self.assertIn("STUCK_DETECTED", event_types)

if __name__ == '__main__':
    unittest.main()

