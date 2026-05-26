/**
 * @file audit-pipeline.js
 * @description Continuous diagnostics and recursive self-improvement verification pipeline.
 * Performs TypeScript type checking, ESLint checking, and Firestore billing projection audits.
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
    // If next lint or eslint runs successfully
    execSync('npx eslint . --max-warnings=10', { stdio: 'inherit' });
    log(colors.green, '✅ ESLint check: PASSED');
    return true;
  } catch (error) {
    log(colors.yellow, '⚠️ ESLint check returned warnings or failures.');
    return false;
  }
}

// 4. Firestore Cost Analysis
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
    // Assume average 30 document reads per user visit (fetching macro, comments, apartments)
    const ASSUMED_READS_PER_VISIT = 30;
    const projectedDailyReads = avgDailyVisits * ASSUMED_READS_PER_VISIT;
    const projectedMonthlyReads = projectedDailyReads * 30;

    // Firebase Firestore reads: $0.06 per 100,000 reads
    const usdCost = (projectedMonthlyReads / 100000) * 0.06;
    const exchangeRate = 1380; // 1 USD = 1380 KRW
    const krwCost = usdCost * exchangeRate;

    log(colors.cyan, `📊 Traffic Statistics (Past ${daysRecorded} Days):`);
    console.log(`   - Average Daily Visits: ${avgDailyVisits.toFixed(2)}`);
    console.log(`   - Projected Daily Reads: ${projectedDailyReads.toFixed(0)}`);
    console.log(`   - Projected Monthly Reads: ${projectedMonthlyReads.toFixed(0)}`);
    console.log(`   - Estimated Monthly Cost: ₩${krwCost.toFixed(0)} (${usdCost.toFixed(3)} USD)`);

    const COST_ALERT_LIMIT = 5000; // 5,000 KRW limit
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
  const firestorePassed = await auditFirestoreCosts();

  log(colors.magenta, '\n==================================================');
  if (tsPassed && firestorePassed) {
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
