const fs = require('fs');
const path = require('path');

const scoresData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/location-scores.json'), 'utf-8'));
console.log('Total keys in scoresData:', Object.keys(scoresData).length);
console.log('First 10 keys:', Object.keys(scoresData).slice(0, 10));
console.log('Sample key data (for the first key):', JSON.stringify(scoresData[Object.keys(scoresData)[0]], null, 2));
