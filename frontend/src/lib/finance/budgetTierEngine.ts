import { GUIDE_DEFAULT_TX_SUMMARY_MAP } from '@/lib/data/guides';
import { getDisplayAptName, resolveCanonicalAptSlug } from '@/lib/utils/apartmentMapping';
import { formatPriceEok } from '@/lib/utils/analyticsUtils';
import type { AptTxSummary } from '@/types/transaction';

export type DongtanBudgetTierCode = 'S' | 'A' | 'B' | 'C' | 'STARTER';

export interface BudgetTierInput {
  /** 보유 현금(만원), 예: 25000 = 2.5억 */
  cashManwon: number;
  /** 부부 합산 연소득(만원), 예: 9000 = 9,000만원 */
  annualIncomeManwon: number;
  /** 생애최초 구입 여부 (LTV 80%, 최대 6억 한도 적용) */
  isFirstHome?: boolean;
  /** 주담대 기준 연금리 (%) - 기본 4.2% */
  baseRatePct?: number;
  /** 스트레스 DSR 가산금리 (%p) - 기본 1.2%p */
  stressAddPct?: number;
}

export interface BudgetTierComplexItem {
  canonicalSlug: string;
  displayName: string;
  dong: string;
  latestPriceManwon: number;
  latestPriceStr: string;
  latestRentManwon: number;
  jeonseRatio: number | null;
  txCount: number;
}

export interface BudgetTierDiagnosis {
  tierCode: DongtanBudgetTierCode;
  tierName: string;
  tierSummary: string;
  cashManwon: number;
  maxLoanByDsrManwon: number;
  maxLoanByLtvManwon: number;
  effectiveLoanManwon: number;
  maxBudgetManwon: number;
  maxBudgetStr: string;
  affordableCount: number;
  totalVerifiedCount: number;
  affordableRatioPct: number;
  topAffordableComplexes: BudgetTierComplexItem[];
  nextUnlockTarget: {
    complex: BudgetTierComplexItem;
    gapManwon: number;
    gapStr: string;
  } | null;
  recommendedGuideSlug: string;
  recommendedGuideLabel: string;
}

const DEFAULT_BASE_RATE_PCT = 4.2;
const DEFAULT_STRESS_ADD_PCT = 1.2;
const LOAN_TERM_MONTHS = 360; // 30년 만기 원리금균등
const DSR_RATIO_LIMIT = 0.4;
const FIRST_HOME_LOAN_CAP_MANWON = 60000; // 생애최초 최대 6억

/**
 * Computes maximum principal (만원) supported under equal-payment amortization for a given monthly budget.
 */
function calcMaxPrincipalFromMonthlyPayment(
  monthlyPaymentManwon: number,
  annualRatePct: number,
  months: number
): number {
  if (monthlyPaymentManwon <= 0 || months <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r <= 0) return Math.round(monthlyPaymentManwon * months);
  const factor = (1 - Math.pow(1 + r, -months)) / r;
  return Math.max(0, Math.round(monthlyPaymentManwon * factor));
}

function classifyTier(maxBudgetManwon: number): {
  code: DongtanBudgetTierCode;
  name: string;
  summary: string;
  guideSlug: string;
  guideLabel: string;
} {
  if (maxBudgetManwon >= 150000) {
    return {
      code: 'S',
      name: 'S티어 · 동탄역 초역세권·랜드마크 사정권',
      summary: 'GTX-A 동탄역 도보권·시범단지 최상위 대장주까지 폭넓게 선택할 수 있는 구간입니다.',
      guideSlug: 'dongtan-station-gbcx-vs-sibeom-comparison',
      guideLabel: '동탄역 광비콤 vs 시범 4대장 비교 리포트',
    };
  }
  if (maxBudgetManwon >= 100000) {
    return {
      code: 'A',
      name: 'A티어 · 1동탄 완성 학군·호수공원 핵심권',
      summary: '반송동 솔빛·한빛마을 학군지와 산척동 호수 에듀타운·청계동 주력 단지를 노릴 수 있습니다.',
      guideSlug: 'dongtan-1-vs-2-comparison',
      guideLabel: '1동탄 vs 2동탄 10억대 학군·실거래 비교',
    };
  }
  if (maxBudgetManwon >= 70000) {
    return {
      code: 'B',
      name: 'B티어 · 직주근접·중동탄 실속 진입권',
      summary: '능동·석우동 반도체 직주근접 단지와 목동·장지동 동탄2 실속 신축 단지가 사정권입니다.',
      guideSlug: 'dongtan-budget-tier-ranking',
      guideLabel: '6억·9억·12억 예산별 동탄 현실 지도 보기',
    };
  }
  if (maxBudgetManwon >= 45000) {
    return {
      code: 'C',
      name: 'C티어 · 중소형·가성비 첫 내 집 사정권',
      summary: '동탄 내 합리적 가격대의 중소형 실거래 단지와 생애최초 정책대출 조합을 적극 활용할 구간입니다.',
      guideSlug: 'dongtan-first-home-policy-loan-comparison',
      guideLabel: '신생아·디딤돌 생애최초 정책대출 리포트',
    };
  }
  return {
    code: 'STARTER',
    name: '준비 단계 · 전세 안전망 및 종잣돈 축적 구간',
    summary: '무리한 영끌보다 전세보증보험 안전 단지에 거주하며 종잣돈과 정책대출 요건을 먼저 다지는 전략이 유리합니다.',
    guideSlug: 'dongtan-jeonse-hug-126-safety-manual',
    guideLabel: '동탄 전세 안전마진·HUG 126% 체크 리포트',
  };
}

export function extractVerifiedComplexCatalog(
  txMap: Record<string, Partial<AptTxSummary> | undefined> = GUIDE_DEFAULT_TX_SUMMARY_MAP
): BudgetTierComplexItem[] {
  const seen = new Set<string>();
  const items: BudgetTierComplexItem[] = [];

  for (const [rawKey, summary] of Object.entries(txMap || {})) {
    if (!summary || typeof summary.latestPrice !== 'number' || !Number.isFinite(summary.latestPrice) || summary.latestPrice <= 0) {
      continue;
    }
    const canonicalSlug = (
      resolveCanonicalAptSlug(rawKey, { txMap: txMap as Record<string, unknown>, dong: summary.dong }) || rawKey
    ).normalize('NFC');
    if (seen.has(canonicalSlug)) continue;
    seen.add(canonicalSlug);

    const canonicalSummary = txMap[canonicalSlug] || summary;
    const latestPriceManwon = Math.round(canonicalSummary?.latestPrice || summary.latestPrice);
    if (latestPriceManwon <= 0) continue;

    const latestRentManwon =
      typeof canonicalSummary?.latestRentDeposit === 'number' &&
      Number.isFinite(canonicalSummary.latestRentDeposit) &&
      canonicalSummary.latestRentDeposit > 0
        ? Math.round(canonicalSummary.latestRentDeposit)
        : 0;

    items.push({
      canonicalSlug,
      displayName: getDisplayAptName(canonicalSlug) || canonicalSlug,
      dong: canonicalSummary?.dong || '',
      latestPriceManwon,
      latestPriceStr: formatPriceEok(latestPriceManwon),
      latestRentManwon,
      jeonseRatio:
        latestRentManwon > 0 ? Math.round((latestRentManwon / latestPriceManwon) * 1000) / 10 : null,
      txCount: typeof canonicalSummary?.txCount === 'number' ? canonicalSummary.txCount : 0,
    });
  }

  return items.sort((a, b) => a.latestPriceManwon - b.latestPriceManwon);
}

/**
 * Pure real-data engine computing realistic Dongtan purchasing tier under Stress DSR 40% & LTV constraints.
 */
export function evaluateDongtanBudgetTier(
  input: BudgetTierInput,
  catalog: BudgetTierComplexItem[] = extractVerifiedComplexCatalog()
): BudgetTierDiagnosis {
  const cashManwon = Math.max(0, Math.round(Number.isFinite(input.cashManwon) ? input.cashManwon : 0));
  const annualIncomeManwon = Math.max(
    0,
    Math.round(Number.isFinite(input.annualIncomeManwon) ? input.annualIncomeManwon : 0)
  );
  const isFirstHome = Boolean(input.isFirstHome);
  const baseRatePct = input.baseRatePct ?? DEFAULT_BASE_RATE_PCT;
  const stressAddPct = input.stressAddPct ?? DEFAULT_STRESS_ADD_PCT;

  const monthlyDsrCapManwon = (annualIncomeManwon * DSR_RATIO_LIMIT) / 12;
  const maxLoanByDsrManwon = calcMaxPrincipalFromMonthlyPayment(
    monthlyDsrCapManwon,
    baseRatePct + stressAddPct,
    LOAN_TERM_MONTHS
  );

  // Under LTV L, max loan from cash C is C * L / (1 - L)
  const ltvRatio = isFirstHome ? 0.8 : 0.7;
  const rawLtvLoan = Math.round((cashManwon * ltvRatio) / (1 - ltvRatio));
  const maxLoanByLtvManwon = isFirstHome
    ? Math.min(rawLtvLoan, FIRST_HOME_LOAN_CAP_MANWON)
    : rawLtvLoan;

  const effectiveLoanManwon = Math.max(0, Math.min(maxLoanByDsrManwon, maxLoanByLtvManwon));
  const maxBudgetManwon = cashManwon + effectiveLoanManwon;

  const sortedCatalog = [...catalog].sort((a, b) => a.latestPriceManwon - b.latestPriceManwon);
  const affordable = sortedCatalog.filter((item) => item.latestPriceManwon <= maxBudgetManwon);
  const aboveBudget = sortedCatalog.filter((item) => item.latestPriceManwon > maxBudgetManwon);

  // Show top flagship complexes closest to the user's upper budget ceiling (prioritizing liquidity on ties)
  const topAffordableComplexes = [...affordable]
    .sort((a, b) => {
      const priceDiff = b.latestPriceManwon - a.latestPriceManwon;
      if (Math.abs(priceDiff) <= 3000) {
        return b.txCount - a.txCount;
      }
      return priceDiff;
    })
    .slice(0, 4);

  const nextCandidate = aboveBudget[0] || null;
  const nextUnlockTarget = nextCandidate
    ? {
        complex: nextCandidate,
        gapManwon: nextCandidate.latestPriceManwon - maxBudgetManwon,
        gapStr: formatPriceEok(nextCandidate.latestPriceManwon - maxBudgetManwon),
      }
    : null;

  const tier = classifyTier(maxBudgetManwon);
  const totalVerifiedCount = sortedCatalog.length;
  const affordableRatioPct =
    totalVerifiedCount > 0 ? Math.round((affordable.length / totalVerifiedCount) * 100) : 0;

  return {
    tierCode: tier.code,
    tierName: tier.name,
    tierSummary: tier.summary,
    cashManwon,
    maxLoanByDsrManwon,
    maxLoanByLtvManwon,
    effectiveLoanManwon,
    maxBudgetManwon,
    maxBudgetStr: formatPriceEok(maxBudgetManwon),
    affordableCount: affordable.length,
    totalVerifiedCount,
    affordableRatioPct,
    topAffordableComplexes,
    nextUnlockTarget,
    recommendedGuideSlug: tier.guideSlug,
    recommendedGuideLabel: tier.guideLabel,
  };
}
