import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    ...(process.env.VERCEL ? {} : { root: path.resolve(import.meta.dirname, '..') }),
    resolveAlias: {
      '@/lib/firebaseAdmin': {
        browser: './src/lib/firebaseAdmin.client.ts',
      },
      './src/lib/firebaseAdmin': {
        browser: './src/lib/firebaseAdmin.client.ts',
      },
      './src/lib/firebaseAdmin.ts': {
        browser: './src/lib/firebaseAdmin.client.ts',
      },
    }
  },
  productionBrowserSourceMaps: false,
  compress: true,
  transpilePackages: ["lucide-react"],
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
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
        destination: '/#report',
        permanent: true,
      },
    ];
  },

  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    return [
      {
        source: '/_next/static/:path*',
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
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
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
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  outputFileTracingIncludes: {
    '/apartment/[aptName]': ['./public/tx-data/**/*.json'],
  },
  webpack: (config, { dev, isServer }) => {
    // 🔧 HMR (Fast Refresh) 무한 리로드 루프 방지를 위한 watchOptions 설정 추가
    if (dev) {
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
          '**/*.tsbuildinfo'
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
