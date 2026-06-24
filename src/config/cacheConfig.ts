const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export const CACHE_TTL_MS = {
  userProfile: MS_PER_DAY,
  shiftSchedules: 7 * MS_PER_DAY,
  activeSchedule: 7 * MS_PER_DAY,
  reminderSettings: 7 * MS_PER_DAY,
  holidays: 30 * MS_PER_DAY,
  revenueCatOfferings: MS_PER_DAY,
  paywallRecoveryWindow: 7 * MS_PER_DAY,
  paywallRecoveryMinimumDelay: 5 * MS_PER_MINUTE,
  storageMaintenanceInterval: MS_PER_DAY,
} as const;

export const CACHE_TTL_SECONDS = {
  voiceAssistantPersistence: 12 * 60 * 60,
} as const;

export const CACHE_PREFIXES = {
  shifts: 'shifts',
  holidays: 'holidays',
} as const;
