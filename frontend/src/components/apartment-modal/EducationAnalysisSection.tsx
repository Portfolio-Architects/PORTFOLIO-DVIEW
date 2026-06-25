import React from 'react';
import Image from 'next/image';
import { GraduationCap, Check, Share, MapPin } from 'lucide-react';
import { calculateEducationScore } from '@/lib/utils/scoring';
import ChildcareDetailSection from './ChildcareDetailSection';
import LocalEducationAd from '@/components/LocalEducationAd';
interface EducationAnalysisSectionProps {
  report: any;
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

  return (
    <section 
      id="sec-education" 
      className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm border border-border flex flex-col gap-10 scroll-mt-14 overflow-hidden w-full`}
    >
      <div className="flex flex-col w-full">
        <h2 className="text-[18px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
          <GraduationCap size={18} className="text-[#0d9488]"/> 학군/육아 분석
        </h2>

        <div className="relative w-full">
          <div className="flex flex-col w-full gap-8">

            {/* ─── 👶 육아 친화도 지수 (Childcare Index) ─── */}
            {(() => {
              const eduScoreInfo = calculateEducationScore(report.metrics);
              const scoreColors: Record<string, { bg: string; text: string; border: string; descBg: string; scoreText: string }> = {
                S: { bg: 'bg-[#fdf2f8]', text: 'text-[#db2777]', border: 'border-[#fbcfe8]/50', descBg: 'bg-[#db2777]/5', scoreText: 'text-[#db2777]' },
                A: { bg: 'bg-[#ecfdf5]', text: 'text-[#059669]', border: 'border-[#a7f3d0]/50', descBg: 'bg-[#059669]/5', scoreText: 'text-[#059669]' },
                B: { bg: 'bg-[#fffbeb]', text: 'text-[#d97706]', border: 'border-[#fde68a]/50', descBg: 'bg-[#d97706]/5', scoreText: 'text-[#d97706]' },
                C: { bg: 'bg-[#f8fafc]', text: 'text-[#475569]', border: 'border-[#e2e8f0]/50', descBg: 'bg-[#475569]/5', scoreText: 'text-[#475569]' }
              };
              const colors = scoreColors[eduScoreInfo.grade] || scoreColors.C;
              
              return (
                <div className="mb-8">
                  <div className="flex items-center justify-between gap-2 mb-4 border-l-[3px] border-[#0d9488] pl-2.5">
                    <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">육아 친화 지표</span>
                    <button
                      onClick={() => handleShareSection('childcare')}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-bold text-[12px] rounded-xl transition-all border shadow-sm cursor-pointer transform duration-200 active:scale-[0.94] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1 ${
                        copiedStatus === 'edu-link'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-[#fdf2f8] dark:bg-[#db2777]/10 hover:bg-[#fce7f3] dark:hover:bg-[#db2777]/20 active:bg-[#fbcfe8] text-[#db2777] border-[#db2777]/20'
                      }`}
                      title="학군/육아 분석 결과 카카오톡 공유하기"
                    >
                      {copiedStatus === 'edu-link' ? (
                        <Check size={12} strokeWidth={2.5} className="text-emerald-500" />
                      ) : (
                        <Share size={12} strokeWidth={2.5} className={copiedStatus === 'edu-link' ? 'text-emerald-500/80' : 'text-[#db2777]/80'} />
                      )}
                      <span>{copiedStatus === 'edu-link' ? '공유 링크 복사됨!' : '평가 결과 공유하기'}</span>
                    </button>
                  </div>
                  
                  <div className="bg-body rounded-2xl p-5 md:p-6 border border-border flex flex-col md:flex-row items-center gap-6">
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center border-4 ${colors.border} ${colors.bg} shadow-sm relative group`}>
                        <span className="text-[12px] font-extrabold text-secondary tracking-wider">GRADE</span>
                        <span className={`text-[36px] font-black leading-none ${colors.text} -mt-0.5`}>{eduScoreInfo.grade}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 w-full text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-baseline justify-center md:justify-start gap-1 mb-2">
                        <span className="text-[16px] font-bold text-secondary">종합 육아 환경 지수:</span>
                        <div className="flex items-baseline justify-center gap-0.5">
                          <span className={`text-[28px] font-black tracking-tight ${colors.scoreText}`}>{eduScoreInfo.score}</span>
                          <span className="text-[14px] font-bold text-secondary mt-auto pb-0.5">/ 100 점</span>
                        </div>
                      </div>
                      
                      <div className={`p-4 rounded-xl ${colors.descBg} border border-[#0d9488]/10 text-left`}>
                        <p className="text-[14px] font-bold text-primary mb-1">D-VIEW 자녀양육 환경 리포트</p>
                        <p className="text-[13px] font-medium text-secondary leading-relaxed break-keep">
                          {eduScoreInfo.description} (초등학교까지의 실제 도보 안심 통학 요건, 인근 중고교 접근성 및 500m 반경 내 교육 학원 인프라 밀집도를 종합 연산한 지표입니다.)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ─── 🏫 배정 학교 정보 (Assigned Schools) ─── */}
            {(report.metrics.distanceToElementary > 0 || report.metrics.distanceToMiddle > 0 || report.metrics.distanceToHigh > 0) && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 border-l-[3px] border-[#0d9488] pl-2.5">
                  <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">안심 학군 배정 정보</span>
                </div>
                <div className="flex overflow-x-auto custom-scrollbar gap-3 pb-2 sm:grid sm:grid-cols-3 md:gap-3">
                  {[
                    { label: '배정 초등학교', dist: report.metrics.distanceToElementary, name: report.metrics.nearestSchoolNames?.elementary },
                    { label: '인근 중학교', dist: report.metrics.distanceToMiddle, name: report.metrics.nearestSchoolNames?.middle },
                    { label: '인근 고등학교', dist: report.metrics.distanceToHigh, name: report.metrics.nearestSchoolNames?.high },
                  ].filter(s => s.dist && s.dist > 0).map(school => {
                    const dist = school.dist ?? 0;
                    const percent = Math.min((dist / 1000) * 100, 100);
                    const grade = dist <= 300 ? 'excellent' : dist <= 700 ? 'good' : dist <= 1000 ? 'average' : 'far';
                    const gradeStyles = {
                      excellent: { dot: 'bg-teal-500', timeBadge: 'bg-[#f0fdfa] text-teal-600', linkBadge: 'bg-surface border border-border text-secondary hover:text-teal-600 hover:border-teal-500/30 shadow-sm' },
                      good: { dot: 'bg-[#22c55e]', timeBadge: 'bg-[#f0fdf4] text-[#16a34a]', linkBadge: 'bg-surface border border-border text-secondary hover:text-[#16a34a] hover:border-[#16a34a]/30 shadow-sm' },
                      average: { dot: 'bg-[#f59e0b]', timeBadge: 'bg-[#fefce8] text-[#ca8a04]', linkBadge: 'bg-surface border border-border text-secondary hover:text-[#ca8a04] hover:border-[#ca8a04]/30 shadow-sm' },
                      far: { dot: 'bg-[#ef4444]', timeBadge: 'bg-[#fef2f2] text-[#dc2626]', linkBadge: 'bg-surface border border-border text-secondary hover:text-[#dc2626] hover:border-[#dc2626]/30 shadow-sm' },
                    };
                    const s = gradeStyles[grade];
                    
                    const perf = getSchoolPerformance(school.name);
                    
                    // Premium school badge
                    let schoolBadge = null;
                    if (school.label.includes('초등학교')) {
                      if (dist <= 300) {
                        schoolBadge = { text: '초품아 (극상)', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30' };
                      } else if (dist <= 500) {
                        schoolBadge = { text: '초인접 (우수)', bg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-100/50 dark:border-teal-900/30' };
                      }
                    } else {
                      if (perf) {
                        if (school.label.includes('중학교')) {
                          schoolBadge = { text: `학업 ${perf.achievement} (진학률 ${perf.rate}%)`, bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30' };
                        } else {
                          schoolBadge = { text: `진학 ${perf.achievement} (${perf.rate}%)`, bg: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100/50 dark:border-violet-900/30' };
                        }
                      } else if (dist <= 500) {
                        schoolBadge = { text: '학세권 (우수)', bg: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30' };
                      }
                    }

                    // Safety tier info for elementary school
                    let safetyBadge = null;
                    let safetyGuide = null;
                    if (school.label === '배정 초등학교') {
                      if (dist <= 300) {
                        safetyBadge = { text: '안심 1등급', bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/30' };
                        safetyGuide = '단지 직결 안심통학로';
                      } else if (dist <= 500) {
                        safetyBadge = { text: '안심 2등급', bg: 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-100/50 dark:border-teal-900/30' };
                        safetyGuide = '신호횡단 최소화 구간';
                      } else if (dist <= 1000) {
                        safetyBadge = { text: '일반 3등급', bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100/50 dark:border-amber-900/30' };
                        safetyGuide = '스쿨존 펜스 통학 권장';
                      } else {
                        safetyBadge = { text: '주의 4등급', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30' };
                        safetyGuide = '차량 동행 통학 권장';
                      }
                    }

                    return (
                      <div key={school.label} className={`w-[150px] shrink-0 sm:w-auto bg-body rounded-2xl p-4 md:p-5 flex flex-col hover:bg-surface hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 group ring-1 ring-black/5 dark:ring-white/10 ${school.label === '배정 초등학교' ? 'border border-teal-500/30 dark:border-teal-500/20 bg-teal-50/5 dark:bg-teal-950/5' : ''}`}>
                        <div className="flex items-center justify-between mb-2 md:mb-3 min-w-0 gap-1">
                          <span className="text-[13px] md:text-[14px] font-extrabold text-secondary/80 truncate pr-1">
                            {school.label}
                          </span>
                          {schoolBadge && (
                            <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded leading-none shrink-0 ${schoolBadge.bg}`}>
                              {schoolBadge.text}
                            </span>
                          )}
                          {grade === 'excellent' && !schoolBadge ? (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-500 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                            </span>
                          ) : !schoolBadge ? (
                            <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                          ) : null}
                        </div>
                        
                        {/* Detailed safety badge for elementary school */}
                        {school.label === '배정 초등학교' && safetyBadge && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded leading-none ${safetyBadge.bg}`}>
                              {safetyBadge.text}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-col lg:flex-row lg:items-baseline gap-1.5 lg:gap-2 mt-1 lg:mt-0">
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-[24px] md:text-[32px] font-extrabold text-primary tracking-tight tabular-nums leading-none">
                              {Math.round(dist).toLocaleString()}
                            </span>
                            <span className="text-[12px] md:text-[14px] font-bold text-secondary mt-auto pb-0.5">
                              m
                            </span>
                          </div>
                          <span className={`text-[11px] md:text-[12px] px-2 py-0.5 rounded-md w-fit whitespace-nowrap font-bold ${s.timeBadge} shadow-sm`}>도보 {Math.ceil(dist / 80)}분</span>
                        </div>

                        {/* Toss-style Distance Gauge Bar */}
                        <div className="mt-3.5 w-full bg-slate-100 dark:bg-slate-800/60 h-2 rounded-full overflow-hidden relative shadow-inner">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                              grade === 'excellent' ? 'bg-teal-500' :
                              grade === 'good' ? 'bg-emerald-500' :
                              grade === 'average' ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>

                        {school.label === '배정 초등학교' && safetyGuide && (
                          <p className="text-[11px] font-bold text-teal-600 dark:text-teal-400 mt-3 bg-teal-50/50 dark:bg-teal-950/20 p-2 rounded-xl border border-teal-100/30 dark:border-teal-900/10 text-center leading-normal">
                            {safetyGuide}
                          </p>
                        )}

                        {school.label !== '배정 초등학교' && perf && (
                          <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-3 bg-indigo-50/50 dark:bg-indigo-950/20 p-2 rounded-xl border border-indigo-100/30 dark:border-indigo-900/10 text-center leading-normal">
                            {perf.desc}
                          </p>
                        )}

                        {school.name && (
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.name + ' 화성시')}`}
                            target="_blank" rel="noopener noreferrer"
                            className={`text-[11px] md:text-[12px] flex items-center justify-center gap-1 font-bold mt-3 md:mt-4 ${s.linkBadge} rounded-xl px-2.5 py-2 text-center transition-all duration-300 hover:scale-[1.02] active:scale-[95] shadow-[0_2px_8px_rgba(0,0,0,0.02)] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1`}
                            title={`${school.name} 구글 지도에서 보기`}
                          >
                            <MapPin size={12} className="shrink-0 md:w-3.5 md:h-3.5" />
                            <span className="truncate leading-tight block">{school.name}</span>
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── 📝 전문가 학군 및 통학로 분석 (Expert School/Route Review) ─── */}
            {(report.sections?.ecosystem?.schoolText || report.sections?.ecosystem?.schoolImg) && (
              <div className="mb-8 bg-body rounded-2xl p-5 md:p-6 border border-border">
                <div className="flex items-center gap-2 mb-4 border-l-[3px] border-[#0d9488] pl-2.5">
                  <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">전문가 임장 분석 및 통학로 리포트</span>
                </div>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {report.sections.ecosystem.schoolImg && (
                    <div className="relative w-full md:w-[280px] h-[200px] rounded-2xl overflow-hidden shadow-sm bg-body group shrink-0">
                      <Image src={report.sections.ecosystem.schoolImg} alt="학군 및 통학로 실사" fill sizes="280px" className="object-cover" priority />
                      <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 flex items-center gap-2 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity z-10">
                        <span className="font-extrabold text-white/70 text-[14px] md:text-[16px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none tracking-tighter">
                          D-VIEW
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="text-[14px] font-bold text-primary mb-2 bg-[#f0fdfa] text-teal-800 dark:bg-teal-950/40 dark:text-teal-400 border border-teal-100/50 dark:border-teal-900/30 inline-block px-3 py-1 rounded-lg">학군 및 통학 안정성 평가</h4>
                    <p className="text-[14px] text-secondary leading-relaxed whitespace-pre-wrap">{report.sections.ecosystem.schoolText}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── 📚 주변 학원가 분석 (Academy Density) ─── */}
            {report.metrics.academyDensity > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4 border-l-[3px] border-[#0d9488] pl-2.5">
                  <span className="text-[14px] md:text-[15px] font-black text-primary tracking-tight">주변 학원가 구성 (500m 반경)</span>
                </div>
                
                <div className="bg-body rounded-2xl p-5 md:p-6 border border-border flex flex-col gap-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
                      <GraduationCap className="text-teal-600" size={24} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-secondary leading-none">500m 반경 교육시설</p>
                      <div className="flex items-baseline gap-0.5 mt-1.5">
                        <span className="text-[26px] font-black text-primary tracking-tight leading-none">{report.metrics.academyDensity}</span>
                        <span className="text-[13px] font-bold text-secondary ml-1">개소 밀집</span>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const academyData = Object.entries(report.metrics.academyCategories || {}).map(([cat, cnt]) => {
                      let tag = '일반학원';
                      let color = '#0d9488'; // teal-600
                      let bg = 'bg-[#0d9488]';
                      if (cat.includes('음악') || cat.includes('미술') || cat.includes('피아노') || cat.includes('예술') || cat.includes('그림') || cat.includes('무용') || cat.includes('서예')) {
                        tag = '예체능';
                        color = '#db2777'; // pink-600
                        bg = 'bg-[#db2777]';
                      } else if (cat.includes('태권도') || cat.includes('무술') || cat.includes('체육') || cat.includes('스포츠') || cat.includes('축구') || cat.includes('레크리에이션') || cat.includes('검도') || cat.includes('유도')) {
                        tag = '체육/활동';
                        color = '#ea580c'; // orange-600
                        bg = 'bg-[#ea580c]';
                      } else if (cat.includes('요가') || cat.includes('필라테스') || cat.includes('헬스') || cat.includes('취미') || cat.includes('바둑') || cat.includes('컴퓨터')) {
                        tag = '건강/취미';
                        color = '#0284c7'; // sky-600
                        bg = 'bg-[#0284c7]';
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
                      aiComment = '🔥 교육열이 매우 뜨거운 동탄 최고 수준의 학원가 밀집 지역입니다. 국/영/수 입시 학원부터 예체능까지 단지 주변에서 완벽히 해결 가능합니다.';
                    } else if (totalAcademyCount >= 30) {
                      aiComment = '📚 우수한 교육 여건을 갖춘 학원가 밀집 구역입니다. 초/중등 교과 보습 학원들이 다양하게 밀집해 있습니다.';
                    } else if (totalAcademyCount >= 10) {
                      aiComment = '🎨 기초 보습 및 예체능 위주의 학원가가 오붓하게 형성되어 있어, 저학년 자녀의 방과 후 보육과 취미 학습에 유리합니다.';
                    } else {
                      aiComment = '🚌 단지 주변 학원 시설이 다소 한적하여, 인근 대형 학원가(남광장/북광장 또는 청계동) 셔틀버스를 주로 이용하는 것을 권장합니다.';
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
                              <div key={tag} className="flex items-center gap-1.5 text-[11px] font-bold text-secondary">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                                <span>{tag}</span>
                                <span className="text-primary">{data.count}개</span>
                                <span className="opacity-60 text-[10px]">({Math.round(percent)}%)</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* AI 진단 코멘트 박스 */}
                        <div className="mt-2.5 p-3.5 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-500/10 rounded-xl">
                          <p className="text-[11.5px] font-extrabold text-[#0d9488] dark:text-[#00d29d] leading-relaxed break-keep">
                            💡 <strong>AI 학원가 진단:</strong> {aiComment}
                          </p>
                        </div>
                      </div>
                    ) : null;
                  })()}
                  
                  {report.metrics.academyCategories && Object.keys(report.metrics.academyCategories).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 border-t border-border/40 pt-4 mt-1">
                      {Object.entries(report.metrics.academyCategories)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .map(([cat, cnt]) => {
                          let theme = { bg: 'bg-[#f0fdfa]/50 text-teal-600 border-[#ccfbf1]/40', tag: '학업' };
                          
                          if (cat.includes('음악') || cat.includes('미술') || cat.includes('피아노') || cat.includes('예술') || cat.includes('그림') || cat.includes('무용') || cat.includes('서예')) {
                            theme = { bg: 'bg-[#fdf2f8]/50 text-[#db2777] border-[#fbcfe8]/40', tag: '예체능' };
                          } else if (cat.includes('태권도') || cat.includes('무술') || cat.includes('체육') || cat.includes('스포츠') || cat.includes('축구') || cat.includes('레크리에이션') || cat.includes('검도') || cat.includes('유도')) {
                            theme = { bg: 'bg-[#fff7ed]/50 text-[#ea580c] border-[#ffedd5]/40', tag: '체육/활동' };
                          } else if (cat.includes('요가') || cat.includes('필라테스') || cat.includes('헬스') || cat.includes('취미') || cat.includes('바둑') || cat.includes('컴퓨터')) {
                            theme = { bg: 'bg-[#f0f9ff]/50 text-[#0284c7] border-[#e0f2fe]/40', tag: '건강/취미' };
                          }
                          
                          return (
                            <div key={cat} className={`flex justify-between items-center ${theme.bg} border rounded-xl px-4 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm`}>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[13px] font-extrabold text-primary truncate leading-tight">{cat}</span>
                                <span className="text-[10px] font-bold opacity-60 mt-0.5 leading-none">{theme.tag}</span>
                              </div>
                              <span className="font-black text-[14px] shrink-0 tabular-nums pl-2">{cnt as number}개</span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 🏡 영유아 보육 및 안심 통학로 진단 정보 연동 */}
            <ChildcareDetailSection 
              dong={report.dong || '오산동'} 
              distanceToElementary={report.metrics.distanceToElementary || 0} 
              aptName={report.apartmentName} 
              coordinates={report.metrics.coordinates}
            />

            {/* 🎯 학군/육아 인프라 스코어 연동 로컬 학원 및 교육 광고 */}
            <div className="mt-8 border-t border-border/40 pt-8">
              <LocalEducationAd 
                dong={report.dong} 
                educationGrade={calculateEducationScore(report.metrics).grade} 
                apartmentName={report.apartmentName} 
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

EducationAnalysisSection.displayName = 'EducationAnalysisSection';

export default EducationAnalysisSection;
