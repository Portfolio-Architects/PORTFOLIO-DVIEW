/**
 * Safe conversion of Firestore Timestamp or JavaScript Date/String to localized date string.
 * @param ts - Firestore Timestamp, Date, string, or number
 * @param fallback - Fallback string if value is missing/invalid
 */
export function formatTimestamp(ts: any, fallback: string = '방금 전'): string {
  if (!ts) return fallback;
  try {
    if (typeof ts.toDate === 'function') {
      return ts.toDate().toLocaleDateString('ko-KR');
    }
    // Handle pending serverTimestamp / offline objects
    if (ts.seconds !== undefined && typeof ts.seconds === 'number') {
      return new Date(ts.seconds * 1000).toLocaleDateString('ko-KR');
    }
    if (ts._seconds !== undefined && typeof ts._seconds === 'number') {
      return new Date(ts._seconds * 1000).toLocaleDateString('ko-KR');
    }
    const parsed = new Date(ts);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('ko-KR');
    }
  } catch (e) {
    // Silent fail and return fallback
  }
  return fallback;
}

/**
 * Safe conversion of Firestore Timestamp or Date to Milliseconds.
 * @param ts - Firestore Timestamp, Date, string, or number
 * @param fallback - Fallback timestamp in ms
 */
export function parseTimestampToMillis(ts: any, fallback: number = 0): number {
  if (!ts) return fallback;
  try {
    if (typeof ts.toMillis === 'function') {
      return ts.toMillis();
    }
    if (typeof ts.toDate === 'function') {
      return ts.toDate().getTime();
    }
    // Handle pending serverTimestamp / offline objects
    if (ts.seconds !== undefined && typeof ts.seconds === 'number') {
      return ts.seconds * 1000;
    }
    if (ts._seconds !== undefined && typeof ts._seconds === 'number') {
      return ts._seconds * 1000;
    }
    const parsed = new Date(ts);
    if (!isNaN(parsed.getTime())) {
      return parsed.getTime();
    }
  } catch (e) {
    // Silent fail
  }
  return fallback;
}
