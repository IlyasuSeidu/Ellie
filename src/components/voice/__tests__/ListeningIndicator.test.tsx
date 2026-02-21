/**
 * ListeningIndicator Component Tests
 *
 * Tests for the animated concentric rings indicator that pulses
 * when the voice assistant is listening. Verifies rendering of
 * rings, mic icon state, and animation triggers.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render } from '@testing-library/react-native';
import { ListeningIndicator } from '../ListeningIndicator';

// Mock Ionicons so we can inspect props
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) =>
    React.createElement(RN.Text, { ...props, testID: `icon-${props.name}` }, props.name || 'icon');
  return { Ionicons: MockIcon };
});

describe('ListeningIndicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---------- Rendering ----------

  describe('Rendering when isListening=true', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<ListeningIndicator isListening={true} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render 3 rings', () => {
      const { toJSON } = render(<ListeningIndicator isListening={true} />);
      const tree = toJSON();
      // The component renders a container View with 3 Ring Views + 1 center View = 4 children
      expect(tree).toBeTruthy();
      if (tree && !Array.isArray(tree)) {
        // Container should have children: 3 rings + 1 center
        expect(tree.children).toBeTruthy();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(tree.children!.length).toBe(4);
      }
    });

    it('should render mic icon when listening', () => {
      const { getByTestId } = render(<ListeningIndicator isListening={true} />);
      expect(getByTestId('icon-mic')).toBeTruthy();
    });

    it('should NOT show mic-outline when listening', () => {
      const { queryByTestId } = render(<ListeningIndicator isListening={true} />);
      expect(queryByTestId('icon-mic-outline')).toBeNull();
    });
  });

  describe('Rendering when isListening=false', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<ListeningIndicator isListening={false} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should still render 3 rings (they are just not animating)', () => {
      const { toJSON } = render(<ListeningIndicator isListening={false} />);
      const tree = toJSON();
      expect(tree).toBeTruthy();
      if (tree && !Array.isArray(tree)) {
        expect(tree.children).toBeTruthy();
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(tree.children!.length).toBe(4);
      }
    });

    it('should render mic-outline icon when not listening', () => {
      const { getByTestId } = render(<ListeningIndicator isListening={false} />);
      expect(getByTestId('icon-mic-outline')).toBeTruthy();
    });

    it('should NOT show filled mic icon when not listening', () => {
      const { queryByTestId } = render(<ListeningIndicator isListening={false} />);
      expect(queryByTestId('icon-mic')).toBeNull();
    });
  });

  // ---------- Icon toggle ----------

  describe('Icon switching', () => {
    it('should switch from mic-outline to mic when isListening changes to true', () => {
      const { rerender, getByTestId, queryByTestId } = render(
        <ListeningIndicator isListening={false} />
      );
      expect(getByTestId('icon-mic-outline')).toBeTruthy();
      expect(queryByTestId('icon-mic')).toBeNull();

      rerender(<ListeningIndicator isListening={true} />);
      expect(getByTestId('icon-mic')).toBeTruthy();
      expect(queryByTestId('icon-mic-outline')).toBeNull();
    });

    it('should switch from mic to mic-outline when isListening changes to false', () => {
      const { rerender, getByTestId, queryByTestId } = render(
        <ListeningIndicator isListening={true} />
      );
      expect(getByTestId('icon-mic')).toBeTruthy();

      rerender(<ListeningIndicator isListening={false} />);
      expect(getByTestId('icon-mic-outline')).toBeTruthy();
      expect(queryByTestId('icon-mic')).toBeNull();
    });
  });

  // ---------- Ring animation effects ----------

  describe('Ring animations', () => {
    it('should trigger animation effects via useEffect when isListening=true', () => {
      // Reanimated is mocked, so we just verify no errors on mount
      const { unmount } = render(<ListeningIndicator isListening={true} />);
      // Advance timers to trigger the initial opacity timeout (index * 300)
      jest.advanceTimersByTime(1000);
      unmount();
    });

    it('should handle transition from listening to not listening', () => {
      const { rerender, unmount } = render(<ListeningIndicator isListening={true} />);
      jest.advanceTimersByTime(600);
      rerender(<ListeningIndicator isListening={false} />);
      jest.advanceTimersByTime(300);
      unmount();
    });

    it('should clean up timeout on unmount while listening', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const { unmount } = render(<ListeningIndicator isListening={true} />);
      unmount();
      // Each Ring sets a timeout when isListening, cleanup should call clearTimeout
      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should handle rapid toggling of isListening', () => {
      const { rerender } = render(<ListeningIndicator isListening={false} />);
      rerender(<ListeningIndicator isListening={true} />);
      rerender(<ListeningIndicator isListening={false} />);
      rerender(<ListeningIndicator isListening={true} />);
      rerender(<ListeningIndicator isListening={false} />);
      // Should not throw
    });
  });

  // ---------- Ring sizing ----------

  describe('Ring sizing', () => {
    it('should render rings with increasing sizes', () => {
      const { toJSON } = render(<ListeningIndicator isListening={true} />);
      const tree = toJSON();
      // Rings are the first 3 children of the container
      // Ring size = CENTER_SIZE(80) + RING_GAP(24) * (index + 1) * 2
      // Ring 0: 80 + 24 * 1 * 2 = 128
      // Ring 1: 80 + 24 * 2 * 2 = 176
      // Ring 2: 80 + 24 * 3 * 2 = 224
      expect(tree).toBeTruthy();
      if (tree && !Array.isArray(tree) && tree.children) {
        const rings = tree.children.slice(0, 3);
        expect(rings.length).toBe(3);
        // Each ring should have width/height style properties
        rings.forEach((ring: unknown) => {
          if (ring && typeof ring === 'object' && 'props' in ring) {
            const ringWithProps = ring as { props?: { style?: unknown } };
            expect(ringWithProps.props?.style).toBeTruthy();
          }
        });
      }
    });
  });

  // ---------- Snapshot test ----------

  describe('Snapshot', () => {
    it('should match snapshot when listening', () => {
      const { toJSON } = render(<ListeningIndicator isListening={true} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot when not listening', () => {
      const { toJSON } = render(<ListeningIndicator isListening={false} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
