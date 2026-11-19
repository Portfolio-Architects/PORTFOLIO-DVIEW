import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Database, Clock, FileCheck2 } from 'lucide-react';
import { safeJsonLd } from '@/lib/utils/structuredData';
import { Metadata } from 'next';
import ContactClient from './ContactClient';

const CONTACT_OG_IMAGE_URL = `https://dongtanview.com/api/og?title=${encodeURIComponent(
  'D-VIEW (디뷰 · 동뷰 · 동탄뷰) 고객 지원 및 문의'
)}&subtitle=${encodeURIComponent(
  '실거래 데이터 정정 요청 · 서비스 개선 건의 · B2B 광고 및 제휴 제안'
)}`;

export const metadata: Metadata = {
  title: '문의하기 · 데이터 정정·제휴 제안 | D-VIEW (디뷰 · 동뷰 · 동탄뷰) 고객 지원',
  description:
    'D-VIEW(디뷰 · 동뷰 · 동탄뷰) 동탄 부동산 실거래 데이터 랩스에 대한 데이터 정정 요청, 서비스 건의사항, 오류 제보, B2B 제휴 및 광고 문의를 위한 공식 고객 지원 채널입니다.',
  alternates: {
    canonical: 'https://dongtanview.com/contact',
    types: {
      'application/rss+xml': 'https://dongtanview.com/feed.xml',
    },
  },
  openGraph: {
    title: '문의하기 · 데이터 정정·제휴 제안 | D-VIEW (디뷰 · 동뷰 · 동탄뷰) 고객 지원',
    description:
      'D-VIEW(디뷰 · 동뷰 · 동탄뷰) 동탄 부동산 실거래 데이터 랩스에 대한 데이터 정정 요청, 서비스 건의사항, 오류 제보, B2B 제휴 및 광고 문의를 위한 공식 고객 지원 채널입니다.',
    url: 'https://dongtanview.com/contact',
    siteName: 'D-VIEW',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: CONTACT_OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: 'D-VIEW 고객 지원 및 문의 채널',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '문의하기 · 데이터 정정·제휴 제안 | D-VIEW 고객 지원',
    description:
      'D-VIEW(디뷰 · 동뷰 · 동탄뷰) 동탄 부동산 실거래 데이터 랩스 공식 고객 지원 및 제휴 문의 채널입니다.',
    images: [CONTACT_OG_IMAGE_URL],
  },
};

export default async function ContactPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const nonce = undefined;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ContactPage',
        '@id': `${baseUrl}/contact#webpage`,
        url: `${baseUrl}/contact`,
        name: '문의하기 · 데이터 정정·제휴 제안 | D-VIEW (디뷰 · 동뷰 · 동탄뷰) 고객 지원',
        description:
          'D-VIEW(디뷰 · 동뷰 · 동탄뷰) 동탄 부동산 분석 플랫폼에 대한 건의사항, 오류 제보, 광고 및 제휴 제안을 위한 고객 소통 및 이메일 문의 채널입니다.',
        inLanguage: 'ko-KR',
        isPartOf: {
          '@id': `${baseUrl}/#website`,
        },
        breadcrumb: {
          '@id': `${baseUrl}/contact#breadcrumb`,
        },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${baseUrl}/contact#breadcrumb`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: '홈',
            item: baseUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: '문의하기',
            item: `${baseUrl}/contact`,
          },
        ],
      },
      {
        '@type': 'RealEstateAgent',
        '@id': `${baseUrl}/#agent`,
        name: 'D-VIEW 부동산 데이터 랩스',
        alternateName: ['디뷰', '동뷰', '동탄뷰', 'D-VIEW'],
        description:
          '동탄 전역 아파트 비교 분석 및 AI 매도/전세 안전성 진단 전문 부동산 테크 플랫폼',
        url: baseUrl,
        address: {
          '@type': 'PostalAddress',
          addressCountry: 'KR',
          addressRegion: '경기도',
          addressLocality: '화성시 동탄역로',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-body font-sans pb-20">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />
      {/* 상단 네비게이션 헤더 */}
      <div className="bg-surface/90 backdrop-blur-md border-b border-border sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-[880px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/" prefetch={false} 
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-surface/5 text-secondary transition-colors"
              aria-label="홈으로 이동"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-extrabold text-primary text-[17px] sm:text-lg tracking-tight">문의하기</h1>
          </div>
          <Link href="/" prefetch={false} className="text-emerald-600 dark:text-emerald-400 font-bold text-[13px] sm:text-sm hover:underline">
            대시보드로 돌아가기
          </Link>
        </div>
      </div>

      {/* 본문 콘텐츠 */}
      <main className="max-w-[880px] mx-auto px-4 sm:px-6 mt-6 sm:mt-10 space-y-8">
        <ContactClient />

        {/* 고객 지원 운영 정책 및 공공 실거래 데이터 정정 안내 (SSR Trust & Editorial Transparency) */}
        <section
          aria-label="고객 지원 운영 기준 및 데이터 정정 처리 절차"
          className="rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-6 sm:p-8 space-y-6"
        >
          <div className="space-y-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              D-VIEW 데이터 정정 요청 및 고객 지원 운영 원칙
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              D-VIEW(디뷰 · 동뷰 · 동탄뷰) 부동산 데이터 랩스는 국토교통부 실거래가 공개시스템(매매·전월세), 화성시청 건축·산업단지 인허가 대장, 교육청 통학구역 고시 등 100% 공식 검증된 공공 데이터만을 수집·연동합니다. 단지 정보나 실거래 내역 중 사실과 다른 표기가 발견될 경우 아래 절차에 따라 신속하게 대조 및 정정을 진행합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <article className="rounded-2xl bg-surface dark:bg-[#1e1e24] p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-sm">
                <Database size={18} />
                <h3>1. 공공 실거래가 동기화 및 해제 거래 반영</h3>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed tabular-nums">
                아파트 매매·전월세 실거래 데이터는 국토교통부 API를 통해 매일 자동 동기화됩니다. 계약 해제(취소) 신고가 접수된 거래나 직거래 이상치의 경우 공공 원장 갱신 주기에 맞춰 자동 반영되며, 긴급 정정 제보 시 원장 대조 후 1영업일 이내에 캐시를 즉시 갱신합니다.
              </p>
            </article>

            <article className="rounded-2xl bg-surface dark:bg-[#1e1e24] p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-sm">
                <FileCheck2 size={18} />
                <h3>2. 단지 스펙 · 배정 학군 · 역세권 도보 거리 검수</h3>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed tabular-nums">
                세대수, 사용승인일, 주차대수, 배정 초등학교 및 GTX-A·SRT·인덕원선 예정역 도보 시간은 공동주택관리정보시스템(K-apt)과 교육지원청 통학구역 고시문을 기준으로 산출합니다. 신설 학교 개교나 통학구역 조정 사항을 제보해 주시면 증빙 고시문 확인 후 즉시 반영합니다.
              </p>
            </article>

            <article className="rounded-2xl bg-surface dark:bg-[#1e1e24] p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-sm">
                <Clock size={18} />
                <h3>3. 문의 유형별 표준 회신 소요 시간</h3>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed tabular-nums">
                데이터 오류 및 표기 정정 요청은 접수 후 영업일 기준 24시간 이내에 1차 검토 결과를 회신해 드립니다. 서비스 기능 개선 건의, 동탄테크노밸리 지식산업센터 입주·세제 정보 보완 요청 및 B2B 제휴·광고 문의는 담당 에디터 검토 후 2~3영업일 이내에 이메일로 상세히 안내해 드립니다.
              </p>
            </article>

            <article className="rounded-2xl bg-surface dark:bg-[#1e1e24] p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-extrabold text-sm">
                <ShieldCheck size={18} />
                <h3>4. 편집 독립성 및 개인정보 보호 준수</h3>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
                D-VIEW는 특정 단지의 시세를 인위적으로 부풀리거나 불리한 실거래 기록을 임의 삭제하는 요청은 수리하지 않으며, 오직 공공 원장 데이터에 근거한 객관적 정정만 수행합니다. 문의 접수 시 입력하신 이메일과 상담 내용은 답변 발송 목적 외에는 활용되지 않습니다.
              </p>
            </article>
          </div>

          <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800/70 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              자주 묻는 데이터 및 서비스 문의 (FAQ)
            </h3>
            <dl className="space-y-3 text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <div>
                <dt className="font-bold text-slate-800 dark:text-slate-200">
                  Q. 최근 체결된 계약이 아직 단지 상세 페이지에 보이지 않는 이유는 무엇인가요?
                </dt>
                <dd className="mt-1">
                  부동산 거래신고 등에 관한 법률에 따라 매매 및 전월세 계약은 체결일로부터 30일 이내에 신고하도록 규정되어 있습니다. 국토교통부 실거래가 공개시스템에 신고분이 공개되면 D-VIEW 일일 파이프라인이 익일 오전 자동으로 수집하여 반영합니다.
                </dd>
              </div>
              <div>
                <dt className="font-bold text-slate-800 dark:text-slate-200">
                  Q. 공공임대·영구임대·행복주택 단지에 매매 실거래가가 표시되지 않는 이유는 무엇인가요?
                </dt>
                <dd className="mt-1">
                  분양전환 이전의 임대 전용 단지는 국토교통부 매매 신고 내역이 존재하지 않으므로, D-VIEW는 임의의 추정 매매가를 생성하지 않고 실제 신고된 전월세 보증금과 임대차 계약 추이만 투명하게 제공합니다.
                </dd>
              </div>
            </dl>

            <div className="pt-3 flex flex-wrap items-center gap-4 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <Link href="/about" prefetch={false} className="hover:underline">
                서비스 소개 및 데이터 검증 원칙
              </Link>
              <Link href="/guide" prefetch={false} className="hover:underline">
                동탄 아파트 분석 가이드
              </Link>
              <Link href="/terms" prefetch={false} className="hover:underline">
                이용약관
              </Link>
              <Link href="/privacy" prefetch={false} className="hover:underline">
                개인정보처리방침
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
