import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { getAdForApartment } from './adMatching';

export const ContextualAdSchema = z.object({
  adType: z.enum(['interior', 'academy', 'insurance', 'cleaning']),
  badge: z.string(),
  title: z.string(),
  desc: z.string(),
  actionText: z.string(),
  link: z.string(),
});
export type ContextualAd = z.infer<typeof ContextualAdSchema>;

export const GetContextualAdParamsSchema = z.object({
  yearBuilt: z.union([z.string(), z.number()]).optional().nullable().transform(val => val !== null && val !== undefined ? String(val) : undefined),
  distanceToElementary: z.union([z.string(), z.number()]).optional().nullable().transform(val => val !== null && val !== undefined ? Number(val) : undefined),
  jeonseRate: z.union([z.string(), z.number()]).optional().nullable().transform(val => val !== null && val !== undefined ? Number(val) : undefined),
});

export function getContextualAd(
  yearBuilt: string | number | undefined,
  distanceToElementary: number | undefined,
  jeonseRate: number | undefined
): ContextualAd {
  const validation = GetContextualAdParamsSchema.safeParse({ yearBuilt, distanceToElementary, jeonseRate });
  if (!validation.success) {
    logger.warn('ContextualAdEngine.getContextualAd', 'Parameter validation failed', { error: String(validation.error) });
  }

  const data = validation.success ? validation.data : { yearBuilt: undefined, distanceToElementary: undefined, jeonseRate: undefined };

  const ad = getAdForApartment({
    yearBuilt: data.yearBuilt,
    distanceToElementary: data.distanceToElementary,
    jeonseRate: data.jeonseRate
  });

  const rawResult = {
    adType: ad.adType,
    badge: ad.badge,
    title: ad.title,
    desc: ad.description,
    actionText: ad.buttonText,
    link: ad.link
  };

  const resultValidation = ContextualAdSchema.safeParse(rawResult);
  if (resultValidation.success) {
    return resultValidation.data;
  } else {
    logger.error('ContextualAdEngine.getContextualAd', 'Output validation failed', { error: String(resultValidation.error) });
    return {
      adType: 'interior',
      badge: '스폰서',
      title: '동탄 아파트 리모델링 상담',
      desc: 'DVIEW 제휴 프리미엄 리모델링 특별 패키지 혜택을 만나보세요.',
      actionText: '상담 신청',
      link: '/lounge'
    };
  }
}


