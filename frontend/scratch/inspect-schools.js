const fs = require('fs');
const path = require('path');

const scoresPath = path.resolve(__dirname, '../public/data/location-scores.json');
const scores = JSON.parse(fs.readFileSync(scoresPath, 'utf8'));

const keys = Object.keys(scores);
console.log(`Total complexes: ${keys.length}`);

// Print first 40 complexes and their assigned elementary school
console.log('Sample Complexes & Assigned Elementary Schools:');
keys.slice(0, 40).forEach(name => {
  const info = scores[name];
  console.log(`- ${name} => ${info.nearestSchoolNames?.elementary} (dist: ${info.distanceToElementary}m, walk: ${Math.ceil(info.distanceToElementary / 80)}분)`);
});
