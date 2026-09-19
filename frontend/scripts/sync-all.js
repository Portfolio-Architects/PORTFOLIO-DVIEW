#!/usr/bin/env node
/**
 * 🔄 D-VIEW Master Data Pipeline Sync Runner
 * 
 * Runs all data synchronization tasks in sequence:
 * 1. sync-nps.js
 * 2. sync-apartments.js
 * 3. sync-transactions.js
 * 4. sync-location-scores.js
 * 5. fetch-local-notices.js
 * 6. sync-static-data.ts
 */

const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  'scripts/sync-nps.js',
  'scripts/sync-apartments.js',
  'scripts/sync-transactions.js',
  'scripts/sync-location-scores.js',
  'scripts/fetch-local-notices.js',
];

console.log('🚀 Starting D-VIEW Master Data Pipeline Sync...');

for (const script of scripts) {
  console.log(`\n▶️ Executing ${script}...`);
  try {
    execSync(`node "${path.resolve(__dirname, '..', script)}"`, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
    });
  } catch (err) {
    console.error(`❌ Failed while executing ${script}:`, err.message);
    process.exit(1);
  }
}

console.log('\n▶️ Executing sync-static-data...');
try {
  execSync('npm run sync-static', {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
  });
} catch (err) {
  console.error('❌ Failed while executing sync-static:', err.message);
  process.exit(1);
}

console.log('\n✅ All data pipeline sync tasks completed successfully!');
