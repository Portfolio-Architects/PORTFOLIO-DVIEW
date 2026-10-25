/**
 * @module searchConsole
 * @description Service Layer for coordinating Google Search Console metrics.
 * Architecture Layer: Service (Domain Logic & Orchestration)
 */
import type { SearchConsoleStatus } from '@/types/api';
import * as SearchConsoleRepo from '@/lib/repositories/searchConsole.repository';

export type { SearchConsoleStatus };

/**
 * Returns Google Search Console indexing and performance metrics.
 * Safe fallback to simulated mock diagnostics if credentials are missing or API fails.
 */
export async function getSearchConsoleStatus(): Promise<SearchConsoleStatus> {
  return SearchConsoleRepo.getSearchConsoleStatus();
}

