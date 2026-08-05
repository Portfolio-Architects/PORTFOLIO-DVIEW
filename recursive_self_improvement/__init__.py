"""
Recursive Self-Improvement System Package
"""
import sys
from pathlib import Path

# Ensure root is on sys.path
base_dir = str(Path(__file__).parent.parent.resolve())
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)
