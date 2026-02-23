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
 * Supported locale for voice assistant
 */
export interface SupportedLocale {
  /** BCP 47 locale code */
  code: string;
  /** Display name */
  label: string;
  /** TTS language code (may differ from STT code) */
  ttsLanguage: string;
}

/** All supported voice assistant locales */
export const SUPPORTED_LOCALES: SupportedLocale[] = [
  { code: 'en-US', label: 'English (US)', ttsLanguage: 'en-US' },
  { code: 'en-GB', label: 'English (UK)', ttsLanguage: 'en-GB' },
  { code: 'de-DE', label: 'Deutsch', ttsLanguage: 'de-DE' },
  { code: 'fr-FR', label: 'Fran\u00e7ais', ttsLanguage: 'fr-FR' },
  { code: 'es-ES', label: 'Espa\u00f1ol', ttsLanguage: 'es-ES' },
  { code: 'nl-NL', label: 'Nederlands', ttsLanguage: 'nl-NL' },
  { code: 'sv-SE', label: 'Svenska', ttsLanguage: 'sv-SE' },
  { code: 'nb-NO', label: 'Norsk', ttsLanguage: 'nb-NO' },
  { code: 'da-DK', label: 'Dansk', ttsLanguage: 'da-DK' },
];

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
 * Wake-word configuration
 */
export interface WakeWordConfig {
  /** Wake-word engine provider */
  provider: 'porcupine' | 'openwakeword';
  /** Enable wake-word detection */
  enabled: boolean;
  /** Picovoice AccessKey */
  accessKey?: string;
  /** Human-readable wake-word phrase label (e.g. "Hey Ellie") */
  phrase?: string;
  /** Optional custom keyword model paths (.ppn) */
  keywordPaths: string[];
  /** Optional iOS-specific custom keyword model paths (.ppn) */
  keywordPathsIOS: string[];
  /** Optional Android-specific custom keyword model paths (.ppn) */
  keywordPathsAndroid: string[];
  /** Built-in keywords (used when keywordPaths is empty) */
  builtInKeywords: string[];
  /** Detection sensitivity in [0, 1] */
  sensitivity: number;
  /** Auto-start wake-word listening while app is active + idle */
  autoStart: boolean;
  /** Optional OpenWakeWord model path (fallback for both platforms) */
  openWakeWordModelPath?: string;
  /** Optional iOS-specific OpenWakeWord model path */
  openWakeWordModelPathIOS?: string;
  /** Optional Android-specific OpenWakeWord model path */
  openWakeWordModelPathAndroid?: string;
  /** Optional OpenWakeWord melspectrogram feature model path (fallback for both platforms) */
  openWakeWordMelspectrogramModelPath?: string;
  /** Optional iOS-specific OpenWakeWord melspectrogram feature model path */
  openWakeWordMelspectrogramModelPathIOS?: string;
  /** Optional Android-specific OpenWakeWord melspectrogram feature model path */
  openWakeWordMelspectrogramModelPathAndroid?: string;
  /** Optional OpenWakeWord embedding feature model path (fallback for both platforms) */
  openWakeWordEmbeddingModelPath?: string;
  /** Optional iOS-specific OpenWakeWord embedding feature model path */
  openWakeWordEmbeddingModelPathIOS?: string;
  /** Optional Android-specific OpenWakeWord embedding feature model path */
  openWakeWordEmbeddingModelPathAndroid?: string;
  /** OpenWakeWord score threshold in [0, 1] */
  openWakeWordThreshold: number;
  /** Cooldown window between detections (milliseconds) */
  openWakeWordTriggerCooldownMs: number;
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
  ellieBrain: {
    /** Cloud Function URL for the Ellie voice assistant brain */
    url: string;
    /** Request timeout in milliseconds */
    timeout: number;
    /** Max characters for user query */
    maxQueryLength: number;
  };
  voiceAssistant: {
    /** Default speech recognition locale */
    locale: string;
    /** TTS speech rate */
    speechRate: number;
    /** Max conversation history messages to send */
    maxHistoryMessages: number;
    /** Supported locales for speech recognition and TTS */
    supportedLocales: SupportedLocale[];
    /** Wake-word detection settings */
    wakeWord: WakeWordConfig;
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
function normalizeEnvValue(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : undefined;
}

function getEnvVar(key: string, required = true): string | undefined {
  const constantsAny = Constants as unknown as {
    manifest?: { extra?: Record<string, unknown> };
    manifest2?: {
      extra?: {
        expoClient?: {
          extra?: Record<string, unknown>;
        };
      };
    };
  };

  const value =
    normalizeEnvValue(Constants.expoConfig?.extra?.[key]) ??
    normalizeEnvValue(constantsAny.manifest2?.extra?.expoClient?.extra?.[key]) ??
    normalizeEnvValue(constantsAny.manifest?.extra?.[key]) ??
    normalizeEnvValue(process.env[key]) ??
    normalizeEnvValue(process.env[`EXPO_PUBLIC_${key}`]);

  if (required && !value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Please check your .env file and app.config.js`
    );
  }

  return value;
}

function parseBooleanEnv(key: string, fallback: boolean): boolean {
  const value = getEnvVar(key, false);
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase().trim());
}

function parseCsvEnv(key: string): string[] {
  const value = getEnvVar(key, false);
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
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
  const wakeWordProviderRaw = getEnvVar('WAKE_WORD_PROVIDER', false)?.trim().toLowerCase();
  const wakeWordProvider = wakeWordProviderRaw === 'porcupine' ? 'porcupine' : 'openwakeword';
  const wakeWordAccessKey = getEnvVar('PICOVOICE_ACCESS_KEY', false);
  const wakeWordSensitivityRaw = parseFloat(getEnvVar('WAKE_WORD_SENSITIVITY', false) || '0.65');
  const wakeWordSensitivity = Number.isFinite(wakeWordSensitivityRaw)
    ? Math.min(1, Math.max(0, wakeWordSensitivityRaw))
    : 0.65;
  const openWakeWordThresholdRaw = parseFloat(getEnvVar('OPENWAKEWORD_THRESHOLD', false) || '0.45');
  const openWakeWordThreshold = Number.isFinite(openWakeWordThresholdRaw)
    ? Math.min(1, Math.max(0, openWakeWordThresholdRaw))
    : 0.45;
  const openWakeWordModelPath = getEnvVar('OPENWAKEWORD_MODEL_PATH', false)?.trim() || undefined;
  const openWakeWordModelPathIOS =
    getEnvVar('OPENWAKEWORD_MODEL_PATH_IOS', false)?.trim() || undefined;
  const openWakeWordModelPathAndroid =
    getEnvVar('OPENWAKEWORD_MODEL_PATH_ANDROID', false)?.trim() || undefined;
  const openWakeWordMelspectrogramModelPath =
    getEnvVar('OPENWAKEWORD_MELSPECTROGRAM_MODEL_PATH', false)?.trim() || undefined;
  const openWakeWordMelspectrogramModelPathIOS =
    getEnvVar('OPENWAKEWORD_MELSPECTROGRAM_MODEL_PATH_IOS', false)?.trim() || undefined;
  const openWakeWordMelspectrogramModelPathAndroid =
    getEnvVar('OPENWAKEWORD_MELSPECTROGRAM_MODEL_PATH_ANDROID', false)?.trim() || undefined;
  const openWakeWordEmbeddingModelPath =
    getEnvVar('OPENWAKEWORD_EMBEDDING_MODEL_PATH', false)?.trim() || undefined;
  const openWakeWordEmbeddingModelPathIOS =
    getEnvVar('OPENWAKEWORD_EMBEDDING_MODEL_PATH_IOS', false)?.trim() || undefined;
  const openWakeWordEmbeddingModelPathAndroid =
    getEnvVar('OPENWAKEWORD_EMBEDDING_MODEL_PATH_ANDROID', false)?.trim() || undefined;
  const openWakeWordTriggerCooldownMsRaw = parseInt(
    getEnvVar('OPENWAKEWORD_TRIGGER_COOLDOWN_MS', false) || '1200',
    10
  );
  const openWakeWordTriggerCooldownMs = Number.isFinite(openWakeWordTriggerCooldownMsRaw)
    ? Math.max(0, openWakeWordTriggerCooldownMsRaw)
    : 1200;
  const hasOpenWakeWordModelPath = Boolean(
    openWakeWordModelPath || openWakeWordModelPathIOS || openWakeWordModelPathAndroid
  );
  const defaultWakeWordEnabled =
    wakeWordProvider === 'openwakeword' ? hasOpenWakeWordModelPath : Boolean(wakeWordAccessKey);

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
    ellieBrain: {
      url:
        getEnvVar('ELLIE_BRAIN_URL', false) ||
        'https://ellie-brain-REGION-PROJECT.cloudfunctions.net/ellieBrain',
      timeout: parseInt(getEnvVar('ELLIE_BRAIN_TIMEOUT', false) || '30000', 10),
      maxQueryLength: 500,
    },
    voiceAssistant: {
      locale: 'en-US',
      speechRate: 1.0,
      maxHistoryMessages: 6,
      supportedLocales: SUPPORTED_LOCALES,
      wakeWord: {
        provider: wakeWordProvider,
        enabled: parseBooleanEnv('WAKE_WORD_ENABLED', defaultWakeWordEnabled),
        accessKey: wakeWordAccessKey,
        phrase: getEnvVar('WAKE_WORD_PHRASE', false)?.trim() || undefined,
        keywordPaths: parseCsvEnv('WAKE_WORD_KEYWORD_PATHS'),
        keywordPathsIOS: parseCsvEnv('WAKE_WORD_KEYWORD_PATHS_IOS'),
        keywordPathsAndroid: parseCsvEnv('WAKE_WORD_KEYWORD_PATHS_ANDROID'),
        builtInKeywords: parseCsvEnv('WAKE_WORD_BUILT_IN_KEYWORDS'),
        sensitivity: wakeWordSensitivity,
        autoStart: parseBooleanEnv('WAKE_WORD_AUTO_START', true),
        openWakeWordModelPath,
        openWakeWordModelPathIOS,
        openWakeWordModelPathAndroid,
        openWakeWordMelspectrogramModelPath,
        openWakeWordMelspectrogramModelPathIOS,
        openWakeWordMelspectrogramModelPathAndroid,
        openWakeWordEmbeddingModelPath,
        openWakeWordEmbeddingModelPathIOS,
        openWakeWordEmbeddingModelPathAndroid,
        openWakeWordThreshold,
        openWakeWordTriggerCooldownMs,
      },
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

  // Validate wake-word config
  if (
    config.voiceAssistant.wakeWord.enabled &&
    config.voiceAssistant.wakeWord.provider === 'porcupine' &&
    !config.voiceAssistant.wakeWord.accessKey
  ) {
    console.warn('Wake word is enabled but PICOVOICE_ACCESS_KEY is missing');
  }

  if (
    config.voiceAssistant.wakeWord.sensitivity < 0 ||
    config.voiceAssistant.wakeWord.sensitivity > 1
  ) {
    throw new Error('WAKE_WORD_SENSITIVITY must be between 0 and 1');
  }

  if (config.voiceAssistant.wakeWord.provider === 'porcupine') {
    const hasCustomWakeWordModels =
      config.voiceAssistant.wakeWord.keywordPaths.length > 0 ||
      config.voiceAssistant.wakeWord.keywordPathsIOS.length > 0 ||
      config.voiceAssistant.wakeWord.keywordPathsAndroid.length > 0;
    if (
      config.voiceAssistant.wakeWord.enabled &&
      !hasCustomWakeWordModels &&
      config.voiceAssistant.wakeWord.builtInKeywords.length === 0
    ) {
      console.warn(
        'Wake word is enabled but no custom keyword paths or built-in keywords are configured'
      );
    }
  } else {
    const hasOpenWakeWordModelPath = Boolean(
      config.voiceAssistant.wakeWord.openWakeWordModelPath ||
      config.voiceAssistant.wakeWord.openWakeWordModelPathIOS ||
      config.voiceAssistant.wakeWord.openWakeWordModelPathAndroid
    );
    if (config.voiceAssistant.wakeWord.enabled && !hasOpenWakeWordModelPath) {
      console.warn('Wake word provider is openwakeword but no model path is configured');
    }
  }

  if (
    config.voiceAssistant.wakeWord.openWakeWordThreshold < 0 ||
    config.voiceAssistant.wakeWord.openWakeWordThreshold > 1
  ) {
    throw new Error('OPENWAKEWORD_THRESHOLD must be between 0 and 1');
  }

  if (config.voiceAssistant.wakeWord.openWakeWordTriggerCooldownMs < 0) {
    throw new Error('OPENWAKEWORD_TRIGGER_COOLDOWN_MS must be greater than or equal to 0');
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
      ellieBrain: {
        url: 'https://ellie-brain-test.cloudfunctions.net/ellieBrain',
        timeout: 30000,
        maxQueryLength: 500,
      },
      voiceAssistant: {
        locale: 'en-US',
        speechRate: 1.0,
        maxHistoryMessages: 6,
        supportedLocales: SUPPORTED_LOCALES,
        wakeWord: {
          provider: 'openwakeword',
          enabled: false,
          accessKey: undefined,
          keywordPaths: [],
          keywordPathsIOS: [],
          keywordPathsAndroid: [],
          builtInKeywords: ['PORCUPINE'],
          sensitivity: 0.65,
          autoStart: true,
          openWakeWordModelPath: undefined,
          openWakeWordModelPathIOS: undefined,
          openWakeWordModelPathAndroid: undefined,
          openWakeWordMelspectrogramModelPath: undefined,
          openWakeWordMelspectrogramModelPathIOS: undefined,
          openWakeWordMelspectrogramModelPathAndroid: undefined,
          openWakeWordEmbeddingModelPath: undefined,
          openWakeWordEmbeddingModelPathIOS: undefined,
          openWakeWordEmbeddingModelPathAndroid: undefined,
          openWakeWordThreshold: 0.45,
          openWakeWordTriggerCooldownMs: 1200,
        },
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
export const ellieBrainConfig = config.ellieBrain;
export const voiceAssistantConfig = config.voiceAssistant;
