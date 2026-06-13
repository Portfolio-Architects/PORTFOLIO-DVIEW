import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { redis } from '@/lib/redis';

// Keys for Redis caching
const PUBLIC_ANALYTICS_CACHE_KEY = 'dtdls:analytics:public:lkg';
const ADMIN_ANALYTICS_CACHE_KEY = 'dtdls:analytics:admin:lkg';

export interface PublicAnalyticsData {
  mau: number;
  dau: number;
  totalViews: number;
  avgSessionDuration: string;
}

export interface AdminAnalyticsRow {
  date: string;
  activeUsers: number;
  pageViews: number;
}

export interface AdminAnalyticsData {
  daily: AdminAnalyticsRow[];
  monthly: {
    month: string;
    mau: number;
    avgDau: number;
  }[];
  totalViews?: number;
  avgSessionDuration?: string;
  isMock?: boolean;
}

// TTLs in seconds
const PUBLIC_CACHE_TTL = 3600; // 1 hour
const ADMIN_CACHE_TTL = 600; // 10 minutes

/**
 * Returns formatted GA credentials or null if missing.
 */
function getGACredentials() {
  const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GA_PROPERTY_ID } = process.env;
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GA_PROPERTY_ID) {
    return null;
  }
  const formattedKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, '');
  return { email: GOOGLE_SERVICE_ACCOUNT_EMAIL, key: formattedKey, propertyId: GA_PROPERTY_ID };
}

/**
 * Fetch raw public analytics from Google Analytics API
 */
async function fetchPublicAnalyticsFromGA(): Promise<PublicAnalyticsData> {
  const creds = getGACredentials();
  if (!creds) {
    return { mau: 0, dau: 0, totalViews: 0, avgSessionDuration: '0m 0s' };
  }

  const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
      client_email: creds.email,
      private_key: creds.key,
    },
  });

  const [response] = await analyticsDataClient.runReport({
    property: `properties/${creds.propertyId}`,
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'averageSessionDuration' }]
  });

  const [todayResponse] = await analyticsDataClient.runReport({
    property: `properties/${creds.propertyId}`,
    dateRanges: [{ startDate: 'today', endDate: 'today' }],
    metrics: [{ name: 'activeUsers' }]
  });

  const mau = parseInt(response?.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
  const totalViews = parseInt(response?.rows?.[0]?.metricValues?.[1]?.value || '0', 10);
  const avgDurationSeconds = parseInt(response?.rows?.[0]?.metricValues?.[2]?.value || '0', 10);
  const dau = parseInt(todayResponse?.rows?.[0]?.metricValues?.[0]?.value || '0', 10);

  const minutes = Math.floor(avgDurationSeconds / 60);
  const seconds = avgDurationSeconds % 60;
  const avgSessionDuration = `${minutes}m ${seconds}s`;

  return { mau, dau, totalViews, avgSessionDuration };
}

/**
 * Get Public Analytics using LKG (Last Known Good) Strategy
 */
export async function getPublicAnalyticsLKG(): Promise<PublicAnalyticsData> {
  try {
    if (redis) {
      const cached = await redis.get<{ data: PublicAnalyticsData, timestamp: number }>(PUBLIC_ANALYTICS_CACHE_KEY);
      if (cached) {
        const isStale = (Date.now() - cached.timestamp) > (PUBLIC_CACHE_TTL * 1000);
        if (isStale) {
          // Stale-while-revalidate: Fetch in background
          fetchPublicAnalyticsFromGA().then(freshData => {
            redis?.set(PUBLIC_ANALYTICS_CACHE_KEY, { data: freshData, timestamp: Date.now() });
          }).catch(console.error);
        }
        return cached.data;
      }
    }

    // No cache or redis unavailable -> Fetch synchronously
    const freshData = await fetchPublicAnalyticsFromGA();
    if (redis) {
      // Save synchronously so next request gets it
      await redis.set(PUBLIC_ANALYTICS_CACHE_KEY, { data: freshData, timestamp: Date.now() });
    }
    return freshData;
  } catch (error) {
    console.error('[Public GA4 API LKG] Error:', error);
    return { mau: 0, dau: 0, totalViews: 0, avgSessionDuration: '0m 0s' };
  }
}

function generateMockAdminAnalytics(): AdminAnalyticsData {
  const daily: AdminAnalyticsRow[] = [];
  const monthly: { month: string; mau: number; avgDau: number }[] = [];

  // Generate last 30 days daily data
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const seed = getSeed(dateStr);
    const activeUsers = 30 + (seed % 50);
    const pageViews = activeUsers * 3 + (seed % 100);
    daily.push({ date: dateStr, activeUsers, pageViews });
  }

  // Generate last 6 months monthly data
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const seed = getSeed(monthStr);
    const mau = 500 + (seed % 700);
    const avgDau = Math.round(40 + (seed % 50));
    monthly.push({ month: monthStr, mau, avgDau });
  }

  return { daily, monthly, totalViews: 12450, avgSessionDuration: '2m 15s', isMock: true };
}

function getSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/**
 * Fetch raw admin analytics from Google Analytics API
 */
async function fetchAdminAnalyticsFromGA(): Promise<AdminAnalyticsData> {
  const creds = getGACredentials();
  if (!creds) {
    return generateMockAdminAnalytics();
  }

  const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
      client_email: creds.email,
      private_key: creds.key,
    },
  });

  try {
    // Run reports in parallel
    const [dailyReport, monthlyMauReport, monthlyDauReport, publicReport] = await Promise.all([
      // 1. Daily DAU & Pageviews (Last 30 days)
      analyticsDataClient.runReport({
        property: `properties/${creds.propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
      }),
      // 2. Monthly MAU (Last 180 days)
      analyticsDataClient.runReport({
        property: `properties/${creds.propertyId}`,
        dateRanges: [{ startDate: '180daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'yearMonth' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ dimension: { dimensionName: 'yearMonth' }, desc: false }]
      }),
      // 3. Daily Active Users for 180 days to compute Average DAU per month
      analyticsDataClient.runReport({
        property: `properties/${creds.propertyId}`,
        dateRanges: [{ startDate: '180daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
      }),
      // 4. Public Metrics (averageSessionDuration, totalViews)
      analyticsDataClient.runReport({
        property: `properties/${creds.propertyId}`,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [{ name: 'averageSessionDuration' }, { name: 'screenPageViews' }]
      })
    ]);

    const dailyRows = dailyReport[0]?.rows || [];
    const daily: AdminAnalyticsRow[] = dailyRows.map((row: any) => {
      const rawDate = row.dimensionValues?.[0]?.value || '';
      const formattedDate = rawDate.length === 8 
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}` 
        : rawDate;
      return {
        date: formattedDate,
        activeUsers: parseInt(row.metricValues?.[0]?.value || '0', 10),
        pageViews: parseInt(row.metricValues?.[1]?.value || '0', 10),
      };
    });

    // Process Average DAU per month
    const monthlyDauMap: Record<string, { sum: number; count: number }> = {};
    const dauRows = monthlyDauReport[0]?.rows || [];
    dauRows.forEach((row: any) => {
      const rawDate = row.dimensionValues?.[0]?.value || '';
      if (rawDate.length === 8) {
        const month = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}`;
        const activeUsers = parseInt(row.metricValues?.[0]?.value || '0', 10);
        if (!monthlyDauMap[month]) {
          monthlyDauMap[month] = { sum: 0, count: 0 };
        }
        monthlyDauMap[month].sum += activeUsers;
        monthlyDauMap[month].count += 1;
      }
    });

    // Build Monthly Trend
    const mauRows = monthlyMauReport[0]?.rows || [];
    const monthly = mauRows.map((row: any) => {
      const rawMonth = row.dimensionValues?.[0]?.value || '';
      const monthFormatted = rawMonth.length === 6 
        ? `${rawMonth.slice(0, 4)}-${rawMonth.slice(4, 6)}` 
        : rawMonth;
      
      const mau = parseInt(row.metricValues?.[0]?.value || '0', 10);
      const stats = monthlyDauMap[monthFormatted] || { sum: 0, count: 1 };
      const avgDau = Math.round(stats.sum / (stats.count || 1));

      return {
        month: monthFormatted,
        mau,
        avgDau
      };
    });

    const avgDurationSeconds = parseInt(publicReport[0]?.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
    const totalViews = parseInt(publicReport[0]?.rows?.[0]?.metricValues?.[1]?.value || '0', 10);
    const minutes = Math.floor(avgDurationSeconds / 60);
    const seconds = avgDurationSeconds % 60;
    const avgSessionDuration = `${minutes}m ${seconds}s`;

    return { daily, monthly, totalViews, avgSessionDuration, isMock: false };
  } catch (err) {
    console.error('Failed to query GA4 reports, falling back to mock data:', err);
    return generateMockAdminAnalytics();
  }
}

/**
 * Get Admin Analytics using LKG (Last Known Good) Strategy
 */
export async function getAdminAnalyticsLKG(): Promise<AdminAnalyticsData> {
  try {
    if (redis) {
      const cached = await redis.get<{ data: AdminAnalyticsData, timestamp: number }>(ADMIN_ANALYTICS_CACHE_KEY);
      if (cached) {
        const isStale = (Date.now() - cached.timestamp) > (ADMIN_CACHE_TTL * 1000);
        if (isStale) {
          // Stale-while-revalidate
          fetchAdminAnalyticsFromGA().then(freshData => {
            redis?.set(ADMIN_ANALYTICS_CACHE_KEY, { data: freshData, timestamp: Date.now() });
          }).catch(console.error);
        }
        return cached.data;
      }
    }

    const freshData = await fetchAdminAnalyticsFromGA();
    if (redis) {
      await redis.set(ADMIN_ANALYTICS_CACHE_KEY, { data: freshData, timestamp: Date.now() });
    }
    return freshData;
  } catch (error) {
    console.error('[Admin GA4 API LKG] Error:', error);
    return generateMockAdminAnalytics();
  }
}
