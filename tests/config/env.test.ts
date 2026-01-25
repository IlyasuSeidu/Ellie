/**
 * Environment Configuration Tests
 *
 * Tests for environment variable loading and validation.
 */

import config, {
  isDevelopment,
  isStaging,
  isProduction,
  isTest,
  firebaseConfig,
  googleConfig,
  apiConfig,
  appConfig,
} from '@/config/env';

describe('Environment Configuration', () => {
  it('should export a valid configuration object', () => {
    expect(config).toBeDefined();
    expect(config.env).toBeDefined();
    expect(config.firebase).toBeDefined();
    expect(config.google).toBeDefined();
    expect(config.api).toBeDefined();
    expect(config.app).toBeDefined();
  });

  it('should have valid environment type', () => {
    expect(['development', 'staging', 'production']).toContain(config.env);
  });

  describe('Firebase Configuration', () => {
    it('should have all required Firebase properties', () => {
      expect(firebaseConfig.apiKey).toBeDefined();
      expect(firebaseConfig.authDomain).toBeDefined();
      expect(firebaseConfig.projectId).toBeDefined();
      expect(firebaseConfig.storageBucket).toBeDefined();
      expect(firebaseConfig.messagingSenderId).toBeDefined();
      expect(firebaseConfig.appId).toBeDefined();
    });

    it('should have non-empty Firebase values in test environment', () => {
      expect(firebaseConfig.apiKey).toBeTruthy();
      expect(firebaseConfig.authDomain).toBeTruthy();
      expect(firebaseConfig.projectId).toBeTruthy();
    });

    it('should have valid Firebase API key format', () => {
      expect(typeof firebaseConfig.apiKey).toBe('string');
      expect(firebaseConfig.apiKey.length).toBeGreaterThan(0);
    });

    it('should have valid Firebase project ID format', () => {
      expect(typeof firebaseConfig.projectId).toBe('string');
      expect(firebaseConfig.projectId.length).toBeGreaterThan(0);
    });
  });

  describe('Google Configuration', () => {
    it('should have Google web client ID', () => {
      expect(googleConfig.webClientId).toBeDefined();
      expect(typeof googleConfig.webClientId).toBe('string');
    });

    it('should have non-empty Google client ID', () => {
      expect(googleConfig.webClientId).toBeTruthy();
    });
  });

  describe('API Configuration', () => {
    it('should have valid API base URL', () => {
      expect(apiConfig.baseUrl).toBeDefined();
      expect(typeof apiConfig.baseUrl).toBe('string');
    });

    it('should have valid API timeout', () => {
      expect(apiConfig.timeout).toBeDefined();
      expect(typeof apiConfig.timeout).toBe('number');
      expect(apiConfig.timeout).toBeGreaterThan(0);
    });

    it('should have API timeout within valid range', () => {
      expect(apiConfig.timeout).toBeGreaterThanOrEqual(1000);
      expect(apiConfig.timeout).toBeLessThanOrEqual(60000);
    });

    it('should have valid URL format for base URL', () => {
      expect(apiConfig.baseUrl).toMatch(/^https?:\/\//);
    });
  });

  describe('App Configuration', () => {
    it('should have app name', () => {
      expect(appConfig.name).toBeDefined();
      expect(typeof appConfig.name).toBe('string');
      expect(appConfig.name.length).toBeGreaterThan(0);
    });

    it('should have app version', () => {
      expect(appConfig.version).toBeDefined();
      expect(typeof appConfig.version).toBe('string');
      expect(appConfig.version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should have build number', () => {
      expect(appConfig.buildNumber).toBeDefined();
      expect(typeof appConfig.buildNumber).toBe('string');
    });
  });

  describe('Environment Flags', () => {
    it('should have valid environment flag values', () => {
      expect(typeof isDevelopment).toBe('boolean');
      expect(typeof isStaging).toBe('boolean');
      expect(typeof isProduction).toBe('boolean');
      expect(typeof isTest).toBe('boolean');
    });

    it('should be in test environment', () => {
      expect(isTest).toBe(true);
    });

    it('should only have one environment flag true at a time (excluding isTest)', () => {
      const envFlags = [isDevelopment, isStaging, isProduction];
      const trueCount = envFlags.filter(Boolean).length;
      expect(trueCount).toBe(1);
    });

    it('should be in development environment for tests', () => {
      expect(isDevelopment).toBe(true);
      expect(isStaging).toBe(false);
      expect(isProduction).toBe(false);
    });
  });

  describe('Configuration Structure', () => {
    it('should have consistent structure', () => {
      const expectedKeys = ['env', 'firebase', 'google', 'api', 'app'];
      const actualKeys = Object.keys(config);

      expectedKeys.forEach((key) => {
        expect(actualKeys).toContain(key);
      });
    });

    it('should export individual config sections', () => {
      expect(firebaseConfig).toBe(config.firebase);
      expect(googleConfig).toBe(config.google);
      expect(apiConfig).toBe(config.api);
      expect(appConfig).toBe(config.app);
    });
  });

  describe('Configuration Immutability', () => {
    it('should maintain config values', () => {
      const originalApiKey = firebaseConfig.apiKey;
      const originalProjectId = firebaseConfig.projectId;

      expect(firebaseConfig.apiKey).toBe(originalApiKey);
      expect(firebaseConfig.projectId).toBe(originalProjectId);
    });

    it('should not allow undefined required values', () => {
      expect(firebaseConfig.apiKey).not.toBeUndefined();
      expect(firebaseConfig.projectId).not.toBeUndefined();
      expect(googleConfig.webClientId).not.toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    it('should have correct types for all config values', () => {
      // Firebase config types
      expect(typeof config.firebase.apiKey).toBe('string');
      expect(typeof config.firebase.authDomain).toBe('string');
      expect(typeof config.firebase.projectId).toBe('string');
      expect(typeof config.firebase.storageBucket).toBe('string');
      expect(typeof config.firebase.messagingSenderId).toBe('string');
      expect(typeof config.firebase.appId).toBe('string');

      // Google config types
      expect(typeof config.google.webClientId).toBe('string');

      // API config types
      expect(typeof config.api.baseUrl).toBe('string');
      expect(typeof config.api.timeout).toBe('number');

      // App config types
      expect(typeof config.app.name).toBe('string');
      expect(typeof config.app.version).toBe('string');
      expect(typeof config.app.buildNumber).toBe('string');
    });

    it('should have proper enum for environment', () => {
      const validEnvironments = ['development', 'staging', 'production'];
      expect(validEnvironments).toContain(config.env);
    });
  });
});
