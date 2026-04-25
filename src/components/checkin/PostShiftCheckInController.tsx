import React, { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOnboardingOptional } from '@/contexts/OnboardingContext';
import { networkService } from '@/services/NetworkService';
import { shiftLogService } from '@/services/ShiftLogService';
import { logger } from '@/utils/logger';
import { ShiftCheckInModal } from './ShiftCheckInModal';
import type { ShiftType } from '@/types';

export interface PostShiftCheckInRequest {
  shiftDate: string;
  shiftType: ShiftType;
}

function isShiftType(value: unknown): value is ShiftType {
  return (
    value === 'day' ||
    value === 'night' ||
    value === 'morning' ||
    value === 'afternoon' ||
    value === 'off'
  );
}

export function parsePostShiftCheckInRequest(
  response: Pick<NotificationResponse, 'notification'>
): PostShiftCheckInRequest | null {
  const data = response.notification.request.content.data ?? {};
  const reminderType = data.reminderType;
  const shiftDate = data.shiftDate;
  const shiftType = data.shiftType;

  if (reminderType !== 'POST_SHIFT_CHECKIN') {
    return null;
  }

  if (typeof shiftDate !== 'string' || !isShiftType(shiftType)) {
    return null;
  }

  return {
    shiftDate,
    shiftType,
  };
}

export const PostShiftCheckInController: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const onboarding = useOnboardingOptional();
  const [request, setRequest] = useState<PostShiftCheckInRequest | null>(null);

  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      try {
        const lastResponse = await Notifications.getLastNotificationResponseAsync();
        if (!mounted || !lastResponse) {
          return;
        }

        const parsed = parsePostShiftCheckInRequest(lastResponse);
        if (parsed) {
          setRequest(parsed);
        }

        await Notifications.clearLastNotificationResponseAsync();
      } catch (error) {
        logger.warn('PostShiftCheckInController: failed to hydrate last notification response', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };

    void hydrate();

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const parsed = parsePostShiftCheckInRequest(response);
      if (!parsed) {
        return;
      }

      setRequest(parsed);
      void Notifications.clearLastNotificationResponseAsync().catch((error) => {
        logger.warn('PostShiftCheckInController: failed to clear handled notification response', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      return undefined;
    }

    const syncPendingLogs = () => {
      void shiftLogService.syncPendingLogs(user.uid);
    };

    syncPendingLogs();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncPendingLogs();
      }
    });
    const unsubscribeNetwork = networkService.subscribe((snapshot) => {
      if (snapshot.status === 'online') {
        syncPendingLogs();
      }
    });

    return () => {
      subscription.remove();
      unsubscribeNetwork();
    };
  }, [user?.uid]);

  const visible = useMemo(() => Boolean(request && user?.uid), [request, user?.uid]);

  if (!request || !user?.uid) {
    return null;
  }

  return (
    <ShiftCheckInModal
      visible={visible}
      userId={user.uid}
      firebaseUid={user.uid}
      shiftDate={request.shiftDate}
      shiftType={request.shiftType}
      onboardingData={onboarding?.data}
      language={language}
      onDismiss={() => setRequest(null)}
    />
  );
};
