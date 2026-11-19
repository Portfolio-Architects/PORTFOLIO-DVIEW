'use client';

import React from 'react';
import Link from 'next/link';
import { AdSlot } from '@/components/ads/AdSlot';
import ReportShareBar from '@/components/common/ReportShareBar';
import InlineMortgageDsrBridge from '@/components/finance/InlineMortgageDsrBridge';
import ApartmentQuickRetentionBar from '@/components/apartment/ApartmentQuickRetentionBar';
import { DviewIcon } from '@/components/common/DviewIcon';
import {
  getSeoAccordionClass,
  getSeoAccordionSummaryClass,
  getSeoAccordionChevronClass,
  getSeoAccordionBodyClass,
  getVisualSignalPillClass,
  type VisualSignalTone,
} from '@/lib/design-system/copyDiet';

export interface CompactAptPyeongRow {
  pyeong: number;
  areaM2: number;
  latestPriceStr: string;
  avgPriceStr: string;
  maxPriceStr: string;
  latestDepositStr: string;
  jeonseRatio: number;
  salesCount: number;
  rentCount: number;
}

export interface CompactAptLocationSpec {
  nearestStationName?: string;
  nearestStationLine?: string;
  distanceToSubway?: number;
  distanceToElementary?: number;
  elementarySchool?: string;
  middleSchool?: string;
  highSchool?: string;
}

export interface CompactAptScoutingSections {
  synthesis?: string;
  schoolText?: string;
  trafficText?: string;
  parkingText?: string;
}

export interface CompactAptPeerItem {
  name: string;
  canonicalSlug: string;
  dong: string;
  txCount: number;
  perPyeongStr: string;
  latestPriceStr: string;
}

export interface CompactAptSchoolPeerItem {
  name: string;
  canonicalSlug: string;
  dong: string;
  matchType: string;
  elementarySchool: string;
  middleSchool?: string;
  perPyeongStr: string;
  latestPriceStr: string;
}

export interface CompactAptGuideItem {
  slug: string;
  category: string;
  title: string;
}

export interface CompactAptZoneMeta {
  id: string;
  name: string;
  dongLabel: string;
  description: string;
}

export interface ApartmentReportTopSectionsProps {
  decodedName: string;
  canonicalSlug: string;
  aptDong: string;
  hasVerifiedSalePrice: boolean;
  latestSalePriceStr: string;
  latestRentPriceStr: string;
  perPyeongStr?: string;
  benchmarkPriceManwon: number;
  ratioPercent: number;
  jeonseTone: VisualSignalTone;
  jeonseStatusLabel: string;
  realPer: string | null;
  subwayWalkMinutes: number | null;
  elemWalkMinutes: number | null;
  householdCountNum: number;
  totalSalesTxCount: number;
  yearBuiltNum: number;
  buildingAge: number | null;
  aiBriefing: string;
  shareSummaryLines: string[];
  parentZone: CompactAptZoneMeta | null;
  dominantPyeong: CompactAptPyeongRow | null;
  ageLifecycleComment: string;
  scaleLiquidityComment: string;
  jeonsePerComment: string;
  topGuide: CompactAptGuideItem | null;
  relatedGuidesCount: number;
  hasDirectGuideMatch: boolean;
  matchedGuideZoneName?: string;
  locationSpec: CompactAptLocationSpec | null;
  scoutingSections: CompactAptScoutingSections | null;
}

export function ApartmentReportTopSections(props: ApartmentReportTopSectionsProps) {
  const {
    decodedName,
    canonicalSlug,
    aptDong,
    hasVerifiedSalePrice,
    latestSalePriceStr,
    latestRentPriceStr,
    perPyeongStr,
    benchmarkPriceManwon,
    ratioPercent,
    jeonseTone,
    jeonseStatusLabel,
    realPer,
    subwayWalkMinutes,
    elemWalkMinutes,
    householdCountNum,
    totalSalesTxCount,
    yearBuiltNum,
    buildingAge,
    aiBriefing,
    shareSummaryLines,
    parentZone,
    dominantPyeong,
    ageLifecycleComment,
    scaleLiquidityComment,
    jeonsePerComment,
    topGuide,
    relatedGuidesCount,
    hasDirectGuideMatch,
    matchedGuideZoneName,
    locationSpec,
    scoutingSections,
  } = props;

  return (
    <>
      {/* Header Summary + Layer 1 3-Second Visual Signal Strip */}
      <div className="border-b border-border/60 pb-6">
        <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[12px] font-extrabold px-3 py-1 rounded-full mb-3">
          <DviewIcon name="bar-chart-3" size={13} />
          <span>D-VIEW 부동산 데이터 랩스 정밀 진단</span>
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight line-clamp-2 sm:line-clamp-1">
          {decodedName} 아파트 실거래가 및 입지 심층 분석 리포트
        </h1>

        {/* Layer 1: 3-Second Visual Decision KPI & Signal Strip */}
        <div
          data-testid="apt-visual-signal-strip"
          className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5 min-w-0"
        >
          {/* Card 1: Latest Real Sale Price */}
          <div className="rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-3.5 sm:p-4 flex flex-col justify-between gap-2 min-w-0">
            <span className="text-[11px] font-bold text-tertiary truncate">최근 실거래</span>
            <div className="text-base sm:text-lg font-black text-primary tabular-nums truncate">
              {latestSalePriceStr}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={getVisualSignalPillClass('safe', 'tabular-nums')}>
                <DviewIcon name="trending-up" size={11} />
                <span>
                  {perPyeongStr && perPyeongStr.length <= 7
                    ? `평당 ${perPyeongStr}`
                    : perPyeongStr
                    ? '평당가 기준'
                    : '전월세 참고'}
                </span>
              </span>
              {(!perPyeongStr || perPyeongStr.length > 7) && (
                <span className="text-[11px] font-semibold text-secondary tabular-nums truncate">
                  {perPyeongStr || latestRentPriceStr}
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Jeonse Ratio 3-Step Visual Gauge & Safety Badge */}
          <div className="rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-3.5 sm:p-4 flex flex-col justify-between gap-2 min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-bold text-tertiary truncate">전세가율 진단</span>
              <span className={getVisualSignalPillClass(jeonseTone)}>
                {ratioPercent >= 70 ? (
                  <DviewIcon name="alert-triangle" size={11} />
                ) : (
                  <DviewIcon name="shield-check" size={11} />
                )}
                <span>{jeonseStatusLabel}</span>
              </span>
            </div>
            <div className="text-base sm:text-lg font-black text-primary tabular-nums truncate">
              {ratioPercent > 0 ? `${ratioPercent.toFixed(1)}%` : '정보 없음'}
            </div>
            <div
              data-testid="apt-jeonse-3step-gauge"
              className="grid grid-cols-3 gap-1 h-1.5 w-full"
            >
              <span
                className={`rounded-full ${
                  ratioPercent > 0
                    ? 'bg-emerald-600 dark:bg-emerald-400'
                    : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
              <span
                className={`rounded-full ${
                  ratioPercent >= 60
                    ? 'bg-blue-600 dark:bg-blue-400'
                    : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
              <span
                className={`rounded-full ${
                  ratioPercent >= 70 ? 'bg-brand-red' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            </div>
          </div>

          {/* Card 3: Subway & Elementary School Walking Spec Chips */}
          <div className="rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-3.5 sm:p-4 flex flex-col justify-between gap-1.5 min-w-0">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-bold text-tertiary truncate">교통 · 초등학군</span>
              <span
                className={getVisualSignalPillClass(
                  subwayWalkMinutes && subwayWalkMinutes <= 10
                    ? 'down'
                    : elemWalkMinutes && elemWalkMinutes <= 7
                    ? 'safe'
                    : 'neutral',
                  'tabular-nums shrink-0'
                )}
              >
                {subwayWalkMinutes ? (
                  <DviewIcon name="train-front" size={11} />
                ) : (
                  <DviewIcon name="graduation-cap" size={11} />
                )}
                <span>
                  {subwayWalkMinutes
                    ? `역 도보 ${subwayWalkMinutes}분`
                    : elemWalkMinutes
                    ? `초교 ${elemWalkMinutes}분`
                    : '입지 스펙'}
                </span>
              </span>
            </div>
            <div className="text-sm sm:text-base font-black text-primary truncate">
              {locationSpec?.nearestStationName
                ? `${locationSpec.nearestStationName}역`
                : locationSpec?.elementarySchool || '역세권 정보 없음'}
            </div>
            <span className="text-[11px] font-semibold text-secondary tabular-nums truncate">
              {locationSpec?.elementarySchool
                ? `${locationSpec.elementarySchool}${
                    elemWalkMinutes ? ` · 도보 ${elemWalkMinutes}분` : ''
                  }`
                : '학군 정보 없음'}
            </span>
          </div>

          {/* Card 4: Scale & Building Age Spec */}
          <div className="rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-3.5 sm:p-4 flex flex-col justify-between gap-2 min-w-0">
            <span className="text-[11px] font-bold text-tertiary truncate">세대 · 준공연식</span>
            <div className="text-base sm:text-lg font-black text-primary tabular-nums truncate">
              {householdCountNum > 0
                ? `${householdCountNum.toLocaleString('ko-KR')}세대`
                : `매매 ${totalSalesTxCount.toLocaleString('ko-KR')}건`}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={getVisualSignalPillClass('neutral', 'tabular-nums')}>
                <span>
                  {yearBuiltNum > 0 && buildingAge !== null
                    ? `준공 ${buildingAge}년차`
                    : aptDong && aptDong.length <= 6
                    ? `동탄 ${aptDong}`
                    : '실거래 기준'}
                </span>
              </span>
              {yearBuiltNum > 0 && (
                <span className="text-[11px] font-semibold text-tertiary tabular-nums">
                  {yearBuiltNum}년
                </span>
              )}
            </div>
          </div>
        </div>

        {hasVerifiedSalePrice && (
          <div className="mt-3">
            <InlineMortgageDsrBridge
              apartmentName={decodedName}
              canonicalSlug={canonicalSlug}
              dong={aptDong || undefined}
              benchmarkPriceManwon={benchmarkPriceManwon}
              surface="apartment_ssr_top"
              trigger="apartment_ssr_price_strip"
              compact
            />
          </div>
        )}

        <div className="mt-3">
          <ApartmentQuickRetentionBar
            apartmentName={decodedName}
            canonicalSlug={canonicalSlug}
            dong={aptDong || undefined}
            latestPriceStr={hasVerifiedSalePrice ? latestSalePriceStr : undefined}
          />
        </div>

        {/* Layer 2: Progressive SEO Accordion for AI Market Briefing */}
        <details open data-editorial-open="true" className={getSeoAccordionClass('mt-3.5 bg-[#f9fafb] dark:bg-[#17171c]')}>
          <summary className={getSeoAccordionSummaryClass()}>
            <span>실거래 · 입지 핵심 브리핑 더보기</span>
            <DviewIcon name="chevron-down" size={16} className={getSeoAccordionChevronClass()} />
          </summary>
          <div className={getSeoAccordionBodyClass()}>
            <p className="text-secondary text-[13px] sm:text-[14px] leading-relaxed font-medium tabular-nums">
              {aiBriefing}
            </p>
          </div>
        </details>

        <div className="mt-4">
          <ReportShareBar
            title={`${decodedName} 실거래가 및 입지 심층 분석 리포트`}
            summaryLines={shareSummaryLines}
            canonicalPath={`/apartment/${encodeURIComponent(canonicalSlug)}`}
            campaign="apt_ssr_report"
          />
        </div>
      </div>

      {/* Chapter 01 Dynamic Complex-Specific Valuation & Structural Narrative */}
      <section
        id="chapter-01-dynamic-narrative-ssr"
        aria-label={`${decodedName} 단지별 입지·수급·밸류에이션 3대 핵심 해설`}
        className="space-y-3.5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
            <span className="w-2 h-5 bg-emerald-500 rounded-full" />
            입지 · 수급 · 밸류에이션 요약
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={getVisualSignalPillClass('neutral')}>
              {aptDong && aptDong.length <= 6 ? `동탄 ${aptDong}` : '동탄 권역'}
            </span>
            <span className={getVisualSignalPillClass('down', 'tabular-nums')}>
              {dominantPyeong
                ? `주력 ${dominantPyeong.pyeong}평형`
                : `매매 ${totalSalesTxCount}건`}
            </span>
            {realPer && (
              <span className={getVisualSignalPillClass(jeonseTone, 'tabular-nums')}>
                {String(realPer).length <= 5 ? `PER ${realPer}배` : 'PER 산출'}
              </span>
            )}
            {dominantPyeong && (
              <span className="text-[11.5px] font-bold text-secondary tabular-nums">
                {dominantPyeong.salesCount > 0
                  ? `평균 ${dominantPyeong.avgPriceStr}`
                  : `전세 ${dominantPyeong.latestDepositStr}`}
              </span>
            )}
          </div>
        </div>

        <details open data-editorial-open="true" className={getSeoAccordionClass('bg-[#f9fafb] dark:bg-[#17171c]')}>
          <summary className={getSeoAccordionSummaryClass()}>
            <span>밸류에이션 산출 기준 · 입지 해설 더보기</span>
            <DviewIcon name="chevron-down" size={16} className={getSeoAccordionChevronClass()} />
          </summary>
          <div className={getSeoAccordionBodyClass('space-y-3')}>
            <h3 className="text-xs sm:text-sm font-extrabold text-primary">
              {decodedName} 입지 포지셔닝 및 실거래 밸류에이션 심층 해설
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-[13px] text-secondary">
              <article className="bg-surface dark:bg-[#1e1e24] p-4 rounded-2xl space-y-2">
                <h3 className="text-sm font-extrabold text-primary">
                  1. {parentZone ? `${parentZone.name}(${aptDong || parentZone.dongLabel})` : `동탄 ${aptDong || '핵심 권역'}`} 입지 포지셔닝
                </h3>
                <p className="leading-relaxed">
                  {parentZone
                    ? `${decodedName} 단지는 ${parentZone.name}(${parentZone.dongLabel}) 권역에 속하며, ${parentZone.description}`
                    : `${decodedName} 단지는 화성시 동탄 ${aptDong || '신도시'} 생활권 내에 위치하여 광역 교통망과 중심 상업·교육 인프라를 공유합니다.`}
                </p>
              </article>

              <article className="bg-surface dark:bg-[#1e1e24] p-4 rounded-2xl space-y-2">
                <h3 className="text-sm font-extrabold text-primary">
                  2. 연식·세대 규모 및 주력 평형 수급 구조
                </h3>
                <p className="leading-relaxed tabular-nums">
                  {ageLifecycleComment} {scaleLiquidityComment}{' '}
                  {dominantPyeong
                    ? dominantPyeong.salesCount > 0
                      ? `단지 내 최다 거래 주력 평형은 ${dominantPyeong.pyeong}평형(전용 ${dominantPyeong.areaM2}㎡, 매매 ${dominantPyeong.salesCount}건·전세 ${dominantPyeong.rentCount}건)으로 최근 실거래가 ${dominantPyeong.latestPriceStr}, 평균 매매가 ${dominantPyeong.avgPriceStr} 수준을 기록 중입니다.`
                      : `단지 내 최다 거래 주력 평형은 ${dominantPyeong.pyeong}평형(전용 ${dominantPyeong.areaM2}㎡, 전월세 ${dominantPyeong.rentCount}건)으로 최근 전월세 보증금 ${dominantPyeong.latestDepositStr} 수준에서 임대차 거래가 형성되어 있습니다.`
                    : ''}
                </p>
              </article>

              <article className="bg-surface dark:bg-[#1e1e24] p-4 rounded-2xl space-y-2">
                <h3 className="text-sm font-extrabold text-primary">
                  3. 실거주 PER 및 전세 안전 마진 진단
                </h3>
                <p className="leading-relaxed tabular-nums">{jeonsePerComment}</p>
              </article>
            </div>
          </div>
        </details>

        {topGuide && (
          <div
            data-testid="apt-top-guide-anchor-card"
            className="rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                <DviewIcon name="book-open" size={13} />
                <span>
                  {hasDirectGuideMatch
                    ? `${decodedName} 수록 1:1 비교 가이드`
                    : `${matchedGuideZoneName || parentZone?.name || aptDong} 권역 1:1 비교 가이드`}
                </span>
              </div>
              <p className="text-xs sm:text-[13px] font-extrabold text-primary">{topGuide.title}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Link
                href={`/guide/${topGuide.slug}`}
                prefetch={false}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold transition-colors"
              >
                <span>심층 비교 리포트 읽기</span>
                <DviewIcon name="arrow-right" size={13} />
              </Link>
              <a
                href="#apt-related-guides-ssr"
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-surface border border-border/70 text-secondary hover:text-primary text-xs font-bold transition-colors"
              >
                <span>연관 가이드 {relatedGuidesCount}편 보기</span>
              </a>
            </div>
          </div>
        )}
      </section>

      {/* School & Infrastructure Location Analytics */}
      {locationSpec && (
        <div className="space-y-3.5">
          <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
            <span className="w-2 h-5 bg-emerald-500 rounded-full" />
            학군 · 교통 인프라 스펙
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[13px] text-secondary">
            {locationSpec.elementarySchool && (
              <div className="bg-[#f9fafb] dark:bg-[#17171c] p-4 rounded-2xl flex flex-col justify-between gap-2">
                <span className="text-[11px] font-bold text-tertiary">배정 초등학교</span>
                <strong className="text-primary text-[14px] truncate">{locationSpec.elementarySchool}</strong>
                <div className="flex items-center justify-between gap-2">
                  <span className={getVisualSignalPillClass('safe', 'tabular-nums w-fit')}>
                    <DviewIcon name="graduation-cap" size={11} />
                    <span>도보 {Math.round((locationSpec.distanceToElementary || 0) / 70) || 1}분</span>
                  </span>
                  <span className="text-[11px] font-bold text-tertiary tabular-nums">
                    {Math.round(locationSpec.distanceToElementary || 0)}m
                  </span>
                </div>
              </div>
            )}
            {locationSpec.middleSchool && (
              <div className="bg-[#f9fafb] dark:bg-[#17171c] p-4 rounded-2xl flex flex-col justify-between gap-2">
                <span className="text-[11px] font-bold text-tertiary">인근 중학교</span>
                <strong className="text-primary text-[14px] truncate">{locationSpec.middleSchool}</strong>
                <span className={getVisualSignalPillClass('neutral', 'w-fit')}>
                  <DviewIcon name="graduation-cap" size={11} />
                  <span>배정 학군권</span>
                </span>
              </div>
            )}
            {locationSpec.highSchool && (
              <div className="bg-[#f9fafb] dark:bg-[#17171c] p-4 rounded-2xl flex flex-col justify-between gap-2">
                <span className="text-[11px] font-bold text-tertiary">인근 고등학교</span>
                <strong className="text-primary text-[14px] truncate">{locationSpec.highSchool}</strong>
                <span className={getVisualSignalPillClass('neutral', 'w-fit')}>
                  <DviewIcon name="graduation-cap" size={11} />
                  <span>통학 생활권</span>
                </span>
              </div>
            )}
            {locationSpec.nearestStationName && (
              <div className="bg-[#f9fafb] dark:bg-[#17171c] p-4 rounded-2xl flex flex-col justify-between gap-2">
                <span className="text-[11px] font-bold text-tertiary">대중교통 · 철도</span>
                <strong className="text-primary text-[14px] truncate">
                  {locationSpec.nearestStationLine || '지하철'} {locationSpec.nearestStationName}역
                </strong>
                <div className="flex items-center justify-between gap-2">
                  <span className={getVisualSignalPillClass('down', 'tabular-nums w-fit')}>
                    <DviewIcon name="train-front" size={11} />
                    <span>도보 {Math.round((locationSpec.distanceToSubway || 0) / 70) || 1}분</span>
                  </span>
                  <span className="text-[11px] font-bold text-tertiary tabular-nums">
                    {Math.round(locationSpec.distanceToSubway || 0)}m
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* On-site Scouting Assessment */}
      {scoutingSections && (
        <div className="space-y-3">
          <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
            <span className="w-2 h-5 bg-emerald-500 rounded-full" />
            현장 임장 정성 평가
          </h2>
          <details open data-editorial-open="true" className={getSeoAccordionClass('bg-[#f9fafb] dark:bg-[#17171c]')}>
            <summary className={getSeoAccordionSummaryClass()}>
              <span>현장 임장 검증 · 정성 해설 더보기</span>
              <DviewIcon name="chevron-down" size={16} className={getSeoAccordionChevronClass()} />
            </summary>
            <div className={getSeoAccordionBodyClass()}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px] text-secondary">
                {scoutingSections.synthesis && (
                  <div className="bg-surface dark:bg-[#1e1e24] p-4 rounded-2xl col-span-1 md:col-span-2">
                    <h3 className="text-sm font-extrabold text-primary mb-1.5">단지 종합 가치 평가</h3>
                    <p className="leading-relaxed font-medium">{scoutingSections.synthesis}</p>
                  </div>
                )}
                {scoutingSections.schoolText && (
                  <div className="bg-surface dark:bg-[#1e1e24] p-4 rounded-2xl">
                    <h3 className="text-sm font-extrabold text-primary mb-1.5">학군 및 교육 환경</h3>
                    <p className="leading-relaxed font-medium">{scoutingSections.schoolText}</p>
                  </div>
                )}
                {scoutingSections.trafficText && (
                  <div className="bg-surface dark:bg-[#1e1e24] p-4 rounded-2xl">
                    <h3 className="text-sm font-extrabold text-primary mb-1.5">교통 및 도로 인프라</h3>
                    <p className="leading-relaxed font-medium">{scoutingSections.trafficText}</p>
                  </div>
                )}
                {scoutingSections.parkingText && (
                  <div className="bg-surface dark:bg-[#1e1e24] p-4 rounded-2xl col-span-1 md:col-span-2">
                    <h3 className="text-sm font-extrabold text-primary mb-1.5">주차 공간 및 입주민 편의 시설</h3>
                    <p className="leading-relaxed font-medium">{scoutingSections.parkingText}</p>
                  </div>
                )}
              </div>
            </div>
          </details>
        </div>
      )}
    </>
  );
}

export function ApartmentPyeongTableBody({ rows }: { rows: readonly CompactAptPyeongRow[] }) {
  return (
    <>
      {rows.map((p) => (
        <tr key={p.pyeong}>
          <th scope="row" className="font-bold text-primary">{p.pyeong}평형</th>
          <td>{p.areaM2}㎡</td>
          <td className="font-bold text-emerald-600 dark:text-emerald-400">{p.latestPriceStr}</td>
          <td>{p.avgPriceStr}</td>
          <td>{p.maxPriceStr}</td>
          <td>{p.latestDepositStr}</td>
          <td>{p.jeonseRatio > 0 ? `${p.jeonseRatio}%` : '정보 없음'}</td>
          <td>매매 {p.salesCount}건 / 전세 {p.rentCount}건</td>
        </tr>
      ))}
    </>
  );
}

export function ApartmentSimpleTableBody({
  rows,
  lastColTone,
}: {
  rows: ReadonlyArray<readonly string[]>;
  lastColTone: 'emerald' | 'red' | 'red-dark';
}) {
  const toneClass =
    lastColTone === 'emerald'
      ? 'font-bold text-emerald-600 dark:text-emerald-400'
      : lastColTone === 'red'
      ? 'text-red-600 dark:text-red-400 font-bold'
      : 'text-red-700 dark:text-red-400 font-bold';

  return (
    <>
      {rows.map((cols, idx) => (
        <tr key={idx}>
          <th>{cols[0]}</th>
          {cols.slice(1, -1).map((cell, cIdx) => (
            <td key={cIdx}>{cell}</td>
          ))}
          <td className={toneClass}>{cols[cols.length - 1]}</td>
        </tr>
      ))}
    </>
  );
}

export interface ApartmentReportBottomSectionsProps {
  decodedName: string;
  aptDong: string;
  isApartmentIndexable: boolean;
  adsenseApprovalMode: boolean;
  parentZone: CompactAptZoneMeta | null;
  perPyeongStr?: string;
  sameZoneSimilarPerPyeongTop5: CompactAptPeerItem[];
  schoolZoneCompetitors: CompactAptSchoolPeerItem[];
  elementarySchool?: string;
  middleSchool?: string;
  distanceToElementary?: number;
  relatedGuides: CompactAptGuideItem[];
  hasDirectGuideMatch: boolean;
  matchedGuideZoneName?: string;
  yearBuiltNum: number;
  buildingAge: number | null;
}

export function ApartmentMortgageFaqAccordion({
  faqList,
}: {
  faqList: Array<{ question: string; answer: string }>;
}) {
  return (
    <details className={getSeoAccordionClass('bg-[#f9fafb] dark:bg-[#17171c]')}>
      <summary className={getSeoAccordionSummaryClass()}>
        <span className="inline-flex items-center gap-1.5">
          <DviewIcon name="help-circle" size={15} className="text-emerald-600 dark:text-emerald-400" />
          <span>주담대 · 전세 안전 FAQ 4선 더보기</span>
        </span>
        <DviewIcon name="chevron-down" size={16} className={getSeoAccordionChevronClass()} />
      </summary>
      <div className={getSeoAccordionBodyClass()}>
        <dl className="space-y-3 text-[13px]">
          {faqList.map((faq) => (
            <div key={faq.question} className="border-b border-border/40 pb-3 last:border-0 last:pb-0">
              <dt className="font-bold text-primary flex items-start gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">Q.</span>
                {faq.question}
              </dt>
              <dd className="mt-1 text-secondary pl-5 leading-relaxed font-medium">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}

export function ApartmentReportBottomSections(props: ApartmentReportBottomSectionsProps) {
  const {
    decodedName,
    aptDong,
    isApartmentIndexable,
    adsenseApprovalMode,
    parentZone,
    perPyeongStr,
    sameZoneSimilarPerPyeongTop5,
    schoolZoneCompetitors,
    elementarySchool,
    middleSchool,
    distanceToElementary,
    relatedGuides,
    hasDirectGuideMatch,
    matchedGuideZoneName,
    yearBuiltNum,
    buildingAge,
  } = props;

  const isApprovalMode = Boolean(
    adsenseApprovalMode || process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true'
  );

  return (
    <>
      {/* Chapter 05 Post-Mortgage Zero-CLS AdSlot */}
      {!isApprovalMode && isApartmentIndexable && (
        <div
          data-testid="ssr-adslot-ch05"
          className="w-full min-h-[250px] rounded-2xl bg-elevated dark:bg-slate-900 transition-colors flex flex-col justify-center overflow-hidden empty:hidden"
        >
          <AdSlot
            refreshSlotId="1000000002_ssr_ch05"
            format="rectangle"
            minHeightClass="min-h-[250px]"
            cpaCampaignId="jeonse-sentinel"
            apartmentName={decodedName}
            dong={aptDong || undefined}
          />
        </div>
      )}

      {/* Chapter 06 Neighborhood & Zone Internal Link Mesh */}
      <section
        id="chapter-06-neighborhood-links-ssr"
        aria-label={`${decodedName} 소속 권역 및 인근 단지 비교 리포트`}
        className="space-y-6 pt-4 border-t border-slate-200 dark:border-slate-800"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight flex items-center gap-2">
              <DviewIcon name="map-pin" size={18} className="text-emerald-600 dark:text-emerald-400" />
              <span>인근 유사 평당가 · 학군 비교</span>
            </h2>
            <p className="mt-1 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 font-medium">
              동일 권역 평당가 근접 TOP 5 · 배정 학군 경쟁 단지 1:1 시세
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {parentZone && (
              <Link
                href={`/zone/${parentZone.id}`}
                prefetch={false}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-slate-50 text-xs font-extrabold transition-colors"
              >
                <span>{parentZone.name} 전체 단지 보기</span>
                <DviewIcon name="arrow-right" size={14} />
              </Link>
            )}
            <Link
              href="/explore"
              prefetch={false}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/60 dark:bg-slate-800 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 text-xs font-extrabold transition-colors"
            >
              <span>동탄 전체 단지 탐색</span>
              <DviewIcon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>

        {sameZoneSimilarPerPyeongTop5.length > 0 && (
          <div
            id="apt-similar-per-pyeong-top5-ssr"
            data-testid="apt-similar-per-pyeong-top5-ssr"
            className="space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <DviewIcon name="building-2" size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>
                  같은 동(권역) 내 평당가 유사 단지 TOP 5
                  {perPyeongStr ? ` (기준 평당가 ${perPyeongStr})` : ''}
                </span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                국토부 실거래 평당가 근접순
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {sameZoneSimilarPerPyeongTop5.map((peer, idx) => (
                <Link
                  key={peer.canonicalSlug}
                  href={`/apartment/${encodeURIComponent(peer.canonicalSlug)}`}
                  prefetch={false}
                  className="group dview-apt-peer"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-extrabold tabular-nums">
                        TOP {idx + 1} · {peer.dong}
                      </span>
                      {peer.txCount > 0 && <span className="tabular-nums">누적 {peer.txCount}건</span>}
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate transition-colors">
                      {peer.name}
                    </h4>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-slate-200/80 dark:border-slate-700/60 text-xs tabular-nums">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">평당가</span>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">{peer.perPyeongStr}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">최근 실거래가</span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{peer.latestPriceStr}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {schoolZoneCompetitors.length > 0 && (
          <div
            id="apt-school-zone-competitors-ssr"
            data-testid="apt-school-zone-competitors-ssr"
            className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <DviewIcon name="graduation-cap" size={16} className="text-blue-600 dark:text-blue-400" />
                <span>
                  인접 학군 경쟁 단지 비교
                  {elementarySchool
                    ? ` (${elementarySchool}${middleSchool ? ` · ${middleSchool}` : ''})`
                    : ''}
                </span>
              </h3>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                동일 배정 초등학교 · 중학교 학군 기준
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {schoolZoneCompetitors.map((peer) => (
                <Link
                  key={peer.canonicalSlug}
                  href={`/apartment/${encodeURIComponent(peer.canonicalSlug)}`}
                  prefetch={false}
                  className="group dview-apt-peer hover:border-blue-300 dark:hover:border-blue-700"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 font-extrabold">
                        {peer.matchType}
                      </span>
                      <span>{peer.dong}</span>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-blue-700 dark:group-hover:text-blue-400 truncate transition-colors">
                      {peer.name}
                    </h4>
                    <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate">
                      배정초: {peer.elementarySchool}
                      {peer.middleSchool ? ` · ${peer.middleSchool}` : ''}
                    </p>
                  </div>
                  <div className="space-y-1 pt-2 border-t border-slate-200/80 dark:border-slate-700/60 text-xs tabular-nums">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">평당가</span>
                      <span className="font-extrabold text-slate-900 dark:text-slate-100">{peer.perPyeongStr}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">최근 실거래가</span>
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-400">{peer.latestPriceStr}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {relatedGuides.length > 0 && (
          <div
            id="apt-related-guides-ssr"
            className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <DviewIcon name="book-open" size={16} className="text-blue-600 dark:text-blue-400" />
                <span>
                  {hasDirectGuideMatch
                    ? `${decodedName} 포함 1:1 실거래 맞대결 비교 가이드`
                    : `${matchedGuideZoneName || parentZone?.name || aptDong} 권역 1:1 실거래 비교 가이드`}
                </span>
              </h3>
              <Link
                href="/guide"
                prefetch={false}
                className="text-xs font-extrabold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 shrink-0"
              >
                <span>비교 가이드 전체보기</span>
                <DviewIcon name="arrow-right" size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {relatedGuides.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/guide/${guide.slug}`}
                  prefetch={false}
                  className="group dview-apt-peer"
                >
                  <div className="space-y-1">
                    <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                      {guide.category}
                    </span>
                    <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                      {guide.title}
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 inline-flex items-center gap-1">
                    <span>1:1 비교 리포트 열람</span>
                    <DviewIcon name="arrow-right" size={11} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Thematic House Price Comparison Hub Bridge */}
        <div
          id="apt-thematic-stats-bridge-ssr"
          data-testid="apt-thematic-stats-bridge-ssr"
          className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 flex items-center gap-2">
              <DviewIcon name="bar-chart-3" size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span>
                {decodedName} 입지 테마별 집값 비교 통계 리포트 (초품아·호수공원·연식별·동탄1 vs 2)
              </span>
            </h3>
            <Link
              href="/stats"
              prefetch={false}
              className="text-xs font-extrabold text-blue-700 dark:text-blue-400 hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>아파트 통계 전체보기</span>
              <DviewIcon name="arrow-right" size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 tabular-nums">
            <Link
              href="/stats?topic=school-district-premium#school-district-premium"
              prefetch={false}
              className="group dview-apt-peer hover:border-blue-300 dark:hover:border-blue-700"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-400">
                  Issue #2 · 초품아·학군 프리미엄
                </span>
                <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  초품아 vs 일반 단지 · 학원가 밀집도별 집값 격차 비교
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  {elementarySchool
                    ? `${elementarySchool}${typeof distanceToElementary === 'number' ? ` (${distanceToElementary}m)` : ''}`
                    : '배정 초등학교 도보권'}{' '}
                  학군 시세 위치 확인
                </p>
              </div>
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 inline-flex items-center gap-1">
                <span>학군별 집값 통계 열기</span>
                <DviewIcon name="arrow-right" size={11} />
              </span>
            </Link>

            <Link
              href="/stats?topic=lake-park-view-premium#lake-park-view-premium"
              prefetch={false}
              className="group dview-apt-peer"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                  Issue #3 · 호수공원 조망권 비교
                </span>
                <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                  동탄호수공원 수변·도보권 vs 비수변 집값·회전율 비교
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  {aptDong ? `동탄 ${aptDong}` : '동탄 권역'} 대비 수변 랜드마크 평당가·회전율 격차 확인
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                <span>호수공원 집값 통계 열기</span>
                <DviewIcon name="arrow-right" size={11} />
              </span>
            </Link>

            <Link
              href="/stats?topic=building-age-depreciation#building-age-depreciation"
              prefetch={false}
              className="group dview-apt-peer hover:border-blue-300 dark:hover:border-blue-700"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-400">
                  Issue #4 · 연식별 감가·방어율 비교
                </span>
                <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  신축(5년 이하) vs 준신축 vs 구축 집값·전고점 방어율 비교
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  {yearBuiltNum > 0 && buildingAge !== null
                    ? `${yearBuiltNum}년 준공(${buildingAge}년차) 연식 구간 시세 방어율 비교`
                    : '준공 연차별 감가상각 및 시세 방어율 비교'}
                </p>
              </div>
              <span className="text-[11px] font-bold text-blue-700 dark:text-blue-400 inline-flex items-center gap-1">
                <span>연식별 집값 통계 열기</span>
                <DviewIcon name="arrow-right" size={11} />
              </span>
            </Link>

            <Link
              href="/stats?topic=dongtan-1-vs-2-comparison#dongtan-1-vs-2-comparison"
              prefetch={false}
              className="group dview-apt-peer"
            >
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                  VS 특집 · 동탄1 vs 동탄2 집값 비교
                </span>
                <h4 className="text-xs sm:text-[13px] font-extrabold text-slate-900 dark:text-slate-50 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                  동탄1신도시 vs 동탄2신도시 평형별·예산대별 실거래 비교
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  법정동별 평균 매매가 및 6억~15억+ 예산대별 단지 분포 비교
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                <span>동탄1 vs 2 통계 열기</span>
                <DviewIcon name="arrow-right" size={11} />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export type ApartmentReportPartProps =
  | ({ kind: 'top' } & ApartmentReportTopSectionsProps)
  | { kind: 'pyeong-rows'; rows: readonly CompactAptPyeongRow[] }
  | { kind: 'ch02-ad'; decodedName: string; aptDong: string }
  | {
      kind: 'simple-rows';
      rows: ReadonlyArray<readonly string[]>;
      lastColTone: 'emerald' | 'red' | 'red-dark';
    }
  | { kind: 'faq'; faqList: Array<{ question: string; answer: string }> }
  | ({ kind: 'bottom' } & ApartmentReportBottomSectionsProps);

/**
 * Single unified Client Component entrypoint for `/apartment/[aptName]` SSR report parts.
 * Collapses 6 separate RSC `I[...]` client-module chunk manifests into 1 (~5.5KB saved per apartment page).
 */
export default function ApartmentReportPart(props: ApartmentReportPartProps) {
  switch (props.kind) {
    case 'top':
      return <ApartmentReportTopSections {...props} />;
    case 'pyeong-rows':
      return <ApartmentPyeongTableBody rows={props.rows} />;
    case 'ch02-ad':
      return (
        <div
          data-testid="ssr-adslot-ch02"
          className="w-full min-h-[250px] rounded-2xl bg-elevated dark:bg-slate-900 transition-colors flex flex-col justify-center overflow-hidden empty:hidden"
        >
          <AdSlot
            refreshSlotId="1000000002_ssr_ch02"
            format="rectangle"
            minHeightClass="min-h-[250px]"
            cpaCampaignId="mortgage-refinance"
            apartmentName={props.decodedName}
            dong={props.aptDong || undefined}
          />
        </div>
      );
    case 'simple-rows':
      return <ApartmentSimpleTableBody rows={props.rows} lastColTone={props.lastColTone} />;
    case 'faq':
      return <ApartmentMortgageFaqAccordion faqList={props.faqList} />;
    case 'bottom':
      return <ApartmentReportBottomSections {...props} />;
  }
}
