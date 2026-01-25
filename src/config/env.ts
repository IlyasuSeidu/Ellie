/**
 * Environment Configuration
 *
 * Loads and validates environment variables from expo-constants.
 * Provides type-safe access to configuration values.
 */

import Constants from 'expo-constants';

/**
 * Environment Type
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * Firebase Configuration
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Application Configuration
 */
export interface AppConfig {
  env: Environment;
  firebase: FirebaseConfig;
  google: {
    webClientId: string;
  };
  api: {
    baseUrl: string;
    timeout: number;
  };
  app: {
    name: string;
    version: string;
    buildNumber: string;
  };
}

/**
 * Get environment variable with validation
 *
 * @param key - Environment variable key
 * @param required - Whether the variable is required (default: true)
 * @returns Environment variable value or undefined if not required
 * @throws Error if required variable is missing
 */
function getEnvVar(key: string, required = true): string | undefined {
  const value = Constants.expoConfig?.extra?.[key] || process.env[key];

  if (required && !value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Please check your .env file and app.config.js`
    );
  }

  return value;
}

/**
 * Determine current environment
 */
function getEnvironment(): Environment {
  const nodeEnv = process.env.NODE_ENV;
  const appEnv = getEnvVar('APP_ENV', false);

  if (appEnv === 'production' || nodeEnv === 'production') {
    return 'production';
  }

  if (appEnv === 'staging') {
    return 'staging';
  }

  return 'development';
}

/**
 * Build Firebase configuration from environment variables
 */
function buildFirebaseConfig(): FirebaseConfig {
  return {
    apiKey: getEnvVar('FIREBASE_API_KEY') as string,
    authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN') as string,
    projectId: getEnvVar('FIREBASE_PROJECT_ID') as string,
    storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET') as string,
    messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID') as string,
    appId: getEnvVar('FIREBASE_APP_ID') as string,
    measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID', false),
  };
}

/**
 * Build application configuration
 */
function buildAppConfig(): AppConfig {
  const env = getEnvironment();

  return {
    env,
    firebase: buildFirebaseConfig(),
    google: {
      webClientId: getEnvVar('GOOGLE_WEB_CLIENT_ID') as string,
    },
    api: {
      baseUrl: getEnvVar('API_BASE_URL', false) || 'https://api.shiftsync.app',
      timeout: parseInt(getEnvVar('API_TIMEOUT', false) || '30000', 10),
    },
    app: {
      name: Constants.expoConfig?.name || 'ShiftSync',
      version: Constants.expoConfig?.version || '1.0.0',
      buildNumber: Constants.expoConfig?.ios?.buildNumber || '1',
    },
  };
}

/**
 * Validate configuration
 *
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
function validateConfig(config: AppConfig): void {
  // Validate Firebase config
  if (!config.firebase.apiKey) {
    throw new Error('Firebase API key is required');
  }

  if (!config.firebase.projectId) {
    throw new Error('Firebase project ID is required');
  }

  // Validate Google config
  if (!config.google.webClientId) {
    throw new Error('Google web client ID is required');
  }

  // Validate API config
  if (config.api.timeout < 1000 || config.api.timeout > 60000) {
    throw new Error('API timeout must be between 1000 and 60000 milliseconds');
  }

  // Additional validation for production
  if (config.env === 'production') {
    if (!config.firebase.measurementId) {
      console.warn('Firebase measurement ID is recommended for production');
    }
  }
}

/**
 * Initialize and export configuration
 */
let config: AppConfig;

try {
  config = buildAppConfig();
  validateConfig(config);
} catch (error) {
  if (process.env.NODE_ENV === 'test') {
    // In test environment, provide mock config
    config = {
      env: 'development',
      firebase: {
        apiKey: 'test-api-key',
        authDomain: 'test-auth-domain',
        projectId: 'test-project-id',
        storageBucket: 'test-storage-bucket',
        messagingSenderId: 'test-sender-id',
        appId: 'test-app-id',
      },
      google: {
        webClientId: 'test-web-client-id',
      },
      api: {
        baseUrl: 'https://api.test.com',
        timeout: 30000,
      },
      app: {
        name: 'ShiftSync',
        version: '1.0.0',
        buildNumber: '1',
      },
    };
  } else {
    // Re-throw error in non-test environments
    throw error;
  }
}

export default config;

/**
 * Check if running in development environment
 */
export const isDevelopment = config.env === 'development';

/**
 * Check if running in staging environment
 */
export const isStaging = config.env === 'staging';

/**
 * Check if running in production environment
 */
export const isProduction = config.env === 'production';

/**
 * Check if running in test environment
 */
export const isTest = process.env.NODE_ENV === 'test';

/**
 * Export individual config sections for convenience
 */
export const firebaseConfig = config.firebase;
export const googleConfig = config.google;
export const apiConfig = config.api;
export const appConfig = config.app;
