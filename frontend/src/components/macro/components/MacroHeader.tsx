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
        title="D-VIEW 아파트 랩"
        compactTitle="D-VIEW 아파트 랩"
        subtitleStrong={
          <>
            동탄 아파트 <span className="text-[#ea6100] font-extrabold px-0.5">실거래가·인프라</span> 종합 분석
          </>
        }
        subtitleLight="돌봄·교통 지수 분석 및 안심 거래 가치 리포트 제공"
        rightContent={
          <div className="hidden sm:flex items-center gap-2">
          </div>
        }
        rightSideContent={null}
      />
    </>
  );
});
