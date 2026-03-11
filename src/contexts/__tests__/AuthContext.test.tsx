import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AuthService } from '@/services/AuthService';
import { getAuthErrorMessage } from '@/utils/authErrorMessage';

type MockService = {
  onAuthStateChanged: jest.Mock;
  cleanup: jest.Mock;
  signInWithEmail: jest.Mock;
  signUpWithEmail: jest.Mock;
  signInWithGoogle: jest.Mock;
  signInWithApple: jest.Mock;
  signOut: jest.Mock;
  sendPasswordResetEmail: jest.Mock;
  sendEmailVerification: jest.Mock;
};

let mockLatestService: MockService | null = null;

function mockMakeService(overrides?: Partial<MockService>): MockService {
  return {
    onAuthStateChanged: jest.fn((callback: (user: unknown) => void) => {
      callback(null);
      return jest.fn();
    }),
    cleanup: jest.fn(),
    signInWithEmail: jest.fn(),
    signUpWithEmail: jest.fn(),
    signInWithGoogle: jest.fn(),
    signInWithApple: jest.fn(),
    signOut: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendEmailVerification: jest.fn(),
    ...overrides,
  };
}

jest.mock('@/config/firebase', () => ({
  getFirebaseAuth: jest.fn(() => ({ currentUser: null })),
}));

jest.mock('@/config/env', () => ({
  googleConfig: {
    webClientId: 'mock-google-web-client-id',
    iosClientId: 'mock-google-ios-client-id',
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/services/AuthService', () => ({
  AuthService: jest.fn().mockImplementation(() => {
    mockLatestService = mockMakeService();
    return mockLatestService;
  }),
}));

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const BadConsumer = () => {
      useAuth();
      return null;
    };

    expect(() => render(<BadConsumer />)).toThrow('useAuth must be used inside <AuthProvider>');
  });

  it('hydrates user/loading state from auth listener and configures Google sign-in', async () => {
    const unsubscribe = jest.fn();
    (AuthService as unknown as jest.Mock).mockImplementationOnce(() => {
      mockLatestService = mockMakeService({
        onAuthStateChanged: jest.fn((callback: (user: unknown) => void) => {
          callback({ uid: 'user-123' });
          return unsubscribe;
        }),
      });
      return mockLatestService;
    });

    const AuthStateProbe: React.FC = () => {
      const { user, isLoading } = useAuth();
      return (
        <>
          <Text testID="user">{user?.uid ?? 'none'}</Text>
          <Text testID="loading">{String(isLoading)}</Text>
        </>
      );
    };

    const { getByTestId, unmount } = render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('user').props.children).toBe('user-123');
      expect(getByTestId('loading').props.children).toBe('false');
    });

    expect(GoogleSignin.configure).toHaveBeenCalledWith({
      webClientId: 'mock-google-web-client-id',
      iosClientId: 'mock-google-ios-client-id',
      offlineAccess: false,
    });

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
    expect(mockLatestService?.cleanup).toHaveBeenCalled();
  });

  it('sets and clears user-friendly auth error when sign-in fails', async () => {
    const ErrorProbe: React.FC = () => {
      const { error, signIn, clearError } = useAuth();
      return (
        <>
          <Text testID="error">{error ?? 'none'}</Text>
          <Pressable
            testID="sign-in"
            onPress={() => {
              void signIn('user@example.com', 'password').catch(() => {});
            }}
          >
            <Text>Sign In</Text>
          </Pressable>
          <Pressable testID="clear-error" onPress={clearError}>
            <Text>Clear Error</Text>
          </Pressable>
        </>
      );
    };

    const { getByTestId } = render(
      <AuthProvider>
        <ErrorProbe />
      </AuthProvider>
    );

    mockLatestService?.signInWithEmail.mockRejectedValueOnce(new Error('Invalid credentials'));
    fireEvent.press(getByTestId('sign-in'));

    await waitFor(() => {
      expect(getByTestId('error').props.children).toBe(
        getAuthErrorMessage(new Error('Invalid credentials'), 'signIn')
      );
    });

    fireEvent.press(getByTestId('clear-error'));
    expect(getByTestId('error').props.children).toBe('none');
  });

  it('maps firebase auth code errors to clear messages', async () => {
    const ErrorProbe: React.FC = () => {
      const { error, signIn } = useAuth();
      return (
        <>
          <Text testID="error">{error ?? 'none'}</Text>
          <Pressable
            testID="sign-in"
            onPress={() => {
              void signIn('user@example.com', 'password').catch(() => {});
            }}
          >
            <Text>Sign In</Text>
          </Pressable>
        </>
      );
    };

    const { getByTestId } = render(
      <AuthProvider>
        <ErrorProbe />
      </AuthProvider>
    );

    const wrongPasswordError = Object.assign(new Error('Firebase auth failed'), {
      code: 'auth/wrong-password',
    });

    mockLatestService?.signInWithEmail.mockRejectedValueOnce(wrongPasswordError);
    fireEvent.press(getByTestId('sign-in'));

    await waitFor(() => {
      expect(getByTestId('error').props.children).toBe('Incorrect password.');
    });
  });
});
