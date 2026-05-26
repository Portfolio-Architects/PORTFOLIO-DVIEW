import os
import json
import math

# We want to find the exact file name that has the matches
directory = r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\public\tx-data"

target_file = None
for filename in os.listdir(directory):
    if filename.endswith(".json") and filename != "_index.json":
        path = os.path.join(directory, filename)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for tx in data:
                    if tx.get("contractYm") == "202604" and tx.get("contractDay") == "22" and tx.get("price") == 183000:
                        target_file = filename
                        break
        except Exception:
            pass
        if target_file:
            break

print("Target File Hex:", target_file.encode("utf-8").hex())
print("Target File Decoded:", target_file.encode("cp949", errors="ignore").decode("utf-8", errors="ignore"))
print("Target File UTF-8:", target_file.encode("utf-8").decode("utf-8"))


# Let's load the typemap to see what is mapped
# We can load it from type-map fallback or search in the type-map sheet if we can find typeMap JSON
# Let's check if we can read the type-map from the local server or build a mockup typeMap
# Wait, let's load all files and see if there is typeMap data in front-end or we can get it from type-map API route or mock.
# Let's inspect the typeMap for '더샵센트럴시티' or whatever the name of this apartment is in normalizeAptName.
def normalize_apt_name(name):
    if not name:
        return ''
    # Remove [...] and whitespace, etc.
    import re
    # normalize NFC is not strictly needed for this script if we use standard python strings, but let's be clean
    name = re.sub(r'\[.*?\]\s*', '', name)
    name = re.sub(r'\s+', '', name)
    name = re.sub(r'[()（）]', '', name)
    return name.strip()

print("Normalized Target File Name:", normalize_apt_name(target_file.replace(".json", "")))
