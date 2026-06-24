jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocFromCache: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  getDocs: jest.fn(),
  getDocsFromCache: jest.fn(),
  onSnapshot: jest.fn(),
}));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
}));
jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('@/services/AsyncStorageService', () => ({
  asyncStorageService: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
  },
}));
jest.mock('@/utils/reliableRetry', () => ({
  retry: jest.fn((fn) => fn()),
  criticalRetryOptions: {},
}));

import { getFirestore, collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { FirebaseService } from '@/services/firebase/FirebaseService';
import { logger } from '@/utils/logger';

describe('FirebaseService payload sanitization', () => {
  let service: FirebaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    (getFirestore as jest.Mock).mockReturnValue({});
    (getAuth as jest.Mock).mockReturnValue({});
    (collection as jest.Mock).mockReturnValue('collection-ref');
    (doc as jest.Mock).mockReturnValue({ id: 'doc-1' });
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      id: 'doc-1',
      data: () => ({ name: 'Shift' }),
    });
    (setDoc as jest.Mock).mockResolvedValue(undefined);
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
    jest.mocked(asyncStorageService.get).mockResolvedValue(null);
    jest.mocked(asyncStorageService.set).mockResolvedValue(undefined);
    jest.mocked(asyncStorageService.remove).mockResolvedValue(undefined);

    service = new FirebaseService();
  });

  it('strips undefined fields before create', async () => {
    await service['create']('shiftLogs', {
      userId: 'user-1',
      notes: undefined,
      nested: {
        ok: true,
        missing: undefined,
      },
    });

    expect(setDoc).toHaveBeenCalledWith(
      { id: 'doc-1' },
      expect.objectContaining({
        userId: 'user-1',
        nested: { ok: true },
      }),
      undefined
    );

    const payload = (setDoc as jest.Mock).mock.calls[0][1];
    expect(payload).not.toHaveProperty('notes');
  });

  it('strips undefined fields before update', async () => {
    await service['update']('shiftLogs', 'doc-1', {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notes: undefined as any,
      status: 'pending',
    });

    const payload = (updateDoc as jest.Mock).mock.calls[0][1];
    expect(payload).toEqual(
      expect.objectContaining({
        status: 'pending',
      })
    );
    expect(payload).not.toHaveProperty('notes');
  });

  it('treats native firestore unavailable reads as transient network warnings', async () => {
    (getDoc as jest.Mock).mockRejectedValueOnce({
      name: 'NativeFirebaseError',
      code: 'firestore/unavailable',
      message:
        '[firestore/unavailable] The service is currently unavailable. This is most likely transient.',
      stack: 'stack',
    });

    await expect(service['read']('users', 'user-1')).rejects.toMatchObject({
      code: 'FIRESTORE_UNAVAILABLE',
    });

    expect(logger.error).not.toHaveBeenCalledWith(
      'Firestore read error',
      expect.anything(),
      expect.anything()
    );
  });

  it('serves cached data when a transient Firestore read fails', async () => {
    (getDoc as jest.Mock).mockRejectedValueOnce({
      name: 'NativeFirebaseError',
      code: 'firestore/unavailable',
      message: '[firestore/unavailable] The service is currently unavailable.',
    });
    jest.mocked(asyncStorageService.get).mockResolvedValueOnce({
      id: 'user-1',
      name: 'Cached User',
    });

    const result = await service['read']('users', 'user-1');

    expect(result).toEqual({
      id: 'user-1',
      name: 'Cached User',
    });
    expect(logger.warn).toHaveBeenCalledWith(
      'Falling back to cached document after transient Firestore read failure',
      expect.objectContaining({
        collection: 'users',
        docId: 'user-1',
      })
    );
    expect(logger.error).not.toHaveBeenCalledWith(
      'Firestore read error',
      expect.anything(),
      expect.anything()
    );
  });
});
