import type { Metadata, Viewport } from 'next';
import { PieChart, LayoutDashboard, Building2, Newspaper, MessageSquare, Search, Bell } from 'lucide-react';
import localFont from 'next/font/local';
import './globals.css';

const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  display: 'swap',
  weight: '45 920',
  variable: '--font-sans',
});
import OfflineBanner from '@/components/OfflineBanner';
import SWRProvider from '@/components/pwa/SWRProvider';
import SiteTracker from '@/components/SiteTracker';
import { PWAProvider } from '@/components/pwa/PWAProvider';
import CustomA2HSModal from '@/components/pwa/CustomA2HSModal';
import InAppBrowserBypass from '@/components/pwa/InAppBrowserBypass';
import { GoogleAnalytics } from '@next/third-parties/google';
import NextTopLoader from 'nextjs-toploader';
import Script from 'next/script';
import { ThemeProvider } from '@/components/ThemeProvider';
import { SettingsProvider } from '@/lib/contexts/SettingsContext';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import Footer from '@/components/Footer';
import MobileBottomAd from '@/components/pwa/MobileBottomAd';
import { headers } from 'next/headers';
import dynamic from 'next/dynamic';
import WelcomeModal from '@/components/ui/WelcomeModal';

const SettingsModal = dynamic(() => import('@/components/SettingsModal').catch(err => {
  console.warn('SettingsModal Chunk Load failure, initiating fallback reload', err);
  if (typeof window !== 'undefined') window.location.reload();
  return { default: () => null };
}));

export const metadata: Metadata = {
  referrer: 'no-referrer',
  metadataBase: new URL('https://dongtanview.com'),
  title: 'D-VIEW | 동탄 아파트 가치분석',
  description: 'D-VIEW — 동탄 179개 아파트의 실거래가·인프라·현장 검증 사진을 한눈에.',
  keywords: '동탄, 아파트, 실거래가, 동탄역, 롯데캐슬, 가치분석, 임장기, 부동산, 전세가율',
  alternates: {
    canonical: '/',
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get('x-nonce') || undefined;

  return (
    <html lang="ko" suppressHydrationWarning className={pretendard.variable}>
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
                <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `
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
                
                {/* 🔧 ResizeObserver loop error shield to prevent janks in charts */}
                <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `
                  if (typeof window !== 'undefined') {
                    window.addEventListener('error', function(e) {
                      if (e && (e.message === 'ResizeObserver loop limit exceeded' || e.message === 'ResizeObserver loop completed with undelivered notifications.' || (e.reason && e.reason.message && e.reason.message.includes('ResizeObserver')))) {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                      }
                    });
                  }
                `}} />
                <NextTopLoader color="#00d29d" showSpinner={false} />
                <PWAProvider>
                  <InAppBrowserBypass />
                  <OfflineBanner />
                  <SiteTracker />
                  <div className="flex-1 flex flex-col">
                    {children}
                  </div>
                  <Footer />
                  <CustomA2HSModal />
                  <WelcomeModal />
                </PWAProvider>
                <div id="modal-root" />
                <SettingsModal />
                
                {/* Google Analytics 4 (Only renders in production if NEXT_PUBLIC_GA_ID exists to prevent local dev/test data contamination) */}
                {process.env.NEXT_PUBLIC_GA_ID && process.env.NODE_ENV === 'production' && (
                  <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
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
