/**
 * Centralized stale time configuration for TanStack Query.
 * All hooks should use these constants for consistent caching behavior.
 */
export const STALE_TIMES = {
  // Lists that change frequently, user-driven updates
  CALLS_LIST: 30 * 1000, // 30 seconds - very dynamic

  // Config lists - change occasionally
  CONFIG_LIST: 5 * 60 * 1000, // 5 minutes
  AGENT_LIST: 5 * 60 * 1000, // 5 minutes

  // Detail views - moderate change frequency
  DETAIL: 2 * 60 * 1000, // 2 minutes
  CALL_DETAIL: 1 * 60 * 1000, // 1 minute - users expect fresh data

  // Dropdowns - rarely change during a session
  DROPDOWN: 5 * 60 * 1000, // 5 minutes

  // Dashboard and analytics - real-time interest
  DASHBOARD: 1 * 60 * 1000, // 1 minute
  ANALYTICS: 2 * 60 * 1000, // 2 minutes
  STATS: 1 * 60 * 1000, // 1 minute

  // Reference data - rarely/never changes
  CONFIG_TYPES: 30 * 60 * 1000, // 30 minutes
  LLM_MODELS: 10 * 60 * 1000, // 10 minutes
} as const;

export type StaleTimeKey = keyof typeof STALE_TIMES;
