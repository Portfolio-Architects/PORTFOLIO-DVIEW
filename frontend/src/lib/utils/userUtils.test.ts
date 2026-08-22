import { getDisplayName, createEmojiAvatar, DEFAULT_AVATARS, getRandomDefaultAvatar } from './userUtils';

describe('userUtils', () => {
  describe('getDisplayName', () => {
    it('returns profile nickname when provided', () => {
      expect(getDisplayName({ nickname: '동탄러' })).toBe('동탄러');
    });

    it('returns default fallback when nickname is empty', () => {
      expect(getDisplayName({ nickname: '' })).toBe('임시_임장러');
    });

    it('returns default fallback when profile is null or undefined', () => {
      expect(getDisplayName(null)).toBe('임시_임장러');
      expect(getDisplayName(undefined)).toBe('임시_임장러');
      expect(getDisplayName({})).toBe('임시_임장러');
    });
  });

  describe('createEmojiAvatar', () => {
    it('generates valid SVG data URI containing the given emoji and gradient colors', () => {
      const result = createEmojiAvatar('🔥', '#FF0000', '#0000FF');
      expect(result).toMatch(/^data:image\/svg\+xml;utf8,/);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;utf8,', ''));
      expect(decoded).toContain('🔥');
      expect(decoded).toContain('#FF0000');
      expect(decoded).toContain('#0000FF');
      expect(decoded).toContain('<svg');
      expect(decoded).toContain('</svg>');
    });
  });

  describe('DEFAULT_AVATARS', () => {
    it('contains 10 pre-configured avatar data URIs', () => {
      expect(DEFAULT_AVATARS).toHaveLength(10);
      DEFAULT_AVATARS.forEach((avatar) => {
        expect(avatar).toMatch(/^data:image\/svg\+xml;utf8,/);
      });
    });
  });

  describe('getRandomDefaultAvatar', () => {
    it('returns an avatar from the DEFAULT_AVATARS list', () => {
      const avatar = getRandomDefaultAvatar();
      expect(DEFAULT_AVATARS).toContain(avatar);
    });
  });
});
