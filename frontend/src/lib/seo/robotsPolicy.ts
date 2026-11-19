/**
 * Single Source of Truth (SSOT) for DVIEW robots.txt crawler allowlist & bot-blocking policy.
 *
 * Revenue & Domestic/Global Search Allowlist ONLY:
 * - Google Search (`Googlebot`)
 * - Google AdSense (`Mediapartners-Google`)
 * - Naver (`Yeti`)
 * - Daum (`Daumoa`)
 * - Bing (`Bingbot`)
 *
 * Non-revenue foreign AI training scrapers, heavy SEO backlink bots, and unknown `*` crawlers
 * are explicitly disallowed to protect Vercel ISR Read Units & Fast Origin Transfer quotas.
 */

export const ADSENSE_CRAWLER_BOT = 'Mediapartners-Google' as const;

export const ALLOWED_REVENUE_SEARCH_BOTS = [
  'Googlebot',
  'Yeti',
  'Daumoa',
  'Bingbot',
] as const;

export const REQUIRED_ALLOWED_BOTS = [
  ADSENSE_CRAWLER_BOT,
  ...ALLOWED_REVENUE_SEARCH_BOTS,
] as const;

export const BLOCKED_AI_AND_SEO_SCRAPER_BOTS = [
  // Foreign AI training & LLM scrapers (zero AdSense revenue)
  'GPTBot',
  'ChatGPT-User',
  'OAI-SearchBot',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'Meta-ExternalAgent',
  'Meta-ExternalFetcher',
  'FacebookBot',
  'Amazonbot',
  'Diffbot',
  'cohere-ai',
  'YouBot',
  'ImagesiftBot',
  'Omgilibot',
  'Timpibot',
  'Scrapy',
  // Heavy foreign SEO/backlink & non-domestic scrapers
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'BLEXBot',
  'DataForSeoBot',
  'Barkrowler',
  'PetalBot',
  'SeznamBot',
  'YandexBot',
  'Baiduspider',
  'Sogou',
] as const;

export const ROBOTS_ALLOWED_PATHS: string[] = [
  '/',
  '/api/og',
  '/api/dashboard-init',
  '/api/explore/',
  '/api/technovalley/',
  '/api/macro/',
  '/api/local-notices',
  '/api/location-scores',
];

export const ROBOTS_DISALLOWED_INTERNAL_APIS: string[] = [
  '/api/cron/',
  '/api/push/',
  '/api/subscribe',
  '/api/unsubscribe',
  '/api/ads/',
  '/api/favorite',
  '/api/apartments/vote',
  '/api/indexing/',
];
