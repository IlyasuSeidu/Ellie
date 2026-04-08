/**
 * MainDashboardScreen Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { MainDashboardScreen } from '../MainDashboardScreen';

const mockUpdateData = jest.fn();
const mockUseOnboarding = jest.fn();

jest.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => mockUseOnboarding(),
}));

jest.mock('@/hooks/useSubscription', () => ({
  useSubscription: jest.fn(() => ({ isPro: false, isLoading: false, openPaywall: jest.fn() })),
}));

jest.mock('@/hooks/usePaywallRecovery', () => ({
  usePaywallRecovery: jest.fn(() => ({ shouldNudge: false, dismissNudge: jest.fn() })),
}));

jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({
    navigate: jest.fn(),
    getParent: () => ({ navigate: jest.fn() }),
  }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) => React.createElement(RN.Text, props, props.name || 'icon');
  return { Ionicons: MockIcon };
});

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    LinearGradient: (props: any) => React.createElement(RN.View, props),
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

jest.mock('@/services/AvatarService', () => ({
  avatarService: {
    pickFromLibrary: jest.fn(),
    pickFromCamera: jest.fn(),
    deleteAvatar: jest.fn(),
    resolveAvatarUri: jest.fn(async (uri?: string | null) => uri ?? null),
  },
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GestureDetector: ({ children }: any) => React.createElement(RN.View, null, children),
    Gesture: {
      Tap: () => ({
        onBegin() {
          return this;
        },
        onEnd() {
          return this;
        },
        onFinalize() {
          return this;
        },
      }),
      LongPress: () => ({
        minDuration() {
          return this;
        },
        onEnd() {
          return this;
        },
      }),
      Pan: () => ({
        activeOffsetX() {
          return this;
        },
        failOffsetY() {
          return this;
        },
        onEnd() {
          return this;
        },
      }),
      Exclusive: () => ({}),
    },
  };
});

jest.mock('@/components/voice', () => ({
  EllieButton: () => null,
  VoiceAssistantModal: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
}));

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
    runOnJS: (fn: unknown) => fn,
    interpolate: (val: number) => val,
    Extrapolate: { CLAMP: 'clamp' },
    Easing: { out: () => undefined, quad: undefined, inOut: () => ({}), ease: {} },
    FadeIn: {
      delay: () => ({ duration: () => ({ springify: () => undefined }) }),
      duration: () => ({ springify: () => undefined }),
    },
    FadeOut: {
      delay: () => ({ duration: () => ({ springify: () => undefined }) }),
      duration: () => ({ springify: () => undefined }),
    },
    FadeInDown: { delay: () => ({ duration: () => ({ springify: () => undefined }) }) },
    FadeInUp: { delay: () => ({ duration: () => ({ springify: () => undefined }) }) },
    FadeInRight: { delay: () => ({ duration: () => ({ springify: () => undefined }) }) },
    FadeInLeft: { delay: () => ({ duration: () => undefined }) },
  };
});

const mockOnboardingData = {
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
};

describe('MainDashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseOnboarding.mockReturnValue({
      data: mockOnboardingData,
      updateData: mockUpdateData,
      hydrated: true,
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator initially', () => {
      mockUseOnboarding.mockReturnValue({
        data: {},
        updateData: mockUpdateData,
        hydrated: false,
      });
      const result = render(<MainDashboardScreen />);
      expect(result.toJSON()).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should show error when no data available', async () => {
      mockUseOnboarding.mockReturnValue({
        data: {},
        updateData: mockUpdateData,
        hydrated: true,
      });
      const { getByText } = render(<MainDashboardScreen />);

      await waitFor(() => {
        expect(getByText('Unable to load shift data')).toBeTruthy();
      });
    });
  });

  describe('Loaded State', () => {
    it('should render dashboard with user data', async () => {
      const { getByTestId } = render(<MainDashboardScreen />);
      await waitFor(() => {
        expect(getByTestId('dashboard-header')).toBeTruthy();
      });
    });

    it('should render shift status card', async () => {
      const { getByTestId } = render(<MainDashboardScreen />);
      await waitFor(() => {
        expect(getByTestId('dashboard-shift-status')).toBeTruthy();
      });
    });

    it('should render calendar card', async () => {
      const { getByTestId } = render(<MainDashboardScreen />);
      await waitFor(() => {
        expect(getByTestId('dashboard-calendar')).toBeTruthy();
      });
    });

    it('should render statistics row', async () => {
      const { getByTestId } = render(<MainDashboardScreen />);
      await waitFor(() => {
        expect(getByTestId('dashboard-stats')).toBeTruthy();
      });
    });

    it('should display user name', async () => {
      const { queryByText } = render(<MainDashboardScreen />);
      await waitFor(() => {
        expect(queryByText(/John Doe!/)).toBeTruthy();
      });
    });

    it('should display user occupation', async () => {
      const { getByText } = render(<MainDashboardScreen />);
      await waitFor(() => {
        expect(getByText('Nurse')).toBeTruthy();
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('should have RefreshControl configured', async () => {
      const { UNSAFE_getByType } = render(<MainDashboardScreen />);
      await waitFor(() => {
        const scrollView = UNSAFE_getByType(require('react-native').ScrollView);
        expect(scrollView.props.refreshControl).toBeTruthy();
        expect(scrollView.props.refreshControl.props.tintColor).toBeTruthy();
      });
    });

    it('should trigger refresh and keep the dashboard interactive', async () => {
      const Haptics = require('expo-haptics');
      const { UNSAFE_getByType, getByTestId } = render(<MainDashboardScreen />);

      await waitFor(() => {
        expect(UNSAFE_getByType(require('react-native').ScrollView)).toBeTruthy();
      });

      const scrollView = UNSAFE_getByType(require('react-native').ScrollView);
      const onRefresh = scrollView.props.refreshControl.props.onRefresh;

      await act(() => {
        onRefresh();
      });

      await waitFor(() => {
        expect(getByTestId('dashboard-header')).toBeTruthy();
      });
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });
  });
});
