export interface VercelDeploymentItem {
  uid: string;
  name?: string | null;
  state?: string | null;
  readyState?: string | null;
  target?: string | null;
  createdAt?: number | null;
  created?: number | null;
  meta?: {
    githubCommitSha?: string | null;
    githubCommitMessage?: string | null;
    githubCommitRef?: string | null;
  } | null;
}

export interface VercelPagination {
  count?: number;
  next?: number | null;
  prev?: number | null;
}

export interface VercelDeploymentsPayload {
  deployments?: VercelDeploymentItem[];
  pagination?: VercelPagination | null;
  state?: string;
}

export interface PruneLogger {
  log: (msg: string) => void;
  warn: (msg: string) => void;
}

export interface PruneVercelOptions {
  token?: string;
  projectId?: string;
  teamId?: string;
  retainCount?: number | string | null;
  maxWaitMs?: number | string | null;
  registrationWaitMs?: number | string | null;
  pollIntervalMs?: number | string | null;
  deleteDelayMs?: number | string | null;
  expectedCommitSha?: string;
  fetchImpl?: (
    url: string,
    init?: { method?: string; headers?: Record<string, string> }
  ) => Promise<{
    ok: boolean;
    status: number;
    json?: () => Promise<VercelDeploymentsPayload>;
    text?: () => Promise<string>;
  }>;
  sleepImpl?: (ms: number) => Promise<void>;
  nowImpl?: () => number;
  logger?: PruneLogger;
}

export interface PruneVercelResult {
  skipped: boolean;
  reason?: string;
  kept: string[];
  deleted: string[];
  failed: Array<{ uid: string; status?: number; error?: string }>;
}

export const DEFAULT_PROJECT_ID: string;
export const DEFAULT_TEAM_ID: string;
export const DEFAULT_RETAIN_COUNT: number;
export const DEFAULT_MAX_WAIT_MS: number;
export const DEFAULT_REGISTRATION_WAIT_MS: number;
export const DEFAULT_POLL_INTERVAL_MS: number;
export const DEFAULT_DELETE_DELAY_MS: number;
export const IN_FLIGHT_STATES: Set<string>;
export const DELETABLE_STATES: Set<string>;

export function resolvePositiveInt(
  value: number | string | null | undefined,
  fallback: number
): number;
export function resolveNonNegativeInt(
  value: number | string | null | undefined,
  fallback: number
): number;
export function getDeploymentState(deployment: VercelDeploymentItem | null | undefined): string;
export function getDeploymentTarget(deployment: VercelDeploymentItem | null | undefined): string;
export function getDeploymentCommitSha(deployment: VercelDeploymentItem | null | undefined): string;
export function matchesCommitSha(
  deployment: VercelDeploymentItem | null | undefined,
  expectedCommitSha: string | null | undefined
): boolean;
export function getDeploymentTimestamp(deployment: VercelDeploymentItem | null | undefined): number;
export function fetchAllDeployments(options: {
  token: string;
  projectId?: string;
  teamId?: string;
  fetchImpl?: PruneVercelOptions['fetchImpl'];
}): Promise<VercelDeploymentItem[]>;
export function planDeploymentPruning(
  deployments: VercelDeploymentItem[],
  retainCount?: number | string | null
): {
  toKeep: VercelDeploymentItem[];
  toDelete: VercelDeploymentItem[];
};
export function pruneVercelDeployments(options?: PruneVercelOptions): Promise<PruneVercelResult>;
