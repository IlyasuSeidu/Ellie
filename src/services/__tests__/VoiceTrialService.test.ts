import { voiceTrialService } from '../VoiceTrialService';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { doc, getDoc, setDoc } from '@/services/firebase/firestoreSdk';

jest.mock('@/config/firebase', () => ({
  getFirebaseInstances: () => ({
    firestore: { kind: 'mock-firestore' },
  }),
}));

jest.mock('@/services/firebase/firestoreSdk', () => ({
  doc: jest.fn((...args: unknown[]) => ({ path: args })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
}));

describe('voiceTrialService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await asyncStorageService.clear();
    jest.spyOn(Date, 'now').mockReturnValue(1782187200000);
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    });
    (setDoc as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stores the free voice answer marker per user and syncs Firestore', async () => {
    await voiceTrialService.markUsed('user-123');

    await expect(voiceTrialService.getState('user-123')).resolves.toEqual({
      hasUsedFreeVoiceAnswer: true,
      usedAt: 1782187200000,
    });
    await expect(voiceTrialService.getState('other-user')).resolves.toEqual({
      hasUsedFreeVoiceAnswer: false,
      usedAt: null,
    });

    expect(doc).toHaveBeenCalledWith(
      { kind: 'mock-firestore' },
      'users',
      'user-123',
      'usage',
      'voiceTrial'
    );
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        hasUsedFreeVoiceAnswer: true,
        usedAt: '2026-06-23T04:00:00.000Z',
      }),
      { merge: true }
    );
  });

  it('hydrates local state from Firestore when remote trial is already used', async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        hasUsedFreeVoiceAnswer: true,
        usedAt: '2026-06-23T01:00:00.000Z',
      }),
    });

    await expect(voiceTrialService.getState('user-remote')).resolves.toEqual({
      hasUsedFreeVoiceAnswer: true,
      usedAt: 1782176400000,
    });

    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => false,
      data: () => ({}),
    });

    await expect(voiceTrialService.getState('user-remote')).resolves.toEqual({
      hasUsedFreeVoiceAnswer: true,
      usedAt: 1782176400000,
    });
  });
});
