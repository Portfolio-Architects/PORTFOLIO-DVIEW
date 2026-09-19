/**
 * @module admin.config
 * @description Admin authorization configuration (neutralized for public anonymous service).
 */

/** Authorized admin email addresses - empty list in public mode */
export const ADMIN_EMAILS: readonly string[] = [];

/**
 * Checks if a given email belongs to an admin user.
 * Always returns false in public mode.
 * @returns false
 */
export function isAdmin(_email?: string | null | undefined): boolean {
  return false;
}
