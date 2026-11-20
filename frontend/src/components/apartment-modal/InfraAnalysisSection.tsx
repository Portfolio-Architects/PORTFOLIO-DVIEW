import React from 'react';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/services/logger';
import { MapPin, Check, Share, ChevronDown } from 'lucide-react';
import { calculateInfraScore } from '@/lib/utils/scoring';
import { safeReload } from '@/lib/utils/safeReload';
import {
  getSeoAccordionClass,
  getSeoAccordionSummaryClass,
  getSeoAccordionBodyClass,
  getSeoAccordionChevronClass,
} from '@/lib/design-system/copyDiet';

const AnchorTenantSkeleton = () => (
  <div className="pt-6 border-t border-[#f2f4f6] dark:border-[#202027]">
    <div className="w-40 h-5 bg-[#f2f4f6] dark:bg-[#202027] rounded-lg mb-4 animate-shimmer" />
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-[#f9fafb] dark:bg-[#17171c] rounded-2xl p-4 min-h-[168px] animate-shimmer" />
      ))}
    </div>
  </div>
);

const AnchorTenantCard = dynamic(() => import('@/components/consumer/AnchorTenantCard').catch(err => {
  logger.warn('InfraAnalysisSection', 'AnchorTenantCard Chunk Load failure, initiating fallback reload', undefined, err);
  safeReload('AnchorTenantCard');
  return { default: () => null };
}), { 
  ssr: false,
  loading: () => <AnchorTenantSkeleton />
});

import { FieldReportData } from '@/lib/DashboardFacade';

interface InfraAnalysisSectionProps {
  report: FieldReportData;
  inline?: boolean;
  copiedStatus: string | null;
  handleShareSection: (section: 'childcare' | 'infra') => void;
}

const InfraAnalysisSection = React.memo(function InfraAnalysisSection({
  report,
  inline = false,
  copiedStatus,
  handleShareSection,
}: InfraAnalysisSectionProps) {
  if (!report.metrics || (!report.metrics.distanceToSubway && !report.metrics.restaurantDensity)) return null;

  // Generate JSON-LD structural data for Infra (SEO/Rich Snippets)
  const jsonLdElements = [];
  const metrics = report.metrics;
  if (!metrics) return null;

  if (metrics.distanceToSubway > 0) {
    jsonLdElements.push({
      "@type": "LocationFeatureSpecification",
      "name": `가장 가까운 지하철/SRT역 (${metrics.nearestStationName || '동탄역'})`,
      "value": `${Math.round(metrics.distanceToSubway)}m (도보 약 ${Math.ceil(metrics.distanceToSubway / 80)}분)`
    });
  }
  if (metrics.distanceToStarbucks !== undefined && metrics.distanceToStarbucks > 0) {
    jsonLdElements.push({
      "@type": "LocationFeatureSpecification",
      "name": `가장 가까운 스타벅스 (${metrics.starbucksName || '스타벅스'})`,
      "value": `${Math.round(metrics.distanceToStarbucks!)}m (도보 약 ${Math.ceil(metrics.distanceToStarbucks! / 80)}분)`
    });
  }
  if (metrics.distanceToOliveYoung !== undefined && metrics.distanceToOliveYoung > 0) {
    jsonLdElements.push({
      "@type": "LocationFeatureSpecification",
      "name": `가장 가까운 올리브영 (${metrics.oliveYoungName || '올리브영'})`,
      "value": `${Math.round(metrics.distanceToOliveYoung!)}m (도보 약 ${Math.ceil(metrics.distanceToOliveYoung! / 80)}분)`
    });
  }
  if (metrics.distanceToDaiso !== undefined && metrics.distanceToDaiso > 0) {
    jsonLdElements.push({
      "@type": "LocationFeatureSpecification",
      "name": `가장 가까운 다이소 (${metrics.daisoName || '다이소'})`,
      "value": `${Math.round(metrics.distanceToDaiso!)}m (도보 약 ${Math.ceil(metrics.distanceToDaiso! / 80)}분)`
    });
  }
  if (metrics.distanceToMcDonalds !== undefined && metrics.distanceToMcDonalds > 0) {
    jsonLdElements.push({
      "@type": "LocationFeatureSpecification",
      "name": `가장 가까운 맥도날드 (${metrics.mcdonaldsName || '맥도날드'})`,
      "value": `${Math.round(metrics.distanceToMcDonalds!)}m (도보 약 ${Math.ceil(metrics.distanceToMcDonalds! / 80)}분)`
    });
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    "name": "DVIEW 단지 주변 생활 인프라 입지 정보",
    "description": "지하철역, 대형마트, 올리브영, 스타벅스, 다이소 등 단지 주변 핵심 생활 편의시설의 최단 보행 거리 및 접근성 정보입니다.",
    "amenityFeature": jsonLdElements
  };

  return (
    <section 
      id="sec-infra-metrics" 
      className="bg-transparent flex flex-col gap-7 scroll-mt-14 snap-start"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between gap-2 mb-5">
          <h2 className="text-[18px] md:text-[20px] font-extrabold tracking-tight text-primary">
            입지 · 교통 정보
          </h2>
          <button
            type="button"
            onClick={() => handleShareSection('infra')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-semibold text-[12px] rounded-lg transition-colors cursor-pointer border-none bg-transparent text-tertiary hover:text-primary hover:bg-[#f2f4f6] dark:hover:bg-[#202027]"
            title="생활 인프라 분석 결과 공유하기"
          >
            {copiedStatus === 'infra-link' ? (
              <Check size={13} strokeWidth={2.4} className="text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Share size={13} strokeWidth={2.2} />
            )}
            <span>{copiedStatus === 'infra-link' ? '링크 복사됨' : '공유'}</span>
          </button>
        </div>

        {/* ─── 생활 인프라 종합 지수 (Infra Index) ─── */}
        {(() => {
          const infraScoreInfo = calculateInfraScore(report.metrics);
          const scoreColors: Record<string, { bg: string; text: string; border: string; descBg: string; scoreText: string }> = {
            S: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800/50', descBg: 'bg-surface dark:bg-[#202027]', scoreText: 'text-emerald-600 dark:text-emerald-400' },
            A: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800/50', descBg: 'bg-surface dark:bg-[#202027]', scoreText: 'text-blue-600 dark:text-blue-400' },
            B: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200/50 dark:border-blue-800/50', descBg: 'bg-surface dark:bg-[#202027]', scoreText: 'text-blue-600 dark:text-blue-400' },
            C: { bg: 'bg-slate-100 dark:bg-slate-800/60', text: 'text-slate-600 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-700/60', descBg: 'bg-surface dark:bg-[#202027]', scoreText: 'text-slate-600 dark:text-slate-300' }
          };
          const colors = scoreColors[infraScoreInfo.grade] || scoreColors.C;
          
          return (
            <div className="mb-7">
              <div className="bg-[#f9fafb] dark:bg-[#17171c] rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center gap-6">
                <div className="flex flex-col items-center justify-center shrink-0">
                  <div className={`w-20 h-20 rounded-full flex flex-col items-center justify-center border-2 ${colors.border} ${colors.bg} relative`}>
                    <span className="text-[10px] font-bold text-tertiary tracking-wider">GRADE</span>
                    <span className={`text-[30px] font-black leading-none ${colors.text}`}>{infraScoreInfo.grade}</span>
                  </div>
                </div>
                
                <div className="flex-1 w-full text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-baseline justify-center md:justify-start gap-1.5 mb-1.5">
                    <span className="text-[14px] font-bold text-secondary">생활 인프라 점수</span>
                    <div className="flex items-baseline justify-center gap-0.5 tabular-nums">
                      <span className={`text-[26px] font-black tracking-tight ${colors.scoreText}`}>{infraScoreInfo.score}</span>
                      <span className="text-[13px] font-semibold text-tertiary mt-auto pb-0.5">/ 100점</span>
                    </div>
                  </div>
                  <p className="text-[12.5px] font-medium text-tertiary mb-2.5">
                    지하철 · 트램 접근성 · 500m 상권 밀집도 종합
                  </p>
                  
                  <details className={getSeoAccordionClass(`${colors.descBg} text-left`)}>
                    <summary className={getSeoAccordionSummaryClass()}>
                      <span>생활 인프라 산정 기준 더보기</span>
                      <ChevronDown size={15} className={getSeoAccordionChevronClass()} />
                    </summary>
                    <div className={getSeoAccordionBodyClass()}>
                      <p className="text-[13px] font-medium text-secondary leading-relaxed break-keep">
                        {infraScoreInfo.description} (지하철·트램역까지의 대중교통 접근성과 스타벅스·올리브영·다이소·배스킨라빈스 등 생활 편의시설 밀집도를 가중 평균하여 연산한 지표입니다.)
                      </p>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── 교통 Section ─── */}
        {(report.metrics.distanceToSubway > 0 || (report.metrics.distanceToIndeokwon != null && report.metrics.distanceToIndeokwon > 0) || (report.metrics.distanceToTram != null && report.metrics.distanceToTram > 0)) && (
          <div className="mb-7">
            <div className="mb-3">
              <span className="text-[14px] font-bold text-secondary tracking-tight">교통망 정보</span>
            </div>
            <div className="flex overflow-x-auto custom-scrollbar gap-3 pb-1 sm:grid sm:grid-cols-3">
              {[
                { label: report.metrics.nearestStationLine || 'GTX-A / SRT', dist: report.metrics.distanceToSubway, name: report.metrics.nearestStationName, coords: report.metrics.nearestStationCoords, color: '#2563eb', bgFrom: '#eef6ff', bgTo: '#dbeafe' },
                { label: report.metrics.nearestIndeokwonLine || '인덕원선', dist: report.metrics.distanceToIndeokwon, name: report.metrics.nearestIndeokwonStationName, coords: report.metrics.nearestStationCoords, color: '#2563eb', bgFrom: '#eff6ff', bgTo: '#dbeafe' },
                { label: report.metrics.nearestTramLine || '동탄트램', dist: report.metrics.distanceToTram, name: report.metrics.nearestTramStationName, coords: report.metrics.nearestTramCoords, color: '#3182f6', bgFrom: '#eff6ff', bgTo: '#dbeafe' },
              ].filter(s => s.dist != null && s.dist > 0).map(station => {
                const dist = station.dist ?? 0;
                const percent = Math.min((dist / 1200) * 100, 100);
                return (
                  <div key={station.label} className="w-[160px] shrink-0 sm:w-auto bg-[#f9fafb] dark:bg-[#17171c] rounded-2xl p-4 flex flex-col justify-between transition-colors">
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <span className="text-[12.5px] font-bold text-secondary truncate">
                        {station.label}
                      </span>
                      {dist <= 400 ? (
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 shrink-0">초역세</span>
                      ) : dist <= 800 ? (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">역세권</span>
                      ) : null}
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-0.5 tabular-nums">
                      <span className="text-[22px] md:text-[26px] font-extrabold text-primary tracking-tight leading-none">
                        {Math.round(dist).toLocaleString()}
                      </span>
                      <span className="text-[12px] font-semibold text-tertiary">m</span>
                      <span className="text-[11.5px] font-bold text-blue-600 dark:text-blue-400 ml-auto whitespace-nowrap">
                        도보 {Math.ceil(dist / 80)}분
                      </span>
                    </div>

                    {/* Toss-style Distance Gauge Bar */}
                    <div className="mt-3 w-full bg-slate-200/70 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{ 
                          width: `${percent}%`,
                          backgroundColor: station.color
                        }}
                      />
                    </div>

                    {station.name && (
                      <a 
                        href={station.coords ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(station.coords)}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(station.name + (station.name.includes('정거장') ? ' 동탄' : ' 역'))}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[11.5px] flex items-center gap-1 font-semibold mt-3 text-tertiary hover:text-primary transition-colors"
                        title={`${station.name} 구글 지도에서 보기`}
                      >
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{station.name}</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── 생활 인프라 Section ─── */}
        {report.metrics.restaurantDensity != null && report.metrics.restaurantDensity > 0 && (
          <div>
            <div className="mb-3">
              <span className="text-[14px] font-bold text-secondary tracking-tight">주변 상권 (500m)</span>
            </div>
            <div className="flex flex-col gap-3">
              {(() => {
                const restaurantData = Object.entries(report.metrics.restaurantCategories || {}).map(([cat, cnt]) => {
                  let tag = '기타';
                  let color = '#64748b'; // slate-500
                  let bg = 'bg-slate-500';
                  
                  if (cat.includes('한식') || cat.includes('구이') || cat.includes('갈비') || cat.includes('삼겹살') || cat.includes('육류') || cat.includes('탕') || cat.includes('찌개') || cat.includes('백반')) {
                    tag = '한식/고기';
                    color = '#dc2626'; // red-600
                    bg = 'bg-red-600';
                  } else if (cat.includes('커피') || cat.includes('카페') || cat.includes('디저트') || cat.includes('찻집') || cat.includes('제과') || cat.includes('빵')) {
                    tag = '카페/음료';
                    color = '#334155'; // slate-700
                    bg = 'bg-slate-700';
                  } else if (cat.includes('일식') || cat.includes('회') || cat.includes('초밥') || cat.includes('돈까스') || cat.includes('스시')) {
                    tag = '일식/일반';
                    color = '#2563eb'; // blue-600
                    bg = 'bg-blue-600';
                  } else if (cat.includes('중식') || cat.includes('중국') || cat.includes('짜장') || cat.includes('짬뽕')) {
                    tag = '중식/아시안';
                    color = '#059669'; // emerald-600
                    bg = 'bg-emerald-600';
                  } else if (cat.includes('양식') || cat.includes('경양식') || cat.includes('피자') || cat.includes('파스타') || cat.includes('스테이크') || cat.includes('뷔페') || cat.includes('패스트')) {
                    tag = '양식/양식';
                    color = '#2563eb'; // blue-600
                    bg = 'bg-blue-600';
                  } else if (cat.includes('분식') || cat.includes('떡볶이') || cat.includes('김밥') || cat.includes('만두') || cat.includes('라면')) {
                    tag = '분식/간식';
                    color = '#2563eb'; // blue-600
                    bg = 'bg-emerald-600';
                  } else if (cat.includes('호프') || cat.includes('맥주') || cat.includes('치킨') || cat.includes('닭강정') || cat.includes('통닭') || cat.includes('술집')) {
                    tag = '치킨/주점';
                    color = '#475569'; // slate-600
                    bg = 'bg-slate-600';
                  }
                  return { cat, cnt: cnt as number, tag, color, bg };
                });

                const totalRestaurantCount = restaurantData.reduce((sum, item) => sum + item.cnt, 0);
                const restTagSums: Record<string, { count: number; color: string; bg: string }> = {};
                restaurantData.forEach(item => {
                  if (!restTagSums[item.tag]) {
                    restTagSums[item.tag] = { count: 0, color: item.color, bg: item.bg };
                  }
                  restTagSums[item.tag].count += item.cnt;
                });

                const sortedRestTags = Object.entries(restTagSums).sort((a, b) => b[1].count - a[1].count);

                return (
                  <div className="w-full bg-[#f9fafb] dark:bg-[#17171c] rounded-2xl p-4 md:p-5 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-bold text-secondary truncate pr-1">
                        음식점·카페 (반경 500m)
                      </span>
                    </div>
                    
                    <div className="flex items-baseline gap-0.5 mb-3.5 whitespace-nowrap">
                      <span className="text-[24px] md:text-[28px] font-extrabold text-primary tracking-tight tabular-nums leading-none">{report.metrics.restaurantDensity}</span>
                      <span className="text-[12.5px] font-semibold text-tertiary ml-1 pb-0.5">개</span>
                    </div>

                    {totalRestaurantCount > 0 && (
                      <div className="mb-3.5">
                        {/* 수평 비율 게이지 바 */}
                        <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-slate-200/70 dark:bg-slate-800 mb-2.5">
                          {sortedRestTags.map(([tag, data]) => {
                            const percent = (data.count / totalRestaurantCount) * 100;
                            return (
                              <div 
                                key={tag} 
                                className={`${data.bg} h-full transition-all duration-300`}
                                style={{ width: `${percent}%` }}
                                title={`${tag}: ${data.count}개 (${Math.round(percent)}%)`}
                              />
                            );
                          })}
                        </div>
                        
                        {/* 범례 */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                          {sortedRestTags.map(([tag, data]) => {
                            const percent = (data.count / totalRestaurantCount) * 100;
                            return (
                              <div key={tag} className="flex items-center gap-1.5 text-[11px] font-semibold text-secondary tabular-nums">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                                <span>{tag}</span>
                                <span className="text-primary font-bold">{data.count}개</span>
                                <span className="text-tertiary text-[10px]">({Math.round(percent)}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {report.metrics.restaurantCategories && Object.keys(report.metrics.restaurantCategories).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 border-t border-[#f2f4f6] dark:border-[#202027] pt-3.5 mt-1">
                        {Object.entries(report.metrics.restaurantCategories)
                          .sort(([,a], [,b]) => (b as number) - (a as number))
                          .slice(0, 5)
                          .map(([cat, cnt]) => (
                            <div key={cat} className="flex justify-between items-center bg-surface dark:bg-[#202027] rounded-xl px-3 py-2">
                              <span className="text-[12px] font-semibold text-secondary truncate mr-2">{cat}</span>
                              <span className="font-bold text-[12px] text-primary shrink-0 tabular-nums">{cnt as number}개</span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

      </div>

      {/* Anchor Tenant Metrics — 주요 편의시설 접근성 시각화 */}
      {report.metrics && (
        <AnchorTenantCard
          distanceToStarbucks={report.metrics.distanceToStarbucks}
          starbucksName={report.metrics.starbucksName}
          starbucksAddress={report.metrics.starbucksAddress}
          starbucksCoordinates={report.metrics.starbucksCoordinates}
          distanceToOliveYoung={report.metrics.distanceToOliveYoung}
          oliveYoungName={report.metrics.oliveYoungName}
          oliveYoungAddress={report.metrics.oliveYoungAddress}
          oliveYoungCoordinates={report.metrics.oliveYoungCoordinates}
          distanceToDaiso={report.metrics.distanceToDaiso}
          daisoName={report.metrics.daisoName}
          daisoAddress={report.metrics.daisoAddress}
          daisoCoordinates={report.metrics.daisoCoordinates}
          distanceToMcDonalds={report.metrics.distanceToMcDonalds}
          mcdonaldsName={report.metrics.mcdonaldsName}
          mcdonaldsAddress={report.metrics.mcdonaldsAddress}
          mcdonaldsCoordinates={report.metrics.mcdonaldsCoordinates}
        />
      )}
    </section>
  );
});

InfraAnalysisSection.displayName = 'InfraAnalysisSection';
export default InfraAnalysisSection;
