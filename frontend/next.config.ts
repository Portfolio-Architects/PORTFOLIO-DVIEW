import type { NextConfig } from "next";

import path from "path";

const nextConfig: NextConfig = {
  ...(process.env.VERCEL ? {} : {
    turbopack: {
      root: path.resolve(import.meta.dirname, '..'),
    }
  }),

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
};

export default nextConfig;
