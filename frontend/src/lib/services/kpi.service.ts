/**
 * @module kpi.service
 * @description KPI simulation logic with cyclic real estate price data.
 * Architecture Layer: Service (business logic, no I/O)
 */

import type { KPIData } from '@/lib/types/dashboard.types';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

// ── Zod Schemas ─────────────────────────────────────

export const KPIDataSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  badgeText: z.string().optional(),
  badgeStyle: z.string().optional(),
  mainValue: z.any(), // Can be ReactNode
  subValue: z.any(),  // Can be ReactNode
  description: z.any(), // Can be ReactNode
  icon: z.any(),      // Can be string or ElementType
  gradientBackground: z.string().default(''),
  borderColor: z.string().default(''),
  titleColor: z.string().default(''),
});

export const FakePriceDataSchema = z.object({
  subtitle: z.string(),
  price: z.string(),
  up: z.string(),
  prev: z.string(),
});

/** Simulated KPI price data for cycling display */
const FAKE_PRICE_DATA = [
  { subtitle: '동탄역 예미지시그널 84㎡', price: '13.2', up: '1.5억', prev: '11.7억 (새해 첫 거래)' },
  { subtitle: '동탄호수공원 아이파크 84㎡', price: '11.8', up: '0.8억', prev: '11.0억 (작년 최고가)' },
  { subtitle: '동탄역 롯데캐슬 84㎡', price: '16.5', up: '2.1억', prev: '14.4억 (24년 10월)' },
] as const;

/**
 * Creates the initial set of KPI cards.
 * @returns Array of 3 default KPI data objects
 */
export function createInitialKPIs(): KPIData[] {
  const rawKPIs = [
    {
      id: 'kpi-1',
      title: '우와! 이번주 최고가',
      subtitle: '동탄역 롯데캐슬 84㎡',
      badgeText: 'HOT',
      badgeStyle: 'bg-toss-red text-surface',
      mainValue: '16.5억',
      subValue: '↑ 2.1억',
      description: '이전 최고가: 14.4억 (24년 10월)',
      icon: 'TrendingUp',
      gradientBackground: 'from-[#ffffff] to-[#fff5f5]',
      borderColor: 'border-[#ffebec]',
      titleColor: 'text-toss-red',
    },
    {
      id: 'kpi-2',
      title: '신혼부부 첫 집 추천',
      subtitle: '가성비 20평대 · 전세 3억대',
      mainValue: '1. 반도유보라 아이비파크 2.0\n2. 금강펜테리움 센트럴파크',
      subValue: '',
      description: '자세히 보기 →',
      icon: 'Users',
      gradientBackground: 'from-[#ffffff] to-[#f4f8ff]',
      borderColor: 'border-[#e0fbf4]',
      titleColor: 'text-toss-blue',
    },
    {
      id: 'kpi-3',
      title: '요즘 동탄 매수 열기',
      subtitle: '주간 아파트 거래량',
      badgeText: '매수자 우위',
      badgeStyle: 'bg-[#e8f5e9] text-toss-green',
      mainValue: '142건',
      subValue: '↑ 12%',
      description: '',
      icon: 'RefreshCw',
      gradientBackground: '',
      borderColor: '',
      titleColor: 'text-toss-green',
    },
  ];

  return rawKPIs.map((raw, index) => {
    const parsed = KPIDataSchema.safeParse(raw);
    if (parsed.success) {
      return parsed.data as KPIData;
    } else {
      logger.error('kpi.service.createInitialKPIs', `Failed to validate raw KPI at index ${index}`, { id: raw.id }, parsed.error);
      return {
        id: raw.id || `kpi-fallback-${index}`,
        title: raw.title || '알림',
        subtitle: raw.subtitle || '',
        mainValue: raw.mainValue || '',
        subValue: raw.subValue || '',
        description: raw.description || '',
        icon: raw.icon || 'Info',
        gradientBackground: raw.gradientBackground || '',
        borderColor: raw.borderColor || '',
        titleColor: raw.titleColor || '',
      };
    }
  });
}

/**
 * Starts a KPI price simulation that cycles through fake data.
 * @param kpis - Mutable KPI array (first element is updated)
 * @param onUpdate - Callback invoked after each cycle
 * @returns Cleanup function to stop the simulation
 */
export function startKPISimulation(
  kpis: KPIData[],
  onUpdate: () => void
): () => void {
  let index = 0;

  const intervalId = setInterval(() => {
    index = (index + 1) % FAKE_PRICE_DATA.length;
    const rawData = FAKE_PRICE_DATA[index];
    const parsedData = FakePriceDataSchema.safeParse(rawData);

    if (parsedData.success) {
      const data = parsedData.data;
      kpis[0] = {
        ...kpis[0],
        subtitle: data.subtitle,
        mainValue: `${data.price}억`,
        subValue: `↑ ${data.up}`,
        description: `이전 최고가: ${data.prev}`,
        badgeStyle: 'bg-toss-red text-surface animate-pulse',
      };
    } else {
      logger.error('kpi.service.startKPISimulation', 'Failed to parse fake price data', undefined, parsedData.error);
    }

    onUpdate();
  }, 5000);

  return () => clearInterval(intervalId);
}
