/**
 * @module ga4CustomDimensions
 * @description Canonical GA4 Custom Dimensions & Metrics registry, idempotent Google Analytics
 * Admin API v1beta provisioner, and metadata-aware Data API `ad_telemetry` report planner for D-VIEW.
 */
import crypto from 'crypto';
import { z } from 'zod';

export const DEFAULT_DVIEW_GA4_PROPERTY_ID = '527874632';
export const DEFAULT_DVIEW_GA4_MEASUREMENT_ID = 'G-Y17BHJ77W6';
// GA4 caps total distinct dimensions across `dimensions` + `dimensionFilter` (`eventName`) at 9
export const MAX_GA4_REPORT_DIMENSIONS = 8;
const MAX_PAGINATION_PAGES = 20;

export interface Ga4CustomDimensionSpec {
  parameterName: string;
  apiName: `customEvent:${string}`;
  displayName: string;
  description: string;
  scope: 'EVENT';
  requiredCore: boolean;
  legacyApiNames?: ReadonlyArray<`customEvent:${string}`>;
  builtInApiName?: string;
}

export interface Ga4CustomMetricSpec {
  parameterName: string;
  apiName: `customEvent:${string}`;
  displayName: string;
  description: string;
  scope: 'EVENT';
  measurementUnit: 'STANDARD' | 'MILLISECONDS';
}

/**
 * Authoritative D-VIEW GA4 event-scoped custom dimensions for `ad_telemetry` and funnel diagnostics.
 * Core 4 dimensions (`slot_id`, `event_type`, `apartment_name`, `user_agent_category`) enable
 * per-slot impression, unfilled, fallback, and MRC Active View (`VIEWABLE_IMPRESSION`) aggregation.
 */
export const DVIEW_GA4_CUSTOM_DIMENSIONS: ReadonlyArray<Ga4CustomDimensionSpec> = [
  {
    parameterName: 'slot_id',
    apiName: 'customEvent:slot_id',
    displayName: 'Ad Slot ID',
    description: 'AdSense ad unit ID or D-VIEW ad slot identifier for ad_telemetry',
    scope: 'EVENT',
    requiredCore: true,
  },
  {
    parameterName: 'event_type',
    apiName: 'customEvent:event_type',
    displayName: 'Ad Telemetry Event Type',
    description:
      'Ad slot lifecycle event (VIEWABLE_IMPRESSION, IMPRESSION, UNFILLED, ADBLOCK_FALLBACK, FALLBACK_CLICK, CLICK, GUIDE_PREVIEW_CLICK)',
    scope: 'EVENT',
    requiredCore: true,
  },
  {
    parameterName: 'apartment_name',
    apiName: 'customEvent:apartment_name',
    displayName: 'Apartment Name',
    description: 'Target Dongtan apartment complex name or GLOBAL route context',
    scope: 'EVENT',
    requiredCore: true,
  },
  {
    parameterName: 'user_agent_category',
    apiName: 'customEvent:user_agent_category',
    displayName: 'User Agent Category',
    description: 'Client browser environment category (DESKTOP, MOBILE_WEB, IN_APP_BROWSER)',
    scope: 'EVENT',
    requiredCore: true,
  },
  {
    parameterName: 'placement_slot_id',
    apiName: 'customEvent:placement_slot_id',
    displayName: 'Ad Placement Slot Key',
    description: 'Distinct page placement / refresh observer key (e.g. article_mid, bottom_banner)',
    scope: 'EVENT',
    requiredCore: false,
  },
  {
    parameterName: 'cpa_campaign_id',
    apiName: 'customEvent:cpa_campaign_id',
    displayName: 'CPA Campaign ID',
    description: 'Native CPA fallback campaign identifier when unfilled or ad-blocked',
    scope: 'EVENT',
    requiredCore: false,
    legacyApiNames: ['customEvent:campaign_id'],
  },
  {
    parameterName: 'dong',
    apiName: 'customEvent:dong',
    displayName: 'Legal Dong',
    description: 'Hwaseong Dongtan legal or administrative dong context',
    scope: 'EVENT',
    requiredCore: false,
  },
] as const;

/**
 * Event-scoped custom dimensions for `apartment_view` and `search_query` interaction analytics.
 */
export const DVIEW_GA4_INTERACTION_DIMENSIONS: ReadonlyArray<Ga4CustomDimensionSpec> = [
  {
    parameterName: 'search_term',
    apiName: 'customEvent:search_term',
    displayName: 'DVIEW Search Term',
    description: 'Normalized user search term (<=100 chars) for search_query and view_search_results',
    scope: 'EVENT',
    requiredCore: false,
    builtInApiName: 'searchTerm',
  },
  {
    parameterName: 'surface',
    apiName: 'customEvent:surface',
    displayName: 'Interaction Surface',
    description: 'Originating UI surface for apartment_view or search_query',
    scope: 'EVENT',
    requiredCore: false,
  },
  {
    parameterName: 'view_type',
    apiName: 'customEvent:view_type',
    displayName: 'Apartment View Type',
    description: 'Presentation mode for apartment_view (modal, detail_page, chart_preview, mobile_drawer, shortcut)',
    scope: 'EVENT',
    requiredCore: false,
  },
  {
    parameterName: 'trigger',
    apiName: 'customEvent:trigger',
    displayName: 'Interaction Trigger',
    description: 'Specific user gesture or entry trigger for apartment_view or search_query',
    scope: 'EVENT',
    requiredCore: false,
  },
  {
    parameterName: 'chapter_id',
    apiName: 'customEvent:chapter_id',
    displayName: 'Modal Chapter ID',
    description: 'Selected chapter/tab identifier inside ApartmentModal',
    scope: 'EVENT',
    requiredCore: false,
  },
  {
    parameterName: 'selected_apt',
    apiName: 'customEvent:selected_apt',
    displayName: 'Search Selected Apartment',
    description: 'Apartment complex selected directly from a search suggestion or autocomplete match',
    scope: 'EVENT',
    requiredCore: false,
  },
  {
    parameterName: 'zone',
    apiName: 'customEvent:zone',
    displayName: 'Living Zone Key',
    description: 'Dongtan living zone identifier for donut fullscreen modal interactions',
    scope: 'EVENT',
    requiredCore: false,
  },
  {
    parameterName: 'calculator_type',
    apiName: 'customEvent:calculator_type',
    displayName: 'Calculator Type',
    description:
      'Target diagnosis calculator type (mortgage, jeonse_safety, property_tax, sell_timing, compare, policy_loan)',
    scope: 'EVENT',
    requiredCore: false,
  },
  {
    parameterName: 'tab_name',
    apiName: 'customEvent:tab_name',
    displayName: 'Navigation Tab Name',
    description:
      'Selected navigation tab identifier for tab_view (overview, imjang, stats, guide, technovalley, lounge)',
    scope: 'EVENT',
    requiredCore: false,
  },
] as const;

export const DVIEW_GA4_CUSTOM_METRICS: ReadonlyArray<Ga4CustomMetricSpec> = [
  {
    parameterName: 'dwell_time_ms',
    apiName: 'customEvent:dwell_time_ms',
    displayName: 'Ad Slot Dwell Time ms',
    description: 'Accumulated active-view dwell duration in milliseconds at telemetry emission',
    scope: 'EVENT',
    measurementUnit: 'MILLISECONDS',
  },
  {
    parameterName: 'intersection_ratio',
    apiName: 'customEvent:intersection_ratio',
    displayName: 'Ad Viewport Intersection Ratio',
    description: 'Viewport intersection ratio [0.0..1.0] at ad_telemetry emission',
    scope: 'EVENT',
    measurementUnit: 'STANDARD',
  },
] as const;

export interface Ga4MetadataFieldLike {
  apiName?: string | null;
  uiName?: string | null;
  customDefinition?: boolean | null;
}

export interface Ga4LegacyDimensionAlias {
  parameterName: string;
  canonicalApiName: string;
  activeLegacyApiName: string;
}

export interface Ga4CustomDimensionCoverage {
  coreComplete: boolean;
  allDimensionsComplete: boolean;
  interactionComplete: boolean;
  allMetricsComplete: boolean;
  registeredCoreDimensions: string[];
  missingCoreDimensions: string[];
  registeredExtendedDimensions: string[];
  missingExtendedDimensions: string[];
  registeredInteractionDimensions: string[];
  missingInteractionDimensions: string[];
  legacyAliasDimensions: Ga4LegacyDimensionAlias[];
  registeredMetrics: string[];
  missingMetrics: string[];
}

export function resolveInteractionDimensionApiName(
  spec: Ga4CustomDimensionSpec,
  registeredDimApiNames: ReadonlySet<string>
): string | null {
  if (registeredDimApiNames.has(spec.apiName)) {
    return spec.apiName;
  }
  if (spec.builtInApiName && registeredDimApiNames.has(spec.builtInApiName)) {
    return spec.builtInApiName;
  }
  return null;
}

/**
 * Evaluates which D-VIEW custom dimensions and metrics are currently active in GA4 Data API metadata.
 */
export function inspectGa4CustomDimensionCoverage(
  metadataDimensions: ReadonlyArray<Ga4MetadataFieldLike> = [],
  metadataMetrics: ReadonlyArray<Ga4MetadataFieldLike> = []
): Ga4CustomDimensionCoverage {
  const registeredDimApiNames = new Set(
    metadataDimensions
      .map((d) => (typeof d.apiName === 'string' ? d.apiName.trim() : ''))
      .filter((name) => name.length > 0)
  );
  const registeredMetricApiNames = new Set(
    metadataMetrics
      .map((m) => (typeof m.apiName === 'string' ? m.apiName.trim() : ''))
      .filter((name) => name.length > 0)
  );

  const registeredCoreDimensions: string[] = [];
  const missingCoreDimensions: string[] = [];
  const registeredExtendedDimensions: string[] = [];
  const missingExtendedDimensions: string[] = [];
  const registeredInteractionDimensions: string[] = [];
  const missingInteractionDimensions: string[] = [];
  const legacyAliasDimensions: Ga4LegacyDimensionAlias[] = [];

  for (const spec of DVIEW_GA4_CUSTOM_DIMENSIONS) {
    const isRegistered = registeredDimApiNames.has(spec.apiName);
    if (!isRegistered && spec.legacyApiNames) {
      const activeLegacyApiName = spec.legacyApiNames.find((legacyName) =>
        registeredDimApiNames.has(legacyName)
      );
      if (activeLegacyApiName) {
        legacyAliasDimensions.push({
          parameterName: spec.parameterName,
          canonicalApiName: spec.apiName,
          activeLegacyApiName,
        });
      }
    }
    if (spec.requiredCore) {
      if (isRegistered) {
        registeredCoreDimensions.push(spec.parameterName);
      } else {
        missingCoreDimensions.push(spec.parameterName);
      }
    } else if (isRegistered) {
      registeredExtendedDimensions.push(spec.parameterName);
    } else {
      missingExtendedDimensions.push(spec.parameterName);
    }
  }

  for (const spec of DVIEW_GA4_INTERACTION_DIMENSIONS) {
    if (registeredDimApiNames.has(spec.apiName)) {
      registeredInteractionDimensions.push(spec.parameterName);
    } else {
      missingInteractionDimensions.push(spec.parameterName);
    }
  }

  const registeredMetrics: string[] = [];
  const missingMetrics: string[] = [];

  for (const metricSpec of DVIEW_GA4_CUSTOM_METRICS) {
    if (registeredMetricApiNames.has(metricSpec.apiName)) {
      registeredMetrics.push(metricSpec.parameterName);
    } else {
      missingMetrics.push(metricSpec.parameterName);
    }
  }

  return {
    coreComplete: missingCoreDimensions.length === 0,
    allDimensionsComplete:
      missingCoreDimensions.length === 0 && missingExtendedDimensions.length === 0,
    interactionComplete: missingInteractionDimensions.length === 0,
    allMetricsComplete: missingMetrics.length === 0,
    registeredCoreDimensions,
    missingCoreDimensions,
    registeredExtendedDimensions,
    missingExtendedDimensions,
    registeredInteractionDimensions,
    missingInteractionDimensions,
    legacyAliasDimensions,
    registeredMetrics,
    missingMetrics,
  };
}

export type AdTelemetryReportMode =
  | 'FULL_SLOT_BREAKDOWN'
  | 'PARTIAL_CUSTOM_BREAKDOWN'
  | 'PAGE_DEVICE_FALLBACK';

export interface AdTelemetryReportPlan {
  mode: AdTelemetryReportMode;
  dimensions: string[];
  metrics: string[];
  coverage: Ga4CustomDimensionCoverage;
}

/**
 * Builds a GA4 `runReport` query plan for `eventName === 'ad_telemetry'` that strictly
 * intersects desired `customEvent:*` fields against live property metadata (preventing
 * HTTP 400 INVALID_ARGUMENT when dimensions are unregistered or still propagating) and
 * enforces GA4's 9-dimension query limit.
 */
export function buildAdTelemetryReportPlan(
  metadataDimensions: ReadonlyArray<Ga4MetadataFieldLike> = [],
  metadataMetrics: ReadonlyArray<Ga4MetadataFieldLike> = []
): AdTelemetryReportPlan {
  const coverage = inspectGa4CustomDimensionCoverage(metadataDimensions, metadataMetrics);
  const registeredDimApiNames = new Set(
    metadataDimensions
      .map((d) => (typeof d.apiName === 'string' ? d.apiName.trim() : ''))
      .filter((name) => name.length > 0)
  );
  const registeredMetricApiNames = new Set(
    metadataMetrics
      .map((m) => (typeof m.apiName === 'string' ? m.apiName.trim() : ''))
      .filter((name) => name.length > 0)
  );

  const dimensions: string[] = ['pagePath', 'deviceCategory'];
  for (const spec of DVIEW_GA4_CUSTOM_DIMENSIONS) {
    if (dimensions.length >= MAX_GA4_REPORT_DIMENSIONS) {
      break;
    }
    if (registeredDimApiNames.has(spec.apiName)) {
      dimensions.push(spec.apiName);
    } else if (spec.legacyApiNames) {
      const legacyMatch = spec.legacyApiNames.find((legacyName) =>
        registeredDimApiNames.has(legacyName)
      );
      if (legacyMatch) {
        dimensions.push(legacyMatch);
      }
    }
  }

  const metrics: string[] = ['eventCount', 'totalUsers'];
  for (const metricSpec of DVIEW_GA4_CUSTOM_METRICS) {
    if (registeredMetricApiNames.has(metricSpec.apiName)) {
      metrics.push(metricSpec.apiName);
    }
  }

  const mode: AdTelemetryReportMode = coverage.coreComplete
    ? 'FULL_SLOT_BREAKDOWN'
    : coverage.registeredCoreDimensions.length > 0 ||
      coverage.registeredExtendedDimensions.length > 0 ||
      coverage.legacyAliasDimensions.length > 0
    ? 'PARTIAL_CUSTOM_BREAKDOWN'
    : 'PAGE_DEVICE_FALLBACK';

  return {
    mode,
    dimensions,
    metrics,
    coverage,
  };
}

export interface InteractionFunnelReportPlan {
  dimensions: string[];
  resolvedMap: Record<string, string>;
}

/**
 * Resolves metadata-safe interaction & funnel dimensions (`search_term`, `surface`, `view_type`,
 * `trigger`, `chapter_id`, `selected_apt`, `zone`, plus shared `apartment_name` / `dong`),
 * falling back to built-in GA4 dimensions (e.g. `searchTerm`) when `customEvent:search_term` is
 * unregistered and capping output at `MAX_GA4_REPORT_DIMENSIONS`.
 */
export function buildInteractionFunnelReportPlan(
  metadataDimensions: ReadonlyArray<Ga4MetadataFieldLike> = []
): InteractionFunnelReportPlan {
  const registeredDimApiNames = new Set(
    metadataDimensions
      .map((d) => (typeof d.apiName === 'string' ? d.apiName.trim() : ''))
      .filter((name) => name.length > 0)
  );

  const dimensions: string[] = [];
  const resolvedMap: Record<string, string> = {};

  const interactionSpecs: Ga4CustomDimensionSpec[] = [
    ...DVIEW_GA4_INTERACTION_DIMENSIONS,
    ...DVIEW_GA4_CUSTOM_DIMENSIONS.filter(
      (d) => d.parameterName === 'apartment_name' || d.parameterName === 'dong'
    ),
  ];

  for (const spec of interactionSpecs) {
    const resolved = resolveInteractionDimensionApiName(spec, registeredDimApiNames);
    if (!resolved) continue;
    resolvedMap[spec.parameterName] = resolved;
    if (dimensions.length < MAX_GA4_REPORT_DIMENSIONS && !dimensions.includes(resolved)) {
      dimensions.push(resolved);
    }
  }

  return {
    dimensions,
    resolvedMap,
  };
}

export interface AdTelemetryPageDeviceBucket {
  pagePath: string;
  deviceCategory: string;
  eventCount: number;
}

export interface AdTelemetrySlotEventBucket {
  slotId: string;
  placementSlotId: string;
  cpaCampaignId: string;
  eventType: string;
  apartmentName: string;
  userAgentCategory: string;
  eventCount: number;
}

export interface AdTelemetryReportSummary {
  totalAdTelemetryEvents: number;
  impressionEvents: number;
  viewableImpressionEvents: number;
  unclassifiedHistoricalEvents: number;
  byEventType: Record<string, number>;
  byCpaCampaign: Record<string, number>;
  byPageAndDevice: AdTelemetryPageDeviceBucket[];
  bySlotAndEventType: AdTelemetrySlotEventBucket[];
}

function normalizeDimVal(val: string | number | undefined): string {
  if (val === undefined || val === null) return '(not set)';
  const str = String(val).trim();
  return str.length === 0 ? '(not set)' : str;
}

/**
 * Aggregates normalized GA4 `ad_telemetry` report rows into page/device and slot/eventType breakdowns.
 */
export function summarizeAdTelemetryReportRows(
  rows: ReadonlyArray<Record<string, string | number>>
): AdTelemetryReportSummary {
  let totalAdTelemetryEvents = 0;
  let impressionEvents = 0;
  let viewableImpressionEvents = 0;
  let unclassifiedHistoricalEvents = 0;

  const byEventType: Record<string, number> = {};
  const byCpaCampaign: Record<string, number> = {};
  const pageDeviceMap = new Map<string, AdTelemetryPageDeviceBucket>();
  const slotEventMap = new Map<string, AdTelemetrySlotEventBucket>();

  for (const row of rows) {
    const rawCount = Number(row.eventCount ?? 0);
    const count = Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 0;
    if (count === 0) continue;

    totalAdTelemetryEvents += count;

    const pagePath = normalizeDimVal(row.pagePath);
    const deviceCategory = normalizeDimVal(row.deviceCategory);
    const slotId = normalizeDimVal(row['customEvent:slot_id']);
    const placementSlotId = normalizeDimVal(row['customEvent:placement_slot_id']);
    const canonicalCpa = normalizeDimVal(row['customEvent:cpa_campaign_id']);
    const legacyCpa = normalizeDimVal(row['customEvent:campaign_id']);
    const cpaCampaignId = canonicalCpa !== '(not set)' ? canonicalCpa : legacyCpa;
    const rawEventType = normalizeDimVal(row['customEvent:event_type']);
    const eventType =
      rawEventType === 'CLICK' && slotId.startsWith('guide_')
        ? 'GUIDE_PREVIEW_CLICK'
        : rawEventType;
    const apartmentName = normalizeDimVal(row['customEvent:apartment_name']);
    const userAgentCategory = normalizeDimVal(row['customEvent:user_agent_category']);

    if (eventType === 'IMPRESSION') {
      impressionEvents += count;
    }
    if (eventType === 'VIEWABLE_IMPRESSION') {
      viewableImpressionEvents += count;
    }
    if (eventType === '(not set)') {
      unclassifiedHistoricalEvents += count;
    }
    byEventType[eventType] = (byEventType[eventType] ?? 0) + count;
    if (cpaCampaignId !== '(not set)') {
      byCpaCampaign[cpaCampaignId] = (byCpaCampaign[cpaCampaignId] ?? 0) + count;
    }

    const pdKey = `${pagePath}\u0000${deviceCategory}`;
    const existingPd = pageDeviceMap.get(pdKey);
    if (existingPd) {
      existingPd.eventCount += count;
    } else {
      pageDeviceMap.set(pdKey, {
        pagePath,
        deviceCategory,
        eventCount: count,
      });
    }

    const hasAnySlotDimension =
      'customEvent:slot_id' in row ||
      'customEvent:event_type' in row ||
      'customEvent:apartment_name' in row ||
      'customEvent:user_agent_category' in row ||
      'customEvent:cpa_campaign_id' in row ||
      'customEvent:campaign_id' in row;

    if (hasAnySlotDimension) {
      const seKey = `${slotId}\u0000${placementSlotId}\u0000${cpaCampaignId}\u0000${eventType}\u0000${apartmentName}\u0000${userAgentCategory}`;
      const existingSe = slotEventMap.get(seKey);
      if (existingSe) {
        existingSe.eventCount += count;
      } else {
        slotEventMap.set(seKey, {
          slotId,
          placementSlotId,
          cpaCampaignId,
          eventType,
          apartmentName,
          userAgentCategory,
          eventCount: count,
        });
      }
    }
  }

  const byPageAndDevice = Array.from(pageDeviceMap.values()).sort(
    (a, b) => b.eventCount - a.eventCount || a.pagePath.localeCompare(b.pagePath)
  );
  const bySlotAndEventType = Array.from(slotEventMap.values()).sort(
    (a, b) => b.eventCount - a.eventCount || a.slotId.localeCompare(b.slotId)
  );

  return {
    totalAdTelemetryEvents,
    impressionEvents,
    viewableImpressionEvents,
    unclassifiedHistoricalEvents,
    byEventType,
    byCpaCampaign,
    byPageAndDevice,
    bySlotAndEventType,
  };
}

// ============================================================================
// Google Analytics Admin API v1beta Provisioning
// ============================================================================

export type Ga4SyncStatus =
  | 'SYNCED'
  | 'DRY_RUN'
  | 'MISSING_CREDENTIALS'
  | 'BLOCKED_ADMIN_API_DISABLED'
  | 'BLOCKED_INSUFFICIENT_ROLE'
  | 'API_ERROR';

export interface Ga4AdminSyncResult {
  ok: boolean;
  status: Ga4SyncStatus;
  propertyId: string;
  serviceAccountEmail?: string;
  dryRun: boolean;
  alreadyExistingDimensions: string[];
  createdDimensions: string[];
  plannedDimensions: string[];
  alreadyExistingMetrics: string[];
  createdMetrics: string[];
  plannedMetrics: string[];
  activationUrl?: string;
  remediationSteps: string[];
  errorMessage?: string;
}

export interface SyncGa4CustomDefinitionsOptions {
  propertyId?: string;
  clientEmail?: string;
  privateKey?: string;
  dryRun?: boolean;
  includeExtendedDimensions?: boolean;
  includeInteractionDimensions?: boolean;
  includeMetrics?: boolean;
  fetchFn?: typeof fetch;
  getAccessTokenFn?: (clientEmail: string, privateKey: string, scope: string) => Promise<string>;
}

function base64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export async function mintGoogleServiceAccountToken(
  clientEmail: string,
  privateKey: string,
  scope: string,
  fetchFn: typeof fetch = fetch
): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const signInput = `${base64url(Buffer.from(JSON.stringify(header)))}.${base64url(
    Buffer.from(JSON.stringify(payload))
  )}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  const signatureB64 = base64url(signer.sign(privateKey));
  const assertion = `${signInput}.${signatureB64}`;

  const res = await fetchFn('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OAuth token exchange failed (${res.status}): ${errText}`);
  }

  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) {
    throw new Error('OAuth token response missing access_token');
  }
  return body.access_token;
}

const Ga4RpcErrorSchema = z
  .object({
    error: z
      .object({
        code: z.number().optional(),
        message: z.string().optional(),
        status: z.string().optional(),
        details: z
          .array(
            z
              .object({
                '@type': z.string().optional(),
                reason: z.string().optional(),
                metadata: z.record(z.string(), z.string()).optional(),
                links: z
                  .array(z.object({ url: z.string().optional() }).passthrough())
                  .optional(),
              })
              .passthrough()
          )
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

interface ParsedAdminApiError {
  status: number;
  isServiceDisabled: boolean;
  isAlreadyExists: boolean;
  isPermissionDenied: boolean;
  activationUrl?: string;
  message: string;
}

function classifyAdminApiError(status: number, rawBody: unknown): ParsedAdminApiError {
  const parsed = Ga4RpcErrorSchema.safeParse(rawBody);
  const rpcErr = parsed.success ? parsed.data.error : undefined;
  const message =
    rpcErr?.message ||
    (typeof rawBody === 'string' && rawBody.length > 0
      ? rawBody
      : `Google Analytics Admin API HTTP ${status}`);
  const rpcStatus = rpcErr?.status || '';
  const details = rpcErr?.details || [];

  let reason = '';
  let activationUrl: string | undefined;

  for (const d of details) {
    if (d.reason) {
      reason = d.reason;
    }
    if (d.metadata?.activationUrl) {
      activationUrl = d.metadata.activationUrl;
    }
    if (!activationUrl && Array.isArray(d.links)) {
      const firstUrl = d.links.find((l) => typeof l.url === 'string' && l.url.length > 0)?.url;
      if (firstUrl) {
        activationUrl = firstUrl;
      }
    }
  }

  if (!activationUrl) {
    const urlMatch = message.match(
      /https:\/\/console\.developers\.google\.com\/apis\/api\/analyticsadmin\.googleapis\.com\/overview\?project=\d+/
    );
    if (urlMatch) {
      activationUrl = urlMatch[0];
    }
  }

  const lowerMsg = message.toLowerCase();
  const isServiceDisabled =
    reason === 'SERVICE_DISABLED' ||
    lowerMsg.includes('analyticsadmin.googleapis.com') &&
      (lowerMsg.includes('has not been used') || lowerMsg.includes('is disabled'));

  const isAlreadyExists =
    status === 409 ||
    rpcStatus === 'ALREADY_EXISTS' ||
    lowerMsg.includes('already exists');

  const isPermissionDenied =
    !isServiceDisabled &&
    (status === 403 || rpcStatus === 'PERMISSION_DENIED');

  return {
    status,
    isServiceDisabled,
    isAlreadyExists,
    isPermissionDenied,
    activationUrl,
    message,
  };
}

async function readSafeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function listPaginatedParameterNames(
  endpointUrl: string,
  listField: 'customDimensions' | 'customMetrics',
  accessToken: string,
  fetchFn: typeof fetch
): Promise<
  | { ok: true; parameterNames: Set<string>; displayNamesLower: Set<string> }
  | { ok: false; error: ParsedAdminApiError }
> {
  const parameterNames = new Set<string>();
  const displayNamesLower = new Set<string>();
  let pageToken = '';

  for (let page = 0; page < MAX_PAGINATION_PAGES; page++) {
    const url = new URL(endpointUrl);
    url.searchParams.set('pageSize', '200');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const res = await fetchFn(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    const body = await readSafeJson(res);
    if (!res.ok) {
      return {
        ok: false,
        error: classifyAdminApiError(res.status, body),
      };
    }

    const record = (typeof body === 'object' && body !== null ? body : {}) as Record<
      string,
      unknown
    >;
    const items = Array.isArray(record[listField]) ? record[listField] : [];
    for (const item of items) {
      if (typeof item === 'object' && item !== null) {
        const typedItem = item as { parameterName?: unknown; displayName?: unknown };
        if (typeof typedItem.parameterName === 'string') {
          parameterNames.add(typedItem.parameterName.trim());
        }
        if (listField === 'customDimensions' && typeof typedItem.displayName === 'string') {
          const dn = typedItem.displayName.trim().toLowerCase();
          if (dn.length > 0) {
            displayNamesLower.add(dn);
          }
        }
      }
    }

    const next =
      typeof record.nextPageToken === 'string' ? record.nextPageToken.trim() : '';
    if (!next) {
      break;
    }
    pageToken = next;
  }

  return { ok: true, parameterNames, displayNamesLower };
}

/**
 * Idempotently provisions D-VIEW's `ad_telemetry` event-scoped custom dimensions and custom metrics
 * on the target GA4 property via Google Analytics Admin API v1beta.
 */
export async function syncGa4CustomDefinitions(
  options: SyncGa4CustomDefinitionsOptions = {}
): Promise<Ga4AdminSyncResult> {
  const propertyId = (
    options.propertyId ||
    process.env.GA_PROPERTY_ID ||
    DEFAULT_DVIEW_GA4_PROPERTY_ID
  ).trim();

  if (!/^\d+$/.test(propertyId)) {
    return {
      ok: false,
      status: 'API_ERROR',
      propertyId,
      dryRun: Boolean(options.dryRun),
      alreadyExistingDimensions: [],
      createdDimensions: [],
      plannedDimensions: [],
      alreadyExistingMetrics: [],
      createdMetrics: [],
      plannedMetrics: [],
      remediationSteps: ['GA_PROPERTY_ID 값을 숫자 형식(예: 527874632)으로 지정해 주세요.'],
      errorMessage: `Invalid numeric GA4 propertyId: "${propertyId}"`,
    };
  }

  const clientEmail = (
    options.clientEmail ??
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ??
    ''
  ).trim();
  const rawPrivateKey =
    options.privateKey ?? process.env.GOOGLE_PRIVATE_KEY ?? '';
  const privateKey = rawPrivateKey
    .replace(/^"|"$/g, '')
    .replace(/\\n/g, '\n')
    .trim();

  const dryRun = Boolean(options.dryRun);
  const includeExtendedDimensions = options.includeExtendedDimensions ?? true;
  const includeInteractionDimensions = options.includeInteractionDimensions ?? false;
  const includeMetrics = options.includeMetrics ?? true;
  const fetchFn = options.fetchFn ?? fetch;

  if (!clientEmail || !privateKey) {
    return {
      ok: false,
      status: 'MISSING_CREDENTIALS',
      propertyId,
      dryRun,
      alreadyExistingDimensions: [],
      createdDimensions: [],
      plannedDimensions: [],
      alreadyExistingMetrics: [],
      createdMetrics: [],
      plannedMetrics: [],
      remediationSteps: [
        'frontend/.env.local에 GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GA_PROPERTY_ID 환경변수를 설정해 주세요.',
      ],
      errorMessage: 'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY',
    };
  }

  const targetDimensions = [
    ...DVIEW_GA4_CUSTOM_DIMENSIONS.filter((d) => d.requiredCore || includeExtendedDimensions),
    ...(includeInteractionDimensions ? DVIEW_GA4_INTERACTION_DIMENSIONS : []),
  ];
  const targetMetrics = includeMetrics ? DVIEW_GA4_CUSTOM_METRICS : [];

  const buildFailureFromParsedError = (
    err: ParsedAdminApiError,
    partial?: Partial<
      Pick<
        Ga4AdminSyncResult,
        | 'alreadyExistingDimensions'
        | 'createdDimensions'
        | 'alreadyExistingMetrics'
        | 'createdMetrics'
      >
    >
  ): Ga4AdminSyncResult => {
    if (err.isServiceDisabled) {
      const activationUrl =
        err.activationUrl ||
        'https://console.developers.google.com/apis/api/analyticsadmin.googleapis.com/overview';
      return {
        ok: false,
        status: 'BLOCKED_ADMIN_API_DISABLED',
        propertyId,
        serviceAccountEmail: clientEmail,
        dryRun,
        alreadyExistingDimensions: partial?.alreadyExistingDimensions ?? [],
        createdDimensions: partial?.createdDimensions ?? [],
        plannedDimensions: targetDimensions.map((d) => d.parameterName),
        alreadyExistingMetrics: partial?.alreadyExistingMetrics ?? [],
        createdMetrics: partial?.createdMetrics ?? [],
        plannedMetrics: targetMetrics.map((m) => m.parameterName),
        activationUrl,
        remediationSteps: [
          `1. GCP 콘솔에서 Google Analytics Admin API를 활성화합니다: ${activationUrl}`,
          `2. GA4 관리 -> 속성 액세스 관리(속성 ID: ${propertyId})에서 서비스 계정(${clientEmail})의 역할을 '편집자(Editor)'로 지정합니다.`,
          '3. 반영(약 2~3분) 후 `npm run ga4:sync-dimensions` 명령을 다시 실행하면 누락된 맞춤 측정기준·측정항목이 멱등(Idempotent)하게 자동 등록됩니다.',
        ],
        errorMessage: err.message,
      };
    }

    if (err.isPermissionDenied) {
      return {
        ok: false,
        status: 'BLOCKED_INSUFFICIENT_ROLE',
        propertyId,
        serviceAccountEmail: clientEmail,
        dryRun,
        alreadyExistingDimensions: partial?.alreadyExistingDimensions ?? [],
        createdDimensions: partial?.createdDimensions ?? [],
        plannedDimensions: targetDimensions.map((d) => d.parameterName),
        alreadyExistingMetrics: partial?.alreadyExistingMetrics ?? [],
        createdMetrics: partial?.createdMetrics ?? [],
        plannedMetrics: targetMetrics.map((m) => m.parameterName),
        remediationSteps: [
          `1. GA4 관리 -> 속성 액세스 관리(속성 ID: ${propertyId})에서 서비스 계정(${clientEmail})에 '편집자(Editor)' 권한을 부여해 주세요 (현재 조회자 권한만 있을 경우 생성이 거부됩니다).`,
          '2. 권한 부여 후 `npm run ga4:sync-dimensions`를 재실행해 주세요.',
        ],
        errorMessage: err.message,
      };
    }

    return {
      ok: false,
      status: 'API_ERROR',
      propertyId,
      serviceAccountEmail: clientEmail,
      dryRun,
      alreadyExistingDimensions: partial?.alreadyExistingDimensions ?? [],
      createdDimensions: partial?.createdDimensions ?? [],
      plannedDimensions: [],
      alreadyExistingMetrics: partial?.alreadyExistingMetrics ?? [],
      createdMetrics: partial?.createdMetrics ?? [],
      plannedMetrics: [],
      remediationSteps: ['네트워크 상태 및 GA4 속성 ID와 서비스 계정 키 유효성을 확인해 주세요.'],
      errorMessage: err.message,
    };
  };

  let accessToken: string;
  try {
    const tokenScope = 'https://www.googleapis.com/auth/analytics.edit';
    accessToken = options.getAccessTokenFn
      ? await options.getAccessTokenFn(clientEmail, privateKey, tokenScope)
      : await mintGoogleServiceAccountToken(clientEmail, privateKey, tokenScope, fetchFn);
  } catch (err) {
    return {
      ok: false,
      status: 'API_ERROR',
      propertyId,
      serviceAccountEmail: clientEmail,
      dryRun,
      alreadyExistingDimensions: [],
      createdDimensions: [],
      plannedDimensions: [],
      alreadyExistingMetrics: [],
      createdMetrics: [],
      plannedMetrics: [],
      remediationSteps: ['GOOGLE_PRIVATE_KEY PEM 형식 및 서비스 계정 이메일을 확인해 주세요.'],
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }

  const baseAdminUrl = `https://analyticsadmin.googleapis.com/v1beta/properties/${propertyId}`;
  const dimsListRes = await listPaginatedParameterNames(
    `${baseAdminUrl}/customDimensions`,
    'customDimensions',
    accessToken,
    fetchFn
  );
  if (!dimsListRes.ok) {
    return buildFailureFromParsedError(dimsListRes.error);
  }

  const existingDimNames = dimsListRes.parameterNames;
  const alreadyExistingDimensions: string[] = [];
  const missingDimensions: Ga4CustomDimensionSpec[] = [];

  for (const spec of targetDimensions) {
    if (existingDimNames.has(spec.parameterName)) {
      alreadyExistingDimensions.push(spec.parameterName);
    } else {
      missingDimensions.push(spec);
    }
  }

  const alreadyExistingMetrics: string[] = [];
  const missingMetrics: Ga4CustomMetricSpec[] = [];

  if (targetMetrics.length > 0) {
    const metricsListRes = await listPaginatedParameterNames(
      `${baseAdminUrl}/customMetrics`,
      'customMetrics',
      accessToken,
      fetchFn
    );
    if (!metricsListRes.ok) {
      return buildFailureFromParsedError(metricsListRes.error, {
        alreadyExistingDimensions,
      });
    }
    const existingMetricNames = metricsListRes.parameterNames;
    for (const metricSpec of targetMetrics) {
      if (existingMetricNames.has(metricSpec.parameterName)) {
        alreadyExistingMetrics.push(metricSpec.parameterName);
      } else {
        missingMetrics.push(metricSpec);
      }
    }
  }

  if (dryRun) {
    return {
      ok: true,
      status: 'DRY_RUN',
      propertyId,
      serviceAccountEmail: clientEmail,
      dryRun: true,
      alreadyExistingDimensions,
      createdDimensions: [],
      plannedDimensions: missingDimensions.map((d) => d.parameterName),
      alreadyExistingMetrics,
      createdMetrics: [],
      plannedMetrics: missingMetrics.map((m) => m.parameterName),
      remediationSteps: [],
    };
  }

  const createdDimensions: string[] = [];
  const extraNotes: string[] = [];
  const existingDisplayNamesLower = dimsListRes.displayNamesLower;

  const postDimension = async (
    spec: Ga4CustomDimensionSpec,
    displayName: string
  ): Promise<{ ok: true } | { ok: false; parsedErr: ParsedAdminApiError }> => {
    const createRes = await fetchFn(`${baseAdminUrl}/customDimensions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        parameterName: spec.parameterName,
        displayName,
        description: spec.description,
        scope: spec.scope,
      }),
    });
    const body = await readSafeJson(createRes);
    if (createRes.ok) {
      return { ok: true };
    }
    return { ok: false, parsedErr: classifyAdminApiError(createRes.status, body) };
  };

  for (const spec of missingDimensions) {
    const disambiguatedName = `${spec.displayName} (${spec.parameterName})`.slice(0, 82);
    const effectiveDisplayName = existingDisplayNamesLower.has(
      spec.displayName.trim().toLowerCase()
    )
      ? disambiguatedName
      : spec.displayName;

    let attempt = await postDimension(spec, effectiveDisplayName);
    let finalDisplayName = effectiveDisplayName;

    if (!attempt.ok) {
      const lowerErrMsg = attempt.parsedErr.message.toLowerCase();
      const isDisplayNameCollision =
        (lowerErrMsg.includes('display_name') || lowerErrMsg.includes('display name')) &&
        finalDisplayName !== disambiguatedName;

      if (isDisplayNameCollision) {
        finalDisplayName = disambiguatedName;
        attempt = await postDimension(spec, finalDisplayName);
      }
    }

    if (attempt.ok) {
      existingDisplayNamesLower.add(finalDisplayName.trim().toLowerCase());
      createdDimensions.push(spec.parameterName);
      continue;
    }

    const parsedErr = attempt.parsedErr;
    const lowerErrMsg = parsedErr.message.toLowerCase();
    const isDisplayNameError =
      lowerErrMsg.includes('display_name') || lowerErrMsg.includes('display name');

    if (parsedErr.isAlreadyExists && !isDisplayNameError) {
      alreadyExistingDimensions.push(spec.parameterName);
      continue;
    }

    if (parsedErr.status === 400 && spec.builtInApiName) {
      alreadyExistingDimensions.push(spec.parameterName);
      extraNotes.push(
        `"${spec.parameterName}" 파라미터는 GA4 기본 측정기준(${spec.builtInApiName})으로 자동 매핑되어 별도 생성 없이 조회 가능합니다.`
      );
      continue;
    }

    return buildFailureFromParsedError(parsedErr, {
      alreadyExistingDimensions,
      createdDimensions,
      alreadyExistingMetrics,
    });
  }

  const createdMetrics: string[] = [];
  for (const metricSpec of missingMetrics) {
    const createRes = await fetchFn(`${baseAdminUrl}/customMetrics`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        parameterName: metricSpec.parameterName,
        displayName: metricSpec.displayName,
        description: metricSpec.description,
        scope: metricSpec.scope,
        measurementUnit: metricSpec.measurementUnit,
      }),
    });

    const body = await readSafeJson(createRes);
    if (createRes.ok) {
      createdMetrics.push(metricSpec.parameterName);
      continue;
    }

    const parsedErr = classifyAdminApiError(createRes.status, body);
    if (parsedErr.isAlreadyExists) {
      alreadyExistingMetrics.push(metricSpec.parameterName);
      continue;
    }

    return buildFailureFromParsedError(parsedErr, {
      alreadyExistingDimensions,
      createdDimensions,
      alreadyExistingMetrics,
      createdMetrics,
    });
  }

  const remediationSteps = [...extraNotes];
  if (createdDimensions.length > 0 || createdMetrics.length > 0) {
    remediationSteps.push(
      '신규 등록된 GA4 맞춤 측정기준·측정항목은 GA4 스키마 전파 후(최대 24~48시간) Data API 리포트에 집계됩니다.'
    );
  }

  return {
    ok: true,
    status: 'SYNCED',
    propertyId,
    serviceAccountEmail: clientEmail,
    dryRun: false,
    alreadyExistingDimensions,
    createdDimensions,
    plannedDimensions: [],
    alreadyExistingMetrics,
    createdMetrics,
    plannedMetrics: [],
    remediationSteps,
  };
}
