import os
import difflib

class CustomVCS:
    def __init__(self, history_dir: str, target_file: str, test_file: str = None):
        """
        Initializes the VCS directories and tracks the target and test files.
        """
        self.history_dir = history_dir
        self.target_file = target_file
        self.test_file = test_file
        os.makedirs(self.history_dir, exist_ok=True)

    def save_version(self, version_idx: int, target_code: str, test_code: str = None) -> None:
        """
        Writes the target_code to history/target_module.v{version_idx}.py
        and test_code to history/test_target_module.v{version_idx}.py if test_code or test_file is available.
        """
        os.makedirs(self.history_dir, exist_ok=True)
        version_path = os.path.join(self.history_dir, f"target_module.v{version_idx}.py")
        with open(version_path, "w", encoding="utf-8", errors="replace") as f:
            f.write(target_code)

        if test_code is not None:
            test_version_path = os.path.join(self.history_dir, f"target_test_module.v{version_idx}.py")
            with open(test_version_path, "w", encoding="utf-8", errors="replace") as f:
                f.write(test_code)
        elif self.test_file and os.path.exists(self.test_file):
            test_version_path = os.path.join(self.history_dir, f"target_test_module.v{version_idx}.py")
            try:
                with open(self.test_file, "r", encoding="utf-8", errors="replace") as f:
                    t_code = f.read()
                with open(test_version_path, "w", encoding="utf-8", errors="replace") as f:
                    f.write(t_code)
            except Exception:
                pass

    def generate_diff(self, version_idx: int, old_code: str, new_code: str) -> str:
        """
        Compares old_code and new_code using python's built-in difflib.unified_diff,
        writes the patch to history/patch_v{version_idx}.diff, and returns the patch string.
        """
        old_lines = old_code.splitlines(keepends=True)
        new_lines = new_code.splitlines(keepends=True)
        
        from_file = f"target_module.v{version_idx-1}.py" if version_idx > 0 else "target_module.initial.py"
        to_file = f"target_module.v{version_idx}.py"
        
        diff_generator = difflib.unified_diff(
            old_lines,
            new_lines,
            fromfile=from_file,
            tofile=to_file,
            lineterm='\n'
        )
        diff_str = "".join(diff_generator)
        
        os.makedirs(self.history_dir, exist_ok=True)
        patch_path = os.path.join(self.history_dir, f"patch_v{version_idx}.diff")
        with open(patch_path, "w", encoding="utf-8", errors="replace") as f:
            f.write(diff_str)
        return diff_str

    def restore_version(self, version_idx: int) -> str:
        """
        Copies the snapshot from history/target_module.v{version_idx}.py back to target_module.py
        and test_target_module.v{version_idx}.py back to test_target_module.py if it exists.
        Gracefully handles early limit aborts where snapshot files for version_idx do not exist yet
        by checking os.path.exists before opening and falling back to initial baseline file (v0 snapshot).
        Raises FileNotFoundError only if neither target_module.v{version_idx}.py nor target_module.v0.py exists.
        Returns the target file content.
        """
        version_path = os.path.join(self.history_dir, f"target_module.v{version_idx}.py")
        content = None

        if os.path.exists(version_path):
            with open(version_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
        else:
            # Fallback to initial baseline file (v0) if available
            v0_path = os.path.join(self.history_dir, "target_module.v0.py")
            if os.path.exists(v0_path):
                with open(v0_path, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
            else:
                raise FileNotFoundError(f"Snapshot version v{version_idx} and v0 baseline missing in history directory {self.history_dir}")

        with open(self.target_file, "w", encoding="utf-8", errors="replace") as f:
            f.write(content)

        try:
            os.utime(self.target_file, None)
        except Exception:
            pass

        # Invalidate pycache for target_module
        target_dir = os.path.dirname(os.path.abspath(self.target_file))
        pycache_dir = os.path.join(target_dir, "__pycache__")
        if os.path.exists(pycache_dir):
            try:
                for pyc in os.listdir(pycache_dir):
                    if pyc.startswith("target_module"):
                        os.remove(os.path.join(pycache_dir, pyc))
            except Exception:
                pass

        if self.test_file:
            test_version_path = os.path.join(self.history_dir, f"target_test_module.v{version_idx}.py")
            if not os.path.exists(test_version_path):
                test_version_path = os.path.join(self.history_dir, f"test_target_module.v{version_idx}.py")
            
            test_content = None
            if os.path.exists(test_version_path):
                with open(test_version_path, "r", encoding="utf-8", errors="replace") as f:
                    test_content = f.read()
            else:
                test_v0_path = os.path.join(self.history_dir, "target_test_module.v0.py")
                if not os.path.exists(test_v0_path):
                    test_v0_path = os.path.join(self.history_dir, "test_target_module.v0.py")
                if os.path.exists(test_v0_path):
                    with open(test_v0_path, "r", encoding="utf-8", errors="replace") as f:
                        test_content = f.read()

            if test_content is not None and os.path.exists(self.test_file):
                with open(self.test_file, "w", encoding="utf-8", errors="replace") as f:
                    f.write(test_content)
                try:
                    os.utime(self.test_file, None)
                except Exception:
                    pass

        return content

    def rollback(self, version_idx: int) -> str:
        """
        Rolls back the target and test files to the specified version.
        """
        return self.restore_version(version_idx)

    def has_version(self, version_idx: int) -> bool:
        """
        Checks whether snapshot files for version_idx exist.
        """
        version_path = os.path.join(self.history_dir, f"target_module.v{version_idx}.py")
        return os.path.exists(version_path)
