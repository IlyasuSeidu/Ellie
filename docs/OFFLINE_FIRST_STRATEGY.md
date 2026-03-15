# Ellie Offline-First Strategy

## Why This Matters

Ellie is built for mining workers who regularly operate underground or in remote areas with **zero cellular signal**. The app promises shift visibility without a connection — tomorrow's start time, remaining days off, block schedule — without any network call whatsoever. Offline-first isn't a nice-to-have; it's a core promise.

---

## Current State Assessment

The offline infrastructure skeleton is already present but incomplete:

### What Already Works ✅

| Component                           | File                                  | Status                       |
| ----------------------------------- | ------------------------------------- | ---------------------------- |
| Sync queue (CREATE/UPDATE/DELETE)   | `src/services/DataSyncService.ts`     | Built, not wired             |
| Type-safe local storage with TTL    | `src/services/AsyncStorageService.ts` | Fully working                |
| Exponential backoff retry           | `src/utils/reliableRetry.ts`          | Fully working                |
| Offline voice query fallback        | `src/utils/offlineFallback.ts`        | Fully working (10 languages) |
| Shift calculations (pure functions) | `src/utils/shiftUtils.ts`             | Zero network dependency      |
| Firebase Auth session persistence   | `src/config/firebase.ts`              | Fully working                |

### Critical Gaps ❌

| Gap                                             | Location                     | Impact                              |
| ----------------------------------------------- | ---------------------------- | ----------------------------------- |
| Network detection hardcoded to `true`           | `DataSyncService.ts:503`     | Queue never activates               |
| Network detection hardcoded to `true`           | `FirebaseService.ts:63`      | Guards never fire                   |
| `@react-native-community/netinfo` not installed | `package.json`               | No real connectivity data           |
| No `useNetworkState` hook                       | `src/hooks/`                 | UI cannot reflect offline state     |
| No offline banner or sync indicator             | `src/components/`            | User gets no feedback               |
| Firestore reads blocked when offline            | `FirebaseService.ts:134,256` | Dashboard breaks offline            |
| No Firestore memory cache configured            | `src/config/firebase.ts`     | No in-session caching               |
| No cache TTL constants                          | `src/config/`                | Inconsistent expiry across services |
| `removeExpired()` never called                  | `App.tsx`                    | Storage bloats over time            |

The **root problem**: Both `DataSyncService.initializeNetworkListener()` and `FirebaseService.initializeNetworkListener()` contain TODO stubs that permanently set the online flag to `true`. The entire offline queue is dead code because the app never knows it is actually offline.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      REACT NATIVE APP                   │
│                                                         │
│  ┌─────────────────┐     ┌───────────────────────────┐ │
│  │ NetworkState    │     │       UI Components        │ │
│  │ Service         │────▶│  OfflineBanner             │ │
│  │ (@react-native  │     │  SyncStatusIndicator       │ │
│  │  -community/    │     └───────────────────────────┘ │
│  │  netinfo)       │                                    │
│  └────────┬────────┘                                    │
│           │ broadcasts to                               │
│           ▼                                             │
│  ┌─────────────────┐     ┌───────────────────────────┐ │
│  │ DataSyncService │     │       UserService          │ │
│  │ • queue flush   │     │  • local-first reads       │ │
│  │   on reconnect  │     │  • optimistic writes       │ │
│  │ • auto-sync 60s │     │  • background refresh      │ │
│  └────────┬────────┘     └─────────────┬─────────────┘ │
│           │                            │                │
│           ▼                            ▼                │
│  ┌─────────────────────────────────────────────────┐   │
│  │           AsyncStorage (TTL-aware cache)         │   │
│  │   user:{id}   shiftCycle:{id}   sync:queue       │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │ (when online only)            │
└─────────────────────────┼──────────────────────────────┘
                          ▼
                 ┌─────────────────┐
                 │    Firestore    │
                 │  memory cache   │
                 │  (in-session)   │
                 │  + cloud sync   │
                 └─────────────────┘
```

### Data Flow: Read Path

```
Component mounts → requests data
         ↓
AsyncStorage checked first (always fast, always available)
    CACHE HIT  → return data immediately to UI
                 + trigger background Firestore refresh if online (fire & forget)
                 + write refreshed data back to AsyncStorage with TTL
    CACHE MISS → call Firestore read()
                 → Firestore memory cache checked (in-session)
                 → cloud fetch if not in memory cache
                 → write result to AsyncStorage with TTL
         ↓
UI renders with best available data — never blocked on network
```

### Data Flow: Write Path

```
User makes a change (edit profile, update settings)
         ↓
AsyncStorage updated immediately (optimistic — instant UI update)
         ↓
isConnected?
    YES → Firestore update() called directly
    NO  → Log locally; DataSyncService queue picks up on reconnect
         ↓
UI shows change instantly — network never blocks the user
```

---

## Implementation Plan

### Files to Create (7 new files)

| File                                     | Purpose                                                              |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `src/services/NetworkStateService.ts`    | Singleton wrapping NetInfo — single source of truth for connectivity |
| `src/contexts/NetworkContext.tsx`        | React context exposing network + sync state to component tree        |
| `src/hooks/useNetworkState.ts`           | Convenience hook for components                                      |
| `src/components/OfflineBanner.tsx`       | Animated top banner — slides in when offline                         |
| `src/components/SyncStatusIndicator.tsx` | Badge showing pending queue count                                    |
| `src/config/cacheConfig.ts`              | TTL constants used across all services                               |
| `docs/OFFLINE_FIRST_STRATEGY.md`         | This file                                                            |

### Files to Modify (6 existing files)

| File                                       | Change                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `src/services/DataSyncService.ts`          | Replace stub (lines 500–504) with real NetInfo subscription                 |
| `src/services/firebase/FirebaseService.ts` | Replace stub (lines 60–64), remove `checkNetworkState()` from reads         |
| `src/config/firebase.ts`                   | Switch `getFirestore()` → `initializeFirestore()` with `memoryLocalCache()` |
| `src/services/UserService.ts`              | Local-first reads, optimistic writes                                        |
| `App.tsx`                                  | Add `NetworkProvider`, `OfflineBanner`, startup `removeExpired()` call      |
| `package.json`                             | Add `@react-native-community/netinfo` (via `npx expo install`)              |

---

## Step-by-Step Implementation

---

### Step 1 — Install NetInfo

```bash
npx expo install @react-native-community/netinfo
```

---

### Step 2 — Create `src/services/NetworkStateService.ts`

```typescript
/**
 * NetworkStateService
 *
 * Singleton that wraps @react-native-community/netinfo and provides
 * real-time network connectivity to all services in the app.
 * Replaces the hardcoded `isOnlineState = true` stubs in
 * DataSyncService and FirebaseService.
 */

import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { logger } from '@/utils/logger';

export type NetworkCallback = (isConnected: boolean) => void;

class NetworkStateService {
  private isConnectedState = true; // optimistic default until first NetInfo event
  private isInternetReachableState = true;
  private subscribers: Set<NetworkCallback> = new Set();
  private netInfoUnsubscribe: NetInfoSubscription | null = null;
  private initialized = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 300;

  /**
   * Call once at app startup (before providers mount).
   * Subscribes to real network state changes.
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Get immediate state
    NetInfo.fetch().then((state) => this.handleStateChange(state));

    // Subscribe to future changes
    this.netInfoUnsubscribe = NetInfo.addEventListener((state) => {
      // Debounce rapid transitions (e.g. WiFi handoff)
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.handleStateChange(state), this.DEBOUNCE_MS);
    });

    logger.info('[NetworkStateService] Initialized');
  }

  /** Current connectivity (cached, synchronous) */
  isConnected(): boolean {
    return this.isConnectedState;
  }

  /** True if internet is actually reachable (not just local network) */
  isInternetReachable(): boolean {
    return this.isInternetReachableState;
  }

  /**
   * Subscribe to connectivity changes.
   * Callback is immediately called with current state.
   * Returns an unsubscribe function.
   */
  subscribe(callback: NetworkCallback): () => void {
    this.subscribers.add(callback);
    // Immediately notify with current state
    callback(this.isConnectedState);
    return () => this.subscribers.delete(callback);
  }

  /** Tear down (call on app unmount) */
  destroy(): void {
    this.netInfoUnsubscribe?.();
    this.subscribers.clear();
    this.initialized = false;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }

  private handleStateChange(state: NetInfoState): void {
    const wasConnected = this.isConnectedState;
    // isConnected can be null — treat null as offline
    this.isConnectedState = state.isConnected ?? false;
    this.isInternetReachableState = state.isInternetReachable ?? false;

    logger.info('[NetworkStateService] Network state changed', {
      isConnected: this.isConnectedState,
      isInternetReachable: this.isInternetReachableState,
      type: state.type,
    });

    if (this.isConnectedState !== wasConnected) {
      this.subscribers.forEach((cb) => cb(this.isConnectedState));
    }
  }
}

// Export singleton
export const networkStateService = new NetworkStateService();
```

---

### Step 3 — Create `src/config/cacheConfig.ts`

```typescript
/**
 * Cache TTL (time-to-live) configuration in seconds.
 *
 * Used with AsyncStorageService.setWithTTL().
 * Sync queue keys (sync:queue, sync:failedOps) MUST NOT have a TTL.
 */
export const CACHE_TTL = {
  /** User profile: refresh daily */
  USER_PROFILE: 60 * 60 * 24, // 24 hours

  /** Shift cycle: stable data, refresh weekly */
  SHIFT_CYCLE: 60 * 60 * 24 * 7, // 7 days

  /** Preferences: refresh daily */
  PREFERENCES: 60 * 60 * 24, // 24 hours

  // ONBOARDING: no TTL — use asyncStorageService.set(), not setWithTTL()
  // Cleared explicitly on onboarding completion.
} as const;
```

---

### Step 4 — Fix `src/services/DataSyncService.ts`

**Add import** after existing imports (line 11):

```typescript
import { networkStateService } from './NetworkStateService';
```

**Replace stub** at lines 500–504:

```typescript
// BEFORE:
private initializeNetworkListener(): void {
  // In a real app, this would use NetInfo
  // For now, we assume online by default
  this.isOnlineState = true;
}

// AFTER:
private initializeNetworkListener(): void {
  networkStateService.subscribe((isOnline) => {
    this.setOnlineState(isOnline);
  });
}
```

The existing `setOnlineState()` at line 383 already handles updating `isOnlineState`, notifying callbacks, and triggering `processQueue()` when coming back online. No other changes needed in this file.

---

### Step 5 — Fix `src/services/firebase/FirebaseService.ts`

**Add import** after existing imports (line 32):

```typescript
import { networkStateService } from './NetworkStateService';
```

**Add private field** to the class (after line 48):

```typescript
private networkUnsubscribe: (() => void) | null = null;
```

**Replace stub** at lines 60–64:

```typescript
// BEFORE:
private initializeNetworkListener(): void {
  // For now, assume always connected
  // In production, integrate with NetInfo or similar
  this.networkState.isConnected = true;
}

// AFTER:
private initializeNetworkListener(): void {
  this.networkUnsubscribe = networkStateService.subscribe((isConnected) => {
    this.networkState.isConnected = isConnected;
  });
}
```

**Add `destroy()` method** after `getNetworkState()` at line 428:

```typescript
public destroy(): void {
  this.networkUnsubscribe?.();
}
```

**Remove `checkNetworkState()` from `read()`** (line 134) — delete this call so offline reads serve from memory cache instead of throwing:

```typescript
// DELETE this line inside read():
this.checkNetworkState();
```

**Remove `checkNetworkState()` from `query()`** (line 256) — same reason:

```typescript
// DELETE this line inside query():
this.checkNetworkState();
```

> `checkNetworkState()` remains in `create()`, `update()`, and `delete()` — writes must stay network-gated. Offline writes go through the DataSyncService queue instead.

---

### Step 6 — Fix `src/config/firebase.ts`

**Update import** at line 14:

```typescript
// BEFORE:
import { getFirestore, Firestore } from 'firebase/firestore';

// AFTER:
import { initializeFirestore, memoryLocalCache, Firestore } from 'firebase/firestore';
```

**Replace `initializeFirebaseFirestore()` body** (lines 102–117):

```typescript
// BEFORE:
function initializeFirebaseFirestore(firebaseApp: FirebaseApp): Firestore {
  if (firestore) {
    return firestore;
  }
  try {
    firestore = getFirestore(firebaseApp);
    console.log('Firestore initialized successfully');
    return firestore;
  } catch (error) {
    console.error('Failed to initialize Firestore:', error);
    throw new Error('Firestore initialization failed');
  }
}

// AFTER:
function initializeFirebaseFirestore(firebaseApp: FirebaseApp): Firestore {
  if (firestore) {
    return firestore;
  }
  try {
    // Use initializeFirestore with memoryLocalCache so Firestore reads
    // are served from the in-memory cache during a session when offline.
    // The JS SDK does not support IndexedDB persistence in React Native —
    // cross-session persistence is handled by AsyncStorage via UserService.
    firestore = initializeFirestore(firebaseApp, {
      localCache: memoryLocalCache(),
    });
    console.log('Firestore initialized with memory cache');
    return firestore;
  } catch (error) {
    console.error('Failed to initialize Firestore:', error);
    throw new Error('Firestore initialization failed');
  }
}
```

---

### Step 7 — Update `src/services/UserService.ts`

**Add imports** (after existing imports):

```typescript
import { asyncStorageService } from './AsyncStorageService';
import { networkStateService } from './NetworkStateService';
import { CACHE_TTL } from '@/config/cacheConfig';
```

**Replace `getUser()`** with local-first version:

```typescript
async getUser(userId: string): Promise<UserProfile | null> {
  try {
    // 1. Serve from AsyncStorage first — always available offline
    const cached = await asyncStorageService.get<UserProfile>(`user:${userId}`);
    if (cached) {
      logger.debug('User loaded from local cache', { userId });
      // Background refresh from Firestore if online (fire and forget)
      if (networkStateService.isConnected()) {
        this.read<UserProfile>(this.USERS_COLLECTION, userId)
          .then(async (remote) => {
            if (remote) {
              await asyncStorageService.setWithTTL(`user:${userId}`, remote, CACHE_TTL.USER_PROFILE);
            }
          })
          .catch((err) => logger.warn('Background user refresh failed', err));
      }
      return cached;
    }

    // 2. No cache — fetch from Firestore (requires network or memory cache)
    const remote = await this.read<UserProfile>(this.USERS_COLLECTION, userId);
    if (remote) {
      await asyncStorageService.setWithTTL(`user:${userId}`, remote, CACHE_TTL.USER_PROFILE);
    }
    return remote;
  } catch (error) {
    logger.error('Failed to get user', error as Error, { userId });
    return null; // Graceful degradation — don't crash the UI
  }
}
```

**Replace `updateUser()`** with optimistic local-first version:

```typescript
async updateUser(userId: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    // 1. Apply to AsyncStorage immediately (optimistic)
    const cached = await asyncStorageService.get<UserProfile>(`user:${userId}`);
    if (cached) {
      const merged = { ...cached, ...updates, updatedAt: new Date().toISOString() };
      await asyncStorageService.setWithTTL(`user:${userId}`, merged, CACHE_TTL.USER_PROFILE);
    }

    // 2. Write to Firestore if online — caller queues via DataSyncService if offline
    if (networkStateService.isConnected()) {
      await this.update(this.USERS_COLLECTION, userId, updates);
    } else {
      logger.info('Offline — local update applied, Firestore write deferred', { userId });
    }
  } catch (error) {
    logger.error('Failed to update user', error as Error, { userId });
    throw error;
  }
}
```

**Replace `getShiftCycle()`** with local-first version:

```typescript
async getShiftCycle(userId: string): Promise<ShiftCycle | null> {
  try {
    const cached = await asyncStorageService.get<ShiftCycle>(`shiftCycle:${userId}`);
    if (cached) {
      if (networkStateService.isConnected()) {
        this.read<ShiftCycle>(this.USERS_COLLECTION, `${userId}/shiftCycle/current`)
          .then(async (remote) => {
            if (remote) {
              await asyncStorageService.setWithTTL(
                `shiftCycle:${userId}`,
                remote,
                CACHE_TTL.SHIFT_CYCLE
              );
            }
          })
          .catch((err) => logger.warn('Background shift cycle refresh failed', err));
      }
      return cached;
    }
    const remote = await this.read<ShiftCycle>(
      this.USERS_COLLECTION,
      `${userId}/shiftCycle/current`
    );
    if (remote) {
      await asyncStorageService.setWithTTL(`shiftCycle:${userId}`, remote, CACHE_TTL.SHIFT_CYCLE);
    }
    return remote;
  } catch (error) {
    logger.error('Failed to get shift cycle', error as Error, { userId });
    return null;
  }
}
```

---

### Step 8 — Create `src/contexts/NetworkContext.tsx`

```typescript
/**
 * NetworkContext
 *
 * Provides real-time network connectivity and sync state to the component tree.
 * Backed by NetworkStateService (real NetInfo data).
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { networkStateService } from '@/services/NetworkStateService';
import { DataSyncService } from '@/services/DataSyncService';

export interface NetworkContextValue {
  isConnected: boolean;
  isInternetReachable: boolean;
  pendingQueueCount: number;
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextValue>({
  isConnected: true,
  isInternetReachable: true,
  pendingQueueCount: 0,
  isSyncing: false,
  triggerSync: async () => {},
});

interface Props {
  children: ReactNode;
  syncService: DataSyncService;
}

export function NetworkProvider({ children, syncService }: Props) {
  const [isConnected, setIsConnected] = useState(networkStateService.isConnected());
  const [isInternetReachable, setIsInternetReachable] = useState(
    networkStateService.isInternetReachable()
  );
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = networkStateService.subscribe((connected) => {
      setIsConnected(connected);
      setIsInternetReachable(networkStateService.isInternetReachable());
    });

    // Poll queue size every 5 seconds to keep badge accurate
    const queuePoller = setInterval(async () => {
      const size = await syncService.getQueueSize();
      setPendingQueueCount(size);
      const status = await syncService.getSyncStatus('current');
      setIsSyncing(status.isSyncing);
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(queuePoller);
    };
  }, [syncService]);

  const triggerSync = async () => {
    if (!isConnected) return;
    setIsSyncing(true);
    await syncService.processQueue();
    const size = await syncService.getQueueSize();
    setPendingQueueCount(size);
    setIsSyncing(false);
  };

  return (
    <NetworkContext.Provider
      value={{ isConnected, isInternetReachable, pendingQueueCount, isSyncing, triggerSync }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetworkContext(): NetworkContextValue {
  return useContext(NetworkContext);
}
```

---

### Step 9 — Create `src/hooks/useNetworkState.ts`

```typescript
/**
 * useNetworkState
 *
 * Hook for components that need network connectivity or sync state.
 * Returns: isConnected, isInternetReachable, pendingQueueCount, isSyncing, triggerSync
 */

import { useNetworkContext } from '@/contexts/NetworkContext';

export function useNetworkState() {
  return useNetworkContext();
}
```

---

### Step 10 — Create `src/components/OfflineBanner.tsx`

```typescript
/**
 * OfflineBanner
 *
 * Animated banner that slides in from the top when the device is offline.
 * Shows pending sync count when changes are queued.
 * Disappears automatically when connectivity is restored.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNetworkState } from '@/hooks/useNetworkState';

export function OfflineBanner() {
  const { isConnected, pendingQueueCount, isSyncing, triggerSync } = useNetworkState();
  const translateY = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: isConnected ? -60 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [isConnected, translateY]);

  const message = isSyncing
    ? 'Syncing changes...'
    : pendingQueueCount > 0
      ? `Offline — ${pendingQueueCount} change${pendingQueueCount !== 1 ? 's' : ''} pending sync`
      : 'Working offline — changes saved locally';

  return (
    <Animated.View style={[styles.banner, { transform: [{ translateY }] }]}>
      <Text style={styles.text}>{message}</Text>
      {pendingQueueCount > 0 && isConnected && (
        <TouchableOpacity onPress={triggerSync} style={styles.syncButton}>
          <Text style={styles.syncButtonText}>Sync now</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: '#1a1a2e',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#FF6B35',
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    marginLeft: 8,
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
```

---

### Step 11 — Create `src/components/SyncStatusIndicator.tsx`

```typescript
/**
 * SyncStatusIndicator
 *
 * Small touchable badge for use in headers or tab bars.
 * States:
 *   ✓  green   — all changes synced
 *   N  orange  — N changes pending sync (tap to sync now)
 *   ◌  spinner — sync in progress
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNetworkState } from '@/hooks/useNetworkState';

export function SyncStatusIndicator() {
  const { isConnected, isSyncing, pendingQueueCount, triggerSync } = useNetworkState();

  if (!isConnected && pendingQueueCount === 0) return null;

  const renderIcon = () => {
    if (isSyncing) return <ActivityIndicator size="small" color="#FF6B35" />;
    if (pendingQueueCount > 0) {
      return (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{Math.min(pendingQueueCount, 9)}</Text>
        </View>
      );
    }
    return <Text style={styles.checkmark}>✓</Text>;
  };

  return (
    <TouchableOpacity onPress={triggerSync} style={styles.container} activeOpacity={0.7}>
      {renderIcon()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  checkmark: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '700',
  },
});
```

---

### Step 12 — Update `App.tsx`

Replace the entire file:

```typescript
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { OnboardingProvider } from './src/contexts/OnboardingContext';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { VoiceAssistantProvider } from './src/contexts/VoiceAssistantContext';
import { NetworkProvider } from './src/contexts/NetworkContext';
import { OfflineBanner } from './src/components/OfflineBanner';
import { useShiftAccent } from './src/hooks/useShiftAccent';
import { networkStateService } from './src/services/NetworkStateService';
import { asyncStorageService } from './src/services/AsyncStorageService';
import { DataSyncService } from './src/services/DataSyncService';
import { UserService } from './src/services/UserService';
// Temporarily disabled for physical-device regression testing.
// import { SubscriptionProvider } from './src/contexts/SubscriptionContext';
// import { PaywallScreen } from './src/screens/subscription/PaywallScreen';

// Initialize network detection immediately — before any component mounts
networkStateService.initialize();

// Shared service instances (singletons for the app session)
const userService = new UserService();
const dataSyncService = new DataSyncService(userService);
dataSyncService.startAutoSync(60000);

function AppContent() {
  const insets = useSafeAreaInsets();
  const { statusAreaColor } = useShiftAccent();

  useEffect(() => {
    // Remove expired cached items on startup (non-critical)
    asyncStorageService.removeExpired().catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      <View
        pointerEvents="none"
        style={[styles.statusAreaBackground, { height: insets.top, backgroundColor: statusAreaColor }]}
      />
      <StatusBar style="light" backgroundColor={statusAreaColor} translucent={false} />
      {/* Offline banner sits above NavigationContainer so it overlays all screens */}
      <OfflineBanner />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <OnboardingProvider>
            <LanguageProvider>
              <VoiceAssistantProvider>
                <NetworkProvider syncService={dataSyncService}>
                  <AppContent />
                </NetworkProvider>
              </VoiceAssistantProvider>
            </LanguageProvider>
          </OnboardingProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusAreaBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
});
```

---

## Conflict Resolution Strategy

**Strategy: Last-write-wins with `updatedAt` timestamps.**

Already implemented in `DataSyncService.resolveUserConflict()`. This is the correct strategy for Ellie because:

- Workers set their shift pattern once and rarely change it
- Profile edits are infrequent and single-device in practice
- `updatedAt` is always written by `FirebaseService.update()`, so comparisons are reliable
- There is no concurrent multi-device editing scenario

If a conflict is detected (local and remote both exist with different timestamps), the newer `updatedAt` wins. The resolved version is written back to both AsyncStorage and Firestore.

---

## Cache TTL Reference

| AsyncStorage Key   | TTL        | Reasoning                                          |
| ------------------ | ---------- | -------------------------------------------------- |
| `user:{id}`        | 24 hours   | Profile data changes rarely                        |
| `shiftCycle:{id}`  | 7 days     | Shift patterns are set-and-forget                  |
| `preferences:{id}` | 24 hours   | Daily sync is sufficient                           |
| `sync:queue`       | **No TTL** | Must never auto-expire — would lose pending writes |
| `sync:failedOps`   | **No TTL** | Same reason                                        |
| `onboarding:data`  | **No TTL** | Cleared explicitly on completion                   |

---

## Files That Do Not Need Changes

| File                                    | Reason                                                             |
| --------------------------------------- | ------------------------------------------------------------------ |
| `src/utils/offlineFallback.ts`          | Already handles all voice queries offline in 10 languages          |
| `src/utils/reliableRetry.ts`            | Exponential backoff is solid as-is                                 |
| `src/utils/shiftUtils.ts`               | Pure functions — zero network dependency                           |
| `src/utils/shiftTimeUtils.ts`           | Pure functions — zero network dependency                           |
| `src/contexts/OnboardingContext.tsx`    | Already AsyncStorage-backed; no Firestore writes during onboarding |
| `src/services/NotificationService.ts`   | Local scheduling via expo-notifications; no network needed         |
| `src/services/VoiceAssistantService.ts` | Already falls back to `offlineFallback.ts` automatically           |
| `src/hooks/useActiveShift.ts`           | Computed from local shift cycle — no network                       |
| `src/hooks/useShiftAccent.ts`           | Computed from local shift cycle — no network                       |

---

## New Dependency

```
@react-native-community/netinfo
```

Install via `npx expo install @react-native-community/netinfo` to ensure Expo SDK 54 compatibility. No other new dependencies — everything else reuses existing infrastructure.

---

## Verification Checklist

Run this sequence on a physical device (or simulator with Network Link Conditioner):

```
Setup
  [ ] npx expo start → app opens normally

Online → Offline
  [ ] Enable Airplane Mode
  [ ] Offline banner slides in from top
  [ ] Dashboard loads shift data from AsyncStorage cache
  [ ] Navigate all tabs — no crashes, no empty screens

Offline editing
  [ ] Edit profile field → change appears immediately (optimistic)
  [ ] SyncStatusIndicator shows pending count badge
  [ ] Voice query ("Am I working today?") → offlineFallback responds correctly

Reconnect
  [ ] Disable Airplane Mode
  [ ] Offline banner slides out
  [ ] DataSyncService flushes queue within 1–2 seconds
  [ ] SyncStatusIndicator shows checkmark
  [ ] Firestore updated (verify in Firebase console)

Cross-session persistence
  [ ] Go offline
  [ ] Force-quit app
  [ ] Reopen app with Airplane Mode still ON
  [ ] All data still present (served from AsyncStorage)

Tests
  [ ] npm test → all tests pass
  [ ] npm run type-check → no TypeScript errors
```
