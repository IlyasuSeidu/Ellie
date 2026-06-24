/* eslint-disable @typescript-eslint/no-var-requires */

describe('authSdk native provider wrappers', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('creates Apple credentials through the native static Apple provider', () => {
    const nativeAppleCredential = jest.fn((idToken?: string | null, rawNonce?: string | null) => ({
      providerId: 'apple.com',
      token: idToken,
      secret: rawNonce,
    }));

    jest.doMock('@/services/firebase/nativeAvailability', () => ({
      shouldUseFirebaseJsSdk: () => false,
      shouldUseNativeFirebaseFullStack: () => true,
    }));
    jest.doMock('@react-native-firebase/auth', () => ({
      AppleAuthProvider: {
        credential: nativeAppleCredential,
      },
      OAuthProvider: jest.fn().mockImplementation(() => ({})),
    }));

    const { AppleAuthProvider } =
      require('@/services/firebase/authSdk') as typeof import('../authSdk');

    expect(AppleAuthProvider.credential('apple-id-token', 'apple-raw-nonce')).toEqual({
      providerId: 'apple.com',
      token: 'apple-id-token',
      secret: 'apple-raw-nonce',
    });
    expect(nativeAppleCredential).toHaveBeenCalledWith('apple-id-token', 'apple-raw-nonce');
  });

  it('routes generic Apple OAuth credential creation to the native Apple provider fallback', () => {
    const nativeAppleCredential = jest.fn((idToken?: string | null, rawNonce?: string | null) => ({
      providerId: 'apple.com',
      token: idToken,
      secret: rawNonce,
    }));

    jest.doMock('@/services/firebase/nativeAvailability', () => ({
      shouldUseFirebaseJsSdk: () => false,
      shouldUseNativeFirebaseFullStack: () => true,
    }));
    jest.doMock('@react-native-firebase/auth', () => ({
      AppleAuthProvider: {
        credential: nativeAppleCredential,
      },
      OAuthProvider: jest.fn().mockImplementation(() => ({})),
    }));

    const { OAuthProvider } = require('@/services/firebase/authSdk') as typeof import('../authSdk');

    expect(
      new OAuthProvider('apple.com').credential({
        idToken: 'apple-id-token',
        rawNonce: 'apple-raw-nonce',
      })
    ).toEqual({
      providerId: 'apple.com',
      token: 'apple-id-token',
      secret: 'apple-raw-nonce',
    });
    expect(nativeAppleCredential).toHaveBeenCalledWith('apple-id-token', 'apple-raw-nonce');
  });
});
