import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'D-VIEW | 동탄 아파트 가치분석',
    short_name: 'D-VIEW',
    description: 'D-VIEW — 동탄 179개 아파트의 실거래가·인프라·현장 검증 사진을 한눈에.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f2f4f6',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/icon-192x192.png?v=9',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable' as any,
      },
      {
        src: '/icon-512x512.png?v=9',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable' as any,
      },
    ],
    shortcuts: [
      {
        name: '실거래가 분석',
        short_name: '실거래',
        description: '동탄 아파트 실거래 시세 및 거래량 통계',
        url: '/realtime',
        icons: [{ src: '/icon-192x192.png?v=9', sizes: '192x192' }]
      },
      {
        name: '갭투자 탐색기',
        short_name: '갭투자',
        description: '동탄 소액 갭투자 최적 단지 분석',
        url: '/explore',
        icons: [{ src: '/icon-192x192.png?v=9', sizes: '192x192' }]
      },
      {
        name: '동탄 라운지',
        short_name: '라운지',
        description: '동탄 주민들의 부동산 소통 커뮤니티',
        url: '/lounge',
        icons: [{ src: '/icon-192x192.png?v=9', sizes: '192x192' }]
      }
    ]
  };
}
