/**
 * @module transaction
 * @description Backward-compatibility re-export barrel for Transactions, Summaries, and Volume metrics.
 * @deprecated Prefer importing directly from '@/types' or '@/types/transaction'.
 */

export type {
  TransactionRecord,
  RawTransactionRecord,
  RecentTx,
  RecentTransaction,
  AptTxSummary,
  Recent7DaysVolume,
  DongtanMacroTrendPoint,
  MolTransactionXml,
} from '@/types/transaction';

export type { LocationScoreItem } from '@/types/apartment';
