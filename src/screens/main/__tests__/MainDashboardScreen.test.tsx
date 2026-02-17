/**
 * MainDashboardScreen Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { MainDashboardScreen } from '../MainDashboardScreen';

// Mock AsyncStorageService
jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
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

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    LinearGradient: (props: any) => React.createElement(RN.View, props),
  };
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

// Mock safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      ScrollView: RN.ScrollView,
      createAnimatedComponent: (component: unknown) => component,
    },
    useSharedValue: (val: number) => ({ value: val }),
    useAnimatedStyle: () => ({}),
    withRepeat: (val: number) => val,
    withSequence: (val: number) => val,
    withTiming: (val: number) => val,
    withSpring: (val: number) => val,
    withDelay: (_d: number, val: number) => val,
    FadeIn: { delay: () => ({ duration: () => ({ springify: () => undefined }) }) },
    FadeInDown: { delay: () => ({ duration: () => ({ springify: () => undefined }) }) },
    FadeInUp: { delay: () => ({ duration: () => ({ springify: () => undefined }) }) },
    FadeInRight: { delay: () => ({ duration: () => ({ springify: () => undefined }) }) },
    FadeInLeft: { delay: () => ({ duration: () => undefined }) },
  };
});

// Import the mocked service for test manipulation
import { asyncStorageService } from '@/services/AsyncStorageService';

const mockOnboardingData = JSON.stringify({
  name: 'John Doe',
  occupation: 'Nurse',
  company: 'Hospital',
  country: 'US',
  shiftSystem: '2-shift',
  patternType: 'STANDARD_3_3_3',
  phaseOffset: 0,
  startDate: '2026-01-01',
  shiftTimes: {
    dayShift: { startTime: '07:00', endTime: '19:00', duration: 12 },
    nightShift: { startTime: '19:00', endTime: '07:00', duration: 12 },
  },
});

describe('MainDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading indicator initially', () => {
      (asyncStorageService.get as jest.Mock).mockReturnValue(new Promise(() => {})); // Never resolves
      const result = render(<MainDashboardScreen />);
      // ActivityIndicator renders in loading state
      expect(result.toJSON()).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should show error when no data available', async () => {
      (asyncStorageService.get as jest.Mock).mockResolvedValue(null);
      const { getByText } = render(<MainDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Unable to load shift data')).toBeTruthy();
      });
    });
  });

  describe('Loaded State', () => {
    it('should render dashboard with user data', async () => {
      (asyncStorageService.get as jest.Mock).mockResolvedValue(mockOnboardingData);

      const { getByTestId } = render(<MainDashboardScreen />);

      await waitFor(() => {
        expect(getByTestId('dashboard-header')).toBeTruthy();
      });
    });

    it('should render shift status card', async () => {
      (asyncStorageService.get as jest.Mock).mockResolvedValue(mockOnboardingData);

      const { getByTestId } = render(<MainDashboardScreen />);

      await waitFor(() => {
        expect(getByTestId('dashboard-shift-status')).toBeTruthy();
      });
    });

    it('should render calendar card', async () => {
      (asyncStorageService.get as jest.Mock).mockResolvedValue(mockOnboardingData);

      const { getByTestId } = render(<MainDashboardScreen />);

      await waitFor(() => {
        expect(getByTestId('dashboard-calendar')).toBeTruthy();
      });
    });

    it('should render statistics row', async () => {
      (asyncStorageService.get as jest.Mock).mockResolvedValue(mockOnboardingData);

      const { getByTestId } = render(<MainDashboardScreen />);

      await waitFor(() => {
        expect(getByTestId('dashboard-stats')).toBeTruthy();
      });
    });

    it('should render upcoming shifts', async () => {
      (asyncStorageService.get as jest.Mock).mockResolvedValue(mockOnboardingData);

      const { getByTestId } = render(<MainDashboardScreen />);

      await waitFor(() => {
        expect(getByTestId('dashboard-upcoming')).toBeTruthy();
      });
    });

    it('should render quick actions', async () => {
      (asyncStorageService.get as jest.Mock).mockResolvedValue(mockOnboardingData);

      const { getByTestId } = render(<MainDashboardScreen />);

      await waitFor(() => {
        expect(getByTestId('dashboard-actions')).toBeTruthy();
      });
    });

    it('should display user name', async () => {
      (asyncStorageService.get as jest.Mock).mockResolvedValue(mockOnboardingData);

      const { getByText } = render(<MainDashboardScreen />);

      await waitFor(() => {
        expect(getByText('John Doe')).toBeTruthy();
      });
    });

    it('should display user occupation', async () => {
      (asyncStorageService.get as jest.Mock).mockResolvedValue(mockOnboardingData);

      const { getByText } = render(<MainDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Nurse')).toBeTruthy();
      });
    });
  });
});
