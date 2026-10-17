/**
 * scripts/analysis/audit_reusability.js
 * 100% Non-sampling static codebase audit and 3-Tier reusability mapping for D-VIEW.
 * Compliant with HODEP v2.2 and Teamwork Protocol.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const FRONTEND_DIR = path.join(PROJECT_ROOT, 'frontend');
const ARTIFACTS_DIR = path.join(PROJECT_ROOT, 'docs', 'artifacts');

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (!content) return 0;
    return content.split('\n').length;
  } catch (e) {
    return 0;
  }
}

function getFileSize(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return stat.size;
  } catch (e) {
    return 0;
  }
}

function getAllFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (item !== 'node_modules' && item !== '.next' && item !== 'coverage' && item !== '.git') {
        results = results.concat(getAllFiles(full));
      }
    } else {
      results.push(full);
    }
  }
  return results;
}

function isTest(relPath) {
  const norm = relPath.replace(/\\/g, '/');
  return norm.includes('/__tests__/') || norm.includes('.test.') || norm.includes('.spec.') || norm.includes('.challenge.');
}

function isDataAsset(relPath) {
  const ext = path.extname(relPath).toLowerCase();
  return ext === '.json' || ext === '.tsv' || ext === '.csv' || ext === '.md' || ext === '.ico';
}

function classifyBaseCategory(relPath) {
  const norm = relPath.replace(/\\/g, '/');

  // 1. UI Infrastructure & Generic Components
  if (
    norm.startsWith('src/components/ui/') && !norm.includes('ApartmentModalSkeleton') && !norm.includes('TechnoValleySkeleton') ||
    norm.startsWith('src/components/common/') ||
    norm.startsWith('src/components/pwa/') ||
    norm.startsWith('src/components/ads/') ||
    norm === 'src/components/Footer.tsx' ||
    norm === 'src/components/ThemeProvider.tsx' ||
    norm === 'src/components/SiteTracker.tsx' ||
    norm === 'src/components/SWRProvider.tsx' ||
    norm === 'src/components/SettingsModal.tsx' ||
    norm === 'src/components/NotificationBanner.tsx' ||
    norm === 'src/components/PageHeroHeader.tsx'
  ) {
    return { category: 'Universal', sub: 'UI Components & Common Layout' };
  }

  // 2. State & Context Providers
  if (norm.startsWith('src/contexts/')) {
    return { category: 'Universal', sub: 'Contexts & State' };
  }

  // 3. Generic Client & Server Infra (Firebase, Redis, API Client, Logger)
  if (
    norm === 'src/lib/firebaseAdmin.ts' ||
    norm === 'src/lib/firebaseAdmin.client.ts' ||
    norm === 'src/lib/firebaseConfig.ts' ||
    norm === 'src/lib/redis.ts' ||
    norm === 'src/lib/rate-limit.ts' ||
    norm.startsWith('src/lib/api/') ||
    norm.startsWith('src/lib/config/') ||
    norm === 'src/lib/services/logger.ts' ||
    norm === 'src/lib/services/logger.test.ts' ||
    norm === 'src/lib/services/storage.service.ts' ||
    norm === 'src/lib/services/googleSheets.ts' ||
    norm === 'src/lib/repositories/googleSheets.repository.ts' ||
    norm === 'src/lib/repositories/storage.repository.ts' ||
    norm === 'src/lib/repositories/isomorphicHelper.ts' ||
    norm.startsWith('src/lib/utils/server/') ||
    norm.startsWith('src/lib/ads/')
  ) {
    return { category: 'Universal', sub: 'Backend & Infrastructure (Firebase, Redis, Sheets, API)' };
  }

  // 4. Web Worker & Pure Statistical Engine
  if (
    norm.startsWith('src/lib/workers/') ||
    norm === 'src/lib/analytics/twoSigmaEngine.ts' ||
    norm === 'src/lib/analytics/twoSigmaEngine.test.ts' ||
    norm === 'src/lib/analytics/statsEngine.ts' ||
    norm === 'src/lib/analytics/statsEngine.test.ts'
  ) {
    return { category: 'Universal', sub: 'Web Worker & Pure Statistical Math Engine' };
  }

  // 5. Generic Hooks
  if (
    norm === 'src/hooks/useAdBlockDetector.ts' ||
    norm === 'src/hooks/useAuth.ts' ||
    norm === 'src/hooks/useDebounce.ts' ||
    norm === 'src/hooks/useInView.ts' ||
    norm === 'src/hooks/useMounted.ts' ||
    norm === 'src/hooks/useNetworkStatus.ts' ||
    norm === 'src/hooks/usePreventElasticBounce.ts' ||
    norm === 'src/hooks/usePreventElasticBounce.test.ts' ||
    norm === 'src/hooks/useSwipeNavigation.ts'
  ) {
    return { category: 'Universal', sub: 'Generic React Hooks' };
  }

  // 6. Generic Utilities & Helpers
  if (
    norm === 'src/lib/utils/date.ts' ||
    norm === 'src/lib/utils/date.test.ts' ||
    norm === 'src/lib/utils/safeReload.ts' ||
    norm === 'src/lib/utils/subscribable.ts' ||
    norm === 'src/lib/utils/subscribable.test.ts' ||
    norm === 'src/lib/utils/exif.ts' ||
    norm === 'src/lib/utils/imageCompression.ts' ||
    norm === 'src/lib/utils/html2canvasPatch.ts' ||
    norm === 'src/lib/utils/pdfExport.ts' ||
    norm === 'src/lib/utils/haversine.ts' ||
    norm === 'src/lib/utils/haversine.test.ts' ||
    norm === 'src/lib/utils/localCache.ts' ||
    norm === 'src/lib/utils/localCache.test.ts' ||
    norm === 'src/lib/utils/offlineQueue.ts' ||
    norm === 'src/lib/utils/offlineQueue.test.ts' ||
    norm === 'src/lib/utils/firestoreConverters.ts' ||
    norm === 'src/lib/utils/firestoreThrottle.ts' ||
    norm === 'src/lib/utils/firestoreThrottle.test.ts' ||
    norm === 'src/lib/utils/autoSuggest.ts' ||
    norm === 'src/lib/utils/autoSuggest.test.ts' ||
    norm === 'src/lib/utils/userUtils.ts' ||
    norm === 'src/lib/utils/userUtils.test.ts' ||
    norm === 'src/lib/authUtils.ts' ||
    norm === 'src/lib/build-version.ts' ||
    norm === 'src/lib/offlineQueue.ts' ||
    norm === 'src/lib/preload.ts'
  ) {
    return { category: 'Universal', sub: 'Generic Utilities & Caching' };
  }

  // 7. Generic App Routes & Boilerplate (SEO, PWA, Error Boundaries)
  if (
    norm === 'src/app/layout.tsx' ||
    norm === 'src/app/globals.css' ||
    norm === 'src/app/manifest.ts' ||
    norm === 'src/app/robots.ts' ||
    norm === 'src/app/sitemap.ts' ||
    norm === 'src/app/error.tsx' ||
    norm === 'src/app/global-error.tsx' ||
    norm === 'src/app/not-found.tsx' ||
    norm === 'src/app/feed.xml/route.ts' ||
    norm.startsWith('src/app/privacy/') ||
    norm.startsWith('src/app/terms/') ||
    norm.startsWith('src/app/contact/') ||
    norm === 'src/app/api/traffic/route.ts' ||
    norm === 'src/app/api/public/analytics/route.ts' ||
    norm === 'src/app/api/push/subscribe/route.ts' ||
    norm === 'src/app/api/push/unsubscribe/route.ts' ||
    norm === 'src/app/api/subscribe/route.ts' ||
    norm === 'src/app/api/unsubscribe/route.ts' ||
    norm === 'src/app/api/proxy-image/route.ts' ||
    norm === 'src/app/api/ads/click/route.ts'
  ) {
    return { category: 'Universal', sub: 'App Core Boilerplate & Generic Endpoints' };
  }

  // 8. Generic Pipeline & Tooling Scripts
  if (
    norm === 'pipeline/cli.ts' ||
    norm === 'scripts/update-sw-version.js' ||
    norm === 'scripts/benchmark.ts' ||
    norm === 'scripts/round-icon.js' ||
    norm === 'scripts/theme_switch.js' ||
    norm === 'scripts/theme_rollback.js' ||
    norm === 'scripts/test_notification.js' ||
    norm === 'scripts/request-indexing.js'
  ) {
    return { category: 'Universal', sub: 'Developer & Build Automation Tools' };
  }

  // 9. Generic Types
  if (
    norm === 'src/types/api.ts' ||
    norm === 'src/types/global.d.ts' ||
    norm === 'src/types/modules.d.ts' ||
    norm === 'src/types/index.ts' ||
    norm === 'src/types/user.d.ts' ||
    norm === 'src/types/user.ts' ||
    norm === 'src/types/inquiry.ts'
  ) {
    return { category: 'Universal', sub: 'Core Data & API Types' };
  }

  // ALL OTHERS ARE REAL ESTATE / DONGTAN DOMAIN SPECIFIC
  return { category: 'Domain-Specific', sub: 'Real Estate & Dongtan Domain Logic' };
}

function classify3Tier(relPath, baseCat) {
  if (isTest(relPath)) return 'Test';
  if (isDataAsset(relPath)) return 'Data';

  if (baseCat.category === 'Universal') return 'Tier1_DirectReusable';

  const norm = relPath.replace(/\\/g, '/');

  // Tier 2: Adaptable Chart / UI / Filter / Facade Containers
  if (
    norm === 'src/components/macro/MacroTrendChart.tsx' ||
    norm === 'src/components/macro/MacroTimeframeToggle.tsx' ||
    norm === 'src/components/macro/AptDonutSection.tsx' ||
    norm === 'src/components/macro/AptMetricCards.tsx' ||
    norm === 'src/components/mbti/MBTIRadarChart.tsx' ||
    norm.startsWith('src/components/stats/') && !norm.includes('__tests__') ||
    norm.startsWith('src/components/apartment-modal/TransactionChartSection.tsx') ||
    norm.startsWith('src/components/consumer/compare/RadarChart.tsx') ||
    norm.startsWith('src/components/consumer/compare/PriceHistoryChart.tsx') ||
    norm.startsWith('src/components/consumer/compare/HeaderSearch.tsx') ||
    norm.startsWith('src/components/consumer/compare/InsightCard.tsx') ||
    norm.startsWith('src/components/consumer/compare/SpecTable.tsx') ||
    norm === 'src/components/ranking/RealtimeRankingBoard.tsx' ||
    norm === 'src/components/MindMap3D.tsx' ||
    norm === 'src/lib/DashboardFacade.ts' ||
    norm === 'src/hooks/useMacroData.ts' ||
    norm === 'src/hooks/useStaticData.ts' ||
    norm === 'src/hooks/useDashboardData.ts' ||
    norm === 'src/hooks/useDashboardMeta.ts' ||
    norm === 'src/lib/utils/macroChartTransform.ts' ||
    norm === 'src/lib/utils/transactionChartTransform.ts' ||
    norm === 'src/lib/utils/analyticsUtils.ts' ||
    norm === 'src/lib/analytics-service.ts' ||
    norm === 'src/lib/repositories/traffic.repository.ts' ||
    norm === 'src/lib/repositories/news.repository.ts' ||
    norm === 'src/lib/repositories/report.repository.ts' ||
    norm === 'src/lib/repositories/review.repository.ts' ||
    norm === 'src/lib/repositories/user.repository.ts' ||
    norm === 'src/lib/repositories/favorite.repository.ts' ||
    norm === 'src/lib/repositories/apartment.repository.ts' ||
    norm === 'src/lib/services/newsData.ts' ||
    norm === 'src/lib/services/dashboardData.ts' ||
    norm === 'src/lib/services/kpi.service.ts' ||
    norm === 'src/lib/services/reportService.ts' ||
    norm === 'src/lib/services/searchConsole.ts' ||
    norm === 'src/lib/services/staticDataService.ts' ||
    norm === 'src/lib/services/nickname.service.ts' ||
    norm === 'src/lib/validation/facade.schemas.ts' ||
    norm === 'src/types/dashboard.ts' ||
    norm === 'src/types/macro.ts' ||
    norm === 'src/types/stats.ts' ||
    norm === 'src/types/report.ts' ||
    norm === 'src/types/review.ts' ||
    norm === 'src/types/notice.ts'
  ) {
    return 'Tier2_AdaptableReusable';
  }

  return 'Tier3_DomainPure';
}

function runAudit() {
  console.log(`Auditing codebase at: ${FRONTEND_DIR}`);
  const targets = ['src', 'pipeline', 'scripts'];
  const fileRecords = [];

  targets.forEach(tgt => {
    const fullTgt = path.join(FRONTEND_DIR, tgt);
    if (fs.existsSync(fullTgt)) {
      const files = getAllFiles(fullTgt);
      files.forEach(f => {
        const rel = path.relative(FRONTEND_DIR, f);
        const lines = countLines(f);
        const size = getFileSize(f);
        const baseCat = classifyBaseCategory(rel);
        const tier = classify3Tier(rel, baseCat);

        fileRecords.push({
          rel,
          lines,
          size,
          category: baseCat.category,
          sub: baseCat.sub,
          tier
        });
      });
    }
  });

  console.log(`Total target files found: ${fileRecords.length}`);

  const tierStats = {
    Tier1_DirectReusable: { count: 0, lines: 0, files: [] },
    Tier2_AdaptableReusable: { count: 0, lines: 0, files: [] },
    Tier3_DomainPure: { count: 0, lines: 0, files: [] },
    Test: { count: 0, lines: 0, files: [] },
    Data: { count: 0, lines: 0, files: [] }
  };

  const sliceStats = {
    total: { count: fileRecords.length, lines: fileRecords.reduce((s, r) => s + r.lines, 0) },
    prodSource: { count: 0, lines: 0 },
    tests: { count: 0, lines: 0 },
    dataAssets: { count: 0, lines: 0 }
  };

  fileRecords.forEach(r => {
    tierStats[r.tier].count += 1;
    tierStats[r.tier].lines += r.lines;
    tierStats[r.tier].files.push({
      rel: r.rel,
      lines: r.lines,
      size: r.size,
      category: r.category,
      sub: r.sub
    });

    if (r.tier === 'Test') {
      sliceStats.tests.count += 1;
      sliceStats.tests.lines += r.lines;
    } else if (r.tier === 'Data') {
      sliceStats.dataAssets.count += 1;
      sliceStats.dataAssets.lines += r.lines;
    } else {
      sliceStats.prodSource.count += 1;
      sliceStats.prodSource.lines += r.lines;
    }
  });

  const prodTotalFiles = tierStats.Tier1_DirectReusable.count + tierStats.Tier2_AdaptableReusable.count + tierStats.Tier3_DomainPure.count;
  const prodTotalLines = tierStats.Tier1_DirectReusable.lines + tierStats.Tier2_AdaptableReusable.lines + tierStats.Tier3_DomainPure.lines;

  const combinedReusableFiles = tierStats.Tier1_DirectReusable.count + tierStats.Tier2_AdaptableReusable.count;
  const combinedReusableLines = tierStats.Tier1_DirectReusable.lines + tierStats.Tier2_AdaptableReusable.lines;

  const t1FilePct = ((tierStats.Tier1_DirectReusable.count / prodTotalFiles) * 100).toFixed(2);
  const t1LinePct = ((tierStats.Tier1_DirectReusable.lines / prodTotalLines) * 100).toFixed(2);
  const t2FilePct = ((tierStats.Tier2_AdaptableReusable.count / prodTotalFiles) * 100).toFixed(2);
  const t2LinePct = ((tierStats.Tier2_AdaptableReusable.lines / prodTotalLines) * 100).toFixed(2);
  const t3FilePct = ((tierStats.Tier3_DomainPure.count / prodTotalFiles) * 100).toFixed(2);
  const t3LinePct = ((tierStats.Tier3_DomainPure.lines / prodTotalLines) * 100).toFixed(2);

  const combinedFilePct = ((combinedReusableFiles / prodTotalFiles) * 100).toFixed(2);
  const combinedLinePct = ((combinedReusableLines / prodTotalLines) * 100).toFixed(2);

  const reusabilityMetrics = {
    auditTimestamp: new Date().toISOString(),
    frontendPath: FRONTEND_DIR,
    totalFilesScanned: fileRecords.length,
    totalLinesScanned: sliceStats.total.lines,
    slices: {
      productionSource: {
        fileCount: prodTotalFiles,
        lineCount: prodTotalLines,
        percentageOfTotalLines: ((prodTotalLines / sliceStats.total.lines) * 100).toFixed(2)
      },
      automatedTests: {
        fileCount: sliceStats.tests.count,
        lineCount: sliceStats.tests.lines,
        percentageOfTotalLines: ((sliceStats.tests.lines / sliceStats.total.lines) * 100).toFixed(2)
      },
      dataAssets: {
        fileCount: sliceStats.dataAssets.count,
        lineCount: sliceStats.dataAssets.lines,
        percentageOfTotalLines: ((sliceStats.dataAssets.lines / sliceStats.total.lines) * 100).toFixed(2)
      }
    },
    threeTierSummary: {
      tier1_directReusable: {
        files: tierStats.Tier1_DirectReusable.count,
        lines: tierStats.Tier1_DirectReusable.lines,
        filePercentage: t1FilePct,
        linePercentage: t1LinePct,
        description: "Zero-code modification direct reuse (Infra, PWA, AdSlot, Stats Worker, Core Layout)"
      },
      tier2_adaptableReusable: {
        files: tierStats.Tier2_AdaptableReusable.count,
        lines: tierStats.Tier2_AdaptableReusable.lines,
        filePercentage: t2FilePct,
        linePercentage: t2LinePct,
        description: "Schema-adaptable containers (Recharts TimeTrend, Radar, KPI Cards, Filters, Facades)"
      },
      combinedReusablePotential: {
        files: combinedReusableFiles,
        lines: combinedReusableLines,
        filePercentage: combinedFilePct,
        linePercentage: combinedLinePct
      },
      tier3_domainPure: {
        files: tierStats.Tier3_DomainPure.count,
        lines: tierStats.Tier3_DomainPure.lines,
        filePercentage: t3FilePct,
        linePercentage: t3LinePct,
        description: "Domain-pure Dongtan real estate logic subject to discard or rewrite"
      }
    }
  };

  const threeTierOutput = {
    tierStats: {
      Tier1_DirectReusable: {
        count: tierStats.Tier1_DirectReusable.count,
        lines: tierStats.Tier1_DirectReusable.lines,
        files: tierStats.Tier1_DirectReusable.files
      },
      Tier2_AdaptableReusable: {
        count: tierStats.Tier2_AdaptableReusable.count,
        lines: tierStats.Tier2_AdaptableReusable.lines,
        files: tierStats.Tier2_AdaptableReusable.files
      },
      Tier3_DomainPure: {
        count: tierStats.Tier3_DomainPure.count,
        lines: tierStats.Tier3_DomainPure.lines,
        files: tierStats.Tier3_DomainPure.files
      },
      Test: {
        count: tierStats.Test.count,
        lines: tierStats.Test.lines
      },
      Data: {
        count: tierStats.Data.count,
        lines: tierStats.Data.lines
      }
    },
    prodTotalFiles,
    prodTotalLines,
    combinedReusableFiles,
    combinedReusableLines,
    combinedFilePct,
    combinedLinePct
  };

  const reusabilityPath = path.join(ARTIFACTS_DIR, 'reusability_metrics.json');
  fs.writeFileSync(reusabilityPath, JSON.stringify(reusabilityMetrics, null, 2), 'utf8');
  console.log(`Generated: ${reusabilityPath}`);

  const threeTierPath = path.join(ARTIFACTS_DIR, 'three_tier_reusability.json');
  fs.writeFileSync(threeTierPath, JSON.stringify(threeTierOutput, null, 2), 'utf8');
  console.log(`Generated: ${threeTierPath}`);

  console.log('\n=== 3-Tier Production Code Reusability Matrix ===\n');
  console.log(`Total Production Source Code: ${prodTotalFiles} files, ${prodTotalLines.toLocaleString()} lines\n`);
  console.log(`1. Tier 1 (Direct Reusable, Zero-Code Mod): ${tierStats.Tier1_DirectReusable.count} files (${t1FilePct}%), ${tierStats.Tier1_DirectReusable.lines.toLocaleString()} lines (${t1LinePct}%)`);
  console.log(`2. Tier 2 (Adaptable UI/Chart/Facade):     ${tierStats.Tier2_AdaptableReusable.count} files (${t2FilePct}%), ${tierStats.Tier2_AdaptableReusable.lines.toLocaleString()} lines (${t2LinePct}%)`);
  console.log(`   --> Combined Reusable Potential (T1+T2): ${combinedReusableFiles} files (${combinedFilePct}%), ${combinedReusableLines.toLocaleString()} lines (${combinedLinePct}%)`);
  console.log(`3. Tier 3 (Domain-Pure Discard/Rewrite):     ${tierStats.Tier3_DomainPure.count} files (${t3FilePct}%), ${tierStats.Tier3_DomainPure.lines.toLocaleString()} lines (${t3LinePct}%)\n`);
}

runAudit();
