'use client';

import React, { useEffect } from 'react';
import { incrementWebsiteVisit } from '@/lib/repositories/traffic.repository';
import { logger } from '@/lib/services/logger';

/**
 * Global Site Tracker
 * Mounts once per app load. Checks if the user has visited today via localStorage.
 * If not, it increments the daily websiteVisit counter in Firestore.
 */
const SiteTracker = React.memo(function SiteTracker() {
  useEffect(() => {
    // Only run on the browser
    if (typeof window === 'undefined') return;

    try {
      // Exclude Admin from tracking
      if (localStorage.getItem('dview_is_admin') === 'true') {
        return;
      }

      // Get current date string in KST
      const d = new Date();
      d.setHours(d.getHours() + 9);
      const today = d.toISOString().split('T')[0];

      const lastVisit = localStorage.getItem('dview_last_visit');
      if (lastVisit !== today) {
        localStorage.setItem('dview_last_visit', today);
        // Fire & Forget: increment global stats
        incrementWebsiteVisit().catch((err) => {
          logger.error('SiteTracker.visitIncrement', 'Failed to increment website visit', undefined, err);
        });
      }
    } catch (e) {
      logger.warn('SiteTracker', 'SiteTracker error', undefined, e);
    }
  }, []);

  return null; // Invisible component
});

SiteTracker.displayName = 'SiteTracker';
export default SiteTracker;
