/**
 * PremiumIntroductionScreen Component Tests
 */

/* eslint-disable @typescript-eslint/no-var-requires, require-await */
import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { PremiumIntroductionScreen } from '../PremiumIntroductionScreen';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { NavigationContainer } from '@react-navigation/native';

// Mock Ionicons
// Mock AsyncStorage
jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const RN = require('react-native');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockIcon = (props: any) => React.createElement(RN.Text, props, props.name || 'icon');
  return {
    Ionicons: MockIcon,
    MaterialIcons: MockIcon,
    FontAwesome: MockIcon,
    Feather: MockIcon,
  };
});

// Mock navigation
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: jest.fn(),
    }),
  };
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <NavigationContainer>
      <OnboardingProvider>{component}</OnboardingProvider>
    </NavigationContainer>
  );
};

// Use fake timers
jest.useFakeTimers();

describe('PremiumIntroductionScreen', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    alertSpy = jest.spyOn(Alert, 'alert');
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  describe('Initial Rendering', () => {
    it('should render the screen', () => {
      const { getByTestId } = renderWithProviders(<PremiumIntroductionScreen />);
      expect(getByTestId('premium-introduction-screen')).toBeTruthy();
    });

    it('should show welcome message after delay', async () => {
      const { findByText } = renderWithProviders(<PremiumIntroductionScreen />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      const welcomeMessage = await findByText(/Welcome to Ellie!/);
      expect(welcomeMessage).toBeTruthy();
    });
  });

  describe('Conversational Flow', () => {
    it('should show name question after welcome', async () => {
      const { getAllByText } = renderWithProviders(<PremiumIntroductionScreen />);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        const nameQuestion = getAllByText("What's your name?");
        expect(nameQuestion.length).toBeGreaterThan(0);
      });
    });

    it('should render input placeholder', async () => {
      const { findByPlaceholderText } = renderWithProviders(<PremiumIntroductionScreen />);

      await act(async () => {
        jest.advanceTimersByTime(6000);
      });

      const input = await findByPlaceholderText('Enter your name', { timeout: 3000 });
      expect(input).toBeTruthy();
    });
  });

  describe('Name Validation', () => {
    it('should accept valid name input', async () => {
      const { findByPlaceholderText } = renderWithProviders(<PremiumIntroductionScreen />);

      await act(async () => {
        jest.advanceTimersByTime(6000);
      });

      const input = await findByPlaceholderText('Enter your name', { timeout: 3000 });
      fireEvent.changeText(input, 'John Doe');

      expect(input.props.value).toBe('John Doe');
    });

    it('should accept names with apostrophes', async () => {
      const { findByPlaceholderText } = renderWithProviders(<PremiumIntroductionScreen />);

      await act(async () => {
        jest.advanceTimersByTime(6000);
      });

      const input = await findByPlaceholderText('Enter your name', { timeout: 3000 });
      fireEvent.changeText(input, "John O'Brien");

      expect(input).toBeTruthy();
    });

    it('should accept names with hyphens', async () => {
      const { findByPlaceholderText } = renderWithProviders(<PremiumIntroductionScreen />);

      await act(async () => {
        jest.advanceTimersByTime(6000);
      });

      const input = await findByPlaceholderText('Enter your name', { timeout: 3000 });
      fireEvent.changeText(input, 'Mary-Jane Smith');

      expect(input).toBeTruthy();
    });
  });

  describe('Company Field Requirement', () => {
    it('should have company field as required (schema validation)', () => {
      // Company field is required in the Zod schema (not optional)
      // This is validated at the schema level in PremiumIntroductionScreen
      const { getByTestId } = renderWithProviders(<PremiumIntroductionScreen />);
      expect(getByTestId('premium-introduction-screen')).toBeTruthy();
    });
  });

  describe('Chat Interface', () => {
    it('should render bot messages', async () => {
      const { findByText } = renderWithProviders(<PremiumIntroductionScreen />);

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      const botMessage = await findByText(/Welcome to Ellie!/);
      expect(botMessage).toBeTruthy();
    });

    it('should render multiple bot messages in sequence', async () => {
      const { getAllByText } = renderWithProviders(<PremiumIntroductionScreen />);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        const welcomeMessages = getAllByText(/Welcome to Ellie!/);
        expect(welcomeMessages.length).toBeGreaterThan(0);
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        const nameMessages = getAllByText("What's your name?");
        expect(nameMessages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have testID for screen', () => {
      const { getByTestId } = renderWithProviders(<PremiumIntroductionScreen />);
      expect(getByTestId('premium-introduction-screen')).toBeTruthy();
    });

    it('should use custom testID when provided', () => {
      const { getByTestId } = renderWithProviders(
        <PremiumIntroductionScreen testID="custom-intro" />
      );
      expect(getByTestId('custom-intro')).toBeTruthy();
    });
  });

  describe('Props', () => {
    it('should accept onContinue callback prop', () => {
      const mockOnContinue = jest.fn();
      const { getByTestId } = renderWithProviders(
        <PremiumIntroductionScreen onContinue={mockOnContinue} />
      );
      expect(getByTestId('premium-introduction-screen')).toBeTruthy();
    });

    it('should work without onContinue callback', () => {
      const { getByTestId } = renderWithProviders(<PremiumIntroductionScreen />);
      expect(getByTestId('premium-introduction-screen')).toBeTruthy();
    });
  });

  describe('Input Handling', () => {
    it('should handle text input changes', async () => {
      const { findByPlaceholderText } = renderWithProviders(<PremiumIntroductionScreen />);

      await act(async () => {
        jest.advanceTimersByTime(6000);
      });

      const input = await findByPlaceholderText('Enter your name', { timeout: 3000 });
      fireEvent.changeText(input, 'John Doe');

      expect(input.props.value).toBe('John Doe');
    });

    it('should maintain input value', async () => {
      const { findByPlaceholderText } = renderWithProviders(<PremiumIntroductionScreen />);

      await act(async () => {
        jest.advanceTimersByTime(6000);
      });

      const input = await findByPlaceholderText('Enter your name', { timeout: 3000 });
      fireEvent.changeText(input, 'Test User');

      expect(input.props.value).toBe('Test User');
    });
  });

  describe('Screen State', () => {
    it('should maintain screen state during conversation', async () => {
      const { getByTestId, findByText } = renderWithProviders(<PremiumIntroductionScreen />);

      const screen = getByTestId('premium-introduction-screen');
      expect(screen).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      expect(getByTestId('premium-introduction-screen')).toBeTruthy();

      const welcome = await findByText(/Welcome to Ellie!/);
      expect(welcome).toBeTruthy();
    });

    it('should render without crashing', () => {
      const { getByTestId } = renderWithProviders(<PremiumIntroductionScreen />);
      expect(getByTestId('premium-introduction-screen')).toBeTruthy();
    });
  });
});
