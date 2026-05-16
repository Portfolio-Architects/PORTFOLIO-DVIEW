import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'D-VIEW | 동탄 아파트 가치분석',
    short_name: 'D-VIEW',
    description: 'D-VIEW — 동탄 179개 아파트의 실거래가·인프라·현장 검증 사진을 한눈에.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f2f4f6',
    theme_color: '#00d29d',
    icons: [
      {
        src: '/icon-192x192.png?v=8',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable' as any,
      },
      {
        src: '/icon-512x512.png?v=8',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable' as any,
      },
    ],
  };
}
