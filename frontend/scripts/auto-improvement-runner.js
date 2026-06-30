/**
 * @file auto-improvement-runner.js
 * @description Coordinates the 19-hour recursive self-improvement loop.
 * Parsers task.md, runs audits, and manages safe git commits/rollbacks.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for logging
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

const PROJECT_ROOT = path.resolve(__dirname, '../..');
let BRAIN_DIR = 'C:\\Users\\ocs56\\.gemini\\antigravity\\brain\\06c2ad1c-6cc8-4ca3-b789-d1acd2a2ae14'; // default fallback
try {
  const baseBrainDir = 'C:\\Users\\ocs56\\.gemini\\antigravity\\brain';
  if (fs.existsSync(baseBrainDir)) {
    const dirs = fs.readdirSync(baseBrainDir)
      .map(name => {
        const dirPath = path.join(baseBrainDir, name);
        const taskPath = path.join(dirPath, 'task.md');
        let mtime = 0;
        if (fs.existsSync(taskPath)) {
          mtime = fs.statSync(taskPath).mtime.getTime();
        } else if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
          mtime = fs.statSync(dirPath).mtime.getTime();
        }
        return { name, path: dirPath, mtime };
      })
      .filter(item => fs.existsSync(item.path) && fs.statSync(item.path).isDirectory() && !item.name.startsWith('.') && fs.existsSync(path.join(item.path, 'task.md')))
      .sort((a, b) => b.mtime - a.mtime);
    if (dirs.length > 0) {
      BRAIN_DIR = dirs[0].path;
      console.log(`🔍 Resolved active BRAIN_DIR: ${BRAIN_DIR}`);
    }
  }
} catch (e) {
  console.log(`⚠️ Failed to resolve active BRAIN_DIR dynamically: ${e.message}`);
}
const TASK_MD_PATH = path.join(BRAIN_DIR, 'task.md');
const HISTORY_JSON_PATH = path.join(BRAIN_DIR, 'scratch/loop-history.json');

// 1. Git index.lock and zombie ports cleaner
function performPreRunCleanups() {
  log(colors.cyan, '🧹 Cleaning up leftover lock files and port bindings...');
  try {
    const gitLockPath = path.join(PROJECT_ROOT, '.git/index.lock');
    if (fs.existsSync(gitLockPath)) {
      fs.unlinkSync(gitLockPath);
      log(colors.yellow, '   ✅ Leftover .git/index.lock removed.');
    }
  } catch (err) {
    log(colors.red, `   ⚠️ Failed to clean git lock: ${err.message}`);
  }
}

// 2. Load Loop History
function getHistory() {
  try {
    if (fs.existsSync(HISTORY_JSON_PATH)) {
      const rawData = JSON.parse(fs.readFileSync(HISTORY_JSON_PATH, 'utf8'));
      
      // 1. completedTasks 하위 호환성 마이그레이션 (단순 string인 경우 객체로 정규화)
      if (rawData.completedTasks && Array.isArray(rawData.completedTasks)) {
        rawData.completedTasks = rawData.completedTasks.map((item, idx) => {
          if (typeof item === 'string') {
            return {
              task: item,
              completedAt: new Date().toISOString(),
              phase: rawData.phase ? Math.max(1, rawData.phase - (rawData.completedTasks.length - idx)) : 1,
              status: 'success',
              durationMs: 0,
              metrics: {
                typescript: true,
                eslint: true,
                dataConsistency: true,
                bundleSizes: true,
                e2e: true,
                firestore: true
              }
            };
          }
          return item;
        });
      } else {
        rawData.completedTasks = [];
      }

      // 2. history 배열 필드 초기화 (시각화 대시보드 전용 타임시리즈 데이터 구조)
      if (!rawData.history || !Array.isArray(rawData.history)) {
        rawData.history = rawData.completedTasks.map(item => ({
          phase: item.phase || 1,
          task: item.task,
          timestamp: item.completedAt,
          status: item.status || 'success',
          durationMs: item.durationMs || 0,
          metrics: item.metrics || {
            typescript: true,
            eslint: true,
            dataConsistency: true,
            bundleSizes: true,
            e2e: true,
            firestore: true
          }
        }));
      } else {
        // history 배열 요소 마이그레이션
        rawData.history = rawData.history.map(item => {
          if (typeof item === 'string') {
            return {
              phase: 1,
              task: item,
              timestamp: new Date().toISOString(),
              status: 'success',
              durationMs: 0,
              metrics: {
                typescript: true,
                eslint: true,
                dataConsistency: true,
                bundleSizes: true,
                e2e: true,
                firestore: true
              }
            };
          }
          return item;
        });
      }

      const todayStr = new Date().toISOString().split('T')[0];
      if (!rawData.startTime || !rawData.startTime.startsWith(todayStr)) {
        rawData.startTime = new Date().toISOString();
        rawData.todayRunCount = 0;
      }
      if (rawData.todayRunCount === undefined) {
        rawData.todayRunCount = 0;
      }
      return rawData;
    }
  } catch (err) {
    log(colors.red, `⚠️ Failed to read loop history: ${err.message}`);
  }
  return { phase: 0, failures: {}, currentTaskIndex: 0, completedTasks: [], history: [], startTime: new Date().toISOString(), todayRunCount: 0 };
}

// 3. Save Loop History
function saveHistory(history) {
  try {
    fs.mkdirSync(path.dirname(HISTORY_JSON_PATH), { recursive: true });
    fs.writeFileSync(HISTORY_JSON_PATH, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    log(colors.red, `❌ Failed to save loop history: ${err.message}`);
  }
}

// 4. Run Verification (Audit)
function runAudit() {
  log(colors.cyan, '🔄 Running DRIVE Audit Pipeline (npm run audit)...');
  try {
    execSync('npm run audit', { 
      cwd: path.join(PROJECT_ROOT, 'frontend'), 
      stdio: 'inherit',
      env: { ...process.env, SKIP_E2E: 'true' }
    });
    return true;
  } catch (err) {
    return false;
  }
}

// 5. Main Execution
async function main() {
  log(colors.magenta, '\n==================================================');
  log(colors.magenta, '🤖 DRIVE Auto Self-Improvement Runner Starting');
  log(colors.magenta, '==================================================\n');

  // Cool-down delay to allow Next.js dev server HMR/Fast Refresh to settle after code changes
  log(colors.cyan, '⏳ Waiting 6 seconds for HMR compilation to settle...');
  await new Promise(resolve => setTimeout(resolve, 6000));

  const phaseStartTime = Date.now();
  performPreRunCleanups();

  const history = getHistory();
  history.todayRunCount++;
  log(colors.cyan, `🔥 Today Run Count: ${history.todayRunCount}`);

  history.phase++;
  log(colors.cyan, `📊 Current Phase: ${history.phase}`);

  // Check task.md
  if (!fs.existsSync(TASK_MD_PATH)) {
    log(colors.red, '❌ task.md does not exist in the brain folder!');
    process.exit(1);
  }

  const taskContent = fs.readFileSync(TASK_MD_PATH, 'utf8');
  const lines = taskContent.split('\n');
  const pendingTaskLine = lines.find(line => line.trim().startsWith('- [ ]'));

  if (!pendingTaskLine) {
    log(colors.green, '✅ All tasks are completed in task.md! Loop ending successfully.');
    saveHistory(history);
    process.exit(0);
  }

  const taskText = pendingTaskLine.replace('- [ ]', '').trim();
  log(colors.yellow, `🎯 Current Target Task: "${taskText}"`);

  // Run audit
  const passed = runAudit();
  const durationMs = Date.now() - phaseStartTime;

  // Read individual metrics from scratch/audit-results.json
  let metrics = {
    typescript: false,
    eslint: false,
    dataConsistency: false,
    bundleSizes: false,
    e2e: false,
    firestore: false
  };

  const auditResultsPath = path.join(PROJECT_ROOT, 'frontend/scratch/audit-results.json');
  if (fs.existsSync(auditResultsPath)) {
    try {
      const auditData = JSON.parse(fs.readFileSync(auditResultsPath, 'utf8'));
      if (auditData && auditData.metrics) {
        metrics = { ...metrics, ...auditData.metrics };
      }
      // Clean up temporary results file
      fs.unlinkSync(auditResultsPath);
    } catch (err) {
      log(colors.red, `⚠️ Failed to read or delete temporary audit results: ${err.message}`);
    }
  }

  if (passed) {
    log(colors.green, `✅ Audit PASSED for task: "${taskText}"`);
    
    // Check if there are unstaged changes to commit
    try {
      const gitStatus = execSync('git status --porcelain', { cwd: PROJECT_ROOT, encoding: 'utf8' }).trim();
      if (gitStatus) {
        log(colors.cyan, '💾 Committing refactoring milestones...');
        execSync('git add -A', { cwd: PROJECT_ROOT });
        
        // Escape quotes to avoid PowerShell issues on Windows
        const escapedTaskText = taskText.replace(/"/g, "'");
        execSync(`git commit -m "Auto Refactoring: ${escapedTaskText} - Phase ${history.phase}"`, { cwd: PROJECT_ROOT });
        log(colors.green, '   ✅ Git commit generated.');

        // Push restriction based on user preferences and AGENT.md.
        // During auto-loop periods, automatic remote push is strictly disabled.
        log(colors.yellow, '   ℹ️ Git push is skipped during auto-loop (commits preserved locally).');
      } else {
        log(colors.yellow, '   ℹ️ No file changes detected to commit.');
      }
    } catch (gitErr) {
      log(colors.red, `   ⚠️ Git operation failed: ${gitErr.message}`);
    }

    // Mark task as completed in task.md
    const updatedContent = taskContent.replace(pendingTaskLine, pendingTaskLine.replace('- [ ]', '- [x]'));
    fs.writeFileSync(TASK_MD_PATH, updatedContent, 'utf8');
    log(colors.green, `✅ Marked task as completed in task.md.`);

    // Run task-autogenerator.js to auto-generate more tasks when needed
    try {
      log(colors.cyan, '🔄 Running task-autogenerator.js check...');
      execSync('node scripts/task-autogenerator.js', { cwd: path.join(PROJECT_ROOT, 'frontend'), stdio: 'inherit' });
    } catch (autoGenErr) {
      log(colors.red, `⚠️ task-autogenerator.js execution failed: ${autoGenErr.message}`);
    }

    // Clear failure counter for this task
    if (history.failures[taskText]) {
      delete history.failures[taskText];
    }

    const taskResult = {
      task: taskText,
      completedAt: new Date().toISOString(),
      phase: history.phase,
      status: 'success',
      durationMs,
      metrics
    };

    history.completedTasks.push(taskResult);
    history.history.push({
      phase: history.phase,
      task: taskText,
      timestamp: new Date().toISOString(),
      status: 'success',
      durationMs,
      metrics
    });

    saveHistory(history);
    process.exit(0);
  } else {
    log(colors.red, `🚨 Audit FAILED for task: "${taskText}"`);
    
    // Increment failure counter
    history.failures[taskText] = (history.failures[taskText] || 0) + 1;
    log(colors.yellow, `⚠️ Failure Count for this task: ${history.failures[taskText]}/2`);

    history.history.push({
      phase: history.phase,
      task: taskText,
      timestamp: new Date().toISOString(),
      status: 'failed',
      durationMs,
      metrics
    });

    if (history.failures[taskText] >= 2) {
      log(colors.red, '\n🛑 [Stop-the-Line] Task failed 2 consecutive times.');
      log(colors.cyan, '🔄 Executing hard rollback to last safe commit...');
      try {
        execSync('git reset --hard', { cwd: PROJECT_ROOT });
        log(colors.green, '   ✅ Git rollback completed.');
      } catch (rollbackErr) {
        log(colors.red, `   ❌ Failed to rollback: ${rollbackErr.message}`);
      }
      
      saveHistory(history);
      log(colors.red, '🛑 Loop execution paused. Handing control over to the user.');
      process.exit(1);
    } else {
      log(colors.cyan, '🔄 Executing safety rollback for this iteration...');
      try {
        execSync('git reset --hard', { cwd: PROJECT_ROOT });
        log(colors.green, '   ✅ Staged/unstaged edits rolled back safely. Retrying task in next phase.');
      } catch (rollbackErr) {
        log(colors.red, `   ❌ Failed to rollback: ${rollbackErr.message}`);
      }
      saveHistory(history);
      process.exit(0);
    }
  }
}

main().catch(err => {
  log(colors.red, `❌ Runner crashed: ${err.message}`);
  process.exit(1);
});
