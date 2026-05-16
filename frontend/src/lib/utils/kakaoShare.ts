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
    
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Kakao SDK 로드 실패"));
    document.head.appendChild(script);
  });
};

export interface ShareAptParams {
  aptName: string;
  priceEok: number;
  priceMan: number;
  ratio: number;
  imageUrl?: string;
}

export const shareAptToKakao = async ({ aptName, priceEok, priceMan, ratio, imageUrl }: ShareAptParams) => {
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

    const description = `최근 실거래가 ${priceStr}, 전세가율 ${ratio.toFixed(1)}%\n현재 D-VIEW에서 10년 치 트렌드를 확인하세요.`;

    const finalImageUrl =
      imageUrl ||
      "https://dongtanview.com/api/og?title=" + encodeURIComponent("동탄 아파트 가치분석");

    // 4002 에러 우회를 위해, 현재 브라우저가 실행중인 도메인(localhost:5000 또는 dongtanview.com)을 그대로 사용
    const shareUrl = `${window.location.origin}/#apt=${encodeURIComponent(aptName)}`;

    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: `${aptName}, 지금 팔면 호구일까? (AI 가치분석)`,
        description: description,
        imageUrl: finalImageUrl,
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
  } catch (error: any) {
    console.error("Kakao Share Error:", error);
    alert("공유 실행 중 오류가 발생했습니다: " + error.message);
  }
};
