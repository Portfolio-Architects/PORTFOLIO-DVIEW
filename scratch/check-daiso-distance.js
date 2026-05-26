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
  if (!res.ok) return [];
  const text = await res.text();
  return text.split('\n')
    .filter(l => l.trim())
    .map(parseCsvLine)
    .map(row => row.map(v => v.replace(/^"|"$/g, '').trim()));
}

function parseCoordString(s) {
  if (!s) return null;
  const parts = s.split(',').map(p => parseFloat(p.trim().replace(/"/g, '')));
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return { lat: parts[0], lng: parts[1] };
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
  const apts = await fetchCsv('apartments');
  const sboyds = await fetchCsv('SBOYDS');

  const headers = apts[0];
  const nameIdx = headers.findIndex(h => h.includes('아파트명') || h.includes('name'));
  const coordIdx = headers.findIndex(h => h.includes('좌표') || h.includes('coord'));

  const matches = apts.filter(row => row[nameIdx] && row[nameIdx].includes('롯데캐슬'));
  console.log(`Found ${matches.length} apartments with "롯데캐슬":`);
  matches.forEach(m => {
    console.log(`- ${m[nameIdx]} [Coordinates: ${m[coordIdx]}]`);
  });

  // Let's do for "동탄역 롯데캐슬" (exactly)
  const lotteCastle = apts.find(row => row[nameIdx] && row[nameIdx] === '동탄역 롯데캐슬');
  if (!lotteCastle) {
    console.error('동탄역 롯데캐슬 (exact match) not found in apartments sheet!');
    return;
  }

  console.log('\nExact "동탄역 롯데캐슬" row:', lotteCastle);
  const coordStr = lotteCastle[coordIdx];
  const coord = parseCoordString(coordStr);
  console.log('Exact "동탄역 롯데캐슬" Coord parsed:', coord);

  // Now filter daiso and calculate distances
  const daisoList = [];
  const h = sboyds[0];
  const nIdx = h.findIndex(col => col.includes('상호명'));
  const latIdx = h.findIndex(col => col.includes('위도'));
  const lngIdx = h.findIndex(col => col.includes('경도'));
  const addrIdx = h.findIndex(col => col.includes('주소'));

  for (let i = 1; i < sboyds.length; i++) {
    const row = sboyds[i];
    const name = row[nIdx];
    if (name && name.includes('다이소')) {
      const lat = parseFloat(row[latIdx]);
      const lng = parseFloat(row[lngIdx]);
      const address = row[addrIdx];
      if (!isNaN(lat) && !isNaN(lng)) {
        const dist = getDistance(coord.lat, coord.lng, lat, lng);
        daisoList.push({ name, lat, lng, address, dist });
      }
    }
  }

  daisoList.sort((a, b) => a.dist - b.dist);
  console.log('\nDaiso stores sorted by distance for "동탄역 롯데캐슬":');
  daisoList.forEach(d => {
    console.log(`- ${d.name}: ${Math.round(d.dist)}m (${d.address}) [Coordinates: ${d.lat}, ${d.lng}]`);
  });
}

main().catch(console.error);
