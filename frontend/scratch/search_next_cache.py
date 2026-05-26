import os

search_dir = r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\.next"
search_str = "최근 실거래 등락 비중"

found_files = []
if os.path.exists(search_dir):
    for root, dirs, files in os.walk(search_dir):
        for file in files:
            if file.endswith('.js') or file.endswith('.html'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        if search_str in f.read():
                            found_files.append(path)
                            print("Found in:", path)
                except Exception as e:
                    pass
else:
    print("Next.js build folder does not exist")
