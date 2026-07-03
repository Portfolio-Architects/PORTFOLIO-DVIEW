/**
 * @module nickname.service
 * @description Nickname handling for user profiles.
 * Architecture Layer: Service (pure business logic, no I/O)
 */

import { NicknameSchema } from '@/lib/validation/facade.schemas';

export const DEFAULT_NICKNAME = '임시_임장러';

/**
 * Validates that a nickname is between 2 and 10 characters after trimming.
 * Only allows alphanumeric, Korean characters, and underscores.
 */
export function isValidNickname(nickname: string): boolean {
  if (typeof nickname !== 'string') return false;
  return NicknameSchema.safeParse(nickname).success;
}

