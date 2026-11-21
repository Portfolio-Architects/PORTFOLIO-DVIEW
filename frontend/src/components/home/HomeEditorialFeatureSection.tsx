import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { GuideArticle } from '@/lib/data/guides';
import type { ResolvedBalanceMatchup } from '@/lib/data/balanceMatchups';
import type { BudgetTierComplexItem } from '@/lib/finance/budgetTierEngine';
import BalanceMatchupWidget from '@/components/engagement/BalanceMatchupWidget';
import BudgetTierChallengeWidget from '@/components/engagement/BudgetTierChallengeWidget';
import { getVisualSignalPillClass } from '@/lib/design-system/copyDiet';

export interface HomeEditorialFeatureSectionProps {
  featuredGuides?: GuideArticle[];
  matchups: ResolvedBalanceMatchup[];
  budgetCatalog: BudgetTierComplexItem[];
  totalGuidesCount: number;
  verifiedComplexCount: number;
  latestSyncDateLabel?: string;
}

export default function HomeEditorialFeatureSection({
  matchups,
  budgetCatalog,
  totalGuidesCount,
  verifiedComplexCount,
  latestSyncDateLabel,
}: HomeEditorialFeatureSectionProps) {
  return (
    <div
      id="home-editorial-feature-showcase"
      data-testid="home-editorial-feature-showcase"
      className="space-y-5"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-[15px] sm:text-[17px] font-black text-primary tracking-tight">
            동탄 실거래 참여 랩
          </h2>
          <span className={getVisualSignalPillClass('neutral')}>실데이터 연동</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-bold text-tertiary tabular-nums">
            국토부 검증 {verifiedComplexCount}개 단지{latestSyncDateLabel ? ` · ${latestSyncDateLabel}` : ''}
          </span>
          <Link
            href="/guide"
            prefetch={false}
            className="inline-flex items-center gap-1 text-[11.5px] font-extrabold text-primary hover:underline tabular-nums shrink-0"
          >
            <span>전체 {totalGuidesCount}편 리포트 보기</span>
            <ArrowRight size={12} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Standalone Wide Section 1: 1:1 Balance Matchup */}
      <div data-testid="home-standalone-matchup-section" className="w-full">
        <BalanceMatchupWidget
          matchups={matchups}
          surface="home_editorial"
          heading="오늘의 동탄 1:1 밸런스 맞대결"
        />
      </div>

      {/* Standalone Wide Section 2: Budget Tier Reality Diagnosis */}
      <div data-testid="home-standalone-budget-section" className="w-full">
        <BudgetTierChallengeWidget
          catalog={budgetCatalog}
          surface="home_editorial"
          variant="full"
        />
      </div>
    </div>
  );
}
