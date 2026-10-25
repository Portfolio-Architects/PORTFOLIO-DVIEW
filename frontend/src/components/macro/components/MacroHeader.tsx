import React from 'react';
import PageHeroHeader from '@/components/PageHeroHeader';
import { MarketStatsStrong, MarketStatsLight } from '@/components/common/MarketStatsSubtitle';

export interface MacroHeaderProps {
  macroTrendJsonLd: string | null;
}

export const MacroHeader = React.memo(function MacroHeader({
  macroTrendJsonLd,
}: MacroHeaderProps) {
  return (
    <>
      {macroTrendJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: macroTrendJsonLd }}
        />
      )}
      <PageHeroHeader 
        title="D-VIEW 동탄 아파트 랩"
        compactTitle="D-VIEW 동탄 아파트 랩"
        subtitleStrong={<MarketStatsStrong />}
        subtitleLight={<MarketStatsLight text="내 한도로 살 수 있는 단지와 갈아타기 손익까지" />}
        rightContent={
          <div className="hidden sm:flex items-center gap-2">
          </div>
        }
        rightSideContent={null}
      />
    </>
  );
});
