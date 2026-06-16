import React from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Check, Share } from 'lucide-react';
import { calculateInfraScore } from '@/lib/utils/scoring';
import { safeReload } from '@/lib/utils/safeReload';

const AnchorTenantCard = dynamic(() => import('@/components/consumer/AnchorTenantCard').catch(err => {
  console.warn('AnchorTenantCard Chunk Load failure, initiating fallback reload', err);
  safeReload('AnchorTenantCard');
  return { default: () => null };
}), { ssr: false });

interface InfraAnalysisSectionProps {
  report: any;
  inline?: boolean;
  copiedStatus: string | null;
  handleShareSection: (section: 'childcare' | 'infra') => void;
}

export default function InfraAnalysisSection({
  report,
  inline = false,
  copiedStatus,
  handleShareSection,
}: InfraAnalysisSectionProps) {
  if (!report.metrics || (!report.metrics.distanceToSubway && !report.metrics.restaurantDensity)) return null;

  return (
    <section 
      id="sec-infra-metrics" 
      className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm border border-border flex flex-col gap-10 scroll-mt-14`}
    >
      <div className="flex flex-col w-full">
        <h2 className="text-[18px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
          <MapPin size={18} className="text-[#008262]"/> 단지 입지정보
        </h2>

        {/* ─── 🚇 생활 인프라 종합 지수 (Infra Index) ─── */}
        {(() => {
          const infraScoreInfo = calculateInfraScore(report.metrics);
          const scoreColors: Record<string, { bg: string; text: string; border: string; descBg: string; scoreText: string }> = {
            S: { bg: 'bg-[#e6f7f3]', text: 'text-[#008262]', border: 'border-[#a7f3d0]/50', descBg: 'bg-[#008262]/5', scoreText: 'text-[#008262]' },
            A: { bg: 'bg-[#f0f9ff]', text: 'text-[#0284c7]', border: 'border-[#bae6fd]/50', descBg: 'bg-[#0284c7]/5', scoreText: 'text-[#0284c7]' },
            B: { bg: 'bg-[#f5f3ff]', text: 'text-[#4f46e5]', border: 'border-[#c7d2fe]/50', descBg: 'bg-[#4f46e5]/5', scoreText: 'text-[#4f46e5]' },
            C: { bg: 'bg-[#f8fafc]', text: 'text-[#475569]', border: 'border-[#e2e8f0]/50', descBg: 'bg-[#475569]/5', scoreText: 'text-[#475569]' }
          };
          const colors = scoreColors[infraScoreInfo.grade] || scoreColors.C;
          
          return (
            <div className="mb-8">
              <div className="flex items-center justify-between gap-2 mb-4 border-l-[3px] border-toss-blue pl-2.5">
                <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">생활 인프라 지표</span>
                <button
                  onClick={() => handleShareSection('infra')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-bold text-[12px] rounded-xl transition-all border shadow-sm cursor-pointer transform duration-200 active:scale-[0.94] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 ${
                    copiedStatus === 'infra-link'
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-[#f0f9ff] dark:bg-[#0284c7]/10 hover:bg-[#e0f2fe] dark:hover:bg-[#0284c7]/20 active:bg-[#bae6fd] text-[#0284c7] border-[#0284c7]/20'
                  }`}
                  title="생활 인프라 분석 결과 카카오톡 공유하기"
                >
                  {copiedStatus === 'infra-link' ? (
                    <Check size={12} strokeWidth={2.5} className="text-emerald-500" />
                  ) : (
                    <Share size={12} strokeWidth={2.5} className={copiedStatus === 'infra-link' ? 'text-emerald-500/80' : 'text-[#0284c7]/80'} />
                  )}
                  <span>{copiedStatus === 'infra-link' ? '공유 링크 복사됨!' : '평가 결과 공유하기'}</span>
                </button>
              </div>
              
              <div className="bg-body rounded-2xl p-5 md:p-6 border border-border flex flex-col md:flex-row items-center gap-6">
                <div className="flex flex-col items-center justify-center shrink-0">
                  <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 ${colors.border} ${colors.bg} shadow-sm relative group`}>
                    <span className="text-[12px] font-extrabold text-secondary tracking-wider">GRADE</span>
                    <span className={`text-[36px] font-black leading-none ${colors.text} -mt-0.5`}>{infraScoreInfo.grade}</span>
                  </div>
                </div>
                
                <div className="flex-1 w-full text-center md:text-left">
                  <div className="flex flex-col md:flex-row md:items-baseline justify-center md:justify-start gap-1 mb-2">
                    <span className="text-[16px] font-bold text-secondary">종합 생활 인프라 지수:</span>
                    <div className="flex items-baseline justify-center gap-0.5">
                      <span className={`text-[28px] font-black tracking-tight ${colors.scoreText}`}>{infraScoreInfo.score}</span>
                      <span className="text-[14px] font-bold text-secondary mt-auto pb-0.5">/ 100 점</span>
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-xl ${colors.descBg} border border-toss-blue/10 text-left`}>
                    <p className="text-[14px] font-bold text-primary mb-1">D-VIEW 단지 생활권 리포트</p>
                    <p className="text-[13px] font-medium text-secondary leading-relaxed break-keep">
                      {infraScoreInfo.description} (지하철·트램역까지의 대중교통 접근성과 스타벅스·올리브영·다이소·배스킨라빈스 등 생활 편의시설 밀집도를 가중 평균하여 연산한 지표입니다.)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── 🚇 교통 Section ─── */}
        {(report.metrics.distanceToSubway > 0 || (report.metrics.distanceToIndeokwon != null && report.metrics.distanceToIndeokwon > 0) || (report.metrics.distanceToTram != null && report.metrics.distanceToTram > 0)) && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4 border-l-[3px] border-[#00d29d] pl-2.5">
              <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">교통망 정보</span>
            </div>
            <div className="flex overflow-x-auto custom-scrollbar gap-3 pb-2 sm:grid sm:grid-cols-3 md:gap-3">
              {[
                { label: report.metrics.nearestStationLine || 'GTX-A / SRT', dist: report.metrics.distanceToSubway, name: report.metrics.nearestStationName, coords: report.metrics.nearestStationCoords, color: '#00d29d', bgFrom: '#eef6ff', bgTo: '#dbeafe' },
                { label: report.metrics.nearestIndeokwonLine || '인덕원선', dist: report.metrics.distanceToIndeokwon, name: report.metrics.nearestIndeokwonStationName, coords: report.metrics.nearestStationCoords, color: '#7c3aed', bgFrom: '#f5f3ff', bgTo: '#ede9fe' },
                { label: report.metrics.nearestTramLine || '동탄트램', dist: report.metrics.distanceToTram, name: report.metrics.nearestTramStationName, coords: report.metrics.nearestTramCoords, color: '#0891b2', bgFrom: '#ecfeff', bgTo: '#cffafe' },
              ].filter(s => s.dist != null && s.dist > 0).map(station => {
                const dist = station.dist ?? 0;
                const percent = Math.min((dist / 1200) * 100, 100);
                return (
                  <div key={station.label} className="w-[150px] shrink-0 sm:w-auto bg-body rounded-2xl p-4 md:p-5 flex flex-col hover:bg-surface hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 group ring-1 ring-black/5 dark:ring-white/10">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[13px] md:text-[14px] font-extrabold text-secondary/80 truncate pr-1">
                          {station.label}
                        </span>
                        {dist <= 400 && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#e0f2fe] text-[#0369a1] dark:bg-[#0369a1]/30 dark:text-[#7dd3fc] shrink-0 leading-none">초역세</span>
                        )}
                        {dist > 400 && dist <= 800 && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-[#f0fdf4] text-[#166534] dark:bg-[#166534]/30 dark:text-[#86efac] shrink-0 leading-none">역세권</span>
                        )}
                      </div>
                      {dist <= 400 ? (
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: station.color }}></span>
                          <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: station.color }}></span>
                        </span>
                      ) : (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: station.color }} />
                      )}
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-baseline gap-1.5 lg:gap-2 mt-1 lg:mt-0">
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-[24px] md:text-[32px] font-extrabold text-primary tracking-tight tabular-nums leading-none">
                          {Math.round(dist).toLocaleString()}
                        </span>
                        <span className="text-[12px] md:text-[14px] font-bold text-secondary mt-auto pb-0.5">
                          m
                        </span>
                      </div>
                      <span 
                        className="text-[11px] md:text-[12px] px-2 py-0.5 rounded-md w-fit whitespace-nowrap font-bold shadow-sm"
                        style={{ backgroundColor: station.bgFrom, color: station.color }}
                      >
                        도보 {Math.ceil(dist / 80)}분
                      </span>
                    </div>

                    {/* Toss-style Distance Gauge Bar */}
                    <div className="mt-3.5 w-full bg-slate-100 dark:bg-slate-800/60 h-2 rounded-full overflow-hidden relative shadow-inner">
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
                        className="text-[11px] md:text-[12px] flex items-center justify-center gap-1 font-bold mt-3 md:mt-4 rounded-xl px-2.5 py-2 text-center text-secondary transition-all duration-300 hover:scale-[1.02] active:scale-95 bg-surface border border-border shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[color:var(--hover-color)] hover:text-[color:var(--hover-color)] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1"
                        style={{ '--hover-color': station.color } as React.CSSProperties}
                        title={`${station.name} 구글 지도에서 보기`}
                      >
                        <MapPin size={12} className="shrink-0 md:w-3.5 md:h-3.5" />
                        <span className="truncate leading-tight block">{station.name}</span>
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── 🏪 생활 인프라 Section ─── */}
        {report.metrics.restaurantDensity != null && report.metrics.restaurantDensity > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4 border-l-[3px] border-[#f59e0b] pl-2.5">
              <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">생활권 인프라</span>
            </div>
            <div className="flex overflow-x-auto custom-scrollbar gap-3 pb-2 sm:grid sm:grid-cols-1 md:gap-3">
              {(() => {
                const restaurantData = Object.entries(report.metrics.restaurantCategories || {}).map(([cat, cnt]) => {
                  let tag = '기타';
                  let color = '#64748b'; // slate-500
                  let bg = 'bg-[#64748b]';
                  
                  if (cat.includes('한식') || cat.includes('구이') || cat.includes('갈비') || cat.includes('삼겹살') || cat.includes('육류') || cat.includes('탕') || cat.includes('찌개') || cat.includes('백반')) {
                    tag = '한식/고기';
                    color = '#e11d48'; // rose-600
                    bg = 'bg-[#e11d48]';
                  } else if (cat.includes('커피') || cat.includes('카페') || cat.includes('디저트') || cat.includes('찻집') || cat.includes('제과') || cat.includes('빵')) {
                    tag = '카페/음료';
                    color = '#b45309'; // amber-700
                    bg = 'bg-[#b45309]';
                  } else if (cat.includes('일식') || cat.includes('회') || cat.includes('초밥') || cat.includes('돈까스') || cat.includes('스시')) {
                    tag = '일식/일반';
                    color = '#0284c7'; // sky-600
                    bg = 'bg-[#0284c7]';
                  } else if (cat.includes('중식') || cat.includes('중국') || cat.includes('짜장') || cat.includes('짬뽕')) {
                    tag = '중식/아시안';
                    color = '#ea580c'; // orange-600
                    bg = 'bg-[#ea580c]';
                  } else if (cat.includes('양식') || cat.includes('경양식') || cat.includes('피자') || cat.includes('파스타') || cat.includes('스테이크') || cat.includes('뷔페') || cat.includes('패스트')) {
                    tag = '양식/양식';
                    color = '#7c3aed'; // purple-600
                    bg = 'bg-[#7c3aed]';
                  } else if (cat.includes('분식') || cat.includes('떡볶이') || cat.includes('김밥') || cat.includes('만두') || cat.includes('라면')) {
                    tag = '분식/간식';
                    color = '#0d9488'; // teal-600
                    bg = 'bg-[#0d9488]';
                  } else if (cat.includes('호프') || cat.includes('맥주') || cat.includes('치킨') || cat.includes('닭강정') || cat.includes('통닭') || cat.includes('술집')) {
                    tag = '치킨/주점';
                    color = '#f59e0b'; // amber-500
                    bg = 'bg-[#f59e0b]';
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
                  <div className="w-full bg-body rounded-2xl p-4 md:p-5 flex flex-col hover:bg-surface hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 group ring-1 ring-black/5 dark:ring-white/10">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <span className="text-[13px] md:text-[14px] font-extrabold text-secondary/80 truncate pr-1">
                        음식점·카페·500m
                      </span>
                      <span className="w-2 h-2 rounded-full shrink-0 bg-[#f59e0b]" />
                    </div>
                    
                    <div className="flex items-baseline gap-0.5 mb-4 whitespace-nowrap">
                      <span className="text-[24px] md:text-[32px] font-extrabold text-primary tracking-tight tabular-nums leading-none">{report.metrics.restaurantDensity}</span>
                      <span className="text-[12px] md:text-[14px] font-bold text-secondary ml-1 pb-0.5">개</span>
                    </div>

                    {totalRestaurantCount > 0 && (
                      <div className="mb-4">
                        {/* 수평 비율 게이지 바 */}
                        <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 shadow-inner mb-3">
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
                              <div key={tag} className="flex items-center gap-1.5 text-[11px] font-bold text-secondary">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                                <span>{tag}</span>
                                <span className="text-primary">{data.count}개</span>
                                <span className="opacity-60 text-[10px]">({Math.round(percent)}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {report.metrics.restaurantCategories && Object.keys(report.metrics.restaurantCategories).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 border-t border-border/40 pt-4 mt-2">
                        {Object.entries(report.metrics.restaurantCategories)
                          .sort(([,a], [,b]) => (b as number) - (a as number))
                          .slice(0, 5)
                          .map(([cat, cnt]) => (
                            <div key={cat} className="flex justify-between items-center bg-surface/60 hover:bg-surface border border-border/20 rounded-xl px-3 py-1.5 transition-all duration-200">
                              <span className="text-[11px] md:text-[13px] font-bold text-secondary truncate mr-2">{cat}</span>
                              <span className="font-extrabold text-[11px] md:text-[13px] text-toss-blue shrink-0 tabular-nums">{cnt as number}개</span>
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
}
