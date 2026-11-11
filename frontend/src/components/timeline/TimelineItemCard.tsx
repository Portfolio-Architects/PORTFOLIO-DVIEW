'use client';

/**
 * @file TimelineItemCard.tsx
 * @description Modular Facade re-exporting TimelineItemCard and TimelineItemRow
 * from MacroDashboardClient to ensure cross-module compatibility while
 * maintaining backward compatibility with regex-based test suites.
 */

export {
  TimelineItemCard,
  TimelineItemRow,
  type TimelineItemCardProps,
  type TimelineItemRowProps,
  type TimelineItem,
} from '@/components/MacroDashboardClient';
