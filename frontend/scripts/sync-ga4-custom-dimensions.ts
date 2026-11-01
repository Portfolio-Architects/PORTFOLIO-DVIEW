/**
 * @file scripts/sync-ga4-custom-dimensions.ts
 * @description CLI provisioner & live verifier for D-VIEW GA4 `ad_telemetry` Custom Dimensions & Metrics.
 * Usage:
 *   npm run ga4:sync-dimensions
 *   npm run ga4:sync-dimensions -- --dry-run
 *   npm run ga4:sync-dimensions -- --core-only
 *   npm run ga4:sync-dimensions -- --json
 */
import path from 'path';
import dotenv from 'dotenv';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import {
  DEFAULT_DVIEW_GA4_PROPERTY_ID,
  buildAdTelemetryReportPlan,
  summarizeAdTelemetryReportRows,
  syncGa4CustomDefinitions,
} from '@/lib/services/ga4CustomDimensions';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

interface CliFlags {
  dryRun: boolean;
  coreOnly: boolean;
  includeMetrics: boolean;
  jsonOutput: boolean;
  strictExit: boolean;
  propertyId: string;
}

function parseCliFlags(argv: string[]): CliFlags {
  let dryRun = false;
  let coreOnly = false;
  let includeMetrics = true;
  let jsonOutput = false;
  let strictExit = false;
  let propertyId = (process.env.GA_PROPERTY_ID || DEFAULT_DVIEW_GA4_PROPERTY_ID).trim();

  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--core-only') coreOnly = true;
    else if (arg === '--no-metrics') includeMetrics = false;
    else if (arg === '--json') jsonOutput = true;
    else if (arg === '--strict') strictExit = true;
    else if (arg.startsWith('--property=')) {
      propertyId = arg.slice('--property='.length).trim();
    }
  }

  return {
    dryRun,
    coreOnly,
    includeMetrics,
    jsonOutput,
    strictExit,
    propertyId,
  };
}

async function fetchLiveDataApiSnapshot(propertyId: string) {
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
  const key = (process.env.GOOGLE_PRIVATE_KEY || '')
    .replace(/^"|"$/g, '')
    .replace(/\\n/g, '\n')
    .trim();

  if (!email || !key) {
    return null;
  }

  const client = new BetaAnalyticsDataClient({
    credentials: { client_email: email, private_key: key },
  });

  const [metadata] = await client.getMetadata({
    name: `properties/${propertyId}/metadata`,
  });

  const plan = buildAdTelemetryReportPlan(
    metadata.dimensions || [],
    metadata.metrics || []
  );

  const [report] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensions: plan.dimensions.map((name) => ({ name })),
    metrics: plan.metrics.map((name) => ({ name })),
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: {
          matchType: 'EXACT',
          value: 'ad_telemetry',
        },
      },
    },
    limit: 250,
  });

  interface Ga4HeaderLike {
    name?: string | null;
  }
  interface Ga4RowLike {
    dimensionValues?: Array<{ value?: string | null }> | null;
    metricValues?: Array<{ value?: string | null }> | null;
  }

  const dimHeaders = (report.dimensionHeaders || []) as Ga4HeaderLike[];
  const metHeaders = (report.metricHeaders || []) as Ga4HeaderLike[];
  const rows = (report.rows || []) as Ga4RowLike[];

  const dimNames = dimHeaders.map(
    (h: Ga4HeaderLike, idx: number) => h.name || `dimension_${idx}`
  );
  const metNames = metHeaders.map(
    (h: Ga4HeaderLike, idx: number) => h.name || `metric_${idx}`
  );

  const normalizedRows: Array<Record<string, string | number>> = rows.map(
    (row: Ga4RowLike) => {
      const rec: Record<string, string | number> = {};
      (row.dimensionValues || []).forEach((dv: { value?: string | null }, idx: number) => {
        rec[dimNames[idx] || `dimension_${idx}`] = dv.value ?? '';
      });
      (row.metricValues || []).forEach((mv: { value?: string | null }, idx: number) => {
        const raw = mv.value ?? '0';
        const num = Number(raw);
        rec[metNames[idx] || `metric_${idx}`] = Number.isNaN(num) ? raw : num;
      });
      return rec;
    }
  );

  const summary = summarizeAdTelemetryReportRows(normalizedRows);
  return {
    plan,
    summary,
  };
}

async function main() {
  const flags = parseCliFlags(process.argv.slice(2));

  let dataSnapshot: Awaited<ReturnType<typeof fetchLiveDataApiSnapshot>> = null;
  let dataApiError: string | undefined;

  try {
    dataSnapshot = await fetchLiveDataApiSnapshot(flags.propertyId);
  } catch (err) {
    dataApiError = err instanceof Error ? err.message : String(err);
  }

  const syncResult = await syncGa4CustomDefinitions({
    propertyId: flags.propertyId,
    dryRun: flags.dryRun,
    includeExtendedDimensions: !flags.coreOnly,
    includeMetrics: flags.includeMetrics,
  });

  if (flags.jsonOutput) {
    console.log(
      JSON.stringify(
        {
          propertyId: flags.propertyId,
          dataApiSnapshot: dataSnapshot,
          dataApiError,
          adminSyncResult: syncResult,
        },
        null,
        2
      )
    );
    if (!syncResult.ok && flags.strictExit) {
      process.exit(1);
    }
    return;
  }

  console.log(`\n=== [D-VIEW GA4 맞춤 측정기준 동기화 및 ad_telemetry 진단] (속성 ID: ${flags.propertyId}) ===`);

  if (dataSnapshot) {
    const { plan, summary } = dataSnapshot;
    console.log(
      `[Data API 메타데이터] 모드: ${plan.mode} | 핵심 측정기준 등록: ${plan.coverage.registeredCoreDimensions.length}/4개`
    );
    if (plan.coverage.missingCoreDimensions.length > 0) {
      console.log(`  - 미등록 핵심 측정기준: ${plan.coverage.missingCoreDimensions.join(', ')}`);
    }
    if (plan.coverage.missingExtendedDimensions.length > 0) {
      console.log(`  - 미등록 확장 측정기준: ${plan.coverage.missingExtendedDimensions.join(', ')}`);
    }
    console.log(
      `[최근 30일 ad_telemetry 실측] 총 ${summary.totalAdTelemetryEvents}건 | IMPRESSION: ${summary.impressionEvents}건 | VIEWABLE_IMPRESSION: ${summary.viewableImpressionEvents}건`
    );
    for (const item of summary.byPageAndDevice.slice(0, 10)) {
      console.log(`  - ${item.pagePath} (${item.deviceCategory}): ${item.eventCount}건`);
    }
    if (summary.bySlotAndEventType.length > 0) {
      console.log('[슬롯별·이벤트별 세부 집계]');
      for (const item of summary.bySlotAndEventType.slice(0, 15)) {
        console.log(
          `  - slot=${item.slotId} (placement=${item.placementSlotId}) | type=${item.eventType} | apt=${item.apartmentName} | ua=${item.userAgentCategory}: ${item.eventCount}건`
        );
      }
    }
  } else if (dataApiError) {
    console.log(`[Data API 조회 참고] ${dataApiError}`);
  }

  console.log(`\n=== [Admin API v1beta 맞춤 측정기준 프로비저닝 결과: ${syncResult.status}] ===`);
  if (syncResult.ok) {
    console.log(`- 기존 등록 측정기준 (${syncResult.alreadyExistingDimensions.length}개): ${syncResult.alreadyExistingDimensions.join(', ') || '없음'}`);
    if (syncResult.dryRun) {
      console.log(`- 등록 예정 측정기준 (${syncResult.plannedDimensions.length}개): ${syncResult.plannedDimensions.join(', ') || '없음'}`);
      console.log(`- 등록 예정 측정항목 (${syncResult.plannedMetrics.length}개): ${syncResult.plannedMetrics.join(', ') || '없음'}`);
    } else {
      console.log(`- 신규 생성 측정기준 (${syncResult.createdDimensions.length}개): ${syncResult.createdDimensions.join(', ') || '없음'}`);
      console.log(`- 신규 생성 측정항목 (${syncResult.createdMetrics.length}개): ${syncResult.createdMetrics.join(', ') || '없음'}`);
    }
  } else {
    if (syncResult.serviceAccountEmail) {
      console.log(`- 서비스 계정: ${syncResult.serviceAccountEmail}`);
    }
    if (syncResult.activationUrl) {
      console.log(`- 1-Click Admin API 활성화 URL: ${syncResult.activationUrl}`);
    }
    if (syncResult.plannedDimensions.length > 0) {
      console.log(`- 자동 등록 대기 측정기준: ${syncResult.plannedDimensions.join(', ')}`);
    }
    if (syncResult.plannedMetrics.length > 0) {
      console.log(`- 자동 등록 대기 측정항목: ${syncResult.plannedMetrics.join(', ')}`);
    }
  }

  if (syncResult.remediationSteps.length > 0) {
    console.log('\n[후속 조치 안내]');
    for (const step of syncResult.remediationSteps) {
      console.log(`  ${step}`);
    }
  }

  if (!syncResult.ok && flags.strictExit) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
