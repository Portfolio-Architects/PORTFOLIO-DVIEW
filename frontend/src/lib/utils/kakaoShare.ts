import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const initKakao = () => {
  if (typeof window !== "undefined" && window.Kakao) {
    if (!window.Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (key) {
        window.Kakao.init(key);
        logger.info('kakaoShare.initKakao', 'Kakao SDK initialized');
      }
    }
  }
};

export const loadKakaoSdk = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve();
      return;
    }
    if (window.Kakao) {
      resolve();
      return;
    }
    
    // 만약 이미 DOM에 카카오 스크립트가 존재하는지 확인 (layout.tsx에서 주입한 경우)
    const existingScript = document.querySelector('script[src*="kakao.min.js"]');
    if (existingScript) {
      // 스크립트가 로드되는 중일 수 있으므로 약간 대기
      setTimeout(() => {
        if (window.Kakao) resolve();
        else reject(new Error("Kakao SDK 스크립트는 존재하나 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요."));
      }, 1000);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Kakao SDK 로드 실패 (브라우저 광고 차단기, 혹은 네트워크 환경을 확인해주세요)"));
    document.head.appendChild(script);
  });
};

// Zod custom schema for File check, safe for SSR (Node environments)
const IsomorphicFileSchema = z.custom<any>((val) => {
  if (typeof File === 'undefined') return true;
  return val instanceof File;
}, 'Must be a valid File object').optional();

// Zod schemas for all sharing domains
export const ShareAptParamsSchema = z.object({
  aptName: z.string().min(1),
  priceEok: z.number().nonnegative(),
  priceMan: z.number().nonnegative(),
  ratio: z.number().nonnegative(),
  imageUrl: z.string().optional(),
  imageFile: IsomorphicFileSchema,
  customTitle: z.string().optional(),
  customDesc: z.string().optional(),
  valStatus: z.string().optional(),
  valAmount: z.string().optional(),
});

export const SharePostParamsSchema = z.object({
  postId: z.string().min(1),
  title: z.string().min(1),
  category: z.string().min(1),
  contentSummary: z.string().catch(''),
  imageUrl: z.string().optional(),
});

export const ShareJeonseSafetyParamsSchema = z.object({
  aptName: z.string().min(1),
  dong: z.string().min(1),
  marketPrice: z.number().nonnegative(),
  jeonseAmount: z.number().nonnegative(),
  lienAmount: z.number().nonnegative(),
  debtRatio: z.number().nonnegative(),
  riskLabel: z.string().min(1),
  riskLevel: z.enum(['safe', 'caution', 'warning', 'danger']),
});

export const ShareMortgageParamsSchema = z.object({
  aptName: z.string().min(1),
  dong: z.string().min(1),
  marketPrice: z.number().nonnegative(),
  bestProduct: z.string().min(1),
  maxLoanAmount: z.number().nonnegative(),
  finalRate: z.number().nonnegative(),
  monthlyPayment: z.number().nonnegative(),
  ownCapitalRequired: z.number().nonnegative(),
});

export const ShareTaxParamsSchema = z.object({
  aptName: z.string().min(1),
  dong: z.string().min(1),
  marketPrice: z.number().nonnegative(),
  ownedHouses: z.number().int().nonnegative(),
  exclusiveArea: z.enum(['85under', '85over']),
  acquisitionTax: z.number().nonnegative(),
  localEducationTax: z.number().nonnegative(),
  ruralSpecialTax: z.number().nonnegative(),
  brokerFee: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
});

export const ShareLocalEventParamsSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  location: z.string().min(1),
  category: z.string().min(1),
  tip: z.string().catch(''),
});

export const ShareCompareParamsSchema = z.object({
  apt1Name: z.string().min(1),
  apt2Name: z.string().min(1),
  scoreApt1: z.number().int().nonnegative(),
  scoreApt2: z.number().int().nonnegative(),
});

export const ShareLocalNoticeParamsSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  dept: z.string().min(1),
  date: z.string().min(1),
  source: z.enum(['bbs', 'gosi', 'rail', 'dong', 'culture']).optional(),
});

export const ShareRecommendationsParamsSchema = z.object({
  apt1: z.string().min(1),
  score1: z.number().nonnegative(),
  apt2: z.string().min(1),
  score2: z.number().nonnegative(),
  apt3: z.string().min(1),
  score3: z.number().nonnegative(),
  fallback: z.boolean().catch(false),
});

export const ShareSellTimingParamsSchema = z.object({
  aptName: z.string().min(1),
  dong: z.string().min(1),
  acquisitionPrice: z.number().nonnegative(),
  transferPrice: z.number().nonnegative(),
  holdingYears: z.number().nonnegative(),
  resideYears: z.number().nonnegative(),
  isOneHouse: z.boolean().catch(true),
  verdictScore: z.number().nonnegative(),
  verdictLabel: z.string().min(1),
  totalTax: z.number().nonnegative(),
});

export interface ShareAptParams {
  aptName: string;
  priceEok: number;
  priceMan: number;
  ratio: number;
  imageUrl?: string;
  imageFile?: File;
  customTitle?: string;
  customDesc?: string;
  valStatus?: string;
  valAmount?: string;
}

export const shareAptToKakao = async (params: ShareAptParams) => {
  const validation = ShareAptParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareAptToKakao', 'Invalid parameters provided for Apt sharing', {
      error: String(validation.error),
      params
    });
    alert('공유 데이터가 올바르지 않습니다.');
    return;
  }
  const { aptName, priceEok, priceMan, ratio, imageUrl, imageFile, customTitle, customDesc, valStatus, valAmount } = validation.data;

  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      logger.warn('kakaoShare.shareAptToKakao', 'Kakao SDK not loaded');
      alert("카카오 스크립트를 불러올 수 없습니다. 광고 차단기(Adblock)를 끄거나 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!window.Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) {
        alert("카카오 앱 키가 설정되지 않았습니다.");
        return;
      }
      window.Kakao.init(key);
      logger.info('kakaoShare.shareAptToKakao', 'Kakao SDK initialized');
    }

    const priceStr =
      priceMan > 0
        ? `${priceEok}억 ${priceMan.toLocaleString()}만원`
        : `${priceEok}억원`;

    let finalImageUrl = imageUrl;
    if (!finalImageUrl) {
      if (priceEok > 0) {
        const baseUrl = window.location.origin;
        const status = ratio >= 65 ? "갭투자추천" : "인기단지";
        let url = `${baseUrl}/api/og?type=apartment&title=${encodeURIComponent(aptName)}&price=${encodeURIComponent(priceStr)}&ratio=${ratio.toFixed(1)}&status=${encodeURIComponent(status)}`;
        if (valStatus) {
          url += `&valStatus=${valStatus}`;
        }
        if (valAmount) {
          url += `&valAmount=${encodeURIComponent(valAmount)}`;
        }
        finalImageUrl = url;
      } else {
        finalImageUrl = `${window.location.origin}/api/og?title=${encodeURIComponent("동탄 아파트 가치분석")}`;
      }
    }

    if (imageFile) {
      logger.info('kakaoShare.shareAptToKakao', 'Uploading generated share card image to Kakao');
      const uploadRes = await window.Kakao.Share.uploadImage({
        file: [imageFile],
      });
      if (uploadRes && uploadRes.infos && uploadRes.infos.original && uploadRes.infos.original.url) {
        finalImageUrl = uploadRes.infos.original.url;
        logger.info('kakaoShare.shareAptToKakao', 'Kakao uploaded image URL', { finalImageUrl });
      } else {
        logger.warn('kakaoShare.shareAptToKakao', 'Kakao image upload response did not contain URL', { uploadRes });
      }
    }

    const description = customDesc || `최근 실거래가 ${priceStr}, 전세가율 ${ratio.toFixed(1)}%\n현재 D-VIEW에서 10년 치 트렌드를 확인하세요.`;
    const shareUrl = `${window.location.origin}/#apt=${encodeURIComponent(aptName)}&utm_source=kakaotalk&utm_medium=share&utm_campaign=apt_detail`;

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: customTitle || `${aptName}, 지금 사면 호구일까?`,
        description: description,
        imageUrl: finalImageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: "D-VIEW에서 확인하기",
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error('kakaoShare.shareAptToKakao', 'Kakao Share Error', { error: errMessage });
    alert("공유 진행 중 오류가 발생했습니다: " + errMessage);
  }
};

export interface SharePostParams {
  postId: string;
  title: string;
  category: string;
  contentSummary: string;
  imageUrl?: string;
}

export const sharePostToKakao = async (params: SharePostParams) => {
  const validation = SharePostParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.sharePostToKakao', 'Invalid parameters provided for Post sharing', {
      error: String(validation.error),
      params
    });
    alert('공유 데이터가 올바르지 않습니다.');
    return;
  }
  const { postId, title, category, contentSummary, imageUrl } = validation.data;

  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      logger.warn('kakaoShare.sharePostToKakao', 'Kakao SDK not loaded');
      alert("카카오 스크립트를 불러올 수 없습니다. 광고 차단기(Adblock)를 끄거나 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!window.Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) {
        alert("카카오 앱 키가 설정되지 않았습니다.");
        return;
      }
      window.Kakao.init(key);
      logger.info('kakaoShare.sharePostToKakao', 'Kakao SDK initialized');
    }

    const finalImageUrl = imageUrl || "https://dongtanview.com/api/og?title=" + encodeURIComponent(title);
    const shareUrl = `${window.location.origin}/lounge/${postId}?utm_source=kakaotalk&utm_medium=share&utm_campaign=lounge_detail`;

    const cleanDesc = contentSummary.replace(/[#*`_~[\]]/g, '').trim();
    const truncatedDesc = cleanDesc.length > 80 ? cleanDesc.substring(0, 80) + "..." : cleanDesc;
    const finalDesc = `[${category}] ${truncatedDesc}\n지금 D-VIEW 라운지에서 확인하고 소통하세요!`;

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: title,
        description: finalDesc,
        imageUrl: finalImageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: "라운지 글 읽기",
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error('kakaoShare.sharePostToKakao', 'Kakao Share Error', { error: errMessage });
    alert("공유 진행 중 오류가 발생했습니다: " + errMessage);
  }
};

export interface ShareJeonseSafetyParams {
  aptName: string;
  dong: string;
  marketPrice: number; // in man-won
  jeonseAmount: number; // in man-won
  lienAmount: number; // in man-won
  debtRatio: number;
  riskLabel: string;
  riskLevel: 'safe' | 'caution' | 'warning' | 'danger';
}

export const shareJeonseSafetyToKakao = async (params: ShareJeonseSafetyParams) => {
  const validation = ShareJeonseSafetyParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareJeonseSafetyToKakao', 'Invalid parameters provided for Jeonse Safety sharing', {
      error: String(validation.error),
      params
    });
    alert('공유 데이터가 올바르지 않습니다.');
    return;
  }
  const { aptName, dong, marketPrice, jeonseAmount, lienAmount, debtRatio, riskLabel } = validation.data;

  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      logger.warn('kakaoShare.shareJeonseSafetyToKakao', 'Kakao SDK not loaded');
      alert("카카오 스크립트를 불러올 수 없습니다. 광고 차단기(Adblock)를 끄거나 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!window.Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) {
        alert("카카오 앱 키가 설정되지 않았습니다.");
        return;
      }
      window.Kakao.init(key);
      logger.info('kakaoShare.shareJeonseSafetyToKakao', 'Kakao SDK initialized');
    }

    const formatEokMan = (manWon: number) => {
      const eok = Math.floor(manWon / 10000);
      const man = Math.round(manWon % 10000);
      if (eok > 0) {
        return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
      }
      return `${man.toLocaleString()}만원`;
    };

    const marketPriceStr = formatEokMan(marketPrice);
    const jeonseStr = formatEokMan(jeonseAmount);
    const lienStr = formatEokMan(lienAmount);
    const totalDebt = jeonseAmount + lienAmount;
    const totalDebtStr = formatEokMan(totalDebt);

    const baseUrl = window.location.origin;
    const finalImageUrl = `${baseUrl}/api/og?type=jeonse&title=${encodeURIComponent(aptName)}&status=${encodeURIComponent(riskLabel)}&ratio=${debtRatio.toFixed(1)}&price=${encodeURIComponent(marketPriceStr)}&lien=${encodeURIComponent(lienStr)}&totalDebt=${encodeURIComponent(totalDebtStr)}`;

    const description = `매매시세: ${marketPriceStr}\n보증금: ${jeonseStr} | 융자금: ${lienStr}\n부채비율: ${debtRatio.toFixed(1)}% [${riskLabel}]`;
    const shareUrl = `${window.location.origin}/#apt=${encodeURIComponent(aptName)}&calc=jeonse&utm_source=kakaotalk&utm_medium=share&utm_campaign=jeonse_share`;

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `[전세 안전진단] ${aptName} (${dong})`,
        description: description,
        imageUrl: finalImageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: "안전진단 상세 보기",
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error('kakaoShare.shareJeonseSafetyToKakao', 'Kakao Share Error', { error: errMessage });
    alert("공유 진행 중 오류가 발생했습니다: " + errMessage);
  }
};

export interface ShareMortgageParams {
  aptName: string;
  dong: string;
  marketPrice: number; // in man-won
  bestProduct: string;
  maxLoanAmount: number; // in man-won
  finalRate: number;
  monthlyPayment: number; // in absolute Won
  ownCapitalRequired: number; // in man-won
}

export const shareMortgageToKakao = async (params: ShareMortgageParams) => {
  const validation = ShareMortgageParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareMortgageToKakao', 'Invalid parameters provided for Mortgage sharing', {
      error: String(validation.error),
      params
    });
    alert('공유 데이터가 올바르지 않습니다.');
    return;
  }
  const { aptName, dong, marketPrice, bestProduct, maxLoanAmount, finalRate, monthlyPayment, ownCapitalRequired } = validation.data;

  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      logger.warn('kakaoShare.shareMortgageToKakao', 'Kakao SDK not loaded');
      alert("카카오 스크립트를 불러올 수 없습니다. 광고 차단기(Adblock)를 끄거나 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!window.Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) {
        alert("카카오 앱 키가 설정되지 않았습니다.");
        return;
      }
      window.Kakao.init(key);
      logger.info('kakaoShare.shareMortgageToKakao', 'Kakao SDK initialized');
    }

    const formatEokMan = (manWon: number) => {
      const eok = Math.floor(manWon / 10000);
      const man = Math.round(manWon % 10000);
      if (eok > 0) {
        return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
      }
      return `${man.toLocaleString()}만원`;
    };

    const marketPriceStr = formatEokMan(marketPrice);
    const maxLoanStr = formatEokMan(maxLoanAmount);
    const monthlyPayStr = `${Math.round(monthlyPayment / 10000).toLocaleString()}만원`;
    const ownCapitalStr = formatEokMan(ownCapitalRequired);

    const baseUrl = window.location.origin;
    const finalImageUrl = `${baseUrl}/api/og?type=mortgage&title=${encodeURIComponent(aptName)}&bestProduct=${encodeURIComponent(bestProduct)}&price=${encodeURIComponent(maxLoanStr)}&ratio=${finalRate.toFixed(2)}&status=${encodeURIComponent(ownCapitalStr)}&subtitle=${encodeURIComponent(monthlyPayStr)}`;

    const description = `추천 상품: ${bestProduct}\n대출 한도: ${maxLoanStr} (금리 ${finalRate.toFixed(2)}%)\n필요 자기자본: ${ownCapitalStr} | 월 상환액: ${monthlyPayStr}`;
    const shareUrl = `${window.location.origin}/#apt=${encodeURIComponent(aptName)}&calc=mortgage&utm_source=kakaotalk&utm_medium=share&utm_campaign=mortgage_share`;

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `[대출·자금조달 진단] ${aptName} (${dong})`,
        description: description,
        imageUrl: finalImageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: "자가진단 상세 보기",
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error('kakaoShare.shareMortgageToKakao', 'Kakao Share Error', { error: errMessage });
    alert("공유 진행 중 오류가 발생했습니다: " + errMessage);
  }
};

export interface ShareTaxParams {
  aptName: string;
  dong: string;
  marketPrice: number; // in man-won
  ownedHouses: number;
  exclusiveArea: '85under' | '85over';
  acquisitionTax: number; // in man-won
  localEducationTax: number; // in man-won
  ruralSpecialTax: number; // in man-won
  brokerFee: number; // in man-won
  totalCost: number; // in man-won
}

export const shareTaxToKakao = async (params: ShareTaxParams) => {
  const validation = ShareTaxParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareTaxToKakao', 'Invalid parameters provided for Tax sharing', {
      error: String(validation.error),
      params
    });
    alert('공유 데이터가 올바르지 않습니다.');
    return;
  }
  const { aptName, dong, marketPrice, ownedHouses, exclusiveArea, acquisitionTax, localEducationTax, ruralSpecialTax, brokerFee, totalCost } = validation.data;

  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      logger.warn('kakaoShare.shareTaxToKakao', 'Kakao SDK not loaded');
      alert("카카오 스크립트를 불러올 수 없습니다. 광고 차단기(Adblock)를 끄거나 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!window.Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) {
        alert("카카오 앱 키가 설정되지 않았습니다.");
        return;
      }
      window.Kakao.init(key);
      logger.info('kakaoShare.shareTaxToKakao', 'Kakao SDK initialized');
    }

    const formatEokMan = (manWon: number) => {
      const eok = Math.floor(manWon / 10000);
      const man = Math.round(manWon % 10000);
      if (eok > 0) {
        return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
      }
      return `${man.toLocaleString()}만원`;
    };

    const marketPriceStr = formatEokMan(marketPrice);
    const totalTax = acquisitionTax + localEducationTax + ruralSpecialTax;
    const totalTaxStr = formatEokMan(totalTax);
    const brokerFeeStr = formatEokMan(brokerFee);
    const totalCostStr = formatEokMan(totalCost);
    const ownedHousesStr = `${ownedHouses}주택`;
    const areaStr = exclusiveArea === '85under' ? '전용 85㎡ 이하' : '전용 85㎡ 초과';

    const baseUrl = window.location.origin;
    const finalImageUrl = `${baseUrl}/api/og?type=tax&title=${encodeURIComponent(aptName)}&subtitle=${encodeURIComponent(dong)}&price=${encodeURIComponent(marketPriceStr)}&ratio=${encodeURIComponent(totalCostStr)}&status=${encodeURIComponent(ownedHousesStr)}&lien=${encodeURIComponent(totalTaxStr)}&totalDebt=${encodeURIComponent(brokerFeeStr)}&bestProduct=${encodeURIComponent(areaStr)}`;

    const description = `매매가: ${marketPriceStr}\n취득세 등 세금: ${totalTaxStr}\n중개보수: ${brokerFeeStr}\n총 부대비용: ${totalCostStr} (${ownedHousesStr} | ${areaStr})`;
    const shareUrl = `${window.location.origin}/#apt=${encodeURIComponent(aptName)}&calc=tax&utm_source=kakaotalk&utm_medium=share&utm_campaign=tax_share`;

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `[취득세·중개보수 계산] ${aptName} (${dong})`,
        description: description,
        imageUrl: finalImageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: "부대비용 상세 보기",
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error('kakaoShare.shareTaxToKakao', 'Kakao Share Error', { error: errMessage });
    alert("공유 진행 중 오류가 발생했습니다: " + errMessage);
  }
};

export interface ShareLocalEventParams {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  tip: string;
}

export const shareLocalEventToKakao = async (params: ShareLocalEventParams) => {
  const validation = ShareLocalEventParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareLocalEventToKakao', 'Invalid parameters provided for Local Event sharing', {
      error: String(validation.error),
      params
    });
    alert('공유 데이터가 올바르지 않습니다.');
    return;
  }
  const { id, title, date, time, location, category, tip } = validation.data;

  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      logger.warn('kakaoShare.shareLocalEventToKakao', 'Kakao SDK not loaded');
      alert("카카오 스크립트를 불러올 수 없습니다. 광고 차단기(Adblock)를 끄거나 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!window.Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) {
        alert("카카오 앱 키가 설정되지 않았습니다.");
        return;
      }
      window.Kakao.init(key);
      logger.info('kakaoShare.shareLocalEventToKakao', 'Kakao SDK initialized');
    }

    const baseUrl = window.location.origin;
    const finalImageUrl = `${baseUrl}/api/og?type=event&title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}&date=${encodeURIComponent(`${date} (${time})`)}&location=${encodeURIComponent(location)}&tip=${encodeURIComponent(tip.substring(0, 80))}`;

    const description = `일시: ${date} (${time})\n장소: ${location}\n꿀팁: ${tip.substring(0, 50)}`;
    const shareUrl = `${window.location.origin}/#lounge?notice=${id}&utm_source=kakaotalk&utm_medium=share&utm_campaign=event_share`;

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `[로컬 캘린더] ${title}`,
        description: description,
        imageUrl: finalImageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: "로컬 일정 확인하기",
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error('kakaoShare.shareLocalEventToKakao', 'Kakao Share Error', { error: errMessage });
    alert("공유 진행 중 오류가 발생했습니다: " + errMessage);
  }
};

export interface ShareCompareParams {
  apt1Name: string;
  apt2Name: string;
  scoreApt1: number;
  scoreApt2: number;
}

export const shareCompareToKakao = async (params: ShareCompareParams) => {
  const validation = ShareCompareParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareCompareToKakao', 'Invalid parameters provided for Compare sharing', {
      error: String(validation.error),
      params
    });
    alert('공유 데이터가 올바르지 않습니다.');
    return;
  }
  const { apt1Name, apt2Name, scoreApt1, scoreApt2 } = validation.data;

  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      logger.warn('kakaoShare.shareCompareToKakao', 'Kakao SDK not loaded');
      alert("카카오 스크립트를 불러올 수 없습니다. 광고 차단기(Adblock)를 끄거나 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!window.Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) {
        alert("카카오 앱 키가 설정되지 않았습니다.");
        return;
      }
      window.Kakao.init(key);
      logger.info('kakaoShare.shareCompareToKakao', 'Kakao SDK initialized');
    }

    const baseUrl = window.location.origin;
    const finalImageUrl = `${baseUrl}/api/og?type=compare&apt1=${encodeURIComponent(apt1Name)}&apt2=${encodeURIComponent(apt2Name)}&score1=${scoreApt1}&score2=${scoreApt2}`;

    const description = `종합 비교 판정\n${apt1Name} 우세: ${scoreApt1}개 항목\n${apt2Name} 우세: ${scoreApt2}개 항목`;
    const shareUrl = `${window.location.origin}/#explore?compare=${encodeURIComponent(apt1Name)}:${encodeURIComponent(apt2Name)}&utm_source=kakaotalk&utm_medium=share&utm_campaign=compare_share`;

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `[비교 리포트] ${apt1Name} VS ${apt2Name}`,
        description: description,
        imageUrl: finalImageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: "비교 보고서 확인하기",
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error('kakaoShare.shareCompareToKakao', 'Kakao Share Error', { error: errMessage });
    alert("공유 진행 중 오류가 발생했습니다: " + errMessage);
  }
};

export interface ShareLocalNoticeParams {
  id: string;
  title: string;
  dept: string;
  date: string;
  source?: 'bbs' | 'gosi' | 'rail' | 'dong' | 'culture';
}

export const shareLocalNoticeToKakao = async (params: ShareLocalNoticeParams) => {
  const validation = ShareLocalNoticeParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareLocalNoticeToKakao', 'Invalid parameters provided for Local Notice sharing', {
      error: String(validation.error),
      params
    });
    alert('공유 데이터가 올바르지 않습니다.');
    return;
  }
  const { id, title, dept, date, source } = validation.data;

  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      logger.warn('kakaoShare.shareLocalNoticeToKakao', 'Kakao SDK not loaded');
      alert("카카오 스크립트를 불러올 수 없습니다. 광고 차단기(Adblock)를 끄거나 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!window.Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) {
        alert("카카오 앱 키가 설정되지 않았습니다.");
        return;
      }
      window.Kakao.init(key);
      logger.info('kakaoShare.shareLocalNoticeToKakao', 'Kakao SDK initialized');
    }

    const baseUrl = window.location.origin;
    const isAI = dept === 'AI 데이터 랩';
    const isCulture = source === 'culture' || id.startsWith('culture_');
    const isLecture = title.includes('[강좌]');
    
    let finalImageUrl = '';
    let description = '';
    let shareUrl = '';
    let titleText = '';

    if (isAI) {
      finalImageUrl = `${baseUrl}/api/og?type=event&title=${encodeURIComponent(title)}&category=${encodeURIComponent('AI 시황분석')}&date=${encodeURIComponent(date)}&location=${encodeURIComponent(dept)}&tip=${encodeURIComponent('D-VIEW AI 데이터 랩이 실거래 통계를 통해 automatic 도출한 분석 리포트입니다.')}`;
      description = `작성부서: ${dept}\n분석일자: ${date}\n실거래 통계 기반으로 추출한 단지 랭킹 및 세무 가이드 상세 분석 본문을 확인해 보세요!`;
      shareUrl = `${baseUrl}/lounge?notice=${id}&utm_source=kakaotalk&utm_medium=share&utm_campaign=ai_report_share`;
      titleText = title;
    } else if (isCulture) {
      const category = title.includes('[루나쇼]') ? '동탄호수공원 루나쇼' : 
                       title.includes('[강좌]') ? '주민센터 강좌' :
                       title.includes('[버스킹]') ? '여울공원 버스킹' : 
                       title.includes('[축제]') ? '동탄 로컬 축제' : '동탄 문화 행사';
      
      const tipText = isLecture ? '선착순 모집 주민자치센터 유익한 혜택 프로그램' : '가족 나들이 및 아파트 조망권 추천 정보';
      
      finalImageUrl = `${baseUrl}/api/og?type=event&title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}&date=${encodeURIComponent(date)}&location=${encodeURIComponent(dept)}&tip=${encodeURIComponent(tipText)}`;
      
      description = isLecture 
        ? `접수개시: ${date} (수강료: 무료~3만원 선)\n${dept} 주민자치센터의 유익한 라이프스타일 강좌 일정을 D-VIEW에서 확인해보세요!`
        : `장소: ${dept}\n행사일: ${date} (이용 요금: 무료)\nD-VIEW에서 루나쇼 명당 단지 정보 및 상세 가치 분석을 확인하세요!`;
        
      shareUrl = `${baseUrl}/lounge?notice=${id}&utm_source=kakaotalk&utm_medium=share&utm_campaign=culture_share`;
      titleText = title;
    } else {
      finalImageUrl = `${baseUrl}/api/og?type=notice&title=${encodeURIComponent(title)}&dept=${encodeURIComponent(dept)}&date=${encodeURIComponent(date)}`;
      description = `작성부서: ${dept}\n등록일자: ${date}\nD-VIEW에서 동탄구 소식 상세 내용을 확인하세요.`;
      shareUrl = `${baseUrl}/lounge?notice=${id}&utm_source=kakaotalk&utm_medium=share&utm_campaign=notice_share`;
      titleText = `[동탄구 소식] ${title}`;
    }

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: titleText,
        description: description,
        imageUrl: finalImageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: isLecture ? "강좌 정보 & 신청 바로가기" : (isCulture ? "행사 정보 & 아파트 가치 보기" : "소식 상세 보기"),
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error('kakaoShare.shareLocalNoticeToKakao', 'Kakao Share Error', { error: errMessage });
    alert("공유 진행 중 오류가 발생했습니다: " + errMessage);
  }
};

export interface ShareRecommendationsParams {
  apt1: string;
  score1: number;
  apt2: string;
  score2: number;
  apt3: string;
  score3: number;
  fallback?: boolean;
}

export const shareRecommendationsToKakao = async (params: ShareRecommendationsParams) => {
  const validation = ShareRecommendationsParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareRecommendationsToKakao', 'Invalid parameters provided for Recommendations sharing', {
      error: String(validation.error),
      params
    });
    alert('공유 데이터가 올바르지 않습니다.');
    return;
  }
  const { apt1, score1, apt2, score2, apt3, score3, fallback } = validation.data;

  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      logger.warn('kakaoShare.shareRecommendationsToKakao', 'Kakao SDK not loaded');
      alert("카카오 스크립트를 불러올 수 없습니다. 광고 차단기(Adblock)를 끄거나 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!window.Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) {
        alert("카카오 앱 키가 설정되지 않았습니다.");
        return;
      }
      window.Kakao.init(key);
      logger.info('kakaoShare.shareRecommendationsToKakao', 'Kakao SDK initialized');
    }

    const baseUrl = window.location.origin;
    const finalImageUrl = `${baseUrl}/api/og?type=recommend&apt1=${encodeURIComponent(apt1)}&score1=${score1}&apt2=${encodeURIComponent(apt2)}&score2=${score2}&apt3=${encodeURIComponent(apt3)}&score3=${score3}`;

    const title = fallback
      ? "동탄 실시간 인기 & 가치 단지 TOP 3"
      : "나를 위한 동탄 AI 맞춤 아파트 TOP 3";
    const description = `AI 분석 결과: 1위 ${apt1} (${score1}%), 2위 ${apt2} (${score2}%), 3위 ${apt3} (${score3}%)\nD-VIEW에서 내 조건에 맞는 단지를 확인하세요.`;
    const shareUrl = `${window.location.origin}/?from=share_recommend&utm_source=kakaotalk&utm_medium=share&utm_campaign=ai_recommendation`;

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: title,
        description: description,
        imageUrl: finalImageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: "D-VIEW에서 확인하기",
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error('kakaoShare.shareRecommendationsToKakao', 'Kakao Share Error', { error: errMessage });
    alert("공유 진행 중 오류가 발생했습니다: " + errMessage);
  }
};

export interface ShareSellTimingParams {
  aptName: string;
  dong: string;
  acquisitionPrice: number; // in man-won
  transferPrice: number; // in man-won
  holdingYears: number;
  resideYears: number;
  isOneHouse: boolean;
  verdictScore: number;
  verdictLabel: string;
  totalTax: number; // in man-won
}

export const shareSellTimingToKakao = async (params: ShareSellTimingParams) => {
  const validation = ShareSellTimingParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareSellTimingToKakao', 'Invalid parameters provided for Sell Timing sharing', {
      error: String(validation.error),
      params
    });
    alert('공유 데이터가 올바르지 않습니다.');
    return;
  }
  const { aptName, dong, acquisitionPrice, transferPrice, holdingYears, resideYears, isOneHouse, verdictScore, verdictLabel, totalTax } = validation.data;

  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      logger.warn('kakaoShare.shareSellTimingToKakao', 'Kakao SDK not loaded');
      alert("카카오 스크립트를 불러올 수 없습니다. 광고 차단기(Adblock)를 끄거나 잠시 후 다시 시도해주세요.");
      return;
    }

    if (!window.Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) {
        alert("카카오 앱 키가 설정되지 않았습니다.");
        return;
      }
      window.Kakao.init(key);
      logger.info('kakaoShare.shareSellTimingToKakao', 'Kakao SDK initialized');
    }

    const formatEokMan = (manWon: number) => {
      const eok = Math.floor(manWon / 10000);
      const man = Math.round(manWon % 10000);
      if (eok > 0) {
        return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
      }
      return `${man.toLocaleString()}만원`;
    };

    const acqStr = formatEokMan(acquisitionPrice);
    const transferStr = formatEokMan(transferPrice);
    const taxStr = formatEokMan(totalTax);
    const houseStr = isOneHouse ? "1주택" : "다주택";

    const baseUrl = window.location.origin;
    const finalImageUrl = `${baseUrl}/api/og?type=sell_timing&title=${encodeURIComponent(aptName)}&score=${verdictScore}&status=${encodeURIComponent(verdictLabel)}&price=${encodeURIComponent(transferStr)}&ratio=${encodeURIComponent(taxStr)}&subtitle=${encodeURIComponent(dong)}`;

    const description = `매도가: ${transferStr} (취득가: ${acqStr})\n호구지수: ${verdictScore}% [${verdictLabel}]\n보유기간: ${holdingYears}년 | 실거주: ${resideYears}년 (${houseStr})\n예상 총 세금: ${taxStr}`;
    const shareUrl = `${window.location.origin}/#apt=${encodeURIComponent(aptName)}&calc=sell_timing&utm_source=kakaotalk&utm_medium=share&utm_campaign=sell_timing_share`;

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `[AI 매도 진단] ${aptName} 지금 팔면 호구일까?`,
        description: description,
        imageUrl: finalImageUrl,
        imageWidth: 1200,
        imageHeight: 630,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: "매도 진단 보고서 보기",
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    logger.error('kakaoShare.shareSellTimingToKakao', 'Kakao Share Error', { error: errMessage });
    alert("공유 진행 중 오류가 발생했습니다: " + errMessage);
  }
};
