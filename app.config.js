/**
 * Expo Application Configuration
 *
 * Loads .env values and exposes them via expo.extra for runtime config validation.
 */

try {
  require('dotenv').config();
} catch (_error) {
  // dotenv is optional in some environments
}

module.exports = ({ config = {} }) => {
  const appEnv = process.env.APP_ENV || 'development';
  const configExtra = config.extra || {};
  const easProjectId = process.env.EAS_PROJECT_ID || configExtra?.eas?.projectId || '';
  const expoUpdates = {
    ...(config.updates || {}),
  };
  const iosGoogleServicesFile =
    process.env.EXPO_IOS_GOOGLE_SERVICES_FILE ||
    process.env.IOS_GOOGLE_SERVICES_FILE ||
    process.env.GOOGLE_SERVICES_FILE;

  if (!expoUpdates.url && easProjectId) {
    expoUpdates.url = `https://u.expo.dev/${easProjectId}`;
  }

  // Use appVersion runtime in non-production to avoid local-vs-cloud fingerprint drift in dev builds.
  // Keep fingerprint policy in production to protect OTA/native compatibility.
  const runtimeVersion =
    config.runtimeVersion ||
    (appEnv === 'production' ? { policy: 'fingerprint' } : { policy: 'appVersion' });

  return {
    ...config,
    updates: expoUpdates,
    runtimeVersion,
    ios: {
      ...(config.ios || {}),
      ...(iosGoogleServicesFile ? { googleServicesFile: iosGoogleServicesFile } : {}),
    },
    extra: {
      ...configExtra,
      APP_ENV: appEnv,
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY || '',
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN || '',
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET || '',
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID || '',
      FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID || '',
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_WEB_CLIENT_ID || '',
      GOOGLE_WEB_CLIENT_ID:
        process.env.GOOGLE_WEB_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || process.env.GOOGLE_IOS_CLIENT_ID || '',
      GOOGLE_IOS_CLIENT_ID:
        process.env.GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
      REVENUECAT_IOS_KEY: process.env.REVENUECAT_IOS_KEY || '',
      REVENUECAT_ANDROID_KEY: process.env.REVENUECAT_ANDROID_KEY || '',
      API_BASE_URL: process.env.API_BASE_URL || 'https://api.shiftsync.app',
      API_TIMEOUT: process.env.API_TIMEOUT || '30000',
      ELLIE_BRAIN_URL:
        process.env.ELLIE_BRAIN_URL ||
        'https://ellie-brain-REGION-PROJECT.cloudfunctions.net/ellieBrain',
      ELLIE_BRAIN_TIMEOUT: process.env.ELLIE_BRAIN_TIMEOUT || '30000',
      PICOVOICE_ACCESS_KEY: process.env.PICOVOICE_ACCESS_KEY || '',
      WAKE_WORD_PROVIDER: process.env.WAKE_WORD_PROVIDER || '',
      WAKE_WORD_ENABLED: process.env.WAKE_WORD_ENABLED || '',
      WAKE_WORD_AUTO_START: process.env.WAKE_WORD_AUTO_START || '',
      WAKE_WORD_SENSITIVITY: process.env.WAKE_WORD_SENSITIVITY || '',
      WAKE_WORD_PHRASE: process.env.WAKE_WORD_PHRASE || '',
      WAKE_WORD_KEYWORD_PATHS: process.env.WAKE_WORD_KEYWORD_PATHS || '',
      WAKE_WORD_KEYWORD_PATHS_IOS: process.env.WAKE_WORD_KEYWORD_PATHS_IOS || '',
      WAKE_WORD_KEYWORD_PATHS_ANDROID: process.env.WAKE_WORD_KEYWORD_PATHS_ANDROID || '',
      WAKE_WORD_BUILT_IN_KEYWORDS: process.env.WAKE_WORD_BUILT_IN_KEYWORDS || '',
      OPENWAKEWORD_MODEL_PATH: process.env.OPENWAKEWORD_MODEL_PATH || '',
      OPENWAKEWORD_MODEL_PATH_IOS: process.env.OPENWAKEWORD_MODEL_PATH_IOS || '',
      OPENWAKEWORD_MODEL_PATH_ANDROID: process.env.OPENWAKEWORD_MODEL_PATH_ANDROID || '',
      OPENWAKEWORD_MELSPECTROGRAM_MODEL_PATH:
        process.env.OPENWAKEWORD_MELSPECTROGRAM_MODEL_PATH || '',
      OPENWAKEWORD_MELSPECTROGRAM_MODEL_PATH_IOS:
        process.env.OPENWAKEWORD_MELSPECTROGRAM_MODEL_PATH_IOS || '',
      OPENWAKEWORD_MELSPECTROGRAM_MODEL_PATH_ANDROID:
        process.env.OPENWAKEWORD_MELSPECTROGRAM_MODEL_PATH_ANDROID || '',
      OPENWAKEWORD_EMBEDDING_MODEL_PATH: process.env.OPENWAKEWORD_EMBEDDING_MODEL_PATH || '',
      OPENWAKEWORD_EMBEDDING_MODEL_PATH_IOS:
        process.env.OPENWAKEWORD_EMBEDDING_MODEL_PATH_IOS || '',
      OPENWAKEWORD_EMBEDDING_MODEL_PATH_ANDROID:
        process.env.OPENWAKEWORD_EMBEDDING_MODEL_PATH_ANDROID || '',
      OPENWAKEWORD_THRESHOLD: process.env.OPENWAKEWORD_THRESHOLD || '',
      OPENWAKEWORD_TRIGGER_COOLDOWN_MS: process.env.OPENWAKEWORD_TRIGGER_COOLDOWN_MS || '',
      OPENWAKEWORD_MIN_RMS: process.env.OPENWAKEWORD_MIN_RMS || '',
      OPENWAKEWORD_ACTIVATION_FRAMES: process.env.OPENWAKEWORD_ACTIVATION_FRAMES || '',
      OPENWAKEWORD_SCORE_SMOOTHING_ALPHA: process.env.OPENWAKEWORD_SCORE_SMOOTHING_ALPHA || '',
      eas: {
        ...(configExtra?.eas || {}),
        ...(easProjectId ? { projectId: easProjectId } : {}),
      },
    },
  };
};
