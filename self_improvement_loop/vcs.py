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
        with open(version_path, "w", encoding="utf-8") as f:
            f.write(target_code)

        if test_code is not None:
            test_version_path = os.path.join(self.history_dir, f"test_target_module.v{version_idx}.py")
            with open(test_version_path, "w", encoding="utf-8") as f:
                f.write(test_code)
        elif self.test_file and os.path.exists(self.test_file):
            test_version_path = os.path.join(self.history_dir, f"test_target_module.v{version_idx}.py")
            try:
                with open(self.test_file, "r", encoding="utf-8") as f:
                    t_code = f.read()
                with open(test_version_path, "w", encoding="utf-8") as f:
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
        with open(patch_path, "w", encoding="utf-8") as f:
            f.write(diff_str)
        return diff_str

    def restore_version(self, version_idx: int) -> str:
        """
        Copies the snapshot from history/target_module.v{version_idx}.py back to target_module.py
        and test_target_module.v{version_idx}.py back to test_target_module.py if it exists.
        Returns the target file content.
        """
        version_path = os.path.join(self.history_dir, f"target_module.v{version_idx}.py")
        with open(version_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        with open(self.target_file, "w", encoding="utf-8") as f:
            f.write(content)
        
        if self.test_file:
            test_version_path = os.path.join(self.history_dir, f"test_target_module.v{version_idx}.py")
            if os.path.exists(test_version_path):
                with open(test_version_path, "r", encoding="utf-8") as f:
                    test_content = f.read()
                with open(self.test_file, "w", encoding="utf-8") as f:
                    f.write(test_content)
        
        return content

    def rollback(self, version_idx: int) -> str:
        """
        Rolls back the target and test files to the specified version.
        """
        return self.restore_version(version_idx)

