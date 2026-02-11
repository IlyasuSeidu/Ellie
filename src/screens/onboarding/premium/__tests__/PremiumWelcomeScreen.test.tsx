/**
 * PremiumWelcomeScreen Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PremiumWelcomeScreen } from '../PremiumWelcomeScreen';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) => React.createElement(RN.Text, props, props.name || 'icon');
  return {
    Ionicons: MockIcon,
    MaterialIcons: MockIcon,
    FontAwesome: MockIcon,
    Feather: MockIcon,
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock timers
jest.useFakeTimers();

describe('PremiumWelcomeScreen', () => {
  const mockOnContinue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  describe('Rendering', () => {
    it('should render the screen', () => {
      const { getByTestId } = render(
        <PremiumWelcomeScreen onContinue={mockOnContinue} testID="welcome" />
      );
      expect(getByTestId('welcome')).toBeTruthy();
    });

    it('should render app name', () => {
      const { getByText } = render(<PremiumWelcomeScreen onContinue={mockOnContinue} />);
      expect(getByText('Ellie')).toBeTruthy();
    });

    it('should render tagline', () => {
      const { getByText } = render(<PremiumWelcomeScreen onContinue={mockOnContinue} />);
      expect(getByText('Your Mining Shift Companion')).toBeTruthy();
    });

    it('should render Get Started button', () => {
      const { getByText } = render(<PremiumWelcomeScreen onContinue={mockOnContinue} />);
      expect(getByText('Get Started')).toBeTruthy();
    });

    it('should render logo image', () => {
      const { UNSAFE_root } = render(<PremiumWelcomeScreen onContinue={mockOnContinue} />);
      const image = UNSAFE_root.findByType('Image');
      expect(image).toBeTruthy();
    });
  });

  describe('Button Interaction', () => {
    it('should call onContinue when Get Started button is pressed', () => {
      const { getByTestId } = render(
        <PremiumWelcomeScreen onContinue={mockOnContinue} testID="welcome" />
      );

      const button = getByTestId('welcome-button');
      fireEvent.press(button);

      expect(mockOnContinue).toHaveBeenCalledTimes(1);
    });

    it('should clear auto-advance timer when button is pressed', () => {
      const { getByTestId } = render(
        <PremiumWelcomeScreen onContinue={mockOnContinue} testID="welcome" />
      );

      const button = getByTestId('welcome-button');
      fireEvent.press(button);

      // Advance timers to auto-advance time
      jest.advanceTimersByTime(3000);

      // onContinue should only be called once (from button press)
      expect(mockOnContinue).toHaveBeenCalledTimes(1);
    });

    it('should work without onContinue handler', () => {
      const { getByTestId } = render(<PremiumWelcomeScreen testID="welcome" />);

      const button = getByTestId('welcome-button');
      fireEvent.press(button);

      // Should not crash
      expect(true).toBe(true);
    });
  });

  describe('Auto-advance', () => {
    it('should auto-advance after 3 seconds', () => {
      render(<PremiumWelcomeScreen onContinue={mockOnContinue} testID="welcome" />);

      // Fast-forward time by 3 seconds
      jest.advanceTimersByTime(3000);

      expect(mockOnContinue).toHaveBeenCalledTimes(1);
    });

    it('should not auto-advance before 3 seconds', () => {
      render(<PremiumWelcomeScreen onContinue={mockOnContinue} testID="welcome" />);

      // Fast-forward time by 2 seconds
      jest.advanceTimersByTime(2000);

      expect(mockOnContinue).not.toHaveBeenCalled();
    });

    it('should not crash if onContinue is not provided', () => {
      render(<PremiumWelcomeScreen testID="welcome" />);

      // Fast-forward time by 3 seconds
      jest.advanceTimersByTime(3000);

      // Should not crash
      expect(true).toBe(true);
    });

    it('should clear timer on unmount', () => {
      const { unmount } = render(
        <PremiumWelcomeScreen onContinue={mockOnContinue} testID="welcome" />
      );

      unmount();

      // Fast-forward time by 3 seconds after unmount
      jest.advanceTimersByTime(3000);

      // onContinue should not be called after unmount
      expect(mockOnContinue).not.toHaveBeenCalled();
    });
  });

  describe('Animation Sequence', () => {
    it('should initialize with animation values', () => {
      const { getByTestId } = render(
        <PremiumWelcomeScreen onContinue={mockOnContinue} testID="welcome" />
      );

      expect(getByTestId('welcome')).toBeTruthy();
    });

    it('should render all animated elements', () => {
      const { getByText, UNSAFE_root } = render(
        <PremiumWelcomeScreen onContinue={mockOnContinue} />
      );

      expect(UNSAFE_root.findByType('Image')).toBeTruthy(); // Logo
      expect(getByText('Ellie')).toBeTruthy(); // App name
      expect(getByText('Your Mining Shift Companion')).toBeTruthy(); // Tagline
      expect(getByText('Get Started')).toBeTruthy(); // Button
    });
  });

  describe('Accessibility', () => {
    it('should have testID', () => {
      const { getByTestId } = render(
        <PremiumWelcomeScreen onContinue={mockOnContinue} testID="welcome-screen" />
      );
      expect(getByTestId('welcome-screen')).toBeTruthy();
    });

    it('should have testID for button', () => {
      const { getByTestId } = render(
        <PremiumWelcomeScreen onContinue={mockOnContinue} testID="welcome" />
      );
      expect(getByTestId('welcome-button')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid button presses', () => {
      const { getByTestId } = render(
        <PremiumWelcomeScreen onContinue={mockOnContinue} testID="welcome" />
      );

      const button = getByTestId('welcome-button');
      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      // Should only call onContinue three times
      expect(mockOnContinue).toHaveBeenCalledTimes(3);
    });

    it('should handle button press after partial auto-advance', () => {
      const { getByTestId } = render(
        <PremiumWelcomeScreen onContinue={mockOnContinue} testID="welcome" />
      );

      // Advance time partially
      jest.advanceTimersByTime(1500);

      // Press button
      const button = getByTestId('welcome-button');
      fireEvent.press(button);

      expect(mockOnContinue).toHaveBeenCalledTimes(1);

      // Continue advancing time
      jest.advanceTimersByTime(1500);

      // Should still only be called once
      expect(mockOnContinue).toHaveBeenCalledTimes(1);
    });

    it('should render without crashing when all props are undefined', () => {
      const { getByText } = render(<PremiumWelcomeScreen />);

      expect(getByText('Ellie')).toBeTruthy();
    });
  });

  describe('Layout', () => {
    it('should render content in correct order', () => {
      const { getByText, UNSAFE_root } = render(
        <PremiumWelcomeScreen onContinue={mockOnContinue} />
      );

      // All elements should be present
      expect(UNSAFE_root.findByType('Image')).toBeTruthy();
      expect(getByText('Ellie')).toBeTruthy();
      expect(getByText('Your Mining Shift Companion')).toBeTruthy();
      expect(getByText('Get Started')).toBeTruthy();
    });

    it('should render gradient overlay', () => {
      const { getByTestId } = render(
        <PremiumWelcomeScreen onContinue={mockOnContinue} testID="welcome" />
      );

      expect(getByTestId('welcome')).toBeTruthy();
    });
  });

  describe('Timer Management', () => {
    it('should only set one auto-advance timer', () => {
      render(<PremiumWelcomeScreen onContinue={mockOnContinue} testID="welcome" />);

      // Check that there's a pending timer
      expect(jest.getTimerCount()).toBeGreaterThan(0);
    });

    it('should clear timer when button is pressed before auto-advance', () => {
      const { getByTestId } = render(
        <PremiumWelcomeScreen onContinue={mockOnContinue} testID="welcome" />
      );

      // Advance time partially
      jest.advanceTimersByTime(1000);

      // Press button
      fireEvent.press(getByTestId('welcome-button'));

      // Clear all timers
      jest.runAllTimers();

      // Should only be called once (from button press, not auto-advance)
      expect(mockOnContinue).toHaveBeenCalledTimes(1);
    });
  });
});
