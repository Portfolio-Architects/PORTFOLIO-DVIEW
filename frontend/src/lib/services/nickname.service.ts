/**
 * @module nickname.service
 * @description Nickname handling for user profiles.
 * Architecture Layer: Service (pure business logic, no I/O)
 */

export const DEFAULT_NICKNAME = '매니저';

/**
 * Validates that a nickname is between 2 and 10 characters.
 */
export function isValidNickname(nickname: string): boolean {
  const len = [...nickname].length;
  return len >= 2 && len <= 10;
}
