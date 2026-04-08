import type { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import { logger } from '@/utils/logger';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

export interface NetworkSnapshot {
  status: NetworkStatus;
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: NetInfoStateType | 'unknown';
  updatedAt: number;
}

export type ConnectionQuality = 'fast' | 'slow' | 'offline' | 'unknown';

export type NetworkListener = (snapshot: NetworkSnapshot) => void;

interface NetInfoRuntime {
  addEventListener(listener: (state: NetInfoState) => void): () => void;
  fetch(): Promise<NetInfoState>;
}

const UNKNOWN_SNAPSHOT: NetworkSnapshot = {
  status: 'unknown',
  isConnected: false,
  isInternetReachable: null,
  type: 'unknown',
  updatedAt: Date.now(),
};

function deriveSnapshot(state: NetInfoState | null | undefined): NetworkSnapshot {
  if (!state) {
    return {
      ...UNKNOWN_SNAPSHOT,
      updatedAt: Date.now(),
    };
  }

  const isConnected = state.isConnected === true;
  const isInternetReachable =
    typeof state.isInternetReachable === 'boolean' ? state.isInternetReachable : null;

  let status: NetworkStatus = 'unknown';
  if (!isConnected) {
    status = 'offline';
  } else if (isInternetReachable === true) {
    status = 'online';
  } else if (isInternetReachable === false) {
    status = 'offline';
  }

  return {
    status,
    isConnected,
    isInternetReachable,
    type: state.type ?? 'unknown',
    updatedAt: Date.now(),
  };
}

let cachedNetInfoRuntime: NetInfoRuntime | null | undefined;

function resolveNetInfoRuntime(): NetInfoRuntime | null {
  if (cachedNetInfoRuntime !== undefined) {
    return cachedNetInfoRuntime;
  }

  try {
    // Lazy require so a missing native module does not crash the whole app at import time.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const module = require('@react-native-community/netinfo');
    const runtime = (module?.default ?? module) as Partial<NetInfoRuntime> | undefined;

    if (
      runtime &&
      typeof runtime.addEventListener === 'function' &&
      typeof runtime.fetch === 'function'
    ) {
      cachedNetInfoRuntime = runtime as NetInfoRuntime;
      return cachedNetInfoRuntime;
    }
  } catch (error) {
    logger.warn(
      'NetworkService: NetInfo native module unavailable; falling back to unknown state',
      {
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }

  cachedNetInfoRuntime = null;
  return null;
}

export class NetworkService {
  private snapshot: NetworkSnapshot = UNKNOWN_SNAPSHOT;
  private lastState: NetInfoState | null = null;
  private listeners = new Set<NetworkListener>();
  private unsubscribeNetInfo: (() => void) | null = null;
  private appStateSubscription: NativeEventSubscription | null = null;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;

    try {
      const netInfo = resolveNetInfoRuntime();
      if (netInfo) {
        this.unsubscribeNetInfo = netInfo.addEventListener((state) => {
          this.applyState(state);
        });
        void this.refresh();
      } else {
        this.setSnapshot({
          ...UNKNOWN_SNAPSHOT,
          updatedAt: Date.now(),
        });
      }
      this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
    } catch (error) {
      logger.warn('NetworkService: failed to initialize NetInfo listener', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  stop(): void {
    this.unsubscribeNetInfo?.();
    this.unsubscribeNetInfo = null;
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.started = false;
  }

  subscribe(listener: NetworkListener): () => void {
    this.start();
    this.listeners.add(listener);
    listener(this.snapshot);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): NetworkSnapshot {
    this.start();
    return this.snapshot;
  }

  isOnline(): boolean {
    return this.getSnapshot().status === 'online';
  }

  getConnectionQuality(): ConnectionQuality {
    const snapshot = this.getSnapshot();
    if (snapshot.status === 'offline') return 'offline';
    if (snapshot.status === 'unknown') return 'unknown';

    if (this.lastState?.type === 'cellular') {
      const details = this.lastState.details;
      const generation =
        details &&
        typeof details === 'object' &&
        'cellularGeneration' in details &&
        typeof details.cellularGeneration === 'string'
          ? details.cellularGeneration
          : null;

      if (generation === '2g' || generation === '3g') {
        return 'slow';
      }
    }

    return 'fast';
  }

  async refresh(): Promise<NetworkSnapshot> {
    this.start();
    const netInfo = resolveNetInfoRuntime();
    if (!netInfo) {
      const snapshot = {
        ...UNKNOWN_SNAPSHOT,
        updatedAt: Date.now(),
      } satisfies NetworkSnapshot;
      this.setSnapshot(snapshot);
      return snapshot;
    }

    try {
      const state = await netInfo.fetch();
      return this.applyState(state);
    } catch (error) {
      logger.warn('NetworkService: failed to refresh network state', {
        error: error instanceof Error ? error.message : String(error),
      });
      const snapshot = {
        ...this.snapshot,
        status: this.snapshot.status === 'online' ? 'online' : 'offline',
        updatedAt: Date.now(),
      } satisfies NetworkSnapshot;
      this.setSnapshot(snapshot);
      return snapshot;
    }
  }

  private handleAppStateChange = (nextState: AppStateStatus): void => {
    if (nextState === 'active') {
      void this.refresh();
    }
  };

  private applyState(state: NetInfoState | null | undefined): NetworkSnapshot {
    this.lastState = state ?? null;
    const snapshot = deriveSnapshot(state);
    this.setSnapshot(snapshot);
    return snapshot;
  }

  private setSnapshot(snapshot: NetworkSnapshot): void {
    const changed =
      snapshot.status !== this.snapshot.status ||
      snapshot.isConnected !== this.snapshot.isConnected ||
      snapshot.isInternetReachable !== this.snapshot.isInternetReachable ||
      snapshot.type !== this.snapshot.type;

    this.snapshot = snapshot;

    if (!changed) return;
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export const networkService = new NetworkService();
networkService.start();
