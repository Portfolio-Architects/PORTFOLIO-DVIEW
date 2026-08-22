/**
 * @module valuation
 * @description Domain models for Quantitative Valuation, DCF Implied Price, and Location Scoring Engines.
 * Architecture Layer: Domain & Types (zero dependencies, zero logic)
 */

/** Individual sub-score detail */
export interface ScoreDetailItem {
  score: number;
  max: number;
  label: string;
  data?: string;
}

/** 11-factor location and infrastructure score breakdown */
export interface ScoreBreakdown {
  gtx: ScoreDetailItem;
  indeokwon: ScoreDetailItem;
  tram: ScoreDetailItem;
  school: ScoreDetailItem;
  academy: ScoreDetailItem;
  store: ScoreDetailItem;
  parkDist: ScoreDetailItem;
  brand: ScoreDetailItem;
  scale: ScoreDetailItem;
  parking: ScoreDetailItem;
  year: ScoreDetailItem;
  [key: string]: unknown;
}

/** Composite scoring structure with category breakdown */
export interface PremiumScores {
  education: number;
  transport: number;
  livingComfort: number;
  complex: number;
  lifestyle: number;
  totalScore: number;
  eduTimePremium: number;
  stressFreeParking: number;
  commuteFrictional: number;
  megaScaleLiquidity: number;
  totalPremiumScore: number;
  details?: ScoreBreakdown;
  breakdown?: Record<string, number>;
}

/** Quantitative valuation analysis result */
export interface ValuationResult {
  purScore: number;
  dcfImpliedPrice: number;
  capRate: number;
  discountRate: number;
  estimatedYield: number;
  fairValueGap: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  basePrice?: number;
  fairPrice?: number;
  undervaluedRatio?: number;
}

/** Comprehensive valuation comparison breakdown */
export interface ValuationBreakdown {
  dcfImpliedPrice: number;
  purImpliedPrice: number;
  fairValueMid: number;
  currentPrice: number;
  gapAmount: number;
  gapPercent: number;
  status: 'undervalued' | 'overvalued' | 'fair';
}

/** Discounted Cash Flow (DCF) computation result */
export interface DCFResult {
  impliedPrice: number;
  npv: number;
  terminalValue: number;
  capRate: number;
  discountRate: number;
}

/** Dong-level price spread and percentile comparison */
export interface DongSpreadResult {
  dong: string;
  avgPrice: number;
  spreadVsAvg: number;
  percentile: number;
}

/** Individual category score detail */
export interface ScoreDetail {
  category: string;
  label: string;
  score: number;
  maxScore: number;
  description: string;
}
