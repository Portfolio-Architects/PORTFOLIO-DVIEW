import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { headers } from 'next/headers';
import { safeJsonLd } from '@/lib/utils/structuredData';
import ContactClient from './ContactClient';

export const metadata = {
  title: '문의하기 | D-VIEW 고객 지원',
  description: 'D-VIEW 부동산 분석 플랫폼에 대한 건의사항, 오류 제보, 광고 및 제휴 제안을 위한 고객 소통 및 이메일 문의 채널입니다.',
  alternates: {
    canonical: '/contact',
  },
};

export default async function ContactPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';
  const nonce = (await headers()).get('x-nonce') || undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ContactPage",
        "@id": `${baseUrl}/contact#webpage`,
        "url": `${baseUrl}/contact`,
        "name": "문의하기 | D-VIEW 고객 지원",
        "description": "D-VIEW 부동산 분석 플랫폼에 대한 건의사항, 오류 제보, 광고 및 제휴 제안을 위한 고객 소통 및 이메일 문의 채널입니다.",
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "홈",
              "item": baseUrl
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "문의하기",
              "item": `${baseUrl}/contact`
            }
          ]
        }
      },
      {
        "@type": "RealEstateAgent",
        "@id": `${baseUrl}/#agent`,
        "name": "D-VIEW 부동산 데이터 랩스",
        "description": "동탄 전역 아파트 비교 분석 및 AI 매도/전세 안전성 진단 전문 부동산 테크 플랫폼",
        "url": baseUrl,
        "telephone": "+82-2-000-0000",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "KR",
          "addressRegion": "경기도",
          "addressLocality": "화성시 동탄역로"
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-body font-sans pb-20">
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={safeJsonLd(jsonLd)}
      />
      <div className="sr-only" aria-hidden="true">
        <h1>D-VIEW 문의 및 온라인 피드백 접수</h1>
        <p>D-VIEW 부동산 분석 플랫폼에 대한 건의사항, 오류 제보, 광고 및 제휴 제안을 위한 고객 지원 채널입니다.</p>
      </div>

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
            <span className="font-extrabold text-primary text-[17px] sm:text-lg tracking-tight">문의하기</span>
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
