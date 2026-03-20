import React from 'react';
import { render } from '@testing-library/react-native';
import { theme } from '@/utils/theme';
import { SwipeHintLabel } from '../SwipeHintLabel';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = ({ name, color, ...rest }: any) =>
    React.createElement(RN.Text, { ...rest, testID: `icon-${name}`, style: { color } }, name);
  return { Ionicons: MockIcon };
});

function extractColor(style: unknown): string | undefined {
  if (Array.isArray(style)) {
    return style.reduce<string | undefined>((resolved, entry) => {
      if (resolved) return resolved;
      if (!entry || typeof entry !== 'object' || !('color' in entry)) return undefined;
      return (entry as { color?: string }).color;
    }, undefined);
  }

  if (!style || typeof style !== 'object' || !('color' in style)) return undefined;
  return (style as { color?: string }).color;
}

describe('SwipeHintLabel', () => {
  it('uses the text color for the arrow icon by default', () => {
    const { getByTestId } = render(
      <SwipeHintLabel direction="left" text="Next option" textStyle={{ color: '#22c55e' }} />
    );

    expect(extractColor(getByTestId('icon-arrow-back').props.style)).toBe('#22c55e');
  });

  it('prefers explicit iconColor over the text color', () => {
    const { getByTestId } = render(
      <SwipeHintLabel
        direction="right"
        text="This one"
        textStyle={{ color: '#22c55e' }}
        iconColor="#f59e0b"
      />
    );

    expect(extractColor(getByTestId('icon-arrow-forward').props.style)).toBe('#f59e0b');
  });

  it('falls back to the default theme color when no text color is provided', () => {
    const { getByTestId } = render(<SwipeHintLabel direction="up" text="Learn more" />);

    expect(extractColor(getByTestId('icon-arrow-up').props.style)).toBe(theme.colors.paper);
  });
});
