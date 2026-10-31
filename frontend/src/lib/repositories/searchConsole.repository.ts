/**
 * @module searchConsole.repository
 * @description Data Access Layer for Google Search Console API and status caching.
 * Architecture Layer: Repository (Raw I/O & API only)
 */
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { redis } from '@/lib/redis';
import { logger } from '@/lib/services/logger';
import { SearchConsoleStatusSchema } from '@/lib/validation/facade.schemas';
import type { SearchConsoleStatus } from '@/types/api';

const SEARCH_CONSOLE_CACHE_KEY = 'dtdls:searchconsole:status:lkg';
const SEARCH_CONSOLE_CACHE_TTL = 3600; // 1 hour

export interface RawGscQueryRow {
  query: string;
  page?: string;
  clicks: number;
  impressions: number;
  ctr: number; // percentage 0..100
  position: number;
}

export interface GscAccountAttemptDiagnostic {
  serviceAccountEmail: string;
  errorCode: 'SERVICE_DISABLED' | 'PERMISSION_DENIED' | 'API_ERROR';
  activationUrl?: string;
  message?: string;
}

export interface GscQueryFetchResult {
  ok: boolean;
  siteProperty?: string;
  serviceAccountEmail?: string;
  errorCode?: 'MISSING_CREDENTIALS' | 'SERVICE_DISABLED' | 'PERMISSION_DENIED' | 'API_ERROR';
  activationUrl?: string;
  message?: string;
  attemptedAccounts?: GscAccountAttemptDiagnostic[];
  rows: RawGscQueryRow[];
}

const CANDIDATE_SITE_PROPERTIES = [
  'sc-domain:dongtanview.com',
  'https://dongtanview.com/',
  'https://www.dongtanview.com/',
] as const;

interface GoogleServiceAccountCreds {
  client_email: string;
  private_key: string;
}

function getAllGoogleCredentials(): GoogleServiceAccountCreds[] {
  const candidates: GoogleServiceAccountCreds[] = [];
  const seenEmails = new Set<string>();

  const pushCandidate = (email?: string, key?: string) => {
    if (!email || !key) return;
    const normalizedEmail = email.trim();
    const normalizedKey = key.replace(/^"|"$/g, '').replace(/\\n/g, '\n').trim();
    if (!normalizedEmail || !normalizedKey || seenEmails.has(normalizedEmail)) return;
    seenEmails.add(normalizedEmail);
    candidates.push({ client_email: normalizedEmail, private_key: normalizedKey });
  };

  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      const parsed = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
      pushCandidate(parsed?.client_email, parsed?.private_key);
    }
  } catch {
    // ignore
  }

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      pushCandidate(parsed?.client_email, parsed?.private_key);
    } catch {
      try {
        const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        pushCandidate(parsed?.client_email, parsed?.private_key);
      } catch {
        // ignore
      }
    }
  }

  pushCandidate(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    process.env.GOOGLE_PRIVATE_KEY
  );

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      pushCandidate(parsed?.client_email, parsed?.private_key);
    } catch {
      // ignore
    }
  }

  pushCandidate(
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );

  return candidates;
}

function base64url(buf: Buffer): string {
  return buf.toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const headerB64 = base64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)));
  const signInput = `${headerB64}.${payloadB64}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signInput);
  const signature = signer.sign(privateKey);
  const signatureB64 = base64url(signature);

  const jwt = `${signInput}.${signatureB64}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to exchange JWT for token: ${errorText}`);
  }

  const data = await res.json();
  return data.access_token;
}

function generateUnavailableStatus(): SearchConsoleStatus {
  return {
    success: true,
    isMock: true,
    siteUrl: 'https://dongtanview.com',
    indexStatus: {
      totalIndexed: 0,
      notIndexed: 0,
      crawledNotIndexed: 0,
      discoveredNotIndexed: 0,
      errors: 0
    },
    searchMetrics: {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      averagePosition: 0
    }
  };
}

function formatIsoDateOffset(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function parseGoogleApiError(rawBody: string): {
  reason?: string;
  activationUrl?: string;
  message?: string;
} {
  try {
    const parsed = JSON.parse(rawBody);
    const err = parsed?.error;
    const details = Array.isArray(err?.details) ? err.details : [];
    const errorInfo = details.find((d: Record<string, unknown>) => d?.reason === 'SERVICE_DISABLED');
    const metadata = (errorInfo?.metadata || {}) as Record<string, string | undefined>;
    return {
      reason: errorInfo?.reason || err?.errors?.[0]?.reason || err?.status,
      activationUrl: metadata.activationUrl,
      message: typeof err?.message === 'string' ? err.message : undefined,
    };
  } catch {
    return { message: rawBody.slice(0, 300) };
  }
}

async function resolveVerifiedSiteProperties(accessToken: string): Promise<string[]> {
  try {
    const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      return [...CANDIDATE_SITE_PROPERTIES];
    }
    const body = await res.json();
    const entries = Array.isArray(body?.siteEntry) ? body.siteEntry : [];
    const discovered = entries
      .filter((entry: { siteUrl?: string; permissionLevel?: string }) => entry?.permissionLevel !== 'siteUnverifiedUser')
      .map((entry: { siteUrl?: string }) => entry?.siteUrl)
      .filter((u: string | undefined): u is string => typeof u === 'string' && u.includes('dongtanview.com'));
    if (discovered.length > 0) {
      return [...new Set([...discovered, ...CANDIDATE_SITE_PROPERTIES])];
    }
  } catch {
    // fall back to static candidate list
  }
  return [...CANDIDATE_SITE_PROPERTIES];
}

export async function fetchSearchConsoleQueryRows(options?: {
  days?: number;
  rowLimit?: number;
  includePageDimension?: boolean;
  siteProperty?: string;
}): Promise<GscQueryFetchResult> {
  const credentialsList = getAllGoogleCredentials();
  if (credentialsList.length === 0) {
    return {
      ok: false,
      errorCode: 'MISSING_CREDENTIALS',
      message: 'Google Service Account credentials are not configured.',
      rows: [],
    };
  }

  const days = Math.max(1, Math.min(options?.days ?? 28, 480));
  const rowLimit = Math.max(1, Math.min(options?.rowLimit ?? 250, 5000));
  const dimensions = options?.includePageDimension === false ? ['query'] : ['query', 'page'];
  const startDate = formatIsoDateOffset(days);
  const endDate = formatIsoDateOffset(0);

  let primaryFailure: GscQueryFetchResult | null = null;
  let emptySuccessFallback: GscQueryFetchResult | null = null;
  const attemptedAccounts: GscAccountAttemptDiagnostic[] = [];

  for (const creds of credentialsList) {
    try {
      const accessToken = await getAccessToken(creds.client_email, creds.private_key);
      const siteCandidates = options?.siteProperty
        ? [options.siteProperty]
        : await resolveVerifiedSiteProperties(accessToken);

      let credLastFailure: GscQueryFetchResult | null = null;

      for (const siteProperty of siteCandidates) {
        const apiRes = await fetch(
          `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteProperty)}/searchAnalytics/query`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              startDate,
              endDate,
              dimensions,
              rowLimit,
            }),
          }
        );

        if (!apiRes.ok) {
          const errText = await apiRes.text();
          const parsedErr = parseGoogleApiError(errText);
          if (parsedErr.reason === 'SERVICE_DISABLED' || parsedErr.reason === 'accessNotConfigured') {
            credLastFailure = {
              ok: false,
              siteProperty,
              serviceAccountEmail: creds.client_email,
              errorCode: 'SERVICE_DISABLED',
              activationUrl: parsedErr.activationUrl,
              message: parsedErr.message,
              rows: [],
            };
            // Service disabled applies to the entire GCP project for this credential
            break;
          }
          credLastFailure = {
            ok: false,
            siteProperty,
            serviceAccountEmail: creds.client_email,
            errorCode: apiRes.status === 403 ? 'PERMISSION_DENIED' : 'API_ERROR',
            message: parsedErr.message || `HTTP ${apiRes.status}`,
            rows: [],
          };
          continue;
        }

        const apiData = await apiRes.json();
        const rawRows = Array.isArray(apiData?.rows) ? apiData.rows : [];
        const rows: RawGscQueryRow[] = rawRows
          .map((r: {
            keys?: string[];
            clicks?: number;
            impressions?: number;
            ctr?: number;
            position?: number;
          }) => {
            const keys = Array.isArray(r?.keys) ? r.keys : [];
            const query = String(keys[0] ?? '').trim();
            const page = keys[1] ? String(keys[1]).trim() : undefined;
            const clicks = Math.max(0, Math.round(Number(r?.clicks ?? 0) || 0));
            const impressions = Math.max(0, Math.round(Number(r?.impressions ?? 0) || 0));
            const ctrRatio = Number(r?.ctr ?? 0) || 0;
            const ctr = parseFloat(Math.max(0, Math.min(100, ctrRatio * 100)).toFixed(2));
            const position = parseFloat(Math.max(0, Number(r?.position ?? 0) || 0).toFixed(1));
            return { query, page, clicks, impressions, ctr, position };
          })
          .filter((r: RawGscQueryRow) => r.query.length > 0);

        const successResult: GscQueryFetchResult = {
          ok: true,
          siteProperty,
          serviceAccountEmail: creds.client_email,
          rows,
        };

        if (rows.length > 0) {
          return successResult;
        }
        if (!emptySuccessFallback) {
          emptySuccessFallback = successResult;
        }
      }

      if (emptySuccessFallback) {
        return emptySuccessFallback;
      }

      if (credLastFailure && credLastFailure.errorCode && credLastFailure.errorCode !== 'MISSING_CREDENTIALS') {
        attemptedAccounts.push({
          serviceAccountEmail: creds.client_email,
          errorCode: credLastFailure.errorCode,
          activationUrl: credLastFailure.activationUrl,
          message: credLastFailure.message,
        });
        if (!primaryFailure) {
          primaryFailure = credLastFailure;
        }
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      attemptedAccounts.push({
        serviceAccountEmail: creds.client_email,
        errorCode: 'API_ERROR',
        message: errMsg,
      });
      if (!primaryFailure) {
        primaryFailure = {
          ok: false,
          serviceAccountEmail: creds.client_email,
          errorCode: 'API_ERROR',
          message: errMsg,
          rows: [],
        };
      }
    }
  }

  if (emptySuccessFallback) {
    return emptySuccessFallback;
  }

  if (primaryFailure) {
    return {
      ...primaryFailure,
      attemptedAccounts,
    };
  }

  return {
    ok: false,
    errorCode: 'API_ERROR',
    message: 'Unable to query Google Search Console API.',
    attemptedAccounts,
    rows: [],
  };
}

export async function fetchSearchConsoleStatusFromGoogle(): Promise<SearchConsoleStatus> {
  const credentialsList = getAllGoogleCredentials();

  if (credentialsList.length === 0) {
    logger.warn('SearchConsoleRepository', 'Credentials missing. Returning zeroed unavailable diagnostics.');
    return generateUnavailableStatus();
  }

  const startDate = formatIsoDateOffset(28);
  const endDate = formatIsoDateOffset(0);
  let zeroMetricVerifiedFallback: SearchConsoleStatus | null = null;

  for (const credentials of credentialsList) {
    try {
      const accessToken = await getAccessToken(credentials.client_email, credentials.private_key);
      const siteCandidates = await resolveVerifiedSiteProperties(accessToken);

      for (const siteUrl of siteCandidates) {
        const apiRes = await fetch(
          `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              startDate,
              endDate,
            }),
          }
        );

        if (!apiRes.ok) {
          const errBody = await apiRes.text();
          const parsedErr = parseGoogleApiError(errBody);
          if (parsedErr.reason === 'SERVICE_DISABLED' || parsedErr.reason === 'accessNotConfigured') {
            logger.warn('SearchConsoleRepository', `Search Console API disabled for ${credentials.client_email}.`);
            break;
          }
          continue;
        }

        const apiData = await apiRes.json();
        const summaryRow = apiData?.rows?.[0];
        const clicks = Math.max(0, Math.round(Number(summaryRow?.clicks ?? 0) || 0));
        const impressions = Math.max(0, Math.round(Number(summaryRow?.impressions ?? 0) || 0));
        const ctr = parseFloat((Math.max(0, Number(summaryRow?.ctr ?? 0) || 0) * 100).toFixed(2));
        const averagePosition = parseFloat(Math.max(0, Number(summaryRow?.position ?? 0) || 0).toFixed(1));

        const rawStatus = {
          success: true,
          isMock: false,
          siteUrl: 'https://dongtanview.com',
          indexStatus: {
            totalIndexed: 0,
            notIndexed: 0,
            crawledNotIndexed: 0,
            discoveredNotIndexed: 0,
            errors: 0,
          },
          searchMetrics: {
            clicks,
            impressions,
            ctr,
            averagePosition,
          },
        };

        const parsed = SearchConsoleStatusSchema.safeParse(rawStatus);
        if (!parsed.success) {
          logger.warn('SearchConsoleRepository', 'Failed to validate API response.', {}, parsed.error);
          continue;
        }

        if (impressions > 0 || clicks > 0) {
          return parsed.data;
        }
        if (!zeroMetricVerifiedFallback) {
          zeroMetricVerifiedFallback = parsed.data;
        }
      }

      if (zeroMetricVerifiedFallback) {
        return zeroMetricVerifiedFallback;
      }
    } catch (error: unknown) {
      logger.warn('SearchConsoleRepository', 'Error while calling Google Search Console API.', {}, error);
    }
  }

  return zeroMetricVerifiedFallback ?? generateUnavailableStatus();
}

export async function getSearchConsoleStatus(): Promise<SearchConsoleStatus> {
  try {
    if (redis) {
      const cached = await redis.get<{ data: unknown, timestamp: number }>(SEARCH_CONSOLE_CACHE_KEY);
      if (cached && cached.data) {
        const parsed = SearchConsoleStatusSchema.safeParse(cached.data);
        const isLegacyFabricatedMock =
          parsed.success &&
          parsed.data.isMock === true &&
          (parsed.data.searchMetrics.clicks > 0 || parsed.data.searchMetrics.impressions > 0);
        if (parsed.success && !isLegacyFabricatedMock) {
          const ttlSeconds = parsed.data.isMock ? 300 : SEARCH_CONSOLE_CACHE_TTL;
          const isStale = (Date.now() - cached.timestamp) > (ttlSeconds * 1000);
          if (isStale) {
            fetchSearchConsoleStatusFromGoogle().then(freshData => {
              const nextTtl = freshData.isMock ? 300 : SEARCH_CONSOLE_CACHE_TTL;
              redis?.set(SEARCH_CONSOLE_CACHE_KEY, { data: freshData, timestamp: Date.now() }, { ex: nextTtl * 2 });
            }).catch((error: unknown) => {
              logger.error('SearchConsoleRepository', 'Background fetch failed.', {}, error);
            });
          }
          return parsed.data;
        } else if (!parsed.success) {
          logger.warn('SearchConsoleRepository', 'Cached data corrupted. Evicting and refetching.', {}, parsed.error);
        }
      }
    }
  } catch (err) {
    logger.error('SearchConsoleRepository', 'Cache Read Error', {}, err);
  }

  const freshData = await fetchSearchConsoleStatusFromGoogle();
  
  try {
    if (redis) {
      const ttlSeconds = freshData.isMock ? 300 : SEARCH_CONSOLE_CACHE_TTL;
      await redis.set(SEARCH_CONSOLE_CACHE_KEY, { data: freshData, timestamp: Date.now() }, { ex: ttlSeconds * 2 });
    }
  } catch (err) {
    logger.error('SearchConsoleRepository', 'Cache Write Error', {}, err);
  }

  return freshData;
}
