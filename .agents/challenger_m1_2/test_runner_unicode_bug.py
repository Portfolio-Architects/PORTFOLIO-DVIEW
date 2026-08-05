import sys
import os
import tempfile
sys.path.insert(0, ".")

from recursive_self_improvement.runner import TestRunner

with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".py", delete=False) as f:
    f.write("import sys\nprint('Hello Unicode 🚀')\n")
    test_path = f.name

try:
    runner = TestRunner(test_path)
    res = runner.run_tests()
    print("Success:", res["success"])
    print("Returncode:", res["returncode"])
    print("Stdout:", res["stdout"])
    print("Stderr:", res["stderr"])
finally:
    if os.path.exists(test_path):
        os.remove(test_path)
