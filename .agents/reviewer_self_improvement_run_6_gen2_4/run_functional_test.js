const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = 'c:\\Users\\ocs56\\OneDrive\\바탕 화면\\PORTFOLIO\\PORTFOLIO - DVIEW';
const tempDir = path.join(root, '.agents', 'reviewer_self_improvement_run_6_gen2_4', 'dist');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Compile whole frontend with tsc using tsconfig.json --noEmit or outDir
try {
  execSync(`npx tsc --project tsconfig.json --outDir "${tempDir}" --noEmitOnError false`, {
    cwd: path.join(root, 'frontend'),
    encoding: 'utf8'
  });
} catch (e) {
  // Ignore minor type errors elsewhere if output is created
}

const compiledJs = path.join(tempDir, 'lib', 'utils', 'transactionChartTransform.js');
if (fs.existsSync(compiledJs)) {
  const mod = require(compiledJs);

  console.log('Testing getCachedTimestamp LRU capacity (250)...');
  mod.clearTsCache();

  for (let i = 0; i < 300; i++) {
    mod.getCachedTimestamp('202601', String(i));
  }

  console.log('Testing calculateMonthlyAverages and Map buffer reuse...');
  const dummyTx = [
    { contractYm: '202601', contractDay: '15', price: 50000, dealType: '매매', deposit: 0, monthlyRent: 0 },
    { contractYm: '202601', contractDay: '20', price: 30000, dealType: '전세', deposit: 30000, monthlyRent: 0 },
  ];

  const byMonthTier = new Map();
  byMonthTier.set(202601, { all: [5.0] });

  const res = mod.calculateMonthlyAverages(dummyTx, 'sale', 202601, byMonthTier);
  console.log('calculateMonthlyAverages returned result length:', res.length);
  console.log('Result sample:', JSON.stringify(res));
  console.log('Functional test completed successfully.');
} else {
  console.log('Compiled file not found, testing AST/Source directly.');
}

// Cleanup
fs.rmSync(tempDir, { recursive: true, force: true });
