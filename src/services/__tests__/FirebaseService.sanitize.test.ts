jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  getDocs: jest.fn(),
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

import { getFirestore, collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { FirebaseService } from '@/services/firebase/FirebaseService';

describe('FirebaseService payload sanitization', () => {
  let service: FirebaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    (getFirestore as jest.Mock).mockReturnValue({});
    (getAuth as jest.Mock).mockReturnValue({});
    (collection as jest.Mock).mockReturnValue('collection-ref');
    (doc as jest.Mock).mockReturnValue({ id: 'doc-1' });
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
});
