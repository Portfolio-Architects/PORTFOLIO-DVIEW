import unittest
import os
import shutil

try:
    from self_improvement_loop.vcs import CustomVCS
    from self_improvement_loop import config
except ImportError:
    from vcs import CustomVCS
    import config


class TestCustomVCS(unittest.TestCase):
    def setUp(self):
        self.test_dir = os.path.join(config.BASE_DIR, f"test_vcs_history_{self._testMethodName}")
        self.target_file = os.path.join(self.test_dir, "target_module.py")
        self.test_file = os.path.join(self.test_dir, "test_target_module.py")
        os.makedirs(self.test_dir, exist_ok=True)
        
        with open(self.target_file, "w", encoding="utf-8", errors="replace") as f:
            f.write("# Target Module\n")
        with open(self.test_file, "w", encoding="utf-8", errors="replace") as f:
            f.write("# Test Module\n")
            
        self.vcs = CustomVCS(self.test_dir, self.target_file, self.test_file)

    def tearDown(self):
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)

    def test_dual_snapshot_save(self):
        self.vcs.save_version(1, "code_v1", "test_v1")
        target_snap = os.path.join(self.test_dir, "target_module.v1.py")
        test_snap = os.path.join(self.test_dir, "test_target_module.v1.py")
        
        self.assertTrue(os.path.exists(target_snap))
        self.assertTrue(os.path.exists(test_snap))
        
        with open(target_snap, "r", encoding="utf-8", errors="replace") as f:
            self.assertEqual(f.read(), "code_v1")
        with open(test_snap, "r", encoding="utf-8", errors="replace") as f:
            self.assertEqual(f.read(), "test_v1")

    def test_generate_diff_patch(self):
        diff_str = self.vcs.generate_diff(1, "line1\n", "line1\nline2\n")
        patch_file = os.path.join(self.test_dir, "patch_v1.diff")
        
        self.assertTrue(os.path.exists(patch_file))
        self.assertIn("+line2", diff_str)

    def test_restore_and_rollback(self):
        self.vcs.save_version(1, "original_code", "original_test")
        
        # Overwrite files
        with open(self.target_file, "w", encoding="utf-8", errors="replace") as f:
            f.write("corrupted_code")
        with open(self.test_file, "w", encoding="utf-8", errors="replace") as f:
            f.write("corrupted_test")

        # Rollback to version 1
        restored = self.vcs.rollback(1)
        self.assertEqual(restored, "original_code")
        
        with open(self.target_file, "r", encoding="utf-8", errors="replace") as f:
            self.assertEqual(f.read(), "original_code")
        with open(self.test_file, "r", encoding="utf-8", errors="replace") as f:
            self.assertEqual(f.read(), "original_test")

    def test_has_version(self):
        self.assertFalse(self.vcs.has_version(99))
        self.vcs.save_version(99, "v99")
        self.assertTrue(self.vcs.has_version(99))


if __name__ == "__main__":
    unittest.main()
