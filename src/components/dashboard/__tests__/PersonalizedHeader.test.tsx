/**
 * PersonalizedHeader Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));

// Mock AvatarService
jest.mock('@/services/AvatarService', () => ({
  avatarService: {
    pickFromLibrary: jest.fn(),
    pickFromCamera: jest.fn(),
    deleteAvatar: jest.fn(),
  },
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const RN = require('react-native');
  const chainable = () => {
    const obj: Record<string, unknown> = {};
    const handler = () => obj;
    obj.onBegin = handler;
    obj.onEnd = handler;
    obj.onFinalize = handler;
    obj.minDuration = handler;
    return obj;
  };
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    GestureDetector: ({ children }: any) => React.createElement(RN.View, null, children),
    Gesture: {
      Tap: chainable,
      LongPress: chainable,
      Exclusive: () => ({}),
    },
  };
});

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
    withSpring: (val: number) => val,
    withDelay: (_d: number, val: number) => val,
    runOnJS: (fn: unknown) => fn,
  };
});

// Standard greetings by time of day
const ALL_GREETINGS = ['Good morning', 'Good afternoon', 'Good evening', 'Good night'];

/** Helper: check if a greeting appears in the rendered text tree */
function findGreeting(
  queryByText: (text: string | RegExp) => unknown,
  greetings: string[],
  name: string
) {
  return greetings.some((g) => {
    try {
      return queryByText(new RegExp(`${g},\\s+${name}!`)) !== null;
    } catch {
      return false;
    }
  });
}

describe('PersonalizedHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with user name in greeting', () => {
      const { queryByText } = render(<PersonalizedHeader name="John Doe" testID="header" />);
      const found = findGreeting(queryByText, ALL_GREETINGS, 'John Doe');
      expect(found).toBe(true);
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

    it('should render time-based greeting with name', () => {
      const { queryByText } = render(<PersonalizedHeader name="John" />);
      const found = findGreeting(queryByText, ALL_GREETINGS, 'John');
      expect(found).toBe(true);
    });

    it('should render with testID', () => {
      const { getByTestId } = render(<PersonalizedHeader name="John" testID="test-header" />);
      expect(getByTestId('test-header')).toBeTruthy();
    });
  });

  describe('Greeting variants by time', () => {
    const originalDate = global.Date;

    afterEach(() => {
      global.Date = originalDate;
    });

    function mockHour(hour: number) {
      global.Date = class extends originalDate {
        getHours() {
          return hour;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    }

    it('should show morning greeting (5-11)', () => {
      mockHour(7);
      const { queryByText } = render(<PersonalizedHeader name="Test" />);
      expect(findGreeting(queryByText, ['Good morning'], 'Test')).toBe(true);
    });

    it('should show afternoon greeting (12-16)', () => {
      mockHour(14);
      const { queryByText } = render(<PersonalizedHeader name="Test" />);
      expect(findGreeting(queryByText, ['Good afternoon'], 'Test')).toBe(true);
    });

    it('should show evening greeting (17-20)', () => {
      mockHour(18);
      const { queryByText } = render(<PersonalizedHeader name="Test" />);
      expect(findGreeting(queryByText, ['Good evening'], 'Test')).toBe(true);
    });

    it('should show night greeting (21-4)', () => {
      mockHour(23);
      const { queryByText } = render(<PersonalizedHeader name="Test" />);
      expect(findGreeting(queryByText, ['Good night'], 'Test')).toBe(true);
    });

    it('should show night greeting for early morning (hour 2)', () => {
      mockHour(2);
      const { queryByText } = render(<PersonalizedHeader name="Test" />);
      expect(findGreeting(queryByText, ['Good night'], 'Test')).toBe(true);
    });
  });

  describe('Avatar', () => {
    it('should render initials when no avatarUri is provided', () => {
      const { getByText, queryByTestId } = render(
        <PersonalizedHeader name="John Doe" testID="header" />
      );
      expect(getByText('JD')).toBeTruthy();
      expect(queryByTestId('header-avatar-image')).toBeNull();
    });

    it('should render image when avatarUri is provided', () => {
      const { queryByTestId } = render(
        <PersonalizedHeader
          name="John Doe"
          avatarUri="file:///path/to/avatar.jpg"
          testID="header"
        />
      );
      expect(queryByTestId('header-avatar-image')).toBeTruthy();
      expect(queryByTestId('header-avatar-initials')).toBeNull();
    });

    it('should render camera badge', () => {
      const { getByTestId } = render(<PersonalizedHeader name="John Doe" testID="header" />);
      expect(getByTestId('header-camera-badge')).toBeTruthy();
    });

    it('should call onAvatarChange with null on image error', () => {
      const onAvatarChange = jest.fn();
      const { getByTestId } = render(
        <PersonalizedHeader
          name="John Doe"
          avatarUri="file:///nonexistent.jpg"
          onAvatarChange={onAvatarChange}
          testID="header"
        />
      );
      fireEvent(getByTestId('header-avatar-image'), 'error');
      expect(onAvatarChange).toHaveBeenCalledWith(null);
    });
  });
});
