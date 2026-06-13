import { getAdForApartment } from './adMatching';

export interface ContextualAd {
  adType: 'interior' | 'academy' | 'insurance' | 'cleaning';
  badge: string;
  title: string;
  desc: string;
  actionText: string;
  link: string;
}

export function getContextualAd(
  yearBuilt: string | number | undefined,
  distanceToElementary: number | undefined,
  jeonseRate: number | undefined
): ContextualAd {
  const ad = getAdForApartment({
    yearBuilt,
    distanceToElementary,
    jeonseRate
  });

  return {
    adType: ad.adType as any,
    badge: ad.badge,
    title: ad.title,
    desc: ad.description,
    actionText: ad.buttonText,
    link: ad.link
  };
}

