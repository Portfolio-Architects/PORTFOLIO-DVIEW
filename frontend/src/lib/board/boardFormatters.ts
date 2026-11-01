/**
 * DVIEW Board Formatting & Date Utilities
 * Ad Money v5.0 Design System: Tabular nums and clean Korean relative time
 */

export function formatRelativeTime(timestamp: number): string {
  if (!timestamp || !Number.isFinite(timestamp)) return '';
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '방금 전';
  if (diff < hour) return `${Math.floor(diff / minute)}분 전`;
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`;
  if (diff < 2 * day) return '어제';

  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');

  return `${year}.${month}.${date}`;
}

export function formatDateTime(timestamp: number): string {
  if (!timestamp || !Number.isFinite(timestamp)) return '';
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}.${month}.${date} ${hours}:${minutes}`;
}
