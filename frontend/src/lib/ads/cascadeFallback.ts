import { z } from 'zod';

export const CASCADE_TIMEOUT_MS = 3000;
export const MAX_FALLBACK_TRANSITION_MS = 50;

export const CpaCampaignIdSchema = z.enum([
  'mortgage-refinance',
  'corporate-relocation',
  'interior-quote',
  'jeonse-sentinel',
]);

export type CpaCampaignId = z.infer<typeof CpaCampaignIdSchema>;

export const CpaSourceTriggerSchema = z.enum([
  'UNFILLED_ATTRIBUTE',
  'TIMEOUT_FALLBACK',
  'ADBLOCK_ACTIVE',
]);

export type CpaSourceTrigger = z.infer<typeof CpaSourceTriggerSchema>;

export const NativeCpaFallbackPayloadSchema = z.object({
  slotId: z.string().min(1),
  cpaCampaignId: CpaCampaignIdSchema,
  title: z.string().min(1),
  subtitle: z.string().min(1),
  ctaText: z.string().min(1),
  targetUrl: z
    .string()
    .url()
    .refine(
      (url) => /^https?:\/\//i.test(url) && !/^(javascript|data|vbscript):/i.test(url),
      {
        message:
          'Only secure http/https protocols permitted; javascript/data/vbscript schemes rejected',
      }
    ),
  estimatedCpaValueWon: z.number().int().positive(),
  sourceTrigger: CpaSourceTriggerSchema,
});

export type NativeCpaFallbackPayload = z.infer<typeof NativeCpaFallbackPayloadSchema>;

export const AdTelemetryEventTypeSchema = z.enum([
  'IMPRESSION',
  'VIEWABLE_IMPRESSION',
  'CLICK',
  'UNFILLED',
  'ADBLOCK_FALLBACK',
  'FALLBACK_CLICK',
]);

export type AdTelemetryEventType = z.infer<typeof AdTelemetryEventTypeSchema>;

export const AdTelemetryBeaconSchema = z.object({
  slotId: z.string().min(1),
  eventType: AdTelemetryEventTypeSchema,
  campaignId: z.string().optional(),
  apartmentName: z.string().default('GLOBAL'),
  timestamp: z.string().datetime(),
});

export type AdTelemetryBeacon = z.infer<typeof AdTelemetryBeaconSchema>;

export type CascadeSlotStatus =
  | 'REQUESTED'
  | 'FILLED'
  | 'UNFILLED_DETECTED'
  | 'FALLBACK_ACTIVE'
  | 'CLICKED';

export type CascadeSlotEvent =
  | 'STATUS_FILLED'
  | 'STATUS_UNFILLED'
  | 'TIMEOUT_3S'
  | 'USER_CLICK';

export interface CascadeTransitionResult {
  previousState: CascadeSlotStatus;
  nextState: CascadeSlotStatus;
  intermediateState?: 'UNFILLED_DETECTED';
  path: CascadeSlotStatus[];
  discardedLateFill: boolean;
}

export interface CpaCampaignTemplate {
  cpaCampaignId: CpaCampaignId;
  badgeText: string;
  title: string;
  subtitle: string;
  ctaText: string;
  targetUrl: string;
  estimatedCpaValueWon: number;
  accentTone: 'emerald' | 'blue';
}

export const CPA_CAMPAIGN_CATALOG: Record<CpaCampaignId, CpaCampaignTemplate> = {
  'mortgage-refinance': {
    cpaCampaignId: 'mortgage-refinance',
    badgeText: 'D-VIEW 금융 브리핑',
    title: '주담대 갈아타기 최저금리 및 스트레스 DSR 한도 정밀 진단',
    subtitle: '동탄 실거래가 연동 정책모기지·시중은행 대환대출 금리 비교',
    ctaText: '최저금리 한도 조회',
    targetUrl: 'https://dongtanview.com/guide/dongtan-2026-infrastructure-outlook',
    estimatedCpaValueWon: 35000,
    accentTone: 'emerald',
  },
  'corporate-relocation': {
    cpaCampaignId: 'corporate-relocation',
    badgeText: 'D-VIEW B2B 인사이트',
    title: '동탄테크노밸리 지식산업센터 법인 이전 세제 혜택 분석',
    subtitle: '취득세·재산세 감면 요건 및 중소기업 정책자금 융자 한도 확인',
    ctaText: '법인 이전 혜택 확인',
    targetUrl: 'https://dongtanview.com/guide/gtx-a-samsung-station-impact',
    estimatedCpaValueWon: 50000,
    accentTone: 'blue',
  },
  'interior-quote': {
    cpaCampaignId: 'interior-quote',
    badgeText: 'D-VIEW 주거 리포트',
    title: '동탄 주요 단지 평형별 입주·리모델링 표준 시공 명세',
    subtitle: '84㎡·59㎡ 타입별 자재 단가표 및 시공 견적 비교 분석',
    ctaText: '표준 시공 단가 확인',
    targetUrl: 'https://dongtanview.com/guide/jeonse-ratio-risk-analysis',
    estimatedCpaValueWon: 30000,
    accentTone: 'emerald',
  },
  'jeonse-sentinel': {
    cpaCampaignId: 'jeonse-sentinel',
    badgeText: 'D-VIEW 리스크 진단',
    title: 'HUG 전세보증금 반환보증 126% 룰 및 선순위 안전도 진단',
    subtitle: '단지별 실거래가 대비 전세가율 기반 역전세 위험도 즉시 판별',
    ctaText: '전세 안전도 정밀 진단',
    targetUrl: 'https://dongtanview.com/overview',
    estimatedCpaValueWon: 30000,
    accentTone: 'blue',
  },
};

/**
 * Deterministically selects a CPA campaign ID from slotId in O(1) time.
 */
export function selectDeterministicCampaignId(
  slotId: string,
  preferredCampaignId?: CpaCampaignId
): CpaCampaignId {
  if (preferredCampaignId && preferredCampaignId in CPA_CAMPAIGN_CATALOG) {
    return preferredCampaignId;
  }

  const normalized = slotId.toLowerCase();
  if (normalized.includes('ch05') || normalized.includes('mortgage')) {
    return 'mortgage-refinance';
  }
  if (
    normalized.includes('techno') ||
    normalized.includes('jisan') ||
    normalized.includes('b2b') ||
    normalized.includes('corp')
  ) {
    return 'corporate-relocation';
  }
  if (normalized.includes('interior') || normalized.includes('remodel')) {
    return 'interior-quote';
  }
  if (normalized.includes('ch02') || normalized.includes('jeonse')) {
    return 'jeonse-sentinel';
  }
  if (normalized.includes('1000000002')) {
    return 'mortgage-refinance';
  }
  if (normalized.includes('1000000001')) {
    return 'jeonse-sentinel';
  }

  const campaigns: CpaCampaignId[] = [
    'mortgage-refinance',
    'jeonse-sentinel',
    'corporate-relocation',
    'interior-quote',
  ];
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }
  return campaigns[hash % campaigns.length];
}

/**
 * Resolves and validates a 1st-Party Native CPA Fallback Payload in O(1) time.
 * Enforces LKG deterministic recovery if overrides violate NativeCpaFallbackPayloadSchema.
 */
export function resolveNativeCpaFallbackPayload(options: {
  slotId: string;
  sourceTrigger: CpaSourceTrigger;
  cpaCampaignId?: CpaCampaignId;
  overrides?: Partial<NativeCpaFallbackPayload>;
}): NativeCpaFallbackPayload {
  const safeSlotId = options.slotId.trim() || 'default-slot';
  const campaignId = selectDeterministicCampaignId(safeSlotId, options.cpaCampaignId);
  const template = CPA_CAMPAIGN_CATALOG[campaignId];
  const parsedTrigger = CpaSourceTriggerSchema.safeParse(options.sourceTrigger);
  const safeTrigger: CpaSourceTrigger = parsedTrigger.success
    ? parsedTrigger.data
    : 'UNFILLED_ATTRIBUTE';

  const baseCandidate: NativeCpaFallbackPayload = {
    slotId: safeSlotId,
    cpaCampaignId: campaignId,
    title: template.title,
    subtitle: template.subtitle,
    ctaText: template.ctaText,
    targetUrl: template.targetUrl,
    estimatedCpaValueWon: template.estimatedCpaValueWon,
    sourceTrigger: safeTrigger,
  };

  if (options.overrides) {
    const mergedCandidate = {
      ...baseCandidate,
      ...options.overrides,
    };
    const parsed = NativeCpaFallbackPayloadSchema.safeParse(mergedCandidate);
    if (parsed.success) {
      return parsed.data;
    }
  }

  return NativeCpaFallbackPayloadSchema.parse(baseCandidate);
}

/**
 * Pure deterministic state transition function f: S x A -> S with full path metadata.
 * Enforces Invariant 5: f(FALLBACK_ACTIVE, STATUS_FILLED) = FALLBACK_ACTIVE (late fill discarded).
 */
export function transitionCascadeStateWithPath(
  state: CascadeSlotStatus,
  event: CascadeSlotEvent
): CascadeTransitionResult {
  switch (state) {
    case 'REQUESTED': {
      if (event === 'STATUS_FILLED') {
        return {
          previousState: state,
          nextState: 'FILLED',
          path: ['REQUESTED', 'FILLED'],
          discardedLateFill: false,
        };
      }
      if (event === 'STATUS_UNFILLED') {
        // f(REQUESTED, STATUS_UNFILLED) = UNFILLED_DETECTED -> FALLBACK_ACTIVE
        return {
          previousState: state,
          nextState: 'FALLBACK_ACTIVE',
          intermediateState: 'UNFILLED_DETECTED',
          path: ['REQUESTED', 'UNFILLED_DETECTED', 'FALLBACK_ACTIVE'],
          discardedLateFill: false,
        };
      }
      if (event === 'TIMEOUT_3S') {
        // f(REQUESTED, TIMEOUT_3S) = FALLBACK_ACTIVE
        return {
          previousState: state,
          nextState: 'FALLBACK_ACTIVE',
          path: ['REQUESTED', 'FALLBACK_ACTIVE'],
          discardedLateFill: false,
        };
      }
      return {
        previousState: state,
        nextState: 'REQUESTED',
        path: ['REQUESTED'],
        discardedLateFill: false,
      };
    }

    case 'UNFILLED_DETECTED': {
      if (event === 'USER_CLICK') {
        return {
          previousState: state,
          nextState: 'CLICKED',
          path: ['UNFILLED_DETECTED', 'FALLBACK_ACTIVE', 'CLICKED'],
          discardedLateFill: false,
        };
      }
      return {
        previousState: state,
        nextState: 'FALLBACK_ACTIVE',
        path: ['UNFILLED_DETECTED', 'FALLBACK_ACTIVE'],
        discardedLateFill: event === 'STATUS_FILLED',
      };
    }

    case 'FALLBACK_ACTIVE': {
      if (event === 'STATUS_FILLED') {
        // f(FALLBACK_ACTIVE, STATUS_FILLED) = FALLBACK_ACTIVE (late response discarded)
        return {
          previousState: state,
          nextState: 'FALLBACK_ACTIVE',
          path: ['FALLBACK_ACTIVE'],
          discardedLateFill: true,
        };
      }
      if (event === 'STATUS_UNFILLED' || event === 'TIMEOUT_3S') {
        // f(FALLBACK_ACTIVE, STATUS_UNFILLED) = FALLBACK_ACTIVE
        return {
          previousState: state,
          nextState: 'FALLBACK_ACTIVE',
          path: ['FALLBACK_ACTIVE'],
          discardedLateFill: false,
        };
      }
      if (event === 'USER_CLICK') {
        // f(FALLBACK_ACTIVE, USER_CLICK) = CLICKED
        return {
          previousState: state,
          nextState: 'CLICKED',
          path: ['FALLBACK_ACTIVE', 'CLICKED'],
          discardedLateFill: false,
        };
      }
      return {
        previousState: state,
        nextState: 'FALLBACK_ACTIVE',
        path: ['FALLBACK_ACTIVE'],
        discardedLateFill: false,
      };
    }

    case 'FILLED': {
      if (event === 'USER_CLICK') {
        return {
          previousState: state,
          nextState: 'CLICKED',
          path: ['FILLED', 'CLICKED'],
          discardedLateFill: false,
        };
      }
      return {
        previousState: state,
        nextState: 'FILLED',
        path: ['FILLED'],
        discardedLateFill: false,
      };
    }

    case 'CLICKED': {
      return {
        previousState: state,
        nextState: 'CLICKED',
        path: ['CLICKED'],
        discardedLateFill: event === 'STATUS_FILLED',
      };
    }
  }
}

/**
 * Pure deterministic state transition function f: S x A -> S returning target state.
 */
export function transitionCascadeState(
  state: CascadeSlotStatus,
  event: CascadeSlotEvent
): CascadeSlotStatus {
  return transitionCascadeStateWithPath(state, event).nextState;
}

/**
 * Deterministic FSM controller for a single ad slot cascade lifecycle.
 */
export class CascadeFallbackStateMachine {
  private status: CascadeSlotStatus = 'REQUESTED';
  private history: CascadeSlotStatus[] = ['REQUESTED'];
  private lateFillDiscardCount: number = 0;

  public getStatus(): CascadeSlotStatus {
    return this.status;
  }

  public getHistory(): ReadonlyArray<CascadeSlotStatus> {
    return this.history;
  }

  public getLateFillDiscardCount(): number {
    return this.lateFillDiscardCount;
  }

  public dispatch(event: CascadeSlotEvent): CascadeTransitionResult {
    const result = transitionCascadeStateWithPath(this.status, event);
    if (result.intermediateState) {
      this.history.push(result.intermediateState);
    }
    if (result.nextState !== this.status || result.intermediateState) {
      this.history.push(result.nextState);
    }
    if (result.discardedLateFill) {
      this.lateFillDiscardCount += 1;
    }
    this.status = result.nextState;
    return result;
  }

  public reset(): void {
    this.status = 'REQUESTED';
    this.history = ['REQUESTED'];
    this.lateFillDiscardCount = 0;
  }
}

export function createCascadeFallbackStateMachine(): CascadeFallbackStateMachine {
  return new CascadeFallbackStateMachine();
}

/**
 * Dispatches an AdTelemetryBeacon to `/api/ads/click` via non-blocking `navigator.sendBeacon`
 * with an automatic non-blocking `fetch(..., { keepalive: true })` fallback.
 * Guarantees UI blocking delay Delta Jank = 0ms even under total network failure.
 */
export function sendAdTelemetryBeacon(
  beaconInput: z.input<typeof AdTelemetryBeaconSchema>,
  endpoint: string = '/api/ads/click'
): boolean {
  const parsed = AdTelemetryBeaconSchema.safeParse(beaconInput);
  if (!parsed.success) {
    return false;
  }

  const serialized = JSON.stringify(parsed.data);

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const queued = navigator.sendBeacon(endpoint, serialized);
      if (queued) {
        return true;
      }
    }
  } catch {
    // Swallow synchronous sendBeacon exception (Delta Jank = 0ms)
  }

  try {
    if (typeof fetch === 'function') {
      void Promise.resolve(
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: serialized,
          keepalive: true,
        })
      ).catch(() => {
        // Swallow async network rejection (Delta Jank = 0ms)
      });
      return true;
    }
  } catch {
    // Swallow synchronous fetch exception (Delta Jank = 0ms)
  }

  return false;
}
