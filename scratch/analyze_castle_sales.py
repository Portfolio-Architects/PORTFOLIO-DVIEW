import json
import datetime

path = r"c:\Users\ocs56\OneDrive\바탕 화면\PORTFOLIO\PORTFOLIO - DVIEW\frontend\public\tx-data\동탄역롯데캐슬.json"

with open(path, "r", encoding="utf-8") as f:
    txs = json.load(f)

# Sort transactions by date descending
def get_date(tx):
    y = int(tx["contractYm"][:4])
    m = int(tx["contractYm"][4:6])
    d = int(tx.get("contractDay", 1) or 1)
    return datetime.date(y, m, d)

# JavaScript outlier filter (Rolling Window)
# We need to replicate the outlier filter because the transactions are filtered before being passed to TransactionSummaryMetrics!
# Wait! In ApartmentModal.tsx, the outlier filter is applied to `rawTransactions`:
# Let's check how filterOutliersRolling is implemented:
# 1. Sort ascending by date
# 2. Group by rounded area
# 3. For each group, filter outliers:
#    If prices.length < 4: keep
#    Else: mean = sum / len, stdDev = sqrt(variance)
#    keep if abs(price - mean) <= 2 * max(stdDev, mean * 0.05)

def filter_outliers_rolling(group_txs):
    # Sort ascending
    group_txs = sorted(group_txs, key=get_date)
    
    filtered = []
    for idx, t in enumerate(group_txs):
        # 11 window: max(0, idx - 5) to min(len, idx + 6)
        window = group_txs[max(0, idx - 5) : min(len(group_txs), idx + 6)]
        
        # Calculate price for each
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

import math

# Group into sales and jeonse
sale_txs = [t for t in txs if t.get("dealType") not in ["전세", "월세"]]
jeonse_txs = [t for t in txs if t.get("dealType") in ["전세", "월se", "월세"]]

# Apply rolling window outlier filter
import collections
by_area_sale = collections.defaultdict(list)
for t in sale_txs:
    by_area_sale[round(t["area"])].append(t)

filtered_sales = []
for area, group in by_area_sale.items():
    filtered_sales.extend(filter_outliers_rolling(group))

by_area_jeonse = collections.defaultdict(list)
for t in jeonse_txs:
    by_area_jeonse[round(t["area"])].append(t)

filtered_jeonses = []
for area, group in by_area_jeonse.items():
    filtered_jeonses.extend(filter_outliers_rolling(group))

# Combine and sort descending
combined = filtered_sales + filtered_jeonses
combined.sort(key=lambda t: (t["contractYm"] + str(t.get("contractDay", "01")).zfill(2), t["price"]), reverse=True)

# Now filter to sales only for the period analysis
period_txs = [t for t in combined if t.get("dealType") not in ["전세", "월세"]]

print(f"Total sales after outlier filter: {len(period_txs)}")

# Now let's calculate the periods
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

# Build a mockup typemap or load from frontend/src/app/api/type-map/route.ts
# Let's check typemap values for 동탄역롯데캐슬
# In 동탄역롯데캐슬:
# area=65.9695 -> 90?
# area=84.7002 -> 114A?
# area=84.8222 -> 114B?
# area=102.7092 -> 138?
type_map = {
    "65.9695": "90",
    "84.7002": "114A",
    "84.8222": "114B",
    "102.7092": "138"
}

def get_tx_supply_pyeong(tx):
    key = str(tx["area"])
    type_data = type_map.get(key)
    if type_data:
        # Match digits
        import re
        m = re.search(r'\d+(\.\d+)?', type_data)
        if m:
            return float(m.group(0)) * 0.3025
    return tx["area"] * 0.3025 * 1.33

def format_eok(price_man):
    if price_man >= 10000:
        eok = int(price_man // 10000)
        rem = int(round(price_man % 10000))
        return f"{eok}억{f'{rem:,}' if rem > 0 else ''}"
    return f"{int(round(price_man)):,}만"

# Sort transactions by date descending to find fallback
sorted_base_tx = sorted(period_txs, key=get_date, reverse=True)
fallback_tx = sorted_base_tx[0] if sorted_base_tx else None

for label, months in periods:
    # cutoff date
    if months >= 9999:
        filtered = period_txs
    else:
        # Calculate year and month for cutoff
        # e.g., now = 2026-05-25, 1M ago = 2026-04-25
        # In JS: cutoffDate = new Date(now.getFullYear(), now.getMonth() - p.months, now.getDate())
        # Let's approximate
        cutoff_year = now.year
        cutoff_month = now.month - months
        while cutoff_month <= 0:
            cutoff_year -= 1
            cutoff_month += 12
        cutoff_date = datetime.date(cutoff_year, cutoff_month, now.day)
        filtered = [t for t in period_txs if get_date(t) >= cutoff_date]
        
    raw_avg_price = 0
    per_pyeong = 0
    count = len(filtered)
    
    if count > 0:
        raw_avg_price = sum(t["price"] for t in filtered) / count
        per_pyeong = round(sum(t["price"] / get_tx_supply_pyeong(t) for t in filtered) / count)
    elif fallback_tx:
        raw_avg_price = fallback_tx["price"]
        per_pyeong = round(fallback_tx["price"] / get_tx_supply_pyeong(fallback_tx))
        count = 0
        
    avg_price = round(raw_avg_price / 100) * 100
    print(f"Period {label}: count={count}, avg_price={format_eok(avg_price)} ({avg_price}), per_pyeong={format_eok(per_pyeong)}/평 ({per_pyeong})")
