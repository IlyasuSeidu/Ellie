/**
 * PremiumSetupIntroScreen Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { PremiumSetupIntroScreen } from '../PremiumSetupIntroScreen';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  const glyphMap = {
    sparkles: 1,
    repeat: 2,
    'calendar-clear': 3,
    moon: 4,
    checkmark: 5,
    'shield-checkmark': 6,
    'arrow-forward-circle': 7,
  };
  const MockIcon = (props: { name?: string }) =>
    React.createElement(RN.Text, props, props.name || 'icon');
  return {
    Ionicons: Object.assign(MockIcon, { glyphMap }),
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.useFakeTimers();

describe('PremiumSetupIntroScreen', () => {
  const mockOnContinue = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
  });

  it('should render the screen', () => {
    const { getByTestId } = render(
      <PremiumSetupIntroScreen onContinue={mockOnContinue} testID="setup-intro" />
    );

    expect(getByTestId('setup-intro')).toBeTruthy();
  });

  it('should render the setup intro copy', () => {
    const { getByText } = render(<PremiumSetupIntroScreen onContinue={mockOnContinue} />);

    expect(getByText('Shift setup')).toBeTruthy();
    expect(getByText("Let's set up your shifts.")).toBeTruthy();
    expect(
      getByText('Tell Ryvro your pattern. Ryvro turns it into a schedule you can check.')
    ).toBeTruthy();
    expect(getByText("What we'll ask")).toBeTruthy();
  });

  it('should render the three simple setup items', () => {
    const { getByText } = render(<PremiumSetupIntroScreen onContinue={mockOnContinue} />);

    expect(getByText('Say your pattern')).toBeTruthy();
    expect(getByText('Example: I work 2 days, 2 nights, then 4 off')).toBeTruthy();
    expect(getByText('Ryvro repeats it back')).toBeTruthy();
    expect(getByText('You check the exact order before moving on')).toBeTruthy();
    expect(getByText('Then anchor it')).toBeTruthy();
    expect(getByText('Use one date you know for sure')).toBeTruthy();
  });

  it('should render the primary CTA', () => {
    const { getByText, getByTestId } = render(
      <PremiumSetupIntroScreen onContinue={mockOnContinue} testID="setup-intro" />
    );

    expect(getByText('Tell Ryvro my pattern')).toBeTruthy();
    expect(getByTestId('setup-intro-button')).toBeTruthy();
  });

  it('should call onContinue when the CTA is pressed', () => {
    const { getByTestId } = render(
      <PremiumSetupIntroScreen onContinue={mockOnContinue} testID="setup-intro" />
    );

    fireEvent.press(getByTestId('setup-intro-button'));

    expect(mockOnContinue).toHaveBeenCalledTimes(1);
  });

  it('should not auto-advance after timers run', () => {
    render(<PremiumSetupIntroScreen onContinue={mockOnContinue} testID="setup-intro" />);

    jest.advanceTimersByTime(3000);

    expect(mockOnContinue).not.toHaveBeenCalled();
  });

  it('should work without onContinue handler', () => {
    const { getByTestId } = render(<PremiumSetupIntroScreen testID="setup-intro" />);

    fireEvent.press(getByTestId('setup-intro-button'));

    expect(true).toBe(true);
  });
});
