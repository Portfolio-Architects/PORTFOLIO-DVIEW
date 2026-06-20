import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

brain_dir = r"C:\Users\ocs56\.gemini\antigravity\brain"
keywords = ["아키텍처", "레이어", "리팩토링"]

found_plans = []
for folder in os.listdir(brain_dir):
    folder_path = os.path.join(brain_dir, folder)
    if os.path.isdir(folder_path):
        plan_path = os.path.join(folder_path, "implementation_plan.md")
        if os.path.exists(plan_path):
            try:
                with open(plan_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if any(kw in content for kw in keywords) and ("dview" in content.lower() or "apart" in content.lower()):
                        # get the title (first few lines)
                        lines = content.split('\n')
                        title = next((line for line in lines if line.startswith('#')), "Untitled")
                        found_plans.append((folder, title, content[:600] + "..."))
            except Exception as e:
                pass

print(f"Found {len(found_plans)} implementation plans matching conditions:")
for folder, title, snippet in found_plans:
    print(f"=========================================\nFolder: {folder}\nTitle: {title}\nSnippet:\n{snippet}\n")






