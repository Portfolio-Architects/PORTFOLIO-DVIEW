import { MetadataRoute } from 'next';
import {
  ADSENSE_CRAWLER_BOT,
  ALLOWED_REVENUE_SEARCH_BOTS,
  BLOCKED_AI_AND_SEO_SCRAPER_BOTS,
  ROBOTS_ALLOWED_PATHS,
  ROBOTS_DISALLOWED_INTERNAL_APIS,
} from '@/lib/seo/robotsPolicy';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://dongtanview.com';

  return {
    rules: [
      {
        // Prioritize Google AdSense crawler for immediate site verification and ad targeting
        userAgent: ADSENSE_CRAWLER_BOT,
        allow: '/',
      },
      {
        // Strict allowlist: ONLY revenue-driving search engine bots (Google, Naver, Daum, Bing)
        userAgent: [...ALLOWED_REVENUE_SEARCH_BOTS],
        allow: [...ROBOTS_ALLOWED_PATHS],
        disallow: [...ROBOTS_DISALLOWED_INTERNAL_APIS],
      },
      {
        // Explicitly block foreign AI training & SEO scraper bots to protect ISR Read Units & Origin Transfer
        userAgent: [...BLOCKED_AI_AND_SEO_SCRAPER_BOTS],
        disallow: '/',
      },
      {
        // Default-deny policy for all other unspecified crawlers/scrapers (internal APIs remain explicitly listed)
        userAgent: '*',
        disallow: ['/', ...ROBOTS_DISALLOWED_INTERNAL_APIS],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
