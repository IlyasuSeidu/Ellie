import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

const mockUseAuth = jest.fn();
const mockUseLanguage = jest.fn();
const mockUseOnboardingOptional = jest.fn();
const mockSyncPendingLogs = jest.fn();
const mockNetworkListeners = new Set<(snapshot: { status: string }) => void>();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockUseLanguage(),
}));

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboardingOptional: () => mockUseOnboardingOptional(),
}));

jest.mock('@/services/ShiftLogService', () => ({
  shiftLogService: {
    syncPendingLogs: (...args: unknown[]) => mockSyncPendingLogs(...args),
  },
}));

jest.mock('@/services/NetworkService', () => ({
  networkService: {
    subscribe: (listener: (snapshot: { status: string }) => void) => {
      mockNetworkListeners.add(listener);
      listener({ status: 'offline' });
      return () => {
        mockNetworkListeners.delete(listener);
      };
    },
  },
}));

jest.mock('@/components/checkin/ShiftCheckInModal', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    ShiftCheckInModal: ({
      visible,
      shiftDate,
      shiftType,
    }: {
      visible: boolean;
      shiftDate: string;
      shiftType: string;
    }) => (visible ? React.createElement(Text, null, `CheckIn:${shiftDate}:${shiftType}`) : null),
  };
});

import {
  PostShiftCheckInController,
  parsePostShiftCheckInRequest,
} from '@/components/checkin/PostShiftCheckInController';

describe('PostShiftCheckInController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNetworkListeners.clear();
    mockUseAuth.mockReturnValue({ user: { uid: 'user-1' } });
    mockUseLanguage.mockReturnValue({ language: 'en' });
    mockUseOnboardingOptional.mockReturnValue({ data: {} });
    jest.spyOn(Notifications, 'getLastNotificationResponseAsync').mockResolvedValue(null as never);
    jest
      .spyOn(Notifications, 'clearLastNotificationResponseAsync')
      .mockResolvedValue(undefined as never);
    jest
      .spyOn(Notifications, 'addNotificationResponseReceivedListener')
      .mockImplementation(() => ({ remove: jest.fn() }) as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses post-shift notification payloads only', () => {
    expect(
      parsePostShiftCheckInRequest({
        notification: {
          request: {
            content: {
              data: {
                reminderType: 'POST_SHIFT_CHECKIN',
                shiftDate: '2026-04-14',
                shiftType: 'night',
              },
            },
          },
        },
      } as never)
    ).toEqual({
      shiftDate: '2026-04-14',
      shiftType: 'night',
    });

    expect(
      parsePostShiftCheckInRequest({
        notification: {
          request: {
            content: {
              data: {
                reminderType: 'SHIFT_PREP_REMINDER',
                shiftDate: '2026-04-14',
                shiftType: 'night',
              },
            },
          },
        },
      } as never)
    ).toBeNull();
  });

  it('hydrates the modal from the last notification response and syncs pending logs', async () => {
    jest.spyOn(Notifications, 'getLastNotificationResponseAsync').mockResolvedValue({
      notification: {
        request: {
          content: {
            data: {
              reminderType: 'POST_SHIFT_CHECKIN',
              shiftDate: '2026-04-14',
              shiftType: 'day',
            },
          },
        },
      },
    } as never);

    const { getByText } = render(<PostShiftCheckInController />);

    await waitFor(() => {
      expect(getByText('CheckIn:2026-04-14:day')).toBeTruthy();
    });

    expect(mockSyncPendingLogs).toHaveBeenCalledWith('user-1');
    expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalled();
  });

  it('retries pending shift-log sync when connectivity returns', async () => {
    render(<PostShiftCheckInController />);

    expect(mockSyncPendingLogs).toHaveBeenCalledTimes(1);

    mockNetworkListeners.forEach((listener) => listener({ status: 'online' }));

    await waitFor(() => {
      expect(mockSyncPendingLogs).toHaveBeenCalledTimes(2);
    });
  });
});
