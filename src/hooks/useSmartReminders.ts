import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { ShiftDataService } from '@/services/ShiftDataService';
import { SmartReminderOrchestrator } from '@/services/SmartReminderOrchestrator';
import {
  resolveReminderUserId,
  smartReminderSettingsService,
} from '@/services/SmartReminderSettingsService';
import { getStorageService } from '@/services/StorageService';
import { notificationService } from '@/services/NotificationService';
import { buildShiftCycle } from '@/utils/shiftUtils';
import { logger } from '@/utils/logger';
import { type SmartReminderSettings } from '@/types/reminders';

const shiftDataService = new ShiftDataService(getStorageService());
const orchestrator = new SmartReminderOrchestrator(shiftDataService);

function buildReminderFingerprint(
  onboardingData: ReturnType<typeof useOnboarding>['data'],
  language: string,
  settings: SmartReminderSettings,
  userId: string,
  timeZone: string
): string {
  return JSON.stringify({
    userId,
    timeZone,
    language,
    settings,
    name: onboardingData.name ?? null,
    shiftSystem: onboardingData.shiftSystem ?? null,
    rosterType: onboardingData.rosterType ?? null,
    patternType: onboardingData.patternType ?? null,
    startDate:
      onboardingData.startDate instanceof Date
        ? onboardingData.startDate.toISOString()
        : (onboardingData.startDate ?? null),
    phaseOffset: onboardingData.phaseOffset ?? null,
    customPattern: onboardingData.customPattern ?? null,
    fifoConfig: onboardingData.fifoConfig ?? null,
    shiftTimes: onboardingData.shiftTimes ?? null,
  });
}

export function useSmartReminders(): void {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { data: onboardingData } = useOnboarding();
  const lastSuccessfulFingerprintRef = useRef<string | null>(null);
  const lastScheduledUserIdRef = useRef<string | null>(null);
  const isRunningRef = useRef(false);

  const run = useCallback(async () => {
    const currentUserId = await resolveReminderUserId(user?.uid);
    const currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    if (lastScheduledUserIdRef.current && lastScheduledUserIdRef.current !== currentUserId) {
      await notificationService.cancelSmartReminders(lastScheduledUserIdRef.current);
      lastSuccessfulFingerprintRef.current = null;
      lastScheduledUserIdRef.current = null;
    }

    if (!onboardingData?.startDate || !onboardingData?.patternType) {
      if (lastScheduledUserIdRef.current === currentUserId) {
        await notificationService.cancelSmartReminders(currentUserId);
      }
      lastSuccessfulFingerprintRef.current = null;
      lastScheduledUserIdRef.current = null;
      return;
    }

    const shiftCycle = buildShiftCycle(onboardingData);
    if (!shiftCycle) {
      if (lastScheduledUserIdRef.current === currentUserId) {
        await notificationService.cancelSmartReminders(currentUserId);
      }
      lastSuccessfulFingerprintRef.current = null;
      lastScheduledUserIdRef.current = null;
      return;
    }

    const hasPermission = await notificationService.checkPermissions();
    if (!hasPermission) {
      logger.debug('useSmartReminders: notification permission not granted; skipping schedule');
      if (lastScheduledUserIdRef.current === currentUserId) {
        await notificationService.cancelSmartReminders(currentUserId);
      }
      lastSuccessfulFingerprintRef.current = null;
      lastScheduledUserIdRef.current = null;
      return;
    }

    const settings = await smartReminderSettingsService.load(user?.uid);
    const fingerprint = buildReminderFingerprint(
      onboardingData,
      language,
      settings,
      currentUserId,
      currentTimeZone
    );
    if (fingerprint === lastSuccessfulFingerprintRef.current || isRunningRef.current) {
      return;
    }

    isRunningRef.current = true;

    try {
      await orchestrator.reschedule({
        userId: currentUserId,
        userName: onboardingData.name ?? '',
        shiftCycle,
        shiftTimes: onboardingData.shiftTimes,
        settings,
        language,
      });

      lastSuccessfulFingerprintRef.current = fingerprint;
      lastScheduledUserIdRef.current = currentUserId;
    } catch (error) {
      logger.error('useSmartReminders: failed to reschedule reminders', error as Error);
    } finally {
      isRunningRef.current = false;
    }
  }, [language, onboardingData, user?.uid]);

  useEffect(() => {
    void run();
  }, [run]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void run();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [run]);
}
