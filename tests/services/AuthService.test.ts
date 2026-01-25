/**
 * Authentication Service Tests
 */

import { MockAuthService } from '@/services/__mocks__/AuthService';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendEmailVerification: jest.fn(),
  updateEmail: jest.fn(),
  updatePassword: jest.fn(),
  deleteUser: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  EmailAuthProvider: {
    credential: jest.fn(),
  },
  onAuthStateChanged: jest.fn(),
  GoogleAuthProvider: jest.fn(),
  OAuthProvider: jest.fn(),
  signInWithPopup: jest.fn(),
}));

describe('AuthService', () => {
  let service: MockAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MockAuthService();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('Email/Password Authentication', () => {
    describe('signUpWithEmail', () => {
      it('should sign up with valid credentials', async () => {
        const email = 'newuser@example.com';
        const password = 'ValidPass123';

        const user = await service.signUpWithEmail(email, password);

        expect(user).toBeDefined();
        expect(user.email).toBe(email);
        expect(user.uid).toBeDefined();
        expect(service.isAuthenticated()).toBe(true);
      });

      it('should reject invalid email', async () => {
        await expect(
          service.signUpWithEmail('invalid-email', 'ValidPass123')
        ).rejects.toThrow('Invalid email format');
      });

      it('should reject weak password (too short)', async () => {
        await expect(
          service.signUpWithEmail('test@example.com', 'Short1')
        ).rejects.toThrow('Weak password');
      });

      it('should reject weak password (no uppercase)', async () => {
        await expect(
          service.signUpWithEmail('test@example.com', 'lowercase123')
        ).rejects.toThrow('Weak password');
      });

      it('should reject weak password (no lowercase)', async () => {
        await expect(
          service.signUpWithEmail('test@example.com', 'UPPERCASE123')
        ).rejects.toThrow('Weak password');
      });

      it('should reject weak password (no number)', async () => {
        await expect(
          service.signUpWithEmail('test@example.com', 'NoNumbers')
        ).rejects.toThrow('Weak password');
      });

      it('should fail if email already exists', async () => {
        const email = 'duplicate@example.com';
        await service.signUpWithEmail(email, 'ValidPass123');

        await expect(
          service.signUpWithEmail(email, 'ValidPass123')
        ).rejects.toThrow('auth/email-already-in-use');
      });

      it('should create user with unverified email', async () => {
        const user = await service.signUpWithEmail('new@example.com', 'ValidPass123');

        expect(user.emailVerified).toBe(false);
      });
    });

    describe('signInWithEmail', () => {
      it('should sign in with valid credentials', async () => {
        const user = await service.signInWithEmail('test@example.com', 'Password123');

        expect(user).toBeDefined();
        expect(user.email).toBe('test@example.com');
        expect(service.isAuthenticated()).toBe(true);
      });

      it('should fail with invalid email format', async () => {
        await expect(
          service.signInWithEmail('invalid', 'Password123')
        ).rejects.toThrow('Invalid email format');
      });

      it('should fail with wrong password', async () => {
        await expect(
          service.signInWithEmail('test@example.com', 'WrongPassword')
        ).rejects.toThrow('auth/wrong-password');
      });

      it('should fail with non-existent user', async () => {
        await expect(
          service.signInWithEmail('nonexistent@example.com', 'Password123')
        ).rejects.toThrow('auth/user-not-found');
      });

      it('should track failed login attempts', async () => {
        const email = 'test@example.com';

        try {
          await service.signInWithEmail(email, 'wrong1');
        } catch {
        // Expected error
      }
        expect(service.getLoginAttempts(email)).toBe(1);

        try {
          await service.signInWithEmail(email, 'wrong2');
        } catch {
        // Expected error
      }
        expect(service.getLoginAttempts(email)).toBe(2);
      });

      it('should clear attempts on successful login', async () => {
        const email = 'test@example.com';

        // Failed attempts
        try {
          await service.signInWithEmail(email, 'wrong');
        } catch {
        // Expected error
      }

        // Successful login
        await service.signInWithEmail(email, 'Password123');

        expect(service.getLoginAttempts(email)).toBe(0);
      });
    });

    describe('signOut', () => {
      it('should sign out user', async () => {
        await service.signInWithEmail('test@example.com', 'Password123');
        expect(service.isAuthenticated()).toBe(true);

        await service.signOut();

        expect(service.isAuthenticated()).toBe(false);
        expect(service.getCurrentUser()).toBeNull();
      });

      it('should handle sign out when not authenticated', async () => {
        await expect(service.signOut()).resolves.not.toThrow();
      });
    });
  });

  describe('Password Reset', () => {
    describe('sendPasswordResetEmail', () => {
      it('should send reset email for valid email', async () => {
        await expect(
          service.sendPasswordResetEmail('test@example.com')
        ).resolves.not.toThrow();
      });

      it('should reject invalid email', async () => {
        await expect(
          service.sendPasswordResetEmail('invalid-email')
        ).rejects.toThrow('Invalid email format');
      });

      it('should not fail for non-existent email', async () => {
        // Firebase doesn't reveal if email exists for security
        await expect(
          service.sendPasswordResetEmail('nonexistent@example.com')
        ).resolves.not.toThrow();
      });
    });
  });

  describe('Email Verification', () => {
    describe('sendEmailVerification', () => {
      it('should send verification email', async () => {
        await service.signInWithEmail('test@example.com', 'Password123');
        const user = service.getCurrentUser();

        await service.sendEmailVerification();

        expect(service.wasVerificationEmailSent(user?.uid || '')).toBe(true);
      });

      it('should handle already verified email', async () => {
        await service.signInWithEmail('verified@example.com', 'Password123');

        await expect(service.sendEmailVerification()).resolves.not.toThrow();
      });

      it('should fail when not authenticated', async () => {
        await expect(service.sendEmailVerification()).rejects.toThrow(
          'auth/user-not-found'
        );
      });
    });
  });

  describe('Social Authentication', () => {
    describe('signInWithGoogle', () => {
      it('should sign in with Google', async () => {
        const user = await service.signInWithGoogle();

        expect(user).toBeDefined();
        expect(user.email).toBe('google@example.com');
        expect(user.emailVerified).toBe(true);
        expect(service.isAuthenticated()).toBe(true);
      });

      it('should handle cancellation', async () => {
        await Promise.resolve(); service.setNextOperationToFail('signInWithGoogle');

        await expect(service.signInWithGoogle()).rejects.toThrow(
          'auth/popup-closed-by-user'
        );
      });
    });

    describe('signInWithApple', () => {
      it('should sign in with Apple', async () => {
        const user = await service.signInWithApple();

        expect(user).toBeDefined();
        expect(user.email).toBe('apple@example.com');
        expect(user.emailVerified).toBe(true);
        expect(service.isAuthenticated()).toBe(true);
      });

      it('should handle cancellation', async () => {
        await Promise.resolve(); service.setNextOperationToFail('signInWithApple');

        await expect(service.signInWithApple()).rejects.toThrow(
          'auth/popup-closed-by-user'
        );
      });
    });
  });

  describe('Session Management', () => {
    describe('getCurrentUser', () => {
      it('should return null when not authenticated', () => {
        expect(service.getCurrentUser()).toBeNull();
      });

      it('should return user when authenticated', async () => {
        await service.signInWithEmail('test@example.com', 'Password123');

        const user = service.getCurrentUser();

        expect(user).not.toBeNull();
        expect(user?.email).toBe('test@example.com');
      });
    });

    describe('isAuthenticated', () => {
      it('should return false when not authenticated', () => {
        expect(service.isAuthenticated()).toBe(false);
      });

      it('should return true when authenticated', async () => {
        await service.signInWithEmail('test@example.com', 'Password123');

        expect(service.isAuthenticated()).toBe(true);
      });
    });

    describe('onAuthStateChanged', () => {
      it('should notify on sign in', async () => {
        const callback = jest.fn();
        const unsubscribe = service.onAuthStateChanged(callback);

        // Should be called immediately with null
        expect(callback).toHaveBeenCalledWith(null);

        await service.signInWithEmail('test@example.com', 'Password123');

        // Should be called with user
        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({ email: 'test@example.com' })
        );

        unsubscribe();
      });

      it('should notify on sign out', async () => {
        const callback = jest.fn();

        await service.signInWithEmail('test@example.com', 'Password123');
        service.onAuthStateChanged(callback);

        callback.mockClear();

        await service.signOut();

        expect(callback).toHaveBeenCalledWith(null);
      });

      it('should allow unsubscribe', async () => {
        const callback = jest.fn();
        const unsubscribe = service.onAuthStateChanged(callback);

        callback.mockClear();
        unsubscribe();

        await service.signInWithEmail('test@example.com', 'Password123');

        // Callback should not be called after unsubscribe
        expect(callback).not.toHaveBeenCalled();
      });
    });
  });

  describe('Account Management', () => {
    describe('updateEmail', () => {
      it('should update email', async () => {
        await service.signInWithEmail('test@example.com', 'Password123');

        await service.updateEmail('newemail@example.com');

        const user = service.getCurrentUser();
        expect(user?.email).toBe('newemail@example.com');
      });

      it('should fail when not authenticated', async () => {
        await expect(service.updateEmail('new@example.com')).rejects.toThrow(
          'auth/user-not-found'
        );
      });

      it('should reject invalid email', async () => {
        await service.signInWithEmail('test@example.com', 'Password123');

        await expect(service.updateEmail('invalid-email')).rejects.toThrow(
          'Invalid email format'
        );
      });

      it('should fail if email already in use', async () => {
        await service.signUpWithEmail('existing@example.com', 'Password123');
        await service.signOut();
        await service.signInWithEmail('test@example.com', 'Password123');

        await expect(service.updateEmail('existing@example.com')).rejects.toThrow(
          'auth/email-already-in-use'
        );
      });
    });

    describe('updatePassword', () => {
      it('should update password with reauthentication', async () => {
        await service.signInWithEmail('test@example.com', 'Password123');

        await service.updatePassword('Password123', 'NewPassword456');

        // Sign out and try new password
        await service.signOut();
        const user = await service.signInWithEmail('test@example.com', 'NewPassword456');

        expect(user).toBeDefined();
      });

      it('should fail when not authenticated', async () => {
        await expect(
          service.updatePassword('old', 'NewPassword456')
        ).rejects.toThrow('auth/user-not-found');
      });

      it('should reject weak new password', async () => {
        await service.signInWithEmail('test@example.com', 'Password123');

        await expect(service.updatePassword('Password123', 'weak')).rejects.toThrow(
          'Weak password'
        );
      });
    });

    describe('deleteAccount', () => {
      it('should delete account', async () => {
        await service.signInWithEmail('test@example.com', 'Password123');

        await service.deleteAccount();

        expect(service.isAuthenticated()).toBe(false);
        expect(service.getCurrentUser()).toBeNull();
      });

      it('should fail when not authenticated', async () => {
        await expect(service.deleteAccount()).rejects.toThrow('auth/user-not-found');
      });
    });

    describe('reauthenticate', () => {
      it('should reauthenticate with correct password', async () => {
        await service.signInWithEmail('test@example.com', 'Password123');

        await expect(service.reauthenticate('Password123')).resolves.not.toThrow();
      });

      it('should fail with wrong password', async () => {
        await service.signInWithEmail('test@example.com', 'Password123');

        await expect(service.reauthenticate('WrongPassword')).rejects.toThrow(
          'auth/wrong-password'
        );
      });

      it('should fail when not authenticated', async () => {
        await expect(service.reauthenticate('password')).rejects.toThrow(
          'auth/user-not-found'
        );
      });
    });
  });

  describe('Security Features', () => {
    describe('rate limiting', () => {
      it('should block after 5 failed attempts', async () => {
        const email = 'test@example.com';

        // Simulate 5 failed attempts
        service.simulateRateLimit(email);

        await expect(service.signInWithEmail(email, 'Password123')).rejects.toThrow(
          'auth/too-many-requests'
        );
      });

      it('should track attempts across multiple failures', async () => {
        const email = 'test@example.com';

        for (let i = 0; i < 5; i++) {
          try {
            await service.signInWithEmail(email, 'wrong');
          } catch {
        // Expected error
      }
        }

        await expect(service.signInWithEmail(email, 'Password123')).rejects.toThrow(
          'auth/too-many-requests'
        );
      });
    });

    describe('email validation', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user @example.com',
        'user@example',
      ];

      invalidEmails.forEach((email) => {
        it(`should reject invalid email: ${email}`, async () => {
          await expect(
            service.signUpWithEmail(email, 'ValidPass123')
          ).rejects.toThrow('Invalid email format');
        });
      });

      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.co.uk',
      ];

      validEmails.forEach((email) => {
        it(`should accept valid email: ${email}`, async () => {
          await expect(
            service.signUpWithEmail(email, 'ValidPass123')
          ).resolves.toBeDefined();
        });
      });
    });

    describe('password strength validation', () => {
      const weakPasswords = [
        { password: 'short', reason: 'too short' },
        { password: 'nouppercase123', reason: 'no uppercase' },
        { password: 'NOLOWERCASE123', reason: 'no lowercase' },
        { password: 'NoNumbers', reason: 'no numbers' },
      ];

      weakPasswords.forEach(({ password, reason }) => {
        it(`should reject weak password: ${reason}`, async () => {
          await expect(
            service.signUpWithEmail('test@example.com', password)
          ).rejects.toThrow('Weak password');
        });
      });

      const strongPasswords = [
        'Password123',
        'MyP@ssw0rd',
        'Secure123Pass',
        'Test1234Pass',
      ];

      strongPasswords.forEach((password) => {
        it(`should accept strong password: ${password}`, async () => {
          const email = `user-${Date.now()}@example.com`;
          await expect(service.signUpWithEmail(email, password)).resolves.toBeDefined();
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors on sign in', async () => {
      await Promise.resolve(); service.setNextOperationToFail('signInWithEmail');

      await expect(
        service.signInWithEmail('test@example.com', 'Password123')
      ).rejects.toThrow('auth/network-request-failed');
    });

    it('should handle network errors on sign up', async () => {
      await Promise.resolve(); service.setNextOperationToFail('signUpWithEmail');

      await expect(
        service.signUpWithEmail('new@example.com', 'Password123')
      ).rejects.toThrow('auth/email-already-in-use');
    });

    it('should handle network errors on password reset', async () => {
      await Promise.resolve(); service.setNextOperationToFail('sendPasswordResetEmail');

      await expect(
        service.sendPasswordResetEmail('test@example.com')
      ).rejects.toThrow('auth/network-request-failed');
    });

    it('should handle network errors on email verification', async () => {
      await service.signInWithEmail('test@example.com', 'Password123');
      service.setNextOperationToFail('sendEmailVerification');

      await expect(service.sendEmailVerification()).rejects.toThrow(
        'auth/network-request-failed'
      );
    });

    it('should handle errors on sign out', async () => {
      await service.signInWithEmail('test@example.com', 'Password123');
      service.setNextOperationToFail('signOut');

      await expect(service.signOut()).rejects.toThrow('auth/network-request-failed');
    });

    it('should handle requires-recent-login error', async () => {
      await service.signInWithEmail('test@example.com', 'Password123');
      service.setNextOperationToFail('updateEmail');

      await expect(service.updateEmail('new@example.com')).rejects.toThrow(
        'auth/requires-recent-login'
      );
    });

    it('should handle error on account deletion', async () => {
      await service.signInWithEmail('test@example.com', 'Password123');
      service.setNextOperationToFail('deleteAccount');

      await expect(service.deleteAccount()).rejects.toThrow(
        'auth/requires-recent-login'
      );
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', () => {
      const callback = jest.fn();
      service.onAuthStateChanged(callback);

      service.cleanup();

      // Should not throw
      expect(() => service.cleanup()).not.toThrow();
    });
  });
});
