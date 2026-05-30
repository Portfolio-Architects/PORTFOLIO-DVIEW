const fs = require('fs');
const path = require('path');

function normalizeAptName(name) {
  if (!name) return '';
  return name
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .trim();
}

function isSameApartment(a, b) {
  return normalizeAptName(a) === normalizeAptName(b);
}

const aptsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/apartments-by-dong.json'), 'utf-8'));
const scoresData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/location-scores.json'), 'utf-8'));

const allApts = Object.values(aptsData.byDong).flat();
const scoreKeys = Object.keys(scoresData);

const missing = [];
for (const apt of allApts) {
  const match = scoreKeys.find(k => isSameApartment(k, apt.name));
  if (!match) {
    missing.push(apt.name);
  }
}

console.log('Total apartments in byDong:', allApts.length);
console.log('Total keys in location-scores.json:', scoreKeys.length);
console.log('Apartments in byDong but missing in location-scores.json (Count:', missing.length, '):');
console.log(JSON.stringify(missing, null, 2));
