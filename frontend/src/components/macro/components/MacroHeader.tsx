import React from 'react';
import PageHeroHeader from '@/components/PageHeroHeader';

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
        subtitleStrong={
          <>
            동탄 179개 단지 <span className="text-brand-orange font-extrabold px-0.5">실거래가·AI 밸류에이션</span>
          </>
        }
        subtitleLight="주담대·갈아타기 적정가 진단부터 안심 전세 자산 리포트까지"
        rightContent={
          <div className="hidden sm:flex items-center gap-2">
          </div>
        }
        rightSideContent={null}
      />
    </>
  );
});
