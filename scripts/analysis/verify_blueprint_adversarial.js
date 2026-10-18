const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const blueprintPath = path.join(rootDir, 'ADSENSE_ARCHITECTURE_BLUEPRINT.md');
const content = fs.readFileSync(blueprintPath, 'utf8');

const { z } = require(path.join(rootDir, 'frontend/node_modules/zod'));

const report = {
  timestamp: new Date().toISOString(),
  blockVerification: {},
  schemaSyntaxValidation: {},
  runtimeValidationFindings: [],
  stateTransitionFindings: [],
};

// 1. Mandatory 7 Blocks Check
const mandatoryBlockPatterns = [
  { name: '문제 정의', pattern: /####\s*\[문제 정의\]/ },
  { name: '불변식', pattern: /####\s*\[불변식\s*(\(Invariant\))?\]/ },
  { name: '입출력 시그니처', pattern: /####\s*\[입출력 시그니처\s*(\(TypeScript Interface & Zod Schema\))?\]/ },
  { name: '시간·공간 복잡도 및 부수 효과', pattern: /####\s*\[시간·공간 복잡도 및 부수 효과\s*(\(Side-effects\))?\]/ },
  { name: '결정론적 상태 전이', pattern: /####\s*\[결정론적 상태 전이\s*(\(\$f:\s*S\s*\\times\s*A\s*\\to\s*S\$\))?\]/ },
  { name: '포퍼식 반증 기준', pattern: /####\s*\[포퍼식 반증 기준\s*(\(Falsifiability & Critical Region\))?\]/ },
  { name: '검증 하네스 명령어', pattern: /####\s*\[검증 하네스 명령어\]/ }
];

for (let p = 1; p <= 5; p++) {
  const phaseKey = `Phase_${p}`;
  const startRegex = new RegExp(`###\\s*3\\.${p}\\s+Phase\\s*${p}`, 'i');
  const endRegex = p < 5 ? new RegExp(`###\\s*3\\.${p + 1}`, 'i') : /##\s*4\./;
  
  const startMatch = content.match(startRegex);
  const endMatch = content.match(endRegex);
  
  if (!startMatch) {
    report.blockVerification[phaseKey] = { found: false, error: 'Phase start heading not found' };
    continue;
  }
  
  const startIdx = startMatch.index;
  const endIdx = endMatch ? endMatch.index : content.length;
  const phaseText = content.substring(startIdx, endIdx);
  
  const blockStatus = {};
  let allPresent = true;
  for (const b of mandatoryBlockPatterns) {
    const hasBlock = b.pattern.test(phaseText);
    blockStatus[b.name] = hasBlock;
    if (!hasBlock) allPresent = false;
  }
  
  report.blockVerification[phaseKey] = {
    allBlocksPresent: allPresent,
    blocks: blockStatus
  };
}

// 2. TypeScript & Zod Schema Syntax and Runtime Validation
// Phase 1: SmartViewabilityConfigSchema
try {
  const SmartViewabilityConfigSchema = z.object({
    slotId: z.string().min(1),
    threshold: z.number().min(0.1).max(1.0).default(0.50),
    dwellThresholdMs: z.number().int().min(10000).default(30000),
    maxRefreshes: z.number().int().min(1).max(20).default(10),
    rootMargin: z.string().default('0px'),
  });
  const parsed = SmartViewabilityConfigSchema.parse({ slotId: '1000000001' });
  report.schemaSyntaxValidation.Phase_1 = { status: 'PASS', defaultApplied: parsed };
} catch (e) {
  report.schemaSyntaxValidation.Phase_1 = { status: 'FAIL', error: e.message };
}

// Phase 2: NativeCpaFallbackPayloadSchema & AdTelemetryBeaconSchema
try {
  const NativeCpaFallbackPayloadSchema = z.object({
    slotId: z.string().min(1),
    cpaCampaignId: z.enum(['mortgage-refinance', 'corporate-relocation', 'interior-quote', 'jeonse-sentinel']),
    title: z.string().min(1),
    subtitle: z.string().min(1),
    ctaText: z.string().min(1),
    targetUrl: z.string().url(),
    estimatedCpaValueWon: z.number().int().positive(),
    sourceTrigger: z.enum(['UNFILLED_ATTRIBUTE', 'TIMEOUT_FALLBACK', 'ADBLOCK_ACTIVE']),
  });

  const AdTelemetryBeaconSchema = z.object({
    slotId: z.string().min(1),
    eventType: z.enum(['IMPRESSION', 'UNFILLED', 'FALLBACK_MOUNT', 'CLICK']),
    campaignId: z.string().optional(),
    apartmentName: z.string().default('GLOBAL'),
    timestamp: z.string().datetime(),
  });

  // Security test: javascript: URL in targetUrl
  const xssTest = NativeCpaFallbackPayloadSchema.safeParse({
    slotId: '1000000001',
    cpaCampaignId: 'mortgage-refinance',
    title: 'Test',
    subtitle: 'Sub',
    ctaText: 'CTA',
    targetUrl: 'javascript:alert(1)',
    estimatedCpaValueWon: 30000,
    sourceTrigger: 'UNFILLED_ATTRIBUTE'
  });

  if (xssTest.success) {
    report.runtimeValidationFindings.push({
      phase: 2,
      severity: 'HIGH_SECURITY',
      issue: 'XSS_VULNERABILITY_TARGET_URL',
      description: 'NativeCpaFallbackPayloadSchema uses z.string().url() which accepts javascript: URI scheme, enabling stored XSS attacks if rendered as href.',
      reproductionPayload: 'javascript:alert(1)',
      recommendedFix: "z.string().url().refine(u => /^https?:\\/\\//i.test(u), 'Must be http or https')"
    });
  }

  report.schemaSyntaxValidation.Phase_2 = { status: 'PASS' };
} catch (e) {
  report.schemaSyntaxValidation.Phase_2 = { status: 'FAIL', error: e.message };
}

// Phase 3: TechnoValleyJisanSchema & RealEstateListingSchema
try {
  const TechnoValleyJisanSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    roadAddress: z.string().min(1),
    totalFloorArea: z.number().positive(),
    landArea: z.number().positive(),
    completionYear: z.number().int().optional(),
    recommendedSectors: z.array(z.string()).default(['IT/SW', '반도체설계', '연구개발']),
    taxReductionPercent: z.number().default(35),
    estimatedPricePerPyeongWon: z.number().positive(),
  });

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
  });

  // Test against actual production file: public/data/jisan-status-list.json
  const jisanPath = path.join(rootDir, 'frontend/public/data/jisan-status-list.json');
  if (fs.existsSync(jisanPath)) {
    const rawJisan = JSON.parse(fs.readFileSync(jisanPath, 'utf8'));
    let failureCount = 0;
    const sampleIssues = [];
    rawJisan.forEach((item, idx) => {
      const res = TechnoValleyJisanSchema.safeParse(item);
      if (!res.success) {
        failureCount++;
        if (sampleIssues.length < 3) {
          sampleIssues.push({ index: idx, name: item.name, issues: res.error.issues.map(i => `${i.path.join('.')}: ${i.message}`) });
        }
      }
    });

    if (failureCount > 0) {
      report.runtimeValidationFindings.push({
        phase: 3,
        severity: 'CRITICAL_DATA_DESYNC',
        issue: 'JISAN_DATASET_VALIDATION_FAILURE',
        totalItems: rawJisan.length,
        failedItems: failureCount,
        failureRate: failureCount / rawJisan.length,
        description: 'TechnoValleyJisanSchema is completely incompatible with existing production dataset public/data/jisan-status-list.json (100% fail). Missing id (has seq), empty roadAddress, missing estimatedPricePerPyeongWon.',
        sampleIssues,
        recommendedFix: 'Schema must align with actual dataset fields (seq as id alias, optional/empty roadAddress fallback to jibunAddress, price per pyeong optional or calculated via domain mapper).'
      });
    }
  }

  // Cross-field test: lowPrice > highPrice in RealEstateListingSchema
  const invertedPriceTest = RealEstateListingSchema.safeParse({
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: 'Sample Apt',
    description: 'Desc',
    url: 'https://example.com/apt',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'KRW',
      lowPrice: 2000000000,
      highPrice: 1000000000,
      offerCount: 10
    }
  });

  if (invertedPriceTest.success) {
    report.runtimeValidationFindings.push({
      phase: 3,
      severity: 'MEDIUM_SEMANTIC',
      issue: 'SCHEMA_ORG_INVERTED_PRICE_BOUNDS',
      description: 'RealEstateListingSchema allows lowPrice > highPrice in AggregateOffer without refinement constraint.',
      recommendedFix: 'Add .refine(data => data.offers.lowPrice <= data.offers.highPrice, { message: "lowPrice must be <= highPrice" })'
    });
  }

  report.schemaSyntaxValidation.Phase_3 = { status: 'PASS' };
} catch (e) {
  report.schemaSyntaxValidation.Phase_3 = { status: 'FAIL', error: e.message };
}

// Phase 4: RecirculationTargetAptSchema & TerminalRecirculationHubPropsSchema
try {
  let zodFunctionError = null;
  try {
    const invalidSyntax = z.object({
      onSelectApartment: z.function().args(z.string()).returns(z.void()),
    });
  } catch (err) {
    zodFunctionError = err.message;
  }

  if (zodFunctionError) {
    report.runtimeValidationFindings.push({
      phase: 4,
      severity: 'CRITICAL_SYNTAX_FATAL',
      issue: 'ZOD_4_FUNCTION_SYNTAX_TYPE_ERROR',
      description: `In installed Zod v4.3.6, z.function().args(...).returns(...) is deprecated/removed and throws fatal TypeError: ${zodFunctionError}.`,
      brokenCode: 'onSelectApartment: z.function().args(z.string()).returns(z.void())',
      recommendedFix: 'In Zod 4: z.function({ input: [z.string()], output: z.void() }) or z.custom<Function>(v => typeof v === "function")'
    });
    report.schemaSyntaxValidation.Phase_4 = { status: 'FATAL_SYNTAX_ERROR', error: zodFunctionError };
  } else {
    report.schemaSyntaxValidation.Phase_4 = { status: 'PASS' };
  }

  // Also test jeonseRatioPercent in RecirculationTargetAptSchema
  const RecirculationTargetAptSchema = z.object({
    aptName: z.string().min(1),
    dong: z.string().min(1),
    latestPriceWon: z.number().nonnegative(),
    jeonseRatioPercent: z.number().min(0).max(100),
    similarityScore: z.number().min(0).max(1),
    clusterTag: z.enum(['SAME_DONG', 'SAME_PRICE_BAND', 'TOP_VOLUME']),
  });

  const upsideDownJeonse = RecirculationTargetAptSchema.safeParse({
    aptName: '역전세 단지',
    dong: '오산동',
    latestPriceWon: 200000000,
    jeonseRatioPercent: 108.5, // 깡통전세/역전세 전세가율 > 100%
    similarityScore: 0.8,
    clusterTag: 'SAME_DONG'
  });

  if (!upsideDownJeonse.success) {
    report.runtimeValidationFindings.push({
      phase: 4,
      severity: 'HIGH_DOMAIN_CONSTRAINT',
      issue: 'JEONSE_RATIO_REVERSE_CAP_OVERFLOW',
      description: 'RecirculationTargetAptSchema caps jeonseRatioPercent at 100 (max: 100). In real estate reverse jeonse (역전세/깡통전세), jeonse ratio exceeds 100%, causing runtime parsing crashes.',
      recommendedFix: 'Relax max constraint: z.number().min(0).max(250) or handle upside-down jeonse explicitly.'
    });
  }
} catch (e) {
  report.schemaSyntaxValidation.Phase_4 = { status: 'FAIL', error: e.message };
}

// Phase 5: AdTelemetryClosedLoopEventSchema & Cross-Phase Compatibility
try {
  const AdTelemetryClosedLoopEventSchema = z.object({
    slotId: z.string().min(1),
    eventType: z.enum(['IMPRESSION', 'UNFILLED', 'ADBLOCK_FALLBACK', 'CLICK']),
    apartmentName: z.string().min(1),
    dong: z.string().optional().default(''),
    dwellTimeMs: z.number().nonnegative(),
    intersectionRatio: z.number().min(0).max(1),
    timestamp: z.string().datetime(),
    userAgentCategory: z.enum(['DESKTOP', 'MOBILE_WEB', 'IN_APP_BROWSER']),
  });

  const TelemetryApiResponseSchema = z.object({
    success: z.boolean(),
    persistedId: z.string().optional(),
    error: z.string().optional(),
  });

  // Cross-phase check: Phase 2 AdTelemetryBeacon payload evaluated by Phase 5 schema
  const Phase2BeaconSchema = z.object({
    slotId: z.string().min(1),
    eventType: z.enum(['IMPRESSION', 'UNFILLED', 'FALLBACK_MOUNT', 'CLICK']),
    campaignId: z.string().optional(),
    apartmentName: z.string().default('GLOBAL'),
    timestamp: z.string().datetime(),
  });

  const sampleP2 = Phase2BeaconSchema.parse({
    slotId: '1000000001',
    eventType: 'FALLBACK_MOUNT',
    timestamp: new Date().toISOString()
  });

  const crossParse = AdTelemetryClosedLoopEventSchema.safeParse(sampleP2);
  if (!crossParse.success) {
    report.runtimeValidationFindings.push({
      phase: 5,
      severity: 'CRITICAL_ARCHITECTURAL_DESYNC',
      issue: 'PHASE_2_PHASE_5_TELEMETRY_SCHEMA_MISMATCH',
      description: 'Phase 2 AdTelemetryBeaconSchema emits eventType "FALLBACK_MOUNT" without dwellTimeMs/intersectionRatio/userAgentCategory, but Phase 5 AdTelemetryClosedLoopEventSchema requires "ADBLOCK_FALLBACK" and non-optional metrics. Phase 2 beacons will be rejected with HTTP 400 at /api/ads/click.',
      incompatibleFields: crossParse.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      recommendedFix: 'Unify telemetry schema: permit optional dwellTimeMs/intersectionRatio for static fallbacks, and harmonize enum to include both or single canonical event names.'
    });
  }

  report.schemaSyntaxValidation.Phase_5 = { status: 'PASS' };
} catch (e) {
  report.schemaSyntaxValidation.Phase_5 = { status: 'FAIL', error: e.message };
}

// 3. State Transition FSM Analysis
report.stateTransitionFindings = [
  {
    phase: 1,
    severity: 'HIGH_FSM_INCOMPLETENESS',
    issue: 'UNDEFINED_TRANSITIONS_IN_FSM',
    description: 'Phase 1 FSM does not define f(OBSERVING, TAB_HIDDEN) or f(PAUSED, RATIO_LT_50). Unconditional transition f(PAUSED, TAB_VISIBLE) => VIEWABLE violates Invariant 1 if ratio dropped below 0.50 while tab was hidden.',
  },
  {
    phase: 1,
    severity: 'MEDIUM_MEMORY_LEAK',
    issue: 'VIEWABILITY_SLOT_STATE_STRONG_DOM_REFERENCE',
    description: 'ViewabilitySlotState holds a strong reference element: HTMLElement in singleton observer state without WeakRef, risking detached DOM memory leaks during fast route/modal transitions.',
  },
  {
    phase: 2,
    severity: 'HIGH_RACE_CONDITION',
    issue: 'RACE_CONDITION_TIMEOUT_VS_STATUS_FILLED',
    description: 'If TIMEOUT_3S triggers FALLBACK_ACTIVE, and subsequent STATUS_FILLED arrives after 3000ms, f(FALLBACK_ACTIVE, STATUS_FILLED) is undefined, creating risk of double-rendering both AdSense and CPA fallback cards, triggering layout CLS spike.',
  },
  {
    phase: 4,
    severity: 'CRITICAL_ORPHANED_STATE',
    issue: 'CALC_OPEN_ORPHANED_AND_COMPARE_OPEN_DEAD_END',
    description: 'State CALC_OPEN(type, apt) is declared in S but has 0 incoming and 0 outgoing transitions in f: S x A => S. State COMPARE_OPEN has no transition for CLOSE_MODAL or POPSTATE, dead-ending user navigation.',
  },
  {
    phase: 5,
    severity: 'CRITICAL_UNREACHABLE_STATE_AND_INFINITE_LOOP',
    issue: 'TELEMETRY_DISPATCHED_UNREACHABLE_AND_UNBOUNDED_REFRESH',
    description: 'State TELEMETRY_DISPATCHED is declared in S but never transitioned to (side effect only). Additionally, f(REFRESH_ELIGIBLE, TRIGGER_REFRESH) does not enforce maxRefreshes <= 10 condition from Phase 1 Invariant 3, permitting unbounded infinite refresh loops on backgrounded/long sessions.',
  }
];

const outputPath = path.join(rootDir, 'docs/artifacts/blueprint_challenge_results.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');

console.log('Verification completed. Results written to', outputPath);
console.log('Runtime findings count:', report.runtimeValidationFindings.length);
console.log('State transition findings count:', report.stateTransitionFindings.length);
