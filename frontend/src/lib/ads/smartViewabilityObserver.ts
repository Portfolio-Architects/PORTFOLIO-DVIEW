/**
 * @module smartViewabilityObserver
 * @description Re-exports SmartViewabilityObserver schemas, types, and engine from adRefreshManager.
 */

export {
  SmartViewabilityConfigSchema,
  type SmartViewabilityConfig,
  type ViewabilitySlotState,
  type SmartViewabilityObserver,
  type ObserveSlotOptions,
  SmartViewabilityEngine,
  smartViewabilityObserver,
  createSmartViewabilityObserver,
  DWELL_TIME_THRESHOLD_MS,
  MIN_INTERSECTION_RATIO,
  MAX_REFRESHES_PER_SLOT,
  VIEWABILITY_TICK_INTERVAL_MS,
} from './adRefreshManager';
