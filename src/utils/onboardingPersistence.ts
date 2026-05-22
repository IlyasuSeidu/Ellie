import { z } from 'zod';
import { asyncStorageService, type AsyncStorageService } from '@/services/AsyncStorageService';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { universalShiftScheduleSchema } from '@/types/validation';

const onboardingDataSchema = z
  .object({
    painPoint: z
      .enum(['cycle_lost', 'wrong_alarm', 'days_off', 'family', 'mental_math'])
      .optional(),
    name: z.string().optional(),
    occupation: z.string().optional(),
    company: z.string().optional(),
    country: z.string().optional(),
    avatarUri: z.string().optional(),
    universalSchedule: universalShiftScheduleSchema.optional(),
  })
  .strip();

export type PersistedOnboardingData = z.infer<typeof onboardingDataSchema>;

export function sanitizePersistedOnboardingData(raw: unknown): PersistedOnboardingData | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const parsed = onboardingDataSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function isPersistedOnboardingComplete(data: PersistedOnboardingData | null): boolean {
  return Boolean(
    data?.universalSchedule?.name &&
    data.universalSchedule.anchorDate &&
    data.universalSchedule.sequence?.length &&
    data.universalSchedule.shiftDefinitions?.length
  );
}

export async function loadPersistedOnboardingData(
  storage: Pick<AsyncStorageService, 'get'> = asyncStorageService
): Promise<PersistedOnboardingData | null> {
  const raw = await storage.get<unknown>(STORAGE_KEYS.onboarding.data);
  return sanitizePersistedOnboardingData(raw);
}

export async function persistOnboardingData(
  data: PersistedOnboardingData,
  storage: Pick<AsyncStorageService, 'set'> = asyncStorageService
): Promise<void> {
  await storage.set(STORAGE_KEYS.onboarding.data, data);
}

export async function clearPersistedOnboardingData(
  storage: Pick<AsyncStorageService, 'set'> = asyncStorageService
): Promise<void> {
  await storage.set(STORAGE_KEYS.onboarding.data, {});
}

export async function setPersistedOnboardingComplete(
  complete: boolean,
  storage: Pick<AsyncStorageService, 'set'> = asyncStorageService
): Promise<void> {
  await storage.set(STORAGE_KEYS.onboarding.complete, complete);
}

export async function readPersistedOnboardingCompletionStatus(
  storage: Pick<AsyncStorageService, 'get' | 'set'> = asyncStorageService
): Promise<boolean> {
  const completionFlag = await storage.get<boolean>(STORAGE_KEYS.onboarding.complete);
  const savedData = await loadPersistedOnboardingData(storage);
  const isCompleteFromData = isPersistedOnboardingComplete(savedData);

  if (completionFlag === true && isCompleteFromData) {
    return true;
  }

  if (completionFlag === true && !isCompleteFromData) {
    await storage.set(STORAGE_KEYS.onboarding.complete, false);
    return false;
  }

  if (isCompleteFromData) {
    await storage.set(STORAGE_KEYS.onboarding.complete, true);
    return true;
  }

  return false;
}
