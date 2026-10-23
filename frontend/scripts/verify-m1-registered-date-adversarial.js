const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== STARTING EMPIRICAL ADVERSARIAL VERIFICATION: M1 REGISTERED_DATE ===\n');

const ROOT_DIR = path.resolve(__dirname, '../..');
const FRONTEND_DIR = path.resolve(ROOT_DIR, 'frontend');
const DATA_DIR = path.resolve(FRONTEND_DIR, 'public/data');
const TX_DATA_DIR = path.resolve(FRONTEND_DIR, 'public/tx-data');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const failureDetails = [];

function assert(condition, message, detail = null) {
  totalChecks++;
  if (condition) {
    passedChecks++;
  } else {
    failedChecks++;
    failureDetails.push({ message, detail });
    console.error(`[FAIL] ${message}`);
    if (detail) console.error('       Detail:', detail);
  }
}

// 1. Extract the 13 canonical transactions from commit 3e76c71e
console.log('--- Phase 1: Extracting Ground Truth from Commit 3e76c71e ---');
const prevStr = execSync('git show 3e76c71e~1:frontend/public/data/recent-transactions.json', { maxBuffer: 50 * 1024 * 1024, encoding: 'utf8' });
const currStr = execSync('git show 3e76c71e:frontend/public/data/recent-transactions.json', { maxBuffer: 50 * 1024 * 1024, encoding: 'utf8' });

const prevRecent = JSON.parse(prevStr);
const currRecent = JSON.parse(currStr);

const makeKey = (t) => `${t.aptName}|${t.contractDate}|${t.priceVal}|${t.area}|${t.floor}`;
const prevKeySet = new Set(prevRecent.map(makeKey));
const canonical13 = currRecent.filter(t => !prevKeySet.has(makeKey(t)));

assert(canonical13.length === 13, `Ground truth count in commit 3e76c71e must be exactly 13, got ${canonical13.length}`);
console.log(`Extracted 13 ground truth transactions from commit 3e76c71e.`);

// 2. Load current datasets
console.log('\n--- Phase 2: Loading Current Datasets ---');
const recentTxs = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'recent-transactions.json'), 'utf8'));
const txs1y = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'transactions-1y.json'), 'utf8'));
const txs3y = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'transactions-3y.json'), 'utf8'));

console.log(`Loaded recent-transactions.json: ${recentTxs.length} items`);
console.log(`Loaded transactions-1y.json: ${txs1y.length} items`);
console.log(`Loaded transactions-3y.json: ${txs3y.length} items`);

// 3. Verify the 13 transactions in recent-transactions.json
console.log('\n--- Phase 3: Verifying 13 Transactions in recent-transactions.json ---');
const recentKeyMap = new Map();
recentTxs.forEach((t, idx) => {
  recentKeyMap.set(makeKey(t), { t, idx });
});

canonical13.forEach((c) => {
  const k = makeKey(c);
  const found = recentKeyMap.get(k);
  assert(Boolean(found), `13건 중 거래 복원 확인: ${c.aptName} (${c.contractDate}, ${c.priceVal}억, ${c.floor}층)`, { key: k });
  if (found) {
    const record = found.t;
    assert(record.registeredDate === '20261022', `registeredDate === '20261022' 확인: ${c.aptName}`, { actual: record.registeredDate });
    assert(record.registeredDateLabel === '10.22', `registeredDateLabel === '10.22' 확인: ${c.aptName}`, { actual: record.registeredDateLabel });
    assert(record.priceVal === c.priceVal, `가격 일치 확인: ${c.aptName}`, { expected: c.priceVal, actual: record.priceVal });
    assert(record.area === c.area, `전용면적 일치 확인: ${c.aptName}`, { expected: c.area, actual: record.area });
    assert(record.floor === c.floor, `층수 일치 확인: ${c.aptName}`, { expected: c.floor, actual: record.floor });
  }
});

// 4. Verify the 13 transactions in transactions-1y.json and transactions-3y.json
console.log('\n--- Phase 4: Verifying 13 Transactions in transactions-1y.json & transactions-3y.json ---');
const makePeriodKey = (t) => `${t.aptName}|${t.contractDate}|${t.priceVal}|${t.area}|${t.floor}`;
const map1y = new Map();
txs1y.forEach(t => map1y.set(makePeriodKey(t), t));

const map3y = new Map();
txs3y.forEach(t => map3y.set(makePeriodKey(t), t));

canonical13.forEach((c) => {
  const k = makeKey(c);
  const found1y = map1y.get(k);
  const found3y = map3y.get(k);

  assert(Boolean(found1y), `transactions-1y.json 복원 확인: ${c.aptName}`, { key: k });
  if (found1y) {
    assert(found1y.registeredDate === '20261022', `1y registeredDate === '20261022': ${c.aptName}`, { actual: found1y.registeredDate });
    assert(found1y.registeredDateLabel === '10.22', `1y registeredDateLabel === '10.22': ${c.aptName}`, { actual: found1y.registeredDateLabel });
  }

  assert(Boolean(found3y), `transactions-3y.json 복원 확인: ${c.aptName}`, { key: k });
  if (found3y) {
    assert(found3y.registeredDate === '20261022', `3y registeredDate === '20261022': ${c.aptName}`, { actual: found3y.registeredDate });
    assert(found3y.registeredDateLabel === '10.22', `3y registeredDateLabel === '10.22': ${c.aptName}`, { actual: found3y.registeredDateLabel });
  }
});

// 5. Verify chunk files in public/tx-data/
console.log('\n--- Phase 5: Verifying Chunk Files in public/tx-data/ for 13 Transactions ---');
canonical13.forEach((c) => {
  const txKey = c.txKey || c.aptName.replace(/\s+/g, '');
  const mainChunkPath = path.join(TX_DATA_DIR, `${txKey}.json`);
  const recentChunkPath = path.join(TX_DATA_DIR, `${txKey}-recent.json`);

  assert(fs.existsSync(mainChunkPath), `메인 청크 파일 존재 확인: ${txKey}.json`);
  if (fs.existsSync(mainChunkPath)) {
    const chunkData = JSON.parse(fs.readFileSync(mainChunkPath, 'utf8'));
    const expectedPrice = Math.round(c.priceVal * 10000);
    const chunkRec = chunkData.find(r => {
      const cDate = r.contractDate || `${r.contractYm || ''}${String(r.contractDay || '').padStart(2, '0')}`;
      return cDate === c.contractDate && 
        (r.price === expectedPrice || Math.abs(r.price - expectedPrice) <= 100) &&
        Math.abs(r.area - c.area) < 0.01 &&
        r.floor === c.floor;
    });
    assert(Boolean(chunkRec), `청크 파일 ${txKey}.json 내 신규 실거래 존재 확인: ${c.aptName} (${c.contractDate})`, { expected: c, chunkRec });
    if (chunkRec) {
      assert(chunkRec.registeredDate === '20261022', `${txKey}.json 내 registeredDate === '20261022'`, { actual: chunkRec.registeredDate });
      assert(chunkRec.registeredDateLabel === '10.22', `${txKey}.json 내 registeredDateLabel === '10.22'`, { actual: chunkRec.registeredDateLabel });
    }
  }

  if (fs.existsSync(recentChunkPath)) {
    const chunkData = JSON.parse(fs.readFileSync(recentChunkPath, 'utf8'));
    const expectedPrice = Math.round(c.priceVal * 10000);
    const chunkRec = chunkData.find(r => {
      const cDate = r.contractDate || `${r.contractYm || ''}${String(r.contractDay || '').padStart(2, '0')}`;
      return cDate === c.contractDate && 
        (r.price === expectedPrice || Math.abs(r.price - expectedPrice) <= 100) &&
        Math.abs(r.area - c.area) < 0.01 &&
        r.floor === c.floor;
    });
    assert(Boolean(chunkRec), `최신 청크 파일 ${txKey}-recent.json 내 신규 실거래 존재 확인: ${c.aptName}`, { expected: c });
    if (chunkRec) {
      assert(chunkRec.registeredDate === '20261022', `${txKey}-recent.json registeredDate === '20261022'`, { actual: chunkRec.registeredDate });
    }
  }
});

// 6. Verify _index.json schema integrity
console.log('\n--- Phase 6: Verifying public/tx-data/_index.json Schema Integrity ---');
const indexPath = path.join(TX_DATA_DIR, '_index.json');
assert(fs.existsSync(indexPath), `_index.json 파일 존재 확인`);
if (fs.existsSync(indexPath)) {
  const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  assert(Array.isArray(indexData), `_index.json 최상위 구조는 Array여야 함`);
  const nonStringEntries = indexData.filter(item => typeof item !== 'string');
  assert(nonStringEntries.length === 0, `_index.json 내 비문자열(변조된 객체) 항목 수 === 0 (실제: ${nonStringEntries.length})`, { sample: nonStringEntries.slice(0, 3) });
}

// 7. Systematic Scan of ALL records in recent-transactions.json, 1y, 3y
console.log('\n--- Phase 7: Full Dataset Integrity Scan (All Records) ---');
const dateRegex = /^\d{8}$/;
const dateLabelRegex = /^\d{2}\.\d{2}$/;

function auditDataset(name, items, canonical13Keys) {
  let missingRegDate = 0;
  let invalidRegDate = 0;
  let invalidRegLabel = 0;
  let invalidFallback = 0;
  let regBeforeContract = 0;
  let duplicateCount = 0;
  const seen = new Set();

  items.forEach((t) => {
    const k = makeKey(t);
    if (seen.has(k)) duplicateCount++;
    seen.add(k);

    if (!t.registeredDate) {
      missingRegDate++;
    } else if (!dateRegex.test(t.registeredDate)) {
      invalidRegDate++;
    }

    if (t.registeredDateLabel && !dateLabelRegex.test(t.registeredDateLabel)) {
      invalidRegLabel++;
    }

    const is3e76c71e = canonical13Keys.has(k);
    if (!is3e76c71e) {
      const expectedFallback = t.registrationDate || t.contractDate;
      if (t.registeredDate !== expectedFallback) {
        invalidFallback++;
      }
    }

    if (t.registeredDate && t.contractDate) {
      if (t.registeredDate < t.contractDate) {
        regBeforeContract++;
      }
    }
  });

  assert(missingRegDate === 0, `[${name}] missing registeredDate count === 0`, { missingRegDate });
  assert(invalidRegDate === 0, `[${name}] invalid registeredDate format count === 0`, { invalidRegDate });
  assert(invalidRegLabel === 0, `[${name}] invalid registeredDateLabel format count === 0`, { invalidRegLabel });
  assert(invalidFallback === 0, `[${name}] invalid non-deterministic fallback count === 0`, { invalidFallback });
  assert(regBeforeContract === 0, `[${name}] registeredDate < contractDate physical causality violation count === 0`, { regBeforeContract });
  console.log(`[${name}] Scanned ${items.length} items: missing=${missingRegDate}, invalidFormat=${invalidRegDate}, invalidFallback=${invalidFallback}, causalityViolations=${regBeforeContract}, duplicates=${duplicateCount}`);
}

const canonical13Keys = new Set(canonical13.map(makeKey));
auditDataset('recent-transactions.json', recentTxs, canonical13Keys);
auditDataset('transactions-1y.json', txs1y, canonical13Keys);
auditDataset('transactions-3y.json', txs3y, canonical13Keys);

// 8. Sort Order Verification
console.log('\n--- Phase 8: Sorting Invariance Verification ---');
function checkSorting(name, items) {
  let sortViolations = 0;
  for (let i = 0; i < items.length - 1; i++) {
    const a = items[i];
    const b = items[i + 1];
    const regA = a.registeredDate || a.contractDate || '';
    const regB = b.registeredDate || b.contractDate || '';
    if (regA < regB) {
      sortViolations++;
    } else if (regA === regB) {
      const cA = a.contractDate || '';
      const cB = b.contractDate || '';
      if (cA < cB) {
        sortViolations++;
      }
    }
  }
  assert(sortViolations === 0, `[${name}] Sort order (registeredDate DESC, contractDate DESC) violations === 0`, { sortViolations });
  console.log(`[${name}] Sort order check complete: ${sortViolations} violations`);
}

checkSorting('recent-transactions.json', recentTxs);
checkSorting('transactions-1y.json', txs1y);
checkSorting('transactions-3y.json', txs3y);

// 9. Chunk Files Scan (Excluding _index.json)
console.log('\n--- Phase 9: Scanning Transaction Chunk Files in public/tx-data/ ---');
const chunkFiles = fs.readdirSync(TX_DATA_DIR).filter(f => f.endsWith('.json') && f !== '_index.json');
let chunkMissingReg = 0;
let chunkInvalidFormat = 0;
let chunkCausalityViolations = 0;
let chunkSortViolations = 0;
let totalChunkRecords = 0;

chunkFiles.forEach(file => {
  const filePath = path.join(TX_DATA_DIR, file);
  try {
    const records = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!Array.isArray(records)) return;

    totalChunkRecords += records.length;
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      if (!r.registeredDate) {
        chunkMissingReg++;
      } else if (!dateRegex.test(r.registeredDate)) {
        chunkInvalidFormat++;
      }

      if (r.registeredDate && r.contractDate && r.registeredDate < r.contractDate) {
        chunkCausalityViolations++;
      }

      if (i < records.length - 1) {
        const next = records[i + 1];
        const regA = r.registeredDate || r.contractDate || '';
        const regB = next.registeredDate || next.contractDate || '';
        if (regA < regB) {
          chunkSortViolations++;
        } else if (regA === regB) {
          const cA = r.contractDate || '';
          const cB = next.contractDate || '';
          if (cA < cB) {
            chunkSortViolations++;
          }
        }
      }
    }
  } catch (err) {
    assert(false, `Error reading chunk file ${file}: ${err.message}`);
  }
});

assert(chunkMissingReg === 0, `Total chunk records missing registeredDate === 0`, { chunkMissingReg });
assert(chunkInvalidFormat === 0, `Total chunk records invalid format === 0`, { chunkInvalidFormat });
assert(chunkCausalityViolations === 0, `Total chunk records causality violations === 0`, { chunkCausalityViolations });
assert(chunkSortViolations === 0, `Total chunk records sort violations === 0`, { chunkSortViolations });
console.log(`Chunk files check: ${chunkFiles.length} files, ${totalChunkRecords} records scanned. missing=${chunkMissingReg}, invalidFormat=${chunkInvalidFormat}, causalityViolations=${chunkCausalityViolations}, sortViolations=${chunkSortViolations}`);

// 10. Summary
console.log('\n=== EMPIRICAL VERIFICATION SUMMARY ===');
console.log(`Total Assertions Evaluated: ${totalChecks}`);
console.log(`Passed: ${passedChecks}`);
console.log(`Failed: ${failedChecks}`);

if (failedChecks > 0) {
  console.error('\nFAILURE DETAILS:');
  failureDetails.forEach((f, i) => {
    console.error(`[${i + 1}] ${f.message}`);
    if (f.detail) console.error('    Data:', JSON.stringify(f.detail));
  });
  process.exit(1);
} else {
  console.log('\nALL EMPIRICAL ASSERTIONS PASSED WITH ZERO REGRESSIONS!');
  process.exit(0);
}
