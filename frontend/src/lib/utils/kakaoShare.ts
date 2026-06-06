export const initKakao = () => {
  if (typeof window !== "undefined" && window.Kakao) {
    if (!window.Kakao.isInitialized()) {
      const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (key) {
        window.Kakao.init(key);
        console.log("Kakao SDK initialized");
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

// Kakao SDK types and global window extension moved to global.d.ts to centralize typescript declarations.

export interface ShareAptParams {
  aptName: string;
  priceEok: number;
  priceMan: number;
  ratio: number;
  imageUrl?: string;
  imageFile?: File;
  customTitle?: string;
  customDesc?: string;
}

export const shareAptToKakao = async ({ aptName, priceEok, priceMan, ratio, imageUrl, imageFile, customTitle, customDesc }: ShareAptParams) => {
  try {
    // 1. 강제 스크립트 로드 대기
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      console.warn("Kakao SDK not loaded");
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
      console.log("Kakao SDK initialized");
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
        finalImageUrl = `${baseUrl}/api/og?title=${encodeURIComponent(aptName)}&price=${encodeURIComponent(priceStr)}&ratio=${ratio.toFixed(1)}&status=${encodeURIComponent(status)}`;
      } else {
        finalImageUrl = `${window.location.origin}/api/og?title=${encodeURIComponent("동탄 아파트 가치분석")}`;
      }
    }

    // html2canvas로 캡처된 파일이 있을 경우 카카오 서버에 임시 업로드 진행
    if (imageFile) {
      console.log("Uploading generated share card image to Kakao...");
      const uploadRes = await window.Kakao.Share.uploadImage({
        file: [imageFile],
      });
      if (uploadRes && uploadRes.infos && uploadRes.infos.original && uploadRes.infos.original.url) {
        finalImageUrl = uploadRes.infos.original.url;
        console.log("Kakao uploaded image URL:", finalImageUrl);
      } else {
        console.warn("Kakao image upload response did not contain URL:", uploadRes);
      }
    }

    const description = customDesc || `최근 실거래가 ${priceStr}, 전세가율 ${ratio.toFixed(1)}%\n현재 D-VIEW에서 10년 치 트렌드를 확인하세요.`;

    // 4002 에러 우회를 위해, 현재 브라우저가 실행중인 도메인(localhost:5000 또는 dongtanview.com)을 그대로 사용
    // UTM parameters automatically appended for sharing campaign analysis
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
    console.error("Kakao Share Error:", error);
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

export const sharePostToKakao = async ({ postId, title, category, contentSummary, imageUrl }: SharePostParams) => {
  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      console.warn("Kakao SDK not loaded");
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
      console.log("Kakao SDK initialized");
    }

    // Default fallbacks for image URL
    const finalImageUrl = imageUrl || "https://dongtanview.com/api/og?title=" + encodeURIComponent(title);

    // Dynamic sharing URL with UTM tracking parameters
    const shareUrl = `${window.location.origin}/lounge/${postId}?utm_source=kakaotalk&utm_medium=share&utm_campaign=lounge_detail`;

    // Limit content summary length to fit nicely on Kakao feed card
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
    console.error("Kakao Share Error:", error);
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

export const shareJeonseSafetyToKakao = async ({
  aptName,
  dong,
  marketPrice,
  jeonseAmount,
  lienAmount,
  debtRatio,
  riskLabel,
  riskLevel,
}: ShareJeonseSafetyParams) => {
  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      console.warn("Kakao SDK not loaded");
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
      console.log("Kakao SDK initialized");
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
    console.error("Kakao Share Error:", error);
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

export const shareMortgageToKakao = async ({
  aptName,
  dong,
  marketPrice,
  bestProduct,
  maxLoanAmount,
  finalRate,
  monthlyPayment,
  ownCapitalRequired,
}: ShareMortgageParams) => {
  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      console.warn("Kakao SDK not loaded");
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
      console.log("Kakao SDK initialized");
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
    console.error("Kakao Share Error:", error);
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

export const shareLocalEventToKakao = async ({
  id,
  title,
  date,
  time,
  location,
  category,
  tip,
}: ShareLocalEventParams) => {
  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      console.warn("Kakao SDK not loaded");
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
      console.log("Kakao SDK initialized");
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
    console.error("Kakao Share Error:", error);
    alert("공유 진행 중 오류가 발생했습니다: " + errMessage);
  }
};

export interface ShareCompareParams {
  apt1Name: string;
  apt2Name: string;
  scoreApt1: number;
  scoreApt2: number;
}

export const shareCompareToKakao = async ({
  apt1Name,
  apt2Name,
  scoreApt1,
  scoreApt2,
}: ShareCompareParams) => {
  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      console.warn("Kakao SDK not loaded");
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
      console.log("Kakao SDK initialized");
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
    console.error("Kakao Share Error:", error);
    alert("공유 진행 중 오류가 발생했습니다: " + errMessage);
  }
};

export interface ShareLocalNoticeParams {
  id: string;
  title: string;
  dept: string;
  date: string;
}

export const shareLocalNoticeToKakao = async ({
  id,
  title,
  dept,
  date,
}: ShareLocalNoticeParams) => {
  try {
    await loadKakaoSdk();

    if (typeof window === "undefined" || !window.Kakao) {
      console.warn("Kakao SDK not loaded");
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
      console.log("Kakao SDK initialized");
    }

    const baseUrl = window.location.origin;
    const finalImageUrl = `${baseUrl}/api/og?type=notice&title=${encodeURIComponent(title)}&dept=${encodeURIComponent(dept)}&date=${encodeURIComponent(date)}`;

    const description = `작성부서: ${dept}\n등록일자: ${date}\nD-VIEW에서 동탄구 소식 상세 내용을 확인하세요.`;

    const shareUrl = `${window.location.origin}/lounge?notice=${id}&utm_source=kakaotalk&utm_medium=share&utm_campaign=notice_share`;

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `[동탄구 소식] ${title}`,
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
          title: "소식 상세 보기",
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error("Kakao Share Error:", error);
    alert("공유 진행 중 오류가 발생했습니다: " + errMessage);
  }
};



