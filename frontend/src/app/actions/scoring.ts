'use server';

import { calculatePremiumScores } from '@/lib/utils/scoring';
import { ObjectiveMetrics } from '@/lib/types/scoutingReport';
import { logger } from '@/lib/services/logger';

/**
 * Server Action to calculate premium scores on the backend.
 * Ensures the scoring algorithm is never exposed to the client bundle.
 */
export async function getPremiumScoresAction(metrics: ObjectiveMetrics) {
  try {
    return calculatePremiumScores(metrics);
  } catch (error) {
    logger.error('getPremiumScoresAction', 'Failed to calculate premium scores on server action', {}, error as Error);
    return {
      education: 0,
      transport: 0,
      livingComfort: 0,
      complex: 0,
      lifestyle: 0,
      totalScore: 0,
      eduTimePremium: 0,
      stressFreeParking: 0,
      commuteFrictional: 0,
      megaScaleLiquidity: 0,
      totalPremiumScore: 0,
    };
  }
}
