import React, { useMemo } from 'react';
import Image from 'next/image';
import { Building, Camera, Info, ShieldAlert, Radar, Lightbulb, ChevronDown } from 'lucide-react';
import { FieldReportData } from '@/lib/DashboardFacade';
import {
  getSeoAccordionClass,
  getSeoAccordionSummaryClass,
  getSeoAccordionBodyClass,
  getSeoAccordionChevronClass,
  truncateToCopyBudget,
} from '@/lib/design-system/copyDiet';

interface ScoutingReportDetailSectionProps {
  report: FieldReportData;
  inline?: boolean;
}

const ScoutingReportDetailSection = React.memo(function ScoutingReportDetailSection({
  report,
  inline = false,
}: ScoutingReportDetailSectionProps) {
  const s = report.sections;

  const jsonLdElements = useMemo(() => {
    if (!s) return [];
    const elements = [];
    
    if (s.infra?.gateText) {
      elements.push({
        "@type": "LocationFeatureSpecification",
        "name": "진입로 및 정문 환경",
        "value": s.infra.gateText
      });
    }
    if (s.infra?.landscapeText) {
      elements.push({
        "@type": "LocationFeatureSpecification",
        "name": "단지 조경 및 지형",
        "value": s.infra.landscapeText
      });
    }
    if (s.infra?.parkingText) {
      elements.push({
        "@type": "LocationFeatureSpecification",
        "name": "지하주차장 인프라",
        "value": s.infra.parkingText
      });
    }
    if (s.ecosystem?.commerceText) {
      elements.push({
        "@type": "LocationFeatureSpecification",
        "name": "생활 편의시설 및 동네 상권",
        "value": s.ecosystem.commerceText
      });
    }
    if (s.location?.trafficText || s.location?.developmentText) {
      elements.push({
        "@type": "LocationFeatureSpecification",
        "name": "교통 및 개발 호재",
        "value": `${s.location?.trafficText || ''} ${s.location?.developmentText || ''}`.trim()
      });
    }
    if (s.assessment?.synthesis) {
      elements.push({
        "@type": "LocationFeatureSpecification",
        "name": "종합 매수 타당성 평가 결론",
        "value": s.assessment.synthesis
      });
    }
    if (s.assessment?.probability) {
      elements.push({
        "@type": "LocationFeatureSpecification",
        "name": "향후 가격 전망 예측",
        "value": s.assessment.probability
      });
    }

    return elements;
  }, [s]);

  const jsonLd = useMemo(() => {
    if (!s) return null;
    return {
      "@context": "https://schema.org",
      "@type": "Place",
      "name": `단지 현장 임장 및 매수 타당성 팩트체크 보고서`,
      "description": `단지 인근의 물리적 인프라, 조경, 지하주차장 상태, 동네 상권 분석 및 교통/개발 호재를 바탕으로 한 전문가 종합 임장 보고서 및 가격 전망 데이터입니다.`,
      "amenityFeature": jsonLdElements
    };
  }, [s, jsonLdElements]);

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
    <div className="w-full overflow-hidden flex flex-col gap-8">
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {/* 2. 단지 기본정보 (Specs) */}
      <section 
        id="sec-specs" 
        className="pt-6 border-t border-[#f2f4f6] dark:border-[#202027] scroll-mt-14"
      >
        <h2 className="text-[18px] md:text-[20px] font-extrabold tracking-tight text-primary mb-4">
          단지 기본정보
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#f9fafb] dark:bg-[#17171c] p-4 rounded-2xl">
            <p className="text-[11.5px] text-tertiary font-semibold mb-1">준공 연월 / 연차</p>
            <p className="text-[14.5px] text-primary font-bold tabular-nums">{s.specs.builtYear || '-'}</p>
          </div>
          <div className="bg-[#f9fafb] dark:bg-[#17171c] p-4 rounded-2xl">
            <p className="text-[11.5px] text-tertiary font-semibold mb-1">규모 (세대/동)</p>
            <p className="text-[14.5px] text-primary font-bold tabular-nums">{s.specs.scale || '-'}</p>
          </div>
          <div className="bg-[#f9fafb] dark:bg-[#17171c] p-4 rounded-2xl">
            <p className="text-[11.5px] text-tertiary font-semibold mb-1">용적률 / 건폐율</p>
            <p className="text-[14.5px] text-primary font-bold tabular-nums">{s.specs.farBuild || '-'}</p>
          </div>
          <div className="bg-[#f9fafb] dark:bg-[#17171c] p-4 rounded-2xl">
            <p className="text-[11.5px] text-tertiary font-semibold mb-1">세대당 주차 (지하%)</p>
            <p className="text-[14.5px] text-primary font-bold tabular-nums">{s.specs.parkingRatio || '-'}</p>
          </div>
        </div>
      </section>

      {/* 3. 물리적 인프라 & 조경 */}
      <section 
        id="sec-infra" 
        className="pt-6 border-t border-[#f2f4f6] dark:border-[#202027] scroll-mt-14"
      >
        <h2 className="text-[18px] md:text-[20px] font-extrabold tracking-tight text-primary mb-4">
          현장 임장 메모
        </h2>
        <div className="flex flex-col gap-6">
          {/* Gate */}
          {(s.infra.gateText || s.infra.gateImg) && (
            <div className="flex flex-col md:flex-row gap-5">
              {s.infra.gateImg && (
                <div className="relative w-full md:w-[260px] h-[190px] rounded-2xl overflow-hidden bg-[#f9fafb] dark:bg-[#17171c] group shrink-0">
                  <Image src={s.infra.gateImg} alt="진입로/문주" fill sizes="260px" className="object-cover" priority />
                  {renderWatermark()}
                </div>
              )}
              <div className="flex-1 space-y-2">
                <h4 className="text-[13.5px] font-bold text-primary">진입로 및 정문</h4>
                {s.infra.gateText ? (
                  <details className={getSeoAccordionClass('bg-[#f9fafb] dark:bg-[#17171c]')}>
                    <summary className={getSeoAccordionSummaryClass()}>
                      <span>진입로 · 문주 임장 상세 더보기</span>
                      <ChevronDown size={15} className={getSeoAccordionChevronClass()} />
                    </summary>
                    <div className={getSeoAccordionBodyClass()}>
                      <p className="text-[13.5px] text-secondary leading-relaxed whitespace-pre-wrap">{s.infra.gateText}</p>
                    </div>
                  </details>
                ) : (
                  <p className="text-[13px] text-tertiary font-medium">현장 실사 사진 제공</p>
                )}
              </div>
            </div>
          )}
          {/* Landscaping */}
          {(s.infra.landscapeText || s.infra.landscapeImg) && (
            <div className="flex flex-col md:flex-row-reverse gap-5 pt-5 border-t border-[#f2f4f6] dark:border-[#202027]">
              {s.infra.landscapeImg && (
                <div className="relative w-full md:w-[260px] h-[190px] rounded-2xl overflow-hidden bg-[#f9fafb] dark:bg-[#17171c] group shrink-0">
                  <Image src={s.infra.landscapeImg} alt="조경/지형" fill sizes="260px" className="object-cover" />
                  {renderWatermark()}
                </div>
              )}
              <div className="flex-1 space-y-2">
                <h4 className="text-[13.5px] font-bold text-primary">단지 조경 및 지형</h4>
                {s.infra.landscapeText ? (
                  <details className={getSeoAccordionClass('bg-[#f9fafb] dark:bg-[#17171c]')}>
                    <summary className={getSeoAccordionSummaryClass()}>
                      <span>조경 · 단지 단차 상세 더보기</span>
                      <ChevronDown size={15} className={getSeoAccordionChevronClass()} />
                    </summary>
                    <div className={getSeoAccordionBodyClass()}>
                      <p className="text-[13.5px] text-secondary leading-relaxed whitespace-pre-wrap">{s.infra.landscapeText}</p>
                    </div>
                  </details>
                ) : (
                  <p className="text-[13px] text-tertiary font-medium">현장 실사 사진 제공</p>
                )}
              </div>
            </div>
          )}
          {/* Parking */}
          {(s.infra.parkingText || s.infra.parkingImg) && (
            <div className="flex flex-col md:flex-row gap-5 pt-5 border-t border-[#f2f4f6] dark:border-[#202027]">
              {s.infra.parkingImg && (
                <div className="relative w-full md:w-[260px] h-[190px] rounded-2xl overflow-hidden bg-[#f9fafb] dark:bg-[#17171c] group shrink-0">
                  <Image src={s.infra.parkingImg} alt="지하주차장" fill sizes="260px" className="object-cover" />
                  {renderWatermark()}
                </div>
              )}
              <div className="flex-1 space-y-2">
                <h4 className="text-[13.5px] font-bold text-primary">지하주차장</h4>
                {s.infra.parkingText ? (
                  <details className={getSeoAccordionClass('bg-[#f9fafb] dark:bg-[#17171c]')}>
                    <summary className={getSeoAccordionSummaryClass()}>
                      <span>지하주차장 동선 상세 더보기</span>
                      <ChevronDown size={15} className={getSeoAccordionChevronClass()} />
                    </summary>
                    <div className={getSeoAccordionBodyClass()}>
                      <p className="text-[13.5px] text-secondary leading-relaxed whitespace-pre-wrap">{s.infra.parkingText}</p>
                    </div>
                  </details>
                ) : (
                  <p className="text-[13px] text-tertiary font-medium">현장 실사 사진 제공</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Ecosystem */}
      {(s.ecosystem.commerceText || s.ecosystem.commerceImg) && (
        <section 
          id="sec-eco" 
          className="pt-6 border-t border-[#f2f4f6] dark:border-[#202027] scroll-mt-14"
        >
          <h2 className="text-[18px] md:text-[20px] font-extrabold tracking-tight text-primary mb-4">
            생활 상권 · 주변 환경
          </h2>
          <div className="flex flex-col md:flex-row gap-5">
            {s.ecosystem.commerceImg && (
              <div className="relative w-full md:w-[260px] h-[190px] rounded-2xl overflow-hidden bg-[#f9fafb] dark:bg-[#17171c] group shrink-0">
                <Image src={s.ecosystem.commerceImg} alt="상권" fill sizes="260px" className="object-cover" />
                {renderWatermark()}
              </div>
            )}
            <div className="flex-1 space-y-2">
              <h4 className="text-[13.5px] font-bold text-primary">동네 상권</h4>
              {s.ecosystem.commerceText && (
                <details className={getSeoAccordionClass('bg-[#f9fafb] dark:bg-[#17171c]')}>
                  <summary className={getSeoAccordionSummaryClass()}>
                    <span>인근 상권 임장 해설 더보기</span>
                    <ChevronDown size={15} className={getSeoAccordionChevronClass()} />
                  </summary>
                  <div className={getSeoAccordionBodyClass()}>
                    <p className="text-[13.5px] text-secondary leading-relaxed whitespace-pre-wrap">{s.ecosystem.commerceText}</p>
                  </div>
                </details>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 5. 최종 결론 */}
      <section 
        id="sec-conclusion" 
        className="pt-6 border-t border-[#f2f4f6] dark:border-[#202027] scroll-mt-14"
      >
        <h2 className="text-[18px] md:text-[20px] font-extrabold tracking-tight text-primary mb-4">
          현장 임장 종합 의견
        </h2>
        <div className="flex flex-col gap-3.5">
          {(s.location.trafficText || s.location.developmentText) && (
            <details className={getSeoAccordionClass('bg-[#f9fafb] dark:bg-[#17171c]')}>
              <summary className={getSeoAccordionSummaryClass()}>
                <span>교통망 · 개발 호재 상세 더보기</span>
                <ChevronDown size={15} className={getSeoAccordionChevronClass()} />
              </summary>
              <div className={getSeoAccordionBodyClass('space-y-3')}>
                {s.location.trafficText && (
                  <p className="text-[13.5px] text-secondary leading-relaxed whitespace-pre-wrap">{s.location.trafficText}</p>
                )}
                {s.location.developmentText && (
                  <p className="text-[13.5px] text-secondary leading-relaxed whitespace-pre-wrap pt-3 border-t border-[#f2f4f6] dark:border-[#202027]">{s.location.developmentText}</p>
                )}
              </div>
            </details>
          )}
          <div className="p-5 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[14.5px] font-bold text-primary flex items-center gap-1.5">
                <Lightbulb size={16} className="text-emerald-600 shrink-0" />
                <span>종합 요약</span>
              </h4>
              {s.assessment.synthesis && (
                <span className="text-[12px] font-medium text-secondary truncate max-w-[65%]">
                  {truncateToCopyBudget(s.assessment.synthesis, 'cardDescription')}
                </span>
              )}
            </div>
            {s.assessment.synthesis && (
              <details className={getSeoAccordionClass('bg-surface dark:bg-[#202027]')}>
                <summary className={getSeoAccordionSummaryClass()}>
                  <span>종합 임장 의견 전문 더보기</span>
                  <ChevronDown size={15} className={getSeoAccordionChevronClass()} />
                </summary>
                <div className={getSeoAccordionBodyClass()}>
                  <p className="text-[13.5px] text-secondary leading-relaxed whitespace-pre-wrap">{s.assessment.synthesis}</p>
                </div>
              </details>
            )}
            
            {s.assessment.probability && (
              <div className="p-4 bg-surface dark:bg-[#202027] rounded-xl flex items-start gap-3">
                <Radar size={16} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h5 className="text-[12.5px] font-bold text-primary mb-1">향후 가격 전망</h5>
                  <p className="text-[13px] text-secondary leading-snug">
                    {truncateToCopyBudget(s.assessment.probability, 'inlineNotice')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
});

ScoutingReportDetailSection.displayName = 'ScoutingReportDetailSection';
export default ScoutingReportDetailSection;
