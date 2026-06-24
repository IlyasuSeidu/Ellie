import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { MainRouteGate } from '../AppNavigator';

const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    reset: mockReset,
  }),
}));

jest.mock('@/utils/onboardingPersistence', () => ({
  readPersistedOnboardingCompletionStatus: jest.fn(async () => true),
}));

jest.mock('../AuthNavigator', () => ({
  AuthNavigator: () => null,
}));

jest.mock('../OnboardingNavigator', () => ({
  OnboardingNavigator: () => null,
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: () => null,
  }),
}));

jest.mock('../MainStackNavigator', () => ({
  MainStackNavigator: () => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, null, 'Main voice screen');
  },
}));

describe('MainRouteGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lets completed users enter Main without requiring a purchase first', async () => {
    const { getByText, queryByTestId } = render(<MainRouteGate />);

    await waitFor(() => expect(getByText('Main voice screen')).toBeTruthy());

    expect(queryByTestId('main-route-gate-subscription-loading')).toBeNull();
    expect(mockReset).not.toHaveBeenCalled();
  });
});
