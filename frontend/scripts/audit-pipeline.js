/**
 * @file audit-pipeline.js
 * @description Continuous diagnostics and recursive self-improvement verification pipeline.
 * Performs TypeScript type checking, ESLint checking, Data Consistency checks, Asset size checks, E2E tests, and Firestore billing audits.
 */

require('dotenv').config({ path: '.env.local', override: true });
const { execSync } = require('child_process');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Colors for formatting logs
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// 1. Firebase Credentials Setup
function getAdminCredentials() {
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    }
  } catch {}

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {}
  }

  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'portfolio-dtdls';
  
  if (privateKey && clientEmail) {
    return {
      projectId,
      clientEmail,
      client_email: clientEmail, 
      privateKey: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n'),
      private_key: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n')
    };
  }
  return null;
}

// 2. Perform TypeScript Compile Check
function auditTypeScript() {
  log(colors.cyan, '🔄 Running TypeScript compilation audit (tsc --noEmit)...');
  try {
    execSync('npx tsc --noEmit', { stdio: 'inherit' });
    log(colors.green, '✅ TypeScript compilation check: PASSED');
    return true;
  } catch (error) {
    log(colors.red, '❌ TypeScript compilation check: FAILED');
    return false;
  }
}

// 3. Perform ESLint Check
function auditESLint() {
  log(colors.cyan, '🔄 Running ESLint code hygiene audit...');
  try {
    execSync('npx eslint . --max-warnings=10', { stdio: 'inherit' });
    log(colors.green, '✅ ESLint check: PASSED');
    return true;
  } catch (error) {
    log(colors.yellow, '⚠️ ESLint check returned warnings or failures.');
    return false;
  }
}

// 4. Perform Data Consistency & Integrity Check
function auditDataConsistency() {
  log(colors.cyan, '🔄 Running Data Consistency & Integrity audit...');
  try {
    const indexPath = path.resolve(process.cwd(), 'public/tx-data/_index.json');
    if (!fs.existsSync(indexPath)) {
      log(colors.red, '❌ Data Consistency Check FAILED: public/tx-data/_index.json not found!');
      return false;
    }
    let txKeys;
    try {
      txKeys = new Set(JSON.parse(fs.readFileSync(indexPath, 'utf8')));
    } catch (err) {
      log(colors.red, `❌ Data Consistency Check FAILED: public/tx-data/_index.json is corrupted! (${err.message})`);
      return false;
    }

    const aptsDataPath = path.resolve(process.cwd(), 'public/data/apartments-by-dong.json');
    if (!fs.existsSync(aptsDataPath)) {
      log(colors.yellow, '⚠️ public/data/apartments-by-dong.json not found. Skipping cross-reference.');
      return true;
    }

    let aptsData;
    try {
      aptsData = JSON.parse(fs.readFileSync(aptsDataPath, 'utf8'));
    } catch (err) {
      log(colors.red, `❌ Data Consistency Check FAILED: apartments-by-dong.json is corrupted! (${err.message})`);
      return false;
    }

    let issues = [];
    let criticalFail = false;

    if (aptsData.byDong) {
      for (const [dong, apts] of Object.entries(aptsData.byDong)) {
        apts.forEach(apt => {
          const txKey = apt.txKey;
          if (!txKey) return;

          const normTxKey = txKey.replace(/\s+/g, '').replace(/[()（）]/g, '').trim();
          const indexHasKey = txKeys.has(txKey) || txKeys.has(normTxKey);

          const detailFile = path.resolve(process.cwd(), `public/tx-data/${txKey}.json`);
          const detailFileNorm = path.resolve(process.cwd(), `public/tx-data/${normTxKey}.json`);

          let fileExists = false;
          let fileCorrupted = false;
          let fileEmpty = false;
          let targetPath = null;

          if (fs.existsSync(detailFile)) {
            targetPath = detailFile;
            fileExists = true;
          } else if (fs.existsSync(detailFileNorm)) {
            targetPath = detailFileNorm;
            fileExists = true;
          }

          if (fileExists && targetPath) {
            try {
              const fileContent = fs.readFileSync(targetPath, 'utf8').trim();
              if (!fileContent) {
                fileEmpty = true;
              } else {
                const parsed = JSON.parse(fileContent);
                if (Array.isArray(parsed) && parsed.length === 0) {
                  fileEmpty = true;
                }
              }
            } catch (err) {
              fileCorrupted = true;
              criticalFail = true;
            }
          }

          if (!indexHasKey || !fileExists || fileCorrupted || fileEmpty) {
            issues.push({
              name: apt.name,
              txKey,
              inIndex: indexHasKey,
              fileExists,
              fileCorrupted,
              fileEmpty
            });
          }
        });
      }
    }

    if (issues.length > 0) {
      log(colors.yellow, `⚠️ Found ${issues.length} data consistency issues:`);
      issues.forEach((m, idx) => {
        let status = [];
        if (!m.inIndex) status.push('Missing from _index.json');
        if (!m.fileExists) status.push('Physical JSON file not found');
        if (m.fileCorrupted) status.push('JSON file corrupted (Syntax Error)');
        if (m.fileEmpty) status.push('JSON file is empty');
        console.log(`   ${idx + 1}. ${m.name} (txKey: ${m.txKey}) -> ${status.join(', ')}`);
      });

      if (criticalFail) {
        log(colors.red, '❌ Data Consistency Check FAILED: Critical JSON corruption detected!');
        return false;
      }
    } else {
      log(colors.green, '✅ Data Consistency check: PASSED (All mapped transaction files are clean)');
    }
    return true;
  } catch (error) {
    log(colors.red, `❌ Error during Data Consistency audit: ${error.message}`);
    return false;
  }
}

// 5. Perform Asset Size & Performance Regression Check
function auditBundleSizes() {
  log(colors.cyan, '🔄 Running asset size and performance regression audit...');
  try {
    const txDataDir = path.resolve(process.cwd(), 'public/tx-data');
    if (!fs.existsSync(txDataDir)) {
      log(colors.yellow, '⚠️ public/tx-data directory not found. Skipping asset size audit.');
      return true;
    }

    const files = fs.readdirSync(txDataDir);
    let totalSize = 0;
    let oversizedFiles = [];
    const FILE_LIMIT_BYTES = 3 * 1024 * 1024; // 3MB limit per transaction file

    files.forEach(file => {
      if (!file.endsWith('.json') || file === '_index.json') return;
      const filePath = path.join(txDataDir, file);
      const stat = fs.statSync(filePath);
      totalSize += stat.size;

      if (stat.size > FILE_LIMIT_BYTES) {
        oversizedFiles.push({
          name: file,
          sizeMb: (stat.size / (1024 * 1024)).toFixed(2)
        });
      }
    });

    const totalSizeMb = (totalSize / (1024 * 1024)).toFixed(2);
    log(colors.cyan, `📊 Asset Size Statistics:`);
    console.log(`   - Total Transaction Files: ${files.length - 1}`);
    console.log(`   - Total Directory Size: ${totalSizeMb} MB`);

    if (oversizedFiles.length > 0) {
      log(colors.red, `🚨 [SIZE WARNING] Found ${oversizedFiles.length} oversized transaction files (>3MB):`);
      oversizedFiles.forEach(f => {
        console.log(`   ⚠️ ${f.name} is ${f.sizeMb} MB`);
      });
      log(colors.red, '❌ Asset Size check: FAILED (Oversized transaction files cause client-side performance degradation)');
      return false;
    }

    log(colors.green, '✅ Asset size check: PASSED (All static transaction files are within performance bounds)');
    return true;
  } catch (error) {
    log(colors.red, `❌ Error during asset size audit: ${error.message}`);
    return false;
  }
}

// 6. Perform Playwright E2E Integration tests
function auditE2ETests() {
  log(colors.cyan, '🔄 Running Playwright E2E Integration tests (npm run test:e2e)...');
  try {
    execSync('npm run test:e2e', { stdio: 'inherit' });
    log(colors.green, '✅ E2E tests check: PASSED');
    return true;
  } catch (error) {
    log(colors.red, '❌ E2E tests check: FAILED');
    return false;
  }
}

// 7. Firestore Cost Analysis
async function auditFirestoreCosts() {
  log(colors.cyan, '🔄 Checking Firestore data volume & cost projection...');
  const credentials = getAdminCredentials();
  if (!credentials) {
    log(colors.yellow, '⚠️ Firebase Admin credentials not found. Skipping Firestore cost audit.');
    return true;
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(credentials),
      });
    }

    const db = admin.firestore();
    const dailyStatsRef = db.collection('daily_stats');
    const snapshot = await dailyStatsRef.limit(14).get();

    if (snapshot.empty) {
      log(colors.yellow, '⚠️ No daily stats records found in Firestore. Cannot project costs.');
      return true;
    }

    let totalVisits = 0;
    let daysRecorded = 0;
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.websiteVisits !== undefined) {
        totalVisits += data.websiteVisits;
        daysRecorded++;
      }
    });

    if (daysRecorded === 0) {
      log(colors.yellow, '⚠️ Daily stats documents have no websiteVisits recorded.');
      return true;
    }

    const avgDailyVisits = totalVisits / daysRecorded;
    const ASSUMED_READS_PER_VISIT = 30;
    const projectedDailyReads = avgDailyVisits * ASSUMED_READS_PER_VISIT;
    const projectedMonthlyReads = projectedDailyReads * 30;

    const usdCost = (projectedMonthlyReads / 100000) * 0.06;
    const exchangeRate = 1380;
    const krwCost = usdCost * exchangeRate;

    log(colors.cyan, `📊 Traffic Statistics (Past ${daysRecorded} Days):`);
    console.log(`   - Average Daily Visits: ${avgDailyVisits.toFixed(2)}`);
    console.log(`   - Projected Daily Reads: ${projectedDailyReads.toFixed(0)}`);
    console.log(`   - Projected Monthly Reads: ${projectedMonthlyReads.toFixed(0)}`);
    console.log(`   - Estimated Monthly Cost: ₩${krwCost.toFixed(0)} (${usdCost.toFixed(3)} USD)`);

    const COST_ALERT_LIMIT = 5000;
    if (krwCost >= COST_ALERT_LIMIT) {
      log(colors.red, `🚨 [COST WARNING] Projected Firestore monthly reads cost (₩${krwCost.toFixed(0)}) exceeds budget limit of ₩${COST_ALERT_LIMIT}!`);
      log(colors.yellow, '💡 Suggestion: Optimize frontend caching. Ensure SWR or local storage is used for transactions cache.');
    } else {
      log(colors.green, `✅ Firestore cost audit: PASSED (₩${krwCost.toFixed(0)} < ₩${COST_ALERT_LIMIT})`);
    }
    return true;
  } catch (error) {
    log(colors.red, `❌ Error during Firestore cost audit: ${error.message}`);
    return false;
  }
}

// Main execution block
async function run() {
  log(colors.magenta, '\n==================================================');
  log(colors.magenta, '🚀 DVIEW Recursive Self-Improvement Audit Pipeline');
  log(colors.magenta, '==================================================\n');

  const tsPassed = auditTypeScript();
  console.log('');
  const eslintPassed = auditESLint();
  console.log('');
  const consistencyPassed = auditDataConsistency();
  console.log('');
  const sizesPassed = auditBundleSizes();
  console.log('');
  const e2ePassed = auditE2ETests();
  console.log('');
  const firestorePassed = await auditFirestoreCosts();

  log(colors.magenta, '\n==================================================');
  if (tsPassed && eslintPassed && consistencyPassed && sizesPassed && e2ePassed && firestorePassed) {
    log(colors.green, '✅ Pipeline Status: SUCCESS (All essential checks passed)');
    process.exit(0);
  } else {
    log(colors.red, '❌ Pipeline Status: WARNING/FAILURE (Some checks failed or generated warnings)');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Audit pipeline crashed:', err);
  process.exit(1);
});
