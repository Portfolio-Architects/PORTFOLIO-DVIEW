import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
              href="/" 
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-surface/5 text-secondary transition-colors"
              aria-label="홈으로 이동"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="font-extrabold text-primary text-[17px] sm:text-lg tracking-tight">문의하기</h1>
          </div>
          <Link href="/" className="text-emerald-600 dark:text-emerald-400 font-bold text-[13px] sm:text-sm hover:underline">
            대시보드로 돌아가기
          </Link>
        </div>
      </div>

      {/* 본문 콘텐츠 */}
      <main className="max-w-[880px] mx-auto px-4 sm:px-6 mt-6 sm:mt-10">
        <ContactClient />
      </main>
    </div>
  );
}
