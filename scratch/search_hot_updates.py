import os
import re

search_dir = r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\.next"
search_str = "maxDateTime"

found_files = []
if os.path.exists(search_dir):
    for root, dirs, files in os.walk(search_dir):
        for file in files:
            if file.endswith('.js'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if search_str in content:
                            mtime = os.path.getmtime(path)
                            found_files.append((path, mtime, len(content)))
                except Exception as e:
                    pass

found_files.sort(key=lambda x: x[1], reverse=True)
print(f"Found {len(found_files)} files containing '{search_str}':")
for path, mtime, size in found_files:
    print(f"- {path} (mtime: {mtime}, size: {size})")

if found_files:
    # Write the most recent one to a separate file
    best_path = found_files[0][0]
    with open(best_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Try to extract the eval content and unescape it for readability
    # Webpack eval-source-map format: eval("...")
    match = re.search(r'eval\("(.+?)"\);?$', content, re.DOTALL)
    if match:
        eval_str = match.group(1)
        # Unescape javascript string escapes
        # e.g., \n, \t, \", \\, \uXXXX
        # We can use codecs or just eval a small wrapper or replace
        import codecs
        try:
            decoded = codecs.escape_decode(bytes(eval_str, "utf-8"))[0].decode("utf-8")
            # Also replace escaped newlines inside eval
            decoded = decoded.replace(r'\n', '\n').replace(r'\"', '"').replace(r'\\', '\\')
            out_path = "scratch/recovered_code.js"
            with open(out_path, 'w', encoding='utf-8') as out:
                out.write(decoded)
            print(f"Decoded and wrote to {out_path}")
        except Exception as e:
            print("Error decoding eval:", e)
            # fallback: write raw
            with open("scratch/recovered_raw.js", 'w', encoding='utf-8') as out:
                out.write(content)
    else:
        with open("scratch/recovered_raw.js", 'w', encoding='utf-8') as out:
            out.write(content)
        print("Could not parse eval format, wrote raw file to scratch/recovered_raw.js")
