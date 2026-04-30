import os
import re

target_dir = r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DTDLS\frontend\src"

pattern = re.compile(r'(https://docs\.google\.com/spreadsheets/d/\$\{SHEET_ID\}/gviz/tq\?tqx=out:csv&sheet=\$\{encodeURIComponent\([^}]+\)\}(?:&headers=1)?)(?!&_t=\$\{Date\.now\(\)\})')

count = 0
for root, dirs, files in os.walk(target_dir):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = pattern.sub(r'\1&_t=${Date.now()}', content)
            
            if new_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {file_path}")
                count += 1

print(f"Total files updated: {count}")
