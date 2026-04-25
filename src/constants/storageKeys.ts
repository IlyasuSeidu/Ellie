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
  users: {
    profilePrefix: 'users:profile:',
    pendingMutationPrefix: 'users:pending:',
    failedMutationPrefix: 'users:failed:',
  },
  shiftLogs: {
    entryPrefix: 'shift-logs:entry:',
    pendingPrefix: 'shift-logs:pending:',
    failedPrefix: 'shift-logs:failed:',
  },
  sessions: {
    current: 'session:current',
    deviceId: 'session:deviceId',
    recordPrefix: 'sessions:record:',
    userIndexPrefix: 'sessions:index:',
    pendingPrefix: 'sessions:pending:',
  },
  maintenance: {
    lastStorageCleanupAt: 'maintenance:lastStorageCleanupAt',
  },
} as const;

export type StorageKeyGroup = typeof STORAGE_KEYS;
