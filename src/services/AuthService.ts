/**
 * Authentication Service
 *
 * Complete authentication service handling all auth flows with Firebase Auth.
 * Includes email/password, social auth, session management, and security features.
 */

import {
  Auth,
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  sendEmailVerification as firebaseSendEmailVerification,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  OAuthProvider,
} from 'firebase/auth';
import { logger } from '@/utils/logger';
import { ValidationError, AuthenticationError } from '@/utils/errorUtils';

/**
 * Unsubscribe function type
 */
export type Unsubscribe = () => void;

/**
 * Auth state change callback
 */
export type AuthStateCallback = (user: User | null) => void;

/**
 * Login attempt tracking
 */
interface LoginAttempt {
  email: string;
  attempts: number;
  lastAttempt: number;
}

/**
 * Inactivity tracking
 */
interface InactivityConfig {
  timeoutMs: number;
  warningMs: number;
  enabled: boolean;
}

/**
 * Password validation rules
 */
const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
};

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
};

/**
 * Inactivity configuration
 */
const INACTIVITY_CONFIG: InactivityConfig = {
  timeoutMs: 30 * 60 * 1000, // 30 minutes
  warningMs: 25 * 60 * 1000, // 25 minutes (5 min warning)
  enabled: true,
};

/**
 * Authentication Service
 */
export class AuthService {
  private auth: Auth;
  private loginAttempts: Map<string, LoginAttempt> = new Map();
  private inactivityTimer: NodeJS.Timeout | null = null;
  private lastActivity: number = Date.now();
  private authStateUnsubscribe: Unsubscribe | null = null;

  constructor(auth: Auth) {
    this.auth = auth;
    this.initializeInactivityTracking();
  }

  /**
   * Sign up with email and password
   */
  async signUpWithEmail(email: string, password: string): Promise<User> {
    logger.info('Signing up with email', { email });

    // Validate email
    if (!this.isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate password strength
    const passwordValidation = this.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new ValidationError(
        `Weak password: ${passwordValidation.errors.join(', ')}`
      );
    }

    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      logger.info('User signed up successfully', { userId: userCredential.user.uid });
      return userCredential.user;
    } catch (error: unknown) {
      logger.error('Sign up failed', error as Error, { email });
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<User> {
    logger.info('Signing in with email', { email });

    // Check rate limiting
    if (this.isRateLimited(email)) {
      const lockoutEnd = this.getLockoutEndTime(email);
      throw new AuthenticationError(
        `Too many failed login attempts. Try again after ${new Date(
          lockoutEnd
        ).toLocaleTimeString()}`,
        'auth/too-many-requests'
      );
    }

    // Validate email
    if (!this.isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      );

      // Clear failed attempts on success
      this.clearLoginAttempts(email);
      this.resetInactivityTimer();

      logger.info('User signed in successfully', { userId: userCredential.user.uid });
      return userCredential.user;
    } catch (error: unknown) {
      // Track failed attempt
      this.recordFailedLoginAttempt(email);

      logger.error('Sign in failed', error as Error, { email });
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<User> {
    logger.info('Signing in with Google');

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(this.auth, provider);

      this.resetInactivityTimer();

      logger.info('User signed in with Google', { userId: userCredential.user.uid });
      return userCredential.user;
    } catch (error: unknown) {
      logger.error('Google sign in failed', error as Error);
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Sign in with Apple
   */
  async signInWithApple(): Promise<User> {
    logger.info('Signing in with Apple');

    try {
      const provider = new OAuthProvider('apple.com');
      const userCredential = await signInWithPopup(this.auth, provider);

      this.resetInactivityTimer();

      logger.info('User signed in with Apple', { userId: userCredential.user.uid });
      return userCredential.user;
    } catch (error: unknown) {
      logger.error('Apple sign in failed', error as Error);
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    logger.info('Signing out user');

    try {
      await firebaseSignOut(this.auth);
      this.clearInactivityTimer();

      logger.info('User signed out successfully');
    } catch (error: unknown) {
      logger.error('Sign out failed', error as Error);
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    logger.info('Sending password reset email', { email });

    // Validate email
    if (!this.isValidEmail(email)) {
      throw new ValidationError('Invalid email format');
    }

    try {
      await firebaseSendPasswordResetEmail(this.auth, email);

      logger.info('Password reset email sent', { email });
    } catch (error: unknown) {
      logger.error('Failed to send password reset email', error as Error, { email });
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(): Promise<void> {
    const user = this.getCurrentUser();

    if (!user) {
      throw new AuthenticationError('No user is currently signed in', 'auth/user-not-found');
    }

    if (user.emailVerified) {
      logger.info('Email already verified', { userId: user.uid });
      return;
    }

    logger.info('Sending email verification', { userId: user.uid });

    try {
      await firebaseSendEmailVerification(user);

      logger.info('Email verification sent', { userId: user.uid });
    } catch (error: unknown) {
      logger.error('Failed to send email verification', error as Error, {
        userId: user.uid,
      });
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.auth.currentUser !== null;
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChanged(callback: AuthStateCallback): Unsubscribe {
    logger.debug('Subscribing to auth state changes');

    this.authStateUnsubscribe = firebaseOnAuthStateChanged(this.auth, callback);

    return () => {
      if (this.authStateUnsubscribe) {
        this.authStateUnsubscribe();
        this.authStateUnsubscribe = null;
      }
    };
  }

  /**
   * Update email
   */
  async updateEmail(newEmail: string): Promise<void> {
    const user = this.getCurrentUser();

    if (!user) {
      throw new AuthenticationError('No user is currently signed in', 'auth/user-not-found');
    }

    // Validate email
    if (!this.isValidEmail(newEmail)) {
      throw new ValidationError('Invalid email format');
    }

    logger.info('Updating email', { userId: user.uid, newEmail });

    try {
      await firebaseUpdateEmail(user, newEmail);

      logger.info('Email updated successfully', { userId: user.uid });
    } catch (error: unknown) {
      logger.error('Failed to update email', error as Error, { userId: user.uid });
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Update password
   */
  async updatePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = this.getCurrentUser();

    if (!user || !user.email) {
      throw new AuthenticationError('No user is currently signed in', 'auth/user-not-found');
    }

    // Validate new password strength
    const passwordValidation = this.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new ValidationError(
        `Weak password: ${passwordValidation.errors.join(', ')}`
      );
    }

    logger.info('Updating password', { userId: user.uid });

    try {
      // Reauthenticate first
      await this.reauthenticate(currentPassword);

      // Update password
      await firebaseUpdatePassword(user, newPassword);

      logger.info('Password updated successfully', { userId: user.uid });
    } catch (error: unknown) {
      logger.error('Failed to update password', error as Error, { userId: user.uid });
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Delete account
   */
  async deleteAccount(): Promise<void> {
    const user = this.getCurrentUser();

    if (!user) {
      throw new AuthenticationError('No user is currently signed in', 'auth/user-not-found');
    }

    logger.info('Deleting account', { userId: user.uid });

    try {
      await deleteUser(user);

      logger.info('Account deleted successfully', { userId: user.uid });
    } catch (error: unknown) {
      logger.error('Failed to delete account', error as Error, { userId: user.uid });
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Reauthenticate user
   */
  async reauthenticate(password: string): Promise<void> {
    const user = this.getCurrentUser();

    if (!user || !user.email) {
      throw new AuthenticationError('No user is currently signed in', 'auth/user-not-found');
    }

    logger.info('Reauthenticating user', { userId: user.uid });

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      logger.info('User reauthenticated successfully', { userId: user.uid });
    } catch (error: unknown) {
      logger.error('Reauthentication failed', error as Error, { userId: user.uid });
      throw this.mapFirebaseError(error);
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   */
  private validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < PASSWORD_RULES.minLength) {
      errors.push(`at least ${PASSWORD_RULES.minLength} characters`);
    }

    if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('at least one uppercase letter');
    }

    if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('at least one lowercase letter');
    }

    if (PASSWORD_RULES.requireNumber && !/\d/.test(password)) {
      errors.push('at least one number');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if email is rate limited
   */
  private isRateLimited(email: string): boolean {
    const attempt = this.loginAttempts.get(email);

    if (!attempt) {
      return false;
    }

    const isLocked = attempt.attempts >= RATE_LIMIT_CONFIG.maxAttempts;
    const lockoutExpired =
      Date.now() - attempt.lastAttempt > RATE_LIMIT_CONFIG.lockoutDurationMs;

    if (isLocked && lockoutExpired) {
      // Clear expired lockout
      this.clearLoginAttempts(email);
      return false;
    }

    return isLocked && !lockoutExpired;
  }

  /**
   * Get lockout end time
   */
  private getLockoutEndTime(email: string): number {
    const attempt = this.loginAttempts.get(email);
    if (!attempt) {
      return Date.now();
    }

    return attempt.lastAttempt + RATE_LIMIT_CONFIG.lockoutDurationMs;
  }

  /**
   * Record failed login attempt
   */
  private recordFailedLoginAttempt(email: string): void {
    const attempt = this.loginAttempts.get(email);

    if (attempt) {
      attempt.attempts++;
      attempt.lastAttempt = Date.now();
    } else {
      this.loginAttempts.set(email, {
        email,
        attempts: 1,
        lastAttempt: Date.now(),
      });
    }

    logger.warn('Failed login attempt recorded', {
      email,
      attempts: this.loginAttempts.get(email)?.attempts,
    });
  }

  /**
   * Clear login attempts for email
   */
  private clearLoginAttempts(email: string): void {
    this.loginAttempts.delete(email);
  }

  /**
   * Initialize inactivity tracking
   */
  private initializeInactivityTracking(): void {
    if (!INACTIVITY_CONFIG.enabled) {
      return;
    }

    // Track user activity
    if (typeof window !== 'undefined') {
      const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
      activityEvents.forEach((event) => {
        window.addEventListener(event, () => this.recordActivity());
      });
    }

    this.resetInactivityTimer();
  }

  /**
   * Record user activity
   */
  private recordActivity(): void {
    this.lastActivity = Date.now();
  }

  /**
   * Reset inactivity timer
   */
  private resetInactivityTimer(): void {
    if (!INACTIVITY_CONFIG.enabled) {
      return;
    }

    this.clearInactivityTimer();
    this.lastActivity = Date.now();

    this.inactivityTimer = setInterval(() => {
      const inactiveTime = Date.now() - this.lastActivity;

      if (inactiveTime >= INACTIVITY_CONFIG.timeoutMs && this.isAuthenticated()) {
        logger.info('Auto-logout due to inactivity');
        this.signOut();
      }
    }, 60000); // Check every minute
  }

  /**
   * Clear inactivity timer
   */
  private clearInactivityTimer(): void {
    if (this.inactivityTimer) {
      clearInterval(this.inactivityTimer);
      this.inactivityTimer = null;
    }
  }

  /**
   * Map Firebase errors to custom errors
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapFirebaseError(error: any): Error {
    const code = error?.code || 'unknown';
    const message = error?.message || 'An unknown error occurred';

    switch (code) {
      case 'auth/user-not-found':
        return new AuthenticationError('No account found with this email', code);
      case 'auth/wrong-password':
        return new AuthenticationError('Incorrect password', code);
      case 'auth/email-already-in-use':
        return new AuthenticationError('An account with this email already exists', code);
      case 'auth/weak-password':
        return new AuthenticationError('Password is too weak', code);
      case 'auth/too-many-requests':
        return new AuthenticationError('Too many requests. Please try again later', code);
      case 'auth/network-request-failed':
        return new AuthenticationError('Network error. Please check your connection', code);
      case 'auth/popup-closed-by-user':
        return new AuthenticationError('Sign in was cancelled', code);
      case 'auth/requires-recent-login':
        return new AuthenticationError(
          'This operation requires recent authentication. Please sign in again',
          code
        );
      default:
        return new AuthenticationError(message, code);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearInactivityTimer();
    if (this.authStateUnsubscribe) {
      this.authStateUnsubscribe();
    }
  }
}
