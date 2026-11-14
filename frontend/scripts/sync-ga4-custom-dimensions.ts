/**
 * @file scripts/sync-ga4-custom-dimensions.ts
 * @description CLI provisioner & live verifier for D-VIEW GA4 `ad_telemetry` Custom Dimensions & Metrics.
 * Usage:
 *   npm run ga4:sync-dimensions
 *   npm run ga4:sync-dimensions -- --dry-run
 *   npm run ga4:sync-dimensions -- --core-only
 *   npm run ga4:sync-dimensions -- --json
 */
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import https from 'https';
import path from 'path';
import zlib from 'zlib';
import dotenv from 'dotenv';
import {
  DEFAULT_DVIEW_GA4_PROPERTY_ID,
  buildAdTelemetryReportPlan,
  mintGoogleServiceAccountToken,
  summarizeAdTelemetryReportRows,
  syncGa4CustomDefinitions,
  type Ga4MetadataFieldLike,
} from '@/lib/services/ga4CustomDimensions';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

const ipv4Agent = new https.Agent({
  keepAlive: true,
  family: 4,
  maxSockets: 4,
  keepAliveMsecs: 10000,
});

const IPV4_CONNECT_TIMEOUT_MS = 3500;
const IPV4_READ_TIMEOUT_MS = 25000;

function decompressIpv4Body(
  buf: Buffer,
  contentEncoding: string | string[] | undefined
): string {
  const enc = (
    Array.isArray(contentEncoding)
      ? contentEncoding[0] ?? ''
      : contentEncoding ?? ''
  )
    .toLowerCase()
    .trim();
  if (enc === 'gzip') {
    return zlib.gunzipSync(buf).toString('utf8');
  }
  if (enc === 'deflate') {
    return zlib.inflateSync(buf).toString('utf8');
  }
  return buf.toString('utf8');
}

function executeSingleIpv4Fetch(
  url: URL,
  method: string,
  baseHeaders: Record<string, string>,
  bodyBuf: Buffer | undefined,
  useKeepAliveAgent: boolean
): Promise<{
  response?: Response;
  error?: Error;
  tlsConnected: boolean;
  reusedSocket: boolean;
}> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const headers: Record<string, string> = {
      'Accept-Encoding': 'identity',
      ...baseHeaders,
    };
    if (!useKeepAliveAgent) {
      headers['Connection'] = 'close';
    }
    if (bodyBuf && !headers['content-length'] && !headers['Content-Length']) {
      headers['content-length'] = String(bodyBuf.byteLength);
    }

    let settled = false;
    let tlsConnected = false;
    let headersReceived = false;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;
    let readTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanupTimers = () => {
      if (connectTimer) {
        clearTimeout(connectTimer);
        connectTimer = null;
      }
      if (readTimer) {
        clearTimeout(readTimer);
        readTimer = null;
      }
    };

    const finish = (result: {
      response?: Response;
      error?: Error;
      tlsConnected: boolean;
      reusedSocket: boolean;
    }) => {
      if (settled) return;
      settled = true;
      cleanupTimers();
      resolve(result);
    };

    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        servername: url.hostname,
        port: url.port ? Number(url.port) : 443,
        path: `${url.pathname}${url.search}`,
        method,
        headers,
        family: 4,
        agent: useKeepAliveAgent ? ipv4Agent : false,
      },
      (res) => {
        headersReceived = true;
        tlsConnected = true;
        if (connectTimer) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer | string) => {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        });
        res.on('end', () => {
          const outHeaders = new Headers();
          for (const [k, v] of Object.entries(res.headers)) {
            if (typeof v === 'string') {
              outHeaders.set(k, v);
            } else if (Array.isArray(v)) {
              outHeaders.set(k, v.join(', '));
            }
          }
          const rawBuf = Buffer.concat(chunks);
          let text = '';
          try {
            text = decompressIpv4Body(rawBuf, res.headers['content-encoding']);
          } catch {
            text = rawBuf.toString('utf8');
          }
          finish({
            response: new Response(text, {
              status: res.statusCode || 500,
              headers: outHeaders,
            }),
            tlsConnected,
            reusedSocket: Boolean(req.reusedSocket),
          });
        });
      }
    );

    const armReadTimer = () => {
      if (readTimer) return;
      readTimer = setTimeout(() => {
        const err = new Error(
          `IPv4 HTTPS read timed out after ${Date.now() - t0}ms (${url.hostname}${url.pathname})`
        );
        req.destroy(err);
        finish({
          error: err,
          tlsConnected: true,
          reusedSocket: Boolean(req.reusedSocket),
        });
      }, IPV4_READ_TIMEOUT_MS);
    };

    connectTimer = setTimeout(() => {
      if (!tlsConnected) {
        const err = new Error(
          `IPv4 HTTPS connect timed out after ${Date.now() - t0}ms (${url.hostname}${url.pathname})`
        );
        req.destroy(err);
        finish({
          error: err,
          tlsConnected: false,
          reusedSocket: Boolean(req.reusedSocket),
        });
      }
    }, IPV4_CONNECT_TIMEOUT_MS);

    req.on('socket', (sock) => {
      const tlsSocket = sock as { encrypted?: boolean; connecting?: boolean };
      if (req.reusedSocket && tlsSocket.encrypted && !tlsSocket.connecting) {
        tlsConnected = true;
        if (connectTimer) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }
        armReadTimer();
      } else {
        sock.once('secureConnect', () => {
          tlsConnected = true;
          if (connectTimer) {
            clearTimeout(connectTimer);
            connectTimer = null;
          }
          armReadTimer();
        });
      }
    });

    req.on('error', (err) => {
      finish({
        error: err instanceof Error ? err : new Error(String(err)),
        tlsConnected: tlsConnected || headersReceived,
        reusedSocket: Boolean(req.reusedSocket),
      });
    });

    if (bodyBuf) {
      req.write(bodyBuf);
    }
    req.end();
  });
}

/**
 * Forces OS-level IPv4 sockets (`family: 4`) with two-tier connect/read timeouts
 * and a single fresh-socket retry on pre-TLS failures or stale keep-alive resets.
 */
async function ipv4Fetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const url = new URL(typeof input === 'string' ? input : input.toString());
  const method = (init.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {};

  if (init.headers) {
    new Headers(init.headers).forEach((val, key) => {
      headers[key] = val;
    });
  }

  let bodyBuf: Buffer | undefined;
  if (init.body !== undefined && init.body !== null) {
    const bodyStr =
      init.body instanceof URLSearchParams ? init.body.toString() : String(init.body);
    if (bodyStr.length > 0) {
      bodyBuf = Buffer.from(bodyStr, 'utf8');
    }
  }

  const first = await executeSingleIpv4Fetch(url, method, headers, bodyBuf, true);
  if (first.response) {
    return first.response;
  }

  const firstErr = first.error ?? new Error('Unknown IPv4 fetch error');
  const isPreTlsFailure = !first.tlsConnected;
  const isStaleKeepAliveReset =
    first.reusedSocket &&
    /ECONNRESET|socket hang up|EPIPE|ECONNABORTED/i.test(firstErr.message);

  if (!isPreTlsFailure && !isStaleKeepAliveReset) {
    throw firstErr;
  }

  const second = await executeSingleIpv4Fetch(url, method, headers, bodyBuf, false);
  if (second.response) {
    return second.response;
  }
  throw second.error ?? firstErr;
}

interface CliFlags {
  dryRun: boolean;
  coreOnly: boolean;
  includeInteraction: boolean;
  includeMetrics: boolean;
  jsonOutput: boolean;
  strictExit: boolean;
  propertyId: string;
}

function parseCliFlags(argv: string[]): CliFlags {
  let dryRun = false;
  let coreOnly = false;
  let includeInteraction = true;
  let includeMetrics = true;
  let jsonOutput = false;
  let strictExit = false;
  let propertyId = (process.env.GA_PROPERTY_ID || DEFAULT_DVIEW_GA4_PROPERTY_ID).trim();

  for (const arg of argv) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--core-only') coreOnly = true;
    else if (arg === '--no-interaction') includeInteraction = false;
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
    includeInteraction,
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

  const accessToken = await mintGoogleServiceAccountToken(
    email,
    key,
    'https://www.googleapis.com/auth/analytics.readonly',
    ipv4Fetch
  );

  const metaRes = await ipv4Fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}/metadata`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    }
  );
  if (!metaRes.ok) {
    throw new Error(`GA4 metadata REST HTTP ${metaRes.status}: ${await metaRes.text()}`);
  }
  const metadata = (await metaRes.json()) as {
    dimensions?: Ga4MetadataFieldLike[];
    metrics?: Ga4MetadataFieldLike[];
  };

  const plan = buildAdTelemetryReportPlan(
    metadata.dimensions || [],
    metadata.metrics || []
  );

  const reportRes = await ipv4Fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
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
      }),
    }
  );
  if (!reportRes.ok) {
    throw new Error(`GA4 runReport REST HTTP ${reportRes.status}: ${await reportRes.text()}`);
  }

  interface Ga4HeaderLike {
    name?: string | null;
  }
  interface Ga4RowLike {
    dimensionValues?: Array<{ value?: string | null }> | null;
    metricValues?: Array<{ value?: string | null }> | null;
  }

  const report = (await reportRes.json()) as {
    dimensionHeaders?: Ga4HeaderLike[] | null;
    metricHeaders?: Ga4HeaderLike[] | null;
    rows?: Ga4RowLike[] | null;
  };

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
  try {
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
      includeInteractionDimensions: !flags.coreOnly && flags.includeInteraction,
      includeMetrics: flags.includeMetrics,
      fetchFn: ipv4Fetch,
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
        `[Data API 메타데이터] 모드: ${plan.mode} | 핵심 측정기준 등록: ${plan.coverage.registeredCoreDimensions.length}/4개 | 탐색·검색 측정기준: ${plan.coverage.registeredInteractionDimensions.length}/${plan.coverage.registeredInteractionDimensions.length + plan.coverage.missingInteractionDimensions.length}개`
      );
      if (plan.coverage.missingCoreDimensions.length > 0) {
        console.log(`  - 미등록 핵심 측정기준: ${plan.coverage.missingCoreDimensions.join(', ')}`);
      }
      if (plan.coverage.missingExtendedDimensions.length > 0) {
        console.log(`  - 미등록 확장 측정기준: ${plan.coverage.missingExtendedDimensions.join(', ')}`);
      }
      if (plan.coverage.legacyAliasDimensions.length > 0) {
        console.log(
          `  - 레거시 별칭 폴백 활성: ${plan.coverage.legacyAliasDimensions
            .map((a) => `${a.parameterName} <- ${a.activeLegacyApiName}`)
            .join(', ')}`
        );
      }
      if (plan.coverage.missingInteractionDimensions.length > 0) {
        console.log(
          `  - 미등록 탐색·검색 측정기준: ${plan.coverage.missingInteractionDimensions.join(', ')}`
        );
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
          const cpaSuffix =
            item.cpaCampaignId && item.cpaCampaignId !== '(not set)'
              ? ` | cpa=${item.cpaCampaignId}`
              : '';
          console.log(
            `  - slot=${item.slotId} (placement=${item.placementSlotId}) | type=${item.eventType} | apt=${item.apartmentName} | ua=${item.userAgentCategory}${cpaSuffix}: ${item.eventCount}건`
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
  } finally {
    ipv4Agent.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
