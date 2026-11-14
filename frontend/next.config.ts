import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [
    'firebase-admin',
    'firebase',
    '@firebase/app',
    '@firebase/firestore',
    '@grpc/grpc-js',
    '@grpc/proto-loader',
    'protobufjs',
    '@google-cloud/storage',
    'google-auth-library',
    'gaxios',
    'gcp-metadata',
    'google-gax',
  ],
  turbopack: {
    resolveAlias: {
      '@/lib/firebaseAdmin': {
        browser: './src/lib/firebaseAdmin.client.ts',
      },
    },
  },
  productionBrowserSourceMaps: false,
  compress: true,
  transpilePackages: ["lucide-react"],
  devIndicators: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "swr", "recharts"],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    qualities: [60, 75],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },

  async redirects() {
    return [
      {
        source: '/report',
        destination: '/guide',
        permanent: true,
      },
      {
        source: '/map',
        destination: '/explore',
        permanent: false,
      },
      {
        source: '/compare',
        destination: '/guide',
        permanent: false,
      },
      {
        source: '/calculator',
        destination: '/guide/stress-dsr-valuation-guide',
        permanent: false,
      },
      {
        source: '/complex-ranking',
        destination: '/explore',
        permanent: false,
      },
      {
        source: '/subscription',
        destination: '/',
        permanent: false,
      },
      {
        source: '/board',
        destination: '/lounge',
        permanent: true,
      },
      {
        source: '/board/:path*',
        destination: '/lounge/:path*',
        permanent: true,
      },
      {
        source: '/techno',
        destination: '/',
        permanent: false,
      },
      {
        source: '/mbti',
        destination: '/',
        permanent: false,
      },
      {
        source: '/mbti/:path*',
        destination: '/',
        permanent: false,
      },
      {
        source: '/overview',
        has: [
          {
            type: 'query',
            key: 'tab',
            value: 'office',
          },
        ],
        destination: '/',
        permanent: false,
      },
      {
        source: '/overview',
        destination: '/',
        permanent: true,
      },
    ];
  },

  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    return [
      {
        source: '/:path*\\.(png|jpg|jpeg|svg|gif|webp|ico|woff2|woff)',
        headers: [
          {
            key: 'Cache-Control',
            value: isDev
              ? 'no-store, no-cache, must-revalidate, max-age=0'
              : 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=604800, must-revalidate',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
      {
        source: '/manifest.webmanifest',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
      {
        source: '/data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: isDev 
              ? 'no-store, no-cache, must-revalidate, max-age=0'
              : 'public, max-age=900, stale-while-revalidate=3600',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/tx-data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: isDev 
              ? 'no-store, no-cache, must-revalidate, max-age=0'
              : 'public, max-age=900, stale-while-revalidate=3600',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
          ...(isDev
            ? []
            : [
                {
                  key: 'Content-Security-Policy',
                  value: [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https: http: https://www.google.com https://www.gstatic.com https://www.googletagmanager.com https://*.googletagmanager.com https://apis.google.com https://www.recaptcha.net https://cdn.jsdelivr.net https://t1.kakaocdn.net https://developers.kakao.com https://pagead2.googlesyndication.com",
                    "worker-src 'self' blob:",
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
                    "img-src 'self' blob: data: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://maps.gstatic.com https://maps.googleapis.com https://www.google.com https://*.google.com https://*.google.co.kr https://www.googletagmanager.com https://*.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://t1.kakaocdn.net https://pagead2.googlesyndication.com https://*.doubleclick.net https://*.googlesyndication.com https://ad.doubleclick.net https://*.adtrafficquality.google",
                    "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
                    "connect-src 'self' https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com wss://*.firestore.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://firebasestorage.googleapis.com https://maps.googleapis.com https://vitals.vercel-insights.com https://cdn.jsdelivr.net https://www.google.com https://*.google.com https://*.google.co.kr https://content-firebaseappcheck.googleapis.com https://apis.google.com https://www.recaptcha.net https://lh3.googleusercontent.com https://www.googletagmanager.com https://*.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://t1.kakaocdn.net https://*.kakao.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net https://www.gstatic.com https://*.gstatic.com https://*.adtrafficquality.google https://*.firebaseapp.com",
                    "frame-src 'self' https://www.google.com https://www.youtube.com https://portfolio-dtdls.firebaseapp.com https://apis.google.com https://www.recaptcha.net https://*.kakao.com https://googleads.g.doubleclick.net https://*.googlesyndication.com https://*.doubleclick.net https://*.adtrafficquality.google",
                    "object-src 'none'",
                    "base-uri 'self'",
                    "form-action 'self' https://sharer.kakao.com https://*.kakao.com",
                    "frame-ancestors 'self' https://adsense.google.com https://*.google.com https://*.googlesyndication.com https://googleads.g.doubleclick.net https://*.googleusercontent.com",
                    "upgrade-insecure-requests",
                  ].join('; ') + ';',
                },
              ]),
        ],
      },
    ];
  },

  outputFileTracingIncludes: {
    '/': [
      './public/data/market-stats.json',
      './public/data/tx-summary.json',
      './public/data/macro-trend.json',
      './public/data/recent-transactions.json',
      './public/data/apartments-by-dong.json',
      './public/data/type-map.json',
      './public/data/location-scores.json',
    ],
    '/overview': [
      './public/data/market-stats.json',
      './public/data/tx-summary.json',
      './public/data/macro-trend.json',
      './public/data/recent-transactions.json',
      './public/data/apartments-by-dong.json',
      './public/data/type-map.json',
      './public/data/location-scores.json',
    ],
    '/explore': [
      './public/data/market-stats.json',
      './public/data/tx-summary.json',
      './public/data/macro-trend.json',
      './public/data/recent-transactions.json',
      './public/data/apartments-by-dong.json',
      './public/data/type-map.json',
      './public/data/location-scores.json',
    ],
    '/zone/[id]': [
      './public/data/market-stats.json',
      './public/data/tx-summary.json',
      './public/data/macro-trend.json',
      './public/data/recent-transactions.json',
      './public/data/apartments-by-dong.json',
      './public/data/type-map.json',
      './public/data/location-scores.json',
    ],
    '/technovalley': [
      './public/data/jisan-status-list.json',
    ],
    '/sitemap.xml': [
      './public/data/tx-summary.json',
      './public/data/jisan-status-list.json',
    ],
    '/api/dashboard-init': [
      './public/data/market-stats.json',
      './public/data/tx-summary.json',
      './public/data/macro-trend.json',
      './public/data/recent-transactions.json',
      './public/data/apartments-by-dong.json',
      './public/data/type-map.json',
      './public/data/location-scores.json',
    ],
    '/api/transactions/live-delta': [
      './public/data/market-stats.json',
      './public/data/recent-transactions.json',
      './public/data/tx-summary.json',
      './public/data/apartments-by-dong.json',
    ],
    '/api/transaction-summary': [
      './public/data/tx-summary.json',
    ],
    '/apartment/[aptName]': [
      './public/tx-data/!(*-recent|_index).json',
      './public/data/tx-summary.json',
      './public/data/location-scores.json',
      './public/data/apartments-by-dong.json',
    ],
  },
  outputFileTracingExcludes: {
    '/apartment/[aptName]': [
      './public/tx-data/*-recent.json',
      './public/tx-data/_index.json',
    ],
    '*': [
      './node_modules/@google-cloud/storage/**',
      './node_modules/@firebase/database-compat/**',
      './public/data/transactions-1y.json',
      './public/data/transactions-3y.json',
      './public/data/transactions-all.json',
      './scratch/**',
    ],
  },
  webpack: (config, { dev, isServer }) => {
    // 🔧 HMR (Fast Refresh) 무한 리로드 루프 방지를 위한 watchOptions 설정 추가
    if (dev) {
      config.cache = { type: 'memory' };
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/public/tx-data/**',
          '**/public/data/**',
          '**/src/lib/build-version.ts',
          '**/public/sw.js',
          '**/*.log',
          '**/*.tsbuildinfo',
          '**/scratch/**'
        ],
      };
    }
    // Block redundant plugins that degrade compilation performance
    if (!dev) {
      config.plugins = config.plugins.filter((plugin: any) => {
        const name = plugin?.constructor?.name;
        return name !== 'BundleAnalyzerPlugin' && name !== 'CircularDependencyPlugin';
      });
    }

    // 서버 사이드 모듈이 클라이언트 측 번들에 포함되려 할 때 빈 모듈로 대체하여 빌드 에러 방지
    if (!isServer) {
      const serverFile = path.resolve(import.meta.dirname, 'src/lib/firebaseAdmin.ts');
      const serverFileNoExt = path.resolve(import.meta.dirname, 'src/lib/firebaseAdmin');
      const clientFile = path.resolve(import.meta.dirname, 'src/lib/firebaseAdmin.client.ts');

      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib/firebaseAdmin': clientFile,
        [serverFile]: clientFile,
        [serverFileNoExt]: clientFile,
      };

      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        dns: false,
        fs: false,
        child_process: false,
        crypto: false,
        url: false,
        http2: false,
        http: false,
        https: false,
        zlib: false,
        stream: false,
        path: false,
        os: false,
        util: false,
        assert: false,
        // node: scheme fallbacks for Webpack 5 browser compilation
        'node:buffer': false,
        'node:crypto': false,
        'node:events': false,
        'node:fs': false,
        'node:https': false,
        'node:http': false,
        'node:net': false,
        'node:path': false,
        'node:process': false,
        'node:stream': false,
        'node:stream/web': false,
        'node:url': false,
        'node:util': false,
        'node:zlib': false,
      };
    }

    return config;
  },
};

export default nextConfig;
