import { renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { ShiftPattern } from '@/types';
import { DEFAULT_SMART_REMINDER_SETTINGS } from '@/types/reminders';

const mockReschedule = jest.fn();
const mockCheckPermissions = jest.fn();
const mockCancelSmartReminders = jest.fn();
const mockResolveReminderUserId = jest.fn();
const mockLoadSettings = jest.fn();
const mockUseAuth = jest.fn();
const mockUseLanguage = jest.fn();
const mockUseOnboarding = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockUseLanguage(),
}));

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => mockUseOnboarding(),
}));

jest.mock('@/services/StorageService', () => ({
  getStorageService: jest.fn(() => ({})),
}));

jest.mock('@/services/NotificationService', () => ({
  notificationService: {
    checkPermissions: (...args: unknown[]) => mockCheckPermissions(...args),
    cancelSmartReminders: (...args: unknown[]) => mockCancelSmartReminders(...args),
  },
}));

jest.mock('@/services/SmartReminderOrchestrator', () => ({
  SmartReminderOrchestrator: jest.fn().mockImplementation(() => ({
    reschedule: (...args: unknown[]) => mockReschedule(...args),
  })),
}));

jest.mock('@/services/SmartReminderSettingsService', () => ({
  resolveReminderUserId: (...args: unknown[]) => mockResolveReminderUserId(...args),
  smartReminderSettingsService: {
    load: (...args: unknown[]) => mockLoadSettings(...args),
  },
}));

import { useSmartReminders } from '@/hooks/useSmartReminders';

describe('useSmartReminders', () => {
  const baseOnboardingData = {
    name: 'Ilyasu',
    startDate: new Date('2026-04-01T00:00:00.000Z'),
    patternType: ShiftPattern.STANDARD_4_4_4,
    shiftSystem: '2-shift' as const,
    rosterType: 'rotating' as const,
    phaseOffset: 0,
    shiftTimes: {
      dayShift: { startTime: '07:00', endTime: '19:00', duration: 12 as const },
      nightShift: { startTime: '19:00', endTime: '07:00', duration: 12 as const },
    },
  };

  let appStateCallback: ((state: string) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { uid: 'auth-user-1' } });
    mockUseLanguage.mockReturnValue({ language: 'en' });
    mockUseOnboarding.mockReturnValue({ data: baseOnboardingData });
    mockCheckPermissions.mockResolvedValue(true);
    mockCancelSmartReminders.mockResolvedValue(undefined);
    mockResolveReminderUserId.mockResolvedValue('auth-user-1');
    mockLoadSettings.mockResolvedValue(DEFAULT_SMART_REMINDER_SETTINGS);
    mockReschedule.mockResolvedValue(undefined);

    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, callback) => {
      appStateCallback = callback as (state: string) => void;
      return { remove: jest.fn() } as never;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reschedules reminders when onboarding data is complete and permission is granted', async () => {
    renderHook(() => useSmartReminders());

    await waitFor(() => {
      expect(mockReschedule).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'auth-user-1',
          userName: 'Ilyasu',
          language: 'en',
          settings: DEFAULT_SMART_REMINDER_SETTINGS,
        })
      );
    });
  });

  it('uses a stable reminder user id when no auth user exists', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    mockUseOnboarding.mockReturnValue({
      data: {
        ...baseOnboardingData,
        name: undefined,
      },
    });
    mockResolveReminderUserId.mockResolvedValue('reminder-user-local-1');

    renderHook(() => useSmartReminders());

    await waitFor(() => {
      expect(mockReschedule).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'reminder-user-local-1',
          userName: '',
        })
      );
    });
  });

  it('does not reschedule without notification permission', async () => {
    mockCheckPermissions.mockResolvedValue(false);

    renderHook(() => useSmartReminders());

    await waitFor(() => {
      expect(mockCheckPermissions).toHaveBeenCalled();
    });
    expect(mockReschedule).not.toHaveBeenCalled();
  });

  it('retries scheduling when the app returns to foreground after permissions change', async () => {
    mockCheckPermissions.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

    renderHook(() => useSmartReminders());

    await waitFor(() => {
      expect(mockCheckPermissions).toHaveBeenCalledTimes(1);
    });

    expect(mockReschedule).not.toHaveBeenCalled();

    appStateCallback?.('active');

    await waitFor(() => {
      expect(mockReschedule).toHaveBeenCalledTimes(1);
    });
  });

  it('does not reschedule again for the same fingerprint on foreground', async () => {
    renderHook(() => useSmartReminders());

    await waitFor(() => {
      expect(mockReschedule).toHaveBeenCalledTimes(1);
    });

    appStateCallback?.('active');

    await waitFor(() => {
      expect(mockCheckPermissions).toHaveBeenCalledTimes(2);
    });
    expect(mockReschedule).toHaveBeenCalledTimes(1);
  });

  it('reschedules again when smart reminder settings change', async () => {
    mockLoadSettings.mockResolvedValueOnce(DEFAULT_SMART_REMINDER_SETTINGS).mockResolvedValueOnce({
      ...DEFAULT_SMART_REMINDER_SETTINGS,
      earlyReminderHours: 4,
    });

    renderHook(() => useSmartReminders());

    await waitFor(() => {
      expect(mockReschedule).toHaveBeenCalledTimes(1);
    });

    appStateCallback?.('active');

    await waitFor(() => {
      expect(mockReschedule).toHaveBeenCalledTimes(2);
    });
  });

  it('cancels the previous user reminders when the resolved reminder identity changes', async () => {
    mockResolveReminderUserId
      .mockResolvedValueOnce('auth-user-1')
      .mockResolvedValueOnce('auth-user-2');

    const { rerender } = renderHook(() => useSmartReminders());

    await waitFor(() => {
      expect(mockReschedule).toHaveBeenCalledTimes(1);
    });

    mockUseAuth.mockReturnValue({ user: { uid: 'auth-user-2' } });
    rerender(undefined);

    await waitFor(() => {
      expect(mockCancelSmartReminders).toHaveBeenCalledWith('auth-user-1');
    });
    expect(mockReschedule).toHaveBeenCalledTimes(2);
  });

  it('cancels existing reminders when onboarding becomes incomplete after a successful schedule', async () => {
    const { rerender } = renderHook(() => useSmartReminders());

    await waitFor(() => {
      expect(mockReschedule).toHaveBeenCalledTimes(1);
    });

    mockUseOnboarding.mockReturnValue({
      data: {
        ...baseOnboardingData,
        patternType: null,
      },
    });

    rerender(undefined);

    await waitFor(() => {
      expect(mockCancelSmartReminders).toHaveBeenCalledWith('auth-user-1');
    });
  });
});
