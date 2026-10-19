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
    if (
      typeof window !== 'undefined' &&
      typeof (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag === 'function'
    ) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
        'event',
        'ad_telemetry',
        {
          event_category: parsed.data.eventType,
          event_label: parsed.data.slotId,
          slot_id: parsed.data.slotId,
          event_type: parsed.data.eventType,
          apartment_name: parsed.data.apartmentName,
          campaign_id: parsed.data.campaignId,
          timestamp: parsed.data.timestamp,
        }
      );
    }
  } catch {
    // Swallow synchronous GA4 exception (Delta Jank = 0ms)
  }

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

// ============================================================================
// Phase 5: Yield Protection Closed-Loop Telemetry & Deterministic State Machine
// ============================================================================

export const UserAgentCategorySchema = z.enum([
  'DESKTOP',
  'MOBILE_WEB',
  'IN_APP_BROWSER',
]);

export type UserAgentCategory = z.infer<typeof UserAgentCategorySchema>;

/**
 * Phase 5 Section 3.5 Closed-Loop Telemetry Event Schema
 */
export const AdTelemetryClosedLoopEventSchema = z.object({
  eventType: z.enum([
    'IMPRESSION',
    'VIEWABLE_IMPRESSION',
    'CLICK',
    'UNFILLED',
    'ADBLOCK_FALLBACK',
    'FALLBACK_CLICK',
  ]),
  slotId: z.string().min(1),
  apartmentName: z.string().default('GLOBAL'),
  dong: z.string().default(''),
  dwellTimeMs: z.number().nonnegative().default(0),
  intersectionRatio: z.number().min(0).max(1).default(0),
  userAgentCategory: UserAgentCategorySchema.optional().default('DESKTOP'),
  timestamp: z.string().datetime(),
  campaignId: z.string().optional(),
});

export type AdTelemetryClosedLoopEvent = z.infer<typeof AdTelemetryClosedLoopEventSchema>;

/**
 * Phase 5 Section 3.5 Telemetry API Response Schema
 */
export const TelemetryApiResponseSchema = z.object({
  success: z.boolean(),
  persistedId: z.string().optional(),
  error: z.string().optional(),
});

export type TelemetryApiResponse = z.infer<typeof TelemetryApiResponseSchema>;

/**
 * Deterministically classifies User-Agent string into DESKTOP, MOBILE_WEB, or IN_APP_BROWSER.
 * Complexity: Time O(1), Space O(1), Side-effects: False.
 */
export function detectUserAgentCategory(uaInput?: string): UserAgentCategory {
  const rawUa =
    typeof uaInput === 'string'
      ? uaInput
      : typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string'
      ? navigator.userAgent
      : '';
  const ua = rawUa.toLowerCase();

  if (/kakaotalk|naver|line|instagram|fb_iab|fb4a|fban|fbios|twitter|twttr|wv/i.test(ua)) {
    return 'IN_APP_BROWSER';
  }
  if (/android|iphone|ipad|ipod|mobile/i.test(ua)) {
    return 'MOBILE_WEB';
  }
  return 'DESKTOP';
}

export type ClosedLoopTelemetryInput = Omit<
  z.input<typeof AdTelemetryClosedLoopEventSchema>,
  'userAgentCategory' | 'timestamp'
> & {
  userAgentCategory?: UserAgentCategory;
  timestamp?: string;
};

/**
 * Dispatches a Phase 5 AdTelemetryClosedLoopEvent to both GA4 custom event (`ad_telemetry`)
 * and `/api/ads/click` (`ad_clicks` collection) via non-blocking `navigator.sendBeacon`
 * with `fetch(..., { keepalive: true })` fallback.
 * Complexity: Time O(1), Space O(1), Side-effects: True (Beacon + GA4).
 */
export function sendTelemetry(
  eventInput: ClosedLoopTelemetryInput,
  endpoint: string = '/api/ads/click'
): boolean {
  const candidate = {
    ...eventInput,
    userAgentCategory: eventInput.userAgentCategory ?? detectUserAgentCategory(),
    timestamp: eventInput.timestamp ?? new Date().toISOString(),
  };

  const parsed = AdTelemetryClosedLoopEventSchema.safeParse(candidate);
  if (!parsed.success) {
    return false;
  }

  const serialized = JSON.stringify(parsed.data);

  try {
    if (
      typeof window !== 'undefined' &&
      typeof (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag === 'function'
    ) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
        'event',
        'ad_telemetry',
        {
          event_category: parsed.data.eventType,
          event_label: parsed.data.slotId,
          slot_id: parsed.data.slotId,
          event_type: parsed.data.eventType,
          apartment_name: parsed.data.apartmentName,
          dong: parsed.data.dong,
          dwell_time_ms: parsed.data.dwellTimeMs,
          intersection_ratio: parsed.data.intersectionRatio,
          user_agent_category: parsed.data.userAgentCategory,
          timestamp: parsed.data.timestamp,
        }
      );
    }
  } catch {
    // Swallow synchronous GA4 exception (Delta Jank = 0ms)
  }

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

export const ClosedLoopSlotStatusSchema = z.enum([
  'MOUNTED',
  'ACTIVE_VIEW',
  'REFRESH_ELIGIBLE',
  'UNFILLED_FALLBACK',
  'TELEMETRY_DISPATCHED',
]);

export type ClosedLoopSlotStatus = z.infer<typeof ClosedLoopSlotStatusSchema>;

export interface ClosedLoopSlotState {
  slotId: string;
  status: ClosedLoopSlotStatus;
  intersectionRatio: number;
  lastTimestampMs: number;
  dwellTimeMs: number;
  refreshCount: number;
  refreshKey: number;
  maxRefreshesPerSlot: number;
  apartmentName: string;
  dong: string;
  intermediateStatus?: 'TELEMETRY_DISPATCHED';
  path: ClosedLoopSlotStatus[];
}

export type ClosedLoopSlotAction =
  | { type: 'REGISTER'; ratio?: number; timestampMs?: number }
  | { type: 'TICK'; ratio: number; timestampMs: number; isDocumentHidden?: boolean }
  | { type: 'TRIGGER_REFRESH'; ratio?: number; timestampMs?: number }
  | { type: 'EVENT_UNFILLED'; timestampMs?: number };

export function createInitialClosedLoopState(params: {
  slotId: string;
  apartmentName?: string;
  dong?: string;
  maxRefreshesPerSlot?: number;
  timestampMs?: number;
}): ClosedLoopSlotState {
  return {
    slotId: params.slotId,
    status: 'MOUNTED',
    intersectionRatio: 0,
    lastTimestampMs: params.timestampMs ?? Date.now(),
    dwellTimeMs: 0,
    refreshCount: 0,
    refreshKey: 0,
    maxRefreshesPerSlot: params.maxRefreshesPerSlot ?? 10,
    apartmentName: params.apartmentName ?? 'GLOBAL',
    dong: params.dong ?? '',
    path: ['MOUNTED'],
  };
}

/**
 * Pure deterministic state transition function f: S x A -> S for Phase 5 Section 3.5:
 * S = { MOUNTED, ACTIVE_VIEW(ratio, t, n), REFRESH_ELIGIBLE(n), UNFILLED_FALLBACK, TELEMETRY_DISPATCHED }
 * Complexity: Time O(1), Space O(1), Side-effects: False (pure transition; telemetry side-effect optional via controller).
 */
export function transitionClosedLoopState(
  state: ClosedLoopSlotState,
  action: ClosedLoopSlotAction,
  options?: { dispatchTelemetry?: boolean; endpoint?: string }
): ClosedLoopSlotState {
  const shouldDispatch = options?.dispatchTelemetry ?? false;

  switch (action.type) {
    case 'REGISTER': {
      // 1. f(MOUNTED, REGISTER) => ACTIVE_VIEW(ratio_0, t_0, 0)
      if (state.status !== 'MOUNTED') {
        return {
          ...state,
          intermediateStatus: undefined,
          path: [state.status],
        };
      }
      const ratio0 = Math.max(0, Math.min(1, action.ratio ?? 0));
      const t0 = action.timestampMs ?? Date.now();
      return {
        ...state,
        status: 'ACTIVE_VIEW',
        intersectionRatio: ratio0,
        lastTimestampMs: t0,
        dwellTimeMs: 0,
        refreshCount: 0,
        intermediateStatus: undefined,
        path: ['MOUNTED', 'ACTIVE_VIEW'],
      };
    }

    case 'TICK': {
      // 2. f(ACTIVE_VIEW(n), TICK(t_1, ratio_1)) => REFRESH_ELIGIBLE(n) if (t_1 - t_0 >= 30000 && ratio_1 >= 0.50 && n < 10 && !hidden) else ACTIVE_VIEW(n)
      if (state.status !== 'ACTIVE_VIEW' && state.status !== 'REFRESH_ELIGIBLE') {
        return {
          ...state,
          intermediateStatus: undefined,
          path: [state.status],
        };
      }

      const ratio1 = Math.max(0, Math.min(1, action.ratio));
      const t1 = action.timestampMs;
      const elapsedMs = Math.max(0, t1 - state.lastTimestampMs);
      const isHidden =
        action.isDocumentHidden ??
        (typeof document !== 'undefined' ? Boolean(document.hidden) : false);

      if (
        !isHidden &&
        elapsedMs >= 30000 &&
        ratio1 >= 0.50 &&
        state.refreshCount < state.maxRefreshesPerSlot
      ) {
        return {
          ...state,
          status: 'REFRESH_ELIGIBLE',
          intersectionRatio: ratio1,
          dwellTimeMs: elapsedMs,
          intermediateStatus: undefined,
          path: [state.status, 'REFRESH_ELIGIBLE'],
        };
      }

      return {
        ...state,
        status: 'ACTIVE_VIEW',
        intersectionRatio: ratio1,
        dwellTimeMs: isHidden || ratio1 < 0.50 ? 0 : elapsedMs,
        lastTimestampMs: isHidden || ratio1 < 0.50 ? t1 : state.lastTimestampMs,
        intermediateStatus: undefined,
        path: [state.status, 'ACTIVE_VIEW'],
      };
    }

    case 'TRIGGER_REFRESH': {
      // 3. f(REFRESH_ELIGIBLE(n), TRIGGER_REFRESH) => TELEMETRY_DISPATCHED -> ACTIVE_VIEW(ratio_1, t_1, n + 1)
      if (
        state.status !== 'REFRESH_ELIGIBLE' ||
        state.refreshCount >= state.maxRefreshesPerSlot
      ) {
        return {
          ...state,
          intermediateStatus: undefined,
          path: [state.status],
        };
      }

      const ratio1 = Math.max(0, Math.min(1, action.ratio ?? state.intersectionRatio));
      const t1 = action.timestampMs ?? Date.now();
      const nextCount = state.refreshCount + 1;
      const nextKey = state.refreshKey + 1;

      if (shouldDispatch) {
        sendTelemetry(
          {
            eventType: 'IMPRESSION',
            slotId: state.slotId,
            apartmentName: state.apartmentName,
            dong: state.dong,
            dwellTimeMs: state.dwellTimeMs,
            intersectionRatio: ratio1,
            timestamp: new Date(t1).toISOString(),
          },
          options?.endpoint
        );
      }

      return {
        ...state,
        status: 'ACTIVE_VIEW',
        intersectionRatio: ratio1,
        lastTimestampMs: t1,
        dwellTimeMs: 0,
        refreshCount: nextCount,
        refreshKey: nextKey,
        intermediateStatus: 'TELEMETRY_DISPATCHED',
        path: ['REFRESH_ELIGIBLE', 'TELEMETRY_DISPATCHED', 'ACTIVE_VIEW'],
      };
    }

    case 'EVENT_UNFILLED': {
      // 4. f(ACTIVE_VIEW, EVENT_UNFILLED) => TELEMETRY_DISPATCHED -> UNFILLED_FALLBACK
      if (state.status !== 'ACTIVE_VIEW' && state.status !== 'REFRESH_ELIGIBLE') {
        return {
          ...state,
          intermediateStatus: undefined,
          path: [state.status],
        };
      }

      const t1 = action.timestampMs ?? Date.now();
      if (shouldDispatch) {
        sendTelemetry(
          {
            eventType: 'UNFILLED',
            slotId: state.slotId,
            apartmentName: state.apartmentName,
            dong: state.dong,
            dwellTimeMs: state.dwellTimeMs,
            intersectionRatio: state.intersectionRatio,
            timestamp: new Date(t1).toISOString(),
          },
          options?.endpoint
        );
      }

      return {
        ...state,
        status: 'UNFILLED_FALLBACK',
        lastTimestampMs: t1,
        intermediateStatus: 'TELEMETRY_DISPATCHED',
        path: [state.status, 'TELEMETRY_DISPATCHED', 'UNFILLED_FALLBACK'],
      };
    }
  }
}

/**
 * Stateful controller wrapping Phase 5 Closed-Loop State Machine and dispatching telemetry.
 */
export class ClosedLoopTelemetryController {
  private state: ClosedLoopSlotState;
  private history: ClosedLoopSlotStatus[];
  private endpoint: string;

  constructor(params: {
    slotId: string;
    apartmentName?: string;
    dong?: string;
    maxRefreshesPerSlot?: number;
    timestampMs?: number;
    endpoint?: string;
  }) {
    this.state = createInitialClosedLoopState(params);
    this.history = ['MOUNTED'];
    this.endpoint = params.endpoint ?? '/api/ads/click';
  }

  public getState(): Readonly<ClosedLoopSlotState> {
    return this.state;
  }

  public getHistory(): ReadonlyArray<ClosedLoopSlotStatus> {
    return this.history;
  }

  public dispatch(action: ClosedLoopSlotAction): ClosedLoopSlotState {
    const prevStatus = this.state.status;
    const nextState = transitionClosedLoopState(this.state, action, {
      dispatchTelemetry: true,
      endpoint: this.endpoint,
    });
    if (nextState.intermediateStatus) {
      this.history.push(nextState.intermediateStatus);
    }
    if (nextState.status !== prevStatus || nextState.intermediateStatus) {
      this.history.push(nextState.status);
    }
    this.state = nextState;
    return nextState;
  }
}

export function createClosedLoopTelemetryController(params: {
  slotId: string;
  apartmentName?: string;
  dong?: string;
  maxRefreshesPerSlot?: number;
  timestampMs?: number;
  endpoint?: string;
}): ClosedLoopTelemetryController {
  return new ClosedLoopTelemetryController(params);
}

