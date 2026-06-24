import { STORAGE_KEYS } from '@/constants/storageKeys';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { getFirebaseInstances } from '@/config/firebase';
import { doc, getDoc, setDoc } from '@/services/firebase/firestoreSdk';
import { logger } from '@/utils/logger';

export interface VoiceTrialState {
  hasUsedFreeVoiceAnswer: boolean;
  usedAt: number | null;
}

const VOICE_TRIAL_DOCUMENT_PATH = ['usage', 'voiceTrial'] as const;

function getLocalVoiceTrialKey(userId?: string | null): string {
  const scope = typeof userId === 'string' && userId.trim() ? userId.trim() : 'anonymous';
  return `${STORAGE_KEYS.appState.voiceTrialUsedAt}:${scope}`;
}

function normalizeUsedAt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    const time = date.getTime();
    return Number.isFinite(time) && time > 0 ? time : null;
  }

  return null;
}

async function readLocalState(userId?: string | null): Promise<VoiceTrialState> {
  const usedAt = await asyncStorageService.get<number>(getLocalVoiceTrialKey(userId));
  const normalizedUsedAt = normalizeUsedAt(usedAt);
  return {
    hasUsedFreeVoiceAnswer: normalizedUsedAt !== null,
    usedAt: normalizedUsedAt,
  };
}

async function writeLocalState(userId: string | null | undefined, usedAt: number): Promise<void> {
  await asyncStorageService.set(getLocalVoiceTrialKey(userId), usedAt);
}

async function readRemoteState(userId: string): Promise<VoiceTrialState | null> {
  try {
    const { firestore } = getFirebaseInstances();
    const ref = doc(firestore, 'users', userId, ...VOICE_TRIAL_DOCUMENT_PATH);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data() as {
      hasUsedFreeVoiceAnswer?: unknown;
      usedAt?: unknown;
    };
    const usedAt = normalizeUsedAt(data.usedAt);
    return {
      hasUsedFreeVoiceAnswer: data.hasUsedFreeVoiceAnswer === true || usedAt !== null,
      usedAt,
    };
  } catch (error) {
    logger.warn('VoiceTrialService: remote voice trial read failed', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
    return null;
  }
}

async function writeRemoteState(userId: string, usedAt: number): Promise<void> {
  try {
    const { firestore } = getFirebaseInstances();
    const ref = doc(firestore, 'users', userId, ...VOICE_TRIAL_DOCUMENT_PATH);
    const usedAtIso = new Date(usedAt).toISOString();
    await setDoc(
      ref,
      {
        hasUsedFreeVoiceAnswer: true,
        usedAt: usedAtIso,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    logger.warn('VoiceTrialService: remote voice trial write failed', {
      error: error instanceof Error ? error.message : String(error),
      userId,
    });
  }
}

export const voiceTrialService = {
  async getState(userId?: string | null): Promise<VoiceTrialState> {
    const localState = await readLocalState(userId);
    if (!userId) {
      return localState;
    }

    const remoteState = await readRemoteState(userId);
    if (!remoteState?.hasUsedFreeVoiceAnswer) {
      return localState;
    }

    const usedAt = remoteState.usedAt ?? localState.usedAt ?? Date.now();
    if (!localState.hasUsedFreeVoiceAnswer) {
      await writeLocalState(userId, usedAt);
    }

    return {
      hasUsedFreeVoiceAnswer: true,
      usedAt,
    };
  },

  async markUsed(userId?: string | null, usedAt: number = Date.now()): Promise<VoiceTrialState> {
    await writeLocalState(userId, usedAt);

    if (userId) {
      void writeRemoteState(userId, usedAt);
    }

    return {
      hasUsedFreeVoiceAnswer: true,
      usedAt,
    };
  },
};
