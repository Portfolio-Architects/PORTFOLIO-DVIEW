/**
 * @module searchConsole
 * @description Service Layer for coordinating Google Search Console metrics.
 * Architecture Layer: Service (Domain Logic & Orchestration)
 */
import type { SearchConsoleStatus } from '@/types/api';
import * as SearchConsoleRepo from '@/lib/repositories/searchConsole.repository';

export type { SearchConsoleStatus };
export {
  GscQueryMetricSchema,
  expectedCtrForPosition,
  parseGscQueriesInput,
  recommendDviewSeoAction,
  classifyCtrOpportunities,
  analyzeLiveSearchConsoleCtr,
  type GscQueryMetric,
  type CtrOpportunityBucket,
  type CtrOpportunityItem,
  type CtrOpportunityReport,
} from '@/lib/services/searchConsoleCtr';

/**
 * Returns Google Search Console 28-day performance metrics.
 * Returns zeroed unavailable diagnostics (`isMock: true`) if credentials are missing or API is disabled.
 */
export async function getSearchConsoleStatus(): Promise<SearchConsoleStatus> {
  return SearchConsoleRepo.getSearchConsoleStatus();
}


