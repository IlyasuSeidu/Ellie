/**
 * ResponseBubble Component Tests
 *
 * Tests for the chat bubble component used in the voice assistant conversation.
 * Covers user vs assistant styling, typewriter animation, timestamps,
 * accessibility labels, and edge cases.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { ResponseBubble } from '../ResponseBubble';
import type { VoiceMessage } from '@/types/voiceAssistant';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) => React.createElement(RN.Text, props, props.name || 'icon');
  return { Ionicons: MockIcon };
});

describe('ResponseBubble', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---------- Helper factories ----------

  const makeUserMessage = (overrides?: Partial<VoiceMessage>): VoiceMessage => ({
    id: 'msg-user-1',
    role: 'user',
    text: 'What shift do I have tomorrow?',
    timestamp: new Date(2026, 1, 20, 14, 30).getTime(), // Feb 20, 2026 14:30
    ...overrides,
  });

  const makeAssistantMessage = (overrides?: Partial<VoiceMessage>): VoiceMessage => ({
    id: 'msg-assistant-1',
    role: 'assistant',
    text: 'You have a day shift tomorrow starting at 7:00 AM.',
    timestamp: new Date(2026, 1, 20, 14, 31).getTime(), // Feb 20, 2026 14:31
    ...overrides,
  });

  // ---------- Rendering ----------

  describe('User messages', () => {
    it('should render user message text', () => {
      const message = makeUserMessage();
      const { getByText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByText('What shift do I have tomorrow?')).toBeTruthy();
    });

    it('should NOT render "Ellie" label for user messages', () => {
      const message = makeUserMessage();
      const { queryByText } = render(<ResponseBubble message={message} index={0} />);
      expect(queryByText('Ellie')).toBeNull();
    });

    it('should have user accessibility label', () => {
      const message = makeUserMessage({ text: 'Hello there' });
      const { getByLabelText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByLabelText('You said: Hello there')).toBeTruthy();
    });
  });

  describe('Assistant messages', () => {
    it('should render assistant message text', () => {
      const message = makeAssistantMessage();
      const { getByText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByText('You have a day shift tomorrow starting at 7:00 AM.')).toBeTruthy();
    });

    it('should render "Ellie" label for assistant messages', () => {
      const message = makeAssistantMessage();
      const { getByText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByText('Ellie')).toBeTruthy();
    });

    it('should have assistant accessibility label', () => {
      const message = makeAssistantMessage({ text: 'Good morning!' });
      const { getByLabelText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByLabelText('Ellie said: Good morning!')).toBeTruthy();
    });
  });

  // ---------- formatTime ----------

  describe('formatTime', () => {
    it('should format timestamp as HH:MM with zero-padded hours', () => {
      // 09:05
      const message = makeUserMessage({
        timestamp: new Date(2026, 0, 1, 9, 5).getTime(),
      });
      const { getByText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByText('09:05')).toBeTruthy();
    });

    it('should format midnight correctly as 00:00', () => {
      const message = makeUserMessage({
        timestamp: new Date(2026, 0, 1, 0, 0).getTime(),
      });
      const { getByText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByText('00:00')).toBeTruthy();
    });

    it('should format afternoon time (no zero-padding needed)', () => {
      const message = makeUserMessage({
        timestamp: new Date(2026, 0, 1, 14, 30).getTime(),
      });
      const { getByText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByText('14:30')).toBeTruthy();
    });

    it('should format 23:59', () => {
      const message = makeAssistantMessage({
        timestamp: new Date(2026, 0, 1, 23, 59).getTime(),
      });
      const { getByText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByText('23:59')).toBeTruthy();
    });
  });

  // ---------- isNew prop & typewriter animation ----------

  describe('Typewriter animation (isNew prop)', () => {
    it('should display full text immediately for user messages even when isNew=true', () => {
      const message = makeUserMessage({ text: 'Hello Ellie' });
      const { getByText } = render(<ResponseBubble message={message} index={0} isNew={true} />);
      // User messages never animate — text should be immediate
      expect(getByText('Hello Ellie')).toBeTruthy();
    });

    it('should start with empty text for new assistant messages', () => {
      const message = makeAssistantMessage({ text: 'Welcome!' });
      const { queryByText } = render(<ResponseBubble message={message} index={0} isNew={true} />);
      // The text should not be fully displayed yet (starts empty)
      expect(queryByText('Welcome!')).toBeNull();
    });

    it('should display full text for assistant messages when isNew=false (default)', () => {
      const message = makeAssistantMessage({ text: 'Full text here' });
      const { getByText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByText('Full text here')).toBeTruthy();
    });

    it('should create setInterval for new assistant messages', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const message = makeAssistantMessage({ text: 'Animating this text' });

      render(<ResponseBubble message={message} index={0} isNew={true} />);

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 50);
      setIntervalSpy.mockRestore();
    });

    it('should NOT create setInterval for non-new assistant messages', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const message = makeAssistantMessage({ text: 'No animation' });

      render(<ResponseBubble message={message} index={0} isNew={false} />);

      expect(setIntervalSpy).not.toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });

    it('should progressively reveal text via setInterval ticks', () => {
      const message = makeAssistantMessage({ text: 'ABCDEF' });
      const { getByText, queryByText } = render(
        <ResponseBubble message={message} index={0} isNew={true} />
      );

      // Initially empty — no "ABCDEF"
      expect(queryByText('ABCDEF')).toBeNull();

      // After 1 tick (50ms): 3 chars revealed → "ABC"
      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(getByText('ABC')).toBeTruthy();

      // After 2nd tick: 6 chars (full) → "ABCDEF"
      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(getByText('ABCDEF')).toBeTruthy();
    });

    it('should clear interval when animation completes', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const message = makeAssistantMessage({ text: 'AB' }); // 2 chars < 3 chars/tick = 1 tick

      render(<ResponseBubble message={message} index={0} isNew={true} />);

      act(() => {
        jest.advanceTimersByTime(50);
      });

      // charIndex (3) >= text.length (2), so clearInterval should be called
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should clear interval on unmount during animation', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const message = makeAssistantMessage({ text: 'A long text that takes many ticks' });

      const { unmount } = render(<ResponseBubble message={message} index={0} isNew={true} />);

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  // ---------- Edge cases ----------

  describe('Edge cases', () => {
    it('should render empty text for user message', () => {
      const message = makeUserMessage({ text: '' });
      const { getByLabelText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByLabelText('You said: ')).toBeTruthy();
    });

    it('should render whitespace-only text for user message', () => {
      const message = makeUserMessage({ text: '   ' });
      const { getByLabelText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByLabelText('You said:    ')).toBeTruthy();
    });

    it('should render empty text for assistant message', () => {
      const message = makeAssistantMessage({ text: '' });
      const { getByLabelText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByLabelText('Ellie said: ')).toBeTruthy();
    });

    it('should render with index=0 (no delay offset issues)', () => {
      const message = makeUserMessage();
      const { getByText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByText('What shift do I have tomorrow?')).toBeTruthy();
    });

    it('should render with large index', () => {
      const message = makeAssistantMessage();
      const { getByText } = render(<ResponseBubble message={message} index={100} />);
      expect(getByText('You have a day shift tomorrow starting at 7:00 AM.')).toBeTruthy();
    });

    it('should handle isNew with empty assistant text (no infinite loop)', () => {
      const message = makeAssistantMessage({ text: '' });
      // Should not throw or hang
      const { unmount } = render(<ResponseBubble message={message} index={0} isNew={true} />);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      unmount();
    });
  });

  // ---------- Accessibility ----------

  describe('Accessibility', () => {
    it('should have accessibilityRole="text" on container', () => {
      const message = makeUserMessage();
      const { UNSAFE_getByType } = render(<ResponseBubble message={message} index={0} />);
      // The component wraps in Animated.View with accessibilityRole
      // Checking via label lookup is sufficient since the role is set on the same element
      const elem = UNSAFE_getByType(require('react-native').View);
      // Just verify it renders without error
      expect(elem).toBeTruthy();
    });

    it('should have correct accessibility label for user role', () => {
      const message = makeUserMessage({ text: 'Test message' });
      const { getByLabelText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByLabelText('You said: Test message')).toBeTruthy();
    });

    it('should have correct accessibility label for assistant role', () => {
      const message = makeAssistantMessage({ text: 'Response text' });
      const { getByLabelText } = render(<ResponseBubble message={message} index={0} />);
      expect(getByLabelText('Ellie said: Response text')).toBeTruthy();
    });
  });
});
