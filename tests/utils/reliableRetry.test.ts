import {
  retry,
  retryFetch,
  criticalRetryOptions,
  normalRetryOptions,
  __testing__,
} from '@/utils/reliableRetry';
import { NetworkError } from '@/utils/errorUtils';
import { logger } from '@/utils/logger';

const { calculateDelay, wait } = __testing__;

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock global fetch
global.fetch = jest.fn();

describe('Reliable Retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('calculateDelay', () => {
    it('should calculate exponential backoff', () => {
      expect(calculateDelay(0, 1000, 10000, 2)).toBe(1000); // 1000 * 2^0
      expect(calculateDelay(1, 1000, 10000, 2)).toBe(2000); // 1000 * 2^1
      expect(calculateDelay(2, 1000, 10000, 2)).toBe(4000); // 1000 * 2^2
      expect(calculateDelay(3, 1000, 10000, 2)).toBe(8000); // 1000 * 2^3
    });

    it('should respect max delay', () => {
      expect(calculateDelay(10, 1000, 10000, 2)).toBe(10000); // Would be 1024000, capped at 10000
    });

    it('should handle different factors', () => {
      expect(calculateDelay(2, 100, 10000, 3)).toBe(900); // 100 * 3^2
      expect(calculateDelay(2, 100, 10000, 1.5)).toBe(225); // 100 * 1.5^2
    });
  });

  describe('wait', () => {
    it('should resolve after specified time', async () => {
      const promise = wait(1000);
      jest.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should not resolve before time elapses', async () => {
      const promise = wait(1000);
      jest.advanceTimersByTime(500);

      // Promise should still be pending
      let resolved = false;
      promise.then(() => {
        resolved = true;
      });

      await Promise.resolve(); // Flush promises
      expect(resolved).toBe(false);
    });
  });

  describe('retry', () => {
    it('should return result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await retry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on NetworkError', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('Connection failed'))
        .mockResolvedValue('success');

      const promise = retry(fn, { initialDelay: 100 });

      // Advance timers to trigger retry
      await jest.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry up to maxRetries', async () => {
      const error = new NetworkError('Connection failed');
      const fn = jest.fn().mockRejectedValue(error);

      // Catch the promise rejection immediately
      const promiseResult = retry(fn, { maxRetries: 3, initialDelay: 100 }).catch((e) => e);

      // Run all timers to complete all retries
      await jest.runAllTimersAsync();

      const result = await promiseResult;
      expect(result).toBeInstanceOf(NetworkError);
      expect((result as NetworkError).message).toBe('Connection failed');
      expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should use exponential backoff', async () => {
      const fn = jest.fn().mockRejectedValue(new NetworkError('Fail'));

      // Catch the promise rejection immediately
      const promiseResult = retry(fn, {
        maxRetries: 2,
        initialDelay: 1000,
        factor: 2,
      }).catch((e) => e);

      // Run all timers
      await jest.runAllTimersAsync();

      const result = await promiseResult;
      expect(result).toBeInstanceOf(NetworkError);
      expect((result as NetworkError).message).toBe('Fail');

      // Should have been called: initial + 2 retries
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should respect shouldRetry option', async () => {
      const error = new Error('Generic error');
      const fn = jest.fn().mockRejectedValue(error);

      const promise = retry(fn, {
        maxRetries: 3,
        shouldRetry: () => false, // Never retry
      });

      await expect(promise).rejects.toThrow('Generic error');
      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should call onRetry callback', async () => {
      const onRetry = jest.fn();
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('Fail'))
        .mockResolvedValue('success');

      const promise = retry(fn, {
        initialDelay: 100,
        onRetry,
      });

      await jest.advanceTimersByTimeAsync(100);
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(NetworkError));
    });

    it('should succeed on second attempt', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new NetworkError('Temporary error'))
        .mockResolvedValue('success');

      const promise = retry(fn, { initialDelay: 100 });

      await jest.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
      expect(logger.info).toHaveBeenCalledWith(
        'Operation succeeded after retry',
        expect.objectContaining({
          attempt: 1,
          totalAttempts: 2,
        })
      );
    });

    it('should not retry non-network errors by default', async () => {
      const error = new Error('Programming error');
      const fn = jest.fn().mockRejectedValue(error);

      const promise = retry(fn);

      await expect(promise).rejects.toThrow('Programming error');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should respect maxDelay', async () => {
      const fn = jest.fn().mockRejectedValue(new NetworkError('Fail'));

      // Catch the promise rejection immediately
      const promiseResult = retry(fn, {
        maxRetries: 4,
        initialDelay: 1000,
        maxDelay: 5000,
        factor: 2,
      }).catch((e) => e);

      // Run all timers
      await jest.runAllTimersAsync();

      const result = await promiseResult;
      expect(result).toBeInstanceOf(NetworkError);
      expect((result as NetworkError).message).toBe('Fail');
      expect(fn).toHaveBeenCalledTimes(5); // Initial + 4 retries
    });
  });

  describe('retryFetch', () => {
    it('should retry fetch on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network')).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      } as Response);

      const promise = retryFetch('https://api.example.com/data', undefined, {
        initialDelay: 100,
        shouldRetry: (error) => error.message.includes('network'),
      });

      await jest.advanceTimersByTimeAsync(100);
      const response = await promise;

      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should throw NetworkError on non-OK response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      const promise = retryFetch('https://api.example.com/data', undefined, {
        maxRetries: 0, // Don't retry to avoid timeout
      });

      await expect(promise).rejects.toThrow(NetworkError);
      await expect(promise).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should return response on successful fetch', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      const response = await retryFetch('https://api.example.com/data');

      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should pass fetch options', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
      } as Response);

      const init: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      };

      await retryFetch('https://api.example.com/data', init);

      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/data', init);
    });
  });

  describe('Preset Options', () => {
    it('should have criticalRetryOptions with aggressive retries', () => {
      expect(criticalRetryOptions.maxRetries).toBe(5);
      expect(criticalRetryOptions.initialDelay).toBe(500);
      expect(criticalRetryOptions.maxDelay).toBe(15000);
    });

    it('should have normalRetryOptions with less aggressive retries', () => {
      expect(normalRetryOptions.maxRetries).toBe(2);
      expect(normalRetryOptions.initialDelay).toBe(1000);
      expect(normalRetryOptions.maxDelay).toBe(5000);
    });
  });

  describe('Integration', () => {
    it('should handle complex retry scenario', async () => {
      let attempts = 0;
      const fn = jest.fn(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new NetworkError(`Attempt ${attempts} failed`));
        }
        return Promise.resolve({ success: true, attempts });
      });

      const promise = retry(fn, {
        maxRetries: 5,
        initialDelay: 100,
        factor: 2,
      });

      // First retry after 100ms
      await jest.advanceTimersByTimeAsync(100);

      // Second retry after 200ms
      await jest.advanceTimersByTimeAsync(200);

      const result = await promise;

      expect(result).toEqual({ success: true, attempts: 3 });
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });
});
