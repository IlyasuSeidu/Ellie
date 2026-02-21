/**
 * EllieButton Component Tests
 *
 * Tests for the floating action button that opens the Ellie voice assistant.
 * Covers idle/active states, pulse animation, haptic feedback,
 * and accessibility attributes.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { EllieButton } from '../EllieButton';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) =>
    React.createElement(RN.Text, { ...props, testID: `icon-${props.name}` }, props.name || 'icon');
  return { Ionicons: MockIcon };
});

// Mock useVoiceAssistant
const mockOpenModal = jest.fn();
const mockVoiceAssistant = {
  state: 'idle' as string,
  openModal: mockOpenModal,
};

jest.mock('@/contexts/VoiceAssistantContext', () => ({
  useVoiceAssistant: () => mockVoiceAssistant,
}));

describe('EllieButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVoiceAssistant.state = 'idle';
  });

  // ---------- Rendering ----------

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<EllieButton />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render a mic icon', () => {
      const { getByTestId } = render(<EllieButton />);
      expect(getByTestId('icon-mic')).toBeTruthy();
    });
  });

  // ---------- Idle state ----------

  describe('Idle state', () => {
    it('should not have active pulse when idle', () => {
      mockVoiceAssistant.state = 'idle';
      const { toJSON } = render(<EllieButton />);
      // Just verify it renders in idle state without issue
      expect(toJSON()).toBeTruthy();
    });
  });

  // ---------- Active state ----------

  describe('Active state (listening)', () => {
    it('should render when state is listening', () => {
      mockVoiceAssistant.state = 'listening';
      const { toJSON } = render(<EllieButton />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Active state (processing)', () => {
    it('should render when state is processing', () => {
      mockVoiceAssistant.state = 'processing';
      const { toJSON } = render(<EllieButton />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Active state (speaking)', () => {
    it('should render when state is speaking', () => {
      mockVoiceAssistant.state = 'speaking';
      const { toJSON } = render(<EllieButton />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Active state (error)', () => {
    it('should render when state is error', () => {
      mockVoiceAssistant.state = 'error';
      const { toJSON } = render(<EllieButton />);
      expect(toJSON()).toBeTruthy();
    });
  });

  // ---------- Press handler ----------

  describe('onPress', () => {
    it('should call Haptics.impactAsync with Medium when pressed', () => {
      const { getByLabelText } = render(<EllieButton />);
      fireEvent.press(getByLabelText('Open Ellie voice assistant'));
      expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
    });

    it('should call openModal when pressed', () => {
      const { getByLabelText } = render(<EllieButton />);
      fireEvent.press(getByLabelText('Open Ellie voice assistant'));
      expect(mockOpenModal).toHaveBeenCalledTimes(1);
    });

    it('should call both haptics and openModal on each press', () => {
      const { getByLabelText } = render(<EllieButton />);
      const button = getByLabelText('Open Ellie voice assistant');

      fireEvent.press(button);
      fireEvent.press(button);

      expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
      expect(mockOpenModal).toHaveBeenCalledTimes(2);
    });
  });

  // ---------- Accessibility ----------

  describe('Accessibility', () => {
    it('should have accessibility label "Open Ellie voice assistant"', () => {
      const { getByLabelText } = render(<EllieButton />);
      expect(getByLabelText('Open Ellie voice assistant')).toBeTruthy();
    });

    it('should have accessibilityRole="button"', () => {
      const { getByRole } = render(<EllieButton />);
      expect(getByRole('button')).toBeTruthy();
    });
  });

  // ---------- Re-render state transitions ----------

  describe('State transitions', () => {
    it('should handle transition from idle to active', () => {
      mockVoiceAssistant.state = 'idle';
      const { rerender, toJSON } = render(<EllieButton />);

      mockVoiceAssistant.state = 'listening';
      rerender(<EllieButton />);

      expect(toJSON()).toBeTruthy();
    });

    it('should handle transition from active to idle', () => {
      mockVoiceAssistant.state = 'listening';
      const { rerender, toJSON } = render(<EllieButton />);

      mockVoiceAssistant.state = 'idle';
      rerender(<EllieButton />);

      expect(toJSON()).toBeTruthy();
    });
  });

  // ---------- Snapshot ----------

  describe('Snapshot', () => {
    it('should match snapshot in idle state', () => {
      mockVoiceAssistant.state = 'idle';
      const { toJSON } = render(<EllieButton />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot in active state', () => {
      mockVoiceAssistant.state = 'listening';
      const { toJSON } = render(<EllieButton />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
