const fs = require('fs');
const path = require('path');

// 1. Load location-scores.json
const locScoresPath = path.resolve(__dirname, '../public/data/location-scores.json');
const locationScores = JSON.parse(fs.readFileSync(locScoresPath, 'utf8'));

const aptName = "동탄역 시범 한화꿈에그린 프레스티지";
console.log(`=== Debugging [${aptName}] ===`);

const scoreData = locationScores[aptName];
if (scoreData) {
  console.log('✅ Found in location-scores.json!');
  console.log('restaurantDensity:', scoreData.restaurantDensity);
  console.log('restaurantCategories:', JSON.stringify(scoreData.restaurantCategories, null, 2));
} else {
  console.log('❌ NOT found in location-scores.json!');
  // List keys that contain '한화' or '꿈에그린'
  const keys = Object.keys(locationScores).filter(k => k.includes('한화') || k.includes('꿈에그린'));
  console.log('Keys in location-scores containing "한화" or "꿈에그린":', keys);
}

// 2. Load apartment mapping functions
const { findTxKey, normalizeAptName } = require('../src/lib/utils/apartmentMapping');
console.log('findTxKey target match:', findTxKey(aptName, locationScores));
console.log('normalizeAptName(aptName):', normalizeAptName(aptName));
