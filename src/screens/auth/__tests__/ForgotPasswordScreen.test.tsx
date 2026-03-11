import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { useAuth } from '@/contexts/AuthContext';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: { email: 'prefilled@example.com' },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('ForgotPasswordScreen', () => {
  const mockSendPasswordReset = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      sendPasswordReset: mockSendPasswordReset,
      error: null,
      clearError: mockClearError,
    });
  });

  it('prefills email from route params and clears errors on mount', () => {
    const { getByDisplayValue } = render(<ForgotPasswordScreen />);
    expect(getByDisplayValue('prefilled@example.com')).toBeTruthy();
    expect(mockClearError).toHaveBeenCalledTimes(1);
  });

  it('validates email before sending reset link', () => {
    const { getByTestId, getByText } = render(<ForgotPasswordScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'invalid-email');
    fireEvent.press(getByTestId('send-reset-link-button'));

    expect(mockSendPasswordReset).not.toHaveBeenCalled();
    expect(getByText('Enter a valid email address')).toBeTruthy();
  });

  it('sends reset email and shows success state', async () => {
    mockSendPasswordReset.mockResolvedValueOnce(undefined);
    const { getByTestId, getByText } = render(<ForgotPasswordScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'reset@example.com');
    fireEvent.press(getByTestId('send-reset-link-button'));

    await waitFor(() => {
      expect(mockSendPasswordReset).toHaveBeenCalledWith('reset@example.com');
    });
    expect(getByText('Check your inbox')).toBeTruthy();
    expect(getByText('We sent a password reset link to reset@example.com')).toBeTruthy();
  });

  it('navigates back to sign-in from success state', async () => {
    mockSendPasswordReset.mockResolvedValueOnce(undefined);
    const { getByTestId } = render(<ForgotPasswordScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'reset@example.com');
    fireEvent.press(getByTestId('send-reset-link-button'));

    await waitFor(() => {
      expect(getByTestId('back-to-sign-in-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('back-to-sign-in-button'));
    expect(mockNavigate).toHaveBeenCalledWith('SignIn');
  });
});
