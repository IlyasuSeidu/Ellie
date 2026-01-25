/**
 * Error Handling Utilities
 *
 * Provides custom error classes and error handling functions for robust error management.
 */

import { logger } from './logger';

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly isOperational: boolean;

  constructor(message: string, code: string, statusCode?: number, isOperational: boolean = true) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    this.name = this.constructor.name;
    Error.captureStackTrace(this);
  }
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends AppError {
  constructor(message: string, code: string = 'VALIDATION_ERROR') {
    super(message, code, 400, true);
  }
}

/**
 * Authentication error for auth-related failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string, code: string = 'AUTH_ERROR') {
    super(message, code, 401, true);
  }
}

/**
 * Network error for connectivity issues
 */
export class NetworkError extends AppError {
  constructor(message: string, code: string = 'NETWORK_ERROR') {
    super(message, code, 503, true);
  }
}

/**
 * Firebase-specific error
 */
export class FirebaseError extends AppError {
  constructor(message: string, code: string = 'FIREBASE_ERROR') {
    super(message, code, 500, true);
  }
}

/**
 * Determines if an error is operational (expected) vs programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Formats error into a user-friendly message
 */
export function formatErrorMessage(error: Error): string {
  // Custom error messages for known error types
  if (error instanceof ValidationError) {
    return error.message;
  }

  if (error instanceof AuthenticationError) {
    return 'Authentication failed. Please sign in again.';
  }

  if (error instanceof NetworkError) {
    return 'Network error. Please check your connection and try again.';
  }

  if (error instanceof FirebaseError) {
    return 'A server error occurred. Please try again later.';
  }

  // Handle Firebase auth errors
  if (error.message.includes('auth/')) {
    const authErrorMap: Record<string, string> = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
      'auth/invalid-email': 'Invalid email address.',
      'auth/operation-not-allowed': 'This operation is not allowed.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
    };

    for (const [code, message] of Object.entries(authErrorMap)) {
      if (error.message.includes(code)) {
        return message;
      }
    }
  }

  // Generic fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Global error handler
 * Logs error and optionally shows user-friendly message
 */
export function handleError(error: Error, context?: Record<string, unknown>): void {
  // Log the error with context
  logger.error(error.message, error, context);

  // Determine severity
  const isOperational = isOperationalError(error);

  if (!isOperational) {
    // Programming error - log more details
    logger.error('Non-operational error detected', error, {
      stack: error.stack,
      ...context,
    });
  }

  // Future: Send to error tracking service (Sentry, etc.)
  // if (process.env.NODE_ENV === 'production') {
  //   Sentry.captureException(error);
  // }
}

/**
 * Wraps an async function with error handling
 */
export function withErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  errorContext?: Record<string, unknown>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error as Error, errorContext);
      throw error;
    }
  };
}

/**
 * Error boundary helper for React components
 * Returns formatted error for display
 */
export function getDisplayError(error: Error): {
  title: string;
  message: string;
  code?: string;
} {
  if (error instanceof AppError) {
    return {
      title: 'Error',
      message: formatErrorMessage(error),
      code: error.code,
    };
  }

  return {
    title: 'Unexpected Error',
    message: formatErrorMessage(error),
  };
}
