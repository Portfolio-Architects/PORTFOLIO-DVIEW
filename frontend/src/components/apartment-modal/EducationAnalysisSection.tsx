import React from 'react';
import Image from 'next/image';
import { GraduationCap, Check, Share, MapPin, Lightbulb, ChevronDown } from 'lucide-react';
import { calculateEducationScore } from '@/lib/utils/scoring';
import ChildcareDetailSection from './ChildcareDetailSection';
import { FieldReportData } from '@/lib/DashboardFacade';
import {
  getSeoAccordionClass,
  getSeoAccordionSummaryClass,
  getSeoAccordionBodyClass,
  getSeoAccordionChevronClass,
} from '@/lib/design-system/copyDiet';

interface EducationAnalysisSectionProps {
  report: FieldReportData;
  inline?: boolean;
  copiedStatus: string | null;
  handleShareSection: (section: 'childcare' | 'infra') => void;
  displayAptName: string;
}

interface SchoolPerformance {
  rate: number;
  tier?: string;
  achievement?: string;
  desc: string;
}

const SCHOOL_PERFORMANCE_DB: Record<string, SchoolPerformance> = {
  '안화중학교': { rate: 2.8, tier: '상위 20%', achievement: 'B', desc: '특목/자사고 진학률 2.8% (동탄 일반군)' },
  '안화중': { rate: 2.8, tier: '상위 20%', achievement: 'B', desc: '특목/자사고 진학률 2.8% (동탄 일반군)' },
  '석우중학교': { rate: 4.8, tier: '상위 5%', achievement: 'S', desc: '특목/자사고 진학률 4.8% (동탄 최상위)' },
  '석우중': { rate: 4.8, tier: '상위 5%', achievement: 'S', desc: '특목/자사고 진학률 4.8% (동탄 최상위)' },
  '반송중학교': { rate: 4.2, tier: '상위 8%', achievement: 'A', desc: '특목/자사고 진학률 4.2% (동탄 우수)' },
  '반송중': { rate: 4.2, tier: '상위 8%', achievement: 'A', desc: '특목/자사고 진학률 4.2% (동탄 우수)' },
  '솔빛중학교': { rate: 5.2, tier: '상위 3%', achievement: 'S', desc: '특목/자사고 진학률 5.2% (동탄 최상위)' },
  '솔빛중': { rate: 5.2, tier: '상위 3%', achievement: 'S', desc: '특목/자사고 진학률 5.2% (동탄 최상위)' },
  '청계중학교': { rate: 4.5, tier: '상위 6%', achievement: 'S', desc: '특목/자사고 진학률 4.5% (동탄 최상위)' },
  '청계중': { rate: 4.5, tier: '상위 6%', achievement: 'S', desc: '특목/자사고 진학률 4.5% (동탄 최상위)' },
  '다원중학교': { rate: 3.1, tier: '상위 15%', achievement: 'A', desc: '특목/자사고 진학률 3.1% (동탄 우수)' },
  '다원중': { rate: 3.1, tier: '상위 15%', achievement: 'A', desc: '특목/자사고 진학률 3.1% (동탄 우수)' },
  '동탄중학교': { rate: 3.3, tier: '상위 12%', achievement: 'A', desc: '특목/자사고 진학률 3.3% (동탄 우수)' },
  '동탄중': { rate: 3.3, tier: '상위 12%', achievement: 'A', desc: '특목/자사고 진학률 3.3% (동탄 우수)' },
  '능동중학교': { rate: 2.5, tier: '상위 25%', achievement: 'B', desc: '특목/자사고 진학률 2.5% (동탄 일반군)' },
  '능동중': { rate: 2.5, tier: '상위 25%', achievement: 'B', desc: '특목/자사고 진학률 2.5% (동탄 일반군)' },
  '푸른중학교': { rate: 3.9, tier: '상위 10%', achievement: 'A', desc: '특목/자사고 진학률 3.9% (동탄 우수)' },
  '푸른중': { rate: 3.9, tier: '상위 10%', achievement: 'A', desc: '특목/자사고 진학률 3.9% (동탄 우수)' },
  '동학중학교': { rate: 2.2, tier: '상위 30%', achievement: 'C', desc: '특목/자사고 진학률 2.2% (동탄 일반군)' },
  '동학중': { rate: 2.2, tier: '상위 30%', achievement: 'C', desc: '특목/자사고 진학률 2.2% (동탄 일반군)' },
  '아인중학교': { rate: 3.0, tier: '상위 16%', achievement: 'B', desc: '특목/자사고 진학률 3.0% (동탄 일반군)' },
  '아인중': { rate: 3.0, tier: '상위 16%', achievement: 'B', desc: '특목/자사고 진학률 3.0% (동탄 일반군)' },

  '동탄고등학교': { rate: 72.4, achievement: 'A', desc: '4년제 대학 진학률 72.4% (일반계 우수)' },
  '동탄고': { rate: 72.4, achievement: 'A', desc: '4년제 대학 진학률 72.4% (일반계 우수)' },
  '능동고등학교': { rate: 68.2, achievement: 'B', desc: '4년제 대학 진학률 68.2% (일반계 보통)' },
  '능동고': { rate: 68.2, achievement: 'B', desc: '4년제 대학 진학률 68.2% (일반계 보통)' },
  '안화고등학교': { rate: 70.5, achievement: 'B', desc: '4년제 대학 진학률 70.5% (일반계 보통)' },
  '안화고': { rate: 70.5, achievement: 'B', desc: '4년제 대학 진학률 70.5% (일반계 보통)' },
  '반송고등학교': { rate: 74.1, achievement: 'A', desc: '4년제 대학 진학률 74.1% (일반계 우수)' },
  '반송고': { rate: 74.1, achievement: 'A', desc: '4년제 대학 진학률 74.1% (일반계 우수)' },
  '예당고등학교': { rate: 69.8, achievement: 'B', desc: '4년제 대학 진학률 69.8% (일반계 보통)' },
  '예당고': { rate: 69.8, achievement: 'B', desc: '4년제 대학 진학률 69.8% (일반계 보통)' },
  '동탄중앙고등학교': { rate: 71.2, achievement: 'A', desc: '4년제 대학 진학률 71.2% (일반계 우수)' },
  '동탄중앙고': { rate: 71.2, achievement: 'A', desc: '4년제 대학 진학률 71.2% (일반계 우수)' },
  '창의고등학교': { rate: 65.4, achievement: 'C', desc: '4년제 대학 진학률 65.4% (일반계 보통)' },
  '창의고': { rate: 65.4, achievement: 'C', desc: '4년제 대학 진학률 65.4% (일반계 보통)' },
  '이산고등학교': { rate: 66.8, achievement: 'C', desc: '4년제 대학 진학률 66.8% (일반계 보통)' },
  '이산고': { rate: 66.8, achievement: 'C', desc: '4년제 대학 진학률 66.8% (일반계 보통)' },
  '한백고등학교': { rate: 73.0, achievement: 'A', desc: '4년제 대학 진학률 73.0% (일반계 우수)' },
  '한백고': { rate: 73.0, achievement: 'A', desc: '4년제 대학 진학률 73.0% (일반계 우수)' },
};

function getSchoolPerformance(schoolName: string | undefined): SchoolPerformance | null {
  if (!schoolName) return null;
  const cleanName = schoolName.trim();
  return SCHOOL_PERFORMANCE_DB[cleanName] || null;
}

const EducationAnalysisSection = React.memo(function EducationAnalysisSection({
  report,
  inline = false,
  copiedStatus,
  handleShareSection,
  displayAptName,
}: EducationAnalysisSectionProps) {
  if (!report.metrics) return null;

  // Generate JSON-LD structural data for Education (SEO/Rich Snippets)
  const jsonLdElements = React.useMemo(() => {
    const elements: Array<{ "@type": string; name: string; value: string }> = [];
    const metrics = report.metrics;
    if (!metrics) return [];
    
    if (metrics.distanceToElementary > 0) {
      const name = metrics.nearestSchoolNames?.elementary || '배정 초등학교';
      elements.push({
        "@type": "LocationFeatureSpecification",
        "name": `배정 초등학교 (${name})`,
        "value": `${Math.round(metrics.distanceToElementary)}m (도보 약 ${Math.ceil(metrics.distanceToElementary / 80)}분)`
      });
    }
    if (metrics.distanceToMiddle > 0) {
      const name = metrics.nearestSchoolNames?.middle || '인근 중학교';
      const perf = getSchoolPerformance(name);
      const perfStr = perf ? `, 학업성취도 ${perf.achievement} (${perf.desc})` : '';
      elements.push({
        "@type": "LocationFeatureSpecification",
        "name": `인근 중학교 (${name})`,
        "value": `${Math.round(metrics.distanceToMiddle)}m (도보 약 ${Math.ceil(metrics.distanceToMiddle / 80)}분)${perfStr}`
      });
    }
    if (metrics.distanceToHigh > 0) {
      const name = metrics.nearestSchoolNames?.high || '인근 고등학교';
      const perf = getSchoolPerformance(name);
      const perfStr = perf ? `, 4년제 대입 ${perf.achievement} (${perf.desc})` : '';
      elements.push({
        "@type": "LocationFeatureSpecification",
        "name": `인근 고등학교 (${name})`,
        "value": `${Math.round(metrics.distanceToHigh)}m (도보 약 ${Math.ceil(metrics.distanceToHigh / 80)}분)${perfStr}`
      });
    }
    return elements;
  }, [report.metrics]);

  const jsonLd = React.useMemo(() => {
    return {
      "@context": "https://schema.org",
      "@type": "Place",
      "name": `${displayAptName} 단지 안심 학군 및 학교 배정 정보`,
      "description": `단지 인근 초·중·고교의 최단 보행 통학 거리와 도보 소요 시간, 각 학교별 학업 성취도 및 특목고/자사고 진학 통계 분석 정보입니다.`,
      "amenityFeature": jsonLdElements
    };
  }, [displayAptName, jsonLdElements]);

  return (
    <section 
      id="sec-education" 
      className="bg-transparent pt-6 border-t border-border flex flex-col gap-7 scroll-mt-14 overflow-hidden w-full snap-start"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between gap-2 mb-5">
          <h2 className="text-[18px] md:text-[20px] font-extrabold tracking-tight text-primary">
            학군 · 육아 환경
          </h2>
          <button
            type="button"
            onClick={() => handleShareSection('childcare')}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-semibold text-[12px] rounded-lg transition-colors cursor-pointer border-none bg-transparent text-tertiary hover:text-primary hover:bg-[#eff1f5] dark:hover:bg-[#1e2532]"
            title="학군/육아 분석 결과 공유하기"
          >
            {copiedStatus === 'edu-link' ? (
              <Check size={13} strokeWidth={2.4} className="text-primary" />
            ) : (
              <Share size={13} strokeWidth={2.2} />
            )}
            <span>{copiedStatus === 'edu-link' ? '링크 복사됨' : '공유'}</span>
          </button>
        </div>

        <div className="relative w-full">
          <div className="flex flex-col w-full gap-7">

            {/* ─── 육아 친화도 지수 (Childcare Index) ─── */}
            {(() => {
              const eduScoreInfo = calculateEducationScore(report.metrics);
              const scoreColors: Record<string, { bg: string; text: string; border: string; descBg: string; scoreText: string }> = {
                S: { bg: 'bg-[#eff1f5] dark:bg-[#1e2532]', text: 'text-primary', border: 'border-slate-900/20 dark:border-white/25', descBg: 'bg-surface dark:bg-[#1e2532]', scoreText: 'text-primary' },
                A: { bg: 'bg-[#eff1f5] dark:bg-[#1e2532]', text: 'text-primary', border: 'border-border', descBg: 'bg-surface dark:bg-[#1e2532]', scoreText: 'text-primary' },
                B: { bg: 'bg-[#eff1f5] dark:bg-[#1e2532]', text: 'text-secondary', border: 'border-border', descBg: 'bg-surface dark:bg-[#1e2532]', scoreText: 'text-secondary' },
                C: { bg: 'bg-[#eff1f5] dark:bg-[#1e2532]', text: 'text-tertiary', border: 'border-border', descBg: 'bg-surface dark:bg-[#1e2532]', scoreText: 'text-tertiary' }
              };
              const colors = scoreColors[eduScoreInfo.grade] || scoreColors.C;
              
              return (
                <div>
                  <div className="bg-elevated rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center gap-6">
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        {/* Radial Progress SVG (Toss-style Score Wheel) */}
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="42"
                            className="stroke-slate-200 dark:stroke-slate-800"
                            strokeWidth="6"
                            fill="transparent"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="42"
                            className={`stroke-current ${colors.text} transition-all duration-1000 ease-out`}
                            strokeWidth="6"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 42}
                            strokeDashoffset={2 * Math.PI * 42 * (1 - eduScoreInfo.score / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-[9.5px] font-bold text-tertiary tracking-wider leading-none">GRADE</span>
                          <span className={`text-[26px] font-black leading-none ${colors.text}`}>
                            {eduScoreInfo.grade}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1 w-full text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-baseline justify-center md:justify-start gap-1.5 mb-1.5">
                        <span className="text-[14px] font-bold text-secondary">학군 · 육아 점수</span>
                        <div className="flex items-baseline justify-center gap-0.5 tabular-nums">
                          <span className={`text-[26px] font-black tracking-tight ${colors.scoreText}`}>{eduScoreInfo.score}</span>
                          <span className="text-[13px] font-semibold text-tertiary mt-auto pb-0.5">/ 100점</span>
                        </div>
                      </div>
                      <p className="text-[12.5px] font-medium text-tertiary mb-2.5">
                        초등학교 도보권 · 중·고교 접근성 · 500m 학원 밀집도 종합
                      </p>
                      
                      <details className={getSeoAccordionClass(`${colors.descBg} text-left`)}>
                        <summary className={getSeoAccordionSummaryClass()}>
                          <span>육아 환경 산정 기준 · 해설 더보기</span>
                          <ChevronDown size={15} className={getSeoAccordionChevronClass()} />
                        </summary>
                        <div className={getSeoAccordionBodyClass()}>
                          <p className="text-[13px] font-medium text-secondary leading-relaxed break-keep">
                            {eduScoreInfo.description} (초등학교까지의 실제 도보 안심 통학 요건, 인근 중고교 접근성 및 500m 반경 내 교육 학원 인프라 밀집도를 종합 연산한 지표입니다.)
                          </p>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ─── 배정 학교 정보 (Assigned Schools) ─── */}
            {(report.metrics.distanceToElementary > 0 || report.metrics.distanceToMiddle > 0 || report.metrics.distanceToHigh > 0) && (
              <div>
                <div className="mb-3">
                  <span className="text-[14px] font-bold text-secondary tracking-tight">배정 학교 · 통학 거리</span>
                </div>
                <div className="flex overflow-x-auto custom-scrollbar gap-3 pb-1 sm:grid sm:grid-cols-3">
                  {[
                    { label: '배정 초등학교', dist: report.metrics.distanceToElementary, name: report.metrics.nearestSchoolNames?.elementary },
                    { label: '인근 중학교', dist: report.metrics.distanceToMiddle, name: report.metrics.nearestSchoolNames?.middle },
                    { label: '인근 고등학교', dist: report.metrics.distanceToHigh, name: report.metrics.nearestSchoolNames?.high },
                  ].filter(s => s.dist && s.dist > 0).map(school => {
                    const dist = school.dist ?? 0;
                    const percent = Math.min((dist / 1000) * 100, 100);
                    const grade = dist <= 300 ? 'excellent' : dist <= 700 ? 'good' : dist <= 1000 ? 'average' : 'far';
                    const timeColor =
                      grade === 'excellent' || grade === 'good'
                        ? 'text-primary'
                        : grade === 'average'
                        ? 'text-secondary'
                        : 'text-tertiary';

                    const perf = getSchoolPerformance(school.name);

                    let tagText: string | null = null;
                    if (school.label.includes('초등학교')) {
                      if (dist <= 300) tagText = '초품아';
                      else if (dist <= 500) tagText = '초인접';
                    } else if (perf) {
                      tagText = school.label.includes('중학교')
                        ? `진학률 ${perf.rate}%`
                        : `대입 ${perf.rate}%`;
                    } else if (dist <= 500) {
                      tagText = '학세권';
                    }

                    return (
                      <div key={school.label} className="w-[165px] shrink-0 sm:w-auto bg-elevated rounded-2xl p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between gap-1.5 mb-2">
                          <span className="text-[12.5px] font-bold text-secondary truncate">
                            {school.label}
                          </span>
                          {tagText && (
                            <span className="text-[10.5px] font-bold shrink-0 px-1.5 py-0.5 rounded-md bg-[#eff1f5] dark:bg-[#1e2532] text-secondary">
                              {tagText}
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline gap-1 mt-0.5 tabular-nums">
                          <span className="text-[22px] md:text-[26px] font-extrabold text-primary tracking-tight leading-none">
                            {Math.round(dist).toLocaleString()}
                          </span>
                          <span className="text-[12px] font-semibold text-tertiary">m</span>
                          <span className={`text-[11.5px] font-bold ml-auto whitespace-nowrap ${timeColor}`}>
                            도보 {Math.ceil(dist / 80)}분
                          </span>
                        </div>

                        {/* Live Spark Distance Gauge Bar */}
                        <div className="mt-3 w-full bg-slate-200/70 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              grade === 'excellent' || grade === 'good' ? 'bg-slate-900 dark:bg-slate-100' :
                              grade === 'average' ? 'bg-slate-500' : 'bg-slate-400 dark:bg-slate-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        {school.name && (
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.name + ' 화성시')}`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-[11.5px] flex items-center gap-1 font-semibold mt-3 text-tertiary hover:text-primary transition-colors"
                            title={`${school.name} 구글 지도에서 보기`}
                          >
                            <MapPin size={12} className="shrink-0" />
                            <span className="truncate">{school.name}</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── 전문가 학군 및 통학로 분석 (Expert School/Route Review) ─── */}
            {(report.sections?.ecosystem?.schoolText || report.sections?.ecosystem?.schoolImg) && (
              <div className="bg-elevated rounded-2xl p-5">
                <div className="mb-3">
                  <span className="text-[14px] font-bold text-primary tracking-tight">통학로 임장 메모</span>
                </div>
                <div className="flex flex-col md:flex-row gap-5 items-start">
                  {report.sections.ecosystem.schoolImg && (
                    <div className="relative w-full md:w-[260px] h-[190px] rounded-2xl overflow-hidden bg-surface group shrink-0">
                      <Image src={report.sections.ecosystem.schoolImg} alt="학군 및 통학로 실사" fill sizes="260px" className="object-cover" priority />
                      <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-none opacity-80 z-10">
                        <span className="font-extrabold text-white/70 text-[14px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none tracking-tighter">
                          D-VIEW
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 w-full space-y-2">
                    {report.sections.ecosystem.schoolText && (
                      <details className={getSeoAccordionClass('bg-surface dark:bg-[#1e2532]')}>
                        <summary className={getSeoAccordionSummaryClass()}>
                          <span>통학로 임장 상세 분석 더보기</span>
                          <ChevronDown size={15} className={getSeoAccordionChevronClass()} />
                        </summary>
                        <div className={getSeoAccordionBodyClass()}>
                          <p className="text-[13.5px] text-secondary leading-relaxed whitespace-pre-wrap">
                            {report.sections.ecosystem.schoolText}
                          </p>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─── 주변 학원가 분석 (Academy Density) ─── */}
            {report.metrics.academyDensity > 0 && (
              <div>
                <div className="mb-3">
                  <span className="text-[14px] font-bold text-secondary tracking-tight">주변 학원가 (500m)</span>
                </div>
                
                <div className="bg-elevated rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-surface dark:bg-[#1e2532] flex items-center justify-center shrink-0 text-primary">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-tertiary leading-none">500m 반경 교육시설</p>
                      <div className="flex items-baseline gap-0.5 mt-1">
                        <span className="text-[24px] font-black text-primary tracking-tight leading-none tabular-nums">{report.metrics.academyDensity}</span>
                        <span className="text-[12.5px] font-semibold text-tertiary ml-1">개소</span>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const academyData = Object.entries(report.metrics.academyCategories || {}).map(([cat, cnt]) => {
                      let tag = '일반학원';
                      let color = '#2f6bff';
                      let bg = 'bg-brand-blue';
                      if (cat.includes('음악') || cat.includes('미술') || cat.includes('피아노') || cat.includes('예술') || cat.includes('그림') || cat.includes('무용') || cat.includes('서예')) {
                        tag = '예체능';
                        color = '#14181f';
                        bg = 'bg-slate-900 dark:bg-slate-200';
                      } else if (cat.includes('태권도') || cat.includes('무술') || cat.includes('체육') || cat.includes('스포츠') || cat.includes('축구') || cat.includes('레크리에이션') || cat.includes('검도') || cat.includes('유도')) {
                        tag = '체육/활동';
                        color = '#64748b';
                        bg = 'bg-slate-500';
                      } else if (cat.includes('요가') || cat.includes('필라테스') || cat.includes('헬스') || cat.includes('취미') || cat.includes('바둑') || cat.includes('컴퓨터')) {
                        tag = '건강/취미';
                        color = '#94a3b8';
                        bg = 'bg-slate-400';
                      }
                      return { cat, cnt: cnt as number, tag, color, bg };
                    });

                    const totalAcademyCount = academyData.reduce((sum, item) => sum + item.cnt, 0);
                    const tagSums: Record<string, { count: number; color: string; bg: string }> = {};
                    academyData.forEach(item => {
                      if (!tagSums[item.tag]) {
                        tagSums[item.tag] = { count: 0, color: item.color, bg: item.bg };
                      }
                      tagSums[item.tag].count += item.cnt;
                    });

                    const sortedTags = Object.entries(tagSums).sort((a, b) => b[1].count - a[1].count);

                    let aiComment = '주변에 보습 및 다양한 학원 시설이 준수하게 위치하고 있습니다.';
                    if (totalAcademyCount >= 60) {
                      aiComment = '교육열이 매우 뜨거운 동탄 최고 수준의 학원가 밀집 지역입니다. 국/영/수 입시 학원부터 예체능까지 단지 주변에서 완벽히 해결 가능합니다.';
                    } else if (totalAcademyCount >= 30) {
                      aiComment = '우수한 교육 여건을 갖춘 학원가 밀집 구역입니다. 초/중등 교과 보습 학원들이 다양하게 밀집해 있습니다.';
                    } else if (totalAcademyCount >= 10) {
                      aiComment = '기초 보습 및 예체능 위주의 학원가가 오붓하게 형성되어 있어, 저학년 자녀의 방과 후 보육과 취미 학습에 유리합니다.';
                    } else {
                      aiComment = '단지 주변 학원 시설이 다소 한적하여, 인근 대형 학원가(남광장/북광장 또는 청계동) 셔틀버스를 주로 이용하는 것을 권장합니다.';
                    }

                    return totalAcademyCount > 0 ? (
                      <div className="mb-2 flex flex-col gap-3">
                        {/* 수평 비율 게이지 바 */}
                        <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-slate-100 dark:bg-slate-800 shadow-inner">
                          {sortedTags.map(([tag, data]) => {
                            const percent = (data.count / totalAcademyCount) * 100;
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
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1">
                          {sortedTags.map(([tag, data]) => {
                            const percent = (data.count / totalAcademyCount) * 100;
                            return (
                              <div key={tag} className="flex items-center gap-1.5 text-[11px] font-bold text-secondary tabular-nums">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                                <span>{tag}</span>
                                <span className="text-primary">{data.count}개</span>
                                <span className="opacity-60 text-[10px]">({Math.round(percent)}%)</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* AI 진단 요약 및 아코디언 */}
                        <div className="mt-2.5 space-y-2">
                          <div className="px-3.5 py-2.5 bg-[#eff1f5] dark:bg-[#1e2532] rounded-xl flex items-center gap-1.5 text-[12px] font-extrabold text-primary tabular-nums">
                            <Lightbulb size={14} className="shrink-0 text-secondary" />
                            <span>
                              500m 내 {totalAcademyCount}개소 ·{' '}
                              {totalAcademyCount >= 60
                                ? '최상위 학원가 밀집권'
                                : totalAcademyCount >= 30
                                ? '우수 보습 학원권'
                                : totalAcademyCount >= 10
                                ? '기초 보습 · 예체능권'
                                : '인근 대형 학원가 셔틀권'}
                            </span>
                          </div>
                          <details className={getSeoAccordionClass('bg-surface dark:bg-[#1e2532]')}>
                            <summary className={getSeoAccordionSummaryClass()}>
                              <span>학원가 업종 구성 해설 더보기</span>
                              <ChevronDown size={15} className={getSeoAccordionChevronClass()} />
                            </summary>
                            <div className={getSeoAccordionBodyClass()}>
                              <p className="text-[12.5px] font-medium text-secondary leading-relaxed break-keep">
                                {aiComment}
                              </p>
                            </div>
                          </details>
                        </div>
                      </div>
                    ) : null;
                  })()}
                  
                  {report.metrics.academyCategories && Object.keys(report.metrics.academyCategories).length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-border pt-3.5 mt-1">
                      {Object.entries(report.metrics.academyCategories)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .map(([cat, cnt]) => (
                          <div key={cat} className="flex justify-between items-center bg-surface dark:bg-[#1e2532] rounded-xl px-3.5 py-2.5">
                            <span className="text-[12.5px] font-semibold text-secondary truncate pr-2">{cat}</span>
                            <span className="font-bold text-[13px] text-primary shrink-0 tabular-nums">{cnt as number}개</span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 영유아 보육 및 안심 통학로 진단 정보 연동 */}
            <ChildcareDetailSection 
              dong={report.dong || '오산동'} 
              distanceToElementary={report.metrics.distanceToElementary || 0} 
              aptName={report.apartmentName} 
              coordinates={report.metrics.coordinates}
            />
          </div>
        </div>
      </div>
    </section>
  );
});

EducationAnalysisSection.displayName = 'EducationAnalysisSection';

export default EducationAnalysisSection;
