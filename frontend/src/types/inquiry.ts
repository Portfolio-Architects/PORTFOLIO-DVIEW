/**
 * @module inquiry
 * @description Canonical models for Advertising Inquiries and Newsletter Subscriptions.
 * Architecture Layer: Domain & Types (zero dependencies, zero logic)
 */

/** Advertisement business inquiry submission */
export interface AdInquiry {
  id?: string;
  companyName: string;
  contactInfo: string;
  message: string;
  email?: string;
  status?: 'pending' | 'reviewed' | 'completed' | string;
  createdAt?: number | string | unknown;
  updatedAt?: number | string | unknown;
}

/** Email notification subscription item */
export interface SubscriptionItem {
  id?: string;
  email: string;
  realtime?: boolean;
  weekly?: boolean;
  status?: 'active' | 'unsubscribed' | string;
  createdAt?: number | string | unknown;
  updatedAt?: number | string | unknown;
}
