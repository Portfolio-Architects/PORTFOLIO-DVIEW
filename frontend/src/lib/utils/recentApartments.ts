export interface RecentApartmentItem {
  name: string;
  dong: string;
  timestamp: number;
}

const RECENT_APTS_STORAGE_KEY = 'dview_recent_selected_apts';
const MAX_RECENT_APTS = 8;

export function getRecentApartments(): RecentApartmentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_APTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is RecentApartmentItem =>
        item && typeof item.name === 'string' && typeof item.dong === 'string'
    );
  } catch {
    return [];
  }
}

export function addRecentApartment(apt: { name: string; dong: string }): RecentApartmentItem[] {
  if (typeof window === 'undefined' || !apt?.name) return [];
  try {
    const current = getRecentApartments();
    const filtered = current.filter((item) => item.name !== apt.name);
    const updated: RecentApartmentItem[] = [
      { name: apt.name, dong: apt.dong || '', timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENT_APTS);
    window.localStorage.setItem(RECENT_APTS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function removeRecentApartment(aptName: string): RecentApartmentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getRecentApartments();
    const updated = current.filter((item) => item.name !== aptName);
    window.localStorage.setItem(RECENT_APTS_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearRecentApartments(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(RECENT_APTS_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}
