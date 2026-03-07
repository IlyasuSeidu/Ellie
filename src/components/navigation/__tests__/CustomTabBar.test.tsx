import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CustomTabBar } from '../CustomTabBar';
import { theme } from '@/utils/theme';
import { shiftColors } from '@/constants/shiftStyles';

const mockOpenModal = jest.fn();
const mockUseVoiceAssistant = jest.fn();
const mockUseShiftAccent = jest.fn();

function extractTextColor(
  style: { color?: string } | Array<{ color?: string } | null> | undefined
): string | undefined {
  if (Array.isArray(style)) {
    const flattened = style.reduce<Record<string, unknown>>((acc, item) => {
      if (!item) return acc;
      return { ...acc, ...item };
    }, {});
    return flattened.color as string | undefined;
  }
  return style?.color;
}

jest.mock('@/contexts/VoiceAssistantContext', () => ({
  useVoiceAssistant: () => mockUseVoiceAssistant(),
}));

jest.mock('@/hooks/useShiftAccent', () => ({
  useShiftAccent: () => mockUseShiftAccent(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 10, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Ionicons: ({ name, color, style, ...rest }: any) =>
      React.createElement(RN.Text, { ...rest, testID: `icon-${name}`, style: [style, { color }] }),
  };
});

jest.mock('expo-blur', () => {
  const React = require('react');
  const RN = require('react-native');
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    BlurView: (props: any) => React.createElement(RN.View, props),
  };
});

type TestProps = React.ComponentProps<typeof CustomTabBar>;

const routes = [
  { key: 'home', name: 'Home' },
  { key: 'schedule', name: 'Schedule' },
  { key: 'ellie', name: 'Ellie' },
  { key: 'stats', name: 'Stats' },
  { key: 'profile', name: 'Profile' },
];

function buildProps(index: number, defaultPrevented = false): TestProps {
  const emit = jest.fn(() => ({ defaultPrevented }));
  const navigate = jest.fn();

  return {
    state: {
      index,
      routes,
      key: 'tab-state',
      routeNames: routes.map((route) => route.name),
      type: 'tab',
      stale: false,
      history: [],
    },
    descriptors: {},
    navigation: {
      emit,
      navigate,
    },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  } as unknown as TestProps;
}

describe('CustomTabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseVoiceAssistant.mockReturnValue({
      state: 'idle',
      openModal: mockOpenModal,
    });
    mockUseShiftAccent.mockReturnValue({
      shiftType: null,
      statusAreaColor: '#0c0a09',
      tabAccentColor: theme.colors.paleGold,
      tabGlowColor: theme.colors.opacity.gold20,
    });
  });

  it('navigates to non-focused tab on press', () => {
    const props = buildProps(0);
    const { getByLabelText } = render(<CustomTabBar {...props} />);

    fireEvent.press(getByLabelText('Schedule'));

    expect(props.navigation.emit).toHaveBeenCalled();
    expect(props.navigation.navigate).toHaveBeenCalledWith('Schedule');
  });

  it('does not navigate when tabPress is prevented', () => {
    const props = buildProps(0, true);
    const { getByLabelText } = render(<CustomTabBar {...props} />);

    fireEvent.press(getByLabelText('Schedule'));

    expect(props.navigation.emit).toHaveBeenCalled();
    expect(props.navigation.navigate).not.toHaveBeenCalled();
  });

  it('does not navigate when pressing focused tab', () => {
    const props = buildProps(0);
    const { getByLabelText } = render(<CustomTabBar {...props} />);

    fireEvent.press(getByLabelText('Home'));

    expect(props.navigation.emit).toHaveBeenCalled();
    expect(props.navigation.navigate).not.toHaveBeenCalled();
  });

  it('opens voice assistant modal from center button', () => {
    const props = buildProps(1);
    const { getByLabelText } = render(<CustomTabBar {...props} />);

    fireEvent.press(getByLabelText('Open Ellie voice assistant'));

    expect(mockOpenModal).toHaveBeenCalled();
    expect(props.navigation.navigate).not.toHaveBeenCalled();
  });

  it('renders in active voice mode and center tab state', () => {
    mockUseVoiceAssistant.mockReturnValue({
      state: 'listening',
      openModal: mockOpenModal,
    });

    const props = buildProps(2);
    const { getByLabelText } = render(<CustomTabBar {...props} />);

    expect(getByLabelText('Open Ellie voice assistant')).toBeTruthy();
  });

  it('uses the original focused tab color when no rotating shift accent is available', () => {
    const props = buildProps(0);
    const { getByTestId } = render(<CustomTabBar {...props} />);

    expect(extractTextColor(getByTestId('icon-home').props.style)).toBe(theme.colors.paleGold);
  });

  it('uses rotating shift color for focused tab when shift is active', () => {
    mockUseShiftAccent.mockReturnValue({
      shiftType: 'morning',
      statusAreaColor: shiftColors.morning.primary,
      tabAccentColor: shiftColors.morning.primary,
      tabGlowColor: 'rgba(245, 158, 11, 0.2)',
    });

    const props = buildProps(0);
    const { getByTestId } = render(<CustomTabBar {...props} />);

    expect(extractTextColor(getByTestId('icon-home').props.style)).toBe(
      shiftColors.morning.primary
    );
  });

  it('keeps original focused tab color when active rotating shift is off', () => {
    mockUseShiftAccent.mockReturnValue({
      shiftType: 'off',
      statusAreaColor: '#0c0a09',
      tabAccentColor: theme.colors.paleGold,
      tabGlowColor: theme.colors.opacity.gold20,
    });

    const props = buildProps(0);
    const { getByTestId } = render(<CustomTabBar {...props} />);

    expect(extractTextColor(getByTestId('icon-home').props.style)).toBe(theme.colors.paleGold);
  });

  it('applies dynamic shift accent color to center mic icon', () => {
    mockUseShiftAccent.mockReturnValue({
      shiftType: 'night',
      statusAreaColor: shiftColors.night.primary,
      tabAccentColor: shiftColors.night.primary,
      tabGlowColor: 'rgba(101, 31, 255, 0.2)',
    });

    const props = buildProps(0);
    const { getByTestId } = render(<CustomTabBar {...props} />);

    expect(extractTextColor(getByTestId('icon-mic-outline').props.style)).toBe(
      shiftColors.night.primary
    );
  });
});
