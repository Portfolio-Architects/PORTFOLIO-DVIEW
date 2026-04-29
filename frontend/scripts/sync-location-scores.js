#!/usr/bin/env node
require('dotenv').config({ path: '.env.local', override: true });
const fs = require('fs');
const path = require('path');

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
  return text.split('\n').filter(l => l.trim()).map(parseCsvLine).map(row => row.map(v => v.replace(/^"|"$/g, '').trim()));
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

function findNearest(origin, pois) {
  let min = Infinity;
  let nearest = null;
  for (const p of pois) {
    const d = haversineDistance(origin, p);
    if (d < min) {
      min = d;
      nearest = { ...p, distance: d };
    }
  }
  return nearest;
}

function filterByBBox(origin, pois) {
  const BBOX_DEGREES = 0.012;
  return pois.filter(p =>
    Math.abs(p.lat - origin.lat) <= BBOX_DEGREES &&
    Math.abs(p.lng - origin.lng) <= BBOX_DEGREES
  );
}

async function main() {
  console.log('Fetching Google Sheets data for location scores...');
  const [aptRows, schoolRows, stationRows, academyRows, restRows, sboydsRows] = await Promise.all([
    fetchCsv('APARTMENTS'),
    fetchCsv('SCHOOLS'),
    fetchCsv('STATIONS'),
    fetchCsv('ACADEMIES'),
    fetchCsv('RESTAURANTS'),
    fetchCsv('SBOYDS')
  ]);

  if (aptRows.length < 2) {
    console.error('Failed to load APARTMENTS data');
    process.exit(1);
  }

  const schools = [];
  for(let i=1; i<schoolRows.length; i++) {
     const [name, coordStr, type] = schoolRows[i];
     if(!name || !coordStr || !type) continue;
     const coord = parseCoordString(coordStr);
     if(coord) schools.push({name: name.trim(), ...coord, type: type.trim()});
  }

  const stations = [];
  for(let i=1; i<stationRows.length; i++) {
     const [name, coordStr, line] = stationRows[i];
     if(!name || !coordStr) continue;
     const coord = parseCoordString(coordStr);
     if(coord) stations.push({name: name.trim(), ...coord, line: (line||'').trim()});
  }

  const academies = [];
  for(let i=1; i<academyRows.length; i++) {
     const [name, latStr, lngStr, cat] = academyRows[i];
     const lat = parseFloat(latStr), lng = parseFloat(lngStr);
     if(!isNaN(lat) && !isNaN(lng) && name) academies.push({name: name.trim(), lat, lng, category: (cat||'기타').trim()});
  }

  const restaurants = [];
  for(let i=1; i<restRows.length; i++) {
     const [name, latStr, lngStr, cat] = restRows[i];
     const lat = parseFloat(latStr), lng = parseFloat(lngStr);
     if(!isNaN(lat) && !isNaN(lng) && name) restaurants.push({name: name.trim(), lat, lng, category: (cat||'기타').trim()});
  }

  const sboyds = [];
  for(let i=1; i<sboydsRows.length; i++) {
     const name = sboydsRows[i][0];
     const lat = parseFloat(sboydsRows[i][1]);
     const lng = parseFloat(sboydsRows[i][2]);
     if(name && !isNaN(lat) && !isNaN(lng)) sboyds.push({name: name.trim(), lat, lng});
  }

  const results = {};
  
  const aptHeaders = aptRows[0].map(h => h.toLowerCase().replace(/\s/g,''));
  const getIdx = (names) => aptHeaders.findIndex(h => names.some(n => h.includes(n)));
  const nameIdx = getIdx(['name','아파트명','이름']);
  const coordIdx = getIdx(['coord','좌표']);

  for(let i=1; i<aptRows.length; i++) {
     const aptName = aptRows[i][nameIdx];
     const coordStr = aptRows[i][coordIdx];
     if(!aptName || !coordStr) continue;
     const coord = parseCoordString(coordStr);
     if(!coord) continue;

     const elementary = schools.filter(s => s.type.includes('초'));
     const middle = schools.filter(s => s.type.includes('중'));
     const high = schools.filter(s => s.type.includes('고'));

     const gtxSrt = stations.filter(s => s.line.includes('GTX') || s.line.includes('SRT'));
     const indeokwon = stations.filter(s => s.line.includes('인덕원') || s.line.includes('동탄인덕원'));
     const tram = stations.filter(s => s.line.includes('트램') || s.line.includes('도시철도'));

     const candidateAcademies = filterByBBox(coord, academies);
     const nearbyAcademies = candidateAcademies.filter(a => haversineDistance(coord, a) <= 500);
     const candidateRestaurants = filterByBBox(coord, restaurants);
     const nearbyRestaurants = candidateRestaurants.filter(r => haversineDistance(coord, r) <= 500);

     const findAnchor = (keywords) => {
        const matches = [...sboyds, ...restaurants].filter(r => keywords.some(k => r.name.includes(k)));
        return matches.length > 0 ? findNearest(coord, matches) : null;
     };

     results[aptName] = {
        distanceToElementary: findNearest(coord, elementary)?.distance ?? null,
        distanceToMiddle: findNearest(coord, middle)?.distance ?? null,
        distanceToHigh: findNearest(coord, high)?.distance ?? null,
        distanceToSubway: (gtxSrt.length > 0 ? findNearest(coord, gtxSrt) : findNearest(coord, stations))?.distance ?? null,
        distanceToIndeokwon: findNearest(coord, indeokwon)?.distance ?? null,
        distanceToTram: findNearest(coord, tram)?.distance ?? null,
        academyDensity: nearbyAcademies.length,
        restaurantDensity: nearbyRestaurants.length,
        distanceToStarbucks: findAnchor(['스타벅스'])?.distance ?? null,
        distanceToMcDonalds: findAnchor(['맥도날드'])?.distance ?? null,
        distanceToOliveYoung: findAnchor(['올리브영'])?.distance ?? null,
        distanceToDaiso: findAnchor(['다이소'])?.distance ?? null,
        distanceToSupermarket: findAnchor(['이마트','홈플러스','롯데마트','노브랜드'])?.distance ?? null,
     };
  }

  const outputPath = path.resolve(__dirname, '../src/lib/location-scores.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`✅ Synced location scores for ${Object.keys(results).length} apartments to src/lib/location-scores.json`);
}

main().catch(console.error);
