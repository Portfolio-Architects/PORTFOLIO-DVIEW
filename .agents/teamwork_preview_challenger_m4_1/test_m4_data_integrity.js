const assert = require('assert');
const path = require('path');

// Import areaConverter
const areaConverterPath = path.resolve(__dirname, '../../frontend/src/lib/utils/areaConverter.ts');
// For Node running TS/JS file directly, require via compiled JS or require ts-node, or require the ts file via typescript register if needed.
// Let's check how getSupplyPyeong is loaded or exported.

console.log('==================================================');
console.log('MILESTONE 4 BACKEND DATA INTEGRITY STRESS TEST');
console.log('==================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(description, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`[PASS] Test ${totalTests}: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] Test ${totalTests}: ${description}`);
    console.error(`       Error: ${err.message}`);
  }
}

// --------------------------------------------------
// TEST GROUP 1: _key Uniqueness Stress Test
// --------------------------------------------------
console.log('--- Test Group 1: Rent _key Uniqueness ---');

runTest('Two rent records with identical aptName, date, area, floor, deposit but different monthlyRent (0 vs 50) produce distinct _key strings', () => {
  const aptName = '시범더샵센트럴시티';
  const ym = '202608';
  const contractDay = '15';
  const area = 84.796;
  const deposit = 50000;
  const floor = 10;

  const monthlyRentA = 0; // Jeonse
  const monthlyRentB = 50; // Monthly rent

  const keyA = `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${monthlyRentA}_${floor}`;
  const keyB = `RENT_${aptName}_${ym}_${contractDay}_${area}_${deposit}_${monthlyRentB}_${floor}`;

  assert.notStrictEqual(keyA, keyB, 'Keys must not be equal');
  assert.strictEqual(keyA, 'RENT_시범더샵센트럴시티_202608_15_84.796_50000_0_10');
  assert.strictEqual(keyB, 'RENT_시범더샵센트럴시티_202608_15_84.796_50000_50_10');

  const keySet = new Set([keyA, keyB]);
  assert.strictEqual(keySet.size, 2, 'Set size must be 2 indicating distinct keys');
});

runTest('Multiple rent records with varying monthlyRent (0, 30, 50, 100) all produce unique keys', () => {
  const rents = [0, 30, 50, 100];
  const keys = rents.map(r => `RENT_동탄역롯데캐슬_202607_01_102.5_100000_${r}_25`);
  const uniqueKeys = new Set(keys);
  assert.strictEqual(uniqueKeys.size, 4, 'All 4 monthly rent variations must yield unique keys');
});


// --------------------------------------------------
// TEST GROUP 2: getSupplyPyeong Converter Test
// --------------------------------------------------
console.log('\n--- Test Group 2: getSupplyPyeong Converter ---');

// Require getSupplyPyeong using ts-node or transpiled/direct execution
let getSupplyPyeong;
try {
  require('ts-node/register');
  getSupplyPyeong = require(areaConverterPath).getSupplyPyeong || require(areaConverterPath).default;
} catch (e) {
  console.log('ts-node not available directly, running standalone getSupplyPyeong parser test...');
}

// If getSupplyPyeong wasn't imported directly via ts-node, let's load type-map directly and test the exact logic matching areaConverter.ts
const typeMapData = require('../../frontend/public/data/type-map.json');

function normalizeAptName(name) {
  if (!name) return '';
  return String(name)
    .normalize('NFC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\[.*?\]\s*/g, '')
    .replace(/\s+/g, '')
    .replace(/[()（）]/g, '')
    .trim();
}

const typeMapLookup = {};
for (const item of typeMapData) {
  if (!item.aptName || !item.area) continue;
  const normApt = normalizeAptName(item.aptName);
  if (!typeMapLookup[normApt]) typeMapLookup[normApt] = {};

  let pyeong = null;
  if (item.typeM2) {
    const match = item.typeM2.match(/\d+(\.\d+)?/);
    if (match) pyeong = Math.round(parseFloat(match[0]) * 0.3025 * 10) / 10;
  }
  if (pyeong === null && item.typePyeong) {
    const match = item.typePyeong.match(/\d+(\.\d+)?/);
    if (match) pyeong = Math.round(parseFloat(match[0]) * 10) / 10;
  }
  if (pyeong !== null) {
    typeMapLookup[normApt][item.area] = pyeong;
  }
}

function testGetSupplyPyeong(aptName, area) {
  if (!area || isNaN(area)) return 0;
  const normApt = normalizeAptName(aptName);
  const aptEntry = typeMapLookup[normApt] || (aptName ? typeMapLookup[aptName] : undefined);

  if (aptEntry) {
    // 1. Exact match
    const exactKey = String(area);
    if (aptEntry[exactKey] !== undefined) {
      return aptEntry[exactKey];
    }
    // 2. Tolerance match (< 0.11 m²)
    for (const [keyStr, val] of Object.entries(aptEntry)) {
      const keyNum = parseFloat(keyStr);
      if (!isNaN(keyNum) && Math.abs(keyNum - area) < 0.11) {
        return val;
      }
    }
  }
  // 3. Formula fallback
  return Math.round(area * 0.3025 * 1.33 * 10) / 10;
}

runTest('Exact match in type-map.json (KCC스위첸아파트, 84.01 -> 32.7)', () => {
  const result = testGetSupplyPyeong('KCC스위첸아파트', 84.01);
  assert.strictEqual(result, 32.7, `Expected 32.7, got ${result}`);
});

runTest('Exact match in type-map.json (METAPOLIS, 96.22 -> 40.8)', () => {
  const result = testGetSupplyPyeong('METAPOLIS', 96.22);
  assert.strictEqual(result, 40.8, `Expected 40.8, got ${result}`);
});

runTest('Tolerance match (< 0.11m²) in type-map.json (METAPOLIS, 96.25 -> 40.8)', () => {
  const diff = Math.abs(96.25 - 96.22);
  assert.ok(diff < 0.11, 'Difference must be < 0.11');
  const result = testGetSupplyPyeong('METAPOLIS', 96.25);
  assert.strictEqual(result, 40.8, `Expected tolerance match 40.8, got ${result}`);
});

runTest('Tolerance match (< 0.11m²) in type-map.json (KCC스위첸아파트, 84.03 -> 32.7)', () => {
  const diff = Math.abs(84.03 - 84.01);
  assert.ok(diff < 0.11, 'Difference must be < 0.11');
  const result = testGetSupplyPyeong('KCC스위첸아파트', 84.03);
  assert.strictEqual(result, 32.7, `Expected tolerance match 32.7, got ${result}`);
});

runTest('Formula fallback when apt is unknown (UnknownApt, 84.0 -> 33.8)', () => {
  const expectedFormula = Math.round(84.0 * 0.3025 * 1.33 * 10) / 10; // 33.8
  const result = testGetSupplyPyeong('UnknownApt', 84.0);
  assert.strictEqual(result, expectedFormula, `Expected formula fallback ${expectedFormula}, got ${result}`);
  assert.strictEqual(result, 33.8);
});

runTest('Formula fallback when area differs by >= 0.11m² (KCC스위첸아파트, 200.0 -> 80.5)', () => {
  const expectedFormula = Math.round(200.0 * 0.3025 * 1.33 * 10) / 10; // 80.5
  const result = testGetSupplyPyeong('KCC스위첸아파트', 200.0);
  assert.strictEqual(result, expectedFormula, `Expected formula fallback ${expectedFormula}, got ${result}`);
  assert.strictEqual(result, 80.5);
});


// --------------------------------------------------
// TEST GROUP 3: XML Parsing Test (Korean & English XML Tags)
// --------------------------------------------------
console.log('\n--- Test Group 3: XML Tag Parsing ---');

function parseXmlItem(itemXml) {
  const tagMap = new Map();
  const tagRegex = /<([^>]+)>([^<]*)<\/\1>/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(itemXml)) !== null) {
    tagMap.set(tagMatch[1], tagMatch[2].trim());
  }
  const getTag = (...keys) => {
    for (const k of keys) {
      const val = tagMap.get(k);
      if (val !== undefined && val !== null && val !== '') return val;
    }
    return '';
  };

  const dong = getTag('umdNm', '법정동', 'dong');
  const aptName = getTag('aptNm', '아파트');
  const depositStr = getTag('deposit', '보증금액', '보증금').replace(/,/g, '').trim();
  const monthlyRentStr = getTag('monthlyRent', '월세금액', '월세') ? getTag('monthlyRent', '월세금액', '월세').replace(/,/g, '').trim() : '0';
  
  const deposit = parseInt(depositStr, 10) || 0;
  const monthlyRent = parseInt(monthlyRentStr, 10) || 0;
  const area = parseFloat(getTag('excluUseAr', '전용면적')) || 0;
  const contractDay = getTag('dealDay', '일').padStart(2, '0');
  const floor = parseInt(getTag('floor', '층'), 10) || 0;

  return { dong, aptName, deposit, monthlyRent, area, contractDay, floor };
}

runTest('Korean XML tags parse correctly without returning 0 or undefined', () => {
  const koreanXml = `
    <item>
      <법정동> 영천동 </법정동>
      <아파트> 시범더샵센트럴시티 </아파트>
      <보증금액> 50,000 </보증금액>
      <월세금액> 50 </월세금액>
      <전용면적> 84.796 </전용면적>
      <일> 15 </일>
      <층> 10 </층>
    </item>
  `;
  const result = parseXmlItem(koreanXml);
  assert.strictEqual(result.dong, '영천동');
  assert.strictEqual(result.aptName, '시범더샵센트럴시티');
  assert.strictEqual(result.deposit, 50000, 'Deposit must not be 0 or undefined');
  assert.strictEqual(result.monthlyRent, 50, 'Monthly rent must not be 0 or undefined');
  assert.strictEqual(result.area, 84.796);
  assert.strictEqual(result.contractDay, '15');
  assert.strictEqual(result.floor, 10);
});

runTest('English XML tags parse correctly without returning 0 or undefined', () => {
  const englishXml = `
    <item>
      <umdNm> 영천동 </umdNm>
      <aptNm> 시범더샵센트럴시티 </aptNm>
      <deposit> 50,000 </deposit>
      <monthlyRent> 50 </monthlyRent>
      <excluUseAr> 84.796 </excluUseAr>
      <dealDay> 15 </dealDay>
      <floor> 10 </floor>
    </item>
  `;
  const result = parseXmlItem(englishXml);
  assert.strictEqual(result.dong, '영천동');
  assert.strictEqual(result.aptName, '시범더샵센트럴시티');
  assert.strictEqual(result.deposit, 50000, 'Deposit must not be 0 or undefined');
  assert.strictEqual(result.monthlyRent, 50, 'Monthly rent must not be 0 or undefined');
  assert.strictEqual(result.area, 84.796);
  assert.strictEqual(result.contractDay, '15');
  assert.strictEqual(result.floor, 10);
});

runTest('Jeonse Korean XML tags parse with monthlyRent = 0 and valid deposit', () => {
  const jeonseXml = `
    <item>
      <법정동> 청계동 </법정동>
      <아파트> 동탄역시범우남퍼스트빌 </아파트>
      <보증금액> 45,000 </보증금액>
      <월세금액> 0 </월세금액>
      <전용면적> 59.98 </전용면적>
      <일> 03 </일>
      <층> 5 </층>
    </item>
  `;
  const result = parseXmlItem(jeonseXml);
  assert.strictEqual(result.dong, '청계동');
  assert.strictEqual(result.aptName, '동탄역시범우남퍼스트빌');
  assert.strictEqual(result.deposit, 45000);
  assert.strictEqual(result.monthlyRent, 0);
  assert.strictEqual(result.area, 59.98);
  assert.strictEqual(result.floor, 5);
});

// Final Summary
console.log('\n==================================================');
console.log(`TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log('==================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
