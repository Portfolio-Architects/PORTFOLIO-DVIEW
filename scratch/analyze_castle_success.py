import json
import datetime
import math
import collections

path = r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\public\tx-data\동탄역롯데캐슬.json"

with open(path, "r", encoding="utf-8") as f:
    txs = json.load(f)

def get_date(tx):
    y = int(tx["contractYm"][:4])
    m = int(tx["contractYm"][4:6])
    d = int(tx.get("contractDay", 1) or 1)
    return datetime.date(y, m, d)

# JavaScript outlier filter (Rolling Window)
def filter_outliers_rolling(group_txs):
    group_txs = sorted(group_txs, key=get_date)
    filtered = []
    for idx, t in enumerate(group_txs):
        window = group_txs[max(0, idx - 5) : min(len(group_txs), idx + 6)]
        prices = []
        for wt in window:
            if wt.get("dealType") in ["전세", "월세"]:
                price = (wt.get("deposit") or 0) + round((wt.get("monthlyRent") or 0) * 12 / 0.055)
            else:
                price = wt["price"]
            prices.append(price)
        t_price = (t.get("deposit") or 0) + round((t.get("monthlyRent") or 0) * 12 / 0.055) if t.get("dealType") in ["전세", "월세"] else t["price"]
        if len(prices) < 4:
            filtered.append(t)
            continue
        mean = sum(prices) / len(prices)
        variance = sum((p - mean) ** 2 for p in prices) / len(prices)
        std_dev = math.sqrt(variance) if variance > 0 else 0
        if abs(t_price - mean) <= 2 * max(std_dev, mean * 0.05):
            filtered.append(t)
    return filtered

sale_txs = [t for t in txs if t.get("dealType") not in ["전세", "월세"]]
by_area_sale = collections.defaultdict(list)
for t in sale_txs:
    by_area_sale[round(t["area"])].append(t)

filtered_sales = []
for area, group in by_area_sale.items():
    filtered_sales.extend(filter_outliers_rolling(group))

filtered_sales.sort(key=lambda t: (t["contractYm"] + str(t.get("contractDay", "01")).zfill(2), t["price"]), reverse=True)

# Period filter
periods = [
    ("1M", 1),
    ("3M", 3),
    ("6M", 6),
    ("1Y", 12),
    ("3Y", 36),
    ("5Y", 60),
    ("10Y", 120),
    ("ALL", 9999),
]

now = datetime.date(2026, 5, 25)

# If typeMap WAS found:
# area=65.9695 -> 90 -> 90 * 0.3025 = 27.225 pyeong
# area=84.7002 -> 114A -> 114 * 0.3025 = 34.485 pyeong
# area=84.8222 -> 114B -> 114 * 0.3025 = 34.485 pyeong
# area=102.7092 -> 138 -> 138 * 0.3025 = 41.745 pyeong
type_map = {
    "65.9695": "90",
    "84.7002": "114A",
    "84.8222": "114B",
    "102.7092": "138"
}

def get_tx_supply_pyeong_success(tx):
    key = str(tx["area"])
    type_data = type_map.get(key)
    if type_data:
        import re
        m = re.search(r'\d+(\.\d+)?', type_data)
        if m:
            return float(m.group(0)) * 0.3025
    return tx["area"] * 0.3025 * 1.33

# If typeMap WAS NOT found (fallback):
def get_tx_supply_pyeong_fallback(tx):
    return tx["area"] * 0.3025 * 1.33

def format_eok(price_man):
    if price_man >= 10000:
        eok = int(price_man // 10000)
        rem = int(round(price_man % 10000))
        return f"{eok}억{f'{rem:,}' if rem > 0 else ''}"
    return f"{int(round(price_man)):,}만"

fallback_tx = filtered_sales[0] if filtered_sales else None

print("--- IF TYPEMAP WAS FOUND (SUCCESS) ---")
for label, months in periods:
    if months >= 9999:
        filtered = filtered_sales
    else:
        cutoff_year = now.year
        cutoff_month = now.month - months
        while cutoff_month <= 0:
            cutoff_year -= 1
            cutoff_month += 12
        cutoff_date = datetime.date(cutoff_year, cutoff_month, now.day)
        filtered = [t for t in filtered_sales if get_date(t) >= cutoff_date]
        
    count = len(filtered)
    if count > 0:
        per_pyeong = round(sum(t["price"] / get_tx_supply_pyeong_success(t) for t in filtered) / count)
    elif fallback_tx:
        per_pyeong = round(fallback_tx["price"] / get_tx_supply_pyeong_success(fallback_tx))
    print(f"Period {label}: per_pyeong={format_eok(per_pyeong)}/평 ({per_pyeong})")

print("\n--- IF TYPEMAP WAS NOT FOUND (FALLBACK) ---")
for label, months in periods:
    if months >= 9999:
        filtered = filtered_sales
    else:
        cutoff_year = now.year
        cutoff_month = now.month - months
        while cutoff_month <= 0:
            cutoff_year -= 1
            cutoff_month += 12
        cutoff_date = datetime.date(cutoff_year, cutoff_month, now.day)
        filtered = [t for t in filtered_sales if get_date(t) >= cutoff_date]
        
    count = len(filtered)
    if count > 0:
        per_pyeong = round(sum(t["price"] / get_tx_supply_pyeong_fallback(t) for t in filtered) / count)
    elif fallback_tx:
        per_pyeong = round(fallback_tx["price"] / get_tx_supply_pyeong_fallback(fallback_tx))
    print(f"Period {label}: per_pyeong={format_eok(per_pyeong)}/평 ({per_pyeong})")
