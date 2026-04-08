import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { SessionService, type SessionMetadata } from '../SessionService';
import type { AsyncStorageService } from '../AsyncStorageService';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  setDoc: jest.fn(),
  where: jest.fn(),
  Timestamp: {
    fromDate: jest.fn((date: Date) => ({
      toDate: () => date,
    })),
  },
}));

jest.mock('@/config/firebase', () => ({
  firestore: {},
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

class MemoryStorage {
  private store = new Map<string, unknown>();

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async get<T>(key: string): Promise<T | null> {
    return this.store.has(key) ? (this.store.get(key) as T) : null;
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe('SessionService runtime offline fallback', () => {
  let storage: MemoryStorage;
  let service: SessionService;
  let metadata: SessionMetadata;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new MemoryStorage();
    metadata = {
      appVersion: '1.0.0',
      platform: 'ios',
      deviceId: 'device-test',
    };

    service = new SessionService(storage as unknown as AsyncStorageService, metadata);

    (collection as jest.Mock).mockReturnValue('sessions-collection');
    (doc as jest.Mock).mockImplementation((_firestore, _collectionName, sessionId) => ({
      id: sessionId,
      ref: { id: sessionId },
    }));
    (query as jest.Mock).mockReturnValue('query-ref');
    (where as jest.Mock).mockReturnValue('where-ref');
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);
  });

  it('loads a locally mirrored session when Firestore read fails', async () => {
    const session = await service.startSession('user-123');
    await service.endSession(session.id);

    (getDoc as jest.Mock).mockRejectedValue(new Error('offline'));

    const loaded = await service.loadSession(session.id);

    expect(loaded?.id).toBe(session.id);
    expect(loaded?.userId).toBe('user-123');
    expect(loaded?.endTime).toBeInstanceOf(Date);
  });

  it('falls back to local sessions for total count when Firestore query fails', async () => {
    const first = await service.startSession('user-123');
    await service.endSession(first.id);
    const second = await service.startSession('user-123');
    await service.endSession(second.id);

    (getDocs as jest.Mock).mockRejectedValue(new Error('offline'));

    const total = await service.getTotalSessions('user-123');

    expect(total).toBe(2);
  });

  it('falls back to locally mirrored ended sessions for average duration when Firestore query fails', async () => {
    const first = await service.startSession('user-123');
    await service.endSession(first.id);
    const second = await service.startSession('user-123');
    await service.endSession(second.id);

    (getDocs as jest.Mock).mockRejectedValue(new Error('offline'));

    const average = await service.getAverageSessionDuration('user-123');

    expect(average).toBeGreaterThanOrEqual(0);
  });

  it('cleans up expired local sessions even when remote cleanup fails', async () => {
    const session = await service.startSession('user-123');
    await service.endSession(session.id);

    const sessionKey = `${STORAGE_KEYS.sessions.recordPrefix}${session.id}`;
    const stored = await storage.get<{
      startTime: string;
      userId: string;
      id: string;
      lastActivityTime: string;
      metadata: SessionMetadata;
      events: unknown[];
      endTime?: string;
    }>(sessionKey);

    expect(stored).not.toBeNull();

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 31);

    await storage.set(sessionKey, {
      ...stored!,
      startTime: oldDate.toISOString(),
    });

    (getDocs as jest.Mock).mockRejectedValue(new Error('offline'));

    await service.cleanupOldSessions('user-123');

    const remaining = await service.loadSession(session.id);
    expect(remaining).toBeNull();
  });

  it('mirrors remote sessions back to local storage after a successful query', async () => {
    const remoteSessionDate = new Date('2026-04-08T08:00:00.000Z');
    (getDocs as jest.Mock).mockResolvedValue({
      size: 1,
      empty: false,
      docs: [
        {
          id: 'remote-session',
          data: () => ({
            userId: 'user-123',
            startTime: Timestamp.fromDate(remoteSessionDate),
            endTime: Timestamp.fromDate(new Date('2026-04-08T09:00:00.000Z')),
            lastActivityTime: Timestamp.fromDate(new Date('2026-04-08T09:00:00.000Z')),
            events: [],
            metadata,
          }),
        },
      ],
    });

    const total = await service.getTotalSessions('user-123');

    expect(total).toBe(1);
    expect(await service.loadSession('remote-session')).toEqual(
      expect.objectContaining({
        id: 'remote-session',
        userId: 'user-123',
      })
    );
  });
});
