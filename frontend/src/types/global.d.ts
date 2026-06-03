interface KakaoUploadResponse {
  infos: {
    original: {
      url: string;
    };
  };
}

interface KakaoShareLink {
  mobileWebUrl: string;
  webUrl: string;
}

interface KakaoShareContent {
  title: string;
  description: string;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  link: KakaoShareLink;
}

interface KakaoShareButton {
  title: string;
  link: KakaoShareLink;
}

interface KakaoShareOptions {
  objectType: string;
  content: KakaoShareContent;
  buttons?: KakaoShareButton[];
}

interface KakaoSDK {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: {
    uploadImage: (options: { file: File[] }) => Promise<KakaoUploadResponse>;
    sendDefault: (options: KakaoShareOptions) => void;
  };
}

interface Window {
  Kakao?: KakaoSDK;
  daum?: any;
}
