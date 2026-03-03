import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CustomTabBar } from '../CustomTabBar';

const mockOpenModal = jest.fn();
const mockUseVoiceAssistant = jest.fn();

jest.mock('@/contexts/VoiceAssistantContext', () => ({
  useVoiceAssistant: () => mockUseVoiceAssistant(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 10, left: 0, right: 0 }),
}));

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
});
