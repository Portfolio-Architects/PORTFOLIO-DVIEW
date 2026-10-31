import type { Metadata, Viewport } from 'next';
import { PieChart, LayoutDashboard, Building2, Newspaper, MessageSquare, Search, Bell } from 'lucide-react';
import localFont from 'next/font/local';
import './globals.css';

const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
  preload: false,
});
import OfflineBanner from '@/components/ui/OfflineBanner';
import SWRProvider from '@/components/pwa/SWRProvider';
import SiteTracker from '@/components/SiteTracker';
import { PWAProvider } from '@/components/pwa/PWAProvider';
import InAppBrowserBypass from '@/components/pwa/InAppBrowserBypass';
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';
import NextTopLoader from 'nextjs-toploader';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SettingsProvider, AuthProvider } from '@/contexts';
import Footer from '@/components/Footer';

import dynamic from 'next/dynamic';
import { safeReload } from '@/lib/utils/safeReload';
import ScrollToTop from '@/components/ui/ScrollToTop';
import ScrollOptimizer from '@/components/ui/ScrollOptimizer';
import { logger } from '@/lib/services/logger';

const CustomA2HSModal = dynamic(() => import('@/components/pwa/CustomA2HSModal'));
const WelcomeModal = dynamic(() => import('@/components/ui/WelcomeModal'));


const ROOT_OG_IMAGE_URL = `https://dongtanview.com/api/og?title=${encodeURIComponent('D-VIEW (디뷰 · 동뷰 · 동탄뷰)')}&subtitle=${encodeURIComponent('동탄 184개 아파트 시세·실거래가·집값 추이 그래프 및 입지 비교')}`;

export const metadata: Metadata = {
  referrer: 'strict-origin-when-cross-origin',
  metadataBase: new URL('https://dongtanview.com'),
  title: '동탄 아파트 시세·실거래가·집값 추이 그래프 (184개 단지 전세가율·학군) | D-VIEW',
  description: '국토교통부 공식 실거래가 매일 동기화 — 동탄 1·2신도시 184개 아파트 시세·집값 추이 그래프·전세가율·학군지 비교와 56개 지식산업센터 세제 혜택 데이터를 한눈에 확인하세요.',
  keywords: '동탄 아파트 시세, 동탄 집값 그래프, 동탄 집값 추이 그래프, 동탄 아파트 실거래가, 1동탄 2동탄 차이, 동탄1신도시 동탄2신도시 비교, 동탄역 롯데캐슬, 동탄 전세가율, 동탄 학군지, 동탄 호수공원 아파트, 스트레스 DSR, 동탄테크노밸리 지식산업센터, D-VIEW, 디뷰, 동뷰, 동탄뷰',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {
    'ai-search-crawling': 'allowed', 'naver-site-verification': 'e0240efa3f3f36785b2ca54faa765e9058f3707a',
  },
  openGraph: {
    title: '동탄 아파트 시세·실거래가·집값 추이 그래프 (184개 단지 전세가율·학군) | D-VIEW',
    description: '국토교통부 공식 실거래가 기반 동탄 1·2신도시 184개 아파트 시세·집값 추이 그래프·전세가율 비교, 실거주 PER 진단 및 권역별 심층 리포트.',
    url: 'https://dongtanview.com',
    siteName: 'D-VIEW',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: ROOT_OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: 'D-VIEW 동탄 아파트 시세·실거래가·집값 추이 그래프',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '동탄 아파트 시세·실거래가·집값 추이 그래프 (184개 단지 전세가율·학군) | D-VIEW',
    description: '국토교통부 공식 실거래가 기반 동탄 1·2신도시 184개 아파트 시세·집값 추이 그래프·전세가율 비교 및 권역별 심층 리포트.',
    images: [ROOT_OG_IMAGE_URL],
  },
  icons: {
    icon: [
      { url: '/icon-192x192.png?v=11', sizes: '192x192', type: 'image/png' },
      { url: '/favicon.ico?v=11', sizes: 'any' }
    ],
    apple: [
      { url: '/icon-192x192.png?v=11', sizes: '192x192', type: 'image/png' }
    ]
  },
  manifest: '/manifest.webmanifest?v=11',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'D-VIEW',
  },
  verification: {
    google: '4Fp0CzvSfTUPesN1rF0KFxF5YNSVLa_eSUfNKgKNEQs',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = undefined;

  return (
    <html lang="ko" suppressHydrationWarning className={pretendard.variable}>
      <head>
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://pagead2.googlesyndication.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://t1.kakaocdn.net" />
        <link rel="dns-prefetch" href="https://firestore.googleapis.com" />
        <link rel="dns-prefetch" href="https://t1.kakaocdn.net" />
        <meta name="naver-site-verification" content="e0240efa3f3f36785b2ca54faa765e9058f3707a" />
        <meta name="google-adsense-account" content={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-1103228112872356'} />
        {/* Google AdSense (Conditionally loaded with strategy="afterInteractive") */}
        {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
          <Script
            id="google-adsense"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-body text-primary relative transition-colors duration-200 selection:bg-blue-600/15 selection:text-blue-600 dark:selection:bg-blue-500/25 dark:selection:text-blue-400">
        <Script 
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js" 
          strategy="lazyOnload" 
          integrity="sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4"
          crossOrigin="anonymous"
          nonce={nonce}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SWRProvider>
            <SettingsProvider>
              <AuthProvider>
                {/* Register PWA Service Worker (Dev 모드에서는 기존 캐시 충돌 방지를 위해 해제) */}
                <Script src="/js/pwa-register.js" strategy="afterInteractive" nonce={nonce} />
                
                {/* ResizeObserver loop error shield to prevent janks in charts */}
                <Script src="/js/resize-observer-shield.js" strategy="afterInteractive" nonce={nonce} />
                <NextTopLoader color="#007AFF" showSpinner={false} height={2} />
                <PWAProvider>
                  <InAppBrowserBypass />
                  <OfflineBanner />
                  <SiteTracker />
                  {/* Global SVG Gradients for D-VIEW Logo */}
                  <svg xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
                    <defs>
                      <linearGradient id="dview-logo-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#007AFF" />
                        <stop offset="100%" stopColor="#2563eb" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="flex-1 flex flex-col">
                    {children}
                  </div>
                  <Footer />
                  <CustomA2HSModal />
                  <WelcomeModal />
                  <ScrollOptimizer />
                  <ScrollToTop />
                </PWAProvider>
                <div id="modal-root" />

                
                {/* Google Analytics 4 (Only renders in production if NEXT_PUBLIC_GA_ID exists to prevent local dev/test data contamination) */}
                {process.env.NEXT_PUBLIC_GA_ID && process.env.NODE_ENV === 'production' && (
                  <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} nonce={nonce} />
                )}
                

              </AuthProvider>
            </SettingsProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
