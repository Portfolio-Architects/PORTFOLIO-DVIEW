const fs = require('fs');
const path = require('path');

const SHEET_ID = '1rKMt-B2FdN5nGaxaU0y2Pqv1WqnEv1AGnY7XXE7pCEE';

async function fetchCsv(sheetName) {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&headers=1`;
  const res = await fetch(csvUrl);
  if (!res.ok) return [];
  const text = await res.text();
  return text.split('\n').filter(l => l.trim()).map(parseCsvLine).map(row => row.map(v => v.replace(/^"|"$/g, '').trim()));
}

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

function toRad(value) {
  return (value * Math.PI) / 180;
}

function haversineDistance(c1, c2) {
  const R = 6371e3;
  const dLat = toRad(c2.lat - c1.lat);
  const dLng = toRad(c2.lng - c1.lng);
  const lat1 = toRad(c1.lat);
  const lat2 = toRad(c2.lat);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function parseCoordString(s) {
  if (!s) return null;
  const parts = s.split(',').map(p => parseFloat(p.trim().replace(/"/g, '')));
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return { lat: parts[0], lng: parts[1] };
}

async function main() {
  const [aptRows, schoolRows] = await Promise.all([
    fetchCsv('APARTMENTS'),
    fetchCsv('SCHOOLS')
  ]);

  const schools = [];
  for(let i=1; i<schoolRows.length; i++) {
     const [name, coordStr, type] = schoolRows[i];
     if(!name || !coordStr || !type) continue;
     const coord = parseCoordString(coordStr);
     if(coord) schools.push({name: name.trim(), ...coord, type: type.trim()});
  }

  const elementarySchools = schools.filter(s => s.type.includes('초'));

  const aptHeaders = aptRows[0].map(h => h.toLowerCase().replace(/\s/g,''));
  const nameIdx = aptHeaders.findIndex(h => ['name','아파트명','이름'].some(n => h.includes(n)));
  const coordIdx = aptHeaders.findIndex(h => ['coord','좌표'].some(n => h.includes(n)));

  const testApts = ['동탄역 롯데캐슬', '동탄역 린스트라우스'];

  testApts.forEach(targetName => {
    const row = aptRows.find(r => r[nameIdx] === targetName);
    if (row) {
      const coord = parseCoordString(row[coordIdx]);
      console.log(`\nFound ${targetName} at ${coord.lat}, ${coord.lng}`);

      const dists = elementarySchools.map(s => {
        const dist = haversineDistance(coord, s);
        return { name: s.name, dist };
      }).sort((a,b) => a.dist - b.dist);

      console.log(`Elementary school distances from ${targetName}:`);
      dists.slice(0, 5).forEach((s, idx) => {
        console.log(`${idx + 1}. ${s.name}: ${s.dist}m`);
      });
    }
  });
}

main().catch(console.error);
