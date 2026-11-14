import React from 'react';
import PageHeroHeader from '@/components/PageHeroHeader';
import { MarketStatsStrong, MarketStatsLight } from '@/components/common/MarketStatsSubtitle';

export interface MacroHeaderProps {
  macroTrendJsonLd: string | null;
  isSplitMode?: boolean;
}

export const MacroHeader = React.memo(function MacroHeader({
  macroTrendJsonLd,
  isSplitMode = false,
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
        subtitleLight={<MarketStatsLight />}
        isSplitMode={isSplitMode}
        rightContent={null}
        rightSideContent={null}
      />
    </>
  );
});
