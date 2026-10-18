/**
 * @module userUtils
 * @description Runtime helper functions for user profiles and SVG avatar generation.
 * Architecture Layer: Infrastructure & Utility (pure utility functions)
 */

import type { UserProfile } from '@/types/user';

/**
 * Returns the display name of a user, defaulting to '임시_임장러' if unset.
 * @param profile - User profile entity
 * @returns Sanitized display name string
 */
export function getDisplayName(profile?: Partial<UserProfile> | null): string {
  return profile?.nickname || '임시_임장러';
}

/**
 * Generates an SVG Data URI avatar with custom emoji and background gradient.
 * @param emoji - Unicode emoji string to display in avatar center
 * @param gradientStart - Hex color for gradient start
 * @param gradientEnd - Hex color for gradient end
 * @returns Base64/URI encoded SVG data string
 */
export function createEmojiAvatar(emoji: string, gradientStart: string, gradientEnd: string): string {
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

/** Pre-configured set of default friendly avatar SVG data URLs */
export const DEFAULT_AVATARS: readonly string[] = [
  createEmojiAvatar('D', '#F1F5F9', '#E2E8F0'), // Slate-100 to Slate-200
  createEmojiAvatar('V', '#ECFDF5', '#D1FAE5'), // Emerald-50 to Emerald-100
  createEmojiAvatar('I', '#EFF6FF', '#DBEAFE'), // Blue-50 to Blue-100
  createEmojiAvatar('E', '#F8FAFC', '#E2E8F0'), // Slate-50 to Slate-200
  createEmojiAvatar('W', '#ECFDF5', '#A7F3D0'), // Emerald-50 to Emerald-200
  createEmojiAvatar('동', '#EFF6FF', '#BFDBFE'), // Blue-50 to Blue-200
  createEmojiAvatar('탄', '#F1F5F9', '#CBD5E1'), // Slate-100 to Slate-300
  createEmojiAvatar('1', '#ECFDF5', '#6EE7B7'), // Emerald-50 to Emerald-300
  createEmojiAvatar('2', '#EFF6FF', '#93C5FD'), // Blue-50 to Blue-300
  createEmojiAvatar('A', '#F8FAFC', '#CBD5E1'), // Slate-50 to Slate-300
];

/**
 * Returns a randomly selected default avatar URL.
 * @returns Random SVG data URL from DEFAULT_AVATARS
 */
export function getRandomDefaultAvatar(): string {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
}
