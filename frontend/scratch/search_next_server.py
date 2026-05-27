import os

search_dirs = [
    r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\.next\dev\server",
    r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\.next\dev\static"
]
search_str = "최근 실거래 등락 비중"

found_files = []
for search_dir in search_dirs:
    if os.path.exists(search_dir):
        for root, dirs, files in os.walk(search_dir):
            for file in files:
                if file.endswith('.js'):
                    path = os.path.join(root, file)
                    try:
                        with open(path, 'r', encoding='utf-8') as f:
                            if search_str in f.read():
                                found_files.append(path)
                                print("Found file:", path)
                    except Exception as e:
                        pass
    else:
        print("Folder does not exist:", search_dir)
