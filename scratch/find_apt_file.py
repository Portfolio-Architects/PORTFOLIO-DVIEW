import os
import json

directory = r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\public\tx-data"

for filename in os.listdir(directory):
    if filename.endswith(".json") and filename != "_index.json":
        path = os.path.join(directory, filename)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
                
                # Check for transactions in April 2026
                matches = []
                for tx in data:
                    if tx.get("contractYm") == "202604":
                        price = tx.get("price", 0)
                        # Look for price 183000 or 182000 or 164700
                        if price in [183000, 182000, 164700]:
                            matches.append(tx)
                
                if matches:
                    print(f"Found matches in {filename}:")
                    for m in matches:
                        print(f"  {m}")
        except Exception as e:
            print(f"Error reading {filename}: {e}")
