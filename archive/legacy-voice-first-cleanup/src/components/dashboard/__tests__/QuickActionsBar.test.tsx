/**
 * QuickActionsBar Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QuickActionsBar } from '../QuickActionsBar';

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
    withSpring: (val: number) => val,
    FadeInUp: { delay: () => ({ duration: () => ({ springify: () => undefined }) }) },
  };
});

describe('QuickActionsBar', () => {
  const mockOnAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render default actions', () => {
      const { getByText } = render(<QuickActionsBar />);
      expect(getByText('Settings')).toBeTruthy();
      expect(getByText('Alerts')).toBeTruthy();
      expect(getByText('Profile')).toBeTruthy();
      expect(getByText('Export')).toBeTruthy();
    });

    it('should render custom actions', () => {
      const customActions = [
        { key: 'test1', icon: 'star' as const, label: 'Custom 1' },
        { key: 'test2', icon: 'heart' as const, label: 'Custom 2' },
      ];
      const { getByText } = render(<QuickActionsBar actions={customActions} />);
      expect(getByText('Custom 1')).toBeTruthy();
      expect(getByText('Custom 2')).toBeTruthy();
    });

    it('should render with testID', () => {
      const { getByTestId } = render(<QuickActionsBar testID="test-actions" />);
      expect(getByTestId('test-actions')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onActionPress with correct key', () => {
      const { getByTestId } = render(<QuickActionsBar onActionPress={mockOnAction} />);
      fireEvent.press(getByTestId('action-settings'));
      expect(mockOnAction).toHaveBeenCalledWith('settings');
    });

    it('should call onActionPress for each action', () => {
      const { getByTestId } = render(<QuickActionsBar onActionPress={mockOnAction} />);

      fireEvent.press(getByTestId('action-settings'));
      fireEvent.press(getByTestId('action-notifications'));
      fireEvent.press(getByTestId('action-profile'));
      fireEvent.press(getByTestId('action-export'));

      expect(mockOnAction).toHaveBeenCalledTimes(4);
      expect(mockOnAction).toHaveBeenCalledWith('settings');
      expect(mockOnAction).toHaveBeenCalledWith('notifications');
      expect(mockOnAction).toHaveBeenCalledWith('profile');
      expect(mockOnAction).toHaveBeenCalledWith('export');
    });
  });
});
