/**
 * AppNavigator Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { AppNavigator, MainRouteGate, readOnboardingCompletionStatus } from '../AppNavigator';

// Mock AsyncStorageService
jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    reset: mockReset,
  }),
}));

// Mock the navigators/screens to avoid complex nesting
jest.mock('../AuthNavigator', () => ({
  AuthNavigator: () => {
    const React = require('react');
    const RN = require('react-native');
    return React.createElement(RN.View, { testID: 'auth-navigator' });
  },
}));

jest.mock('../OnboardingNavigator', () => ({
  OnboardingNavigator: () => {
    const React = require('react');
    const RN = require('react-native');
    return React.createElement(RN.View, { testID: 'onboarding-navigator' });
  },
}));

jest.mock('../MainTabNavigator', () => ({
  MainTabNavigator: () => {
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
import { useAuth } from '@/contexts/AuthContext';

describe('AppNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReset.mockReset();
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      isLoading: false,
    });
  });

  it('should show auth navigator when unauthenticated', async () => {
    (asyncStorageService.get as jest.Mock).mockImplementation(async () => null);

    const { getByTestId } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByTestId('auth-navigator')).toBeTruthy();
    });
  });

  it('should show dashboard when onboarding is complete', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        uid: 'user-1',
        emailVerified: true,
        providerData: [{ providerId: 'password' }],
      },
      isLoading: false,
    });
    (asyncStorageService.get as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'onboarding:complete') return true;
      return null;
    });

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
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        uid: 'user-1',
        emailVerified: true,
        providerData: [{ providerId: 'password' }],
      },
      isLoading: false,
    });
    const incompleteData = {
      name: 'John',
      // Missing startDate and patternType
    };
    (asyncStorageService.get as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'onboarding:complete') return null;
      if (key === 'onboarding:data') return incompleteData;
      return null;
    });

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
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        uid: 'user-1',
        emailVerified: true,
        providerData: [{ providerId: 'password' }],
      },
      isLoading: false,
    });
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

  it('should show onboarding when completion flag is false even with complete data', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        uid: 'user-1',
        emailVerified: true,
        providerData: [{ providerId: 'password' }],
      },
      isLoading: false,
    });
    const completeData = {
      name: 'John',
      startDate: '2026-01-01',
      patternType: 'STANDARD_3_3_3',
      shiftSystem: '2-shift',
    };

    (asyncStorageService.get as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'onboarding:complete') return false;
      if (key === 'onboarding:data') return completeData;
      return null;
    });

    const { getByTestId } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByTestId('onboarding-navigator')).toBeTruthy();
    });
  });

  it('should gate unverified password users in auth and skip onboarding checks', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        uid: 'user-1',
        email: 'verify@example.com',
        emailVerified: false,
        providerData: [{ providerId: 'password' }],
      },
      isLoading: false,
    });

    const { getByTestId } = render(
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByTestId('auth-navigator')).toBeTruthy();
    });

    expect(asyncStorageService.get).not.toHaveBeenCalled();
  });

  it('readOnboardingCompletionStatus returns true when completion flag is true', async () => {
    (asyncStorageService.get as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'onboarding:complete') return true;
      return null;
    });

    await expect(readOnboardingCompletionStatus()).resolves.toBe(true);
  });

  it('readOnboardingCompletionStatus returns false when data is incomplete', async () => {
    (asyncStorageService.get as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'onboarding:complete') return null;
      if (key === 'onboarding:data') return { name: 'John' };
      return null;
    });

    await expect(readOnboardingCompletionStatus()).resolves.toBe(false);
  });

  it('MainRouteGate redirects incomplete onboarding away from Main', async () => {
    (asyncStorageService.get as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'onboarding:complete') return false;
      return null;
    });

    const { getByTestId, queryByTestId } = render(<MainRouteGate />);

    expect(getByTestId('main-route-gate-loading')).toBeTruthy();

    await waitFor(() => {
      expect(mockReset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'Onboarding' }],
      });
    });

    expect(queryByTestId('main-dashboard')).toBeNull();
  });

  it('MainRouteGate allows Main when onboarding is complete', async () => {
    (asyncStorageService.get as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'onboarding:complete') return true;
      return null;
    });

    const { getByTestId } = render(<MainRouteGate />);

    await waitFor(() => {
      expect(getByTestId('main-dashboard')).toBeTruthy();
    });

    expect(mockReset).not.toHaveBeenCalled();
  });
});
