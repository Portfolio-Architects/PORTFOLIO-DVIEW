'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, MapPin, CheckCircle2, ArrowDownRight, LayoutGrid } from 'lucide-react';
import PageHeroHeader from '@/components/PageHeroHeader';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import dynamic from 'next/dynamic';
import type { TechnoValleyJisan } from '@/lib/services/apartmentPageService';

const TechnoValleyDashboard = dynamic(
  () => import('@/components/macro/TechnoValleyDashboard'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 mb-5 items-stretch animate-pulse">
        {/* Left Panel Skeleton */}
        <div className="lg:col-span-6 flex flex-col gap-6 h-[586px]">
          <div className="bg-black/5 dark:bg-surface/5 border border-border/40 p-6 rounded-[24px] h-[370px] shrink-0" />
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div className="bg-black/5 dark:bg-surface/5 border border-border/40 p-4 rounded-[20px] h-[80px]" />
            <div className="bg-black/5 dark:bg-surface/5 border border-border/40 p-4 rounded-[20px] h-[80px]" />
            <div className="bg-black/5 dark:bg-surface/5 border border-border/40 p-4 rounded-[20px] h-[80px]" />
            <div className="bg-black/5 dark:bg-surface/5 border border-border/40 p-4 rounded-[20px] h-[80px]" />
          </div>
        </div>
        {/* Right Panel Skeleton */}
        <div className="lg:col-span-6 bg-black/5 dark:bg-surface/5 border border-border/40 p-6 rounded-[24px] h-[566px]" />
      </div>
    ),
  }
);

function parsePositiveNum(val?: number | string): number {
  if (val === undefined || val === null || val === '') return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  return Number.isFinite(num) && num > 0 ? num : 0;
}

function formatHeroAreaM2(val?: number | string): string {
  const num = parsePositiveNum(val);
  if (num <= 0) return '정보 없음';
  return `${num.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}㎡`;
}

function formatHeroUnits(val?: number | string): string {
  const num = Math.floor(parsePositiveNum(val));
  if (num <= 0) return '미정';
  return `${num.toLocaleString('ko-KR')}실`;
}

function formatCenterDisplayLabel(name: string): string {
  const trimmed = name.trim();
  return trimmed.includes('지식산업센터') ? trimmed : `${trimmed} 지식산업센터`;
}

export interface TechnoValleyClientProps {
  selectedJisan?: TechnoValleyJisan | null;
}

export default function TechnoValleyClient({ selectedJisan }: TechnoValleyClientProps = {}) {
  const selectedLabel = selectedJisan ? formatCenterDisplayLabel(selectedJisan.name) : null;
  const totalAreaNum = parsePositiveNum(selectedJisan?.totalFloorArea);
  const unitNum = Math.floor(parsePositiveNum(selectedJisan?.unitCount));
  const industryLabel =
    selectedJisan?.representativeBusiness?.trim() || '제조·지식·정보통신(IT)';
  const addressLabel =
    selectedJisan?.roadAddress?.trim() ||
    selectedJisan?.jibunAddress?.trim() ||
    '경기도 화성시 동탄테크노밸리';

  const heroSubtitleStrong = selectedLabel || '동탄테크노밸리 지식산업센터 56곳';
  const heroSubtitleLight = selectedJisan
    ? [
        totalAreaNum > 0 ? `연면적 ${formatHeroAreaM2(totalAreaNum)}` : null,
        unitNum > 0 ? `${unitNum.toLocaleString('ko-KR')}실` : null,
        `${industryLabel} 입주 업종 · 취득세 35% 감면`,
      ]
        .filter(Boolean)
        .join(' · ')
    : '공실률·입주 동향부터 이전 시 세제 감면 혜택까지 한눈에';

  return (
    <>
      <LoungeHeader activeTab="technovalley" />

      <div className="flex flex-col w-full bg-transparent">
        {/* Hero Header */}
        <PageHeroHeader
          isTitleDiv
          title="D-VIEW 테크노 랩"
          compactTitle={selectedLabel || 'D-VIEW 테크노 랩'}
          subtitleStrong={heroSubtitleStrong}
          subtitleLight={heroSubtitleLight}
          bottomContent={undefined}
        />

        <div className="max-w-[2000px] mx-auto w-full max-w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-6 pb-0 overflow-x-hidden min-w-0">
          {selectedJisan && selectedLabel && (
            <section
              id="technovalley-selected-jisan-hero-banner"
              aria-label={`${selectedLabel} 핵심 건축 스펙 및 세제 혜택 요약`}
              className="mb-6 rounded-2xl border border-emerald-500/30 bg-surface p-4 sm:p-5 shadow-sm"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      <Building2 size={12} className="shrink-0" />
                      <span>
                        선택 센터 요약 · {selectedJisan.buildingStatus || selectedJisan.status || '승인'}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-[12px] text-secondary font-medium truncate">
                      <MapPin size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{addressLabel}</span>
                    </span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-primary tracking-tight break-keep">
                    {selectedLabel}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href="#technovalley-selected-jisan-ssr"
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-slate-50 text-xs font-extrabold transition-colors"
                  >
                    <span>인허가·세제 상세 스펙</span>
                    <ArrowDownRight size={14} className="shrink-0" />
                  </a>
                  <Link
                    href="/technovalley"
                    prefetch={false}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-emerald-500/40 text-primary text-xs font-bold transition-colors"
                  >
                    <LayoutGrid size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>전체 56개 센터 보기</span>
                  </Link>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs sm:text-[13px] tabular-nums">
                <div className="rounded-xl border border-border/60 bg-body px-3.5 py-2.5">
                  <dt className="text-[11px] font-semibold text-tertiary">연면적</dt>
                  <dd className="mt-0.5 font-extrabold text-primary">{formatHeroAreaM2(selectedJisan.totalFloorArea)}</dd>
                </div>
                <div className="rounded-xl border border-border/60 bg-body px-3.5 py-2.5">
                  <dt className="text-[11px] font-semibold text-tertiary">산업시설 / 지원시설</dt>
                  <dd className="mt-0.5 font-bold text-primary">
                    {formatHeroAreaM2(selectedJisan.factoryArea)} / {formatHeroAreaM2(selectedJisan.auxiliaryArea)}
                  </dd>
                </div>
                <div className="rounded-xl border border-border/60 bg-body px-3.5 py-2.5">
                  <dt className="text-[11px] font-semibold text-tertiary">집계 호실수 · 분양유형</dt>
                  <dd className="mt-0.5 font-bold text-primary">
                    {formatHeroUnits(selectedJisan.unitCount)} · {selectedJisan.saleType || '분양'}
                  </dd>
                </div>
                <div className="rounded-xl border border-border/60 bg-body px-3.5 py-2.5">
                  <dt className="text-[11px] font-semibold text-tertiary">입주 가능 업종 · 세제 감면</dt>
                  <dd className="mt-0.5 font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 size={13} className="shrink-0" />
                    <span className="truncate">{industryLabel} · 취득세 35% 감면</span>
                  </dd>
                </div>
              </dl>
            </section>
          )}

          <TechnoValleyDashboard />
        </div>
      </div>

      <MobileDock activeTab="technovalley" />
    </>
  );
}
