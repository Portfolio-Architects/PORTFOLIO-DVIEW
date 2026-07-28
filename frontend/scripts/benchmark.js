/**
 * @file benchmark.js
 * @description Automated Performance Benchmark runner script for D-VIEW Web/App.
 * Measures FPS (>=60), CLS (<0.01), and Heap Memory Growth (<=5% over 10 chart re-renders).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function runBenchmark() {
  log(colors.magenta, '\n==================================================');
  log(colors.magenta, '⚡ Running D-VIEW Automated Performance Benchmark');
  log(colors.magenta, '==================================================\n');

  try {
    // Run Playwright benchmark spec directly on chromium
    execSync('npx playwright test tests/benchmark.spec.ts --project=chromium', { stdio: 'inherit' });

    // Validate benchmark-results.json
    const resultsPath = path.resolve(process.cwd(), 'scratch/benchmark-results.json');
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      const { fps, cls, heapMemoryGrowth } = results.metrics;

      log(colors.cyan, '📊 Verified Benchmark Metrics:');
      console.log(`   - FPS: ${fps.measured} (Target: ${fps.target}, Passed: ${fps.passed})`);
      console.log(`   - CLS: ${cls.measured} (Target: ${cls.target}, Passed: ${cls.passed})`);
      console.log(`   - Heap Growth: ${heapMemoryGrowth.growthPercent}% (Target: ${heapMemoryGrowth.target}, Passed: ${heapMemoryGrowth.passed})`);

      if (fps.passed && cls.passed && heapMemoryGrowth.passed) {
        log(colors.green, '\n✅ D-VIEW Automated Performance Benchmark: ALL PASSED\n');
        return true;
      } else {
        log(colors.red, '\n❌ D-VIEW Automated Performance Benchmark: METRICS FAILED\n');
        if (!fps.passed) log(colors.red, `   ❌ FPS Failed: ${fps.measured} (Target: ${fps.target})`);
        if (!cls.passed) log(colors.red, `   ❌ CLS Failed: ${cls.measured} (Target: ${cls.target})`);
        if (!heapMemoryGrowth.passed) log(colors.red, `   ❌ Heap Growth Failed: ${heapMemoryGrowth.growthPercent}% (Target: ${heapMemoryGrowth.target})`);
        return false;
      }
    }
    log(colors.red, '\n❌ D-VIEW Automated Performance Benchmark: Benchmark results file not found\n');
    return false;
  } catch (error) {
    log(colors.red, `\n❌ D-VIEW Automated Performance Benchmark FAILED: ${error.message}\n`);
    return false;
  }
}

if (require.main === module) {
  const success = runBenchmark();
  process.exit(success ? 0 : 1);
}

module.exports = { runBenchmark };
