const fs = require('fs');
const path = require('path');

// Replicate normalizeAptName and findTxKey in JS to test the current logic
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

const HARDCODED_MAPPING = {
  '그린힐반도유보라아이비파크10.0': '그린힐반도유보라아이비파크101단지',
  '레이크힐반도유보라아이비파크10.0': '레이크힐반도유보라아이비파크10.2',
  '동탄풍성신미주': '동탄역신미주',
  '금호어울림레이크1차': '금호어울림레이크',
  '동탄호수공원금호어울림레이크1차': '금호어울림레이크',
  '능동역센트럴경남아너스빌': '동탄숲속마을자연앤경남아너스빌1115-0',
  '능동역경남아너스빌': '동탄숲속마을자연앤경남아너스빌1124-0',
  '동탄역동원로얄듀크비스타': '동탄역동원로얄듀크비스타3차',
  '그린힐반도유보라아이비파크101단지': '산척동그린힐반도유보라아이비파크10',
  '센트럴힐조동탄': '여울동센트럴힐즈',
  '동탄2신도시금강펜테리움': '여울동금강펜테리움센트럴파크',
  '동탄나루마을동탄역유보라': '나루마을동탄역유보라여울숲1.0',
};

const LOCATION_PREFIXES = [
  '동탄시범다은마을', '동탄시범한빛마을', '동탄시범나루마을',
  '동탄호수공원역',
  '동탄호수공원', '동탄2신도시', '동탄숲속마을', '동탄푸른마을', '동탄나루마을', '반탄솔빛마을',
  '숲속마을동탄', '푸른마을동탄', '나루마을동탄', '시범다은마을', '시범한빛마을', '시범나루마을', '동탄신도시',
  '화성동탄2', '호수공원역', '솔빛마을', '예당마을', '새강마을', '동탄역시범', '한빛마을', '다은마을', '나루마을', '숲속마을', '푸른마을',
  '동탄호수', '동탄역', '능동역', '반송동', '석우동', '청계동', '영천동', '오산동', '산척동', '장지동', '방교동', '금곡동', '여울동', '호수공원',
  '동탄2', '능동', '신동', '목동', '송동', '시범', '한빛', '다은', '나루', '숲속', '푸른', '예당', '솔빛', '새강', '여울',
  '동탄',
];

function stripLocationPrefix(normalized) {
  let current = normalized;
  let replaced = true;
  while (replaced) {
    replaced = false;
    for (const prefix of LOCATION_PREFIXES) {
      if (current.startsWith(prefix) && current.length > prefix.length) {
        current = current.slice(prefix.length);
        replaced = true;
        break;
      }
    }
  }
  return current;
}

const ROMAN_MAP = {
  'Ⅰ': '1', 'Ⅱ': '2', 'Ⅲ': '3', 'Ⅳ': '4', 'Ⅴ': '5',
  'Ⅵ': '6', 'Ⅶ': '7', 'Ⅷ': '8', 'Ⅸ': '9', 'Ⅹ': '10',
};

const LOCATION_SUFFIXES = [
  '동탄2신도시', '동탄신도시', '2신도시', '신도시', '동탄역', '동탄2', '동탄'
];

function stripLocationSuffix(normalized) {
  let current = normalized;
  let replaced = true;
  while (replaced) {
    replaced = false;
    for (const suffix of LOCATION_SUFFIXES) {
      if (current.endsWith(suffix) && current.length > suffix.length) {
        current = current.slice(0, -suffix.length);
        replaced = true;
        break;
      }
    }
  }
  return current;
}

function deepNormalize(name) {
  let result = name;
  result = result.replace(/^[가-힣]+,/g, '');
  for (const [roman, arabic] of Object.entries(ROMAN_MAP)) {
    result = result.replace(roman, arabic);
  }
  result = result.replace(/(\d+)차/g, '$1');
  result = result.replace(/아파트/g, '');
  result = result.replace(/(\d+)번지/g, '$1');
  result = result.replace(/\.0(?=$|[^0-9])/g, '');
  result = result.replace(/스위콈/g, '스위첸');
  result = result.replace(/케이씨씨/g, 'KCC');
  result = result.replace(/S클래스/g, '에스클래스');
  return result;
}

function findTxKey(aptName, txMap, manualMapping, isRetry = false) {
  const norm = normalizeAptName(aptName);

  // Helper map: normalized key -> original key in txMap
  const normalizedTxMap = {};
  for (const key of Object.keys(txMap)) {
    normalizedTxMap[normalizeAptName(key)] = key;
  }

  // 0.5단계: 하드코딩 매핑
  const hardcoded = HARDCODED_MAPPING[norm];
  if (hardcoded) {
    if (hardcoded in normalizedTxMap) return normalizedTxMap[hardcoded];
    // If hardcoded target is not in the map, try to resolve it recursively
    if (!isRetry) {
      const resolved = findTxKey(hardcoded, txMap, manualMapping, true);
      if (resolved) return resolved;
    }
  }

  // 0단계: 수동 매핑 (최우선)
  if (manualMapping) {
    const mapped = manualMapping[aptName] || manualMapping[norm];
    if (mapped && mapped in normalizedTxMap) return normalizedTxMap[mapped];
  }

  // 1단계: 정확 매칭
  if (norm in normalizedTxMap) return normalizedTxMap[norm];

  // 2단계: 접두사 및 접미사 제거 후 매칭
  const stripped = stripLocationSuffix(stripLocationPrefix(norm));
  if (stripped !== norm && stripped in normalizedTxMap) return normalizedTxMap[stripped];

  for (const key of Object.keys(txMap)) {
    const normKey = normalizeAptName(key);
    if (stripLocationSuffix(stripLocationPrefix(normKey)) === stripped) return key;
  }

  // 3단계: 심층 정규화
  const deepNorm = deepNormalize(stripped);
  for (const key of Object.keys(txMap)) {
    const normKey = normalizeAptName(key);
    const keyDeep = stripLocationSuffix(stripLocationPrefix(deepNormalize(normKey)));
    if (keyDeep === deepNorm || deepNormalize(stripLocationSuffix(stripLocationPrefix(normKey))) === deepNorm) return key;
  }

  return null;
}

const fileContent = fs.readFileSync(path.join(__dirname, '../src/lib/dong-apartments.ts'), 'utf-8');
const matches = fileContent.match(/'[^'\n]+'/g) || [];
const allApts = Array.from(new Set(matches.map(m => m.slice(1, -1)))).filter(name => {
  return name !== 'use client' && name !== 'pyeong' && name !== 'm2' && !name.includes('/') && !name.includes('\\');
});

const scoresData = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/location-scores.json'), 'utf-8'));

const missing = [];
const matchedCount = [];

for (const apt of allApts) {
  const key = findTxKey(apt, scoresData);
  if (!key) {
    missing.push(apt);
  } else {
    matchedCount.push({ apt, key });
  }
}

console.log(`Total Apartments in dong-apartments.ts: ${allApts.length}`);
console.log(`Matched: ${matchedCount.length}`);
console.log(`Missing Count: ${missing.length}`);
console.log('Missing apartments list:');
console.log(JSON.stringify(missing, null, 2));
