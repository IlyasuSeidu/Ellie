export const STORAGE_KEYS = {
  onboarding: {
    data: 'onboarding:data',
    complete: 'onboarding:complete',
  },
  i18n: {
    language: 'i18n:language',
    legacyLanguage: '@ellie_language',
  },
  appState: {
    installStartedAt: 'install:startedAt',
    paywallDeclinedAt: 'paywall:declinedAt',
    notificationSoftDeclined: 'notifications:softDeclined',
    legacyInstallStartedAt: 'app:install_time',
    legacyPaywallDeclinedAt: 'paywall:declined_at',
    legacyNotificationSoftDeclined: 'notifications:soft_declined',
    legacyAskEllieDone: 'checklist:ask_ellie_done',
  },
  notifications: {
    expoPushToken: 'notifications:expoPushToken',
    historyPrefix: 'notifications:history:',
    lookupPrefix: 'notifications:lookup:',
  },
  sessions: {
    current: 'session:current',
    deviceId: 'session:deviceId',
    recordPrefix: 'sessions:record:',
    userIndexPrefix: 'sessions:index:',
  },
  maintenance: {
    lastStorageCleanupAt: 'maintenance:lastStorageCleanupAt',
  },
} as const;

export type StorageKeyGroup = typeof STORAGE_KEYS;
