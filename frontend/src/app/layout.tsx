import type { Metadata, Viewport } from 'next';
import { PieChart, LayoutDashboard, Building2, Newspaper, MessageSquare, Search, Bell } from 'lucide-react';
import localFont from 'next/font/local';
import { Inter } from 'next/font/google';
import './globals.css';

const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-pretendard',
  preload: false,
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: false,
});
import OfflineBanner from '@/components/OfflineBanner';
import SWRProvider from '@/components/pwa/SWRProvider';
import SiteTracker from '@/components/SiteTracker';
import { PWAProvider } from '@/components/pwa/PWAProvider';
import CustomA2HSModal from '@/components/pwa/CustomA2HSModal';
import InAppBrowserBypass from '@/components/pwa/InAppBrowserBypass';
import { GoogleAnalytics } from '@next/third-parties/google';
import Script from 'next/script';
import NextTopLoader from 'nextjs-toploader';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SettingsProvider } from '@/lib/contexts/SettingsContext';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import Footer from '@/components/Footer';
import MobileBottomAd from '@/components/pwa/MobileBottomAd';
import dynamic from 'next/dynamic';
import WelcomeModal from '@/components/ui/WelcomeModal';
import { safeReload } from '@/lib/utils/safeReload';
import ScrollToTop from '@/components/ui/ScrollToTop';
import { logger } from '@/lib/services/logger';


export const metadata: Metadata = {
  referrer: 'no-referrer',
  metadataBase: new URL('https://dongtanview.com'),
  title: 'D-VIEW | 동탄 아파트 가치분석',
  description: 'D-VIEW — 동탄 179개 아파트의 실거래가·인프라·현장 검증 사진을 한눈에.',
  keywords: '동탄, 아파트, 실거래가, 동탄역, 롯데캐슬, 가치분석, 임장기, 부동산, 전세가율',
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
    'ai-search-crawling': 'allowed',
  },
  openGraph: {
    title: 'D-VIEW | 동탄 아파트 가치분석',
    description: 'D-VIEW — 동탄 179개 아파트의 실거래가·인프라·현장 검증 사진을 한눈에.',
    url: 'https://dongtanview.com',
    siteName: 'D-VIEW',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: 'https://dongtanview.com/api/og?title=D-VIEW&subtitle=동탄 아파트 가치분석 및 임장 리포트',
        width: 1200,
        height: 630,
        alt: 'D-VIEW 대표 이미지',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'D-VIEW | 동탄 아파트 가치분석',
    description: 'D-VIEW — 동탄 179개 아파트의 실거래가·인프라·현장 검증 사진을 한눈에.',
    images: ['https://dongtanview.com/api/og?title=D-VIEW&subtitle=동탄 아파트 가치분석 및 임장 리포트'],
  },
  icons: {
    icon: '/icon-192x192.png',
    apple: '/icon-192x192.png'
  },
  manifest: '/manifest.webmanifest?v=10',
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
    { media: '(prefers-color-scheme: dark)', color: '#121212' },
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
    <html lang="ko" suppressHydrationWarning className={`${pretendard.variable} ${inter.variable}`}>
      <head>
        <meta name="referrer" content="no-referrer" />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-body text-primary relative transition-colors duration-200 overflow-x-hidden">
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
                {/* 🔧 Register PWA Service Worker (Dev 모드에서는 기존 캐시 충돌 방지를 위해 해제) */}
                <Script src="/js/pwa-register.js" strategy="afterInteractive" nonce={nonce} />
                
                {/* 🔧 ResizeObserver loop error shield to prevent janks in charts */}
                <Script src="/js/resize-observer-shield.js" strategy="afterInteractive" nonce={nonce} />
                <NextTopLoader color="#00d29d" showSpinner={false} />
                <PWAProvider>
                  <InAppBrowserBypass />
                  <OfflineBanner />
                  <SiteTracker />
                  {/* Global SVG Gradients for D-VIEW Logo */}
                  <svg xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }} aria-hidden="true">
                    <defs>
                      <linearGradient id="dview-logo-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#00d29d" />
                        <stop offset="100%" stopColor="#008262" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="flex-1 flex flex-col">
                    {children}
                  </div>
                  <Footer />
                  <CustomA2HSModal />
                  <WelcomeModal />
                  <ScrollToTop />
                </PWAProvider>
                <div id="modal-root" />

                
                {/* Google Analytics 4 (Only renders in production if NEXT_PUBLIC_GA_ID exists to prevent local dev/test data contamination) */}
                {process.env.NEXT_PUBLIC_GA_ID && process.env.NODE_ENV === 'production' && (
                  <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} nonce={nonce} />
                )}
                
                {/* Google AdSense Script (Only renders if NEXT_PUBLIC_ADSENSE_CLIENT_ID exists) */}
                 {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
                  <script
                    async
                    src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
                    crossOrigin="anonymous"
                    nonce={nonce}
                  />
                )}

                {/* Mobile Bottom Sticky Anchor Ad (Renders in production if AdSense client ID exists, or in dev mode for preview) */}
                {(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || process.env.NODE_ENV === 'development') && (
                  <MobileBottomAd adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ANCHOR || "test-anchor-slot"} />
                )}
              </AuthProvider>
            </SettingsProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
