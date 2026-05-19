import { Platform } from 'react-native';
import { appConfig } from '@/config/env';
import { getCloudFunctions, getFirebaseAuth } from '@/config/firebase';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { asyncStorageService, type AsyncStorageService } from '@/services/AsyncStorageService';
import type { NetworkService } from '@/services/NetworkService';
import { logger } from '@/utils/logger';

export type AnalyticsBackendPrimitive = string | number | boolean | null;
export type AnalyticsBackendPayload = Record<
  string,
  AnalyticsBackendPrimitive | AnalyticsBackendPrimitive[] | undefined
>;

interface AnalyticsBackendClientContext {
  appVersion: string;
  buildNumber: string;
  country: string;
  installId: string;
  language: string;
  localDateKey: string;
  localTime: string;
  osVersion: string;
  platform: string;
  sessionId: string;
  timeZone: string;
  timezoneOffsetMinutes: number;
}

interface AnalyticsBackendEventRequest {
  eventName: string;
  params?: AnalyticsBackendPayload;
  clientContext: AnalyticsBackendClientContext;
  installId: string;
  occurredAtMs: number;
}

interface QueuedAnalyticsEvent extends AnalyticsBackendEventRequest {
  queueId: string;
  queuedAtMs: number;
  attempts: number;
}

type CallableResult = { data?: unknown };
type CallableFunction = (payload: unknown) => Promise<CallableResult>;
type AnalyticsCallableFactory = () => CallableFunction;

type FirebaseFunctionsRuntime = {
  httpsCallable: (
    functions: ReturnType<typeof getCloudFunctions>,
    name: string
  ) => CallableFunction;
};

const MAX_QUEUE_SIZE = 200;
const FLUSH_BATCH_SIZE = 25;
const MAX_ATTEMPTS = 10;
const CALL_TIMEOUT_MS = 8000;

function getFirebaseFunctionsRuntime(): FirebaseFunctionsRuntime {
  // Lazy require keeps Jest and native module fallback paths from importing ESM at module load.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  return require('firebase/functions') as FirebaseFunctionsRuntime;
}

function getDefaultNetworkService(): Pick<NetworkService, 'subscribe'> {
  // Lazy require prevents analytics module imports from starting NetInfo during Jest.
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  return require('@/services/NetworkService').networkService as Pick<NetworkService, 'subscribe'>;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

function createLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${randomSuffix()}`;
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getLocalTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
  } catch {
    return 'unknown';
  }
}

function getLocaleContext(): { language: string; country: string } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const localization = require('expo-localization') as {
      getLocales?: () => { languageTag?: string; languageCode?: string; regionCode?: string }[];
      locale?: string;
      region?: string;
    };
    const firstLocale = localization.getLocales?.()[0];
    return {
      language:
        firstLocale?.languageTag ?? firstLocale?.languageCode ?? localization.locale ?? 'unknown',
      country: firstLocale?.regionCode ?? localization.region ?? 'unknown',
    };
  } catch {
    return { language: 'unknown', country: 'unknown' };
  }
}

function getOsVersion(): string {
  const version = Platform.Version;
  return typeof version === 'string' || typeof version === 'number' ? String(version) : 'unknown';
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Analytics backend request timed out')),
      timeoutMs
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function shouldDropFailedEvent(error: unknown): boolean {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  return ['functions/invalid-argument', 'invalid-argument', 'functions/permission-denied'].includes(
    code
  );
}

export class AnalyticsBackendService {
  private sessionId = createLocalId('analytics-session');
  private flushing = false;
  private callable: CallableFunction | null = null;

  constructor(
    private readonly storage: Pick<AsyncStorageService, 'get' | 'set'> = asyncStorageService,
    private readonly network?: Pick<NetworkService, 'subscribe'>,
    private readonly callableFactory?: AnalyticsCallableFactory
  ) {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    (this.network ?? getDefaultNetworkService()).subscribe((snapshot) => {
      if (snapshot.status === 'online') {
        void this.flushQueuedEvents();
      }
    });
  }

  async trackEvent(eventName: string, params?: AnalyticsBackendPayload): Promise<void> {
    const event = await this.buildEvent(eventName, params);
    try {
      await this.sendEvent(event);
      void this.flushQueuedEvents();
    } catch (error) {
      if (shouldDropFailedEvent(error)) {
        logger.warn('AnalyticsBackendService: dropping rejected analytics event', {
          eventName,
          error: error instanceof Error ? error.message : String(error),
        });
        return;
      }
      await this.enqueueEvent({
        ...event,
        queueId: createLocalId('analytics-event'),
        queuedAtMs: Date.now(),
        attempts: 0,
      });
    }
  }

  async flushQueuedEvents(): Promise<void> {
    if (this.flushing) {
      return;
    }

    this.flushing = true;
    try {
      const queue = await this.readQueue();
      if (queue.length === 0) {
        return;
      }

      const remaining: QueuedAnalyticsEvent[] = [];
      const batch = queue.slice(0, FLUSH_BATCH_SIZE);
      const deferred = queue.slice(FLUSH_BATCH_SIZE);

      for (const queuedEvent of batch) {
        try {
          await this.sendEvent(queuedEvent);
        } catch (error) {
          if (!shouldDropFailedEvent(error) && queuedEvent.attempts + 1 < MAX_ATTEMPTS) {
            remaining.push({ ...queuedEvent, attempts: queuedEvent.attempts + 1 });
          }
        }
      }

      await this.writeQueue([...remaining, ...deferred].slice(-MAX_QUEUE_SIZE));
    } catch (error) {
      logger.warn('AnalyticsBackendService: failed to flush queued analytics events', {
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.flushing = false;
    }
  }

  private async buildEvent(
    eventName: string,
    params?: AnalyticsBackendPayload
  ): Promise<AnalyticsBackendEventRequest> {
    const now = new Date();
    const installId = await this.getOrCreateInstallId();
    const locale = getLocaleContext();
    return {
      eventName,
      params,
      installId,
      occurredAtMs: now.getTime(),
      clientContext: {
        appVersion: appConfig.version,
        buildNumber: appConfig.buildNumber,
        country: locale.country,
        installId,
        language: locale.language,
        localDateKey: getLocalDateKey(now),
        localTime: getLocalTime(now),
        osVersion: getOsVersion(),
        platform: Platform.OS,
        sessionId: this.sessionId,
        timeZone: getTimeZone(),
        timezoneOffsetMinutes: now.getTimezoneOffset(),
      },
    };
  }

  private async getOrCreateInstallId(): Promise<string> {
    const existing = await this.storage.get<string>(STORAGE_KEYS.analytics.installId);
    if (typeof existing === 'string' && existing.trim().length > 0) {
      return existing.trim();
    }

    const generated = createLocalId('analytics-install');
    await this.storage.set(STORAGE_KEYS.analytics.installId, generated);
    return generated;
  }

  private getCallable(): CallableFunction {
    if (this.callable) {
      return this.callable;
    }

    this.callable =
      this.callableFactory?.() ??
      getFirebaseFunctionsRuntime().httpsCallable(getCloudFunctions(), 'trackAnalyticsEvent');
    return this.callable;
  }

  private async sendEvent(event: AnalyticsBackendEventRequest): Promise<void> {
    const currentUser = (() => {
      try {
        return getFirebaseAuth().currentUser?.uid ?? null;
      } catch {
        return null;
      }
    })();

    await withTimeout(
      this.getCallable()({
        ...event,
        authenticatedUserIdPresent: Boolean(currentUser),
      }),
      CALL_TIMEOUT_MS
    );
  }

  private async enqueueEvent(event: QueuedAnalyticsEvent): Promise<void> {
    const queue = await this.readQueue();
    await this.writeQueue([...queue, event].slice(-MAX_QUEUE_SIZE));
  }

  private async readQueue(): Promise<QueuedAnalyticsEvent[]> {
    const stored = await this.storage.get<QueuedAnalyticsEvent[]>(
      STORAGE_KEYS.analytics.pendingEvents
    );
    return Array.isArray(stored) ? stored : [];
  }

  private async writeQueue(queue: QueuedAnalyticsEvent[]): Promise<void> {
    await this.storage.set(STORAGE_KEYS.analytics.pendingEvents, queue);
  }
}

export const analyticsBackendService = new AnalyticsBackendService();
