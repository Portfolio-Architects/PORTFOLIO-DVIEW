/**
 * @module nickname.service
 * @description Nickname handling for user profiles.
 * Architecture Layer: Service (pure business logic, no I/O)
 */

export const DEFAULT_NICKNAME = '임시_임장러';

/**
 * Validates that a nickname is between 2 and 10 characters after trimming.
 * Only allows alphanumeric, Korean characters, and underscores.
 */
export function isValidNickname(nickname: string): boolean {
  const trimmed = nickname.trim();
  const len = [...trimmed].length;
  const regex = /^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ_]+$/;
  return len >= 2 && len <= 10 && regex.test(trimmed);
}
