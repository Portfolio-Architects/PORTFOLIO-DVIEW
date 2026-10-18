import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
      {
        // Prioritize Google AdSense crawler for immediate site verification and indexing
        userAgent: 'Mediapartners-Google',
        allow: '/',
      },
      {
        // Prioritize and welcome major search engine bots for domestic and global traffic
        userAgent: ['Googlebot', 'Yeti', 'Daumoa', 'Bingbot'],
        allow: '/',
        disallow: ['/api/'],
      },
      {
        // Prioritize and welcome major AI/LLM Search scrapers for search citation indexing
        userAgent: ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'],
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
