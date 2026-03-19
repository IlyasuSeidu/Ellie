import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PremiumAhaMomentScreen } from '../PremiumAhaMomentScreen';
import { ShiftPattern } from '@/types';

const mockNavigate = jest.fn();
const mockOpenModal = jest.fn();
const mockOpenModalWithQuery = jest.fn();
const mockOnboardingData = {
  name: 'Ilyasu',
  patternType: ShiftPattern.STANDARD_4_4_4,
  shiftSystem: '2-shift',
  rosterType: 'rotating',
  startDate: new Date('2026-03-10'),
  phaseOffset: 2,
  shiftTimes: {
    dayShift: { startTime: '07:00', endTime: '19:00', duration: 12 },
    nightShift: { startTime: '19:00', endTime: '07:00', duration: 12 },
  },
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({
    data: mockOnboardingData,
  }),
}));

jest.mock('@/contexts/VoiceAssistantContext', () => ({
  useVoiceAssistant: () => ({
    openModal: mockOpenModal,
    openModalWithQuery: mockOpenModalWithQuery,
  }),
}));

jest.mock('@/utils/analytics', () => ({
  Analytics: {
    track: jest.fn(),
    onboardingStepViewed: jest.fn(),
    ahaMomentReached: jest.fn(),
    ahaMomentVoiceTried: jest.fn(),
  },
}));

jest.mock('@/components/dashboard/MonthlyCalendarCard', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    MonthlyCalendarCard: () => (
      <View>
        <Text>MonthlyCalendarCard</Text>
      </View>
    ),
  };
});

jest.mock('@/screens/subscription/PaywallScreen', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');
  return {
    PaywallScreen: ({ onDismiss }: { onDismiss: () => void }) => (
      <View>
        <Text>PaywallScreen</Text>
        <Pressable onPress={onDismiss}>
          <Text>DismissPaywall</Text>
        </Pressable>
      </View>
    ),
  };
});

jest.mock('@/components/voice', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    VoiceAssistantModal: () => <Text>VoiceAssistantModal</Text>,
  };
});

describe('PremiumAhaMomentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(AsyncStorage, 'getItem').mockResolvedValue(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders core aha-moment content', () => {
    const { getByText } = render(<PremiumAhaMomentScreen />);

    expect(getByText("Ilyasu's shifts, mapped.")).toBeTruthy();
    expect(getByText('MonthlyCalendarCard')).toBeTruthy();
    expect(getByText('VoiceAssistantModal')).toBeTruthy();
  });

  it('opens suggested query through voice modal', () => {
    const { getByText } = render(<PremiumAhaMomentScreen />);

    fireEvent.press(getByText('Am I working Christmas?'));

    expect(mockOpenModalWithQuery).toHaveBeenCalledWith('Am I working Christmas?');
  });

  it('opens paywall and returns to Completion on dismiss', () => {
    const { getByText, queryByText } = render(<PremiumAhaMomentScreen />);

    expect(queryByText('PaywallScreen')).toBeNull();
    fireEvent.press(getByText('Unlock Full Access — 7-Day Free Trial'));
    expect(getByText('PaywallScreen')).toBeTruthy();

    fireEvent.press(getByText('DismissPaywall'));
    expect(mockNavigate).toHaveBeenCalledWith('Completion');
  });

  it('navigates to Completion when limited-access CTA is pressed', () => {
    const { getByText } = render(<PremiumAhaMomentScreen />);

    fireEvent.press(getByText('or continue with limited access'));

    expect(mockNavigate).toHaveBeenCalledWith('Completion');
  });

  it('opens manual mic when Hey Ellie button is pressed', () => {
    const { getByText } = render(<PremiumAhaMomentScreen />);

    fireEvent.press(getByText('Hey Ellie'));

    expect(mockOpenModal).toHaveBeenCalled();
  });
});
