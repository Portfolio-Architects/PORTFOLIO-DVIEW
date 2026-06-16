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
const BRAIN_DIR = 'C:\\Users\\ocs56\\.gemini\\antigravity\\brain\\1431383b-b23f-43d1-92c1-0fc73cd58cf5';
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
      return JSON.parse(fs.readFileSync(HISTORY_JSON_PATH, 'utf8'));
    }
  } catch (err) {
    log(colors.red, `⚠️ Failed to read loop history: ${err.message}`);
  }
  return { phase: 0, failures: {}, currentTaskIndex: 0, completedTasks: [] };
}

// 3. Save Loop History
function saveHistory(history) {
  try {
    fs.writeFileSync(HISTORY_JSON_PATH, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    log(colors.red, `❌ Failed to save loop history: ${err.message}`);
  }
}

// 4. Run Verification (Audit)
function runAudit() {
  log(colors.cyan, '🔄 Running DVIEW Audit Pipeline (npm run audit)...');
  try {
    execSync('npm run audit', { cwd: path.join(PROJECT_ROOT, 'frontend'), stdio: 'inherit' });
    return true;
  } catch (err) {
    return false;
  }
}

// 5. Main Execution
async function main() {
  log(colors.magenta, '\n==================================================');
  log(colors.magenta, '🤖 DVIEW Auto Self-Improvement Runner Starting');
  log(colors.magenta, '==================================================\n');

  performPreRunCleanups();

  const history = getHistory();
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

  if (passed) {
    log(colors.green, `✅ Audit PASSED for task: "${taskText}"`);
    
    // Check if there are unstaged changes to commit
    try {
      const gitStatus = execSync('git status --porcelain', { cwd: PROJECT_ROOT, encoding: 'utf8' }).trim();
      if (gitStatus) {
        log(colors.cyan, '💾 Committing refactoring milestones...');
        execSync('git add -A', { cwd: PROJECT_ROOT });
        execSync(`git commit -m "Auto Refactoring: ${taskText} - Phase ${history.phase}"`, { cwd: PROJECT_ROOT });
        log(colors.green, '   ✅ Git commit generated.');
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

    // Clear failure counter for this task
    if (history.failures[taskText]) {
      delete history.failures[taskText];
    }
    history.completedTasks.push(taskText);
    saveHistory(history);
    process.exit(0);
  } else {
    log(colors.red, `🚨 Audit FAILED for task: "${taskText}"`);
    
    // Increment failure counter
    history.failures[taskText] = (history.failures[taskText] || 0) + 1;
    log(colors.yellow, `⚠️ Failure Count for this task: ${history.failures[taskText]}/2`);

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
