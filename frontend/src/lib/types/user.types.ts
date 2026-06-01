/**
 * @module user.types
 * @description User profile type definitions with apartment verification.
 * Architecture Layer: Types (zero dependencies)
 */

/** 아파트 인증 등급 */
export type VerificationLevel = 'none' | 'self_declared' | 'registry_verified';

/** 사용자 프로필 */
export interface UserProfile {
  /** 닉네임 (기본값 '임시_임장러') */
  nickname: string;
  /** 닉네임 명시적 설정 여부 */
  hasSetNickname?: boolean;
  /** 프로필 사진 URL */
  photoURL?: string;
  /** 인증된 아파트명 (e.g., '[오산동] 동탄역 롯데캐슬') */
  verifiedApartment?: string;
  /** 인증 등급 */
  verificationLevel?: VerificationLevel;
  /** 프로필 생성 시각 */
  createdAt?: unknown;
  /** 업로더 포인트 */
  uploaderPoints?: number;
  /** 업로더 등급 */
  uploaderTier?: string;
}

export function getDisplayName(profile: UserProfile): string {
  return profile.nickname || '임시_임장러';
}

function createEmojiAvatar(emoji: string, gradientStart: string, gradientEnd: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${gradientStart}" />
        <stop offset="100%" stop-color="${gradientEnd}" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="url(#g)" />
    <text x="50%" y="54%" font-size="52" dominant-baseline="central" text-anchor="middle" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.15))">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_AVATARS = [
  createEmojiAvatar('🦦', '#FFF0E5', '#E5F4FB'), // Otter - Soft peach to soft baby blue
  createEmojiAvatar('🍓', '#FFE6E6', '#FFF0F5'), // Strawberry - Baby pink to pale pink
  createEmojiAvatar('🧸', '#FFF6D9', '#FFE4D6'), // Teddy Bear - Pale butter to apricot
  createEmojiAvatar('🦕', '#E6F0FF', '#E6FAFF'), // Dinosaur - Pale sky to pale cyan
  createEmojiAvatar('👻', '#F2E6FF', '#E6F0FF'), // Ghost - Pale lavender to sky blue
  createEmojiAvatar('🍀', '#E6FFE6', '#E6FAFF'), // Clover - Pale mint to cyan
  createEmojiAvatar('🍄', '#FFE6E6', '#FFE6CC'), // Mushroom - Pale pink to peach
  createEmojiAvatar('🦔', '#F5F5F5', '#F0E6E6'), // Hedgehog - Soft gray to pale taupe
  createEmojiAvatar('🍩', '#E6FAFF', '#FFE6F0'), // Donut - Pale cyan to pale rose
  createEmojiAvatar('🦊', '#FFE6E6', '#E6E6FF'), // Fox - Pale pink to pale blue
];

export function getRandomDefaultAvatar(): string {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
}
