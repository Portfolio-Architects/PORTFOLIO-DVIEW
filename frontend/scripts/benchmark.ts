/**
 * @file benchmark.ts
 * @description TypeScript Entry point for D-VIEW Automated Performance Benchmark runner.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export function runBenchmarkTS(): boolean {
  console.log('\n==================================================');
  console.log('⚡ Running D-VIEW Automated Performance Benchmark (TS)');
  console.log('==================================================\n');

  try {
    execSync('npx playwright test tests/benchmark.spec.ts --project=chromium', { stdio: 'inherit' });

    const resultsPath = path.resolve(process.cwd(), 'scratch/benchmark-results.json');
    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      const { fps, cls, heapMemoryGrowth } = results.metrics;

      console.log('📊 Verified Benchmark Metrics:');
      console.log(`   - FPS: ${fps.measured} (Target: ${fps.target}, Passed: ${fps.passed})`);
      console.log(`   - CLS: ${cls.measured} (Target: ${cls.target}, Passed: ${cls.passed})`);
      console.log(`   - Heap Growth: ${heapMemoryGrowth.growthPercent}% (Target: ${heapMemoryGrowth.target}, Passed: ${heapMemoryGrowth.passed})`);

      if (fps.passed && cls.passed && heapMemoryGrowth.passed) {
        console.log('\n✅ D-VIEW Automated Performance Benchmark (TS): ALL PASSED\n');
        return true;
      } else {
        console.error('\n❌ D-VIEW Automated Performance Benchmark (TS): METRICS FAILED\n');
        if (!fps.passed) console.error(`   ❌ FPS Failed: ${fps.measured} (Target: ${fps.target})`);
        if (!cls.passed) console.error(`   ❌ CLS Failed: ${cls.measured} (Target: ${cls.target})`);
        if (!heapMemoryGrowth.passed) console.error(`   ❌ Heap Growth Failed: ${heapMemoryGrowth.growthPercent}% (Target: ${heapMemoryGrowth.target})`);
        return false;
      }
    }
    console.error('\n❌ D-VIEW Automated Performance Benchmark (TS): Benchmark results file not found\n');
    return false;
  } catch (error) {
    console.error(`\n❌ D-VIEW Automated Performance Benchmark (TS) FAILED: ${error}\n`);
    return false;
  }
}

if (require.main === module) {
  const success = runBenchmarkTS();
  process.exit(success ? 0 : 1);
}
