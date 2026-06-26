'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { logger } from '@/lib/services/logger';

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
    console.log(`%c[Analytics Event] ${eventName}`, 'color: #ea6100; font-weight: bold;', params);
  }

  // Send to GA4 via @next/third-parties/google only when initialized (production & GA_ID provided)
  if (process.env.NEXT_PUBLIC_GA_ID && process.env.NODE_ENV === 'production') {
    try {
      sendGAEvent({
        event: eventName,
        ...params,
      });
    } catch (err) {
      logger.error('analytics.trackEvent', 'Failed to send GA event', undefined, err);
    }
  }
}
