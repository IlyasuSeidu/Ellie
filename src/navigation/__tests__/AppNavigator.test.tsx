/**
 * AppNavigator Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator } from '../AppNavigator';

// Mock AsyncStorageService
jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock the navigators/screens to avoid complex nesting
jest.mock('../OnboardingNavigator', () => ({
  OnboardingNavigator: () => {
    const React = require('react');
    const RN = require('react-native');
    return React.createElement(RN.View, { testID: 'onboarding-navigator' });
  },
}));

jest.mock('@/screens/main/MainDashboardScreen', () => ({
  MainDashboardScreen: () => {
    const React = require('react');
    const RN = require('react-native');
    return React.createElement(RN.View, { testID: 'main-dashboard' });
  },
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) => React.createElement(RN.Text, props, props.name || 'icon');
  return { Ionicons: MockIcon };
});

import { asyncStorageService } from '@/services/AsyncStorageService';

describe('AppNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show onboarding when no data exists', async () => {
    (asyncStorageService.get as jest.Mock).mockResolvedValue(null);

    const { getByTestId } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByTestId('onboarding-navigator')).toBeTruthy();
    });
  });

  it('should show dashboard when onboarding is complete', async () => {
    // asyncStorageService.get() auto-deserializes, so mock returns parsed object
    const completeData = {
      name: 'John',
      startDate: '2026-01-01',
      patternType: 'STANDARD_3_3_3',
      shiftSystem: '2-shift',
    };
    (asyncStorageService.get as jest.Mock).mockResolvedValue(completeData);

    const { getByTestId } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByTestId('main-dashboard')).toBeTruthy();
    });
  });

  it('should show onboarding when data is incomplete', async () => {
    const incompleteData = {
      name: 'John',
      // Missing startDate and patternType
    };
    (asyncStorageService.get as jest.Mock).mockResolvedValue(incompleteData);

    const { getByTestId } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByTestId('onboarding-navigator')).toBeTruthy();
    });
  });

  it('should show onboarding on storage error', async () => {
    (asyncStorageService.get as jest.Mock).mockRejectedValue(new Error('Storage error'));

    const { getByTestId } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByTestId('onboarding-navigator')).toBeTruthy();
    });
  });
});
