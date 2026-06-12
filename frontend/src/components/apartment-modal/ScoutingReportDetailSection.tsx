import React from 'react';
import Image from 'next/image';
import { Building, Camera, Info, ShieldAlert, Radar } from 'lucide-react';

interface ScoutingReportDetailSectionProps {
  report: any;
  inline?: boolean;
}

export default function ScoutingReportDetailSection({
  report,
  inline = false,
}: ScoutingReportDetailSectionProps) {
  const s = report.sections;
  if (!s) return null;

  const renderWatermark = () => {
    return (
      <div className="absolute bottom-3 right-3 md:bottom-4 md:right-4 flex items-center gap-2 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity z-10">
        <span className="font-extrabold text-white/70 text-[14px] md:text-[16px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none tracking-tighter">
          D-VIEW
        </span>
      </div>
    );
  };

  return (
    <>
      {/* 2. 단지 기본정보 (Specs) */}
      <section 
        id="sec-specs" 
        className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm border border-border scroll-mt-14`}
      >
        <h2 className="text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
          <Building size={20} className="text-toss-blue"/> 단지 기본정보
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-body p-4 rounded-xl border border-border">
            <p className="text-[12px] text-tertiary font-bold mb-1">준공 연월 / 연차</p>
            <p className="text-[15px] text-primary font-medium">{s.specs.builtYear || '-'}</p>
          </div>
          <div className="bg-body p-4 rounded-xl border border-border">
            <p className="text-[12px] text-tertiary font-bold mb-1">규모 (세대/동)</p>
            <p className="text-[15px] text-primary font-medium">{s.specs.scale || '-'}</p>
          </div>
          <div className="bg-body p-4 rounded-xl border border-border">
            <p className="text-[12px] text-tertiary font-bold mb-1">용적률 / 건폐율</p>
            <p className="text-[15px] text-primary font-medium">{s.specs.farBuild || '-'}</p>
          </div>
          <div className="bg-body p-4 rounded-xl border border-border">
            <p className="text-[12px] text-tertiary font-bold mb-1">세대당 주차 (지하%)</p>
            <p className="text-[15px] text-primary font-medium">{s.specs.parkingRatio || '-'}</p>
          </div>
        </div>
      </section>

      {/* 3. 물리적 인프라 & 조경 */}
      <section 
        id="sec-infra" 
        className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm border border-border scroll-mt-14`}
      >
        <h2 className="text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
          <Camera size={20} className="text-toss-blue"/> 현장 인프라 둘러보기
        </h2>
        <div className="flex flex-col gap-8">
          {/* Gate */}
          {(s.infra.gateText || s.infra.gateImg) && (
            <div className="flex flex-col md:flex-row gap-6">
              {s.infra.gateImg && (
                <div className="relative w-full md:w-[280px] h-[200px] rounded-2xl overflow-hidden shadow-sm bg-body group">
                  <Image src={s.infra.gateImg} alt="진입로/문주" fill sizes="280px" className="object-cover" />
                  {renderWatermark()}
                </div>
              )}
              <div>
                <h4 className="text-[15px] font-bold text-primary mb-2 bg-body inline-block px-3 py-1 rounded-lg">진입로 및 정문</h4>
                <p className="text-[15px] text-secondary leading-relaxed whitespace-pre-wrap">{s.infra.gateText || '사진만 제공됨'}</p>
              </div>
            </div>
          )}
          {/* Landscaping */}
          {(s.infra.landscapeText || s.infra.landscapeImg) && (
            <div className="flex flex-col md:flex-row-reverse gap-6 pt-6 border-t border-body">
              {s.infra.landscapeImg && (
                <div className="relative w-full md:w-[280px] h-[200px] rounded-2xl overflow-hidden shadow-sm bg-body group">
                  <Image src={s.infra.landscapeImg} alt="조경/지형" fill sizes="280px" className="object-cover" />
                  {renderWatermark()}
                </div>
              )}
              <div>
                <h4 className="text-[15px] font-bold text-primary mb-2 bg-body inline-block px-3 py-1 rounded-lg">단지 조경 및 지형</h4>
                <p className="text-[15px] text-secondary leading-relaxed whitespace-pre-wrap">{s.infra.landscapeText || '사진만 제공됨'}</p>
              </div>
            </div>
          )}
          {/* Parking */}
          {(s.infra.parkingText || s.infra.parkingImg) && (
            <div className="flex flex-col md:flex-row gap-6 pt-6 border-t border-body">
              {s.infra.parkingImg && (
                <div className="relative w-full md:w-[280px] h-[200px] rounded-2xl overflow-hidden shadow-sm bg-body group">
                  <Image src={s.infra.parkingImg} alt="지하주차장" fill sizes="280px" className="object-cover" />
                  {renderWatermark()}
                </div>
              )}
              <div>
                <h4 className="text-[15px] font-bold text-primary mb-2 bg-body inline-block px-3 py-1 rounded-lg">지하주차장 인프라</h4>
                <p className="text-[15px] text-secondary leading-relaxed whitespace-pre-wrap">{s.infra.parkingText || '사진만 제공됨'}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Ecosystem */}
      {(s.ecosystem.commerceText || s.ecosystem.commerceImg) && (
        <section 
          id="sec-eco" 
          className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm border border-border scroll-mt-14`}
        >
          <h2 className="text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
            <Info size={20} className="text-toss-blue"/> 생활 편의시설 및 거시 입지
          </h2>
          <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row gap-6">
              {s.ecosystem.commerceImg && (
                <div className="relative w-full md:w-[280px] h-[200px] rounded-2xl overflow-hidden shadow-sm bg-body group">
                  <Image src={s.ecosystem.commerceImg} alt="상권" fill sizes="280px" className="object-cover" />
                  {renderWatermark()}
                </div>
              )}
              <div>
                <h4 className="text-[15px] font-bold text-primary mb-2 bg-[#f8f9fa] border border-border inline-block px-3 py-1 rounded-lg">동네 상권</h4>
                <p className="text-[15px] text-secondary leading-relaxed whitespace-pre-wrap">{s.ecosystem.commerceText}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. 최종 결론 */}
      <section 
        id="sec-conclusion" 
        className={`${inline ? 'bg-surface' : 'bg-surface/60 dark:bg-surface/35 backdrop-blur-md'} rounded-3xl p-6 md:p-8 shadow-sm border border-border scroll-mt-14`}
      >
        <h2 className="text-[20px] font-bold text-primary flex items-center gap-2 mb-6 border-b border-border pb-3">
          <ShieldAlert size={20} className="text-toss-blue"/> 최종 매수 타당성 평가
        </h2>
        <div className="flex flex-col gap-4">
          <div className="bg-primary p-6 rounded-2xl text-surface">
            <h4 className="text-[13px] font-bold text-tertiary mb-2">교통 및 개발 호재</h4>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap mb-4 pb-4 border-b border-white/10">{s.location.trafficText || '-'}</p>
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{s.location.developmentText || '-'}</p>
          </div>
          <div className="p-6 rounded-2xl border-2 border-[#191f28] bg-[#fdfdfd]">
            <h4 className="text-[16px] font-extrabold text-primary mb-2">💡 최종 결론</h4>
            <p className="text-[15px] text-secondary leading-relaxed whitespace-pre-wrap">{s.assessment.synthesis || '-'}</p>
            
            {s.assessment.probability && (
              <div className="mt-6 p-4 bg-toss-blue-light rounded-xl flex items-start gap-3">
                <Radar size={20} className="text-toss-blue shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-[13px] font-bold text-toss-blue mb-1">향후 가격 전망</h5>
                  <p className="text-[14px] text-primary leading-snug">{s.assessment.probability}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
