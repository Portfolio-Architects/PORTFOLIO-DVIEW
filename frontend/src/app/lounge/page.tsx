import { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import LoungeHeader from '@/components/LoungeHeader';
import MobileDock from '@/components/pwa/MobileDock';
import LoungeBoardView from '@/components/board/LoungeBoardView';
import { AdSlot } from '@/components/ads/AdSlot';

export const revalidate = 86400; // 1 hour ISR

export const metadata: Metadata = {
  title: '동탄 입주민 익명 라운지 | D-VIEW',
  description:
    '동탄 183개 아파트 단지 입주민 익명 커뮤니티 라운지. 실제 단지 타이틀과 GPS 300m 공인 인증으로 소통하는 자유게시판.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: 'https://dongtanview.com/lounge',
  },
  openGraph: {
    title: '동탄 입주민 익명 라운지 | D-VIEW',
    description:
      '동탄 183개 아파트 단지 입주민 익명 커뮤니티 라운지. 실제 단지 타이틀과 GPS 300m 공인 인증으로 소통하는 자유게시판.',
    url: 'https://dongtanview.com/lounge',
    siteName: 'D-VIEW',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '동탄 입주민 익명 라운지 | D-VIEW',
    description:
      '동탄 183개 아파트 단지 입주민 익명 커뮤니티 라운지. 실제 단지 타이틀과 GPS 300m 공인 인증으로 소통하는 자유게시판.',
  },
};

export default function LoungePage() {
  const isApprovalMode = process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true';

  return (
    <div className="flex flex-col min-h-[100dvh] bg-surface dark:bg-slate-950 text-primary">
      {/* 5 Canonical Header Tabs + Right Resident Lounge Active State */}
      <LoungeHeader activeTab="lounge" />

      {/* Hero / Breadcrumb Bar */}
      <section className="w-full bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-1.5 text-xs text-tertiary">
          <Link
            href="/"
            className="hover:text-primary transition-colors font-medium"
          >
            홈
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-bold text-primary">입주민 라운지</span>
        </div>
      </section>

      {/* Main Board View Feed */}
      <main id="main-content" className="flex-1 w-full pb-24 md:pb-0">
        <LoungeBoardView />

        {/* Pre-reserved Zero-CLS AdSlot Container */}
        {!isApprovalMode && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-12 empty:hidden">
            <div
              data-testid="lounge-footer-ad-slot-container"
              className="w-full rounded-2xl overflow-hidden bg-elevated dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 min-h-[140px] empty:hidden"
            >
              <AdSlot
                refreshSlotId="lounge_footer_infeed"
                format="in-feed"
                minHeightClass="min-h-[140px]"
              />
            </div>
          </div>
        )}
      </main>

      <MobileDock activeTab="lounge" />
    </div>
  );
}
