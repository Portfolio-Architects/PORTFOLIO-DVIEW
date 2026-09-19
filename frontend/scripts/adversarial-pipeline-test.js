/**
 * Adversarial Pipeline Stress Test Runner
 * Empirical Verification of Cancellation Filtering and Key Normalization
 */

const { isCancelledTransaction: isCancelledSummarizer, calculateApartmentSummary, formatRecentTransactions } = require('./pipeline/apartmentSummarizer');
const { isCancelledTransaction: isCancelledMacro, accumulateMacroTrend, initMacroTrendData, generateMacroTrendSeries } = require('./pipeline/macroTrendCalculator');
const { isCancelledTransaction: isCancelledOutlier, filterOutliersRolling, applyIqrOutlierDetection } = require('./pipeline/outlierFilters');
const { isCancelledTransaction: isCancelledValidator, normalizeAptName: normalizeInValidator } = require('./validate-transactions');
const { writeApartmentChunks } = require('./pipeline/fileGenerators');
const { normalizeAptName } = require('./pipeline/apartmentSummarizer');
// CommonJS only
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🧪 EMPIRICAL CHALLENGER: Adversarial Pipeline Verification');
console.log('================================================================\n');

// ─────────────────────────────────────────────────────────────────────────────
// 1. CANCELLATION SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────
console.log('--- [TEST 1] isCancelledTransaction Classification ---');

const cancellationVariants = [
  { name: "spaced cancelDate ' 20260401 '", tx: { cancelDate: ' 20260401 ' }, expected: true },
  { name: "dash cancelDate '-'", tx: { cancelDate: '-' }, expected: false },
  { name: "empty cancelDate ''", tx: { cancelDate: '' }, expected: false },
  { name: "null cancelDate", tx: { cancelDate: null }, expected: false },
  { name: "undefined cancelDate", tx: { cancelDate: undefined }, expected: false },
  { name: "numeric cancelDate 20260401", tx: { cancelDate: 20260401 }, expected: true },
  { name: "cdealDay '2025.06.20'", tx: { cdealDay: '2025.06.20' }, expected: true },
  { name: "numeric cdealDay 20250620", tx: { cdealDay: 20250620 }, expected: true },
  { name: "cdealType 'O'", tx: { cdealType: 'O' }, expected: true },
  { name: "cdealType '해제'", tx: { cdealType: '해제' }, expected: true },
  { name: "isCanceled true", tx: { isCanceled: true }, expected: true },
  { name: "string 'null' cancelDate", tx: { cancelDate: 'null' }, expected: false },
  { name: "string 'undefined' cancelDate", tx: { cancelDate: 'undefined' }, expected: false },
  { name: "normal active transaction", tx: { price: 85000, contractYm: '202605', dealType: '매매' }, expected: false },
  { name: "null transaction object", tx: null, expected: false },
  { name: "undefined transaction object", tx: undefined, expected: false },
];

let cancellationFailures = 0;
for (const v of cancellationVariants) {
  const rS = isCancelledSummarizer(v.tx);
  const rM = isCancelledMacro(v.tx);
  const rO = isCancelledOutlier(v.tx);
  const rV = isCancelledValidator(v.tx);

  const matchS = rS === v.expected;
  const matchM = rM === v.expected;
  const matchO = rO === v.expected;
  const matchV = rV === v.expected;

  const allMatch = matchS && matchM && matchO && matchV;
  if (!allMatch) {
    cancellationFailures++;
    console.error(`❌ FAIL: ${v.name}`);
    console.error(`   Expected: ${v.expected}`);
    console.error(`   Results: Summarizer=${rS}, Macro=${rM}, Outlier=${rO}, Validator=${rV}`);
  } else {
    console.log(`✅ PASS: ${v.name} -> ${rS}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MIXED CANCELLATION DISTORTION ON AGGREGATIONS
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- [TEST 2] Distortion Check on Aggregations ---');

const activeTransactions = [
  { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '05', contractDate: '20260505', price: 95000, area: 84.9, areaPyeong: 34, dealType: '매매' },
  { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '10', contractDate: '20260510', price: 100000, area: 84.9, areaPyeong: 34, dealType: '매매' },
  { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '15', contractDate: '20260515', price: 105000, area: 84.9, areaPyeong: 34, dealType: '매매' },
  { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '20', contractDate: '20260520', price: 110000, area: 84.9, areaPyeong: 34, dealType: '매매' },
  { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '25', contractDate: '20260525', price: 102000, area: 84.9, areaPyeong: 34, dealType: '매매' }
];

// Adversarial cancelled transactions intended to distort min, max, count, and macro trend
const adversarialCancelledTxs = [
  // Extreme fake high price that was cancelled
  { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '26', contractDate: '20260526', price: 999999, area: 84.9, areaPyeong: 34, dealType: '매매', cancelDate: '20260601' },
  // Extreme fake low price that was cancelled
  { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '02', contractDate: '20260502', price: 1000, area: 84.9, areaPyeong: 34, dealType: '매매', cdealDay: '2026.05.03' },
  // Cancelled transaction with cdealType 'O'
  { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '12', contractDate: '20260512', price: 500000, area: 84.9, areaPyeong: 34, dealType: '매매', cdealType: 'O' },
  // Cancelled transaction with cdealType '해제'
  { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '18', contractDate: '20260518', price: 400000, area: 84.9, areaPyeong: 34, dealType: '매매', cdealType: '해제' },
  // Cancelled transaction with isCanceled: true
  { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '22', contractDate: '20260522', price: 888888, area: 84.9, areaPyeong: 34, dealType: '매매', isCanceled: true },
  // Cancelled transaction with numeric cancelDate
  { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '24', contractDate: '20260524', price: 777777, area: 84.9, areaPyeong: 34, dealType: '매매', cancelDate: 20260601 },
  // Cancelled transaction with spaced cancelDate
  { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '28', contractDate: '20260528', price: 666666, area: 84.9, areaPyeong: 34, dealType: '매매', cancelDate: ' 20260602 ' },
];

const pureSummary = calculateApartmentSummary('동탄역시범우남퍼스트빌', activeTransactions, [], {}, new Date(2026, 4, 30));
const mixedTransactions = [...activeTransactions, ...adversarialCancelledTxs];
const mixedSummary = calculateApartmentSummary('동탄역시범우남퍼스트빌', mixedTransactions, [], {}, new Date(2026, 4, 30));

let summaryFailures = 0;
console.log(`Pure Summary: max=${pureSummary.maxPrice}, min=${pureSummary.minPrice}, txCount=${pureSummary.txCount}`);
console.log(`Mixed Summary: max=${mixedSummary.maxPrice}, min=${mixedSummary.minPrice}, txCount=${mixedSummary.txCount}`);

if (mixedSummary.maxPrice !== 110000) {
  console.error(`❌ FAIL: maxPrice distorted by cancelled tx! Got ${mixedSummary.maxPrice}, expected 110000`);
  summaryFailures++;
} else {
  console.log(`✅ PASS: maxPrice is not distorted (110000)`);
}

if (mixedSummary.minPrice !== 95000) {
  console.error(`❌ FAIL: minPrice distorted by cancelled tx! Got ${mixedSummary.minPrice}, expected 95000`);
  summaryFailures++;
} else {
  console.log(`✅ PASS: minPrice is not distorted (95000)`);
}

if (mixedSummary.txCount !== 5) {
  console.error(`❌ FAIL: txCount distorted by cancelled tx! Got ${mixedSummary.txCount}, expected 5`);
  summaryFailures++;
} else {
  console.log(`✅ PASS: txCount is not distorted (5)`);
}

// Check formatRecentTransactions
const pureRecent = formatRecentTransactions(activeTransactions, new Date(2026, 4, 30));
const mixedRecent = formatRecentTransactions(mixedTransactions, new Date(2026, 4, 30));
console.log(`Recent Txs: pure=${pureRecent.length}, mixed=${mixedRecent.length}`);
if (mixedRecent.length !== pureRecent.length) {
  console.error(`❌ FAIL: formatRecentTransactions included cancelled transactions! Got ${mixedRecent.length}, expected ${pureRecent.length}`);
  summaryFailures++;
} else {
  console.log(`✅ PASS: formatRecentTransactions has 0 cancelled transactions`);
}

// Check accumulateMacroTrend
// Note: In accumulateMacroTrend, the latest transaction for the complex determines the basket price for the month.
// If the latest transaction is a cancelled transaction with numeric cancelDate, does it distort the macro trend?
const mixedWithLatestNumericCancel = [
  ...activeTransactions,
  // Latest transaction for May 2026: Day 30 with extreme price and numeric cancelDate
  { aptName: '동탄역시범우남퍼스트빌', contractYm: '202605', contractDay: '30', contractDate: '20260530', price: 999999, area: 84.9, areaPyeong: 34, dealType: '매매', cancelDate: 20260601 }
];

const { macroTrendData: pureTrendData, trendMonths: trendMonths1 } = initMacroTrendData(12, 0, new Date(2026, 4, 30));
const { macroTrendData: mixedTrendData, trendMonths: trendMonths2 } = initMacroTrendData(12, 0, new Date(2026, 4, 30));

accumulateMacroTrend(pureTrendData, trendMonths1, activeTransactions, []);
accumulateMacroTrend(mixedTrendData, trendMonths2, mixedWithLatestNumericCancel, []);

const pureSeries = generateMacroTrendSeries(pureTrendData, trendMonths1);
const mixedSeries = generateMacroTrendSeries(mixedTrendData, trendMonths2);

const pureMay = pureSeries.find(s => s.name === '26.05') || {};
const mixedMay = mixedSeries.find(s => s.name === '26.05') || {};

console.log(`Macro Trend (2026.05 label='26.05'): Pure basket price=${pureMay['동탄 아파트 전체']}억, Mixed basket price=${mixedMay['동탄 아파트 전체']}억`);
if (mixedMay['동탄 아파트 전체'] !== pureMay['동탄 아파트 전체']) {
  console.error(`❌ FAIL: accumulateMacroTrend distorted by cancelled tx! Got ${mixedMay['동탄 아파트 전체']}억, expected ${pureMay['동탄 아파트 전체']}억`);
  summaryFailures++;
} else {
  console.log(`✅ PASS: accumulateMacroTrend avgPrice matches pure baseline`);
}


// ─────────────────────────────────────────────────────────────────────────────
// 3. APARTMENT NAME NORMALIZATION & 404 / SPLIT PREVENTION
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n--- [TEST 3] Apartment Name Normalization & Chunk Integrity ---');

const complexNameScenarios = [
  { raw: '  동탄역 시범 한화 꿈에그린 프레스티지  ', expected: '동탄역시범한화꿈에그린프레스티지' },
  { raw: '[청계동] 동탄역시범우남퍼스트빌 (1단지)', expected: '동탄역시범우남퍼스트빌1단지' },
  { raw: '동탄역\u200B롯데캐슬\uFEFF', expected: '동탄역롯데캐슬' },
  { raw: '동탄숲속마을\u00A0광명메이루즈', expected: '동탄숲속마을광명메이루즈' },
  { raw: '금호어울림 레이크 1차', expectedNorm: '금호어울림레이크1차', expectedFinal: '금호어울림레이크' },
  { raw: '금호어울림레이크 1차', expectedNorm: '금호어울림레이크1차', expectedFinal: '금호어울림레이크' },
  { raw: '금호어울림레이크1차', expectedNorm: '금호어울림레이크1차', expectedFinal: '금호어울림레이크' },
];

let normFailures = 0;
for (const sc of complexNameScenarios) {
  const norm1 = normalizeAptName(sc.raw);
  const norm2 = normalizeInValidator(sc.raw);
  if (sc.expected) {
    if (norm1 !== sc.expected && norm2 !== sc.expected) {
      console.error(`❌ FAIL: Normalization mismatch for "${sc.raw}": got "${norm1}" / "${norm2}", expected "${sc.expected}"`);
      normFailures++;
    } else {
      console.log(`✅ PASS: "${sc.raw}" -> "${norm1 || norm2}"`);
    }
  }
}

// Verify 금호어울림 레이크 1차 resolving
console.log('\n--- Checking 금호어울림 레이크 1차 resolving across catalog and chunk generation ---');
const testScratchDir = path.resolve(__dirname, '../scratch/adversarial-apt-chunks');
if (fs.existsSync(testScratchDir)) fs.rmSync(testScratchDir, { recursive: true });

const mockByApt = {
  '금호어울림 레이크 1차': [
    { contractYm: '202605', contractDay: '10', price: 65000, area: 74.5, areaPyeong: 29, floor: 10, dealType: '매매' }
  ],
  '금호어울림레이크': [
    { contractYm: '202605', contractDay: '15', price: 68000, area: 74.5, areaPyeong: 29, floor: 12, dealType: '매매' }
  ],
  '동탄숲속마을 광명메이루즈': [
    { contractYm: '202605', contractDay: '01', price: 55000, area: 84.9, areaPyeong: 34, floor: 8, dealType: '매매' }
  ],
  '동탄숲속마을광명메이루즈': [
    { contractYm: '202605', contractDay: '05', price: 56000, area: 84.9, areaPyeong: 34, floor: 9, dealType: '매매' }
  ]
};

// Test writeApartmentChunks
const targetAptsInput = ['금호어울림 레이크 1차', '동탄숲속마을 광명메이루즈'];
const chunkRes = writeApartmentChunks(testScratchDir, targetAptsInput, mockByApt, false);

const indexFile = path.join(testScratchDir, '_index.json');
const indexList = JSON.parse(fs.readFileSync(indexFile, 'utf8'));

console.log(`Generated _index.json:`, indexList);

let chunkFailures = 0;
// 1. Index should not have spaced keys
if (indexList.some(k => k.includes(' '))) {
  console.error(`❌ FAIL: _index.json contains spaced keys!`, indexList);
  chunkFailures++;
} else {
  console.log(`✅ PASS: _index.json contains no spaces.`);
}

// 2. Index should contain 금호어울림레이크
if (!indexList.includes('금호어울림레이크')) {
  console.error(`❌ FAIL: _index.json missing 금호어울림레이크!`);
  chunkFailures++;
} else {
  console.log(`✅ PASS: _index.json includes 금호어울림레이크`);
}

// 3. Files in dir must match index exactly, no 404s
for (const key of indexList) {
  const fPath = path.join(testScratchDir, `${key}.json`);
  const fRecent = path.join(testScratchDir, `${key}-recent.json`);
  if (!fs.existsSync(fPath)) {
    console.error(`❌ FAIL: Missing file ${fPath} -> 404!`);
    chunkFailures++;
  } else {
    console.log(`✅ PASS: Found chunk file ${key}.json`);
  }
  if (!fs.existsSync(fRecent)) {
    console.error(`❌ FAIL: Missing recent chunk file ${fRecent} -> 404!`);
    chunkFailures++;
  } else {
    console.log(`✅ PASS: Found recent chunk file ${key}-recent.json`);
  }
}

// Clean up test scratch dir
fs.rmSync(testScratchDir, { recursive: true });

console.log('\n================================================================');
console.log(`Summary of Failures:`);
console.log(`- Cancellation Classification Failures: ${cancellationFailures}`);
console.log(`- Summary/Macro Distortion Failures: ${summaryFailures}`);
console.log(`- Normalization Failures: ${normFailures}`);
console.log(`- Chunk/Index Integrity Failures: ${chunkFailures}`);
console.log('================================================================');

if (cancellationFailures + summaryFailures + normFailures + chunkFailures > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
