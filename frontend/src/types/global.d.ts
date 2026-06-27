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
  daum?: unknown;
  NProgress?: {
    done: () => void;
    [key: string]: unknown;
  };
  requestIdleCallback?: (callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
  gc?: () => void;
}

interface Navigator {
  standalone?: boolean;
}

interface CanvasRenderingContext2D {
  letterSpacing?: string;
}

// eslint-disable-next-line no-var
declare var _cachedFileReader: (<T>(filePath: string, fallbackValue: T) => Promise<T>) | undefined;
