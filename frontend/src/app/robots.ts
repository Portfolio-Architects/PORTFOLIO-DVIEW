import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  const allowedPaths = [
    '/',
    '/api/og',
    '/api/dashboard-init',
    '/api/explore/',
    '/api/technovalley/',
    '/api/macro/',
    '/api/local-notices',
    '/api/location-scores',
  ];

  const disallowedInternalApis = [
    '/api/cron/',
    '/api/push/',
    '/api/subscribe',
    '/api/unsubscribe',
    '/api/ads/',
    '/api/favorite',
    '/api/apartments/vote',
    '/api/indexing/',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: allowedPaths,
        disallow: disallowedInternalApis,
      },
      {
        // Prioritize Google AdSense crawler for immediate site verification and indexing
        userAgent: 'Mediapartners-Google',
        allow: '/',
      },
      {
        // Prioritize and welcome major search engine bots for domestic and global traffic
        userAgent: ['Googlebot', 'Yeti', 'Daumoa', 'Bingbot'],
        allow: allowedPaths,
        disallow: disallowedInternalApis,
      },
      {
        // Prioritize and welcome major AI/LLM Search scrapers for search citation indexing
        userAgent: ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'],
        allow: allowedPaths,
        disallow: disallowedInternalApis,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
