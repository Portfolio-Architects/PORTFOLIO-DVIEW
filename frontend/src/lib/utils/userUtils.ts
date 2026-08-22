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

/**
 * Returns a randomly selected default avatar URL.
 * @returns Random SVG data URL from DEFAULT_AVATARS
 */
export function getRandomDefaultAvatar(): string {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
}
