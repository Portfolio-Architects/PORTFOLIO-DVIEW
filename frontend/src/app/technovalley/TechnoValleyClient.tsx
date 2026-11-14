'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  MapPin,
  CheckCircle2,
  ArrowDownRight,
  LayoutGrid,
  Landmark,
  ReceiptText,
  ExternalLink,
} from 'lucide-react';
import PageHeroHeader from '@/components/PageHeroHeader';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import TechnoValleyBounceDefenseBridge from '@/components/technovalley/TechnoValleyBounceDefenseBridge';
import {
  selectPeerTechnoValleyJisans,
  type TechnoValleyPeerJisanItem,
} from '@/lib/utils/technovalleyPeerUtils';
import dynamic from 'next/dynamic';
import type {
  TechnoValleyJisan,
  JisanOfficeTransactionItem,
} from '@/lib/services/apartmentPageService';

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

function formatClientJisanSlug(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, '-');
}

function normalizeClientCoreKey(input: string): string {
  return input
    .replace(/[\u2162\u2172]/g, '3')
    .replace(/[\u2161\u2171]/g, '2')
    .replace(/[\u2160\u2170]/g, '1')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/지식산업센터/g, '')
    .replace(/주식회사|\(주\)/g, '')
    .replace(/타임스퀘어/g, 'timesquare')
    .replace(/스퀘어/g, 'square')
    .replace(/타워/g, 'tower')
    .replace(/센터/g, 'center')
    .replace(/아이티/g, 'it')
    .replace(/쓰리/g, '3')
    .replace(/투$/g, '2')
    .replace(/[^a-z0-9가-힣]/g, '')
    .replace(/iii$/g, '3')
    .replace(/ii$/g, '2')
    .replace(/(square|tower|center)i$/g, '$11')
    .replace(/^(?:신동탄|동탄역|동탄2|동탄)/, '')
    .replace(/동탄$/, '')
    .replace(/center$/, '');
}

function parseClientJibunComponents(rawAddress?: string): {
  dong: string | null;
  lot: string | null;
} {
  if (!rawAddress) return { dong: null, lot: null };
  const dongAndLot = rawAddress.match(
    /([가-힣]+(?:동|리))\s+((?:산\s*)?\d+(?:-\d+)?)(?=번지|외|\s|$|,|\()/
  );
  if (dongAndLot) {
    return {
      dong: dongAndLot[1],
      lot: dongAndLot[2].replace(/\s+/g, ''),
    };
  }
  const bareLot = rawAddress
    .trim()
    .match(/^((?:산\s*)?\d+(?:-\d+)?)(?:번지|외)?$/);
  if (bareLot) {
    return {
      dong: null,
      lot: bareLot[1].replace(/\s+/g, ''),
    };
  }
  return { dong: null, lot: null };
}

function filterTransactionsForJisan(
  jisan: TechnoValleyJisan | null | undefined,
  txList: readonly JisanOfficeTransactionItem[]
): JisanOfficeTransactionItem[] {
  if (!jisan || !Array.isArray(txList) || txList.length === 0) return [];
  const targetCore = normalizeClientCoreKey(jisan.name);
  const { dong: targetDong, lot: targetLot } = parseClientJibunComponents(jisan.jibunAddress);
  const dongMatch = jisan.name.match(/([A-Ca-c])동/);
  const targetDongBlock = dongMatch ? dongMatch[1].toUpperCase() : null;
  const targetCoreWithoutBlock = targetDongBlock ? targetCore.replace(/[a-c]동$/, '') : targetCore;
  const isLegalOrBlockCenterName = /\(주\)|주식회사|블럭|BL/i.test(jisan.name);

  return txList
    .filter((tx) => {
      if (!tx || tx.type === '임대' || !tx.price || tx.price === '0원') return false;

      const { dong: txDong, lot: txLot } = parseClientJibunComponents(tx.jibun);
      if (targetDong && txDong && targetDong !== txDong) return false;

      const bName = (tx.buildingName || '').trim();
      if (targetDongBlock) {
        if (bName) {
          const txDongBlock = bName.match(/([A-Ca-c])동/);
          if (txDongBlock && txDongBlock[1].toUpperCase() !== targetDongBlock) return false;
        }
        if (targetLot && txLot && txLot !== targetLot) return false;
      }

      const isGenericBuildingName =
        !bName || bName === '미상 건물' || bName === '지식산업센터' || bName === '-';

      if (!isGenericBuildingName) {
        const txCore = normalizeClientCoreKey(bName);
        if (txCore.length >= 3 && targetCore.length >= 3 && txCore === targetCore) return true;
        if (
          (targetCore === '금강펜테리움ixtower' && txCore === '금강ixtower') ||
          (targetCore === '현대실리콘앨리' && txCore === '실리콘앨리') ||
          (targetCore === 'shtimesquare1' && txCore === 'shtimesquare')
        ) {
          return true;
        }
        if (
          targetDongBlock &&
          txCore.length >= 3 &&
          txCore === targetCoreWithoutBlock &&
          targetLot &&
          txLot === targetLot
        ) {
          return true;
        }
        if (isLegalOrBlockCenterName && targetLot && txLot && txLot === targetLot) {
          return true;
        }
        return false;
      }

      return Boolean(targetLot && txLot && txLot === targetLot);
    })
    .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
}

export interface TechnoValleyClientProps {
  selectedJisan?: TechnoValleyJisan | null;
  jisanList?: readonly TechnoValleyJisan[];
  initialTransactions?: JisanOfficeTransactionItem[];
  initialPeerItems?: readonly TechnoValleyPeerJisanItem[];
  suppressHeroBridge?: boolean;
  hideHeader?: boolean;
}

const EMPTY_TRANSACTIONS: JisanOfficeTransactionItem[] = [];

function resolveClientQueryJisan(
  jisanList: readonly TechnoValleyJisan[] | undefined,
  rawQuery: string | null | undefined
): TechnoValleyJisan | null {
  if (!jisanList || jisanList.length === 0 || !rawQuery) return null;
  const trimmed = rawQuery.trim();
  if (!trimmed || trimmed.length > 100 || /[<>"'`()]|javascript:|onerror=/i.test(trimmed)) {
    return null;
  }
  const targetSlug = formatClientJisanSlug(trimmed).toLowerCase();
  const targetCore = normalizeClientCoreKey(trimmed);
  for (const item of jisanList) {
    if (!item?.name) continue;
    if (
      item.name.trim().toLowerCase() === trimmed.toLowerCase() ||
      formatClientJisanSlug(item.name).toLowerCase() === targetSlug ||
      (targetCore.length >= 2 && normalizeClientCoreKey(item.name) === targetCore)
    ) {
      return item;
    }
  }
  return null;
}

export default function TechnoValleyClient({
  selectedJisan,
  jisanList,
  initialTransactions,
  initialPeerItems,
  suppressHeroBridge = false,
  hideHeader = false,
}: TechnoValleyClientProps = {}) {
  // Initialize null so client hydration matches force-static SSR HTML 1:1,
  // then resolve ?jisan= on mount and browser history navigation without hydration mismatch.
  const [clientQueryJisan, setClientQueryJisan] = useState<TechnoValleyJisan | null>(null);

  useEffect(() => {
    if (selectedJisan) {
      setClientQueryJisan(null);
      return;
    }
    if (typeof window === 'undefined' || !jisanList?.length) return;

    const syncFromLocation = () => {
      try {
        const param = new URLSearchParams(window.location.search).get('jisan');
        setClientQueryJisan(resolveClientQueryJisan(jisanList, param));
      } catch {
        setClientQueryJisan(null);
      }
    };

    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => {
      window.removeEventListener('popstate', syncFromLocation);
    };
  }, [selectedJisan, jisanList]);

  const effectiveSelectedJisan = selectedJisan ?? clientQueryJisan ?? null;
  const hasServerInitialTransactions = initialTransactions !== undefined;
  const resolvedInitialTransactions = initialTransactions ?? EMPTY_TRANSACTIONS;
  const [fetchedTxs, setFetchedTxs] = useState<JisanOfficeTransactionItem[]>(EMPTY_TRANSACTIONS);
  const [fetchedAllRawTxs, setFetchedAllRawTxs] =
    useState<JisanOfficeTransactionItem[]>(EMPTY_TRANSACTIONS);

  useEffect(() => {
    if (!effectiveSelectedJisan || hasServerInitialTransactions) {
      setFetchedTxs((prev) => (prev.length === 0 ? prev : EMPTY_TRANSACTIONS));
      setFetchedAllRawTxs((prev) => (prev.length === 0 ? prev : EMPTY_TRANSACTIONS));
      return;
    }
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

    let active = true;
    window
      .fetch('/api/technovalley/transactions?lawdCd=41591&dealYmd=all')
      .then((res) => (res && res.ok ? res.json() : null))
      .then(
        (
          payload:
            | JisanOfficeTransactionItem[]
            | { data?: JisanOfficeTransactionItem[] }
            | null
        ) => {
          if (!active || !payload) return;
          const rawList = Array.isArray(payload)
            ? payload
            : Array.isArray(payload.data)
              ? payload.data
              : [];
          setFetchedAllRawTxs(rawList);
          setFetchedTxs(filterTransactionsForJisan(effectiveSelectedJisan, rawList));
        }
      )
      .catch(() => {
        // Ignore network errors in offline/test contexts; honest empty fallback is displayed
      });

    return () => {
      active = false;
    };
  }, [effectiveSelectedJisan, hasServerInitialTransactions]);

  const matchedTxs = useMemo(() => {
    if (hasServerInitialTransactions) {
      return filterTransactionsForJisan(effectiveSelectedJisan, resolvedInitialTransactions);
    }
    return fetchedTxs;
  }, [effectiveSelectedJisan, hasServerInitialTransactions, resolvedInitialTransactions, fetchedTxs]);

  const peerItems = useMemo<readonly TechnoValleyPeerJisanItem[]>(() => {
    if (!effectiveSelectedJisan && initialPeerItems && initialPeerItems.length > 0) {
      return initialPeerItems;
    }
    if (
      selectedJisan &&
      effectiveSelectedJisan === selectedJisan &&
      initialPeerItems &&
      initialPeerItems.length > 0
    ) {
      return initialPeerItems;
    }
    if (!jisanList || jisanList.length === 0) return initialPeerItems ?? [];
    const txPool =
      fetchedAllRawTxs.length > 0
        ? fetchedAllRawTxs
        : hasServerInitialTransactions
          ? resolvedInitialTransactions
          : undefined;
    return selectPeerTechnoValleyJisans(effectiveSelectedJisan, jisanList, txPool, 4);
  }, [
    effectiveSelectedJisan,
    selectedJisan,
    initialPeerItems,
    jisanList,
    fetchedAllRawTxs,
    hasServerInitialTransactions,
    resolvedInitialTransactions,
  ]);

  const latestSaleTx = matchedTxs.length > 0 ? matchedTxs[0] : null;
  const benchmarkPriceManwon =
    latestSaleTx?.priceRaw && latestSaleTx.priceRaw > 0 ? latestSaleTx.priceRaw : 30000;
  const savedTaxManwon = Math.round(Math.round(benchmarkPriceManwon * 0.046) * 0.35);

  const selectedLabel = effectiveSelectedJisan
    ? formatCenterDisplayLabel(effectiveSelectedJisan.name)
    : null;
  const selectedSlug = effectiveSelectedJisan
    ? formatClientJisanSlug(effectiveSelectedJisan.name)
    : '';
  const totalAreaNum = parsePositiveNum(effectiveSelectedJisan?.totalFloorArea);
  const unitNum = Math.floor(parsePositiveNum(effectiveSelectedJisan?.unitCount));
  const industryLabel =
    effectiveSelectedJisan?.representativeBusiness?.trim() || '제조·지식·정보통신(IT)';
  const addressLabel =
    effectiveSelectedJisan?.roadAddress?.trim() ||
    effectiveSelectedJisan?.jibunAddress?.trim() ||
    '경기도 화성시 동탄테크노밸리';

  const heroSubtitleStrong = selectedLabel || '동탄테크노밸리 지식산업센터 56곳';
  const heroSubtitleLight = effectiveSelectedJisan
    ? [
        totalAreaNum > 0 ? `연면적 ${formatHeroAreaM2(totalAreaNum)}` : null,
        unitNum > 0 ? `${unitNum.toLocaleString('ko-KR')}실` : null,
        `${industryLabel} 입주 업종 · 취득세 35% 감면`,
      ]
        .filter(Boolean)
        .join(' · ')
    : '국토부 상업·업무용 매매 실거래 기준';

  return (
    <>
      {!hideHeader && <LoungeHeader activeTab="technovalley" />}

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
          {effectiveSelectedJisan && selectedLabel && (
            <section
              id="technovalley-selected-jisan-hero-banner"
              aria-label={`${selectedLabel} 실거래가·핵심 건축 스펙 및 취득세 감면 요약`}
              className="mb-6 rounded-2xl border border-emerald-500/30 bg-surface p-4 sm:p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      <Building2 size={12} className="shrink-0" />
                      <span>
                        선택 센터 요약 · {effectiveSelectedJisan.buildingStatus || effectiveSelectedJisan.status || '승인'}
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
                  <Link
                    href={`/technovalley/${encodeURIComponent(selectedSlug)}`}
                    prefetch={false}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-slate-50 text-xs font-extrabold transition-colors"
                  >
                    <span>전용 상세 리포트</span>
                    <ExternalLink size={13} className="shrink-0" />
                  </Link>
                  <a
                    href="#technovalley-selected-jisan-ssr"
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 text-xs font-extrabold transition-colors"
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

              <dl className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs sm:text-[13px] tabular-nums">
                <div className="rounded-xl border border-border/60 bg-body px-3.5 py-2.5">
                  <dt className="text-[11px] font-semibold text-tertiary">연면적 / 대지면적</dt>
                  <dd className="mt-0.5 font-extrabold text-primary">
                    {formatHeroAreaM2(effectiveSelectedJisan.totalFloorArea)} / {formatHeroAreaM2(effectiveSelectedJisan.landArea)}
                  </dd>
                </div>
                <div className="rounded-xl border border-border/60 bg-body px-3.5 py-2.5">
                  <dt className="text-[11px] font-semibold text-tertiary">산업시설 / 지원시설</dt>
                  <dd className="mt-0.5 font-bold text-primary">
                    {formatHeroAreaM2(effectiveSelectedJisan.factoryArea)} / {formatHeroAreaM2(effectiveSelectedJisan.auxiliaryArea)}
                  </dd>
                </div>
                <div className="rounded-xl border border-border/60 bg-body px-3.5 py-2.5">
                  <dt className="text-[11px] font-semibold text-tertiary">집계 호실수 · 분양유형</dt>
                  <dd className="mt-0.5 font-bold text-primary">
                    {formatHeroUnits(effectiveSelectedJisan.unitCount)} · {effectiveSelectedJisan.saleType || '분양'}
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs sm:text-[13px] tabular-nums">
                <div
                  id="technovalley-client-jisan-real-tx"
                  className="rounded-xl border border-border/60 bg-body px-4 py-3 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold text-primary">
                      <ReceiptText size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>국토교통부 상업·업무용 매매 실거래가 요약</span>
                    </span>
                    <span className="text-[11px] font-semibold text-tertiary">
                      RTMSDataSvcNrgTrade 공식 데이터
                    </span>
                  </div>
                  {latestSaleTx ? (
                    <div className="pt-0.5 text-secondary font-medium">
                      최근 실거래{' '}
                      <strong className="font-extrabold text-primary">{latestSaleTx.price}</strong>{' '}
                      ({latestSaleTx.date} · 전용 {latestSaleTx.sizeSqM}㎡ · {latestSaleTx.floor}층, 총{' '}
                      {matchedTxs.length}건)
                    </div>
                  ) : (
                    <div className="pt-0.5 text-secondary font-medium">
                      등록된 실거래 내역이 없습니다. ({effectiveSelectedJisan.buildingStatus || '승인'} ·{' '}
                      {effectiveSelectedJisan.saleType || '분양'})
                    </div>
                  )}
                </div>

                <div
                  id="technovalley-client-jisan-tax-summary"
                  className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] dark:bg-emerald-950/20 px-4 py-3 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-extrabold text-emerald-800 dark:text-emerald-200">
                      <Landmark size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>취득세·재산세·법인세 감면 및 정책자금 핵심 요약</span>
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      지방세특례제한법 제58조의2
                    </span>
                  </div>
                  <div className="pt-0.5 text-secondary font-medium">
                    최초 분양 중소기업 취득세 <strong className="text-primary">35% 감면</strong>(예상 절감 약{' '}
                    <strong className="text-emerald-700 dark:text-emerald-300">
                      {savedTaxManwon.toLocaleString('ko-KR')}만원
                    </strong>
                    ) · 재산세 <strong className="text-primary">35% 감면(5년)</strong> · 과밀억제권역 이전 법인세{' '}
                    <strong className="text-primary">최대 100% 감면</strong> · 정책자금{' '}
                    <strong className="text-primary">분양가 70~80%</strong>
                  </div>
                </div>
              </div>

              {!suppressHeroBridge && (
                <TechnoValleyBounceDefenseBridge
                  currentJisan={effectiveSelectedJisan}
                  hasCurrentRealTx={Boolean(latestSaleTx)}
                  initialBenchmarkManwon={benchmarkPriceManwon}
                  peers={peerItems}
                  surface="technovalley_client_query"
                />
              )}
            </section>
          )}

          {!effectiveSelectedJisan && !suppressHeroBridge && peerItems.length > 0 && (
            <section
              data-testid="technovalley-hub-bounce-defense-strip"
              aria-label="동탄테크노밸리 핵심 지식산업센터 실거래 비교 및 세제 시뮬레이터 바로가기"
              className="mb-6"
            >
              <TechnoValleyBounceDefenseBridge
                currentJisan={null}
                hasCurrentRealTx={false}
                initialBenchmarkManwon={30000}
                peers={peerItems}
                surface="technovalley_hub_top"
              />
            </section>
          )}

          <TechnoValleyDashboard />
        </div>
      </div>

      <MobileDock activeTab="technovalley" />
    </>
  );
}

