'use client';

import { sendGAEvent } from '@next/third-parties/google';

/**
 * Tracks a custom event in Google Analytics 4 (GA4).
 * If in development mode, it logs the event to the console instead.
 * Admin users are excluded from tracking.
 * 
 * @param eventName The event name (e.g., 'search_apartment', 'view_apartment')
 * @param params Custom event parameters
 */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  try {
    // Exclude Admin from tracking
    if (localStorage.getItem('dview_is_admin') === 'true') {
      return;
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  // In development, log to developer console
  if (process.env.NODE_ENV === 'development') {
    console.log(`%c[Analytics Event] ${eventName}`, 'color: #00d29d; font-weight: bold;', params);
  }

  // Send to GA4 via @next/third-parties/google
  try {
    sendGAEvent({
      event: eventName,
      ...params,
    });
  } catch (err) {
    console.error('Failed to send GA event:', err);
  }
}
