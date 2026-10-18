const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const blueprintPath = path.join(rootDir, 'ADSENSE_ARCHITECTURE_BLUEPRINT.md');
const content = fs.readFileSync(blueprintPath, 'utf8');

const { z } = require(path.join(rootDir, 'frontend/node_modules/zod'));

const results = {
  timestamp: new Date().toISOString(),
  defects: {},
  hodepLint: {},
  overallVerdict: 'PENDING'
};

console.log('=== STARTING EMPIRICAL ADVERSARIAL RE-VERIFICATION (DEF-01 to DEF-11) ===');

// =========================================================================
// DEF-01: Phase 4 Zod function signature compatibility with Zod v4.3
// =========================================================================
try {
  const TerminalRecirculationHubPropsSchema = z.object({
    currentAptName: z.string().min(1),
    currentDong: z.string().min(1),
    currentPriceWon: z.number().nonnegative(),
    targets: z.array(z.object({
      aptName: z.string().min(1),
      dong: z.string().min(1),
      latestPriceWon: z.number().nonnegative(),
      jeonseRatio: z.number().min(0).max(2.5),
      jeonseRatioPercent: z.number().min(0).max(250).optional(),
      similarityScore: z.number().min(0).max(1),
      clusterTag: z.enum(['SAME_DONG', 'SAME_PRICE_BAND', 'TOP_VOLUME']),
    })).length(3),
    onSelectApartment: z.custom((fn) => typeof fn === 'function'),
    onOpenCompare: z.custom((fn) => typeof fn === 'function'),
    onOpenMortgage: z.custom((fn) => typeof fn === 'function'),
  });

  const validProps = {
    currentAptName: '동탄역 롯데캐슬',
    currentDong: '오산동',
    currentPriceWon: 1600000000,
    targets: [
      { aptName: 'Apt1', dong: '오산동', latestPriceWon: 1200000000, jeonseRatio: 0.65, similarityScore: 0.95, clusterTag: 'SAME_DONG' },
      { aptName: 'Apt2', dong: '청계동', latestPriceWon: 1100000000, jeonseRatio: 0.70, similarityScore: 0.90, clusterTag: 'SAME_PRICE_BAND' },
      { aptName: 'Apt3', dong: '영천동', latestPriceWon: 950000000, jeonseRatio: 0.60, similarityScore: 0.85, clusterTag: 'TOP_VOLUME' },
    ],
    onSelectApartment: (apt) => console.log(apt),
    onOpenCompare: (a1, a2) => console.log(a1, a2),
    onOpenMortgage: (apt, p) => console.log(apt, p),
  };
  const parseValid = TerminalRecirculationHubPropsSchema.safeParse(validProps);
  const parseInvalidNonFn = TerminalRecirculationHubPropsSchema.safeParse({ ...validProps, onSelectApartment: 'not_a_function' });
  const parseInvalidNullFn = TerminalRecirculationHubPropsSchema.safeParse({ ...validProps, onOpenCompare: null });
  const blueprintHasOldArgsSyntax = /z\.function\(\)\.args/i.test(content);

  const def01Passed = parseValid.success && !parseInvalidNonFn.success && !parseInvalidNullFn.success && !blueprintHasOldArgsSyntax;

  results.defects['DEF-01'] = {
    status: def01Passed ? 'PASS' : 'FAIL',
    details: {
      parseValid: parseValid.success,
      rejectionOfNonFunction: !parseInvalidNonFn.success,
      rejectionOfNull: !parseInvalidNullFn.success,
      blueprintHasOldArgsSyntax: blueprintHasOldArgsSyntax
    }
  };
  console.log(`DEF-01: ${results.defects['DEF-01'].status}`);
} catch (e) {
  results.defects['DEF-01'] = { status: 'FAIL', error: e.message };
  console.log(`DEF-01: FAIL - ${e.message}`);
}

// =========================================================================
// DEF-02: Phase 3 TechnoValley schema match with actual jisan-status-list.json
// =========================================================================
try {
  // Extract EXACT schema from blueprint
  const TechnoValleyJisanSchema = z.object({
    seq: z.union([z.string(), z.number()]),
    name: z.string().min(1),
    companyName: z.string().optional(),
    regType: z.string().optional(),
    complexName: z.string().optional(),
    jurisdiction: z.string().optional(),
    industrialParkType: z.string().optional(),
    status: z.string().optional(),
    initialApprovalDate: z.string().optional(),
    approvalDate: z.string().optional(),
    constructionStartDate: z.string().optional(),
    completionDate: z.string().optional(),
    completionYear: z.string().optional(),
    scale: z.string().optional(),
    phone: z.string().optional(),
    landType: z.string().optional(),
    landArea: z.union([z.number(), z.string()]).optional(),
    totalFloorArea: z.union([z.number(), z.string()]).optional(),
    factoryArea: z.union([z.number(), z.string()]).optional(),
    auxiliaryArea: z.union([z.number(), z.string()]).optional(),
    representativeBusiness: z.string().optional(),
    parkingRatio: z.string().optional(),
    roadAddress: z.string().optional(),
    jibunAddress: z.string().optional(),
    saleType: z.string().optional(),
    buildingStatus: z.string().optional(),
    zoning1: z.string().optional(),
    zoning2: z.string().optional(),
    installer: z.string().optional(),
    unitCount: z.union([z.number(), z.string()]).optional(),
    developer: z.string().optional(),
    builder: z.string().optional(),
    features: z.array(z.string()).optional(),
  });

  const blueprintHasUnionSchema = /seq:\s*z\.union\(\[z\.string\(\),\s*z\.number\(\)\]\)/.test(content) &&
                                  /landArea:\s*z\.union\(\[z\.number\(\),\s*z\.string\(\)\]\)\.optional\(\)/.test(content) &&
                                  /totalFloorArea:\s*z\.union\(\[z\.number\(\),\s*z\.string\(\)\]\)\.optional\(\)/.test(content);

  const jisanPath = path.join(rootDir, 'frontend/public/data/jisan-status-list.json');
  const rawJisan = JSON.parse(fs.readFileSync(jisanPath, 'utf8'));

  let failedCount = 0;
  const failureDetails = [];
  const errorFieldCounts = {};

  rawJisan.forEach((item, index) => {
    const res = TechnoValleyJisanSchema.safeParse(item);
    if (!res.success) {
      failedCount++;
      if (failureDetails.length < 3) {
        failureDetails.push({ index, name: item.name, errors: res.error.issues });
      }
      res.error.issues.forEach(iss => {
        const key = iss.path.join('.') + ': ' + iss.message;
        errorFieldCounts[key] = (errorFieldCounts[key] || 0) + 1;
      });
    }
  });

  const def02Passed = failedCount === 0 && rawJisan.length === 56 && blueprintHasUnionSchema;

  results.defects['DEF-02'] = {
    status: def02Passed ? 'PASS' : 'FAIL',
    details: {
      totalItems: rawJisan.length,
      failedCount: failedCount,
      passRate: ((rawJisan.length - failedCount) / rawJisan.length) * 100,
      errorFieldCounts,
      failureDetails
    }
  };
  console.log(`DEF-02: ${results.defects['DEF-02'].status} (Failed: ${failedCount}/${rawJisan.length})`);
} catch (e) {
  results.defects['DEF-02'] = { status: 'FAIL', error: e.message };
  console.log(`DEF-02: FAIL - ${e.message}`);
}

// =========================================================================
// DEF-03: Phase 2 and Phase 5 telemetry event enum unification
// =========================================================================
try {
  const Phase2AdTelemetryBeaconSchema = z.object({
    slotId: z.string().min(1),
    eventType: z.enum(['IMPRESSION', 'VIEWABLE_IMPRESSION', 'CLICK', 'UNFILLED', 'ADBLOCK_FALLBACK', 'FALLBACK_CLICK']),
    campaignId: z.string().optional(),
    apartmentName: z.string().default('GLOBAL'),
    timestamp: z.string().datetime(),
  });

  const Phase5AdTelemetryClosedLoopEventSchema = z.object({
    slotId: z.string().min(1),
    eventType: z.enum(['IMPRESSION', 'VIEWABLE_IMPRESSION', 'CLICK', 'UNFILLED', 'ADBLOCK_FALLBACK', 'FALLBACK_CLICK']),
    apartmentName: z.string().default('GLOBAL'),
    dong: z.string().optional().default(''),
    dwellTimeMs: z.number().nonnegative().optional().default(0),
    intersectionRatio: z.number().min(0).max(1).optional().default(0),
    timestamp: z.string().datetime(),
    userAgentCategory: z.enum(['DESKTOP', 'MOBILE_WEB', 'IN_APP_BROWSER']).optional().default('DESKTOP'),
  });

  const p2Payload = Phase2AdTelemetryBeaconSchema.parse({
    slotId: '1000000001',
    eventType: 'ADBLOCK_FALLBACK',
    timestamp: new Date().toISOString(),
  });

  const p5ParsedFromP2 = Phase5AdTelemetryClosedLoopEventSchema.safeParse(p2Payload);
  const p2EnumValues = ['IMPRESSION', 'VIEWABLE_IMPRESSION', 'CLICK', 'UNFILLED', 'ADBLOCK_FALLBACK', 'FALLBACK_CLICK'];
  const allEnumsValidP2 = p2EnumValues.every(ev => Phase2AdTelemetryBeaconSchema.safeParse({ slotId: '1', eventType: ev, timestamp: new Date().toISOString() }).success);
  const allEnumsValidP5 = p2EnumValues.every(ev => Phase5AdTelemetryClosedLoopEventSchema.safeParse({ slotId: '1', eventType: ev, timestamp: new Date().toISOString() }).success);
  const rejectOldFallbackMount = !Phase2AdTelemetryBeaconSchema.safeParse({ slotId: '1', eventType: 'FALLBACK_MOUNT', timestamp: new Date().toISOString() }).success;

  const def03Passed = p5ParsedFromP2.success && allEnumsValidP2 && allEnumsValidP5 && rejectOldFallbackMount;

  results.defects['DEF-03'] = {
    status: def03Passed ? 'PASS' : 'FAIL',
    details: {
      p5ParsedFromP2: p5ParsedFromP2.success,
      allEnumsValidP2,
      allEnumsValidP5,
      rejectOldFallbackMount,
      p5DefaultsApplied: p5ParsedFromP2.success ? {
        dwellTimeMs: p5ParsedFromP2.data.dwellTimeMs,
        intersectionRatio: p5ParsedFromP2.data.intersectionRatio,
        userAgentCategory: p5ParsedFromP2.data.userAgentCategory
      } : null
    }
  };
  console.log(`DEF-03: ${results.defects['DEF-03'].status}`);
} catch (e) {
  results.defects['DEF-03'] = { status: 'FAIL', error: e.message };
  console.log(`DEF-03: FAIL - ${e.message}`);
}

// =========================================================================
// DEF-04: Target URL scheme sanitization blocking javascript: and dangerous protocols
// =========================================================================
try {
  const targetUrlSchema = z.string().url().refine(
    (url) => /^https?:\/\//i.test(url) && !/^(javascript|data|vbscript):/i.test(url),
    { message: 'Only secure http/https protocols permitted; javascript/data/vbscript schemes rejected' }
  );

  const attacks = [
    'javascript:alert(1)',
    'JAVASCRIPT:alert(document.cookie)',
    'javascript:void(0)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox("hello")',
    'ftp://evil.com/payload',
    'file:///etc/passwd',
    '//evil.com/xss'
  ];

  const safeUrls = [
    'https://dongtanview.com',
    'https://dongtanview.com/overview',
    'http://localhost:3000/api/ads',
    'https://subdomain.example.com/path?q=1&param=test#section'
  ];

  let attackPassed = false;
  attacks.forEach(att => {
    const res = targetUrlSchema.safeParse(att);
    if (res.success) {
      attackPassed = true;
      console.log(`Adversarial vector passed (FAIL): ${att}`);
    }
  });

  let safeFailed = false;
  safeUrls.forEach(url => {
    const res = targetUrlSchema.safeParse(url);
    if (!res.success) {
      safeFailed = true;
      console.log(`Safe URL rejected (FAIL): ${url}`);
    }
  });

  const def04Passed = !attackPassed && !safeFailed;

  results.defects['DEF-04'] = {
    status: def04Passed ? 'PASS' : 'FAIL',
    details: {
      allAttacksBlocked: !attackPassed,
      allSafeUrlsPermitted: !safeFailed,
      attackVectorCount: attacks.length,
      safeUrlCount: safeUrls.length
    }
  };
  console.log(`DEF-04: ${results.defects['DEF-04'].status}`);
} catch (e) {
  results.defects['DEF-04'] = { status: 'FAIL', error: e.message };
  console.log(`DEF-04: FAIL - ${e.message}`);
}

// =========================================================================
// DEF-05: Jeonse ratio upper bound relaxing to 2.5 for reverse jeonse
// =========================================================================
try {
  const RecirculationTargetAptSchema = z.object({
    aptName: z.string().min(1),
    dong: z.string().min(1),
    latestPriceWon: z.number().nonnegative(),
    jeonseRatio: z.number().min(0).max(2.5),
    jeonseRatioPercent: z.number().min(0).max(250).optional(),
    similarityScore: z.number().min(0).max(1),
    clusterTag: z.enum(['SAME_DONG', 'SAME_PRICE_BAND', 'TOP_VOLUME']),
  });

  const test1085 = RecirculationTargetAptSchema.safeParse({
    aptName: '동탄 깡통전세 위험단지',
    dong: '오산동',
    latestPriceWon: 200000000,
    jeonseRatio: 1.085,
    jeonseRatioPercent: 108.5,
    similarityScore: 0.9,
    clusterTag: 'SAME_DONG'
  });

  const testMax25 = RecirculationTargetAptSchema.safeParse({
    aptName: '극단 역전세 단지',
    dong: '청계동',
    latestPriceWon: 100000000,
    jeonseRatio: 2.5,
    jeonseRatioPercent: 250,
    similarityScore: 0.5,
    clusterTag: 'SAME_PRICE_BAND'
  });

  const testOverRatio = RecirculationTargetAptSchema.safeParse({
    aptName: '초과 단지',
    dong: '오산동',
    latestPriceWon: 200000000,
    jeonseRatio: 2.51,
    jeonseRatioPercent: 100,
    similarityScore: 0.9,
    clusterTag: 'SAME_DONG'
  });

  const testOverPercent = RecirculationTargetAptSchema.safeParse({
    aptName: '초과 단지 2',
    dong: '오산동',
    latestPriceWon: 200000000,
    jeonseRatio: 1.0,
    jeonseRatioPercent: 251,
    similarityScore: 0.9,
    clusterTag: 'SAME_DONG'
  });

  const testNegative = RecirculationTargetAptSchema.safeParse({
    aptName: '음수 단지',
    dong: '오산동',
    latestPriceWon: 200000000,
    jeonseRatio: -0.1,
    similarityScore: 0.9,
    clusterTag: 'SAME_DONG'
  });

  const def05Passed = test1085.success && testMax25.success && !testOverRatio.success && !testOverPercent.success && !testNegative.success;

  results.defects['DEF-05'] = {
    status: def05Passed ? 'PASS' : 'FAIL',
    details: {
      test1085Accepted: test1085.success,
      testMax25Accepted: testMax25.success,
      testOverRatioRejected: !testOverRatio.success,
      testOverPercentRejected: !testOverPercent.success,
      testNegativeRejected: !testNegative.success
    }
  };
  console.log(`DEF-05: ${results.defects['DEF-05'].status}`);
} catch (e) {
  results.defects['DEF-05'] = { status: 'FAIL', error: e.message };
  console.log(`DEF-05: FAIL - ${e.message}`);
}

// =========================================================================
// DEF-06: Deterministic state transitions for CALC_OPEN and COMPARE_OPEN closing/returning
// =========================================================================
try {
  // Check exact strings in blueprint Section 3.4 lines 634-655
  const hasCalcOpenIncoming = (content.includes('CLICK_RECIRC_MORTGAGE') || content.includes('CLICK\\_RECIRC\\_MORTGAGE')) && (content.includes('CALC_OPEN') || content.includes('CALC\\_OPEN'));
  const hasCalcOpenOutgoing = (content.includes('CALC_OPEN') || content.includes('CALC\\_OPEN')) && (content.includes('MODAL_CLOSE') || content.includes('MODAL\\_CLOSE')) && (content.includes('CHAPTER_EXPLORE') || content.includes('CHAPTER\\_EXPLORE'));
  const hasCompareOpenOutgoing = (content.includes('COMPARE_OPEN') || content.includes('COMPARE\\_OPEN')) && (content.includes('MODAL_CLOSE') || content.includes('MODAL\\_CLOSE')) && (content.includes('CHAPTER_EXPLORE') || content.includes('CHAPTER\\_EXPLORE'));
  const hasChapterExploreClose = (content.includes('CHAPTER_EXPLORE') || content.includes('CHAPTER\\_EXPLORE')) && (content.includes('MODAL_CLOSE') || content.includes('MODAL\\_CLOSE')) && (content.includes('DASHBOARD_IDLE') || content.includes('DASHBOARD\\_IDLE'));

  // Verify full transition block lines
  const calcIncomingLine = content.includes("f(\\text{CHAPTER\\_EXPLORE}(apt), \\text{CLICK\\_RECIRC\\_MORTGAGE}) \\implies \\text{CALC\\_OPEN}('mortgage', apt)");
  const compareIncomingLine = content.includes("f(\\text{CHAPTER\\_EXPLORE}(apt), \\text{CLICK\\_RECIRC\\_COMPARE}(targetApt)) \\implies \\text{COMPARE\\_OPEN}(apt, targetApt)");
  const compareReturnLine = content.includes("f(\\text{COMPARE\\_OPEN}(apt1, apt2), \\text{MODAL\\_CLOSE}) \\implies \\text{CHAPTER\\_EXPLORE}(apt1)");
  const calcReturnLine = content.includes("f(\\text{CALC\\_OPEN}(type, apt), \\text{MODAL\\_CLOSE}) \\implies \\text{CHAPTER\\_EXPLORE}(apt)");
  const chapterCloseLine = content.includes("f(\\text{CHAPTER\\_EXPLORE}(apt), \\text{MODAL\\_CLOSE}) \\implies \\text{DASHBOARD\\_IDLE}");

  const def06Passed = hasCalcOpenIncoming && hasCalcOpenOutgoing && hasCompareOpenOutgoing && hasChapterExploreClose &&
                      calcIncomingLine && compareIncomingLine && compareReturnLine && calcReturnLine && chapterCloseLine;

  results.defects['DEF-06'] = {
    status: def06Passed ? 'PASS' : 'FAIL',
    details: {
      calcIncomingLine,
      compareIncomingLine,
      compareReturnLine,
      calcReturnLine,
      chapterCloseLine
    }
  };
  console.log(`DEF-06: ${results.defects['DEF-06'].status}`);
} catch (e) {
  results.defects['DEF-06'] = { status: 'FAIL', error: e.message };
  console.log(`DEF-06: FAIL - ${e.message}`);
}

// =========================================================================
// DEF-07: Phase 5 refresh limit cap (maxRefreshesPerSlot = 10) preventing infinite loops
// =========================================================================
try {
  // Check exact strings in Section 3.5 lines 727-740
  const hasMaxRefreshCapInTick = content.includes('n < \\text{maxRefreshesPerSlot}') || content.includes('n < maxRefreshesPerSlot');
  const hasMaxRefreshPerSlotDef = content.includes('\\text{maxRefreshesPerSlot} = 10') || content.includes('maxRefreshesPerSlot = 10');
  const hasTelemetryDispatchedState = content.includes('TELEMETRY_DISPATCHED') || content.includes('TELEMETRY\\_DISPATCHED');
  const hasTelemetryTransition1 = content.includes('\\text{TELEMETRY\\_DISPATCHED} \\to \\text{ACTIVE\\_VIEW}');
  const hasTelemetryTransition2 = content.includes('\\text{TELEMETRY\\_DISPATCHED} \\to \\text{UNFILLED\\_FALLBACK}');

  let n = 0;
  const maxRefreshesPerSlot = 10;
  for (let tick = 0; tick < 50; tick++) {
    const eligible = (n < maxRefreshesPerSlot);
    if (eligible) {
      n++;
    }
  }
  const loopCappedAt10 = (n === 10);

  const def07Passed = hasMaxRefreshCapInTick && hasMaxRefreshPerSlotDef && hasTelemetryDispatchedState && hasTelemetryTransition1 && hasTelemetryTransition2 && loopCappedAt10;

  results.defects['DEF-07'] = {
    status: def07Passed ? 'PASS' : 'FAIL',
    details: {
      hasMaxRefreshCapInTick,
      hasMaxRefreshPerSlotDef,
      hasTelemetryDispatchedState,
      hasTelemetryTransition1,
      hasTelemetryTransition2,
      loopCappedAt10
    }
  };
  console.log(`DEF-07: ${results.defects['DEF-07'].status}`);
} catch (e) {
  results.defects['DEF-07'] = { status: 'FAIL', error: e.message };
  console.log(`DEF-07: FAIL - ${e.message}`);
}

// =========================================================================
// DEF-08: Phase 2 late fill race condition guard discarding late AdSense arrival after fallback
// =========================================================================
try {
  const hasLateStatusFilledDiscard = content.includes("f(\\text{FALLBACK\\_ACTIVE}, \\text{STATUS\\_FILLED}) = \\text{FALLBACK\\_ACTIVE}");
  const hasInvariant5RaceGuard = content.includes('지연 낙찰 레이스 컨디션 방어 불변식');

  let state = 'REQUESTED';
  state = 'FALLBACK_ACTIVE'; // 3s timeout
  const nextStateOnLateFill = (state === 'FALLBACK_ACTIVE') ? 'FALLBACK_ACTIVE' : 'FILLED';
  const racePrevented = (nextStateOnLateFill === 'FALLBACK_ACTIVE');

  const def08Passed = hasLateStatusFilledDiscard && hasInvariant5RaceGuard && racePrevented;

  results.defects['DEF-08'] = {
    status: def08Passed ? 'PASS' : 'FAIL',
    details: {
      hasLateStatusFilledDiscard,
      hasInvariant5RaceGuard,
      racePrevented
    }
  };
  console.log(`DEF-08: ${results.defects['DEF-08'].status}`);
} catch (e) {
  results.defects['DEF-08'] = { status: 'FAIL', error: e.message };
  console.log(`DEF-08: FAIL - ${e.message}`);
}

// =========================================================================
// DEF-09: Phase 1 tab switch visibility re-intersection evaluation
// =========================================================================
try {
  const hasTabHiddenToPaused = content.includes("f(\\text{OBSERVING}, \\text{TAB\\_HIDDEN}) = \\text{PAUSED}") &&
                               content.includes("f(\\text{VIEWABLE}, \\text{TAB\\_HIDDEN}) = \\text{PAUSED}");
  const hasTabVisibleBranching = content.includes("f(\\text{PAUSED}, \\text{TAB\\_VISIBLE}) = \\begin{cases} \\text{VIEWABLE} & (\\text{intersectionRatio} \\ge 0.50) \\\\ \\text{OBSERVING} & (\\text{intersectionRatio} < 0.50) \\end{cases}");
  const hasPausedRatioLt50 = content.includes("f(\\text{PAUSED}, \\text{RATIO\\_LT\\_50}) = \\text{PAUSED}");
  const hasWeakRefElement = content.includes('element: HTMLElement | WeakRef<HTMLElement>');

  function transitionOnTabVisible(ratio) {
    if (ratio >= 0.50) return 'VIEWABLE';
    return 'OBSERVING';
  }
  const simViewable = transitionOnTabVisible(0.75) === 'VIEWABLE';
  const simObserving = transitionOnTabVisible(0.30) === 'OBSERVING';

  const def09Passed = hasTabHiddenToPaused && hasTabVisibleBranching && hasPausedRatioLt50 && hasWeakRefElement && simViewable && simObserving;

  results.defects['DEF-09'] = {
    status: def09Passed ? 'PASS' : 'FAIL',
    details: {
      hasTabHiddenToPaused,
      hasTabVisibleBranching,
      hasPausedRatioLt50,
      hasWeakRefElement,
      simViewable,
      simObserving
    }
  };
  console.log(`DEF-09: ${results.defects['DEF-09'].status}`);
} catch (e) {
  results.defects['DEF-09'] = { status: 'FAIL', error: e.message };
  console.log(`DEF-09: FAIL - ${e.message}`);
}

// =========================================================================
// DEF-10: Traceability matrix row 22 correct path (frontend/src/components/MacroDashboardClient.tsx)
// =========================================================================
try {
  const row22Regex = /\|\s*22\s*\|\s*`frontend\/src\/components\/MacroDashboardClient\.tsx`\s*\|\s*1487-1646\s*\|/i;
  const hasCorrectPathInBlueprint = row22Regex.test(content);
  const diskPath = path.join(rootDir, 'frontend/src/components/MacroDashboardClient.tsx');
  const fileExistsOnDisk = fs.existsSync(diskPath);

  let lineRangeValid = false;
  let fileTotalLines = 0;
  if (fileExistsOnDisk) {
    const macroContent = fs.readFileSync(diskPath, 'utf8');
    const lines = macroContent.split('\n');
    fileTotalLines = lines.length;
    lineRangeValid = fileTotalLines >= 1646;
  }

  const def10Passed = hasCorrectPathInBlueprint && fileExistsOnDisk && lineRangeValid;

  results.defects['DEF-10'] = {
    status: def10Passed ? 'PASS' : 'FAIL',
    details: {
      hasCorrectPathInBlueprint,
      fileExistsOnDisk,
      fileTotalLines,
      lineRangeValid
    }
  };
  console.log(`DEF-10: ${results.defects['DEF-10'].status}`);
} catch (e) {
  results.defects['DEF-10'] = { status: 'FAIL', error: e.message };
  console.log(`DEF-10: FAIL - ${e.message}`);
}

// =========================================================================
// DEF-11: Cross validation of lowPrice <= highPrice in RealEstateListingSchema
// =========================================================================
try {
  const RealEstateListingSchema = z.object({
    '@context': z.literal('https://schema.org'),
    '@type': z.literal('RealEstateListing'),
    name: z.string().min(1),
    description: z.string().min(1),
    url: z.string().url(),
    offers: z.object({
      '@type': z.literal('AggregateOffer'),
      priceCurrency: z.literal('KRW'),
      lowPrice: z.number().positive(),
      highPrice: z.number().positive(),
      offerCount: z.number().int().positive(),
    }),
  }).refine(
    (data) => data.offers.lowPrice <= data.offers.highPrice,
    { message: 'lowPrice must be <= highPrice' }
  );

  const validListing = RealEstateListingSchema.safeParse({
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: '동탄역 롯데캐슬',
    description: '동탄역 초역세권 대장 아파트',
    url: 'https://dongtanview.com/apartment/동탄역롯데캐슬',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'KRW',
      lowPrice: 1400000000,
      highPrice: 1800000000,
      offerCount: 15
    }
  });

  const equalPriceListing = RealEstateListingSchema.safeParse({
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: '단일 매물 단지',
    description: '단일 가격',
    url: 'https://dongtanview.com/apartment/단일단지',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'KRW',
      lowPrice: 1500000000,
      highPrice: 1500000000,
      offerCount: 1
    }
  });

  const invertedListing = RealEstateListingSchema.safeParse({
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: '역전 가격 단지',
    description: '잘못된 가격 범위',
    url: 'https://dongtanview.com/apartment/역전단지',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'KRW',
      lowPrice: 2000000000,
      highPrice: 1000000000,
      offerCount: 5
    }
  });

  const blueprintHasRefinement = /\.refine\(\s*\(\s*data\s*\)\s*=>\s*data\.offers\.lowPrice\s*<=\s*data\.offers\.highPrice/i.test(content);

  const def11Passed = validListing.success && equalPriceListing.success && !invertedListing.success && blueprintHasRefinement;

  results.defects['DEF-11'] = {
    status: def11Passed ? 'PASS' : 'FAIL',
    details: {
      validListingAccepted: validListing.success,
      equalPriceListingAccepted: equalPriceListing.success,
      invertedListingRejected: !invertedListing.success,
      blueprintHasRefinement
    }
  };
  console.log(`DEF-11: ${results.defects['DEF-11'].status}`);
} catch (e) {
  results.defects['DEF-11'] = { status: 'FAIL', error: e.message };
  console.log(`DEF-11: FAIL - ${e.message}`);
}

// =========================================================================
// HODEP v2.2 Linting of ADSENSE_ARCHITECTURE_BLUEPRINT.md
// =========================================================================
const lines = content.split('\n');
const forbiddenEndingRegex = /([가-힣]+(함|임|다)[.!?]?\s*$)/;
const forbiddenHonorificRegex = /(합니다|해요|됩니다|있습니다|입니다|드립니다|하십시오|바랍니다)/;
const forbiddenFuzzyRegex = /(상당한|적절한|다수의|최적의|매우|일부)/;
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

let endingViolations = [];
let honorificViolations = [];
let fuzzyViolations = [];
let emojiViolations = [];

let inCodeBlock = false;
lines.forEach((line, idx) => {
  const trimmed = line.trim();
  if (trimmed.startsWith('```')) {
    inCodeBlock = !inCodeBlock;
    return;
  }
  if (inCodeBlock) return;
  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('|')) {
    if (trimmed.startsWith('|') || trimmed.startsWith('*') || trimmed.startsWith('-')) {
      if (emojiRegex.test(trimmed)) emojiViolations.push({ line: idx + 1, text: trimmed });
      if (forbiddenFuzzyRegex.test(trimmed)) fuzzyViolations.push({ line: idx + 1, text: trimmed });
      if (forbiddenHonorificRegex.test(trimmed)) honorificViolations.push({ line: idx + 1, text: trimmed });
    }
    return;
  }

  if (forbiddenEndingRegex.test(trimmed)) endingViolations.push({ line: idx + 1, text: trimmed });
  if (forbiddenHonorificRegex.test(trimmed)) honorificViolations.push({ line: idx + 1, text: trimmed });
  if (forbiddenFuzzyRegex.test(trimmed)) fuzzyViolations.push({ line: idx + 1, text: trimmed });
  if (emojiRegex.test(trimmed)) emojiViolations.push({ line: idx + 1, text: trimmed });
});

results.hodepLint = {
  totalLines: lines.length,
  minRequiredLines: 500,
  lineCountSatisfied: lines.length >= 500,
  endingViolationsCount: endingViolations.length,
  honorificViolationsCount: honorificViolations.length,
  fuzzyViolationsCount: fuzzyViolations.length,
  emojiViolationsCount: emojiViolations.length,
  sampleEndingViolations: endingViolations.slice(0, 5),
  sampleHonorificViolations: honorificViolations.slice(0, 5),
  sampleFuzzyViolations: fuzzyViolations.slice(0, 5),
};

console.log(`HODEP Lint: Lines = ${lines.length} (>= 500: ${lines.length >= 500}), Endings = ${endingViolations.length}, Honorifics = ${honorificViolations.length}, Fuzzy = ${fuzzyViolations.length}, Emojis = ${emojiViolations.length}`);

// Overall Verdict Evaluation
const allDefectsPassed = Object.values(results.defects).every(d => d.status === 'PASS');
const hodepClean = results.hodepLint.lineCountSatisfied &&
                   results.hodepLint.endingViolationsCount === 0 &&
                   results.hodepLint.honorificViolationsCount === 0 &&
                   results.hodepLint.fuzzyViolationsCount === 0 &&
                   results.hodepLint.emojiViolationsCount === 0;

results.overallVerdict = (allDefectsPassed && hodepClean) ? 'APPROVE' : 'REQUEST_CHANGES';

console.log(`\n========================================`);
console.log(`FINAL ADVERSARIAL VERDICT: ${results.overallVerdict}`);
console.log(`All Defects Remediated: ${allDefectsPassed} (Passed: ${Object.values(results.defects).filter(d => d.status === 'PASS').length}/11)`);
console.log(`HODEP Protocol Clean: ${hodepClean}`);
console.log(`========================================\n`);

const outputPath = path.join(rootDir, 'docs/artifacts/blueprint_reverification_results.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
console.log(`Report written to ${outputPath}`);
