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

const fileContent = fs.readFileSync(path.join(__dirname, '../src/lib/dong-apartments.ts'), 'utf-8');
const matches = fileContent.match(/'[^'\n]+'/g) || [];
const allApts = Array.from(new Set(matches.map(m => m.slice(1, -1)))).filter(name => {
  return name !== 'use client' && name !== 'pyeong' && name !== 'm2';
});

const scoresData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/location-scores.json'), 'utf-8'));
const scoreKeys = Object.keys(scoresData);

function findClosest(target) {
  const normTarget = normalizeAptName(target).replace(/동탄/g, '');
  let bestKey = null;
  let bestScore = 0;

  for (const key of scoreKeys) {
    const normKey = normalizeAptName(key).replace(/동탄/g, '');
    
    // Simple intersection score (how many characters overlap)
    let overlap = 0;
    const targetSet = new Set(normTarget.split(''));
    for (const char of normKey) {
      if (targetSet.has(char)) overlap++;
    }
    
    // Normalize score by length
    const score = overlap / Math.max(normTarget.length, normKey.length);
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  return bestScore > 0.5 ? bestKey : null;
}

const results = {};
for (const apt of allApts) {
  const normA = normalizeAptName(apt);
  const matchExact = scoreKeys.find(k => normalizeAptName(k) === normA);
  if (!matchExact) {
    results[apt] = findClosest(apt);
  }
}

console.log(JSON.stringify(results, null, 2));
