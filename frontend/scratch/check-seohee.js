const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

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

async function main() {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=APARTMENTS&headers=1&_t=${Date.now()}`;
  const res = await fetch(csvUrl);
  const text = await res.text();
  const rows = text.split('\n').filter(l => l.trim()).map(parseCsvLine).map(row => row.map(v => v.replace(/^"|"$/g, '').trim()));

  const headers = rows[0];
  console.log('Headers:', headers);

  const row = rows.find(r => r.some(c => c.includes('서희스타힐스')));
  if (row) {
    console.log('Found Row:', row);
    headers.forEach((h, i) => {
      console.log(`- ${h}: ${row[i]}`);
    });
  } else {
    console.log('Row not found');
  }
}

main().catch(console.error);
