const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('================================================================');
console.log('🔥 EMPIRICAL CHALLENGER 13_M1_3: GATE 2 RE-VERIFICATION HARNESS');
console.log('================================================================\n');

const ROOT_DIR = path.resolve(__dirname, '../..');
const FRONTEND_DIR = path.resolve(ROOT_DIR, 'frontend');
const DATA_DIR = path.resolve(FRONTEND_DIR, 'public/data');
const TX_DATA_DIR = path.resolve(FRONTEND_DIR, 'public/tx-data');

let assertions = 0;
let passes = 0;
let failures = 0;
const failureLog = [];

function check(desc, cond, details = '') {
  assertions++;
  if (cond) {
    passes++;
    console.log(`  ✅ [PASS] ${desc}`);
  } else {
    failures++;
    failureLog.push({ desc, details });
    console.error(`  ❌ [FAIL] ${desc} | ${details}`);
  }
}

// ----------------------------------------------------------------------
// 1. Ground Truth from 3e76c71e
// ----------------------------------------------------------------------
console.log('--- TEST GROUP 1: Ground Truth 13 Extraction from Commit 3e76c71e ---');
const prevStr = execSync('git show 3e76c71e~1:frontend/public/data/recent-transactions.json', { maxBuffer: 50 * 1024 * 1024, encoding: 'utf8' });
const currStr = execSync('git show 3e76c71e:frontend/public/data/recent-transactions.json', { maxBuffer: 50 * 1024 * 1024, encoding: 'utf8' });

const prevRecent = JSON.parse(prevStr);
const currRecent = JSON.parse(currStr);

const makeKey = (t) => `${t.aptName}|${t.contractDate}|${t.priceVal}|${t.area}|${t.floor}`;
const prevKeySet = new Set(prevRecent.map(makeKey));
const groundTruth13 = currRecent.filter(t => !prevKeySet.has(makeKey(t)));

check('Ground truth count is 13', groundTruth13.length === 13, `Count: ${groundTruth13.length}`);

// ----------------------------------------------------------------------
// 2. Defect e2: public/tx-data/_index.json Schema
// ----------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Defect e2 Verification (_index.json Schema Purity) ---');
const indexFilePath = path.join(TX_DATA_DIR, '_index.json');
check('_index.json file exists', fs.existsSync(indexFilePath));

const indexContent = JSON.parse(fs.readFileSync(indexFilePath, 'utf8'));
check('_index.json parsed as Array', Array.isArray(indexContent));
check('_index.json length >= 182 complexes', indexContent.length >= 182, `Length: ${indexContent.length}`);

let nonStringCount = 0;
let emptyStringCount = 0;
indexContent.forEach((item, idx) => {
  if (typeof item !== 'string') {
    nonStringCount++;
  } else if (item.trim() === '') {
    emptyStringCount++;
  }
});
check('_index.json contains 0 non-string items', nonStringCount === 0, `Non-strings: ${nonStringCount}`);
check('_index.json contains 0 empty strings', emptyStringCount === 0, `Empty strings: ${emptyStringCount}`);

const uniqueIndexKeys = new Set(indexContent);
check('_index.json has zero duplicate keys', uniqueIndexKeys.size === indexContent.length, `Duplicates: ${indexContent.length - uniqueIndexKeys.size}`);

// ----------------------------------------------------------------------
// 3. Defect e1: 13 Apartments Chunk Files (<txKey>.json & <txKey>-recent.json)
// ----------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Defect e1 Verification (13 Apartments in 26 Chunk Files) ---');
const aliasMap = {
  '동탄숲속마을 모아미래도1단지': '동탄숲속마을모아미래도1단지',
  '동탄2아이파크2단지': '동탄2아이파크2단지',
  '동탄호수자이파밀리에': '동탄호수자이파밀리에',
  '르파비스': '르파비스',
  '중흥에스클래스에듀하이': '중흥에스클래스에듀하이',
  '이편한세상동탄': '이편한세상동탄',
  '동탄역센트럴푸르지오': '동탄역센트럴푸르지오',
  '시범반도유보라아이비파크4.0': '시범반도유보라아이비파크4.0',
  '동탄레이크자연앤푸르지오': '동탄레이크자연앤푸르지오',
  '동탄2신도시호반베르디움22단지': '동탄2신도시호반베르디움22단지',
  '나루마을한화꿈에그린우림필유': '나루마을한화꿈에그린우림필유',
  '동탄푸른마을신일해피트리': '동탄푸른마을신일해피트리',
  '시범한빛마을케이씨씨스위첸': '시범한빛마을케이씨씨스위첸',
};

groundTruth13.forEach((gt) => {
  const targetKey = aliasMap[gt.aptName] || gt.aptName;
  const mainChunkPath = path.join(TX_DATA_DIR, `${targetKey}.json`);
  const recentChunkPath = path.join(TX_DATA_DIR, `${targetKey}-recent.json`);

  check(`Main chunk exists for [${gt.aptName}] -> ${targetKey}.json`, fs.existsSync(mainChunkPath));
  check(`Recent chunk exists for [${gt.aptName}] -> ${targetKey}-recent.json`, fs.existsSync(recentChunkPath));

  const expectedPrice = Math.round(gt.priceVal * 10000);

  if (fs.existsSync(mainChunkPath)) {
    const mainList = JSON.parse(fs.readFileSync(mainChunkPath, 'utf8'));
    const foundMain = mainList.find(t => {
      const cDate = t.contractDate || `${t.contractYm || ''}${String(t.contractDay || '').padStart(2, '0')}`;
      return cDate === gt.contractDate &&
        (t.price === expectedPrice || Math.abs(t.price - expectedPrice) <= 100) &&
        Math.abs(t.area - gt.area) < 0.01 &&
        t.floor === gt.floor;
    });
    check(`[${gt.aptName}] found in main chunk`, !!foundMain);
    if (foundMain) {
      check(`[${gt.aptName}] registeredDate is '20261022'`, foundMain.registeredDate === '20261022', `Actual: ${foundMain.registeredDate}`);
      check(`[${gt.aptName}] registeredDateLabel is '10.22'`, foundMain.registeredDateLabel === '10.22', `Actual: ${foundMain.registeredDateLabel}`);
      check(`[${gt.aptName}] registeredDate >= contractDate`, Number(foundMain.registeredDate) >= Number(foundMain.contractDate));
      
      const idx = mainList.indexOf(foundMain);
      check(`[${gt.aptName}] index in main chunk is within top 5`, idx <= 5, `Index: ${idx}`);
    }
  }

  if (fs.existsSync(recentChunkPath)) {
    const recentList = JSON.parse(fs.readFileSync(recentChunkPath, 'utf8'));
    const foundRecent = recentList.find(t => {
      const cDate = t.contractDate || `${t.contractYm || ''}${String(t.contractDay || '').padStart(2, '0')}`;
      return cDate === gt.contractDate &&
        (t.price === expectedPrice || Math.abs(t.price - expectedPrice) <= 100) &&
        Math.abs(t.area - gt.area) < 0.01 &&
        t.floor === gt.floor;
    });
    check(`[${gt.aptName}] found in -recent chunk`, !!foundRecent);
    if (foundRecent) {
      check(`[${gt.aptName}] (-recent) registeredDate is '20261022'`, foundRecent.registeredDate === '20261022', `Actual: ${foundRecent.registeredDate}`);
      check(`[${gt.aptName}] (-recent) registeredDateLabel is '10.22'`, foundRecent.registeredDateLabel === '10.22', `Actual: ${foundRecent.registeredDateLabel}`);
      check(`[${gt.aptName}] (-recent) registeredDate >= contractDate`, Number(foundRecent.registeredDate) >= Number(foundRecent.contractDate));
      const idx = recentList.indexOf(foundRecent);
      check(`[${gt.aptName}] index in -recent chunk is within top 5`, idx <= 5, `Index: ${idx}`);
    }
  }
});

// ----------------------------------------------------------------------
// 4. Defect e3: transactions-all.json and Subset Containment
// ----------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: Defect e3 Verification (transactions-all.json & Subset Containment) ---');
const allFilePath = path.join(DATA_DIR, 'transactions-all.json');
check('transactions-all.json exists', fs.existsSync(allFilePath));

const allRaw = JSON.parse(fs.readFileSync(allFilePath, 'utf8'));
const allRows = allRaw.data || allRaw;
check('transactions-all.json count >= 65,000', allRows.length >= 65000, `Count: ${allRows.length}`);

const fieldMap = {};
if (allRaw.fields) {
  allRaw.fields.forEach((f, idx) => { fieldMap[f] = idx; });
}

// Convert allRows to map
const allKeyMap = new Map();
allRows.forEach((row) => {
  let aptName, contractDate, priceVal, area, floor;
  if (Array.isArray(row)) {
    aptName = row[fieldMap['aptName']];
    contractDate = row[fieldMap['contractDate']];
    priceVal = row[fieldMap['priceVal']];
    area = row[fieldMap['area']];
    floor = row[fieldMap['floor']];
  } else {
    aptName = row.aptName;
    contractDate = row.contractDate;
    priceVal = row.priceVal;
    area = row.area;
    floor = row.floor;
  }
  const k = `${aptName}|${contractDate}|${priceVal}|${area}|${floor}`;
  allKeyMap.set(k, row);
});

let missingInAll = 0;
groundTruth13.forEach((gt) => {
  const match = allKeyMap.get(makeKey(gt));
  if (!match) {
    missingInAll++;
  } else {
    check(`GT [${gt.aptName}] is present in transactions-all.json`, true);
  }
});
check('transactions-all.json contains all 13 GT records', missingInAll === 0, `Missing: ${missingInAll}`);

// Subset containment check: 3y -> all
const txs3y = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'transactions-3y.json'), 'utf8'));
let missing3yInAll = 0;
txs3y.forEach((t) => {
  if (!allKeyMap.has(makeKey(t))) {
    missing3yInAll++;
  }
});
check('3y subset containment in transactions-all.json: 0 missing', missing3yInAll === 0, `Missing: ${missing3yInAll}`);

// ----------------------------------------------------------------------
// 5. Adversarial Check: Causality, Fallback Purity, and Date Boundaries across Period Feeds
// ----------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: Period Feeds Causality & Fallback Purity ---');
const recentTxs = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'recent-transactions.json'), 'utf8'));
const txs1y = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'transactions-1y.json'), 'utf8'));

const gtKeys = new Set(groundTruth13.map(makeKey));

[
  { name: 'recent-transactions.json', data: recentTxs },
  { name: 'transactions-1y.json', data: txs1y },
  { name: 'transactions-3y.json', data: txs3y }
].forEach(({ name, data }) => {
  let causalityFail = 0;
  let nonGtFalselyOverwritten = 0;
  let invalidFormat = 0;
  let sortViolations = 0;

  for (let i = 0; i < data.length; i++) {
    const t = data[i];
    const key = makeKey(t);

    // Format check: YYYYMMDD
    if (!/^\d{8}$/.test(t.registeredDate)) {
      invalidFormat++;
    }

    // Causality check: registeredDate >= contractDate
    if (Number(t.registeredDate) < Number(t.contractDate)) {
      causalityFail++;
    }

    // Fallback check: if not one of the 13 GT records, registeredDate must equal registrationDate || contractDate
    if (!gtKeys.has(key)) {
      const expectedDate = t.registrationDate || t.contractDate;
      if (t.registeredDate !== expectedDate) {
        nonGtFalselyOverwritten++;
      }
    }

    // Sort order check: registeredDate DESC -> contractDate DESC
    if (i > 0) {
      const prev = data[i - 1];
      const rDiff = String(prev.registeredDate || '').localeCompare(String(t.registeredDate || ''));
      if (rDiff < 0) {
        sortViolations++;
      } else if (rDiff === 0) {
        const cDiff = String(prev.contractDate || '').localeCompare(String(t.contractDate || ''));
        if (cDiff < 0) {
          sortViolations++;
        }
      }
    }
  }

  check(`${name}: 0 causality violations (registeredDate >= contractDate)`, causalityFail === 0, `Violations: ${causalityFail}`);
  check(`${name}: 0 invalid format (must be 8 digits)`, invalidFormat === 0, `Invalid: ${invalidFormat}`);
  check(`${name}: 0 non-GT false overwrites (fallback must match)`, nonGtFalselyOverwritten === 0, `False overwrites: ${nonGtFalselyOverwritten}`);
  check(`${name}: 0 sort order violations`, sortViolations === 0, `Sort violations: ${sortViolations}`);
});

// ----------------------------------------------------------------------
// 6. Adversarial Check: All 450 Chunk Files in public/tx-data/
// ----------------------------------------------------------------------
console.log('\n--- TEST GROUP 6: All Chunk Files in public/tx-data/ ---');
const chunkFiles = fs.readdirSync(TX_DATA_DIR).filter(f => f.endsWith('.json') && f !== '_index.json');
check('Chunk files count is 450', chunkFiles.length === 450, `Count: ${chunkFiles.length}`);

let totalChunkRecords = 0;
let chunkCausalityViolations = 0;
let chunkSortViolations = 0;
let chunkInvalidFormat = 0;

chunkFiles.forEach(f => {
  const filePath = path.join(TX_DATA_DIR, f);
  const records = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  totalChunkRecords += records.length;

  for (let i = 0; i < records.length; i++) {
    const t = records[i];
    if (!/^\d{8}$/.test(t.registeredDate)) {
      chunkInvalidFormat++;
    }
    if (Number(t.registeredDate) < Number(t.contractDate)) {
      chunkCausalityViolations++;
    }
    if (i > 0) {
      const prev = records[i - 1];
      const rDiff = String(prev.registeredDate || '').localeCompare(String(t.registeredDate || ''));
      if (rDiff < 0) {
        chunkSortViolations++;
      } else if (rDiff === 0) {
        const cDiff = String(prev.contractDate || '').localeCompare(String(t.contractDate || ''));
        if (cDiff < 0) {
          chunkSortViolations++;
        }
      }
    }
  }
});

check('Total records across chunk files >= 170,000', totalChunkRecords >= 170000, `Total: ${totalChunkRecords}`);
check('All chunk files: 0 causality violations', chunkCausalityViolations === 0, `Violations: ${chunkCausalityViolations}`);
check('All chunk files: 0 sort violations', chunkSortViolations === 0, `Violations: ${chunkSortViolations}`);
check('All chunk files: 0 invalid format', chunkInvalidFormat === 0, `Invalid: ${chunkInvalidFormat}`);

// ----------------------------------------------------------------------
// Final Assessment
// ----------------------------------------------------------------------
console.log('\n================================================================');
console.log(`SUMMARY: Total Assertions: ${assertions} | Passed: ${passes} | Failed: ${failures}`);
console.log('================================================================');

if (failures > 0) {
  console.error('\nFAILURE DETAILS:');
  failureLog.forEach(f => console.error(`- ${f.desc}: ${f.details}`));
  process.exit(1);
} else {
  console.log('\n🎉 ALL EMPIRICAL RE-VERIFICATION HARNESS ASSERTIONS PASSED WITH ZERO DEFECTS!');
  process.exit(0);
}
