import {
  AppError,
  ValidationError,
  AuthenticationError,
  NetworkError,
  FirebaseError,
  isOperationalError,
  formatErrorMessage,
  handleError,
  withErrorHandling,
  getDisplayError,
} from '@/utils/errorUtils';
import { logger } from '@/utils/logger';

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Error Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Classes', () => {
    describe('AppError', () => {
      it('should create an AppError with all properties', () => {
        const error = new AppError('Test error', 'TEST_ERROR', 500, true);

        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toBe('Test error');
        expect(error.code).toBe('TEST_ERROR');
        expect(error.statusCode).toBe(500);
        expect(error.isOperational).toBe(true);
        expect(error.name).toBe('AppError');
      });

      it('should default isOperational to true', () => {
        const error = new AppError('Test error', 'TEST_ERROR');
        expect(error.isOperational).toBe(true);
      });

      it('should capture stack trace', () => {
        const error = new AppError('Test error', 'TEST_ERROR');
        expect(error.stack).toBeDefined();
      });
    });

    describe('ValidationError', () => {
      it('should create a ValidationError', () => {
        const error = new ValidationError('Invalid input');

        expect(error).toBeInstanceOf(AppError);
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('Invalid input');
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
      });

      it('should accept custom error code', () => {
        const error = new ValidationError('Invalid email', 'INVALID_EMAIL');
        expect(error.code).toBe('INVALID_EMAIL');
      });
    });

    describe('AuthenticationError', () => {
      it('should create an AuthenticationError', () => {
        const error = new AuthenticationError('Not authenticated');

        expect(error).toBeInstanceOf(AppError);
        expect(error).toBeInstanceOf(AuthenticationError);
        expect(error.message).toBe('Not authenticated');
        expect(error.code).toBe('AUTH_ERROR');
        expect(error.statusCode).toBe(401);
        expect(error.isOperational).toBe(true);
      });
    });

    describe('NetworkError', () => {
      it('should create a NetworkError', () => {
        const error = new NetworkError('Connection failed');

        expect(error).toBeInstanceOf(AppError);
        expect(error).toBeInstanceOf(NetworkError);
        expect(error.message).toBe('Connection failed');
        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.statusCode).toBe(503);
        expect(error.isOperational).toBe(true);
      });
    });

    describe('FirebaseError', () => {
      it('should create a FirebaseError', () => {
        const error = new FirebaseError('Firebase operation failed');

        expect(error).toBeInstanceOf(AppError);
        expect(error).toBeInstanceOf(FirebaseError);
        expect(error.message).toBe('Firebase operation failed');
        expect(error.code).toBe('FIREBASE_ERROR');
        expect(error.statusCode).toBe(500);
        expect(error.isOperational).toBe(true);
      });
    });
  });

  describe('isOperationalError', () => {
    it('should return true for AppError', () => {
      const error = new AppError('Test', 'TEST', 500, true);
      expect(isOperationalError(error)).toBe(true);
    });

    it('should return false for non-operational AppError', () => {
      const error = new AppError('Test', 'TEST', 500, false);
      expect(isOperationalError(error)).toBe(false);
    });

    it('should return false for generic Error', () => {
      const error = new Error('Generic error');
      expect(isOperationalError(error)).toBe(false);
    });

    it('should return true for ValidationError', () => {
      const error = new ValidationError('Invalid');
      expect(isOperationalError(error)).toBe(true);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format ValidationError', () => {
      const error = new ValidationError('Email is required');
      expect(formatErrorMessage(error)).toBe('Email is required');
    });

    it('should format AuthenticationError', () => {
      const error = new AuthenticationError('Invalid token');
      expect(formatErrorMessage(error)).toBe(
        'Unable to restore your session. Please sign in again.'
      );
    });

    it('should format NetworkError', () => {
      const error = new NetworkError('No connection');
      expect(formatErrorMessage(error)).toBe(
        'Network error. Please check your connection and try again.'
      );
    });

    it('should format FirebaseError', () => {
      const error = new FirebaseError('Database error');
      expect(formatErrorMessage(error)).toBe('A server error occurred. Please try again later.');
    });

    it('should format Firebase auth/user-not-found error', () => {
      const error = new Error('auth/user-not-found');
      expect(formatErrorMessage(error)).toBe('No account found with this email.');
    });

    it('should format Firebase auth/wrong-password error', () => {
      const error = new Error('auth/wrong-password');
      expect(formatErrorMessage(error)).toBe('Incorrect password.');
    });

    it('should format Firebase auth/email-already-in-use error', () => {
      const error = new Error('auth/email-already-in-use');
      expect(formatErrorMessage(error)).toBe('An account with this email already exists.');
    });

    it('should format Firebase auth/weak-password error', () => {
      const error = new Error('auth/weak-password');
      expect(formatErrorMessage(error)).toBe('Password is too weak. Use at least 6 characters.');
    });

    it('should format unknown error with generic message', () => {
      const error = new Error('Something weird happened');
      expect(formatErrorMessage(error)).toBe('An unexpected error occurred. Please try again.');
    });
  });

  describe('handleError', () => {
    it('should log error', () => {
      const error = new Error('Test error');
      handleError(error);

      expect(logger.error).toHaveBeenCalledWith('Test error', error, undefined);
    });

    it('should log error with context', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'login' };
      handleError(error, context);

      expect(logger.error).toHaveBeenCalledWith('Test error', error, context);
    });

    it('should log additional info for non-operational errors', () => {
      const error = new Error('Programming error');
      handleError(error);

      expect(logger.error).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenNthCalledWith(
        2,
        'Non-operational error detected',
        error,
        expect.objectContaining({
          stack: expect.any(String),
        })
      );
    });

    it('should not log extra info for operational errors', () => {
      const error = new ValidationError('Invalid input');
      handleError(error);

      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('withErrorHandling', () => {
    it('should return result on success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const wrapped = withErrorHandling(fn);

      const result = await wrapped('arg1', 'arg2');

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should handle error and rethrow', async () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);
      const wrapped = withErrorHandling(fn);

      await expect(wrapped()).rejects.toThrow('Test error');
      expect(logger.error).toHaveBeenCalledWith('Test error', error, undefined);
    });

    it('should include error context', async () => {
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);
      const context = { operation: 'fetchData' };
      const wrapped = withErrorHandling(fn, context);

      await expect(wrapped()).rejects.toThrow('Test error');
      expect(logger.error).toHaveBeenCalledWith('Test error', error, context);
    });
  });

  describe('getDisplayError', () => {
    it('should format AppError for display', () => {
      const error = new ValidationError('Email is required', 'INVALID_EMAIL');
      const display = getDisplayError(error);

      expect(display).toEqual({
        title: 'Error',
        message: 'Email is required',
        code: 'INVALID_EMAIL',
      });
    });

    it('should format generic error for display', () => {
      const error = new Error('Something went wrong');
      const display = getDisplayError(error);

      expect(display).toEqual({
        title: 'Unexpected Error',
        message: 'An unexpected error occurred. Please try again.',
      });
    });

    it('should format NetworkError for display', () => {
      const error = new NetworkError('No connection', 'NO_NETWORK');
      const display = getDisplayError(error);

      expect(display).toEqual({
        title: 'Error',
        message: 'Network error. Please check your connection and try again.',
        code: 'NO_NETWORK',
      });
    });
  });
});
