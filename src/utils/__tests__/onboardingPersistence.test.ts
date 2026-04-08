import {
  loadPersistedOnboardingData,
  readPersistedOnboardingCompletionStatus,
  sanitizePersistedOnboardingData,
} from '@/utils/onboardingPersistence';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { ShiftPattern } from '@/types';

jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

const completePersistedData = {
  name: 'Jordan',
  shiftSystem: '2-shift',
  patternType: ShiftPattern.STANDARD_3_3_3,
  phaseOffset: 1,
  startDate: '2026-02-03',
  shiftTimes: {
    dayShift: {
      startTime: '07:00',
      endTime: '19:00',
      duration: 12,
    },
  },
};

describe('onboardingPersistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sanitizes persisted onboarding data and normalizes calendar dates', () => {
    const result = sanitizePersistedOnboardingData({
      ...completePersistedData,
      unknown: 'ignore me',
    });

    expect(result).toMatchObject({
      name: 'Jordan',
      shiftSystem: '2-shift',
      patternType: ShiftPattern.STANDARD_3_3_3,
    });
    expect(result?.startDate).toBeInstanceOf(Date);
    expect((result as { unknown?: string }).unknown).toBeUndefined();
  });

  it('returns null when persisted data shape is invalid', async () => {
    jest.mocked(asyncStorageService.get).mockResolvedValueOnce({
      shiftSystem: '2-shift',
      phaseOffset: 'wrong-type',
    });

    await expect(loadPersistedOnboardingData()).resolves.toBeNull();
  });

  it('self-heals the completion flag when stored data is complete', async () => {
    jest
      .mocked(asyncStorageService.get)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(completePersistedData);

    await expect(readPersistedOnboardingCompletionStatus()).resolves.toBe(true);
    expect(asyncStorageService.set).toHaveBeenCalledWith('onboarding:complete', true);
  });

  it('clears a stale completion flag when stored data is incomplete', async () => {
    jest
      .mocked(asyncStorageService.get)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce({ name: 'Jordan' });

    await expect(readPersistedOnboardingCompletionStatus()).resolves.toBe(false);
    expect(asyncStorageService.set).toHaveBeenCalledWith('onboarding:complete', false);
  });
});
