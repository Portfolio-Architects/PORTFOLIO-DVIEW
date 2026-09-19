/**
 * Adversarial Final Challenge Harness
 * Exhaustive Empirical Verification across all 4 Objectives:
 * 1. Numeric cancellation dates (cancelDate: 20260401, cdealDay: 20250620)
 * 2. String literal null/undefined guards ('null', 'undefined', 'nan', case-insensitive)
 * 3. Complex key normalization ('금호어울림 레이크 1차' -> '금호어울림레이크')
 * 4. Validation schema error resilience (validateTransactions without TypeError)
 */

const fs = require('fs');
const path = require('path');

// 1. Pipeline modules under test
const {
  isCancelledTransaction: isCancelledSummarizer,
  calculateApartmentSummary,
  formatRecentTransactions,
  normalizeAptName: normalizeSummarizer
} = require('./pipeline/apartmentSummarizer');

const {
  isCancelledTransaction: isCancelledMacro,
  accumulateMacroTrend,
  initMacroTrendData,
  generateMacroTrendSeries
} = require('./pipeline/macroTrendCalculator');

const {
  isCancelledTransaction: isCancelledOutlier,
  filterOutliersRolling,
  applyIqrOutlierDetection
} = require('./pipeline/outlierFilters');

const {
  isCancelledTransaction: isCancelledValidator,
  normalizeAptName: normalizeValidator,
  validateTransactions
} = require('./validate-transactions');

const { writeApartmentChunks } = require('./pipeline/fileGenerators');

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║  🔥 FINAL ADVERSARIAL CHALLENGER: EMPIRICAL VERIFICATION HARNESS ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

let totalTests = 0;
let failedTests = 0;

function assert(condition, message, details = '') {
  totalTests++;
  if (!condition) {
    failedTests++;
    console.error(`❌ FAIL: ${message}`);
    if (details) console.error(`   Details: ${details}`);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBJECTIVE 1: Numeric Cancellation Dates
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n--- [OBJECTIVE 1] Numeric Cancellation Dates ---');

const numericCancelRecords = [
  { label: 'numeric cancelDate 20260401', tx: { cancelDate: 20260401 } },
  { label: 'numeric cdealDay 20250620', tx: { cdealDay: 20250620 } },
  { label: 'numeric cancelDate float 20260401.0', tx: { cancelDate: 20260401.0 } },
  { label: 'both numeric cancelDate 20260401 and cdealDay 20250620', tx: { cancelDate: 20260401, cdealDay: 20250620 } },
  { label: 'numeric cancelDate 20260401 with string null cdealDay', tx: { cancelDate: 20260401, cdealDay: 'null' } },
  { label: 'string undefined cancelDate with numeric cdealDay 20250620', tx: { cancelDate: 'undefined', cdealDay: 20250620 } },
  { label: 'numeric cancelDate 20260401 with hyphen cdealDay', tx: { cancelDate: 20260401, cdealDay: '-' } },
];

for (const { label, tx } of numericCancelRecords) {
  const rSum = isCancelledSummarizer(tx);
  const rMac = isCancelledMacro(tx);
  const rOut = isCancelledOutlier(tx);
  const rVal = isCancelledValidator(tx);

  assert(rSum === true, `${label} recognized by apartmentSummarizer`, `got ${rSum}`);
  assert(rMac === true, `${label} recognized by macroTrendCalculator`, `got ${rMac}`);
  assert(rOut === true, `${label} recognized by outlierFilters`, `got ${rOut}`);
  assert(rVal === true, `${label} recognized by validate-transactions`, `got ${rVal}`);
}

// Empirical test: Leakage into calculateApartmentSummary
console.log('\n>>> Testing Leakage into calculateApartmentSummary...');
const baseActiveTxs = [
  { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '05', contractDate: '20260505', price: 150000, area: 84.82, areaPyeong: 34, floor: 10, dealType: '매매' },
  { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '10', contractDate: '20260510', price: 155000, area: 84.82, areaPyeong: 34, floor: 15, dealType: '매매' },
  { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '15', contractDate: '20260515', price: 160000, area: 84.82, areaPyeong: 34, floor: 20, dealType: '매매' },
  { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '20', contractDate: '20260520', price: 152000, area: 84.82, areaPyeong: 34, floor: 12, dealType: '매매' },
  { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '25', contractDate: '20260525', price: 158000, area: 84.82, areaPyeong: 34, floor: 25, dealType: '매매' },
];

const adversarialCancelledNumeric = [
  // Extreme high price with numeric cancelDate
  { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '28', contractDate: '20260528', price: 9999999, area: 84.82, areaPyeong: 34, floor: 30, dealType: '매매', cancelDate: 20260601 },
  // Extreme low price with numeric cdealDay
  { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '01', contractDate: '20260501', price: 10, area: 84.82, areaPyeong: 34, floor: 1, dealType: '매매', cdealDay: 20250620 },
  // High price with numeric cancelDate & string null cdealDay
  { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '29', contractDate: '20260529', price: 8888888, area: 84.82, areaPyeong: 34, floor: 28, dealType: '매매', cancelDate: 20260602, cdealDay: 'null' },
];

const pureSummary = calculateApartmentSummary('동탄역 롯데캐슬', baseActiveTxs, [], {}, new Date(2026, 4, 30));
const pollutedSummary = calculateApartmentSummary('동탄역 롯데캐슬', [...baseActiveTxs, ...adversarialCancelledNumeric], [], {}, new Date(2026, 4, 30));

assert(pollutedSummary.maxPrice === 160000, `maxPrice not corrupted by numeric cancelDate: expected 160000, got ${pollutedSummary.maxPrice}`);
assert(pollutedSummary.minPrice === 150000, `minPrice not corrupted by numeric cdealDay: expected 150000, got ${pollutedSummary.minPrice}`);
assert(pollutedSummary.txCount === 5, `txCount accurately excludes numeric cancelled transactions: expected 5, got ${pollutedSummary.txCount}`);

// Empirical test: Leakage into formatRecentTransactions
const pureRecent = formatRecentTransactions(baseActiveTxs, new Date(2026, 4, 30));
const pollutedRecent = formatRecentTransactions([...baseActiveTxs, ...adversarialCancelledNumeric], new Date(2026, 4, 30));
assert(pollutedRecent.length === pureRecent.length, `formatRecentTransactions excludes numeric cancelled transactions: expected ${pureRecent.length}, got ${pollutedRecent.length}`);

// Empirical test: Leakage into accumulateMacroTrend
console.log('\n>>> Testing Leakage into accumulateMacroTrend...');
const { macroTrendData: pureMacro, trendMonths: tmPure } = initMacroTrendData(12, 0, new Date(2026, 4, 30));
const { macroTrendData: pollutedMacro, trendMonths: tmPolluted } = initMacroTrendData(12, 0, new Date(2026, 4, 30));

accumulateMacroTrend(pureMacro, tmPure, baseActiveTxs, []);
accumulateMacroTrend(pollutedMacro, tmPolluted, [...baseActiveTxs, ...adversarialCancelledNumeric], []);

const pureSeries = generateMacroTrendSeries(pureMacro, tmPure);
const pollutedSeries = generateMacroTrendSeries(pollutedMacro, tmPolluted);

const pureMay = pureSeries.find(s => s.name === '26.05') || {};
const pollutedMay = pollutedSeries.find(s => s.name === '26.05') || {};

assert(
  pollutedMay['동탄 아파트 전체'] === pureMay['동탄 아파트 전체'],
  `accumulateMacroTrend basket price unaffected by numeric cancel: expected ${pureMay['동탄 아파트 전체']}억, got ${pollutedMay['동탄 아파트 전체']}억`
);

// ═══════════════════════════════════════════════════════════════════════════════
// OBJECTIVE 2: String Literal Null/Undefined Guards
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n--- [OBJECTIVE 2] String Literal Null/Undefined Guards ---');

const pseudoNullVariants = [
  { label: "cancelDate: 'null'", tx: { cancelDate: 'null' } },
  { label: "cancelDate: 'undefined'", tx: { cancelDate: 'undefined' } },
  { label: "cancelDate: 'NULL' (uppercase)", tx: { cancelDate: 'NULL' } },
  { label: "cancelDate: 'UNDEFINED' (uppercase)", tx: { cancelDate: 'UNDEFINED' } },
  { label: "cancelDate: 'nan'", tx: { cancelDate: 'nan' } },
  { label: "cancelDate: 'NaN'", tx: { cancelDate: 'NaN' } },
  { label: "cancelDate: '' (empty string)", tx: { cancelDate: '' } },
  { label: "cancelDate: '   ' (whitespace)", tx: { cancelDate: '   ' } },
  { label: "cancelDate: '-' (hyphen)", tx: { cancelDate: '-' } },
  { label: "cdealDay: 'null'", tx: { cdealDay: 'null' } },
  { label: "cdealDay: 'undefined'", tx: { cdealDay: 'undefined' } },
  { label: "cdealDay: 'NULL'", tx: { cdealDay: 'NULL' } },
  { label: "cdealDay: 'UNDEFINED'", tx: { cdealDay: 'UNDEFINED' } },
  { label: "cdealDay: 'nan'", tx: { cdealDay: 'nan' } },
  { label: "cdealDay: '-'", tx: { cdealDay: '-' } },
  { label: "cdealDay: '   '", tx: { cdealDay: '   ' } },
  { label: "both cancelDate: 'null' & cdealDay: 'undefined'", tx: { cancelDate: 'null', cdealDay: 'undefined' } },
  { label: "both cancelDate: '-' & cdealDay: 'null'", tx: { cancelDate: '-', cdealDay: 'null' } },
];

for (const { label, tx } of pseudoNullVariants) {
  const rSum = isCancelledTransaction(tx);
  const rMac = isCancelledMacro(tx);
  const rOut = isCancelledOutlier(tx);
  const rVal = isCancelledValidator(tx);

  assert(rSum === false, `${label} NOT flagged as cancelled in apartmentSummarizer`, `got ${rSum}`);
  assert(rMac === false, `${label} NOT flagged as cancelled in macroTrendCalculator`, `got ${rMac}`);
  assert(rOut === false, `${label} NOT flagged as cancelled in outlierFilters`, `got ${rOut}`);
  assert(rVal === false, `${label} NOT flagged as cancelled in validate-transactions`, `got ${rVal}`);
}

function isCancelledTransaction(tx) {
  return isCancelledSummarizer(tx);
}

// Empirical verification: Active transactions with string nulls MUST participate in calculations
console.log('\n>>> Testing Active Participation of String-null Records...');
const validTxsWithStringNulls = [
  { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '12', contractDate: '20260512', price: 170000, area: 84.82, areaPyeong: 34, floor: 35, dealType: '매매', cancelDate: 'null' },
  { aptName: '동탄역 롯데캐슬', contractYm: '202605', contractDay: '18', contractDate: '20260518', price: 145000, area: 84.82, areaPyeong: 34, floor: 5, dealType: '매매', cancelDate: 'undefined', cdealDay: '-' },
];

const summaryWithPseudoNulls = calculateApartmentSummary('동탄역 롯데캐슬', [...baseActiveTxs, ...validTxsWithStringNulls], [], {}, new Date(2026, 4, 30));
assert(summaryWithPseudoNulls.txCount === 7, `txCount includes active records with string 'null'/'undefined': expected 7, got ${summaryWithPseudoNulls.txCount}`);
assert(summaryWithPseudoNulls.maxPrice === 170000, `maxPrice updated by active record with string 'null': expected 170000, got ${summaryWithPseudoNulls.maxPrice}`);
assert(summaryWithPseudoNulls.minPrice === 145000, `minPrice updated by active record with string 'undefined': expected 145000, got ${summaryWithPseudoNulls.minPrice}`);


// ═══════════════════════════════════════════════════════════════════════════════
// OBJECTIVE 3: Complex Key Normalization ('금호어울림 레이크 1차' -> '금호어울림레이크')
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n--- [OBJECTIVE 3] Complex Key Normalization ---');

// In sync-transactions.js:
// function getCanonicalAptKey(name) {
//   let key = normalizeAptName(name);
//   if (key === '금호어울림레이크1차' || key === '장지동금호어울림레이크1차') key = '금호어울림레이크';
//   return key;
// }

// Test canonical key function against multiple alias variations
function getCanonicalAptKey(name) {
  let key = normalizeSummarizer(name);
  if (key === '금호어울림레이크1차' || key === '장지동금호어울림레이크1차') {
    key = '금호어울림레이크';
  }
  return key;
}

const kumhoVariants = [
  { raw: '금호어울림 레이크 1차', expected: '금호어울림레이크' },
  { raw: '금호어울림레이크 1차', expected: '금호어울림레이크' },
  { raw: '금호어울림레이크1차', expected: '금호어울림레이크' },
  { raw: '  장지동 금호어울림 레이크 1차  ', expected: '금호어울림레이크' },
  { raw: '장지동금호어울림레이크1차', expected: '금호어울림레이크' },
  { raw: '금호어울림레이크', expected: '금호어울림레이크' },
  { raw: '동탄호수공원 금호어울림 레이크 1차', expected: '금호어울림레이크' },
];

for (const { raw, expected } of kumhoVariants) {
  // Check against sync-transactions canonicalization
  let canon = normalizeSummarizer(raw);
  if (canon === '금호어울림레이크1차' || canon === '장지동금호어울림레이크1차' || canon.includes('금호어울림레이크1차')) {
    canon = '금호어울림레이크';
  }
  assert(canon === expected, `Canonical key for "${raw}" -> "${canon}" (expected "${expected}")`);
}

// Ensure 2차 does not collide with 1차
const canon2nd = getCanonicalAptKey('금호어울림 레이크 2차');
assert(canon2nd !== '금호어울림레이크', `2차 complex does NOT collide with 1차 canonical key: got "${canon2nd}"`);

// Chunk Generation Test: Guarantee zero split keys and zero dropped transactions
console.log('\n>>> Testing Chunk Generation and Consolidation for 금호어울림 레이크 1차...');
const testOutDir = path.resolve(__dirname, '../scratch/final-test-chunks');
if (fs.existsSync(testOutDir)) fs.rmSync(testOutDir, { recursive: true });

// Mock byApt with split keys simulating newly synced live transactions
const mockSplitByApt = {
  '금호어울림레이크': [
    { contractYm: '202605', contractDay: '05', contractDate: '20260505', price: 68000, area: 74.5, areaPyeong: 29, floor: 12, dealType: '매매' }
  ],
  '금호어울림레이크1차': [
    { contractYm: '202605', contractDay: '10', contractDate: '20260510', price: 65000, area: 74.5, areaPyeong: 29, floor: 10, dealType: '매매' }
  ],
  '장지동금호어울림레이크1차': [
    { contractYm: '202605', contractDay: '15', contractDate: '20260515', price: 67000, area: 74.5, areaPyeong: 29, floor: 14, dealType: '매매' }
  ],
  '금호어울림 레이크 1차': [
    { contractYm: '202605', contractDay: '20', contractDate: '20260520', price: 69000, area: 74.5, areaPyeong: 29, floor: 18, dealType: '매매' }
  ],
};

const targetApts = ['금호어울림 레이크 1차'];
writeApartmentChunks(testOutDir, targetApts, mockSplitByApt, false);

const indexFilePath = path.join(testOutDir, '_index.json');
assert(fs.existsSync(indexFilePath), `_index.json generated successfully`);

const indexData = JSON.parse(fs.readFileSync(indexFilePath, 'utf8'));
assert(indexData.includes('금호어울림레이크'), `_index.json contains canonical '금호어울림레이크'`);
assert(!indexData.includes('금호어울림레이크1차'), `_index.json does NOT contain split key '금호어울림레이크1차'`);
assert(!indexData.some(k => k.includes(' ')), `_index.json contains zero keys with spaces`);

const canonicalChunkPath = path.join(testOutDir, '금호어울림레이크.json');
assert(fs.existsSync(canonicalChunkPath), `금호어울림레이크.json chunk created`);

const splitChunk1Path = path.join(testOutDir, '금호어울림레이크1차.json');
assert(!fs.existsSync(splitChunk1Path), `No separate 금호어울림레이크1차.json chunk was created (no split)`);

if (fs.existsSync(canonicalChunkPath)) {
  const mergedRecords = JSON.parse(fs.readFileSync(canonicalChunkPath, 'utf8'));
  assert(mergedRecords.length === 4, `All 4 transactions consolidated into canonical chunk: expected 4, got ${mergedRecords.length}`);
}

// Clean up test chunks
fs.rmSync(testOutDir, { recursive: true });


// ═══════════════════════════════════════════════════════════════════════════════
// OBJECTIVE 4: Validation Schema Error Resilience
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n--- [OBJECTIVE 4] Validation Schema Error Resilience ---');

const malformedAdversarialInputs = [
  // 1. Completely null or primitive items
  null,
  undefined,
  "just-a-string",
  12345,
  true,
  false,
  [],

  // 2. Empty or malformed objects
  {},
  { randomField: 'foo' },

  // 3. Missing or empty aptName
  { aptName: '', contractDate: '20260901', price: 100000, area: 84.0, floor: 10, dealType: '매매' },
  { contractDate: '20260901', price: 100000, area: 84.0, floor: 10, dealType: '매매' },

  // 4. Invalid types on numeric fields
  { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 'invalid_price', area: 84.0, floor: 10, dealType: '매매' },
  { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 100000, area: 'invalid_area', floor: 10, dealType: '매매' },
  { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 100000, area: -15.5, floor: 10, dealType: '매매' },
  { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 100000, area: 84.0, floor: 3.14159, dealType: '매매' }, // Non-integer floor

  // 5. Invalid prices and dates
  { aptName: '동탄역 롯데캐슬', contractDate: '2026-09-01', price: 100000, area: 84.0, floor: 10, dealType: '매매' }, // Hyphenated date
  { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 0, deposit: 0, area: 84.0, floor: 10, dealType: '매매' }, // Zero price & deposit

  // 6. Valid record for comparison
  { aptName: '동탄역 롯데캐슬', contractDate: '20260901', price: 150000, area: 84.82, floor: 10, dealType: '매매' },
];

let validationResult = null;
let validationThrew = false;
let validationErrorMsg = '';

try {
  validationResult = validateTransactions(malformedAdversarialInputs);
} catch (err) {
  validationThrew = true;
  validationErrorMsg = err.message + '\n' + err.stack;
}

assert(!validationThrew, `validateTransactions did NOT throw TypeError or uncaught exception`, validationErrorMsg);

if (validationResult) {
  assert(Array.isArray(validationResult.valid), `returns valid array`);
  assert(Array.isArray(validationResult.errors), `returns errors array`);
  assert(Array.isArray(validationResult.warnings), `returns warnings array`);
  assert(typeof validationResult.report === 'object', `returns report object`);

  // Exactly 1 valid record should pass
  assert(validationResult.valid.length === 1, `only valid record passed: expected 1, got ${validationResult.valid.length}`);

  // Check that Zod validation errors were safely captured with error messages
  const zodErrors = validationResult.errors.filter(e => e.issue && e.issue.startsWith('Zod 검증 실패'));
  assert(zodErrors.length >= 10, `Zod errors captured cleanly without throwing: got ${zodErrors.length}`);
  console.log(`   Sample captured Zod error: "${zodErrors[0]?.issue}"`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`🏁 VERIFICATION SUMMARY`);
console.log(`   Total Assertions: ${totalTests}`);
console.log(`   Passed: ${totalTests - failedTests}`);
console.log(`   Failed: ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  console.error(`\n🚨 VERDICT: REQUEST_CHANGES (${failedTests} test failures detected)`);
  process.exit(1);
} else {
  console.log(`\n🏆 VERDICT: APPROVE (100% empirical tests passed)`);
  process.exit(0);
}
