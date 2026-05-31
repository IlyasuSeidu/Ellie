import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { asyncStorageService } from '@/services/AsyncStorageService';
import { networkService } from '@/services/NetworkService';
import { STORAGE_KEYS } from '@/constants/storageKeys';

const REFRESH_INTERVAL_MS = 10000;

export interface PendingSyncStatus {
  pendingCount: number;
  failedCount: number;
  isOnline: boolean;
}

const countPrefixedKeys = (keys: string[], prefix: string): number =>
  keys.filter((key) => key.startsWith(prefix)).length;

export async function readPendingSyncStatus(): Promise<PendingSyncStatus> {
  const keys = await asyncStorageService.getAllKeys();
  const pendingAnalyticsEvents =
    (await asyncStorageService.get<unknown[]>(STORAGE_KEYS.analytics.pendingEvents)) ?? [];
  const snapshot = networkService.getSnapshot();

  const pendingCount =
    countPrefixedKeys(keys, STORAGE_KEYS.users.pendingMutationPrefix) +
    countPrefixedKeys(keys, STORAGE_KEYS.shiftLogs.pendingPrefix) +
    countPrefixedKeys(keys, STORAGE_KEYS.sessions.pendingPrefix) +
    pendingAnalyticsEvents.length;

  const failedCount =
    countPrefixedKeys(keys, STORAGE_KEYS.users.failedMutationPrefix) +
    countPrefixedKeys(keys, STORAGE_KEYS.shiftLogs.failedPrefix);

  return {
    pendingCount,
    failedCount,
    isOnline: snapshot.status === 'online',
  };
}

export function usePendingSyncStatus(): PendingSyncStatus {
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<PendingSyncStatus>({
    pendingCount: 0,
    failedCount: 0,
    isOnline: networkService.getSnapshot().status === 'online',
  });

  const refresh = useCallback(() => {
    void readPendingSyncStatus().then((nextStatus) => {
      if (mountedRef.current) {
        setStatus(nextStatus);
      }
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const unsubscribeNetwork = networkService.subscribe(() => {
      refresh();
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
      }
    });
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      unsubscribeNetwork();
      appStateSubscription.remove();
      clearInterval(interval);
    };
  }, [refresh]);

  return status;
}
