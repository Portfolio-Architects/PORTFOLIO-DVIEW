import os
import re

history_dir = r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\self_improvement_loop\history"
files = os.listdir(history_dir)

versions = []
failed_versions = []
diffs = []
test_files = []

for f in files:
    m = re.match(r"target_module\.v(\d+)\.py", f)
    if m:
        versions.append(int(m.group(1)))
        
    m_fail = re.match(r"target_module\.v(\d+)\.failed\.py", f)
    if m_fail:
        failed_versions.append(int(m_fail.group(1)))
        
    m_diff = re.match(r"patch_v(\d+)\.diff", f)
    if m_diff:
        diffs.append(int(m_diff.group(1)))
        
    m_test = re.match(r"test_target_module\.v(\d+)\.py", f)
    if m_test:
        test_files.append(int(m_test.group(1)))

versions.sort()
failed_versions.sort()
diffs.sort()
test_files.sort()

print(f"Total stable versions found: {len(versions)}")
print(f"Min version: {versions[0] if versions else None}")
print(f"Max version: {versions[-1] if versions else None}")
print(f"Failed versions: {failed_versions}")
print(f"Total diff patches: {len(diffs)}")
print(f"Total test file snapshots: {len(test_files)}")

# Check if there is a gap or missing version
gaps = []
for i in range(len(versions) - 1):
    if versions[i+1] - versions[i] > 1:
        gaps.append((versions[i], versions[i+1]))
print(f"Gaps in stable versions: {gaps}")
