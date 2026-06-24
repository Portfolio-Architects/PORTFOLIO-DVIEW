import { formatTimestamp, parseTimestampToMillis, getKSTDateString } from './date';

describe('Date Parsing and Formatting Utility', () => {
  describe('formatTimestamp', () => {
    it('should format Firestore Timestamp objects with toDate method correctly', () => {
      const mockTimestamp = {
        toDate: () => new Date('2026-06-24T12:00:00Z'),
      };
      // For new Date('2026-06-24T12:00:00Z'), the local date might depend on system timezone.
      // So we test matching the pattern /^\d{4}\. \d{1,2}\. \d{1,2}\.$/.
      const result = formatTimestamp(mockTimestamp);
      expect(result).toMatch(/^\d{4}\. \d{1,2}\. \d{1,2}\.$/);
    });

    it('should format Firestore raw seconds timestamp objects correctly', () => {
      const mockTimestamp = { seconds: 1774353600 }; // 2026-03-25T12:00:00Z
      const result = formatTimestamp(mockTimestamp);
      expect(result).toMatch(/^\d{4}\. \d{1,2}\. \d{1,2}\.$/);
    });

    it('should format Firestore admin raw _seconds timestamp objects correctly', () => {
      const mockTimestamp = { _seconds: 1774353600 };
      const result = formatTimestamp(mockTimestamp);
      expect(result).toMatch(/^\d{4}\. \d{1,2}\. \d{1,2}\.$/);
    });

    it('should format standard JavaScript Date objects correctly', () => {
      const date = new Date('2026-12-31T23:59:59Z');
      const result = formatTimestamp(date);
      expect(result).toMatch(/^\d{4}\. \d{1,2}\. \d{1,2}\.$/);
    });

    it('should format valid date strings correctly', () => {
      const dateStr = '2026-01-01T00:00:00Z';
      const result = formatTimestamp(dateStr);
      expect(result).toMatch(/^\d{4}\. \d{1,2}\. \d{1,2}\.$/);
    });

    it('should return fallback for invalid date strings', () => {
      expect(formatTimestamp('not-a-date', 'fallback')).toBe('fallback');
    });

    it('should return fallback for null/undefined/missing values', () => {
      expect(formatTimestamp(null, 'fallback-null')).toBe('fallback-null');
      expect(formatTimestamp(undefined)).toBe('방금 전');
    });
  });

  describe('parseTimestampToMillis', () => {
    it('should parse Firestore Timestamp objects with toMillis method', () => {
      const mockTimestamp = {
        toMillis: () => 1774353600000,
      };
      expect(parseTimestampToMillis(mockTimestamp)).toBe(1774353600000);
    });

    it('should parse Firestore Timestamp objects with toDate method', () => {
      const mockTimestamp = {
        toDate: () => new Date(1774353600000),
      };
      expect(parseTimestampToMillis(mockTimestamp)).toBe(1774353600000);
    });

    it('should parse Firestore raw seconds objects', () => {
      const mockTimestamp = { seconds: 1774353600 };
      expect(parseTimestampToMillis(mockTimestamp)).toBe(1774353600000);
    });

    it('should parse Firestore admin raw _seconds objects', () => {
      const mockTimestamp = { _seconds: 1774353600 };
      expect(parseTimestampToMillis(mockTimestamp)).toBe(1774353600000);
    });

    it('should parse valid ISO strings/dates', () => {
      const dateStr = '2026-03-25T12:00:00Z';
      const expectedMillis = new Date(dateStr).getTime();
      expect(parseTimestampToMillis(dateStr)).toBe(expectedMillis);
    });

    it('should return fallback on invalid date inputs', () => {
      expect(parseTimestampToMillis('invalid-date', 999)).toBe(999);
      expect(parseTimestampToMillis(null, 123)).toBe(123);
    });
  });

  describe('getKSTDateString', () => {
    it('should format date in YYYY-MM-DD in KST (Seoul) timezone', () => {
      // 2026-06-23T20:00:00Z is 2026-06-24T05:00:00 in KST (+9h)
      const date = new Date('2026-06-23T20:00:00Z');
      expect(getKSTDateString(date)).toBe('2026-06-24');
    });

    it('should format morning UTC to the same KST day', () => {
      // 2026-06-24T01:00:00Z is 2026-06-24T10:00:00 in KST
      const date = new Date('2026-06-24T01:00:00Z');
      expect(getKSTDateString(date)).toBe('2026-06-24');
    });

    it('should default to current time formatting', () => {
      const result = getKSTDateString();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
