/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { PremiumAhaMomentScreen } from '../PremiumAhaMomentScreen';
import type { UniversalShiftSchedule } from '@/types';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn();
let mockVoiceMessages: Array<{
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}> = [];
let mockVoiceState = 'idle';

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
    mic: 1,
    'mic-circle': 2,
    'time-outline': 3,
    'checkmark-circle': 4,
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
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({ data: { universalSchedule: schedule } }),
}));

jest.mock('@/contexts/SubscriptionContext', () => ({
  useSubscription: () => ({ isPro: false, isLoading: false }),
}));

jest.mock('@/contexts/VoiceAssistantContext', () => ({
  useVoiceAssistant: () => ({
    messages: mockVoiceMessages,
    state: mockVoiceState,
  }),
}));

jest.mock('@/screens/subscription/PaywallScreen', () => ({
  PaywallScreen: () => {
    const React = require('react');
    const RN = require('react-native');
    return React.createElement(RN.Text, null, 'Mock paywall');
  },
}));

jest.useFakeTimers();
jest.setSystemTime(new Date('2026-06-19T12:00:00Z'));

describe('PremiumAhaMomentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockCanGoBack.mockReturnValue(true);
    mockVoiceMessages = [];
    mockVoiceState = 'idle';
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('lets the user taste voice without automatically closing it or showing the paywall', async () => {
    const { getByText, getByTestId, queryByText, rerender } = render(<PremiumAhaMomentScreen />);

    expect(getByText('Ryvro is ready.')).toBeTruthy();
    expect(getByText('Day')).toBeTruthy();
    expect(getByText('Try Ryvro')).toBeTruthy();
    expect(getByText('Unlock Ryvro Pro')).toBeTruthy();
    expect(queryByText('Speak in Ryvro')).toBeNull();
    expect(queryByText('Mock paywall')).toBeNull();

    fireEvent.press(getByTestId('aha-moment-voice-taste'));

    expect(mockNavigate).toHaveBeenCalledWith('VoiceAssistantTaste', {
      autoStart: true,
      showBackButton: true,
      voiceOnly: true,
    });

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(queryByText('Mock paywall')).toBeNull();

    mockVoiceMessages = [
      {
        id: 'assistant-1',
        role: 'assistant',
        text: 'You are on day shift today.',
        timestamp: Date.now(),
      },
    ];
    rerender(<PremiumAhaMomentScreen />);

    expect(mockGoBack).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(queryByText('Mock paywall')).toBeNull();

    fireEvent.press(getByTestId('aha-moment-show-paywall'));

    expect(getByText('Mock paywall')).toBeTruthy();
  });
});
