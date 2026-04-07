import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SmartRemindersPanel } from '@/components/profile/SmartRemindersPanel';
import { DEFAULT_SMART_REMINDER_SETTINGS } from '@/types/reminders';

const mockUseOnboarding = jest.fn();
const mockUseAuth = jest.fn();
const mockUseLanguage = jest.fn();
const mockCheckPermissions = jest.fn();
const mockScheduleSmartReminder = jest.fn();
const mockLoadSettings = jest.fn();
const mockSaveSettings = jest.fn();
const mockResolveReminderUserId = jest.fn();
const mockReschedule = jest.fn();
const mockBuildShiftCycle = jest.fn();
let mockTimePickerSelection: string | null = null;

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const RN = require('react-native');

  return {
    __esModule: true,
    default: {
      View: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
        React.createElement(RN.View, props, children),
    },
    FadeInUp: {
      delay: () => ({
        duration: () => undefined,
      }),
    },
  };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Medium: 'medium',
  },
  NotificationFeedbackType: {
    Success: 'success',
  },
}));

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => mockUseOnboarding(),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockUseLanguage(),
}));

jest.mock('@/services/NotificationService', () => ({
  notificationService: {
    checkPermissions: (...args: unknown[]) => mockCheckPermissions(...args),
    scheduleSmartReminder: (...args: unknown[]) => mockScheduleSmartReminder(...args),
  },
}));

jest.mock('@/services/SmartReminderSettingsService', () => ({
  smartReminderSettingsService: {
    load: (...args: unknown[]) => mockLoadSettings(...args),
    save: (...args: unknown[]) => mockSaveSettings(...args),
  },
  resolveReminderUserId: (...args: unknown[]) => mockResolveReminderUserId(...args),
}));

jest.mock('@/services/SmartReminderOrchestrator', () => ({
  SmartReminderOrchestrator: jest.fn().mockImplementation(() => ({
    reschedule: (...args: unknown[]) => mockReschedule(...args),
  })),
}));

jest.mock('@/services/ShiftDataService', () => ({
  ShiftDataService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@/services/StorageService', () => ({
  getStorageService: jest.fn(() => ({})),
}));

jest.mock('@/utils/shiftUtils', () => ({
  buildShiftCycle: (...args: unknown[]) => mockBuildShiftCycle(...args),
}));

jest.mock('@/components/onboarding/premium/TimePickerModal', () => ({
  TimePickerModal: ({
    visible,
    initialTime,
    onConfirm,
  }: {
    visible: boolean;
    initialTime: string;
    onConfirm: (value: string) => void;
  }) => {
    if (!visible) {
      return null;
    }

    const React = require('react');
    const RN = require('react-native');
    return React.createElement(
      RN.TouchableOpacity,
      {
        testID: 'time-picker-confirm',
        onPress: () => onConfirm(mockTimePickerSelection ?? initialTime),
      },
      React.createElement(RN.Text, null, 'Confirm')
    );
  },
}));

describe('SmartRemindersPanel', () => {
  const onboardingData = {
    name: 'Ilyasu',
    startDate: new Date('2026-04-01T00:00:00.000Z'),
    patternType: 'STANDARD_4_4_4',
    rosterType: 'fifo',
    shiftTimes: {
      dayShift: { startTime: '07:00', endTime: '19:00', duration: 12 as const },
      nightShift: { startTime: '19:00', endTime: '07:00', duration: 12 as const },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockTimePickerSelection = null;
    mockUseOnboarding.mockReturnValue({ data: onboardingData });
    mockUseAuth.mockReturnValue({ user: { uid: 'user-1' } });
    mockUseLanguage.mockReturnValue({ language: 'en' });
    mockLoadSettings.mockResolvedValue(DEFAULT_SMART_REMINDER_SETTINGS);
    mockSaveSettings.mockResolvedValue(DEFAULT_SMART_REMINDER_SETTINGS);
    mockResolveReminderUserId.mockResolvedValue('user-1');
    mockCheckPermissions.mockResolvedValue(true);
    mockScheduleSmartReminder.mockResolvedValue('notification-1');
    mockReschedule.mockResolvedValue(undefined);
    mockBuildShiftCycle.mockReturnValue({
      patternType: 'STANDARD_4_4_4',
      startDate: '2026-04-01',
      phaseOffset: 0,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('loads persisted settings and renders the reminder sections', async () => {
    const { getByText } = render(<SmartRemindersPanel />);

    await waitFor(() => {
      expect(mockLoadSettings).toHaveBeenCalledWith('user-1');
    });

    expect(getByText('TIMING')).toBeTruthy();
    expect(getByText('DO NOT DISTURB')).toBeTruthy();
    expect(getByText('ADAPTIVE')).toBeTruthy();
    expect(getByText('FIFO')).toBeTruthy();
  });

  it('persists setting changes and reschedules reminders', async () => {
    const { getByText } = render(<SmartRemindersPanel />);

    await waitFor(() => {
      expect(mockLoadSettings).toHaveBeenCalled();
    });

    fireEvent.press(getByText('12 h'));

    await waitFor(() => {
      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          earlyReminderHours: 12,
        }),
        'user-1'
      );
    });

    await waitFor(() => {
      expect(mockReschedule).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          settings: expect.objectContaining({
            earlyReminderHours: 12,
          }),
        })
      );
    });
  });

  it('uses the resolved reminder identity when sending a test notification', async () => {
    const { getByLabelText } = render(<SmartRemindersPanel />);

    await waitFor(() => {
      expect(mockLoadSettings).toHaveBeenCalled();
    });

    fireEvent.press(getByLabelText('Send a test reminder in 5 seconds'));

    await waitFor(() => {
      expect(mockScheduleSmartReminder).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          data: expect.objectContaining({ test: true }),
        })
      );
    });
  });

  it('opens the quiet-hours picker and saves the selected time', async () => {
    mockLoadSettings.mockResolvedValue({
      ...DEFAULT_SMART_REMINDER_SETTINGS,
      quietHoursEnabled: true,
    });

    const { getByLabelText, getByTestId } = render(<SmartRemindersPanel />);

    await waitFor(() => {
      expect(mockLoadSettings).toHaveBeenCalled();
    });

    fireEvent.press(getByLabelText('Quiet hours start: 10:00 PM'));
    fireEvent.press(getByTestId('time-picker-confirm'));

    await waitFor(() => {
      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          quietHoursStart: '22:00',
        }),
        'user-1'
      );
    });
  });

  it('shows a clear permission notice when settings save but notifications are disabled', async () => {
    mockCheckPermissions.mockResolvedValue(false);

    const { getByText, findByText } = render(<SmartRemindersPanel />);

    await waitFor(() => {
      expect(mockLoadSettings).toHaveBeenCalled();
    });

    fireEvent.press(getByText('12 h'));

    await waitFor(() => {
      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          earlyReminderHours: 12,
        }),
        'user-1'
      );
    });

    expect(
      await findByText(
        'Settings were saved, but notifications are off so reminders were not rescheduled. Enable notifications in Settings to apply them.'
      )
    ).toBeTruthy();
    expect(mockReschedule).not.toHaveBeenCalled();
  });

  it('adjusts zero-width quiet hours to a minimum 30-minute window', async () => {
    mockLoadSettings.mockResolvedValue({
      ...DEFAULT_SMART_REMINDER_SETTINGS,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '06:00',
    });
    mockTimePickerSelection = '22:00';

    const { getByLabelText, getByTestId, findByText } = render(<SmartRemindersPanel />);

    await waitFor(() => {
      expect(mockLoadSettings).toHaveBeenCalled();
    });

    fireEvent.press(getByLabelText('Quiet hours end: 6:00 AM'));
    fireEvent.press(getByTestId('time-picker-confirm'));

    await waitFor(() => {
      expect(mockSaveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          quietHoursStart: '22:00',
          quietHoursEnd: '22:30',
        }),
        'user-1'
      );
    });

    expect(await findByText('Quiet hours adjusted to a 30-minute minimum window.')).toBeTruthy();
  });

  it('restores the previous settings if saving fails', async () => {
    mockSaveSettings.mockRejectedValueOnce(new Error('save failed'));

    const { getByText, findByText } = render(<SmartRemindersPanel />);

    await waitFor(() => {
      expect(mockLoadSettings).toHaveBeenCalled();
    });

    fireEvent.press(getByText('12 h'));

    expect(
      await findByText(
        'Reminder settings could not be saved right now. Your previous settings were restored.'
      )
    ).toBeTruthy();
    expect(mockReschedule).not.toHaveBeenCalled();
  });
});
