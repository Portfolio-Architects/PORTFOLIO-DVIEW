const fs = require('fs');
const path = require('path');

const scoresPath = path.resolve(__dirname, '../public/data/location-scores.json');
const scores = JSON.parse(fs.readFileSync(scoresPath, 'utf8'));

const testApts = [
  '동탄역 롯데캐슬',
  '동탄역 시범 더샵 센트럴시티',
  '동탄역 시범 한화꿈에그린 프레스티지',
  '동탄역 시범 우남퍼스트빌'
];

testApts.forEach(apt => {
  console.log(`\n[${apt}]`);
  console.log(JSON.stringify(scores[apt], null, 2));
});
