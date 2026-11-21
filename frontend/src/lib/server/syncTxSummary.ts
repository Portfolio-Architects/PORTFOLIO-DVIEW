import fs from 'fs';
import path from 'path';
import type { AptTxSummary } from '@/types/transaction';
import { GUIDE_DEFAULT_TX_SUMMARY_MAP } from '@/lib/data/guides';

let cachedSummary: Record<string, Partial<AptTxSummary> | undefined> | null = null;

/**
 * Synchronously loads the verified MOLIT `public/data/tx-summary.json` map for
 * synchronous Next.js Server Components (`/guide`, `/stats`) with fallback to
 * `GUIDE_DEFAULT_TX_SUMMARY_MAP`. Server-only module (never import in client bundles).
 */
export function getSyncTxSummaryMap(): Record<string, Partial<AptTxSummary> | undefined> {
  if (cachedSummary) return cachedSummary;
  try {
    const filePath = path.resolve(process.cwd(), 'public/data/tx-summary.json');
    if (fs.existsSync(filePath)) {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const summary = raw?.summary && typeof raw.summary === 'object' ? raw.summary : raw;
      if (summary && typeof summary === 'object' && Object.keys(summary).length > 0) {
        cachedSummary = summary as Record<string, Partial<AptTxSummary> | undefined>;
        return cachedSummary;
      }
    }
  } catch {
    // Fallback to static snapshot
  }
  return GUIDE_DEFAULT_TX_SUMMARY_MAP;
}
