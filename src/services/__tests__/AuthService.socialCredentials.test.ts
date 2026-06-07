import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { AuthService } from '@/services/AuthService';
import {
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithCredential,
  signInWithEmailAndPassword,
  type Auth,
  type User,
} from '@/services/firebase/authSdk';

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    getTokens: jest.fn(),
  },
}));

jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationScope: {
    FULL_NAME: 'FULL_NAME',
    EMAIL: 'EMAIL',
  },
  signInAsync: jest.fn(),
}));

jest.mock('@/services/firebase/authSdk', () => {
  const googleCredential = jest.fn((idToken?: string | null, accessToken?: string | null) => ({
    providerId: 'google.com',
    idToken,
    accessToken,
  }));
  const OAuthProviderMock = jest.fn().mockImplementation((providerId: string) => ({
    providerId,
    credential: jest.fn((options: { idToken?: string }) => ({
      providerId,
      ...options,
    })),
  }));

  return {
    createUserWithEmailAndPassword: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendEmailVerification: jest.fn(),
    updateEmail: jest.fn(),
    updatePassword: jest.fn(),
    deleteUser: jest.fn(),
    reauthenticateWithCredential: jest.fn(),
    onAuthStateChanged: jest.fn(),
    EmailAuthProvider: {
      credential: jest.fn(),
    },
    GoogleAuthProvider: {
      credential: googleCredential,
    },
    OAuthProvider: OAuthProviderMock,
    signInWithCredential: jest.fn(),
  };
});

describe('AuthService native auth provider credential flows', () => {
  const auth = { currentUser: null } as Auth;
  const emailUser = { uid: 'email-user', email: 'email@example.com' } as User;
  const googleUser = { uid: 'google-user', email: 'google@example.com' } as User;
  const appleUser = { uid: 'apple-user', email: 'apple@example.com' } as User;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(auth);
    jest.mocked(createUserWithEmailAndPassword).mockResolvedValue({ user: emailUser } as never);
    jest.mocked(signInWithEmailAndPassword).mockResolvedValue({ user: emailUser } as never);
    jest.mocked(signInWithCredential).mockResolvedValue({ user: googleUser } as never);
    jest.mocked(GoogleSignin.hasPlayServices).mockResolvedValue(undefined as never);
    jest.mocked(GoogleSignin.signIn).mockResolvedValue({} as never);
    jest.mocked(GoogleSignin.getTokens).mockResolvedValue({
      idToken: 'google-id-token',
      accessToken: 'google-access-token',
    } as never);
    jest.mocked(AppleAuthentication.signInAsync).mockResolvedValue({
      identityToken: 'apple-identity-token',
    } as never);
  });

  afterEach(() => {
    service.cleanup();
  });

  it('creates and signs in email/password users through Firebase Auth', async () => {
    await expect(service.signUpWithEmail('email@example.com', 'ValidPass123')).resolves.toBe(
      emailUser
    );
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      auth,
      'email@example.com',
      'ValidPass123'
    );

    await expect(service.signInWithEmail('email@example.com', 'ValidPass123')).resolves.toBe(
      emailUser
    );
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      auth,
      'email@example.com',
      'ValidPass123'
    );
  });

  it('exchanges the native Google ID token for a Firebase credential', async () => {
    await expect(service.signInWithGoogle()).resolves.toBe(googleUser);

    expect(GoogleSignin.hasPlayServices).toHaveBeenCalledTimes(1);
    expect(GoogleSignin.signIn).toHaveBeenCalledTimes(1);
    expect(GoogleSignin.getTokens).toHaveBeenCalledTimes(1);
    expect(GoogleAuthProvider.credential).toHaveBeenCalledWith('google-id-token');
    expect(signInWithCredential).toHaveBeenCalledWith(auth, {
      providerId: 'google.com',
      idToken: 'google-id-token',
      accessToken: undefined,
    });
  });

  it('rejects Google sign-in before Firebase when the native SDK does not return an ID token', async () => {
    jest.mocked(GoogleSignin.getTokens).mockResolvedValue({ idToken: null } as never);

    await expect(service.signInWithGoogle()).rejects.toMatchObject({
      code: 'google/no-id-token',
    });

    expect(GoogleAuthProvider.credential).not.toHaveBeenCalled();
    expect(signInWithCredential).not.toHaveBeenCalled();
  });

  it('exchanges the native Apple identity token for a Firebase OAuth credential', async () => {
    jest.mocked(signInWithCredential).mockResolvedValueOnce({ user: appleUser } as never);

    await expect(service.signInWithApple()).resolves.toBe(appleUser);

    expect(AppleAuthentication.signInAsync).toHaveBeenCalledWith({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    expect(OAuthProvider).toHaveBeenCalledWith('apple.com');
    expect(signInWithCredential).toHaveBeenCalledWith(auth, {
      providerId: 'apple.com',
      idToken: 'apple-identity-token',
    });
  });

  it('rejects Apple sign-in before Firebase when Apple does not return an identity token', async () => {
    jest
      .mocked(AppleAuthentication.signInAsync)
      .mockResolvedValue({ identityToken: null } as never);

    await expect(service.signInWithApple()).rejects.toMatchObject({
      code: 'apple/no-identity-token',
    });

    expect(OAuthProvider).not.toHaveBeenCalled();
    expect(signInWithCredential).not.toHaveBeenCalled();
  });
});
