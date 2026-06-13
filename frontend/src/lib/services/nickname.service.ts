/**
 * @module nickname.service
 * @description Nickname handling for user profiles.
 * Architecture Layer: Service (pure business logic, no I/O)
 */

import { z } from 'zod';

export const DEFAULT_NICKNAME = '임시_임장러';

export const NicknameSchema = z
  .string()
  .transform((val) => val.trim())
  .refine(
    (val) => {
      const len = [...val].length;
      return len >= 2 && len <= 10;
    },
    {
      message: 'Nickname must be between 2 and 10 characters long.',
    }
  )
  .refine(
    (val) => /^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ_]+$/.test(val),
    {
      message: 'Nickname can only contain alphanumeric characters, Korean characters, and underscores.',
    }
  );

/**
 * Validates that a nickname is between 2 and 10 characters after trimming.
 * Only allows alphanumeric, Korean characters, and underscores.
 */
export function isValidNickname(nickname: string): boolean {
  if (typeof nickname !== 'string') return false;
  return NicknameSchema.safeParse(nickname).success;
}
