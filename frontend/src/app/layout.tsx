import type { Metadata, Viewport } from 'next';
import { PieChart, LayoutDashboard, Building2, Newspaper, MessageSquare, Search, Bell } from 'lucide-react';
import './globals.css';
import OfflineBanner from '@/components/OfflineBanner';
import SiteTracker from '@/components/SiteTracker';
import { PWAProvider } from '@/components/pwa/PWAProvider';
import CustomA2HSModal from '@/components/pwa/CustomA2HSModal';
import { GoogleAnalytics } from '@next/third-parties/google';
import NextTopLoader from 'nextjs-toploader';
import Script from 'next/script';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SettingsProvider } from '@/lib/contexts/SettingsContext';
import Footer from '@/components/Footer';
import dynamic from 'next/dynamic';

const SettingsModal = dynamic(() => import('@/components/SettingsModal'));

export const metadata: Metadata = {
  metadataBase: new URL('https://dongtanview.com'),
  title: 'D-VIEW | 동탄 아파트 가치분석',
  description: 'D-VIEW — 동탄 179개 아파트의 실거래가·인프라·현장 검증 사진을 한눈에.',
  keywords: '동탄, 아파트, 실거래가, 동탄역, 롯데캐슬, 가치분석, 임장기, 부동산, 전세가율',
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-body text-primary relative transition-colors duration-200 overflow-x-hidden">
        <Script src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js" strategy="lazyOnload" />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <SettingsProvider>
            {/* 🔧 Register PWA Service Worker (Dev 모드에서는 기존 캐시 충돌 방지를 위해 해제) */}
            <script dangerouslySetInnerHTML={{ __html: `
              if ('serviceWorker' in navigator) {
                if ('${process.env.NODE_ENV}' === 'development') {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for(let registration of registrations) {
                      registration.unregister();
                    }
                  });
                } else {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').catch(function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    });
                  });
                }
              }
            `}} />
            <NextTopLoader color="#00d29d" showSpinner={false} />
            <PWAProvider>
              <OfflineBanner />
              <SiteTracker />
              <div className="flex-1 flex flex-col">
                {children}
              </div>
              <Footer />
              <CustomA2HSModal />
            </PWAProvider>
            <div id="modal-root" />
            <SettingsModal />
            
            {/* Google Analytics 4 (Only renders if NEXT_PUBLIC_GA_ID exists) */}
            {process.env.NEXT_PUBLIC_GA_ID && (
              <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
            )}
            
            {/* Google AdSense Script (Only renders if NEXT_PUBLIC_ADSENSE_CLIENT_ID exists) */}
            {process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID && (
              <Script
                async
                src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}`}
                crossOrigin="anonymous"
                strategy="afterInteractive"
              />
            )}
          </SettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
