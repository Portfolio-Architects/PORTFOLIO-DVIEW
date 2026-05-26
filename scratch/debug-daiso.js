const SHEET_ID = '1rKMt-B2FdN5nGaxaU0y2Pqv1WqnEv1AGnY7XXE7pCEE';

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

async function fetchCsv(sheetName) {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&headers=1`;
  const res = await fetch(csvUrl);
  if (!res.ok) {
    console.error(`Failed to fetch sheet ${sheetName}`);
    return [];
  }
  const text = await res.text();
  return text.split('\n')
    .filter(l => l.trim())
    .map(parseCsvLine)
    .map(row => row.map(v => v.replace(/^"|"$/g, '').trim()));
}

async function main() {
  console.log('Fetching SBOYDS sheet...');
  const sboyds = await fetchCsv('SBOYDS');
  console.log(`Loaded ${sboyds.length} rows from SBOYDS`);
  
  console.log('Filtering SBOYDS for "다이소"...');
  const daisoSboyds = sboyds.filter(row => row.some(col => col.includes('다이소')));
  console.log('Matching rows in SBOYDS:');
  console.log(daisoSboyds);

  console.log('Fetching RESTAURANTS sheet...');
  const restaurants = await fetchCsv('RESTAURANTS');
  console.log(`Loaded ${restaurants.length} rows from RESTAURANTS`);
  
  console.log('Filtering RESTAURANTS for "다이소"...');
  const daisoRests = restaurants.filter(row => row.some(col => col.includes('다이소')));
  console.log('Matching rows in RESTAURANTS:');
  console.log(daisoRests);
}

main().catch(console.error);
