import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  turbopack: process.env.VERCEL ? {} : {
    root: path.resolve(import.meta.dirname, '..'),
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
    return config;
  },
};

export default nextConfig;
