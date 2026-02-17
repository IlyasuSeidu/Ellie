/**
 * PersonalizedHeader Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render } from '@testing-library/react-native';
import { PersonalizedHeader } from '../PersonalizedHeader';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) => React.createElement(RN.Text, props, props.name || 'icon');
  return { Ionicons: MockIcon };
});

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      createAnimatedComponent: (component: unknown) => component,
    },
    useSharedValue: (val: number) => ({ value: val }),
    useAnimatedStyle: () => ({}),
    withRepeat: (val: number) => val,
    withSequence: (val: number) => val,
    withTiming: (val: number) => val,
    withDelay: (_d: number, val: number) => val,
    FadeInDown: { delay: () => ({ duration: () => ({ springify: () => undefined }) }) },
    FadeIn: { delay: () => ({ duration: () => undefined }) },
  };
});

describe('PersonalizedHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with user name', () => {
      const { getByText } = render(<PersonalizedHeader name="John Doe" testID="header" />);
      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should render initials from full name', () => {
      const { getByText } = render(<PersonalizedHeader name="John Doe" />);
      expect(getByText('JD')).toBeTruthy();
    });

    it('should render single initial for single name', () => {
      const { getByText } = render(<PersonalizedHeader name="Alice" />);
      expect(getByText('A')).toBeTruthy();
    });

    it('should render initials from multi-part name', () => {
      const { getByText } = render(<PersonalizedHeader name="John Michael Doe" />);
      expect(getByText('JD')).toBeTruthy();
    });

    it('should render occupation when provided', () => {
      const { getByText } = render(<PersonalizedHeader name="John Doe" occupation="Nurse" />);
      expect(getByText('Nurse')).toBeTruthy();
    });

    it('should not render occupation when not provided', () => {
      const { queryByText } = render(<PersonalizedHeader name="John Doe" />);
      expect(queryByText('Nurse')).toBeNull();
    });

    it('should render time-based greeting', () => {
      const { getByText } = render(<PersonalizedHeader name="John" />);
      // Should contain one of the greeting variants
      const greetingVariants = ['Good morning,', 'Good afternoon,', 'Good evening,', 'Good night,'];
      const found = greetingVariants.some((greeting) => {
        try {
          getByText(greeting);
          return true;
        } catch {
          return false;
        }
      });
      expect(found).toBe(true);
    });

    it('should render with testID', () => {
      const { getByTestId } = render(<PersonalizedHeader name="John" testID="test-header" />);
      expect(getByTestId('test-header')).toBeTruthy();
    });
  });
});
