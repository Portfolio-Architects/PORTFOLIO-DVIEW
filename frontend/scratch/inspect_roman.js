const fs = require('fs');
const path = require('path');

const scoresData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/location-scores.json'), 'utf-8'));

for (const [key, value] of Object.entries(scoresData)) {
  if (value.academyDensity === 86 || value.restaurantDensity === 170) {
    console.log(`EXACT APARTMENT MATCH: "${key}"`);
    console.log(JSON.stringify(value, null, 2));
  }
}




const ROMAN_MAP = {
  'Ⅰ': '1', 'Ⅱ': '2', 'Ⅲ': '3', 'Ⅳ': '4', 'Ⅴ': '5',
  'Ⅵ': '6', 'Ⅶ': '7', 'Ⅷ': '8', 'Ⅸ': '9', 'Ⅹ': '10',
};

console.log('ROMAN_MAP Ⅱ code:', 'Ⅱ'.charCodeAt(0));
console.log('ROMAN_MAP Ⅲ code:', 'Ⅲ'.charCodeAt(0));
