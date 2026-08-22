/**
 * @module notice
 * @description Canonical domain models for Local Government Notices and Curated News.
 * Architecture Layer: Domain & Types (zero dependencies, zero logic)
 */

/** Local administrative and municipal notice item */
export interface NoticeItem {
  id: string;
  originalId?: string;
  title: string;
  url: string;
  dept: string;
  date: string;
  isDongtan: boolean;
  source?: 'bbs' | 'gosi' | 'rail' | 'dong' | 'culture';
  createdAt?: string;
  content?: string;
}

export type LocalNoticeItem = NoticeItem;

/** Google News RSS curated item */
export interface GoogleNewsItem {
  title?: string;
  link?: string;
  pubDate?: string;
}
