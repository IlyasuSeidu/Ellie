/**
 * Jest Setup File
 *
 * Configures mocks and global test environment.
 */

// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      name: 'ShiftSync',
      version: '1.0.0',
      ios: {
        buildNumber: '1',
      },
      extra: {
        FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || 'test-api-key',
        FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || 'test.firebaseapp.com',
        FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'test-project',
        FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || 'test.appspot.com',
        FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '123456',
        FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || 'test-app-id',
        GOOGLE_WEB_CLIENT_ID: process.env.GOOGLE_WEB_CLIENT_ID || 'test-client-id',
      },
    },
  },
}));

// Mock react-native-reanimated before anything else
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  return {
    default: {
      createAnimatedComponent: (Component) => Component,
      View,
      Text,
    },
    View,
    Text,
    useSharedValue: jest.fn((initialValue) => ({ value: initialValue })),
    useAnimatedStyle: jest.fn((cb) => {
      try {
        return cb();
      } catch (e) {
        return {};
      }
    }),
    withSpring: jest.fn((value) => value),
    withTiming: jest.fn((value) => value),
    withDelay: jest.fn((_, value) => value),
    withSequence: jest.fn((...values) => values[values.length - 1]),
    withRepeat: jest.fn((value) => value),
    cancelAnimation: jest.fn(),
    measure: jest.fn(),
    Easing: {
      linear: (x) => x,
      ease: (x) => x,
      quad: (x) => x,
      cubic: (x) => x,
      bezier: () => (x) => x,
      out: (easing) => easing,
      in: (easing) => easing,
      inOut: (easing) => easing,
    },
    Extrapolate: {
      CLAMP: 'clamp',
      EXTEND: 'extend',
      IDENTITY: 'identity',
    },
    interpolate: jest.fn((value, input, output) => output[0]),
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    createAnimatedComponent: jest.fn((Component) => Component),
    // Entering animations with fully chainable methods
    FadeIn: {
      duration: jest.fn(function () {
        const chain = {
          springify: jest.fn(() => chain),
          delay: jest.fn(() => chain),
        };
        return chain;
      }),
      delay: jest.fn(function () {
        const chain = {
          springify: jest.fn(() => chain),
          duration: jest.fn(() => chain),
        };
        return chain;
      }),
    },
    FadeInDown: {
      duration: jest.fn(function () {
        const chain = {
          springify: jest.fn(() => chain),
          delay: jest.fn(() => chain),
        };
        return chain;
      }),
      delay: jest.fn(function () {
        const chain = {
          springify: jest.fn(() => chain),
          duration: jest.fn(() => chain),
        };
        return chain;
      }),
    },
    FadeInUp: {
      duration: jest.fn(function () {
        const chain = {
          springify: jest.fn(() => chain),
          delay: jest.fn(() => chain),
        };
        return chain;
      }),
      delay: jest.fn(function () {
        const chain = {
          springify: jest.fn(() => chain),
          duration: jest.fn(() => chain),
        };
        return chain;
      }),
    },
    FadeOut: {
      duration: jest.fn(function () {
        const chain = {
          springify: jest.fn(() => chain),
          delay: jest.fn(() => chain),
        };
        return chain;
      }),
    },
    SlideInDown: {
      duration: jest.fn(function () {
        const chain = {
          springify: jest.fn(() => chain),
          delay: jest.fn(() => chain),
        };
        return chain;
      }),
    },
    SlideOutDown: {
      duration: jest.fn(function () {
        const chain = {
          springify: jest.fn(() => chain),
          delay: jest.fn(() => chain),
        };
        return chain;
      }),
    },
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Gesture: {
      Pan: () => ({
        enabled: jest.fn().mockReturnThis(),
        onStart: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      }),
      Tap: () => ({
        enabled: jest.fn().mockReturnThis(),
        onStart: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      }),
      Simultaneous: (...gestures) => ({
        enabled: jest.fn().mockReturnThis(),
        onStart: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      }),
    },
    GestureDetector: ({ children }) => children,
    GestureHandlerRootView: View,
  };
});

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  return {
    LinearGradient: ({ children, ...props }) => {
      return React.createElement('LinearGradient', props, children);
    },
  };
});

// Mock expo modules that might cause issues
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ user: { id: 'test' } })),
    signOut: jest.fn(() => Promise.resolve()),
    isSignedIn: jest.fn(() => Promise.resolve(false)),
    getCurrentUser: jest.fn(() => Promise.resolve(null)),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: '0',
    IN_PROGRESS: '1',
    PLAY_SERVICES_NOT_AVAILABLE: '2',
  },
}));

jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(false)),
  signInAsync: jest.fn(),
}));

// Mock expo-speech-recognition (requires native module)
jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    getPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));

// Mock expo-speech (TTS)
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getAvailableVoicesAsync: jest.fn(() => Promise.resolve([{ identifier: 'en-US', name: 'English' }])),
  isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
}));

// Mock Firebase config to use test values
process.env.NODE_ENV = 'test';

// Define React Native global __DEV__
global.__DEV__ = true;

// Mock useWindowDimensions
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => {
  return {
    default: jest.fn(() => ({ width: 375, height: 812, fontScale: 1, scale: 1 })),
  };
});
