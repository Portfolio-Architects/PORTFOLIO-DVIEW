import json
import datetime

path = r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\public\tx-data\동탄역롯데캐슬.json"

with open(path, "r", encoding="utf-8") as f:
    txs = json.load(f)

# Sort transactions by date descending
# contractYm is like "202605", contractDay is like "09"
def get_date(tx):
    y = int(tx["contractYm"][:4])
    m = int(tx["contractYm"][4:6])
    d = int(tx.get("contractDay", 1) or 1)
    return datetime.date(y, m, d)

txs.sort(key=get_date, reverse=True)

now = datetime.date(2026, 5, 25)
one_month_ago = datetime.date(2026, 4, 25)
three_months_ago = datetime.date(2026, 2, 25)

print("--- Transactions in 1 Month (>= 2026-04-25) ---")
count_1m = 0
for tx in txs:
    d = get_date(tx)
    if d >= one_month_ago:
        print(f"Date: {d}, Price: {tx['price']}, Area: {tx['area']}, AreaPyeong: {tx['areaPyeong']}, DealType: {tx['dealType']}")
        count_1m += 1
print(f"Total 1M count: {count_1m}")

print("\n--- Transactions in 3 Months (>= 2026-02-25) ---")
count_3m = 0
for tx in txs:
    d = get_date(tx)
    if d >= three_months_ago:
        print(f"Date: {d}, Price: {tx['price']}, Area: {tx['area']}, AreaPyeong: {tx['areaPyeong']}, DealType: {tx['dealType']}")
        count_3m += 1
print(f"Total 3M count: {count_3m}")
