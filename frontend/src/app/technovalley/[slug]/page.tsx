import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Building2, Landmark, FileSpreadsheet, CheckCircle2, ArrowLeft } from 'lucide-react';
import TechnoValleyClient from '../TechnoValleyClient';
import { AdSlot } from '@/components/ads/AdSlot';
import { safeJsonLd } from '@/lib/utils/structuredData';
import {
  getTechnoValleyJisanList,
  resolveTechnoValleyJisan,
  buildTechnoValleySeoMetadata,
  buildTechnoValleyJsonLd,
  formatTechnoValleyAreaM2 as formatAreaM2,
  formatTechnoValleyUnits as formatUnits,
  formatJisanTitleLabel,
  formatTechnoValleyJisanSlug,
} from '@/lib/services/apartmentPageService';

export const revalidate = 3600;

export interface TechnoValleyDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const jisanList = await getTechnoValleyJisanList();
  return jisanList.map((item) => ({
    slug: formatTechnoValleyJisanSlug(item.name),
  }));
}

export async function generateMetadata(props: TechnoValleyDetailPageProps): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const { slug } = await props.params;
  const jisanList = await getTechnoValleyJisanList();
  const matched = resolveTechnoValleyJisan(jisanList, slug);
  const meta = buildTechnoValleySeoMetadata(jisanList, matched?.name || slug, baseUrl);

  if (matched) {
    const cleanSlug = formatTechnoValleyJisanSlug(matched.name);
    const cleanCanonical = `${baseUrl}/technovalley/${encodeURIComponent(cleanSlug)}`;
    return {
      ...meta,
      alternates: {
        ...meta.alternates,
        canonical: cleanCanonical,
      },
      openGraph: meta.openGraph
        ? {
            ...meta.openGraph,
            url: cleanCanonical,
          }
        : undefined,
    };
  }
  return meta;
}

export default async function TechnoValleyDetailPage(
  props: TechnoValleyDetailPageProps
): Promise<React.JSX.Element> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const { slug } = await props.params;
  const jisanList = await getTechnoValleyJisanList();
  const selectedJisan = resolveTechnoValleyJisan(jisanList, slug);

  if (!selectedJisan) {
    notFound();
  }

  const jsonLd = buildTechnoValleyJsonLd(jisanList, baseUrl, selectedJisan);

  return (
    <div className="min-h-screen bg-body font-sans pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />

      <TechnoValleyClient selectedJisan={selectedJisan} />

      <section
        id="technovalley-jisan-ssr-detail"
        className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-8 my-6"
      >
        <div className="bg-surface border border-border/80 rounded-3xl p-6 sm:p-10 shadow-sm space-y-10">
          <div className="border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-[12px] font-extrabold px-3 py-1 rounded-full border border-blue-500/20">
                <Building2 size={14} className="shrink-0" />
                <span>D-VIEW B2B 지식산업센터 공식 인허가 리포트</span>
              </span>
              <Link
                href="/technovalley"
                prefetch={false}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline"
              >
                <ArrowLeft size={14} />
                <span>전체 {jisanList.length}개 지식산업센터 카탈로그</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
              {formatJisanTitleLabel(selectedJisan.name)} 건축 스펙·입주 업종 및 세제 감면 분석
            </h1>
            <p className="mt-3 text-secondary text-[14px] sm:text-[15.5px] leading-relaxed max-w-[960px] font-medium">
              소재지: {selectedJisan.roadAddress || selectedJisan.jibunAddress || '경기도 화성시 동탄테크노밸리'} · 한국산업단지공단 FactoryOn 및 화성시 공식 인허가 데이터 기준 연면적·산업시설 면적·호실수 및 입주 기업 세제 혜택을 안내합니다.
            </p>
          </div>

          <div
            id="technovalley-selected-jisan-ssr"
            className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] dark:bg-emerald-950/20 p-5 sm:p-6 space-y-4"
          >
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px] tabular-nums">
              <div className="bg-surface rounded-xl border border-border/60 p-3.5">
                <dt className="text-tertiary text-[11.5px] font-semibold">연면적 / 대지면적</dt>
                <dd className="mt-1 font-extrabold text-primary text-[15px]">
                  {formatAreaM2(selectedJisan.totalFloorArea)} / {formatAreaM2(selectedJisan.landArea)}
                </dd>
              </div>
              <div className="bg-surface rounded-xl border border-border/60 p-3.5">
                <dt className="text-tertiary text-[11.5px] font-semibold">산업시설 / 지원시설</dt>
                <dd className="mt-1 font-bold text-primary">
                  {formatAreaM2(selectedJisan.factoryArea)} / {formatAreaM2(selectedJisan.auxiliaryArea)}
                </dd>
              </div>
              <div className="bg-surface rounded-xl border border-border/60 p-3.5">
                <dt className="text-tertiary text-[11.5px] font-semibold">집계 호실수 / 분양유형</dt>
                <dd className="mt-1 font-bold text-primary">
                  {formatUnits(selectedJisan.unitCount)} · {selectedJisan.saleType || '분양'}
                </dd>
              </div>
              <div className="bg-surface rounded-xl border border-border/60 p-3.5">
                <dt className="text-tertiary text-[11.5px] font-semibold">입주 가능 업종 · 세제 혜택</dt>
                <dd className="mt-1 font-bold text-emerald-700 dark:text-emerald-300">
                  {selectedJisan.representativeBusiness?.trim() || '제조·지식·정보통신(IT)'} · 취득세 35% 감면
                </dd>
              </div>
            </dl>
          </div>

          {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
            <div
              data-testid="technovalley-detail-b2b-adslot"
              className="w-full min-h-[250px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] flex flex-col justify-center overflow-hidden empty:hidden"
            >
              <AdSlot
                refreshSlotId="1000000002_technovalley_detail_b2b"
                format="rectangle"
                minHeightClass="min-h-[250px]"
                cpaCampaignId="corporate-relocation"
                apartmentName={selectedJisan.name}
              />
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight flex items-center gap-2">
              <Landmark size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{formatJisanTitleLabel(selectedJisan.name)} 입주 법인 세제 혜택 및 정책자금 기준</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-body p-4 rounded-2xl border border-border/50 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[12.5px] text-secondary">
                  <strong className="text-primary block mb-0.5">취득세·재산세 35% 감면</strong>
                  지방세특례제한법 제58조의2에 의거 최초 분양 중소기업 직접 사용 시 취득세 35% 및 재산세 35%(5년간) 감면이 적용됩니다.
                </div>
              </div>
              <div className="bg-body p-4 rounded-2xl border border-border/50 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[12.5px] text-secondary">
                  <strong className="text-primary block mb-0.5">과밀억제권역 이전 법인세 감면</strong>
                  조세특례제한법 제63조에 따라 수도권 과밀억제권역에서 동탄 성장관리권역으로 본사 이전 시 법인세 감면 혜택을 받을 수 있습니다.
                </div>
              </div>
              <div className="bg-body p-4 rounded-2xl border border-border/50 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[12.5px] text-secondary">
                  <strong className="text-primary block mb-0.5">중소기업 정책자금 최대 80% 융자</strong>
                  중소벤처기업진흥공단 및 경기도 중소기업 육성자금을 통해 분양가의 70%~80% 이내 저리 시설자금 대출을 활용할 수 있습니다.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border/60">
            <h2 className="text-base font-extrabold text-primary flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>동탄테크노밸리 주요 지식산업센터 바로가기</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {jisanList.slice(0, 16).map((item) => {
                const itemSlug = formatTechnoValleyJisanSlug(item.name);
                return (
                  <Link
                    key={`${item.seq}-${item.name}`}
                    href={`/technovalley/${encodeURIComponent(itemSlug)}`}
                    prefetch={false}
                    className="px-3 py-1.5 rounded-xl text-[12px] font-bold bg-body hover:bg-emerald-500/10 text-secondary hover:text-emerald-700 dark:hover:text-emerald-300 border border-border/60 transition-colors"
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
