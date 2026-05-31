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

const GOOGLE_IOS_CLIENT_SUFFIX = '.apps.googleusercontent.com';

function getGoogleIosUrlScheme(googleIosClientId) {
  if (!googleIosClientId || !googleIosClientId.endsWith(GOOGLE_IOS_CLIENT_SUFFIX)) {
    return '';
  }

  return `com.googleusercontent.apps.${googleIosClientId.slice(0, -GOOGLE_IOS_CLIENT_SUFFIX.length)}`;
}

function withGoogleSignInIosUrlScheme(plugins, iosUrlScheme) {
  if (!iosUrlScheme) {
    return plugins;
  }

  return plugins.map((plugin) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;

    if (pluginName !== '@react-native-google-signin/google-signin') {
      return plugin;
    }

    const pluginOptions =
      Array.isArray(plugin) && plugin[1] && typeof plugin[1] === 'object' ? plugin[1] : {};

    return [
      '@react-native-google-signin/google-signin',
      {
        ...pluginOptions,
        iosUrlScheme,
      },
    ];
  });
}

module.exports = ({ config = {} }) => {
  const ryvroIdentity = {
    name: 'Ryvro Shift Planner',
    slug: 'ryvro',
    scheme: 'ryvro',
    version: '1.0.0',
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    iosBundleIdentifier: 'com.ryvro.shiftplanner',
    iosBuildNumber: '1',
    androidPackage: 'com.ryvro.shiftplanner',
    androidVersionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    favicon: './assets/favicon.png',
  };
  const ryvroIosInfoPlist = {
    CFBundleDisplayName: 'Ryvro',
    NSSpeechRecognitionUsageDescription:
      'Ryvro needs speech recognition to understand your questions.',
    NSMicrophoneUsageDescription: 'Ryvro needs microphone access for voice commands.',
    ITSAppUsesNonExemptEncryption: false,
  };
  const ryvroPlugins = [
    'expo-localization',
    'expo-font',
    'expo-asset',
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '16.0',
          useFrameworks: 'static',
        },
      },
    ],
    [
      '@react-native-google-signin/google-signin',
      {
        iosUrlScheme: 'com.googleusercontent.apps.197162533368-5mhtc7pnngbq2n50rll6857n90n3t97r',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Ryvro needs access to your photos to set a profile picture.',
        cameraPermission: 'Ryvro needs access to your camera to take a profile picture.',
      },
    ],
    [
      'expo-speech-recognition',
      {
        microphonePermission: 'Ryvro needs microphone access for voice commands.',
        speechRecognitionPermission: 'Ryvro needs speech recognition to understand your questions.',
      },
    ],
  ];
  const appEnv = process.env.APP_ENV || 'development';
  const configExtra = config.extra || {};
  const easProjectId = process.env.EAS_PROJECT_ID || configExtra?.eas?.projectId || '';
  const expoUpdates = {
    ...(config.updates || {}),
  };
  const isE2ETestMode = process.env.E2E_TEST_MODE === '1' || process.env.E2E_TEST_MODE === 'true';
  const iosGoogleServicesFile =
    process.env.EXPO_IOS_GOOGLE_SERVICES_FILE ||
    process.env.IOS_GOOGLE_SERVICES_FILE ||
    process.env.GOOGLE_SERVICES_FILE ||
    (appEnv === 'production' ? undefined : './config/firebase/GoogleService-Info.local.plist');
  const androidGoogleServicesFile =
    process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE ||
    process.env.ANDROID_GOOGLE_SERVICES_FILE ||
    process.env.GOOGLE_SERVICES_FILE ||
    (appEnv === 'production' ? undefined : './config/firebase/google-services.local.json');
  const googleIosClientId =
    process.env.GOOGLE_IOS_CLIENT_ID || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
  const googleIosUrlScheme = getGoogleIosUrlScheme(googleIosClientId);

  if (!expoUpdates.url && easProjectId) {
    expoUpdates.url = `https://u.expo.dev/${easProjectId}`;
  }

  if (isE2ETestMode) {
    expoUpdates.enabled = false;
    delete expoUpdates.url;
  }

  // Use appVersion runtime in non-production to avoid local-vs-cloud fingerprint drift in dev builds.
  // Keep fingerprint policy in production to protect OTA/native compatibility.
  const runtimeVersion =
    config.runtimeVersion ||
    (appEnv === 'production' ? { policy: 'fingerprint' } : { policy: 'appVersion' });

  return {
    ...config,
    name: config.name || ryvroIdentity.name,
    slug: config.slug || ryvroIdentity.slug,
    scheme: config.scheme || ryvroIdentity.scheme,
    version: config.version || ryvroIdentity.version,
    icon: config.icon || ryvroIdentity.icon,
    splash: {
      ...ryvroIdentity.splash,
      ...(config.splash || {}),
    },
    updates: expoUpdates,
    runtimeVersion,
    ios: {
      ...(config.ios || {}),
      supportsTablet: config.ios?.supportsTablet ?? true,
      usesAppleSignIn: config.ios?.usesAppleSignIn ?? true,
      infoPlist: {
        ...ryvroIosInfoPlist,
        ...(config.ios?.infoPlist || {}),
      },
      bundleIdentifier: config.ios?.bundleIdentifier || ryvroIdentity.iosBundleIdentifier,
      buildNumber: config.ios?.buildNumber || ryvroIdentity.iosBuildNumber,
      ...(iosGoogleServicesFile ? { googleServicesFile: iosGoogleServicesFile } : {}),
    },
    android: {
      ...(config.android || {}),
      package: config.android?.package || ryvroIdentity.androidPackage,
      versionCode: config.android?.versionCode || ryvroIdentity.androidVersionCode,
      edgeToEdgeEnabled: config.android?.edgeToEdgeEnabled ?? true,
      predictiveBackGestureEnabled: config.android?.predictiveBackGestureEnabled ?? false,
      permissions: config.android?.permissions || ['android.permission.RECORD_AUDIO'],
      adaptiveIcon: {
        ...ryvroIdentity.adaptiveIcon,
        ...(config.android?.adaptiveIcon || {}),
      },
      ...(androidGoogleServicesFile ? { googleServicesFile: androidGoogleServicesFile } : {}),
    },
    web: {
      ...(config.web || {}),
      favicon: config.web?.favicon || ryvroIdentity.favicon,
    },
    plugins: withGoogleSignInIosUrlScheme(config.plugins || ryvroPlugins, googleIosUrlScheme),
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
      REVENUECAT_API_KEY:
        process.env.REVENUECAT_API_KEY || process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '',
      EXPO_PUBLIC_REVENUECAT_API_KEY:
        process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || process.env.REVENUECAT_API_KEY || '',
      REVENUECAT_ENTITLEMENT_ID:
        process.env.REVENUECAT_ENTITLEMENT_ID ||
        process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ||
        'pro',
      EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID:
        process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ||
        process.env.REVENUECAT_ENTITLEMENT_ID ||
        'pro',
      REVENUECAT_IOS_KEY:
        process.env.REVENUECAT_IOS_KEY ||
        process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
        process.env.REVENUECAT_API_KEY ||
        process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
        '',
      REVENUECAT_ANDROID_KEY:
        process.env.REVENUECAT_ANDROID_KEY ||
        process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ||
        process.env.REVENUECAT_API_KEY ||
        process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
        '',
      EXPO_PUBLIC_REVENUECAT_IOS_KEY:
        process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
        process.env.REVENUECAT_IOS_KEY ||
        process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
        process.env.REVENUECAT_API_KEY ||
        '',
      EXPO_PUBLIC_REVENUECAT_ANDROID_KEY:
        process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ||
        process.env.REVENUECAT_ANDROID_KEY ||
        process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
        process.env.REVENUECAT_API_KEY ||
        '',
      E2E_TEST_MODE: process.env.E2E_TEST_MODE || '',
      EXPO_PUBLIC_E2E_TEST_MODE: process.env.EXPO_PUBLIC_E2E_TEST_MODE || '',
      API_BASE_URL: process.env.API_BASE_URL || 'https://api.getryvro.com',
      API_TIMEOUT: process.env.API_TIMEOUT || '30000',
      LEGAL_PRIVACY_POLICY_URL:
        process.env.LEGAL_PRIVACY_POLICY_URL || 'https://getryvro.com/privacy',
      LEGAL_TERMS_OF_SERVICE_URL:
        process.env.LEGAL_TERMS_OF_SERVICE_URL || 'https://getryvro.com/terms',
      SUPPORT_URL: process.env.SUPPORT_URL || 'https://getryvro.com/support',
      ACCOUNT_DELETION_URL:
        process.env.ACCOUNT_DELETION_URL || 'https://getryvro.com/delete-account',
      RYVRO_BRAIN_URL:
        process.env.RYVRO_BRAIN_URL ||
        process.env.ELLIE_BRAIN_URL ||
        'https://ryvro-brain-REGION-PROJECT.cloudfunctions.net/ryvroBrain',
      RYVRO_BRAIN_TIMEOUT:
        process.env.RYVRO_BRAIN_TIMEOUT || process.env.ELLIE_BRAIN_TIMEOUT || '30000',
      ELLIE_BRAIN_URL: process.env.ELLIE_BRAIN_URL || '',
      ELLIE_BRAIN_TIMEOUT: process.env.ELLIE_BRAIN_TIMEOUT || '',
      SHIFT_SCHEDULE_PARSER_URL: process.env.SHIFT_SCHEDULE_PARSER_URL || '',
      SHIFT_SCHEDULE_PARSER_TIMEOUT_MS: process.env.SHIFT_SCHEDULE_PARSER_TIMEOUT_MS || '45000',
      SHIFT_SCHEDULE_PARSER_MAX_PROMPT_LENGTH:
        process.env.SHIFT_SCHEDULE_PARSER_MAX_PROMPT_LENGTH || '2000',
      UNIVERSAL_SHIFT_BUILDER_ENABLED: process.env.UNIVERSAL_SHIFT_BUILDER_ENABLED || '',
      AI_SHIFT_BUILDER_ENABLED: process.env.AI_SHIFT_BUILDER_ENABLED || '',
      E2E_TEST_MODE: process.env.E2E_TEST_MODE || '',
      EXPO_PUBLIC_E2E_TEST_MODE: process.env.EXPO_PUBLIC_E2E_TEST_MODE || '',
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
