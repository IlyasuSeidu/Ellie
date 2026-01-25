/**
 * Reliable Retry Utility
 *
 * Provides retry logic with exponential backoff for network requests and other operations.
 */

import { logger } from './logger';
import { NetworkError } from './errorUtils';

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;

  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;

  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;

  /** Backoff multiplier (default: 2 for exponential backoff) */
  factor?: number;

  /** Custom function to determine if error should trigger retry (default: retry on NetworkError) */
  shouldRetry?: (error: Error) => boolean;

  /** Callback for each retry attempt */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Default retry options
 */
const defaultOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  factor: 2,
  shouldRetry: (error: Error) => {
    // By default, retry on network errors
    return error instanceof NetworkError || error.message.includes('network');
  },
  onRetry: () => {
    // No-op by default
  },
};

/**
 * Calculate delay for exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  factor: number
): number {
  const delay = initialDelay * Math.pow(factor, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Wait for specified milliseconds
 */
function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with function result or rejects after all retries exhausted
 *
 * @example
 * ```typescript
 * const data = await retry(
 *   () => fetchDataFromAPI(),
 *   {
 *     maxRetries: 5,
 *     initialDelay: 500,
 *     shouldRetry: (error) => error.statusCode === 503
 *   }
 * );
 * ```
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Attempt the operation
      const result = await fn();

      // Success - log if this was a retry
      if (attempt > 0) {
        logger.info('Operation succeeded after retry', {
          attempt,
          totalAttempts: attempt + 1,
        });
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry this error
      const shouldRetryError = opts.shouldRetry(lastError);

      // If this was the last attempt or we shouldn't retry, throw
      if (attempt === opts.maxRetries || !shouldRetryError) {
        logger.warn('Operation failed, no more retries', {
          attempt,
          maxRetries: opts.maxRetries,
          shouldRetry: shouldRetryError,
          error: lastError.message,
        });
        throw lastError;
      }

      // Calculate backoff delay
      const delay = calculateDelay(attempt, opts.initialDelay, opts.maxDelay, opts.factor);

      logger.debug('Operation failed, retrying', {
        attempt: attempt + 1,
        maxRetries: opts.maxRetries,
        delay,
        error: lastError.message,
      });

      // Call retry callback if provided
      opts.onRetry(attempt + 1, lastError);

      // Wait before retrying
      await wait(delay);
    }
  }

  // This should never be reached due to the throw in the loop
  throw lastError || new Error('Retry failed');
}

/**
 * Retry wrapper for fetch requests
 */
export function retryFetch(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return retry(async () => {
    const response = await fetch(url, init);

    // Throw on non-OK responses
    if (!response.ok) {
      throw new NetworkError(
        `HTTP ${response.status}: ${response.statusText}`,
        `HTTP_${response.status}`
      );
    }

    return response;
  }, options);
}

/**
 * Retry options for critical operations (more aggressive)
 */
export const criticalRetryOptions: RetryOptions = {
  maxRetries: 5,
  initialDelay: 500,
  maxDelay: 15000,
  factor: 2,
};

/**
 * Retry options for non-critical operations (less aggressive)
 */
export const normalRetryOptions: RetryOptions = {
  maxRetries: 2,
  initialDelay: 1000,
  maxDelay: 5000,
  factor: 2,
};

/**
 * For testing - export internal functions
 */
export const __testing__ = {
  calculateDelay,
  wait,
};
