const fs = require('fs');
const path = require('path');

const scoresData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/location-scores.json'), 'utf-8'));
const keys = Object.keys(scoresData).sort();

console.log('--- ALL KEYS IN LOCATION-SCORES.JSON ---');
console.log(JSON.stringify(keys, null, 2));
