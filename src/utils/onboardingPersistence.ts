import { z } from 'zod';
import { ShiftPattern } from '@/types';
import { asyncStorageService, type AsyncStorageService } from '@/services/AsyncStorageService';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { migrateOnboardingDataToV2 } from '@/utils/migrationUtils';
import { parseCalendarDate } from '@/utils/dateUtils';

const durationSchema = z.union([z.literal(8), z.literal(12)]);

const shiftTimeSchema = z
  .object({
    startTime: z.string(),
    endTime: z.string(),
    duration: durationSchema,
  })
  .strict();

const customPatternSchema = z
  .object({
    daysOn: z.number().int().nonnegative(),
    nightsOn: z.number().int().nonnegative(),
    morningOn: z.number().int().nonnegative().optional(),
    afternoonOn: z.number().int().nonnegative().optional(),
    nightOn: z.number().int().nonnegative().optional(),
    daysOff: z.number().int().nonnegative(),
  })
  .strict();

const fifoConfigSchema = z
  .object({
    workBlockDays: z.number().int().positive(),
    restBlockDays: z.number().int().positive(),
    workBlockPattern: z.enum(['straight-days', 'straight-nights', 'swing', 'custom']),
    swingPattern: z
      .object({
        daysOnDayShift: z.number().int().nonnegative(),
        daysOnNightShift: z.number().int().nonnegative(),
      })
      .strict()
      .optional(),
    customWorkSequence: z.array(z.string()).optional(),
    flyInDay: z.number().int().positive().optional(),
    flyOutDay: z.number().int().positive().optional(),
    siteName: z.string().optional(),
  })
  .strict();

const shiftTimesSchema = z
  .object({
    dayShift: shiftTimeSchema.optional(),
    nightShift: shiftTimeSchema.optional(),
    morningShift: shiftTimeSchema.optional(),
    afternoonShift: shiftTimeSchema.optional(),
    nightShift3: shiftTimeSchema.optional(),
  })
  .strict();

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
    shiftSystem: z.enum(['2-shift', '3-shift']).optional(),
    rosterType: z.enum(['rotating', 'fifo']).optional(),
    patternType: z.nativeEnum(ShiftPattern).optional(),
    customPattern: customPatternSchema.optional(),
    fifoConfig: fifoConfigSchema.optional(),
    phaseOffset: z.number().int().optional(),
    startDate: z
      .preprocess((value) => {
        if (!value) return undefined;
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
          return value;
        }
        if (typeof value === 'string') {
          const parsed = parseCalendarDate(value);
          if (parsed && !Number.isNaN(parsed.getTime())) {
            return parsed;
          }
        }
        return undefined;
      }, z.date().optional())
      .optional(),
    shiftTimes: shiftTimesSchema.optional(),
    shiftStartTime: z.string().optional(),
    shiftEndTime: z.string().optional(),
    shiftDuration: durationSchema.optional(),
    shiftType: z.enum(['day', 'night', 'morning', 'afternoon']).optional(),
    isCustomShiftTime: z.boolean().optional(),
  })
  .strip();

export type PersistedOnboardingData = z.infer<typeof onboardingDataSchema>;

function hasShiftTimeData(data: PersistedOnboardingData): boolean {
  const hasNewShiftTimes =
    data.shiftTimes !== undefined &&
    Object.values(data.shiftTimes).some((value) => value !== undefined);

  return Boolean(hasNewShiftTimes || (data.shiftStartTime && data.shiftEndTime));
}

function hasRequiredFifoConfig(data: PersistedOnboardingData): boolean {
  if (data.rosterType !== 'fifo') {
    return true;
  }

  return Boolean(
    data.fifoConfig?.workBlockDays &&
    data.fifoConfig?.restBlockDays &&
    data.fifoConfig?.workBlockPattern
  );
}

function hasRequiredCustomPattern(data: PersistedOnboardingData): boolean {
  if (data.rosterType === 'fifo') {
    return true;
  }

  if (data.patternType !== ShiftPattern.CUSTOM) {
    return true;
  }

  return Boolean(data.customPattern);
}

export function sanitizePersistedOnboardingData(raw: unknown): PersistedOnboardingData | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const migrated = migrateOnboardingDataToV2(raw as Record<string, unknown>);
  const parsed = onboardingDataSchema.safeParse(migrated);

  if (!parsed.success) {
    return null;
  }

  return parsed.data;
}

export function isPersistedOnboardingComplete(data: PersistedOnboardingData | null): boolean {
  if (!data) {
    return false;
  }

  return Boolean(
    data.shiftSystem &&
    data.patternType &&
    data.phaseOffset !== undefined &&
    data.startDate &&
    hasShiftTimeData(data) &&
    hasRequiredFifoConfig(data) &&
    hasRequiredCustomPattern(data)
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
