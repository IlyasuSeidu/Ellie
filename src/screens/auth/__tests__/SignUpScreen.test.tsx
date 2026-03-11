import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SignUpScreen } from '@/screens/auth/SignUpScreen';
import { useAuth } from '@/contexts/AuthContext';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('SignUpScreen', () => {
  const mockSignUp = jest.fn();
  const mockSignInWithGoogle = jest.fn();
  const mockSignInWithApple = jest.fn();
  const mockSendEmailVerification = jest.fn();
  const mockClearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      signUp: mockSignUp,
      signInWithGoogle: mockSignInWithGoogle,
      signInWithApple: mockSignInWithApple,
      sendEmailVerification: mockSendEmailVerification,
      error: null,
      clearError: mockClearError,
    });
  });

  it('clears auth error on mount', () => {
    render(<SignUpScreen />);
    expect(mockClearError).toHaveBeenCalledTimes(1);
  });

  it('blocks submission when passwords do not match', () => {
    const { getByTestId, getByText } = render(<SignUpScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'new@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'Password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'Password124');
    fireEvent.press(getByTestId('create-account-button'));

    expect(mockSignUp).not.toHaveBeenCalled();
    expect(getByText('Passwords do not match')).toBeTruthy();
  });

  it('creates account and sends verification email', async () => {
    mockSignUp.mockResolvedValueOnce(undefined);
    mockSendEmailVerification.mockResolvedValueOnce(undefined);
    const { getByTestId } = render(<SignUpScreen />);

    fireEvent.changeText(getByTestId('email-input'), '  new@example.com ');
    fireEvent.changeText(getByTestId('password-input'), 'Password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'Password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('new@example.com', 'Password123');
    });
    expect(mockSendEmailVerification).toHaveBeenCalledTimes(1);
  });

  it('continues even when verification email fails', async () => {
    mockSignUp.mockResolvedValueOnce(undefined);
    mockSendEmailVerification.mockRejectedValueOnce(new Error('send failed'));
    const { getByTestId } = render(<SignUpScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'new@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'Password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'Password123');
    fireEvent.press(getByTestId('create-account-button'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledTimes(1);
      expect(mockSendEmailVerification).toHaveBeenCalledTimes(1);
    });
  });

  it('triggers social sign-up and sign-in navigation link', async () => {
    mockSignInWithGoogle.mockResolvedValueOnce(undefined);
    mockSignInWithApple.mockResolvedValueOnce(undefined);
    const { getByTestId, queryByTestId } = render(<SignUpScreen />);

    fireEvent.press(getByTestId('google-sign-up-button'));
    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });

    const appleButton = queryByTestId('apple-sign-up-button');
    if (appleButton) {
      fireEvent.press(appleButton);
      await waitFor(() => {
        expect(mockSignInWithApple).toHaveBeenCalledTimes(1);
      });
    }

    fireEvent.press(getByTestId('sign-in-link'));
    expect(mockNavigate).toHaveBeenCalledWith('SignIn');
  });
});
