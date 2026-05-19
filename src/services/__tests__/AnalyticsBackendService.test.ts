const mockGetCloudFunctions = jest.fn(() => ({ app: 'functions' }));
const mockGetFirebaseAuth = jest.fn(() => ({ currentUser: { uid: 'user-123' } }));

jest.mock('@/config/firebase', () => ({
  getCloudFunctions: mockGetCloudFunctions,
  getFirebaseAuth: mockGetFirebaseAuth,
}));

jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(),
}));

jest.mock('@/config/env', () => ({
  appConfig: {
    version: '1.2.3',
    buildNumber: '45',
  },
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-AU', regionCode: 'AU' }],
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { AnalyticsBackendService } from '../AnalyticsBackendService';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import type { AsyncStorageService } from '../AsyncStorageService';

type StoreValue = unknown;

type TestStorage = Pick<AsyncStorageService, 'get' | 'set'> & {
  values: Map<string, StoreValue>;
  getMock: jest.Mock;
  setMock: jest.Mock;
};

function createStorage(initial: Record<string, StoreValue> = {}): TestStorage {
  const values = new Map<string, StoreValue>(Object.entries(initial));
  const getMock = jest.fn(async (key: string) => (values.has(key) ? values.get(key) : null));
  const setMock = jest.fn(async (key: string, value: StoreValue) => {
    values.set(key, value);
  });

  return {
    values,
    getMock,
    setMock,
    get: getMock as unknown as AsyncStorageService['get'],
    set: setMock as unknown as AsyncStorageService['set'],
  };
}

function createNetwork() {
  return {
    subscribe: jest.fn(() => jest.fn()),
  };
}

describe('AnalyticsBackendService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends analytics events through the injected callable with install context', async () => {
    const callable = jest.fn().mockResolvedValue({ data: { ok: true } });
    const storage = createStorage({ [STORAGE_KEYS.analytics.installId]: 'install-123' });
    const service = new AnalyticsBackendService(storage, createNetwork(), () => callable);

    await service.trackEvent('paywall_viewed', { plan: 'monthly' });

    expect(callable).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'paywall_viewed',
        installId: 'install-123',
        params: { plan: 'monthly' },
        authenticatedUserIdPresent: expect.any(Boolean),
        clientContext: expect.objectContaining({
          appVersion: '1.2.3',
          buildNumber: '45',
          country: expect.any(String),
          installId: 'install-123',
          language: expect.any(String),
          platform: expect.any(String),
        }),
      })
    );
    expect(storage.setMock).not.toHaveBeenCalledWith(
      STORAGE_KEYS.analytics.pendingEvents,
      expect.any(Array)
    );
  });

  it('queues failed events and flushes them later', async () => {
    const callable = jest
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ data: { ok: true } });
    const storage = createStorage({ [STORAGE_KEYS.analytics.installId]: 'install-123' });
    const service = new AnalyticsBackendService(storage, createNetwork(), () => callable);

    await service.trackEvent('voice_query_failed', { intent: 'next_shift' });
    const queuedAfterFailure = storage.values.get(STORAGE_KEYS.analytics.pendingEvents);
    expect(Array.isArray(queuedAfterFailure)).toBe(true);
    expect((queuedAfterFailure as unknown[]).length).toBe(1);

    await service.flushQueuedEvents();

    expect(callable).toHaveBeenCalledTimes(2);
    expect(storage.values.get(STORAGE_KEYS.analytics.pendingEvents)).toEqual([]);
  });

  it('drops validation failures instead of retrying forever', async () => {
    const callable = jest
      .fn()
      .mockRejectedValueOnce({ code: 'functions/invalid-argument', message: 'bad event' });
    const storage = createStorage({ [STORAGE_KEYS.analytics.installId]: 'install-123' });
    const service = new AnalyticsBackendService(storage, createNetwork(), () => callable);

    await service.trackEvent('bad_event_name', { value: true });

    expect(storage.values.get(STORAGE_KEYS.analytics.pendingEvents)).toBeUndefined();
  });
});
