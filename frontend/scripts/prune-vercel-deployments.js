/**
 * @file prune-vercel-deployments.js
 * @description Automated Vercel deployment retention (N=2 READY production) and artifact pruning script.
 *
 * Invariants:
 * 1. All in-flight deployments (BUILDING, INITIALIZING, QUEUED) are unconditionally preserved.
 * 2. If any deployment is in-flight, polls until all in-flight deployments settle or maxWaitMs (180s) elapses.
 * 3. Top N=2 READY production deployments (target === 'production' && state === 'READY', sorted by createdAt DESC) are retained.
 * 4. Paginates across all pages (pagination.next -> until cursor) of GET /v6/deployments.
 * 5. Deletes older READY, CANCELED, and ERROR deployments via DELETE /v13/deployments/{uid} with ~150ms rate-limit delay.
 *
 * @complexity Time: O(P * L + D log D + K * T_del) where P = pages, L = page limit (100), D = total deployments, K = deleted count.
 * @complexity Space: O(D) for in-memory deduplicated deployment map and partition lists.
 * @sideEffects Network I/O (HTTPS GET /v6/deployments, HTTPS DELETE /v13/deployments/{uid}), stdout/stderr logging.
 */

const { z } = require('zod');

const DEFAULT_PROJECT_ID = 'prj_OCym05uVc30QN4JhiMj9paHaK0Yt';
const DEFAULT_TEAM_ID = 'team_6oiLYgowOwsSHPYuKP3NPrSY';
const DEFAULT_RETAIN_COUNT = 2;
const DEFAULT_MAX_WAIT_MS = 180000;
const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_DELETE_DELAY_MS = 150;
const PAGE_LIMIT = 100;

const IN_FLIGHT_STATES = new Set(['BUILDING', 'INITIALIZING', 'QUEUED']);
const DELETABLE_STATES = new Set(['READY', 'CANCELED', 'ERROR']);

const DeploymentItemSchema = z.object({
  uid: z.string().min(1),
  name: z.string().optional(),
  state: z.string().nullable().optional(),
  readyState: z.string().nullable().optional(),
  target: z.string().nullable().optional(),
  createdAt: z.number().nullable().optional(),
  created: z.number().nullable().optional(),
});

const DeploymentsResponseSchema = z.object({
  deployments: z.array(DeploymentItemSchema),
  pagination: z
    .object({
      count: z.number().optional(),
      next: z.number().nullable().optional(),
      prev: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
});

/**
 * Normalize deployment state from `state` or `readyState`.
 * @complexity Time: O(1), Space: O(1), Side-effects: false
 */
function getDeploymentState(deployment) {
  const raw = deployment?.state || deployment?.readyState || '';
  return String(raw).trim().toUpperCase();
}

/**
 * Extract numeric creation timestamp (`createdAt` or `created`).
 * @complexity Time: O(1), Space: O(1), Side-effects: false
 */
function getDeploymentTimestamp(deployment) {
  const ts = deployment?.createdAt ?? deployment?.created ?? 0;
  return Number.isFinite(ts) ? Number(ts) : 0;
}

/**
 * Default sleep helper.
 * @complexity Time: O(1), Space: O(1), Side-effects: timer delay
 */
function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch all deployments across all pagination cursors (`pagination.next`).
 * @complexity Time: O(D), Space: O(D), Side-effects: Network GET I/O
 */
async function fetchAllDeployments({
  token,
  projectId = DEFAULT_PROJECT_ID,
  teamId = DEFAULT_TEAM_ID,
  fetchImpl = globalThis.fetch,
}) {
  const deduped = new Map();
  let untilCursor = null;
  const visitedCursors = new Set();

  while (true) {
    const params = new URLSearchParams({
      projectId,
      teamId,
      limit: String(PAGE_LIMIT),
    });
    if (untilCursor !== null && untilCursor !== undefined) {
      params.set('until', String(untilCursor));
    }

    const url = `https://api.vercel.com/v6/deployments?${params.toString()}`;
    const res = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const bodyText = typeof res.text === 'function' ? await res.text().catch(() => '') : '';
      throw new Error(`GET /v6/deployments failed with status ${res.status}: ${bodyText}`);
    }

    const rawJson = await res.json();
    const parsed = DeploymentsResponseSchema.safeParse(rawJson);
    if (!parsed.success) {
      throw new Error(`Invalid /v6/deployments payload schema: ${parsed.error.message}`);
    }

    const { deployments, pagination } = parsed.data;
    for (const item of deployments) {
      if (!deduped.has(item.uid)) {
        deduped.set(item.uid, item);
      }
    }

    const nextCursor = pagination?.next ?? null;
    if (
      nextCursor === null ||
      nextCursor === undefined ||
      deployments.length === 0 ||
      visitedCursors.has(nextCursor)
    ) {
      break;
    }

    visitedCursors.add(nextCursor);
    untilCursor = nextCursor;
  }

  return Array.from(deduped.values());
}

/**
 * Partition deployments into `toKeep` and `toDelete` according to retention invariants.
 * @complexity Time: O(D log D), Space: O(D), Side-effects: false
 */
function planDeploymentPruning(deployments, retainCount = DEFAULT_RETAIN_COUNT) {
  const safeRetainCount =
    Number.isFinite(retainCount) && retainCount >= 1 ? Math.floor(retainCount) : DEFAULT_RETAIN_COUNT;

  const sorted = [...deployments].sort((a, b) => {
    const diff = getDeploymentTimestamp(b) - getDeploymentTimestamp(a);
    if (diff !== 0) return diff;
    return String(a.uid).localeCompare(String(b.uid));
  });

  const toKeep = [];
  const toDelete = [];
  let retainedReadyProdCount = 0;

  for (const d of sorted) {
    const state = getDeploymentState(d);

    // Invariant 1: Always preserve in-flight deployments
    if (IN_FLIGHT_STATES.has(state)) {
      toKeep.push(d);
      continue;
    }

    // Invariant 2: Retain top N READY production deployments
    if (d.target === 'production' && state === 'READY') {
      if (retainedReadyProdCount < safeRetainCount) {
        retainedReadyProdCount += 1;
        toKeep.push(d);
      } else {
        toDelete.push(d);
      }
      continue;
    }

    // Invariant 3: Delete older READY (including preview READY), CANCELED, and ERROR deployments
    if (DELETABLE_STATES.has(state)) {
      toDelete.push(d);
      continue;
    }

    // Unknown state fallback: preserve safely
    toKeep.push(d);
  }

  return { toKeep, toDelete };
}

/**
 * Execute full poll-and-prune workflow against Vercel REST API.
 * @complexity Time: O(P * L + D log D + K * T_del), Space: O(D), Side-effects: Network I/O
 */
async function pruneVercelDeployments(options = {}) {
  const token = String(
    options.token ?? process.env.VERCEL_TOKEN ?? process.env.VERCEL_API_TOKEN ?? ''
  ).trim();
  const projectId = options.projectId || process.env.VERCEL_PROJECT_ID || DEFAULT_PROJECT_ID;
  const teamId = options.teamId || process.env.VERCEL_TEAM_ID || DEFAULT_TEAM_ID;
  const retainCount = Number(options.retainCount ?? process.env.VERCEL_RETAIN_COUNT ?? DEFAULT_RETAIN_COUNT);
  const maxWaitMs = Number(options.maxWaitMs ?? process.env.VERCEL_WAIT_MAX_MS ?? DEFAULT_MAX_WAIT_MS);
  const pollIntervalMs = Number(
    options.pollIntervalMs ?? process.env.VERCEL_POLL_INTERVAL_MS ?? DEFAULT_POLL_INTERVAL_MS
  );
  const deleteDelayMs = Number(
    options.deleteDelayMs ?? process.env.VERCEL_DELETE_DELAY_MS ?? DEFAULT_DELETE_DELAY_MS
  );
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const sleepImpl = options.sleepImpl || defaultSleep;
  const nowImpl = options.nowImpl || (() => Date.now());
  const logger = options.logger || console;

  if (!token) {
    logger.log('[PruneVercel] VERCEL_TOKEN is not set. Skipping deployment pruning.');
    return {
      skipped: true,
      reason: 'missing_token',
      kept: [],
      deleted: [],
      failed: [],
    };
  }

  const startTime = nowImpl();
  let deployments = await fetchAllDeployments({ token, projectId, teamId, fetchImpl });

  while (true) {
    const inFlight = deployments.filter((d) => IN_FLIGHT_STATES.has(getDeploymentState(d)));
    if (inFlight.length === 0) {
      break;
    }

    const elapsedMs = nowImpl() - startTime;
    if (elapsedMs >= maxWaitMs) {
      logger.warn(
        `[PruneVercel] Wait timeout (${maxWaitMs}ms) reached with ${inFlight.length} in-flight deployment(s). In-flight deployments will be preserved.`
      );
      break;
    }

    const waitMs = Math.min(pollIntervalMs, Math.max(1, maxWaitMs - elapsedMs));
    logger.log(
      `[PruneVercel] ${inFlight.length} deployment(s) in-flight (${inFlight
        .map((d) => `${d.uid}:${getDeploymentState(d)}`)
        .join(', ')}). Polling again in ${waitMs}ms...`
    );
    await sleepImpl(waitMs);
    deployments = await fetchAllDeployments({ token, projectId, teamId, fetchImpl });
  }

  const { toKeep, toDelete } = planDeploymentPruning(deployments, retainCount);

  logger.log(
    `[PruneVercel] Total=${deployments.length}, Keep=${toKeep.length}, Delete=${toDelete.length} (projectId=${projectId}, retainCount=${retainCount})`
  );

  const deleted = [];
  const failed = [];

  for (let i = 0; i < toDelete.length; i++) {
    const target = toDelete[i];
    const deleteUrl = `https://api.vercel.com/v13/deployments/${encodeURIComponent(
      target.uid
    )}?teamId=${encodeURIComponent(teamId)}`;

    try {
      const res = await fetchImpl(deleteUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        const errText = typeof res.text === 'function' ? await res.text().catch(() => '') : '';
        logger.warn(
          `[PruneVercel] Failed to delete ${target.uid} (${getDeploymentState(target)}): HTTP ${res.status} ${errText}`
        );
        failed.push({ uid: target.uid, status: res.status });
      } else {
        deleted.push(target.uid);
        logger.log(
          `[PruneVercel] Deleted ${target.uid} (state=${getDeploymentState(target)}, target=${
            target.target || 'preview'
          }, createdAt=${getDeploymentTimestamp(target)})`
        );
      }
    } catch (err) {
      logger.warn(`[PruneVercel] Error deleting ${target.uid}: ${err.message}`);
      failed.push({ uid: target.uid, error: err.message });
    }

    if (i < toDelete.length - 1 && deleteDelayMs > 0) {
      await sleepImpl(deleteDelayMs);
    }
  }

  logger.log(
    `[PruneVercel] Completed: kept=${toKeep.length}, deleted=${deleted.length}, failed=${failed.length}`
  );

  return {
    skipped: false,
    kept: toKeep.map((d) => d.uid),
    deleted,
    failed,
  };
}

if (require.main === module) {
  pruneVercelDeployments().catch((err) => {
    console.error(`[PruneVercel] Fatal error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = {
  DEFAULT_PROJECT_ID,
  DEFAULT_TEAM_ID,
  DEFAULT_RETAIN_COUNT,
  DEFAULT_MAX_WAIT_MS,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_DELETE_DELAY_MS,
  IN_FLIGHT_STATES,
  DELETABLE_STATES,
  getDeploymentState,
  getDeploymentTimestamp,
  fetchAllDeployments,
  planDeploymentPruning,
  pruneVercelDeployments,
};
