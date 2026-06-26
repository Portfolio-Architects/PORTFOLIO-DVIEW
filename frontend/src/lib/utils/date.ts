/**
 * Helper to formatting Date object consistently to "YYYY. M. D." 
 * independent of system language settings to prevent Hydration Mismatch.
 */
function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}. ${month}. ${day}.`;
}

/**
 * Safe conversion of Firestore Timestamp or JavaScript Date/String to localized date string.
 * @param ts - Firestore Timestamp, Date, string, or number
 * @param fallback - Fallback string if value is missing/invalid
 */
export function formatTimestamp(ts: unknown, fallback: string = '방금 전'): string {
  if (!ts) return fallback;
  try {
    if (typeof ts === 'object') {
      const obj = ts as Record<string, unknown>;
      if (typeof obj.toDate === 'function') {
        return formatDateString((obj.toDate as () => Date)());
      }
      // Handle pending serverTimestamp / offline objects
      if (typeof obj.seconds === 'number') {
        return formatDateString(new Date(obj.seconds * 1000));
      }
      if (typeof obj._seconds === 'number') {
        return formatDateString(new Date(obj._seconds * 1000));
      }
    }
    if (typeof ts === 'string' || typeof ts === 'number' || ts instanceof Date) {
      const parsed = new Date(ts);
      if (!isNaN(parsed.getTime())) {
        return formatDateString(parsed);
      }
    }
  } catch (e: unknown) {
    // Silent fail and return fallback
  }
  return fallback;
}

/**
 * Safe conversion of Firestore Timestamp or Date to Milliseconds.
 * @param ts - Firestore Timestamp, Date, string, or number
 * @param fallback - Fallback timestamp in ms
 */
export function parseTimestampToMillis(ts: unknown, fallback: number = 0): number {
  if (!ts) return fallback;
  try {
    if (typeof ts === 'object') {
      const obj = ts as Record<string, unknown>;
      if (typeof obj.toMillis === 'function') {
        return (obj.toMillis as () => number)();
      }
      if (typeof obj.toDate === 'function') {
        return (obj.toDate as () => Date)().getTime();
      }
      // Handle pending serverTimestamp / offline objects
      if (typeof obj.seconds === 'number') {
        return obj.seconds * 1000;
      }
      if (typeof obj._seconds === 'number') {
        return obj._seconds * 1000;
      }
    }
    if (typeof ts === 'string' || typeof ts === 'number' || ts instanceof Date) {
      const parsed = new Date(ts);
      if (!isNaN(parsed.getTime())) {
        return parsed.getTime();
      }
    }
  } catch (e: unknown) {
    // Silent fail
  }
  return fallback;
}

/**
 * Returns YYYY-MM-DD date string in KST (Asia/Seoul) timezone.
 * @param date - Custom JavaScript Date object (defaults to current date)
 */
export function getKSTDateString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch (e: unknown) {
    // Fallback to UTC representation if Intl formatter fails
  }
  return date.toISOString().slice(0, 10);
}
