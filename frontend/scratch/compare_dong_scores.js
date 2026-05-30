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

const fileContent = fs.readFileSync(path.join(__dirname, '../src/lib/dong-apartments.ts'), 'utf-8');
const matches = fileContent.match(/'[^'\n]+'/g) || [];
const allApts = Array.from(new Set(matches.map(m => m.slice(1, -1)))).filter(name => {
  return name !== 'use client' && name !== 'pyeong' && name !== 'm2';
});

const scoresData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/location-scores.json'), 'utf-8'));
const scoreKeys = Object.keys(scoresData);

const missing = [];
for (const apt of allApts) {
  const match = scoreKeys.find(k => isSameApartment(k, apt));
  if (!match) {
    missing.push(apt);
  }
}

console.log('Total parsed apartments:', allApts.length);
console.log('Missing apartments in location-scores.json:');
console.log(JSON.stringify(missing, null, 2));
