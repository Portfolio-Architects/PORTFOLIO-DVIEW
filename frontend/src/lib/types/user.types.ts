/**
 * @module user.types
 * @description Backward-compatibility re-export barrel for User types and helpers.
 * @deprecated Prefer importing types from '@/types' or '@/types/user', and runtime helpers from '@/lib/utils/userUtils'.
 */

export type {
  VerificationLevel,
  UserProfile,
  UserRole,
  AuthUser,
} from '@/types/user';

export {
  getDisplayName,
  createEmojiAvatar,
  DEFAULT_AVATARS,
  getRandomDefaultAvatar,
} from '@/lib/utils/userUtils';
