/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { PremiumCompletionScreen } from '../PremiumCompletionScreen';
import type { UniversalShiftSchedule } from '@/types';

const mockReset = jest.fn();
const mockNavigate = jest.fn();
const mockPersistOnboardingData = jest.fn();
const mockSetPersistedOnboardingComplete = jest.fn();
const mockCreateOrSyncUserProfile = jest.fn();

const schedule: UniversalShiftSchedule = {
  version: 3,
  name: 'Ryvro setup',
  timezone: 'UTC',
  anchorDate: '2026-06-19',
  phaseOffset: 0,
  source: 'ai',
  shiftDefinitions: [
    {
      id: 'day',
      name: 'Day Shift',
      kind: 'work',
      timePolicy: 'timed',
      activePolicy: 'timed_window',
      startTime: '07:00',
      endTime: '19:00',
      countsAsWork: true,
      countsAsNight: false,
      countsForStats: true,
      color: '#20f4dc',
      icon: 'sunny',
    },
  ],
  sequence: [{ id: '1', shiftDefinitionId: 'day' }],
};

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  const glyphMap = {
    checkmark: 1,
    mic: 2,
    'mic-circle': 3,
    'calendar-clear': 4,
    time: 5,
  };
  const MockIcon = (props: { name?: string }) =>
    React.createElement(RN.Text, props, props.name || 'icon');
  return {
    Ionicons: Object.assign(MockIcon, { glyphMap }),
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    getParent: () => ({ reset: mockReset }),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    data: { universalSchedule: schedule },
    validateData: () => ({ isValid: true, missingFields: [] }),
  }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'user-1', email: 'test@example.com' } }),
}));

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isPro: true, isLoading: false }),
}));

jest.mock('@/utils/onboardingPersistence', () => ({
  persistOnboardingData: (...args: unknown[]) => mockPersistOnboardingData(...args),
  setPersistedOnboardingComplete: (...args: unknown[]) =>
    mockSetPersistedOnboardingComplete(...args),
}));

jest.mock('@/services/UserService', () => ({
  userService: {
    createOrSyncUserProfile: (...args: unknown[]) => mockCreateOrSyncUserProfile(...args),
  },
}));

jest.mock('@/services/AppStateStorageService', () => ({
  appStateStorageService: {
    getInstallStartedAt: jest.fn(async () => Date.now() - 1000),
  },
}));

jest.mock('@/services/SubscriptionEntitlementCacheService', () => ({
  subscriptionEntitlementCacheService: {
    getCachedIsPro: jest.fn(async () => true),
  },
}));

jest.mock('@/utils/hapticsDiagnostics', () => ({
  triggerImpactHaptic: jest.fn(async () => undefined),
  triggerNotificationHaptic: jest.fn(async () => undefined),
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('PremiumCompletionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPersistOnboardingData.mockResolvedValue(undefined);
    mockSetPersistedOnboardingComplete.mockResolvedValue(undefined);
    mockCreateOrSyncUserProfile.mockResolvedValue(undefined);
  });

  it('saves onboarding and enters the app', async () => {
    const { getByText, getByTestId } = render(<PremiumCompletionScreen />);

    expect(getByText('You’re set.')).toBeTruthy();

    await waitFor(() => {
      expect(mockSetPersistedOnboardingComplete).toHaveBeenCalledWith(true);
      expect(mockPersistOnboardingData).toHaveBeenCalledWith({ universalSchedule: schedule });
      expect(mockCreateOrSyncUserProfile).toHaveBeenCalled();
    });

    fireEvent.press(getByTestId('premium-completion-screen-enter-app'));

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Main' }],
    });
  });
});
