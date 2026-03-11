import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AuthService } from '@/services/AuthService';
import { getFirebaseAuth } from '@/config/firebase';
import { googleConfig } from '@/config/env';
import { logger } from '@/utils/logger';
import { getAuthErrorMessage } from '@/utils/authErrorMessage';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

let authServiceSingleton: AuthService | null = null;

function getAuthService(): AuthService {
  if (!authServiceSingleton) {
    authServiceSingleton = new AuthService(getFirebaseAuth());
  }
  return authServiceSingleton;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const service = getAuthService();

  useEffect(() => {
    const unsubscribe = service.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
      logger.debug('AuthContext: auth state changed', {
        uid: firebaseUser?.uid ?? null,
      });
    });

    return () => {
      unsubscribe();
      service.cleanup();
    };
  }, [service]);

  useEffect(() => {
    const maybeIosClientId = (googleConfig as { iosClientId?: string }).iosClientId;

    const googleSignInConfig: {
      webClientId: string;
      offlineAccess: boolean;
      iosClientId?: string;
    } = {
      webClientId: googleConfig.webClientId,
      offlineAccess: false,
    };

    if (maybeIosClientId) {
      googleSignInConfig.iosClientId = maybeIosClientId;
    }

    GoogleSignin.configure({
      ...googleSignInConfig,
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null);
        await service.signInWithEmail(email, password);
      } catch (err) {
        const message = getAuthErrorMessage(err, 'signIn');
        setError(message);
        throw err;
      }
    },
    [service]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null);
        await service.signUpWithEmail(email, password);
      } catch (err) {
        const message = getAuthErrorMessage(err, 'signUp');
        setError(message);
        throw err;
      }
    },
    [service]
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      setError(null);
      await service.signInWithGoogle();
    } catch (err) {
      const message = getAuthErrorMessage(err, 'googleSignIn');
      setError(message);
      throw err;
    }
  }, [service]);

  const signInWithApple = useCallback(async () => {
    try {
      setError(null);
      await service.signInWithApple();
    } catch (err) {
      const message = getAuthErrorMessage(err, 'appleSignIn');
      setError(message);
      throw err;
    }
  }, [service]);

  const signOut = useCallback(async () => {
    try {
      setError(null);
      await service.signOut();
      try {
        await GoogleSignin.signOut();
      } catch {
        // Ignore: user may not have signed in with Google.
      }
    } catch (err) {
      const message = getAuthErrorMessage(err, 'signOut');
      setError(message);
      throw err;
    }
  }, [service]);

  const sendPasswordReset = useCallback(
    async (email: string) => {
      try {
        setError(null);
        await service.sendPasswordResetEmail(email);
      } catch (err) {
        const message = getAuthErrorMessage(err, 'passwordReset');
        setError(message);
        throw err;
      }
    },
    [service]
  );

  const sendEmailVerification = useCallback(async () => {
    try {
      setError(null);
      await service.sendEmailVerification();
    } catch (err) {
      const message = getAuthErrorMessage(err, 'emailVerification');
      setError(message);
      throw err;
    }
  }, [service]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      error,
      clearError,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      signOut,
      sendPasswordReset,
      sendEmailVerification,
    }),
    [
      user,
      isLoading,
      error,
      clearError,
      signIn,
      signUp,
      signInWithGoogle,
      signInWithApple,
      signOut,
      sendPasswordReset,
      sendEmailVerification,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
};
