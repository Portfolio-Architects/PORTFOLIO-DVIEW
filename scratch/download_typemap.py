import urllib.request
import csv

sheet_id = '1rKMt-B2FdN5nGaxaU0y2Pqv1WqnEv1AGnY7XXE7pCEE'
sheet_tab = 'TYPE_MAP'
url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={sheet_tab}"

try:
    response = urllib.request.urlopen(url)
    csv_text = response.read().decode('utf-8')
    reader = csv.reader(csv_text.splitlines())
    
    print("--- Type Map for 롯데캐슬 ---")
    for row in reader:
        # Columns: Index, Apartment Name, Area, TypeM2, ...
        # Let's search for "롯데캐슬"
        if len(row) > 1 and "롯데캐슬" in row[1]:
            print(row)
except Exception as e:
    print("Error:", e)
