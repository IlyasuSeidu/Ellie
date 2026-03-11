import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { EmailVerificationScreen } from '@/screens/auth/EmailVerificationScreen';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseAuth } from '@/config/firebase';

const mockNavigate = jest.fn();
const mockReset = jest.fn();
const mockGetParent = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    getParent: mockGetParent,
  }),
  useRoute: () => ({
    params: { email: 'verify@example.com' },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/config/firebase', () => ({
  getFirebaseAuth: jest.fn(),
}));

describe('EmailVerificationScreen', () => {
  const mockSendEmailVerification = jest.fn();
  const mockClearError = jest.fn();
  const mockReload = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetParent.mockReturnValue({ reset: mockReset });
    (useAuth as jest.Mock).mockReturnValue({
      sendEmailVerification: mockSendEmailVerification,
      error: null,
      clearError: mockClearError,
    });
    (getFirebaseAuth as jest.Mock).mockReturnValue({
      currentUser: {
        emailVerified: false,
        reload: mockReload.mockResolvedValue(undefined),
      },
    });
  });

  it('renders verification email and instructions', () => {
    const { getByText } = render(<EmailVerificationScreen />);

    expect(getByText('Verify your email')).toBeTruthy();
    expect(getByText('We sent a verification link to verify@example.com')).toBeTruthy();
  });

  it('resends verification email and starts cooldown', async () => {
    mockSendEmailVerification.mockResolvedValueOnce(undefined);

    const { getByTestId, getByText } = render(<EmailVerificationScreen />);
    fireEvent.press(getByTestId('resend-verification-button'));

    await waitFor(() => {
      expect(mockSendEmailVerification).toHaveBeenCalledTimes(1);
    });

    expect(getByText('Resend in 60s')).toBeTruthy();
  });

  it('resets to onboarding when user skips and parent navigator exists', () => {
    const { getByTestId } = render(<EmailVerificationScreen />);
    fireEvent.press(getByTestId('skip-verification-button'));

    expect(mockReset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Onboarding' }],
    });
  });

  it('falls back to sign-in navigation when parent navigator is unavailable', () => {
    mockGetParent.mockReturnValue(undefined);

    const { getByTestId } = render(<EmailVerificationScreen />);
    fireEvent.press(getByTestId('skip-verification-button'));

    expect(mockNavigate).toHaveBeenCalledWith('SignIn');
  });

  it('shows auth error banner when resend fails', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      sendEmailVerification: mockSendEmailVerification,
      error: 'Unable to send verification email right now. Please try again.',
      clearError: mockClearError,
    });

    const { getByText } = render(<EmailVerificationScreen />);
    expect(
      getByText('Unable to send verification email right now. Please try again.')
    ).toBeTruthy();
  });
});
