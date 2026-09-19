/**
 * 🧪 EMPIRICAL PIPELINE & DATA INTEGRITY ADVERSARIAL STRESS TEST SUITE
 * 
 * Objective: Verify static assets in public/data/ and public/tx-data/ against:
 * 1. 182 complexes accounted for
 * 2. Zero cancelled transactions (cdealDay, cdealType, cancelDate, isCanceled) in period files
 * 3. Price values validity (no price <= 0, no NaN, maxPrice >= minPrice in complex summaries)
 * 4. Chronological bounds (90d <= 90d, 1y <= 365d, 3y <= 1095d)
 * 5. Transaction counts progression (90d < 1y < 3y < all) & strict subset containment
 */

const fs = require('fs');
const path = require('path');
const {
  isCancelledTransaction,
  normalizeAptName,
  parseYYYYMMDD
} = require('./pipeline/apartmentSummarizer');

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║   🔥 CHALLENGER 1: EMPIRICAL DATA INTEGRITY & PIPELINE STRESS TEST       ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DATA = path.join(ROOT, 'public/data');
const PUBLIC_TX_DATA = path.join(ROOT, 'public/tx-data');

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

const testResults = [];

function assert(condition, testName, details = '') {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ [PASS] ${testName}`);
    testResults.push({ name: testName, status: 'PASS', details });
  } else {
    failedAssertions++;
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) console.error(`     Details: ${details}`);
    testResults.push({ name: testName, status: 'FAIL', details });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST 1: All 182 Complexes Accounted For
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log('TEST 1: Complex Count & Catalog Integrity (Target: >= 182 complexes)');
console.log('================================================================');

// 1.1 tx-summary.json complex count
const txSummaryRaw = JSON.parse(fs.readFileSync(path.join(PUBLIC_DATA, 'tx-summary.json'), 'utf8'));
const summaryObj = txSummaryRaw.summary || txSummaryRaw;
const summaryComplexKeys = Object.keys(summaryObj);
console.log(`- tx-summary.json total complex keys: ${summaryComplexKeys.length}`);
assert(summaryComplexKeys.length >= 182, `tx-summary.json has >= 182 complexes (actual: ${summaryComplexKeys.length})`, `Expected >= 182, got ${summaryComplexKeys.length}`);

// 1.2 public/tx-data disk files count
const diskComplexFiles = fs.readdirSync(PUBLIC_TX_DATA)
  .filter(f => f.endsWith('.json') && !f.endsWith('-recent.json') && f !== '_index.json')
  .map(f => f.replace('.json', ''));
console.log(`- public/tx-data disk complex files: ${diskComplexFiles.length}`);
assert(diskComplexFiles.length >= 182, `public/tx-data contains >= 182 complex files (actual: ${diskComplexFiles.length})`, `Expected >= 182, got ${diskComplexFiles.length}`);

// 1.3 public/tx-data/_index.json count
const indexList = JSON.parse(fs.readFileSync(path.join(PUBLIC_TX_DATA, '_index.json'), 'utf8'));
console.log(`- public/tx-data/_index.json complex count: ${indexList.length}`);
assert(indexList.length >= 182, `_index.json indexes >= 182 complexes (actual: ${indexList.length})`, `Expected >= 182, got ${indexList.length}`);

// 1.4 Non-empty complex files count (> 2 bytes, i.e. contains transactions)
const nonEmptyComplexFiles = diskComplexFiles.filter(f => {
  const stat = fs.statSync(path.join(PUBLIC_TX_DATA, `${f}.json`));
  return stat.size > 2;
});
console.log(`- Non-empty complex files (>2 bytes): ${nonEmptyComplexFiles.length}`);
assert(nonEmptyComplexFiles.length >= 182, `Non-empty complex files >= 182 (actual: ${nonEmptyComplexFiles.length})`, `Expected >= 182, got ${nonEmptyComplexFiles.length}`);

// 1.5 Total transactions scale across all complex files
let totalTxAcrossDisk = 0;
let totalSaleAcrossDisk = 0;
let totalRentAcrossDisk = 0;
diskComplexFiles.forEach(f => {
  const data = JSON.parse(fs.readFileSync(path.join(PUBLIC_TX_DATA, `${f}.json`), 'utf8'));
  if (Array.isArray(data)) {
    totalTxAcrossDisk += data.length;
    data.forEach(t => {
      if (t.dealType === '전세' || t.dealType === '월세') totalRentAcrossDisk++;
      else totalSaleAcrossDisk++;
    });
  }
});
console.log(`- Total transactions across all complex files: ${totalTxAcrossDisk} (Sale: ${totalSaleAcrossDisk}, Rent: ${totalRentAcrossDisk})`);
assert(totalTxAcrossDisk >= 169000, `Total transaction scale >= 169,000 (actual: ${totalTxAcrossDisk})`, `Expected >= 169000, got ${totalTxAcrossDisk}`);


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 2: Zero Cancelled Transactions in Compiled Static Assets
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log('TEST 2: Zero Cancelled Transactions in Period Assets');
console.log('================================================================');

const periodFiles = [
  { name: 'recent-transactions.json (90d)', path: path.join(PUBLIC_DATA, 'recent-transactions.json') },
  { name: 'transactions-1y.json (1y)', path: path.join(PUBLIC_DATA, 'transactions-1y.json') },
  { name: 'transactions-3y.json (3y)', path: path.join(PUBLIC_DATA, 'transactions-3y.json') },
  { name: 'transactions-all.json (all-time)', path: path.join(PUBLIC_DATA, 'transactions-all.json') }
];

// 2.1 First build a database of all cancelled transactions from raw tx-data files
const rawCancelledSet = new Set();
let totalRawCancelledCount = 0;

diskComplexFiles.forEach(f => {
  const data = JSON.parse(fs.readFileSync(path.join(PUBLIC_TX_DATA, `${f}.json`), 'utf8'));
  if (Array.isArray(data)) {
    data.forEach(t => {
      if (isCancelledTransaction(t)) {
        totalRawCancelledCount++;
        const norm = normalizeAptName(t.aptName || f);
        const ym = t.contractYm || '';
        const day = String(t.contractDay || '').padStart(2, '0');
        const price = t.price || 0;
        const area = Math.round((t.area || 0) * 100) / 100;
        const floor = t.floor || 0;
        rawCancelledSet.add(`${norm}_${ym}_${day}_${price}_${area}_${floor}`);
      }
    });
  }
});
console.log(`- Extracted ${totalRawCancelledCount} raw cancelled transactions (${rawCancelledSet.size} unique signature keys)`);

// 2.2 Now inspect each period file
periodFiles.forEach(pf => {
  const content = JSON.parse(fs.readFileSync(pf.path, 'utf8'));
  let records = [];

  if (content.fields && Array.isArray(content.data)) {
    // Tuple format
    const fMap = {};
    content.fields.forEach((col, idx) => { fMap[col] = idx; });
    records = content.data.map(row => ({
      aptName: row[fMap['aptName']],
      txKey: row[fMap['txKey']],
      contractDate: row[fMap['contractDate']],
      priceVal: row[fMap['priceVal']],
      price: Math.round(row[fMap['priceVal']] * 10000),
      area: row[fMap['area']],
      floor: row[fMap['floor']],
      dealType: row[fMap['dealType']],
      cdealDay: fMap['cdealDay'] !== undefined ? row[fMap['cdealDay']] : undefined,
      cdealType: fMap['cdealType'] !== undefined ? row[fMap['cdealType']] : undefined,
      cancelDate: fMap['cancelDate'] !== undefined ? row[fMap['cancelDate']] : undefined,
      isCanceled: fMap['isCanceled'] !== undefined ? row[fMap['isCanceled']] : undefined,
    }));
  } else if (Array.isArray(content)) {
    records = content;
  }

  let directCancellationFlags = 0;
  let crossMatchCancelled = 0;

  records.forEach(t => {
    // Check direct indicators
    if (isCancelledTransaction(t)) {
      directCancellationFlags++;
    }
    // Check fields presence
    if (t.cdealDay && String(t.cdealDay).trim() !== '' && String(t.cdealDay).trim() !== '-') directCancellationFlags++;
    if (t.cdealType && (t.cdealType === 'O' || t.cdealType === '해제')) directCancellationFlags++;
    if (t.cancelDate && String(t.cancelDate).trim() !== '' && String(t.cancelDate).trim() !== '-') directCancellationFlags++;
    if (t.isCanceled === true) directCancellationFlags++;

    // Cross-match against raw cancelled signature keys
    const norm = normalizeAptName(t.aptName || t.txKey || '');
    const date = t.contractDate || '';
    const ym = date.slice(0, 6);
    const day = date.slice(6, 8);
    const price = t.price || Math.round((t.priceVal || 0) * 10000);
    const area = Math.round((t.area || 0) * 100) / 100;
    const floor = t.floor || 0;
    const sig = `${norm}_${ym}_${day}_${price}_${area}_${floor}`;
    if (rawCancelledSet.has(sig)) {
      crossMatchCancelled++;
    }
  });

  assert(directCancellationFlags === 0, `${pf.name}: Direct cancellation indicators == 0 (actual: ${directCancellationFlags})`, `Found ${directCancellationFlags} records with cancellation flags`);
  assert(crossMatchCancelled === 0, `${pf.name}: Cross-matched raw cancelled records == 0 (actual: ${crossMatchCancelled})`, `Found ${crossMatchCancelled} matches to known cancelled records`);
});


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 3: Price Values Validity in Complex Summaries and Period Feeds
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log('TEST 3: Price Values Validity (no price <= 0, no NaN, maxPrice >= minPrice)');
console.log('================================================================');

let summaryPriceLeZero = 0;
let summaryPriceNaN = 0;
let summaryMaxLtMin = 0;
let summaryAllTimeHighLtLow = 0;
let summaryAreaMaxLtMin = 0;
let summaryAvgOutOfBounds = 0;

for (const [aptKey, s] of Object.entries(summaryObj)) {
  // NaN checks
  if (isNaN(s.maxPrice) || isNaN(s.minPrice) || isNaN(s.latestPrice)) {
    summaryPriceNaN++;
  }
  if (isNaN(s.allTimeHigh) || isNaN(s.allTimeLow)) {
    summaryPriceNaN++;
  }

  // Active sales checks (only for complexes with sales txCount > 0)
  if (s.txCount > 0) {
    if (s.maxPrice <= 0 || s.minPrice <= 0 || s.latestPrice <= 0) {
      summaryPriceLeZero++;
    }
    if (s.maxPrice < s.minPrice) {
      summaryMaxLtMin++;
    }
    if (s.allTimeHigh < s.allTimeLow) {
      summaryAllTimeHighLtLow++;
    }
    if (s.avg1MPrice > 0 && (s.avg1MPrice < s.minPrice || s.avg1MPrice > s.maxPrice)) {
      // Note: 1M price is within overall min/max
      summaryAvgOutOfBounds++;
    }

    // Check area-specific min/max prices
    if (s.maxPriceByArea && s.minPriceByArea) {
      for (const [area, maxP] of Object.entries(s.maxPriceByArea)) {
        const minP = s.minPriceByArea[area];
        if (minP !== undefined && maxP < minP) {
          summaryAreaMaxLtMin++;
        }
      }
    }
  }
}

assert(summaryPriceNaN === 0, `tx-summary.json: Zero NaN prices across all complexes (actual: ${summaryPriceNaN})`, `Found ${summaryPriceNaN} NaN prices`);
assert(summaryPriceLeZero === 0, `tx-summary.json: Zero price <= 0 in active complexes (actual: ${summaryPriceLeZero})`, `Found ${summaryPriceLeZero} prices <= 0`);
assert(summaryMaxLtMin === 0, `tx-summary.json: All complexes satisfy maxPrice >= minPrice (violations: ${summaryMaxLtMin})`, `Found ${summaryMaxLtMin} complexes where maxPrice < minPrice`);
assert(summaryAllTimeHighLtLow === 0, `tx-summary.json: All complexes satisfy allTimeHigh >= allTimeLow (violations: ${summaryAllTimeHighLtLow})`, `Found ${summaryAllTimeHighLtLow} complexes where allTimeHigh < allTimeLow`);
assert(summaryAreaMaxLtMin === 0, `tx-summary.json: All area groups satisfy maxPriceByArea >= minPriceByArea (violations: ${summaryAreaMaxLtMin})`, `Found ${summaryAreaMaxLtMin} area groups where maxPrice < minPrice`);

// Also verify price values in period files
periodFiles.forEach(pf => {
  const content = JSON.parse(fs.readFileSync(pf.path, 'utf8'));
  let invalidPrices = 0;
  let nanPrices = 0;

  if (content.fields && Array.isArray(content.data)) {
    const pIdx = content.fields.indexOf('priceVal');
    content.data.forEach(row => {
      const pv = row[pIdx];
      if (typeof pv !== 'number' || isNaN(pv)) nanPrices++;
      if (pv <= 0) invalidPrices++;
    });
  } else if (Array.isArray(content)) {
    content.forEach(t => {
      const pv = t.priceVal !== undefined ? t.priceVal : (t.price ? t.price / 10000 : 0);
      if (typeof pv !== 'number' || isNaN(pv)) nanPrices++;
      if (pv <= 0) invalidPrices++;
    });
  }

  assert(nanPrices === 0, `${pf.name}: Zero NaN prices (actual: ${nanPrices})`, `Found ${nanPrices} NaN prices`);
  assert(invalidPrices === 0, `${pf.name}: Zero price <= 0 (actual: ${invalidPrices})`, `Found ${invalidPrices} prices <= 0`);
});


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 4: Chronological Bounds (90d <= 90d, 1y <= 365d, 3y <= 1095d)
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log('TEST 4: Chronological Bounds Verification');
console.log('================================================================');

const recentData = JSON.parse(fs.readFileSync(path.join(PUBLIC_DATA, 'recent-transactions.json'), 'utf8'));
const tx1yData = JSON.parse(fs.readFileSync(path.join(PUBLIC_DATA, 'transactions-1y.json'), 'utf8'));
const tx3yData = JSON.parse(fs.readFileSync(path.join(PUBLIC_DATA, 'transactions-3y.json'), 'utf8'));
const txAllData = JSON.parse(fs.readFileSync(path.join(PUBLIC_DATA, 'transactions-all.json'), 'utf8'));

// Identify the dataset reference anchor date (latest transaction date across the dataset)
const allDates = recentData.map(t => t.contractDate).filter(Boolean).sort().reverse();
const latestContractDate = allDates[0];
const anchorDate = parseYYYYMMDD(latestContractDate);
console.log(`- Latest transaction contractDate: ${latestContractDate} (${anchorDate.toISOString().slice(0, 10)})`);

// 4.1 90d bound: strictly <= 90 days from anchor
const earliest90dDate = recentData.map(t => t.contractDate).filter(Boolean).sort()[0];
const earliest90d = parseYYYYMMDD(earliest90dDate);
const diffDays90d = Math.round((anchorDate.getTime() - earliest90d.getTime()) / (1000 * 60 * 60 * 24));
console.log(`- 90d window earliest: ${earliest90dDate}, span: ${diffDays90d} days`);
assert(diffDays90d <= 90, `90d feed span strictly <= 90 days (actual: ${diffDays90d} days)`, `Expected <= 90 days, got ${diffDays90d}`);

// Check that NO record in 90d exceeds 90 days
let recentOutlierDates = 0;
recentData.forEach(t => {
  const dt = parseYYYYMMDD(t.contractDate);
  const diff = (anchorDate.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24);
  if (diff > 90 || diff < 0) recentOutlierDates++;
});
assert(recentOutlierDates === 0, `90d feed: All individual records within [anchor - 90d, anchor] (outliers: ${recentOutlierDates})`, `Found ${recentOutlierDates} records outside 90d`);

// 4.2 1y bound: strictly <= 365 days (or 366 days leap year)
const earliest1yDate = tx1yData.map(t => t.contractDate).filter(Boolean).sort()[0];
const earliest1y = parseYYYYMMDD(earliest1yDate);
const diffDays1y = Math.round((anchorDate.getTime() - earliest1y.getTime()) / (1000 * 60 * 60 * 24));
console.log(`- 1y window earliest: ${earliest1yDate}, span: ${diffDays1y} days`);
assert(diffDays1y <= 365, `1y feed span strictly <= 365 days (actual: ${diffDays1y} days)`, `Expected <= 365 days, got ${diffDays1y}`);

let tx1yOutlierDates = 0;
tx1yData.forEach(t => {
  const dt = parseYYYYMMDD(t.contractDate);
  const diff = (anchorDate.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24);
  if (diff > 365 || diff < 0) tx1yOutlierDates++;
});
assert(tx1yOutlierDates === 0, `1y feed: All individual records within [anchor - 365d, anchor] (outliers: ${tx1yOutlierDates})`, `Found ${tx1yOutlierDates} records outside 365d`);

// 4.3 3y bound: strictly <= 1095 days (or 1096 days with leap years)
const earliest3yDate = tx3yData.map(t => t.contractDate).filter(Boolean).sort()[0];
const earliest3y = parseYYYYMMDD(earliest3yDate);
const diffDays3y = Math.round((anchorDate.getTime() - earliest3y.getTime()) / (1000 * 60 * 60 * 24));
console.log(`- 3y window earliest: ${earliest3yDate}, span: ${diffDays3y} days`);
assert(diffDays3y <= 1095, `3y feed span strictly <= 1095 days (actual: ${diffDays3y} days)`, `Expected <= 1095 days, got ${diffDays3y}`);

let tx3yOutlierDates = 0;
tx3yData.forEach(t => {
  const dt = parseYYYYMMDD(t.contractDate);
  const diff = (anchorDate.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24);
  if (diff > 1095 || diff < 0) tx3yOutlierDates++;
});
assert(tx3yOutlierDates === 0, `3y feed: All individual records within [anchor - 1095d, anchor] (outliers: ${tx3yOutlierDates})`, `Found ${tx3yOutlierDates} records outside 1095d`);


// ═══════════════════════════════════════════════════════════════════════════════
// TEST 5: Transaction Counts Progression & Strict Set Containment
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log('TEST 5: Monotonic Progression & Subset Containment (90d < 1y < 3y < all)');
console.log('================================================================');

const count90d = recentData.length;
const count1y = tx1yData.length;
const count3y = tx3yData.length;
const countAll = txAllData.data ? txAllData.data.length : txAllData.length;

console.log(`- Counts: 90d=${count90d}, 1y=${count1y}, 3y=${count3y}, all=${countAll}`);

// 5.1 Strict inequality progression
assert(count90d < count1y, `Strict progression: 90d < 1y (${count90d} < ${count1y})`, `Expected ${count90d} < ${count1y}`);
assert(count1y < count3y, `Strict progression: 1y < 3y (${count1y} < ${count3y})`, `Expected ${count1y} < ${count3y}`);
assert(count3y < countAll, `Strict progression: 3y < all (${count3y} < ${countAll})`, `Expected ${count3y} < ${countAll}`);
assert(count90d < count1y && count1y < count3y && count3y < countAll, `Monotonicity: 90d < 1y < 3y < all (${count90d} < ${count1y} < ${count3y} < ${countAll})`);

// 5.2 Subset containment: Every record in 90d should exist in 1y
const makeTxSig = (apt, date, pv, area, floor) =>
  `${normalizeAptName(apt)}_${date}_${Math.round(pv * 100)}_${Math.round(area * 100)}_${floor}`;

const set1y = new Set(tx1yData.map(t => makeTxSig(t.aptName, t.contractDate, t.priceVal, t.area, t.floor)));
const set3y = new Set(tx3yData.map(t => makeTxSig(t.aptName, t.contractDate, t.priceVal, t.area, t.floor)));

let notIn1y = 0;
recentData.forEach(t => {
  const sig = makeTxSig(t.aptName, t.contractDate, t.priceVal, t.area, t.floor);
  if (!set1y.has(sig)) notIn1y++;
});
assert(notIn1y === 0, `Subset containment: 100% of 90d records are contained in 1y feed (missing: ${notIn1y})`, `Found ${notIn1y} records from 90d missing in 1y`);

let notIn3y = 0;
tx1yData.forEach(t => {
  const sig = makeTxSig(t.aptName, t.contractDate, t.priceVal, t.area, t.floor);
  if (!set3y.has(sig)) notIn3y++;
});
assert(notIn3y === 0, `Subset containment: 100% of 1y records are contained in 3y feed (missing: ${notIn3y})`, `Found ${notIn3y} records from 1y missing in 3y`);

// Check all-time containment
const fMapAll = {};
txAllData.fields.forEach((f, idx) => { fMapAll[f] = idx; });
const setAll = new Set(txAllData.data.map(row =>
  makeTxSig(
    row[fMapAll['aptName']],
    row[fMapAll['contractDate']],
    row[fMapAll['priceVal']],
    row[fMapAll['area']],
    row[fMapAll['floor']]
  )
));

let notInAll = 0;
tx3yData.forEach(t => {
  const sig = makeTxSig(t.aptName, t.contractDate, t.priceVal, t.area, t.floor);
  if (!setAll.has(sig)) notInAll++;
});
assert(notInAll === 0, `Subset containment: 100% of 3y records are contained in all-time feed (missing: ${notInAll})`, `Found ${notInAll} records from 3y missing in all`);


// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY & VERDICT
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n================================================================');
console.log(`🏁 TEST SUMMARY: Total Assertions: ${totalAssertions} | Passed: ${passedAssertions} | Failed: ${failedAssertions}`);
console.log('================================================================');

if (failedAssertions === 0) {
  console.log('🎉 ALL EMPIRICAL PIPELINE & DATA INTEGRITY TESTS PASSED!');
  process.exit(0);
} else {
  console.error(`💥 ${failedAssertions} ASSERTIONS FAILED!`);
  process.exit(1);
}
