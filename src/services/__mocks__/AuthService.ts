/**
 * Mock Authentication Service for Testing
 */

import { User } from 'firebase/auth';
import { AuthStateCallback, Unsubscribe } from '../AuthService';

/**
 * Mock user data
 */
interface MockUser {
  uid: string;
  email: string;
  password: string;
  emailVerified: boolean;
  displayName?: string;
}

/**
 * Mock Authentication Service
 */
export class MockAuthService {
  private users: Map<string, MockUser> = new Map();
  private currentUser: MockUser | null = null;
  private authStateCallbacks: AuthStateCallback[] = [];
  private loginAttempts: Map<string, number> = new Map();
  private shouldFailNext: string | null = null;
  private emailVerificationSent: Set<string> = new Set();

  constructor() {
    // Add default test users
    this.users.set('test@example.com', {
      uid: 'test-user-1',
      email: 'test@example.com',
      password: 'Password123',
      emailVerified: false,
    });

    this.users.set('verified@example.com', {
      uid: 'verified-user-1',
      email: 'verified@example.com',
      password: 'Password123',
      emailVerified: true,
    });
  }

  /**
   * Sign up with email and password
   */
  async signUpWithEmail(email: string, password: string): Promise<User> {
    await Promise.resolve();
    if (this.shouldFailNext === 'signUpWithEmail') {
      this.shouldFailNext = null;
      throw new Error('auth/email-already-in-use');
    }

    // Validate email
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password
    if (!this.isValidPassword(password)) {
      throw new Error('Weak password: at least 8 characters, at least one uppercase letter, at least one lowercase letter, at least one number');
    }

    // Check if user exists
    if (this.users.has(email)) {
      throw new Error('auth/email-already-in-use');
    }

    const mockUser: MockUser = {
      uid: `user-${Date.now()}`,
      email,
      password,
      emailVerified: false,
    };

    this.users.set(email, mockUser);
    this.currentUser = mockUser;
    this.notifyAuthStateChanged();

    return this.toFirebaseUser(mockUser);
  }

  /**
   * Sign in with email and password
   */
  async signInWithEmail(email: string, password: string): Promise<User> {
    await Promise.resolve();
    if (this.shouldFailNext === 'signInWithEmail') {
      this.shouldFailNext = null;
      throw new Error('auth/network-request-failed');
    }

    // Validate email
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Check rate limiting
    const attempts = this.loginAttempts.get(email) || 0;
    if (attempts >= 5) {
      throw new Error('auth/too-many-requests');
    }

    const user = this.users.get(email);

    if (!user) {
      this.recordFailedAttempt(email);
      throw new Error('auth/user-not-found');
    }

    if (user.password !== password) {
      this.recordFailedAttempt(email);
      throw new Error('auth/wrong-password');
    }

    // Clear failed attempts on success
    this.loginAttempts.delete(email);

    this.currentUser = user;
    this.notifyAuthStateChanged();

    return this.toFirebaseUser(user);
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<User> {
    await Promise.resolve();
    if (this.shouldFailNext === 'signInWithGoogle') {
      this.shouldFailNext = null;
      throw new Error('auth/popup-closed-by-user');
    }

    const mockUser: MockUser = {
      uid: 'google-user-1',
      email: 'google@example.com',
      password: '',
      emailVerified: true,
      displayName: 'Google User',
    };

    this.users.set(mockUser.email, mockUser);
    this.currentUser = mockUser;
    this.notifyAuthStateChanged();

    return this.toFirebaseUser(mockUser);
  }

  /**
   * Sign in with Apple
   */
  async signInWithApple(): Promise<User> {
    await Promise.resolve();
    if (this.shouldFailNext === 'signInWithApple') {
      this.shouldFailNext = null;
      throw new Error('auth/popup-closed-by-user');
    }

    const mockUser: MockUser = {
      uid: 'apple-user-1',
      email: 'apple@example.com',
      password: '',
      emailVerified: true,
      displayName: 'Apple User',
    };

    this.users.set(mockUser.email, mockUser);
    this.currentUser = mockUser;
    this.notifyAuthStateChanged();

    return this.toFirebaseUser(mockUser);
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    await Promise.resolve();
    if (this.shouldFailNext === 'signOut') {
      this.shouldFailNext = null;
      throw new Error('auth/network-request-failed');
    }

    this.currentUser = null;
    this.notifyAuthStateChanged();
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    await Promise.resolve();
    if (this.shouldFailNext === 'sendPasswordResetEmail') {
      this.shouldFailNext = null;
      throw new Error('auth/network-request-failed');
    }

    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Don't throw error if user doesn't exist (Firebase behavior)
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(): Promise<void> {
    await Promise.resolve();
    if (!this.currentUser) {
      throw new Error('auth/user-not-found');
    }

    if (this.shouldFailNext === 'sendEmailVerification') {
      this.shouldFailNext = null;
      throw new Error('auth/network-request-failed');
    }

    this.emailVerificationSent.add(this.currentUser.uid);
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    if (!this.currentUser) {
      return null;
    }

    return this.toFirebaseUser(this.currentUser);
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChanged(callback: AuthStateCallback): Unsubscribe {
    this.authStateCallbacks.push(callback);

    // Immediately call with current state
    callback(this.getCurrentUser());

    return () => {
      const index = this.authStateCallbacks.indexOf(callback);
      if (index > -1) {
        this.authStateCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Update email
   */
  async updateEmail(newEmail: string): Promise<void> {
    await Promise.resolve();
    if (!this.currentUser) {
      throw new Error('auth/user-not-found');
    }

    if (this.shouldFailNext === 'updateEmail') {
      this.shouldFailNext = null;
      throw new Error('auth/requires-recent-login');
    }

    if (!this.isValidEmail(newEmail)) {
      throw new Error('Invalid email format');
    }

    if (this.users.has(newEmail)) {
      throw new Error('auth/email-already-in-use');
    }

    // Remove old email entry
    this.users.delete(this.currentUser.email);

    // Update email
    this.currentUser.email = newEmail;
    this.users.set(newEmail, this.currentUser);
  }

  /**
   * Update password
   */
  async updatePassword(
    _currentPassword: string,
    newPassword: string
  ): Promise<void> {
    await Promise.resolve();
    if (!this.currentUser) {
      throw new Error('auth/user-not-found');
    }

    if (this.shouldFailNext === 'updatePassword') {
      this.shouldFailNext = null;
      throw new Error('auth/wrong-password');
    }

    if (!this.isValidPassword(newPassword)) {
      throw new Error('Weak password: at least 8 characters, at least one uppercase letter, at least one lowercase letter, at least one number');
    }

    this.currentUser.password = newPassword;
    this.users.set(this.currentUser.email, this.currentUser);
  }

  /**
   * Delete account
   */
  async deleteAccount(): Promise<void> {
    await Promise.resolve();
    if (!this.currentUser) {
      throw new Error('auth/user-not-found');
    }

    if (this.shouldFailNext === 'deleteAccount') {
      this.shouldFailNext = null;
      throw new Error('auth/requires-recent-login');
    }

    this.users.delete(this.currentUser.email);
    this.currentUser = null;
    this.notifyAuthStateChanged();
  }

  /**
   * Reauthenticate
   */
  async reauthenticate(password: string): Promise<void> {
    await Promise.resolve();
    if (!this.currentUser) {
      throw new Error('auth/user-not-found');
    }

    if (this.shouldFailNext === 'reauthenticate') {
      this.shouldFailNext = null;
      throw new Error('auth/wrong-password');
    }

    if (this.currentUser.password !== password) {
      throw new Error('auth/wrong-password');
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.authStateCallbacks = [];
  }

  // Test helpers

  /**
   * Set next operation to fail
   */
  setNextOperationToFail(operation: string): void {
    this.shouldFailNext = operation;
  }

  /**
   * Get login attempts for email
   */
  getLoginAttempts(email: string): number {
    return this.loginAttempts.get(email) || 0;
  }

  /**
   * Verify email for current user
   */
  verifyEmail(): void {
    if (this.currentUser) {
      this.currentUser.emailVerified = true;
      this.users.set(this.currentUser.email, this.currentUser);
      this.notifyAuthStateChanged();
    }
  }

  /**
   * Check if verification email was sent
   */
  wasVerificationEmailSent(uid: string): boolean {
    return this.emailVerificationSent.has(uid);
  }

  /**
   * Reset mock state
   */
  reset(): void {
    this.users.clear();
    this.currentUser = null;
    this.authStateCallbacks = [];
    this.loginAttempts.clear();
    this.shouldFailNext = null;
    this.emailVerificationSent.clear();

    // Re-add default users
    this.users.set('test@example.com', {
      uid: 'test-user-1',
      email: 'test@example.com',
      password: 'Password123',
      emailVerified: false,
    });

    this.users.set('verified@example.com', {
      uid: 'verified-user-1',
      email: 'verified@example.com',
      password: 'Password123',
      emailVerified: true,
    });
  }

  /**
   * Simulate rate limiting
   */
  simulateRateLimit(email: string): void {
    this.loginAttempts.set(email, 5);
  }

  // Private helpers

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPassword(password: string): boolean {
    if (password.length < 8) return false;
    if (!/[A-Z]/.test(password)) return false;
    if (!/[a-z]/.test(password)) return false;
    if (!/\d/.test(password)) return false;
    return true;
  }

  private recordFailedAttempt(email: string): void {
    const attempts = this.loginAttempts.get(email) || 0;
    this.loginAttempts.set(email, attempts + 1);
  }

  private notifyAuthStateChanged(): void {
    const user = this.getCurrentUser();
    this.authStateCallbacks.forEach((callback) => callback(user));
  }

  private toFirebaseUser(mockUser: MockUser): User {
    return {
      uid: mockUser.uid,
      email: mockUser.email,
      emailVerified: mockUser.emailVerified,
      displayName: mockUser.displayName || null,
      photoURL: null,
      phoneNumber: null,
      isAnonymous: false,
      metadata: {
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString(),
      },
      providerData: [],
      refreshToken: '',
      tenantId: null,
      delete: async () => {},
      getIdToken: async () => { await Promise.resolve(); return 'mock-token'; },
      getIdTokenResult: async () => { await Promise.resolve(); return {
        token: 'mock-token',
        claims: {},
        authTime: '',
        issuedAtTime: '',
        expirationTime: '',
        signInProvider: null,
        signInSecondFactor: null,
      }; },
      reload: async () => {},
      toJSON: () => ({}),
    } as unknown as User;
  }
}

export const AuthService = MockAuthService;
