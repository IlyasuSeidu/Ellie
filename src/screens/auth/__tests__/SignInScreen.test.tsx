import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SignInScreen } from '@/screens/auth/SignInScreen';
import { useAuth } from '@/contexts/AuthContext';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('SignInScreen', () => {
  const mockSignIn = jest.fn();
  const mockSignInWithGoogle = jest.fn();
  const mockSignInWithApple = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      signIn: mockSignIn,
      signInWithGoogle: mockSignInWithGoogle,
      signInWithApple: mockSignInWithApple,
      error: null,
      clearError: mockClearError,
    });
  });

  it('clears auth error on mount', () => {
    render(<SignInScreen />);
    expect(mockClearError).toHaveBeenCalledTimes(1);
  });

  it('validates input before submit', () => {
    const { getByTestId, getByText } = render(<SignInScreen />);
    fireEvent.press(getByTestId('sign-in-button'));

    expect(mockSignIn).not.toHaveBeenCalled();
    expect(getByText('Enter a valid email address')).toBeTruthy();
    expect(getByText('Password is required')).toBeTruthy();
  });

  it('submits email/password sign-in with trimmed email', async () => {
    mockSignIn.mockResolvedValueOnce(undefined);
    const { getByTestId } = render(<SignInScreen />);

    fireEvent.changeText(getByTestId('email-input'), '  user@example.com  ');
    fireEvent.changeText(getByTestId('password-input'), 'Password123');
    fireEvent.press(getByTestId('sign-in-button'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'Password123');
    });
  });

  it('navigates to forgot password with current email', () => {
    const { getByTestId } = render(<SignInScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'recover@example.com');
    fireEvent.press(getByTestId('forgot-password-link'));

    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword', { email: 'recover@example.com' });
  });

  it('triggers social sign-in actions', async () => {
    mockSignInWithGoogle.mockResolvedValueOnce(undefined);
    mockSignInWithApple.mockResolvedValueOnce(undefined);
    const { getByTestId, queryByTestId } = render(<SignInScreen />);

    fireEvent.press(getByTestId('google-sign-in-button'));
    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });

    const appleButton = queryByTestId('apple-sign-in-button');
    if (appleButton) {
      fireEvent.press(appleButton);
      await waitFor(() => {
        expect(mockSignInWithApple).toHaveBeenCalledTimes(1);
      });
    }
  });
});
