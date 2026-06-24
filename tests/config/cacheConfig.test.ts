import { CACHE_PREFIXES, CACHE_TTL_MS, CACHE_TTL_SECONDS } from '@/config/cacheConfig';

describe('cacheConfig', () => {
  it('centralizes launch cache TTLs in one auditable config', () => {
    expect(CACHE_TTL_MS.userProfile).toBe(24 * 60 * 60 * 1000);
    expect(CACHE_TTL_MS.shiftSchedules).toBe(7 * 24 * 60 * 60 * 1000);
    expect(CACHE_TTL_MS.activeSchedule).toBe(7 * 24 * 60 * 60 * 1000);
    expect(CACHE_TTL_MS.reminderSettings).toBe(7 * 24 * 60 * 60 * 1000);
    expect(CACHE_TTL_MS.holidays).toBe(30 * 24 * 60 * 60 * 1000);
    expect(CACHE_TTL_MS.revenueCatOfferings).toBe(24 * 60 * 60 * 1000);
    expect(CACHE_TTL_MS.storageMaintenanceInterval).toBe(24 * 60 * 60 * 1000);
    expect(CACHE_TTL_SECONDS.voiceAssistantPersistence).toBe(12 * 60 * 60);
  });

  it('centralizes cache key prefixes used by offline services', () => {
    expect(CACHE_PREFIXES).toEqual({
      shifts: 'shifts',
      holidays: 'holidays',
    });
  });
});
