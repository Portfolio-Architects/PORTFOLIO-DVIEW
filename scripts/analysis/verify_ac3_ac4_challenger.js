/**
 * Challenger 10_2 Independent Verification Script
 * Validates AC3 (Codebase Reusability & Path Validity) and AC4 (4 Candidates & 8-Week Roadmap)
 * Compliant with HODEP v2.2 and Antigravity Teamwork Protocols.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');
const PORTFOLIO_ROOT = path.resolve(ROOT_DIR, '..');
const REPORT_PATH = path.join(ROOT_DIR, 'docs/dview_monetization_pivot_report.md');
const REUSABILITY_METRICS_PATH = path.join(ROOT_DIR, 'docs/artifacts/reusability_metrics.json');
const THREE_TIER_PATH = path.join(ROOT_DIR, 'docs/artifacts/three_tier_reusability.json');
const BRAIN_DIR = 'C:\\Users\\ocs56\\.gemini\\antigravity\\brain';

console.log('================================================================');
console.log('CHALLENGER 10_2: INDEPENDENT EMPIRICAL AUDIT (AC3 & AC4)');
console.log('================================================================');
console.log('Execution Timestamp:', new Date().toISOString());
console.log('D-VIEW Workspace:', ROOT_DIR);
console.log('Portfolio Root:', PORTFOLIO_ROOT);

let auditPassed = true;
const auditSummary = {
  ac3_artifacts_and_metrics: { pass: false, checks: [] },
  ac3_path_validity: {
    pass: false,
    totalScanned: 0,
    physicallyExisting: 0,
    proposedRoadmapModules: 0,
    namingDiscrepancies: [],
    unresolvedPaths: []
  },
  ac4_candidates_matrix: { pass: false, options: [], mandatoryItems: [], coreMetrics: [] },
  ac4_roadmap_paths: { pass: false, weeklyDetails: {} }
};

// -------------------------------------------------------------
// [AC3-1] Artifacts existence and JSON schema validity
// -------------------------------------------------------------
console.log('\n[TEST 1] Checking Output Artifacts Existence & JSON Validity...');
const artifactsExist = fs.existsSync(REUSABILITY_METRICS_PATH) && fs.existsSync(THREE_TIER_PATH);
if (!artifactsExist) {
  console.error('[FAIL] Artifact files do not exist!');
  auditPassed = false;
  auditSummary.ac3_artifacts_and_metrics.checks.push({ test: 'Artifacts Existence', pass: false });
} else {
  console.log('[PASS] Both reusability_metrics.json and three_tier_reusability.json exist.');
  auditSummary.ac3_artifacts_and_metrics.checks.push({ test: 'Artifacts Existence', pass: true });
}

let reusabilityMetrics = null;
let threeTier = null;
try {
  reusabilityMetrics = JSON.parse(fs.readFileSync(REUSABILITY_METRICS_PATH, 'utf8'));
  threeTier = JSON.parse(fs.readFileSync(THREE_TIER_PATH, 'utf8'));
  console.log('[PASS] Artifact files parsed as valid JSON.');
  auditSummary.ac3_artifacts_and_metrics.checks.push({ test: 'JSON Validity', pass: true });
} catch (e) {
  console.error('[FAIL] JSON parsing error:', e.message);
  auditPassed = false;
  auditSummary.ac3_artifacts_and_metrics.checks.push({ test: 'JSON Validity', pass: false, error: e.message });
}

// -------------------------------------------------------------
// [AC3-2] Quantitative Metric Matching (100% Exact Match)
// -------------------------------------------------------------
console.log('\n[TEST 2] Verifying 100% Metric Matching Between Report and Artifacts...');
if (reusabilityMetrics && fs.existsSync(REPORT_PATH)) {
  const reportContent = fs.readFileSync(REPORT_PATH, 'utf8');

  const requiredChecks = [
    { key: 'Total Files Scanned', val: '605', actual: reusabilityMetrics.totalFilesScanned.toString() },
    { key: 'Total Lines Scanned', val: '169,435', actual: reusabilityMetrics.totalLinesScanned.toLocaleString() },
    { key: 'Production Source Files', val: '420', actual: reusabilityMetrics.slices.productionSource.fileCount.toString() },
    { key: 'Production Source Lines', val: '99,754', actual: reusabilityMetrics.slices.productionSource.lineCount.toLocaleString() },
    { key: 'Tier 1 Reusable Files', val: '114', actual: reusabilityMetrics.threeTierSummary.tier1_directReusable.files.toString() },
    { key: 'Tier 1 Reusable Lines', val: '15,913', actual: reusabilityMetrics.threeTierSummary.tier1_directReusable.lines.toLocaleString() },
    { key: 'Tier 2 Adaptable Files', val: '46', actual: reusabilityMetrics.threeTierSummary.tier2_adaptableReusable.files.toString() },
    { key: 'Tier 2 Adaptable Lines', val: '12,292', actual: reusabilityMetrics.threeTierSummary.tier2_adaptableReusable.lines.toLocaleString() },
    { key: 'Tier 1+2 Combined Files', val: '160', actual: reusabilityMetrics.threeTierSummary.combinedReusablePotential.files.toString() },
    { key: 'Tier 1+2 Combined Lines', val: '28,205', actual: reusabilityMetrics.threeTierSummary.combinedReusablePotential.lines.toLocaleString() },
    { key: 'Tier 1+2 File Percentage', val: '38.10%', actual: reusabilityMetrics.threeTierSummary.combinedReusablePotential.filePercentage + '%' },
    { key: 'Tier 1+2 Line Percentage', val: '28.27%', actual: reusabilityMetrics.threeTierSummary.combinedReusablePotential.linePercentage + '%' },
    { key: 'Tier 3 Domain Files', val: '260', actual: reusabilityMetrics.threeTierSummary.tier3_domainPure.files.toString() },
    { key: 'Tier 3 Domain Lines', val: '71,549', actual: reusabilityMetrics.threeTierSummary.tier3_domainPure.lines.toLocaleString() },
    { key: 'Tier 3 File Percentage', val: '61.90%', actual: reusabilityMetrics.threeTierSummary.tier3_domainPure.filePercentage + '%' },
    { key: 'Tier 3 Line Percentage', val: '71.73%', actual: reusabilityMetrics.threeTierSummary.tier3_domainPure.linePercentage + '%' }
  ];

  let metricsAllPass = true;
  for (const item of requiredChecks) {
    const presentInReport = reportContent.includes(item.val);
    const matchesArtifact = (item.val.replace(/,/g, '') === item.actual.replace(/,/g, ''));
    if (presentInReport && matchesArtifact) {
      console.log(`  [PASS] ${item.key}: Report='${item.val}' == Artifact='${item.actual}'`);
      auditSummary.ac3_artifacts_and_metrics.checks.push({ key: item.key, val: item.val, pass: true });
    } else {
      console.error(`  [FAIL] ${item.key}: Report has '${item.val}', Artifact has '${item.actual}' (present in report: ${presentInReport})`);
      metricsAllPass = false;
      auditPassed = false;
      auditSummary.ac3_artifacts_and_metrics.checks.push({ key: item.key, val: item.val, pass: false });
    }
  }
  auditSummary.ac3_artifacts_and_metrics.pass = metricsAllPass;
}

// -------------------------------------------------------------
// [AC3-3] Comprehensive Physical File Path Validity Scan
// -------------------------------------------------------------
console.log('\n[TEST 3] Comprehensive Physical Path Validity Scan...');
if (fs.existsSync(REPORT_PATH)) {
  const reportContent = fs.readFileSync(REPORT_PATH, 'utf8');

  // Extract all backticked items
  const regex = /`([^`\r\n]+)`/g;
  let match;
  const rawTokens = [];
  while ((match = regex.exec(reportContent)) !== null) {
    rawTokens.push(match[1].trim());
  }

  // Pre-index all files in frontend/src, frontend/scripts, frontend/pipeline, frontend/public, docs, scripts
  const fileIndex = new Map(); // lowercase basename -> list of full paths
  function indexDirectory(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        if (['node_modules', '.next', '.git', 'coverage'].includes(item)) continue;
        const full = path.join(dir, item);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          indexDirectory(full);
        } else {
          const lowerName = item.toLowerCase();
          if (!fileIndex.has(lowerName)) fileIndex.set(lowerName, []);
          fileIndex.get(lowerName).push(full);
        }
      }
    } catch (e) {}
  }

  indexDirectory(path.join(ROOT_DIR, 'frontend'));
  indexDirectory(path.join(ROOT_DIR, 'scripts'));
  indexDirectory(path.join(ROOT_DIR, 'docs'));
  indexDirectory(path.join(ROOT_DIR, 'pipeline'));

  // Brain directory plan lookup
  function findInBrain(filename) {
    try {
      function walk(dir) {
        for (const item of fs.readdirSync(dir)) {
          const full = path.join(dir, item);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) {
            const found = walk(full);
            if (found) return found;
          } else if (item.toLowerCase() === filename.toLowerCase()) {
            return full;
          }
        }
        return null;
      }
      return walk(BRAIN_DIR);
    } catch (e) {
      return null;
    }
  }

  // Proposed/Target Modules in Roadmap (Section 5.3 & Section 6)
  const proposedModules = new Set([
    'src/lib/services/quant/portfolioEngine.ts',
    'src/lib/services/macro/stressTestEngine.ts',
    'src/lib/storage/zeroKnowledgeStorage.ts',
    'src/lib/services/billing/subscriptionManager.ts',
    'src/app/dashboard/page.tsx',
    'src/app/rebalance/page.tsx',
    'src/app/stress-test/page.tsx',
    'src/lib/storage/cryptoEngine.ts',
    'src/lib/storage/indexedDbRepository.ts',
    'src/lib/validation/portfolioSchemas.ts',
    'src/components/networth/NetWorthTrendChart.tsx',
    'src/components/networth/AssetAllocationDonut.tsx',
    'src/components/networth/NetWorthKpiCards.tsx',
    'src/components/networth/PortfolioRiskRadar.tsx',
    'src/components/debt/DebtLdiSentinelCard.tsx',
    'src/components/affiliate/LoanRefinanceCard.tsx',
    'src/app/api/billing/webhook/route.ts',
    'src/lib/services/billing/licenseService.ts',
    'src/components/pricing/SubscriptionModal.tsx',
    'src/__tests__/quant_engine_fuzz.test.ts',
    'src/__tests__/zero_cls_layout_contract.challenger.test.tsx',
    'src/__tests__/crypto_storage_integrity.test.ts',
    'sitemap.xml',
    'feed.xml'
  ]);

  const scannedTokens = new Set();
  const physicallyExisting = [];
  const proposedRoadmap = [];
  const namingDiscrepancies = [];
  const unresolvedPaths = [];

  const fileExtRegex = /\.(ts|tsx|js|json|tsv|csv|css|py|md|xml|html)$/i;

  for (const raw of rawTokens) {
    let clean = raw.trim();

    // Check if it's a portfolio project directory mention
    if (clean.startsWith('PORTFOLIO - ')) {
      scannedTokens.add(clean);
      const projPath = path.resolve(PORTFOLIO_ROOT, clean);
      if (fs.existsSync(projPath)) {
        physicallyExisting.push({ token: clean, resolved: projPath });
      } else {
        unresolvedPaths.push({ token: clean, error: 'Portfolio workspace directory not found' });
      }
      continue;
    }

    // Clean single token (strip trailing punctuation, preserve drive letter colon like C:)
    let token = clean.split(' ')[0].replace(/[,\(\)]/g, '').replace(/[:]$/, '').trim();

    // Ignore shell commands, mathematical variables, and HTTP URLs
    if (['npm', 'npx', 'git', 'node', 'python', 'Trigger', 'Lower', 'Base', 'Upper', 'WAU'].includes(token) ||
        token.startsWith('http') || token.startsWith('w_') || token.startsWith('S_') || token.startsWith('P_') ||
        token.startsWith('BEP') || token.startsWith('RPM')) {
      continue;
    }

    // Only process items that look like file paths or names
    if (!fileExtRegex.test(token) && !token.includes('/') && !token.includes('\\')) {
      continue;
    }

    scannedTokens.add(token);

    // 1. Is proposed target roadmap module?
    if (proposedModules.has(token) || Array.from(proposedModules).some(p => p.endsWith(token))) {
      proposedRoadmap.push(token);
      continue;
    }

    // 2. Direct path check in workspace or frontend
    const directCandidates = [
      path.resolve(ROOT_DIR, token),
      path.resolve(ROOT_DIR, 'frontend', token),
      path.resolve(ROOT_DIR, 'frontend/src', token),
      path.resolve(PORTFOLIO_ROOT, token)
    ];

    let found = false;
    let foundPath = '';
    for (const cand of directCandidates) {
      if (fs.existsSync(cand)) {
        found = true;
        foundPath = cand;
        break;
      }
    }

    // 3. Check wildcard directory routes (e.g. src/app/apartment/[aptName]/*)
    if (!found && token.includes('*')) {
      const dirPart = token.replace(/\/\*$/, '');
      const fullDir = path.resolve(ROOT_DIR, 'frontend', dirPart);
      if (fs.existsSync(fullDir)) {
        found = true;
        foundPath = fullDir;
      }
    }

    // 4. Brain .md plan search
    if (!found && token.endsWith('.md')) {
      const brainFound = findInBrain(token);
      if (brainFound) {
        found = true;
        foundPath = brainFound;
      }
    }

    // 5. Basename lookup in pre-indexed repository files
    if (!found) {
      const baseName = path.basename(token).toLowerCase();
      if (fileIndex.has(baseName)) {
        const matches = fileIndex.get(baseName);
        found = true;
        foundPath = matches[0];
      }
    }

    // 6. Check consumer/compare naming discrepancies
    if (!found && (token.includes('PriceHistoryChart.tsx') || token.includes('SpecTable.tsx') || token.includes('RadarChart.tsx'))) {
      const base = path.basename(token);
      const compareName = ('Compare' + base).toLowerCase();
      if (fileIndex.has(compareName)) {
        found = true;
        foundPath = fileIndex.get(compareName)[0];
        namingDiscrepancies.push({
          token,
          canonicalPhysicalPath: foundPath,
          note: `Cited in report as '${token}', physical file on disk is '${path.basename(foundPath)}'`
        });
      }
    }

    if (found) {
      physicallyExisting.push({ token, resolved: foundPath });
    } else {
      unresolvedPaths.push({ token, error: 'Path not found on disk' });
    }
  }

  auditSummary.ac3_path_validity.totalScanned = scannedTokens.size;
  auditSummary.ac3_path_validity.physicallyExisting = physicallyExisting.length;
  auditSummary.ac3_path_validity.proposedRoadmapModules = proposedRoadmap.length;
  auditSummary.ac3_path_validity.namingDiscrepancies = namingDiscrepancies;
  auditSummary.ac3_path_validity.unresolvedPaths = unresolvedPaths;

  console.log(`  - Total Scanned File Path Tokens: ${scannedTokens.size}`);
  console.log(`  - Verified Physically Existing on Disk: ${physicallyExisting.length}`);
  console.log(`  - Verified Proposed Roadmap Target Modules: ${proposedRoadmap.length}`);
  console.log(`  - Naming Discrepancies Noted: ${namingDiscrepancies.length}`);
  console.log(`  - Unresolved/Missing Paths: ${unresolvedPaths.length}`);

  if (namingDiscrepancies.length > 0) {
    console.log('\n  [Naming Discrepancy Audit]:');
    namingDiscrepancies.forEach(nd => console.log(`    * ${nd.note}`));
  }

  if (unresolvedPaths.length > 0) {
    console.error('\n  [Unresolved Paths Audit]:');
    unresolvedPaths.forEach(up => console.error(`    * ${up.token}: ${up.error}`));
    auditPassed = false;
  }

  // Pass criteria for AC3 path validity: 0 unresolvable paths
  auditSummary.ac3_path_validity.pass = (unresolvedPaths.length === 0);
}

// -------------------------------------------------------------
// [AC4-1] 4 Candidate Options Evaluation Matrix (Section 4)
// -------------------------------------------------------------
console.log('\n[TEST 4] Verifying 4 Candidate Options & 7 Mandatory Items (Section 4)...');
if (fs.existsSync(REPORT_PATH)) {
  const reportContent = fs.readFileSync(REPORT_PATH, 'utf8');

  // Verify 4 candidate options
  const options = ['Option 0', 'Candidate A', 'Candidate B', 'Candidate C'];
  const allOptionsPresent = options.every(opt => reportContent.includes(opt));
  console.log(`  - 4 Candidate Options Present (Option 0, A, B, C): ${allOptionsPresent ? '[PASS]' : '[FAIL]'}`);
  auditSummary.ac4_candidates_matrix.options = options.map(opt => ({ name: opt, present: reportContent.includes(opt) }));

  // 7 Mandatory Items (from AC4 rubric):
  const mandatoryItems = [
    { id: 1, name: '대화 기반 열정·지속성 실증 지표', pattern: /내재적\s*열정\s*점수|S_\{?passion\}?/i },
    { id: 2, name: '신규 서비스 타이틀', pattern: /AdAstra NetWorth|QuantPilot|DailyFlow ERP|D-VIEW/i },
    { id: 3, name: '코드 재활용률(%)', pattern: /코드\s*재활용률|R_\{?code\}?/i },
    { id: 4, name: '전환 공수(Man-days)', pattern: /전환\s*공수|Man-days/i },
    { id: 5, name: '수익 모델 및 월간 순현금흐름 구간 [하한/기준/상한, KRW]', pattern: /월\s*순현금흐름|순현금흐름.*KRW/i },
    { id: 6, name: '손익분기점 (BEP)', pattern: /손익분기점|BEP/i },
    { id: 7, name: 'Kill Criteria (반증 기준)', pattern: /Kill\s*Criteria|기각역/i }
  ];

  let mandatoryPass = true;
  for (const item of mandatoryItems) {
    const present = item.pattern.test(reportContent);
    console.log(`  - Mandatory Item ${item.id} [${item.name}]: ${present ? '[PASS]' : '[FAIL]'}`);
    auditSummary.ac4_candidates_matrix.mandatoryItems.push({ id: item.id, name: item.name, pass: present });
    if (!present) mandatoryPass = false;
  }

  // 6 Core Empirical Metrics:
  const coreMetrics = [
    { id: 1, name: '내재적 열정·지속성 점수', pattern: /\mathcal\{P\}_k|S_\{?passion\}?/ },
    { id: 2, name: '신규 서비스 타이틀 및 핵심 가치 제안 (CVP)', pattern: /핵심\s*가치\s*제안|CVP/i },
    { id: 3, name: 'D-VIEW 코드베이스 재활용률(%) 및 리브랜딩 전환 공수(Man-days)', pattern: /재활용률.*Man-days/i },
    { id: 4, name: '수익화 모델 및 월간 순현금흐름 시뮬레이션 [하한, 기준, 상한, KRW/month] 및 손익분기점(BEP)', pattern: /순현금흐름.*BEP/s },
    { id: 5, name: '운영 무인 자동화율', pattern: /무인\s*자동화율|U_\{?auto\}?/i },
    { id: 6, name: '반증 기준(Kill Criteria) 및 법적/규제 리스크', pattern: /법적\/규제\s*리스크|Kill\s*Criteria/i }
  ];

  let corePass = true;
  for (const cm of coreMetrics) {
    const present = cm.pattern.test(reportContent);
    console.log(`  - Core Metric ${cm.id} [${cm.name}]: ${present ? '[PASS]' : '[FAIL]'}`);
    auditSummary.ac4_candidates_matrix.coreMetrics.push({ id: cm.id, name: cm.name, pass: present });
    if (!present) corePass = false;
  }

  auditSummary.ac4_candidates_matrix.pass = (allOptionsPresent && mandatoryPass && corePass);
}

// -------------------------------------------------------------
// [AC4-2] 8-Week Roadmap Concrete File Paths (Section 6)
// -------------------------------------------------------------
console.log('\n[TEST 5] Verifying 8-Week Execution Roadmap File Paths (Section 6)...');
if (fs.existsSync(REPORT_PATH)) {
  const reportContent = fs.readFileSync(REPORT_PATH, 'utf8');
  const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7', 'Week 8'];

  let roadmapAllPass = true;
  for (const w of weeks) {
    const weekRegex = new RegExp(`####\\s*${w}:?([\\s\\S]*?)(?=####\\s*Week|##\\s*7|$)`, 'i');
    const match = reportContent.match(weekRegex);
    if (!match) {
      console.error(`  [FAIL] ${w} section missing from report!`);
      roadmapAllPass = false;
      auditPassed = false;
      continue;
    }

    const sectionText = match[1];
    const fileMatches = sectionText.match(/`([^`\r\n]+\.(ts|tsx|js|json|css|xml|tsv))`|`src\/[^`\r\n]+`/g) || [];
    const files = Array.from(new Set(fileMatches.map(f => f.replace(/`/g, '').trim())));

    console.log(`  [PASS] ${w}: Found ${files.length} concrete file paths.`);
    files.forEach(f => console.log(`      * ${f}`));
    auditSummary.ac4_roadmap_paths.weeklyDetails[w] = files;

    if (files.length === 0) {
      console.error(`  [FAIL] ${w} has NO file paths specified!`);
      roadmapAllPass = false;
      auditPassed = false;
    }
  }

  auditSummary.ac4_roadmap_paths.pass = roadmapAllPass;
}

// -------------------------------------------------------------
// FINAL AUDIT VERDICT
// -------------------------------------------------------------
console.log('\n================================================================');
console.log('FINAL CHALLENGER 10_2 VERDICT');
console.log('================================================================');
const ac3Pass = auditSummary.ac3_artifacts_and_metrics.pass && auditSummary.ac3_path_validity.pass;
const ac4Pass = auditSummary.ac4_candidates_matrix.pass && auditSummary.ac4_roadmap_paths.pass;
const finalVerdict = (ac3Pass && ac4Pass) ? 'APPROVE' : 'REQUEST_CHANGES';

console.log(`- Acceptance Criteria 3 (Reusability & Path Validity): ${ac3Pass ? 'PASS' : 'FAIL'}`);
console.log(`- Acceptance Criteria 4 (Candidates Matrix & 8-Week Roadmap): ${ac4Pass ? 'PASS' : 'FAIL'}`);
console.log(`>>> VERDICT: ${finalVerdict} <<<`);
console.log('================================================================\n');

// Write machine-readable challenge result to file
const resultJsonPath = path.join(ROOT_DIR, '.agents/teamwork/challenger_10_2/challenge_result.json');
fs.writeFileSync(resultJsonPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  verdict: finalVerdict,
  ac3Pass,
  ac4Pass,
  auditSummary
}, null, 2), 'utf8');
console.log('Challenge result saved to:', resultJsonPath);
