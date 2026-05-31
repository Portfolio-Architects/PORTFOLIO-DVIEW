const fs = require('fs');
const path = require('path');

const scoresPath = path.resolve(__dirname, '../public/data/location-scores.json');
const scores = JSON.parse(fs.readFileSync(scoresPath, 'utf8'));

const keys = Object.keys(scores);
const daeunApts = keys.filter(k => k.includes('다은마을'));

console.log('Daeun Village Complexes:');
daeunApts.forEach(apt => {
  console.log(`- ${apt} => ${scores[apt].nearestSchoolNames?.elementary} (${scores[apt].distanceToElementary}m)`);
});
