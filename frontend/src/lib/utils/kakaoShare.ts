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

let kakaoLoadPromise: Promise<void> | null = null;

export const loadKakaoSdk = (): Promise<void> => {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  // Check if window.Kakao is completely loaded and holds the required APIs
  if (window.Kakao && typeof window.Kakao.isInitialized === "function" && window.Kakao.Share) {
    return Promise.resolve();
  }
  if (kakaoLoadPromise) {
    return kakaoLoadPromise;
  }

  kakaoLoadPromise = new Promise<void>((resolve, reject) => {
    // Check if the script is already appended to the DOM (e.g. from layout.tsx)
    const existingScript = document.querySelector('script[src*="kakao.min.js"]') as HTMLScriptElement | null;
    if (existingScript) {
      // Poll dynamically up to 5 seconds to prevent race conditions in slower network environments
      // We don't overwrite existingScript.onload to prevent memory leaks and callback chain breaking.
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (window.Kakao && typeof window.Kakao.isInitialized === "function" && window.Kakao.Share) {
          clearInterval(interval);
          resolve();
        } else if (attempts >= 50) { // 50 * 100ms = 5000ms (5s)
          clearInterval(interval);
          kakaoLoadPromise = null;
          reject(new Error("Kakao SDK 스크립트는 존재하나 로드가 완료되지 않았습니다. 잠시 후 다시 시도해주세요."));
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    script.onload = () => {
      // Defer resolution slightly to ensure SWC compiler / microtask namespace mapping is completed
      const timer = setTimeout(() => {
        if (window.Kakao && typeof window.Kakao.isInitialized === "function" && window.Kakao.Share) {
          resolve();
        } else {
          kakaoLoadPromise = null;
          reject(new Error("Kakao SDK는 로드되었으나 내부 Share API 파싱에 실패했습니다."));
        }
        clearTimeout(timer);
      }, 50);
    };
    script.onerror = () => {
      kakaoLoadPromise = null;
      reject(new Error("Kakao SDK 로드 실패 (브라우저 광고 차단기, 혹은 네트워크 환경을 확인해주세요)"));
    };
    document.head.appendChild(script);
  });

  return kakaoLoadPromise;
};

// 범용 클립보드 복사 유틸리티 (navigator.clipboard + execCommand fallback)
export const copyTextToClipboardDirect = async (text: string): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') return false;
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      textArea.remove();
      return success;
    }
  } catch (err) {
    logger.error('kakaoShare.copyTextToClipboardDirect', 'Failed to copy text', { error: String(err) });
    return false;
  }
};

// 카카오 SDK 로딩을 점검하고 실패 시 자동으로 클립보드에 정보를 복사하여 폴백하는 가드 함수
export const checkKakaoSdkAndFallback = async (
  title: string,
  description: string,
  shareUrl: string,
  fallbackMsg: string,
  customFallback?: () => Promise<boolean>,
  toastFn?: (msg: string) => void
): Promise<boolean> => {
  try {
    await loadKakaoSdk();
    if (typeof window === "undefined" || !window.Kakao || typeof window.Kakao.isInitialized !== "function" || !window.Kakao.Share) {
      throw new Error("SDK_NOT_LOADED");
    }
    if (!window.Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (!key) throw new Error("KEY_NOT_CONFIGURED");
      window.Kakao.init(key);
    }
    return true; // SDK 정상 이용 가능
  } catch (e) {
    logger.warn('kakaoShare.checkKakaoSdkAndFallback', 'Kakao SDK failure, falling back to clipboard', { error: String(e) });
    
    if (customFallback) {
      await customFallback();
      return false;
    }

    // 이쁘게 정렬된 클립보드 텍스트 구성
    let text = `📢 [DVIEW] ${title}\n`;
    if (description) {
      text += `👉 ${description}\n\n`;
    }
    text += `🔗 링크 바로가기: ${shareUrl}\n\n`;
    text += `#DVIEW #동탄부동산`;
    
    const copied = await copyTextToClipboardDirect(text);
    if (copied) {
      const msg = `${fallbackMsg} 클립보드에 상세 분석 요약과 전용 링크가 복사되었습니다. 원하는 단톡방/카페에 붙여넣기(Ctrl+V) 하세요!`;
      if (toastFn) toastFn(msg);
      else alert(msg);
    } else {
      const msg = "공유에 실패했습니다 (카카오톡 실행 불가 및 클립보드 복사 에러)";
      if (toastFn) toastFn(msg);
      else alert(msg);
    }
    return false; // SDK 사용 불가, 폴백 완료 처리
  }
};

// Zod custom schema for File check, safe for SSR (Node environments)
const IsomorphicFileSchema = z.custom<unknown>((val) => {
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
  maxPrice: z.number().nonnegative().optional(),
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
  maxPrice?: number;
}

export const shareAptToKakao = async (params: ShareAptParams, toastFn?: (msg: string) => void) => {
  const validation = ShareAptParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareAptToKakao', 'Invalid parameters provided for Apt sharing', {
      error: String(validation.error),
      params
    });
    const msg = '공유 데이터가 올바르지 않습니다.';
    if (toastFn) toastFn(msg);
    else alert(msg);
    return;
  }
  const { aptName, priceEok, priceMan, ratio, imageUrl, imageFile, customTitle, customDesc, valStatus, valAmount } = validation.data;

  const priceStr =
    priceMan > 0
      ? `${priceEok}억 ${priceMan.toLocaleString()}만원`
      : `${priceEok}억원`;

  const description = customDesc || `최근 실거래 ${priceStr}, 전세가율 ${ratio.toFixed(1)}%\n적정 가치 평가(DCF) 엔진이 계산한 적정 매수가를 지금 D-VIEW에서 확인해보세요.`;
  const shareUrl = `${window.location.origin}/overview#apt=${encodeURIComponent(aptName)}&utm_source=kakaotalk&utm_medium=share&utm_campaign=apt_detail`;
  const titleText = customTitle || `🧐 지금 사면 호구될까? ${aptName} 가치분석 리포트`;

  try {
    const sdkOk = await checkKakaoSdkAndFallback(
      titleText,
      description,
      shareUrl,
      "카카오톡 연결을 불러올 수 없어, 대신",
      async () => {
        const copied = await copyAptSummaryToClipboard(params);
        if (copied) {
          const msg = "카카오톡 스크립트를 불러올 수 없어, 대신 아파트 가치분석 요약과 전용 링크를 클립보드에 복사했습니다. 원하는 곳에 붙여넣기(Ctrl+V) 하세요!";
          if (toastFn) toastFn(msg);
          else alert(msg);
        } else {
          const msg = "공유에 실패했습니다 (카카오 SDK 로드 실패 및 클립보드 복사 실패)";
          if (toastFn) toastFn(msg);
          else alert(msg);
        }
        return copied;
      },
      toastFn
    );
    if (!sdkOk) return;

    let finalImageUrl = imageUrl;
    if (!finalImageUrl) {
      if (priceEok > 0) {
        const baseUrl = window.location.origin;
        const status = ratio >= 65 ? "실수요안심" : "인기단지";
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
      const uploadRes = await window.Kakao!.Share.uploadImage({
        file: [imageFile as File],
      });
      if (uploadRes && uploadRes.infos && uploadRes.infos.original && uploadRes.infos.original.url) {
        finalImageUrl = uploadRes.infos.original.url;
        logger.info('kakaoShare.shareAptToKakao', 'Kakao uploaded image URL', { finalImageUrl });
      } else {
        logger.warn('kakaoShare.shareAptToKakao', 'Kakao image upload response did not contain URL', { uploadRes });
      }
    }

    window.Kakao!.Share.sendDefault({
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
    const msg = "공유 진행 중 오류가 발생했습니다: " + errMessage;
    if (toastFn) toastFn(msg);
    else alert(msg);
  }
};

export interface SharePostParams {
  postId: string;
  title: string;
  category: string;
  contentSummary: string;
  imageUrl?: string;
}

export const sharePostToKakao = async (params: SharePostParams, toastFn?: (msg: string) => void) => {
  const validation = SharePostParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.sharePostToKakao', 'Invalid parameters provided for Post sharing', {
      error: String(validation.error),
      params
    });
    const msg = '공유 데이터가 올바르지 않습니다.';
    if (toastFn) toastFn(msg);
    else alert(msg);
    return;
  }
  const { postId, title, category, contentSummary, imageUrl } = validation.data;

  const finalImageUrl = imageUrl || "https://dongtanview.com/api/og?title=" + encodeURIComponent(title);
  const shareUrl = `${window.location.origin}/lounge/${postId}?utm_source=kakaotalk&utm_medium=share&utm_campaign=lounge_detail`;

  const cleanDesc = contentSummary.replace(/[#*`_~[\]]/g, '').trim();
  const truncatedDesc = cleanDesc.length > 80 ? cleanDesc.substring(0, 80) + "..." : cleanDesc;
  const finalDesc = `[${category}] ${truncatedDesc}\n지금 D-VIEW 라운지에서 확인하고 소통하세요!`;
  
  const titleText = `라운지 인기글: "${title}"`;

  try {
    const sdkOk = await checkKakaoSdkAndFallback(titleText, finalDesc, shareUrl, "카카오톡 연결을 불러올 수 없어, 대신", undefined, toastFn);
    if (!sdkOk) return;

    window.Kakao!.Share.sendDefault({
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
    const msg = "공유 진행 중 오류가 발생했습니다: " + errMessage;
    if (toastFn) toastFn(msg);
    else alert(msg);
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

export const shareJeonseSafetyToKakao = async (params: ShareJeonseSafetyParams, toastFn?: (msg: string) => void) => {
  const validation = ShareJeonseSafetyParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareJeonseSafetyToKakao', 'Invalid parameters provided for Jeonse Safety sharing', {
      error: String(validation.error),
      params
    });
    const msg = '공유 데이터가 올바르지 않습니다.';
    if (toastFn) toastFn(msg);
    else alert(msg);
    return;
  }
  const { aptName, dong, marketPrice, jeonseAmount, lienAmount, debtRatio, riskLabel } = validation.data;

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

  const titleText = `${aptName} (${dong}) 전세 안심진단`;
  const fallbackDesc = `진단 결과: ${riskLabel} (부채비율 ${debtRatio.toFixed(1)}%)\n매매시세: ${marketPriceStr}\n전세금: ${jeonseStr} | 융자금: ${lienStr}`;
  const fallbackUrl = `${window.location.origin}/overview#apt=${encodeURIComponent(aptName)}&calc=jeonse&utm_source=clipboard&utm_medium=share&utm_campaign=jeonse_share`;

  try {
    const sdkOk = await checkKakaoSdkAndFallback(titleText, fallbackDesc, fallbackUrl, "카카오톡 연결을 불러올 수 없어, 대신", undefined, toastFn);
    if (!sdkOk) return;

    const baseUrl = window.location.origin;
    const finalImageUrl = `${baseUrl}/api/og?type=jeonse&title=${encodeURIComponent(aptName)}&status=${encodeURIComponent(riskLabel)}&ratio=${debtRatio.toFixed(1)}&price=${encodeURIComponent(marketPriceStr)}&lien=${encodeURIComponent(lienStr)}&totalDebt=${encodeURIComponent(totalDebtStr)}`;

    const description = `🚨 HUG 보증보험 가입 여부 및 경매 낙찰 안전마진 진단 결과:\n보증금 ${jeonseStr} | 부채비율 ${debtRatio.toFixed(1)}% [${riskLabel}]\n소중한 보증금 반환 안전 지수를 D-VIEW에서 1초 만에 진단받으세요!`;
    const shareUrl = `${window.location.origin}/overview#apt=${encodeURIComponent(aptName)}&calc=jeonse&utm_source=kakaotalk&utm_medium=share&utm_campaign=jeonse_share`;

    window.Kakao!.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `⚠️ 내 전세금, 깡통전세 위험은? [${aptName} 안전진단]`,
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
    const msg = "공유 진행 중 오류가 발생했습니다: " + errMessage;
    if (toastFn) toastFn(msg);
    else alert(msg);
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

export const shareMortgageToKakao = async (params: ShareMortgageParams, toastFn?: (msg: string) => void) => {
  const validation = ShareMortgageParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareMortgageToKakao', 'Invalid parameters provided for Mortgage sharing', {
      error: String(validation.error),
      params
    });
    const msg = '공유 데이터가 올바르지 않습니다.';
    if (toastFn) toastFn(msg);
    else alert(msg);
    return;
  }
  const { aptName, dong, marketPrice, bestProduct, maxLoanAmount, finalRate, monthlyPayment, ownCapitalRequired } = validation.data;

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

  const titleText = `${aptName} (${dong}) 주담대 진단`;
  const fallbackDesc = `추천 상품: ${bestProduct}\n대출 한도: ${maxLoanStr} (금리 ${finalRate.toFixed(2)}%)\n필요 자기자본: ${ownCapitalStr} | 월 상환액: ${monthlyPayStr}`;
  const fallbackUrl = `${window.location.origin}/overview#apt=${encodeURIComponent(aptName)}&calc=mortgage&utm_source=clipboard&utm_medium=share&utm_campaign=mortgage_share`;

  try {
    const sdkOk = await checkKakaoSdkAndFallback(titleText, fallbackDesc, fallbackUrl, "카카오톡 연결을 불러올 수 없어, 대신", undefined, toastFn);
    if (!sdkOk) return;

    const baseUrl = window.location.origin;
    const finalImageUrl = `${baseUrl}/api/og?type=mortgage&title=${encodeURIComponent(aptName)}&bestProduct=${encodeURIComponent(bestProduct)}&price=${encodeURIComponent(maxLoanStr)}&ratio=${finalRate.toFixed(2)}&status=${encodeURIComponent(ownCapitalStr)}&subtitle=${encodeURIComponent(monthlyPayStr)}`;

    const description = `추천 상품: ${bestProduct}\n대출 한도: ${maxLoanStr} (금리 ${finalRate.toFixed(2)}%)\n필요 자기자본: ${ownCapitalStr} | 월 상환액: ${monthlyPayStr}`;
    const shareUrl = `${window.location.origin}/overview#apt=${encodeURIComponent(aptName)}&calc=mortgage&utm_source=kakaotalk&utm_medium=share&utm_campaign=mortgage_share`;

    window.Kakao!.Share.sendDefault({
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
    const msg = "공유 진행 중 오류가 발생했습니다: " + errMessage;
    if (toastFn) toastFn(msg);
    else alert(msg);
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

export const shareTaxToKakao = async (params: ShareTaxParams, toastFn?: (msg: string) => void) => {
  const validation = ShareTaxParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareTaxToKakao', 'Invalid parameters provided for Tax sharing', {
      error: String(validation.error),
      params
    });
    const msg = '공유 데이터가 올바르지 않습니다.';
    if (toastFn) toastFn(msg);
    else alert(msg);
    return;
  }
  const { aptName, dong, marketPrice, ownedHouses, exclusiveArea, acquisitionTax, localEducationTax, ruralSpecialTax, brokerFee, totalCost } = validation.data;

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

  const titleText = `${aptName} (${dong}) 세금/부대비용 진단`;
  const description = `매매가: ${marketPriceStr}\n취득세 등 세금: ${totalTaxStr}\n중개보수: ${brokerFeeStr}\n총 부대비용: ${totalCostStr} (${ownedHousesStr} | ${areaStr})`;
  const shareUrl = `${window.location.origin}/overview#apt=${encodeURIComponent(aptName)}&calc=tax&utm_source=kakaotalk&utm_medium=share&utm_campaign=tax_share`;

  const baseUrl = window.location.origin;
  const finalImageUrl = `${baseUrl}/api/og?type=tax&title=${encodeURIComponent(aptName)}&subtitle=${encodeURIComponent(dong)}&price=${encodeURIComponent(marketPriceStr)}&ratio=${encodeURIComponent(totalCostStr)}&status=${encodeURIComponent(ownedHousesStr)}&lien=${encodeURIComponent(totalTaxStr)}&totalDebt=${encodeURIComponent(brokerFeeStr)}&bestProduct=${encodeURIComponent(areaStr)}`;

  try {
    const sdkOk = await checkKakaoSdkAndFallback(titleText, description, shareUrl, "카카오톡 연결을 불러올 수 없어, 대신", undefined, toastFn);
    if (!sdkOk) return;

    window.Kakao!.Share.sendDefault({
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
    const msg = "공유 진행 중 오류가 발생했습니다: " + errMessage;
    if (toastFn) toastFn(msg);
    else alert(msg);
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

export const shareLocalEventToKakao = async (params: ShareLocalEventParams, toastFn?: (msg: string) => void) => {
  const validation = ShareLocalEventParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareLocalEventToKakao', 'Invalid parameters provided for Local Event sharing', {
      error: String(validation.error),
      params
    });
    const msg = '공유 데이터가 올바르지 않습니다.';
    if (toastFn) toastFn(msg);
    else alert(msg);
    return;
  }
  const { id, title, date, time, location, category, tip } = validation.data;

  const titleText = `[동탄 소식] ${title}`;
  const description = `일시: ${date} (${time})\n장소: ${location}\n꿀팁: ${tip.substring(0, 50)}`;
  const shareUrl = `${window.location.origin}/#lounge?notice=${id}&utm_source=kakaotalk&utm_medium=share&utm_campaign=event_share`;

  const baseUrl = window.location.origin;
  const finalImageUrl = `${baseUrl}/api/og?type=event&title=${encodeURIComponent(title)}&category=${encodeURIComponent(category)}&date=${encodeURIComponent(`${date} (${time})`)}&location=${encodeURIComponent(location)}&tip=${encodeURIComponent(tip.substring(0, 80))}`;

  try {
    const sdkOk = await checkKakaoSdkAndFallback(titleText, description, shareUrl, "카카오톡 연결을 불러올 수 없어, 대신", undefined, toastFn);
    if (!sdkOk) return;

    window.Kakao!.Share.sendDefault({
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
    const msg = "공유 진행 중 오류가 발생했습니다: " + errMessage;
    if (toastFn) toastFn(msg);
    else alert(msg);
  }
};

export interface ShareCompareParams {
  apt1Name: string;
  apt2Name: string;
  scoreApt1: number;
  scoreApt2: number;
}

export const shareCompareToKakao = async (params: ShareCompareParams, toastFn?: (msg: string) => void) => {
  const validation = ShareCompareParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareCompareToKakao', 'Invalid parameters provided for Compare sharing', {
      error: String(validation.error),
      params
    });
    const msg = '공유 데이터가 올바르지 않습니다.';
    if (toastFn) toastFn(msg);
    else alert(msg);
    return;
  }
  const { apt1Name, apt2Name, scoreApt1, scoreApt2 } = validation.data;

  const titleText = `[아파트 1:1 비교] ${apt1Name} VS ${apt2Name}`;
  const description = `종합 비교 판정\n${apt1Name} 우세: ${scoreApt1}개 항목\n${apt2Name} 우세: ${scoreApt2}개 항목`;
  const shareUrl = `${window.location.origin}/#explore?compare=${encodeURIComponent(apt1Name)}:${encodeURIComponent(apt2Name)}&utm_source=kakaotalk&utm_medium=share&utm_campaign=compare_share`;

  const baseUrl = window.location.origin;
  const finalImageUrl = `${baseUrl}/api/og?type=compare&apt1=${encodeURIComponent(apt1Name)}&apt2=${encodeURIComponent(apt2Name)}&score1=${scoreApt1}&score2=${scoreApt2}`;

  try {
    const sdkOk = await checkKakaoSdkAndFallback(titleText, description, shareUrl, "카카오톡 연결을 불러올 수 없어, 대신", undefined, toastFn);
    if (!sdkOk) return;

    window.Kakao!.Share.sendDefault({
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
    const msg = "공유 진행 중 오류가 발생했습니다: " + errMessage;
    if (toastFn) toastFn(msg);
    else alert(msg);
  }
};

export interface ShareLocalNoticeParams {
  id: string;
  title: string;
  dept: string;
  date: string;
  source?: 'bbs' | 'gosi' | 'rail' | 'dong' | 'culture';
}

export const shareLocalNoticeToKakao = async (params: ShareLocalNoticeParams, toastFn?: (msg: string) => void) => {
  const validation = ShareLocalNoticeParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareLocalNoticeToKakao', 'Invalid parameters provided for Local Notice sharing', {
      error: String(validation.error),
      params
    });
    const msg = '공유 데이터가 올바르지 않습니다.';
    if (toastFn) toastFn(msg);
    else alert(msg);
    return;
  }
  const { id, title, dept, date, source } = validation.data;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
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
    titleText = `[동탄 소식] ${title}`;
  }

  try {
    const sdkOk = await checkKakaoSdkAndFallback(titleText, description, shareUrl, "카카오톡 연결을 불러올 수 없어, 대신", undefined, toastFn);
    if (!sdkOk) return;

    window.Kakao!.Share.sendDefault({
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
    const msg = "공유 진행 중 오류가 발생했습니다: " + errMessage;
    if (toastFn) toastFn(msg);
    else alert(msg);
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

export const shareRecommendationsToKakao = async (params: ShareRecommendationsParams, toastFn?: (msg: string) => void) => {
  const validation = ShareRecommendationsParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareRecommendationsToKakao', 'Invalid parameters provided for Recommendations sharing', {
      error: String(validation.error),
      params
    });
    const msg = '공유 데이터가 올바르지 않습니다.';
    if (toastFn) toastFn(msg);
    else alert(msg);
    return;
  }
  const { apt1, score1, apt2, score2, apt3, score3, fallback } = validation.data;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const finalImageUrl = `${baseUrl}/api/og?type=recommend&apt1=${encodeURIComponent(apt1)}&score1=${score1}&apt2=${encodeURIComponent(apt2)}&score2=${score2}&apt3=${encodeURIComponent(apt3)}&score3=${score3}`;

  const titleText = fallback
    ? "동탄 실시간 인기 & 가치 단지 TOP 3"
    : "나를 위한 동탄 AI 맞춤 아파트 TOP 3";
  const description = `AI 분석 결과: 1위 ${apt1} (${score1}%), 2위 ${apt2} (${score2}%), 3위 ${apt3} (${score3}%)\nD-VIEW에서 내 조건에 맞는 단지를 확인하세요.`;
  const shareUrl = `${window.location.origin}/?from=share_recommend&utm_source=kakaotalk&utm_medium=share&utm_campaign=ai_recommendation`;

  try {
    const sdkOk = await checkKakaoSdkAndFallback(titleText, description, shareUrl, "카카오톡 연결을 불러올 수 없어, 대신", undefined, toastFn);
    if (!sdkOk) return;

    window.Kakao!.Share.sendDefault({
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
    const msg = "공유 진행 중 오류가 발생했습니다: " + errMessage;
    if (toastFn) toastFn(msg);
    else alert(msg);
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

export const shareSellTimingToKakao = async (params: ShareSellTimingParams, toastFn?: (msg: string) => void) => {
  const validation = ShareSellTimingParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.shareSellTimingToKakao', 'Invalid parameters provided for Sell Timing sharing', {
      error: String(validation.error),
      params
    });
    const msg = '공유 데이터가 올바르지 않습니다.';
    if (toastFn) toastFn(msg);
    else alert(msg);
    return;
  }
  const { aptName, dong, acquisitionPrice, transferPrice, holdingYears, resideYears, isOneHouse, verdictScore, verdictLabel, totalTax } = validation.data;

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

  const titleText = `${aptName} (${dong}) 매도 가치진단`;
  const description = `매도가: ${transferStr} (취득가: ${acqStr})\n호구지수: ${verdictScore}% [${verdictLabel}]\n보유기간: ${holdingYears}년 | 실거주: ${resideYears}년 (${houseStr})\n예상 총 세금: ${taxStr}`;
  const shareUrl = `${window.location.origin}/overview#apt=${encodeURIComponent(aptName)}&calc=sell_timing&utm_source=kakaotalk&utm_medium=share&utm_campaign=sell_timing_share`;

  const baseUrl = window.location.origin;
  const finalImageUrl = `${baseUrl}/api/og?type=sell_timing&title=${encodeURIComponent(aptName)}&score=${verdictScore}&status=${encodeURIComponent(verdictLabel)}&price=${encodeURIComponent(transferStr)}&ratio=${encodeURIComponent(taxStr)}&subtitle=${encodeURIComponent(dong)}`;

  try {
    const sdkOk = await checkKakaoSdkAndFallback(titleText, description, shareUrl, "카카오톡 연결을 불러올 수 없어, 대신", undefined, toastFn);
    if (!sdkOk) return;

    window.Kakao!.Share.sendDefault({
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
    const msg = "공유 진행 중 오류가 발생했습니다: " + errMessage;
    if (toastFn) toastFn(msg);
    else alert(msg);
  }
};

export const copyAptSummaryToClipboard = async (params: ShareAptParams): Promise<boolean> => {
  const validation = ShareAptParamsSchema.safeParse(params);
  if (!validation.success) {
    logger.warn('kakaoShare.copyAptSummaryToClipboard', 'Invalid parameters for copyAptSummaryToClipboard', {
      error: String(validation.error),
      params
    });
    return false;
  }
  const { aptName, priceEok, priceMan, ratio, valStatus, valAmount, customDesc, maxPrice } = validation.data;

  const priceStr =
    priceMan > 0
      ? `${priceEok}억 ${priceMan.toLocaleString()}만원`
      : `${priceEok}억원`;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  // Utilizes client side hash routing exactly same as shareAptToKakao
  const shareUrl = `${baseUrl}/overview#apt=${encodeURIComponent(aptName)}&utm_source=clipboard&utm_medium=share&utm_campaign=apt_detail`;

  let valuationLabel = '⚖️ 적정 수준 (시세와 적정 가치 균형 상태)';
  if (valStatus === 'undervalued') {
    valuationLabel = `🟢 저평가 상태 (적정가 대비 약 ${valAmount} 메리트!)`;
  } else if (valStatus === 'overvalued') {
    valuationLabel = `🚨 고평가 상태 (적정가 대비 약 ${valAmount} 고평가)`;
  }

  // Calculate highest price drop
  const priceNum = priceEok + (priceMan / 10000);
  const dropPriceEok = maxPrice && maxPrice > priceNum ? maxPrice - priceNum : 0;
  const dropStr = dropPriceEok > 0
    ? ` (📉 최고가 대비 -${dropPriceEok.toFixed(1)}억 하락!)`
    : '';

  let text = `📢 [DVIEW] 동탄 ${aptName} 실거래 & 가치분석 리포트 요약 📊\n`;
  text += `🔥 "동탄 입주민 단톡방 및 맘카페 화제의 그 리포트!"\n`;
  text += `👉 안심하고 거주할 수 있는 환경일까요? 주거 안심 가치분석 결과:\n\n`;
  text += `💸 최근 실거래가: ${priceStr}${dropStr}\n`;
  text += `📊 실거래 전세가율: ${ratio.toFixed(1)}%\n`;
  text += `📈 내재가치 평가: ${valuationLabel}\n`;
  
  if (customDesc) {
    text += `${customDesc}`;
  }

  text += `👀 적정 매수가(DCF) 평가 결과 및 학원 셔틀 노선, 대장 단지 비교 분석 완료!\n`;
  text += `💡 실거래 상승/하락 추이와 학원가, 역세권 미래 호재를 지금 바로 확인해보세요.\n`;
  text += `👉 ${shareUrl}\n\n`;
  text += `#DVIEW #동탄부동산 #가치분석 #아파트실거래 #학세권 #동탄맘 #신혼부부`;

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      textArea.remove();
      return success;
    }
  } catch (err) {
    logger.error('kakaoShare.copyAptSummaryToClipboard', 'Failed to copy text', { error: String(err) });
    return false;
  }
};
