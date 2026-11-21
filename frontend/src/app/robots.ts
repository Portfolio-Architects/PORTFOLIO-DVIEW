import { MetadataRoute } from 'next';
import {
  ADSENSE_AND_GOOGLE_REVIEW_BOTS,
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
        // Explicitly allow all Google AdSense, ad-quality, rendering & inspection crawlers
        userAgent: [...ADSENSE_AND_GOOGLE_REVIEW_BOTS],
        allow: '/',
      },
      {
        // Primary search engine bots (Google, Naver, Daum, Bing)
        userAgent: [...ALLOWED_REVENUE_SEARCH_BOTS],
        allow: [...ROBOTS_ALLOWED_PATHS],
        disallow: [...ROBOTS_DISALLOWED_INTERNAL_APIS],
      },
      {
        // Explicitly block foreign AI training & heavy SEO scraper bots
        userAgent: [...BLOCKED_AI_AND_SEO_SCRAPER_BOTS],
        disallow: '/',
      },
      {
        // Standard default policy: allow public pages for auxiliary verification crawlers while shielding internal APIs
        userAgent: '*',
        allow: '/',
        disallow: [...ROBOTS_DISALLOWED_INTERNAL_APIS],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
