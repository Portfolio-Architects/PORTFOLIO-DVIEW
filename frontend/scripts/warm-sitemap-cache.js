/**
 * @file warm-sitemap-cache.js
 * @description Post-deploy SSR/ISR Edge Cache warm-up script for D-VIEW (`https://dongtanview.com/sitemap.xml`).
 *
 * Prevents cold-start Serverless HTTP 500 responses when Googlebot / Mediapartners-Google
 * crawls Korean percent-encoded dynamic routes (`/apartment/[aptName]`, `/zone/[id]`, `/guide/[slug]`)
 * immediately after a Vercel production deployment.
 */

const DEFAULT_SITE_URL = 'https://dongtanview.com';
const DEFAULT_PROJECT_ID = 'prj_OCym05uVc30QN4JhiMj9paHaK0Yt';
const DEFAULT_TEAM_ID = 'team_6oiLYgowOwsSHPYuKP3NPrSY';
const DEFAULT_CONCURRENCY = 6;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_CANARY_LIMIT = 3;
const DEFAULT_REQUEST_TIMEOUT_MS = 20000;
const DEFAULT_MAX_DEPLOY_WAIT_MS = 180000;
const DEFAULT_POLL_INTERVAL_MS = 6000;
const IN_FLIGHT_STATES = new Set(['BUILDING', 'INITIALIZING', 'QUEUED']);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract deduplicated `<loc>` URLs from XML sitemap payload.
 * @param {string} xml
 * @returns {string[]}
 */
function extractSitemapLocUrls(xml) {
  if (typeof xml !== 'string' || !xml.trim()) return [];
  const matches = xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi);
  const seen = new Set();
  const urls = [];
  for (const match of matches) {
    const raw = String(match[1] || '')
      .replace(/&amp;/g, '&')
      .trim();
    if (raw && !seen.has(raw)) {
      seen.add(raw);
      urls.push(raw);
    }
  }
  return urls;
}

function getPathname(rawUrl) {
  try {
    return new URL(rawUrl).pathname || '/';
  } catch {
    const stripped = String(rawUrl || '')
      .replace(/^[a-z]+:\/\/[^/]+/i, '')
      .split(/[?#]/)[0];
    return stripped || '/';
  }
}

/**
 * Select a lightweight set of representative canary URLs (`/`, `/explore`, first `/apartment/...`)
 * to verify post-deploy SSR/Edge health without downloading every page in `sitemap.xml`.
 * @param {string[]} urls
 * @param {number} [maxCount=3]
 * @returns {string[]}
 */
function selectCanaryUrls(urls, maxCount = DEFAULT_CANARY_LIMIT) {
  if (!Array.isArray(urls) || urls.length === 0) return [];
  const parsed = Number(maxCount);
  const limit = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_CANARY_LIMIT;

  const selected = [];
  const seen = new Set();
  const addIfNew = (candidate) => {
    if (!candidate || seen.has(candidate) || selected.length >= limit) return;
    seen.add(candidate);
    selected.push(candidate);
  };

  addIfNew(urls.find((u) => {
    const p = getPathname(u);
    return p === '/' || p === '';
  }));
  addIfNew(urls.find((u) => getPathname(u) === '/explore'));
  addIfNew(urls.find((u) => getPathname(u).startsWith('/apartment/')));

  for (const url of urls) {
    if (selected.length >= limit) break;
    addIfNew(url);
  }

  return selected.slice(0, limit);
}

async function waitForProductionDeploymentReady({
  vercelToken,
  projectId = DEFAULT_PROJECT_ID,
  teamId = DEFAULT_TEAM_ID,
  expectedCommitSha = '',
  maxWaitMs = DEFAULT_MAX_DEPLOY_WAIT_MS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  fetchImpl = globalThis.fetch,
}) {
  if (!vercelToken || typeof fetchImpl !== 'function') {
    return { waited: false, reason: 'NO_VERCEL_TOKEN' };
  }

  const normalizedExpected = String(expectedCommitSha || '').trim().toLowerCase();
  const startedAt = Date.now();
  const registrationDeadline = startedAt + 20000;

  while (Date.now() - startedAt < maxWaitMs) {
    try {
      const apiUrl = new URL('https://api.vercel.com/v6/deployments');
      apiUrl.searchParams.set('projectId', projectId);
      if (teamId) apiUrl.searchParams.set('teamId', teamId);
      apiUrl.searchParams.set('target', 'production');
      apiUrl.searchParams.set('limit', '10');

      const res = await fetchImpl(apiUrl.toString(), {
        headers: { Authorization: `Bearer ${vercelToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const deployments = Array.isArray(data?.deployments) ? data.deployments : [];
        const hasInFlight = deployments.some((d) =>
          IN_FLIGHT_STATES.has(String(d?.state || d?.readyState || '').toUpperCase())
        );
        const matchingExpected = normalizedExpected
          ? deployments.find((d) => {
              const sha = String(d?.meta?.githubCommitSha || '').trim().toLowerCase();
              return sha && (sha.startsWith(normalizedExpected) || normalizedExpected.startsWith(sha));
            })
          : null;

        if (normalizedExpected && !matchingExpected && Date.now() < registrationDeadline) {
          await sleep(pollIntervalMs);
          continue;
        }

        const expectedState = matchingExpected
          ? String(matchingExpected.state || matchingExpected.readyState || '').toUpperCase()
          : '';

        if (!hasInFlight && (!matchingExpected || expectedState === 'READY' || expectedState === 'ERROR' || expectedState === 'CANCELED')) {
          return { waited: true, state: expectedState || 'READY' };
        }
      }
    } catch (err) {
      console.warn('[warm-sitemap-cache] Vercel deployment poll warning:', err?.message || err);
    }
    await sleep(pollIntervalMs);
  }

  return { waited: true, state: 'TIMEOUT' };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, fetchImpl = globalThis.fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function warmSingleUrl(url, { maxRetries = DEFAULT_MAX_RETRIES, timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, fetchImpl = globalThis.fetch } = {}) {
  let lastStatus = 0;
  let lastError = null;
  let vercelCache = '';

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent': 'DVIEW-Sitemap-Cache-Warmer/1.0 (+https://dongtanview.com)',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        },
        timeoutMs,
        fetchImpl
      );
      lastStatus = res.status;
      vercelCache = res.headers?.get?.('x-vercel-cache') || '';
      // Consume body to ensure full SSR stream completion and ISR persistence
      await res.text();

      if (res.status >= 200 && res.status < 400) {
        return { url, ok: true, status: res.status, attempts: attempt, vercelCache };
      }
      if (res.status >= 400 && res.status < 500 && res.status !== 429) {
        return { url, ok: false, status: res.status, attempts: attempt, vercelCache };
      }
    } catch (err) {
      lastError = err?.message || String(err);
    }

    if (attempt < maxRetries) {
      await sleep(1200 * attempt);
    }
  }

  return {
    url,
    ok: false,
    status: lastStatus,
    attempts: maxRetries,
    vercelCache,
    error: lastError,
  };
}

async function warmSitemapUrls(urls, options = {}) {
  const concurrency = Math.max(1, Number(options.concurrency) || DEFAULT_CONCURRENCY);
  const results = new Array(urls.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= urls.length) break;
      results[idx] = await warmSingleUrl(urls[idx], options);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, urls.length || 1) }, () => worker());
  await Promise.all(workers);

  const succeeded = results.filter((r) => r && r.ok).length;
  const failed = results.filter((r) => !r || !r.ok);
  return {
    total: urls.length,
    succeeded,
    failedCount: failed.length,
    failed,
    results,
  };
}

async function runWarmup(env = process.env, fetchImpl = globalThis.fetch) {
  const siteUrl = String(env.VERCEL_APP_URL || env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
  const expectedSha = env.VERCEL_EXPECTED_COMMIT_SHA || '';

  if (env.VERCEL_TOKEN) {
    console.log(`[warm-sitemap-cache] Checking Vercel production readiness (SHA: ${expectedSha || 'latest'})...`);
    const deployStatus = await waitForProductionDeploymentReady({
      vercelToken: env.VERCEL_TOKEN,
      projectId: env.VERCEL_PROJECT_ID || DEFAULT_PROJECT_ID,
      teamId: env.VERCEL_TEAM_ID || DEFAULT_TEAM_ID,
      expectedCommitSha: expectedSha,
      fetchImpl,
    });
    console.log('[warm-sitemap-cache] Deployment check:', JSON.stringify(deployStatus));
  }

  const sitemapUrl = `${siteUrl}/sitemap.xml`;
  console.log(`[warm-sitemap-cache] Fetching sitemap: ${sitemapUrl}`);
  const sitemapRes = await fetchWithTimeout(
    sitemapUrl,
    {
      headers: {
        'User-Agent': 'DVIEW-Sitemap-Cache-Warmer/1.0 (+https://dongtanview.com)',
        Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8',
      },
    },
    DEFAULT_REQUEST_TIMEOUT_MS,
    fetchImpl
  );

  if (!sitemapRes.ok) {
    throw new Error(`Failed to fetch ${sitemapUrl}: HTTP ${sitemapRes.status}`);
  }

  const xml = await sitemapRes.text();
  const urls = extractSitemapLocUrls(xml);
  const fullCrawl = String(env.WARMUP_FULL_CRAWL || '').toLowerCase() === 'true';
  const parsedLimit = Number(env.WARMUP_CANARY_LIMIT);
  const canaryLimit =
    Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.floor(parsedLimit) : DEFAULT_CANARY_LIMIT;
  const targetUrls = fullCrawl ? urls : selectCanaryUrls(urls, canaryLimit);
  console.log(
    `[warm-sitemap-cache] Discovered ${urls.length} <loc> URLs. Running ${fullCrawl ? 'full warm-up' : `canary check (${targetUrls.length} URLs)`}...`
  );

  const summary = await warmSitemapUrls(targetUrls, {
    concurrency: Number(env.WARMUP_CONCURRENCY) || DEFAULT_CONCURRENCY,
    maxRetries: Number(env.WARMUP_MAX_RETRIES) || DEFAULT_MAX_RETRIES,
    fetchImpl,
  });

  console.log(
    `[warm-sitemap-cache] Completed: ${summary.succeeded}/${summary.total} OK, ${summary.failedCount} failed.`
  );
  if (summary.failedCount > 0) {
    for (const item of summary.failed.slice(0, 10)) {
      console.warn(
        `[warm-sitemap-cache] WARN URL failed: ${item.url} (status=${item.status}, attempts=${item.attempts}, error=${item.error || 'none'})`
      );
    }
  }

  return summary;
}

if (require.main === module) {
  runWarmup()
    .then((summary) => {
      if (summary.total === 0) {
        process.exitCode = 1;
      }
    })
    .catch((err) => {
      console.error('[warm-sitemap-cache] Fatal error:', err?.message || err);
      // Non-fatal warning in CI if external network transiently unreachable, unless strict flag set
      if (process.env.WARMUP_STRICT === 'true') {
        process.exitCode = 1;
      }
    });
}

module.exports = {
  extractSitemapLocUrls,
  selectCanaryUrls,
  warmSingleUrl,
  warmSitemapUrls,
  waitForProductionDeploymentReady,
  runWarmup,
};
