const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const SHEET_ID = '1rKMt-B2FdN5nGaxaU0y2Pqv1WqnEv1AGnY7XXE7pCEE';
const SHEET_TABS = {
  APARTMENTS: 'APARTMENTS',
  SCHOOLS: 'SCHOOLS',
  STATIONS: 'STATIONS',
  ACADEMIES: 'ACADEMIES',
  RESTAURANTS: 'RESTAURANTS',
  SBOYDS: 'SBOYDS',
  TYPE_MAP: 'TYPE_MAP'
};

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

async function fetchCsvFromGoogle(sheetName) {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&headers=1&_t=${Date.now()}`;
  const start = Date.now();
  const res = await fetch(csvUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${sheetName}`);
  }
  const text = await res.text();
  const rows = text.split('\n').filter(l => l.trim()).map(parseCsvLine).map(row => row.map(v => v.replace(/^"|"$/g, '').trim()));
  console.log(`[Fetch] ${sheetName}: ${rows.length} rows loaded in ${Date.now() - start}ms (Raw size: ${(text.length / 1024).toFixed(1)} KB)`);
  return rows;
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function main() {
  console.log('Starting Benchmark...');
  const overallStart = Date.now();

  console.log('\n--- 1. Fetching CSVs concurrently ---');
  const fetchStart = Date.now();
  const [aptRows, sboydsRows, restRows] = await Promise.all([
    fetchCsvFromGoogle(SHEET_TABS.APARTMENTS),
    fetchCsvFromGoogle(SHEET_TABS.SBOYDS),
    fetchCsvFromGoogle(SHEET_TABS.RESTAURANTS)
  ]);
  console.log(`Total fetch time: ${Date.now() - fetchStart}ms`);

  console.log('\n--- 2. Processing and Calculating Distances ---');
  const processStart = Date.now();

  const aptHeaders = aptRows[0];
  const findColIndex = (headers, possibleNames) => {
    for (const name of possibleNames) {
      const normalized = name.replace(/\s+/g, '').toLowerCase();
      const idx = headers.findIndex(h => h.replace(/\s+/g, '').toLowerCase() === normalized);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const getVal = (row, keys) => {
    const idx = findColIndex(aptHeaders, keys);
    if (idx !== -1 && row[idx]) return row[idx];
    return undefined;
  };

  function parseCoordString(s) {
    if (!s) return null;
    const parts = s.split(',').map(p => parseFloat(p.trim().replace(/"/g, '')));
    if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
    return { lat: parts[0], lng: parts[1] };
  }

  const apartments = [];
  for (let i = 1; i < aptRows.length; i++) {
    const row = aptRows[i];
    const name = getVal(row, ['아파트명', 'name', '이름']);
    const dong = getVal(row, ['dong', '동']);
    if (!name || !dong) continue;

    const coordStr = getVal(row, ['좌표', 'coordinates', 'coord']);
    const coord = coordStr ? parseCoordString(coordStr) : null;
    apartments.push({
      name, dong,
      lat: coord?.lat || 0,
      lng: coord?.lng || 0
    });
  }

  const tenants = { starbucks: [], oliveyoung: [], daiso: [], mcdonalds: [], supermarket: [] };

  if (sboydsRows.length > 1) {
    const h = sboydsRows[0];
    const nIdx = findColIndex(h, ['상호명']);
    const latIdx = findColIndex(h, ['위도']);
    const lngIdx = findColIndex(h, ['경도']);
    const addrIdx = findColIndex(h, ['주소']);
    for (let i = 1; i < sboydsRows.length; i++) {
      const row = sboydsRows[i];
      const name = nIdx !== -1 ? row[nIdx] : '';
      if (!name) continue;
      const latStr = latIdx !== -1 ? row[latIdx] : '';
      const lngStr = lngIdx !== -1 ? row[lngIdx] : '';
      const address = addrIdx !== -1 ? row[addrIdx] : '';
      
      if (latStr && lngStr) {
        const entry = { name: name.trim(), lat: parseFloat(latStr), lng: parseFloat(lngStr), address: address.trim() };
        if (name.includes('스타벅스')) tenants.starbucks.push(entry);
        else if (name.includes('올리브영')) tenants.oliveyoung.push(entry);
        else if (name.includes('다이소')) tenants.daiso.push(entry);
      }
    }
  }

  if (restRows.length > 1) {
    const h = restRows[0];
    const nIdx = findColIndex(h, ['상호명']);
    const latIdx = findColIndex(h, ['위도']);
    const lngIdx = findColIndex(h, ['경도']);
    const addrIdx = findColIndex(h, ['지번주소', '도로명주소', '주소']);
    for (let i = 1; i < restRows.length; i++) {
      const row = restRows[i];
      const name = nIdx !== -1 ? row[nIdx] : '';
      if (!name) continue;
      const latStr = latIdx !== -1 ? row[latIdx] : '';
      const lngStr = lngIdx !== -1 ? row[lngIdx] : '';
      const address = addrIdx !== -1 ? row[addrIdx] : '';
      
      if (latStr && lngStr) {
        const cleanName = name.replace(/^(?:\(주\)|주식회사\s*|유한회사\s*)/, '').trim();
        const entry = { name: cleanName, lat: parseFloat(latStr), lng: parseFloat(lngStr), address: address.trim() };
        
        if (cleanName.includes('배스킨라빈스') || cleanName.includes('베스킨라빈스')) {
          tenants.mcdonalds.push(entry);
        } else {
          const isSupermarketMatch = /^(이마트|홈플러스|롯데마트|하나로마트|코스트코|트레이더스|노브랜드|스타필드마켓)/.test(cleanName);
          const isSupermarket = isSupermarketMatch && !cleanName.includes('이마트24');
          if (isSupermarket) tenants.supermarket.push(entry);
        }
      }
    }
  }

  console.log(`Categorized tenants: Starbucks(${tenants.starbucks.length}), OliveYoung(${tenants.oliveyoung.length}), Daiso(${tenants.daiso.length}), BaskinRobbins(${tenants.mcdonalds.length}), Supermarket(${tenants.supermarket.length})`);

  const loopStart = Date.now();
  for (const apt of apartments) {
    if (apt.lat && apt.lng) {
      const findNearest = (list) => {
        let nearestDist = Infinity, nearestItem = null;
        for (const item of list) {
          const dist = getDistance(apt.lat, apt.lng, item.lat, item.lng);
          if (dist < nearestDist) { nearestDist = dist; nearestItem = item; }
        }
        return { item: nearestItem, dist: nearestDist };
      };
      findNearest(tenants.starbucks);
      findNearest(tenants.oliveyoung);
      findNearest(tenants.daiso);
      findNearest(tenants.mcdonalds);
      findNearest(tenants.supermarket);
    }
  }
  console.log(`$O(N * M)$ distance loop completed in ${Date.now() - loopStart}ms`);
  console.log(`Total processing time: ${Date.now() - processStart}ms`);
  console.log(`Total execution time: ${Date.now() - overallStart}ms`);
}

main().catch(console.error);
