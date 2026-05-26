import os

search_dir = r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\.next\dev\static\webpack"
search_str = "최근 실거래 등락 비중"

found_files = []
if os.path.exists(search_dir):
    for root, dirs, files in os.walk(search_dir):
        for file in files:
            if file.endswith('.js') and 'MacroDashboardClient' in file:
                path = os.path.join(root, file)
                try:
                    # Let's get the modification time
                    mtime = os.path.getmtime(path)
                    found_files.append((path, mtime))
                except Exception as e:
                    pass

# Sort by mtime descending (most recent first)
found_files.sort(key=lambda x: x[1], reverse=True)

print(f"Found {len(found_files)} hot update files.")
for idx, (path, mtime) in enumerate(found_files[:5]):
    print(f"File {idx}: {path} (mtime: {mtime})")
    # Let's read the first 2000 chars of the file to see what's in it
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            print("Content length:", len(content))
            # Let's write it to a scratch file so we can view it
            out_path = f"scratch/hot_update_{idx}.js"
            with open(out_path, 'w', encoding='utf-8') as out:
                out.write(content)
            print("Wrote to:", out_path)
    except Exception as e:
        print("Error reading:", e)
    print("-" * 50)
