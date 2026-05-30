const fs = require('fs');
const path = require('path');

const scoresData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/location-scores.json'), 'utf-8'));

const emptyAcademies = [];
const emptyRestaurants = [];
const missingFields = [];

for (const [name, score] of Object.entries(scoresData)) {
  if (!score.academyCategories || Object.keys(score.academyCategories).length === 0) {
    emptyAcademies.push(name);
  }
  if (!score.restaurantCategories || Object.keys(score.restaurantCategories).length === 0) {
    emptyRestaurants.push(name);
  }
  if (score.academyDensity === undefined || score.restaurantDensity === undefined) {
    missingFields.push(name);
  }
}

console.log('Total apartments in location-scores.json:', Object.keys(scoresData).length);
console.log('Empty academyCategories count:', emptyAcademies.length);
console.log('Empty restaurantCategories count:', emptyRestaurants.length);
console.log('Missing fields count:', missingFields.length);

if (emptyAcademies.length > 0) {
  console.log('Empty academyCategories apartments:', emptyAcademies);
}
if (emptyRestaurants.length > 0) {
  console.log('Empty restaurantCategories apartments:', emptyRestaurants);
}
