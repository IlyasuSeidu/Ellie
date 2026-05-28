# Ellie — Offline-First System

> **Standard:** Top 0.01% production quality. Every decision in this document is grounded in Ellie's actual codebase, stack, and user context (mining shift workers who frequently have no signal on site or underground).

---

## Table of Contents

1. [Philosophy & Principles](#1-philosophy--principles)
2. [Current State Audit](#2-current-state-audit)
3. [Storage Layer](#3-storage-layer)
4. [Firestore Offline Persistence](#4-firestore-offline-persistence)
5. [Network Detection](#5-network-detection)
6. [Sync Architecture](#6-sync-architecture)
7. [Optimistic UI](#7-optimistic-ui)
8. [Background Sync](#8-background-sync)
9. [Subscription & Entitlement Offline](#9-subscription--entitlement-offline)
10. [Push Notifications Offline](#10-push-notifications-offline)
11. [Voice Assistant Offline](#11-voice-assistant-offline)
12. [Data Integrity & Migrations](#12-data-integrity--migrations)
13. [Offline UX](#13-offline-ux)
14. [Testing Strategy](#14-testing-strategy)
15. [Implementation Phases](#15-implementation-phases)
16. [Key Files Map](#16-key-files-map)
17. [Wake Word Detection Offline](#17-wake-word-detection-offline)
18. [Text-to-Speech Offline](#18-text-to-speech-offline)
19. [Smart Reminders Offline](#19-smart-reminders-offline)
20. [Avatar & File System Offline](#20-avatar--file-system-offline)
21. [Session Service Offline](#21-session-service-offline)
22. [Voice Assistant Persistence Offline](#22-voice-assistant-persistence-offline)
23. [Firebase Auth Token Offline](#23-firebase-auth-token-offline)
24. [Connection Quality & Degraded Networks](#24-connection-quality--degraded-networks)
25. [Purchase Flow Offline UX](#25-purchase-flow-offline-ux)
26. [Onboarding Offline](#26-onboarding-offline)
27. [MMKV Encryption Key Management](#27-mmkv-encryption-key-management)
28. [Circuit Breaker & Dead Letter Queue](#28-circuit-breaker--dead-letter-queue)
29. [Analytics Offline](#29-analytics-offline)
30. [Storage Cleanup Policy](#30-storage-cleanup-policy)
31. [Device ID Persistence](#31-device-id-persistence)
32. [Error Boundaries for Offline](#32-error-boundaries-for-offline)
33. [Account & Data Deletion Offline](#33-account--data-deletion-offline)

---

## 1. Philosophy & Principles

### Why Ellie must be offline-first (not just offline-capable)

Ellie's core users are mining and industrial workers. Their daily reality:

- Underground mines and remote FIFO sites have zero or intermittent signal
- Workers check their roster at the start of a shift — precisely when they're deepest underground
- The app must answer "Am I on shift today?" with **zero network dependency**, every time, without degrading to a spinner or error screen
- A premium app that fails when signal drops is not a premium app

**Offline-first means:** the app behaves identically online and offline. Network access is an enhancement (sync, voice AI, holiday data) — not a requirement for core functionality.

### Core principles

1. **Local state is the source of truth at runtime.** The UI reads from local storage. Firestore is the authoritative backup and cross-device sync layer.
2. **Never block the UI on a network call.** Read locally first, sync in background, update UI reactively when sync completes.
3. **Every write succeeds locally, always.** Network failures queue the write and retry — they never fail the user action.
4. **The app cold-starts fully functional with no network.** Onboarding is the only flow that requires network (account creation). After that, 100% offline.
5. **Fail silently on enhancement features; never fail silently on core features.** If holiday data fails to load — fine, hide the holiday badge. If the shift calendar fails to render — unacceptable.
6. **Entitlements are never re-evaluated to false offline.** A paying subscriber's Pro access must be intact regardless of network state.

---

## 2. Current State Audit

### What works correctly offline today

| Feature                                     | Status                      | Notes                                                      |
| ------------------------------------------- | --------------------------- | ---------------------------------------------------------- |
| Shift calculation (`shiftUtils.ts`)         | ✅ Fully offline            | Pure deterministic math from ShiftCycle                    |
| Local notifications (`expo-notifications`)  | ✅ Fully offline            | OS-level, no network needed                                |
| Voice query fallback (`offlineFallback.ts`) | ✅ Offline                  | Handles today/tomorrow/next off/next night in 11 languages |
| i18n translations                           | ✅ Bundled                  | All locale files in app bundle                             |
| Holiday data (static JSON files)            | ✅ Offline after first load | Cached in storage with 90-day TTL                          |

### Current remaining gaps

| Issue                                                                                        | File                                                                           | Severity  | Impact                                                                                                                      |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Firestore JS SDK disk persistence is still unavailable in the current React Native stack** | `src/config/firebase.ts`                                                       | 🟡 High   | The app cannot rely on Firestore's own persistent local cache; it must use service-level offline caching instead            |
| **`DataSyncService` is still present as legacy code**                                        | `src/services/DataSyncService.ts`                                              | 🟡 Medium | It is not on the production runtime path, but it remains confusing and should not be treated as the live offline sync model |
| **Sleep-driven fatigue reminder behavior remains deferred**                                  | `src/hooks/useSmartReminders.ts` / `src/services/SmartReminderOrchestrator.ts` | 🟢 Low    | Fatigue-aware reminders stay hidden until real sleep data exists                                                            |

---

## 3. Storage Layer

### Current implementation status

The production code now uses:

- `AsyncStorageService` as the unified native storage wrapper for app runtime data, backed by:
  - `react-native-mmkv` on native when the module is available in the installed build
  - AsyncStorage fallback when MMKV is unavailable or the current simulator/device build is stale
- `StorageService` layered on top of that wrapper for computed caches such as shift ranges
- `expo-secure-store` for entitlement snapshots and other sensitive subscription state

This means the storage layer is now consistent, migration-aware, and MMKV-capable on native. The remaining MMKV work below is optional architecture hardening, not a current correctness blocker.

### Recommended final stack

```
┌─────────────────────────────────────────────────────────────────────┐
│  DATA TYPE                  │  STORE              │  REASON         │
├─────────────────────────────────────────────────────────────────────┤
│  ShiftCycle config          │  MMKV               │  Sync read, tiny│
│  UserProfile                │  MMKV               │  Fast render    │
│  Preferences / settings     │  MMKV               │  Sync read      │
│  Subscription entitlement   │  MMKV + SecureStore │  Offline + safe │
│  Sync queue (non-Firestore) │  MMKV               │  Fast, reliable │
│  Shift cache (computed)     │  MMKV               │  Month-keyed    │
│  Holiday cache              │  MMKV               │  90-day TTL     │
│  Voice assistant session    │  MMKV               │  Ephemeral      │
│  Push token                 │  MMKV               │  Device-specific│
│  Firebase Auth persistence  │  AsyncStorage       │  Required by SDK│
│  Auth tokens (sensitive)    │  expo-secure-store  │  Encrypted      │
│  Entitlement snapshot       │  expo-secure-store  │  Encrypted      │
└─────────────────────────────────────────────────────────────────────┘
```

### Why MMKV over AsyncStorage for runtime data

`react-native-mmkv` is backed by Tencent's production-tested key-value store (used in WeChat). In RN benchmarks it is 10–30x faster than AsyncStorage for reads:

- **Synchronous reads** — no `await`, no Promise overhead. Critical for the UI thread reading shift data on mount.
- **Encrypted** — pass an encryption key for HIPAA/GDPR compliance at rest.
- **Type-safe primitives** — `getString`, `getBoolean`, `getNumber` without JSON round-trip.
- **Listeners** — reactive updates with `mmkv.addOnValueChangedListener`.
- **Size limit** — RAM-bound (not the 6MB/key AsyncStorage limit on iOS).
- **Requires dev client** — not Expo Go compatible. Already required for the app (RevenueCat, speech recognition, wake word).

**Install:**

```bash
npx expo install react-native-mmkv
```

**Config plugin in app.config.js:**

```javascript
plugins: [['react-native-mmkv', { ios: { enableNewArchitecture: true } }]];
```

### MMKV service — replaces AsyncStorageService for non-auth paths

Create `src/services/MMKVService.ts`:

```typescript
import { MMKV } from 'react-native-mmkv';

// One instance per namespace — share the same instance across the app
export const storage = new MMKV({
  id: 'ellie-main',
  encryptionKey: process.env.EXPO_PUBLIC_MMKV_ENCRYPTION_KEY,
});

// Typed wrapper preserving the IStorageService interface for DI
export class MMKVService implements IStorageService {
  private store: MMKV;

  constructor(store: MMKV = storage) {
    this.store = store;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    const envelope = { v: value, exp: ttlMs ? Date.now() + ttlMs : undefined };
    this.store.set(key, JSON.stringify(envelope));
  }

  get<T>(key: string): T | null {
    const raw = this.store.getString(key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as { v: T; exp?: number };
    if (envelope.exp && Date.now() > envelope.exp) {
      this.store.delete(key);
      return null;
    }
    return envelope.v;
  }

  remove(key: string): void {
    this.store.delete(key);
  }

  has(key: string): boolean {
    return this.store.contains(key);
  }

  clearPrefix(prefix: string): void {
    const keys = this.store.getAllKeys().filter((k) => k.startsWith(prefix));
    keys.forEach((k) => this.store.delete(k));
  }

  clear(): void {
    this.store.clearAll();
  }
}

export const mmkvService = new MMKVService();
```

Note: `MMKVService.set` is synchronous (no `async`/`await`) because MMKV is synchronous. The `IStorageService` interface may need its `set` return type updated from `Promise<void>` to `void` for MMKV paths, or you can wrap in `Promise.resolve()` to maintain interface compatibility.

### AsyncStorage — keep only for Firebase Auth

Firebase Auth's `getReactNativePersistence` specifically requires `AsyncStorage` as its backing store. Do not replace this. Keep `AsyncStorage` imported only in `src/config/firebase.ts`.

### expo-secure-store — for sensitive values

```typescript
import * as SecureStore from 'expo-secure-store';

// Store entitlement snapshot (max 2048 bytes on iOS)
await SecureStore.setItemAsync(
  'entitlement:isPro',
  JSON.stringify({
    isPro: true,
    expiresAt: customerInfo.entitlements.active['pro']?.expirationDate,
    cachedAt: new Date().toISOString(),
  })
);

const snapshot = await SecureStore.getItemAsync('entitlement:isPro');
```

---

## 4. Firestore Offline Persistence

### Current reality in this stack

Ellie is using the Firebase JavaScript SDK inside React Native / Expo. In this stack, the safe production path is **not** to assume the SDK's persistent Firestore disk cache is available the way it is on the web with IndexedDB.

The app now compensates with a service-level offline document cache in `src/services/firebase/FirebaseService.ts`:

- successful `read()` calls cache user-scoped Firestore documents locally
- successful `create()` / `update()` / `delete()` calls keep that cache in sync
- offline `read()` calls return the cached document when available
- subscription errors fall back to the cached document instead of dropping to `null`

### What this gives Ellie today

1. **Cached document reads offline** for the app's core Firestore-backed profile/preference/shift-cycle reads
2. **Consistent fallback behavior** when Firestore reads fail because of network loss
3. **No false dependency on unsupported SDK persistence behavior**

### What still does not exist

- True Firestore SDK disk persistence for arbitrary `getDoc` / `getDocs` usage across the whole app
- Offline Firestore write queueing backed by the SDK itself in this React Native stack

### What this offline layer does NOT cover

- Cloud Functions invocations (`httpsCallable`) — still network-only
- Firebase Storage uploads/downloads — still network-only
- Firebase Auth sign-in — still requires network for the initial auth transaction
- Query-level Firestore cache replay — the current implementation only caches document reads that go through `FirebaseService.read()`

---

## 5. Network Detection

### The right library

`@react-native-community/netinfo` — install with `npx expo install @react-native-community/netinfo`.

### Critical distinction: connected vs. reachable

```typescript
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

// WRONG — a WiFi router with no internet reports isConnected=true
const isOnline = state.isConnected;

// CORRECT — actual internet reachability
const isOnline = state.isConnected === true && state.isInternetReachable === true;
```

`isInternetReachable` can be `null` briefly at startup. Treat `null` as **offline** (fail safe).

### `NetworkService` — the app-wide singleton

Create `src/services/NetworkService.ts`:

```typescript
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';

export type NetworkStatus = 'online' | 'offline' | 'unknown';

class NetworkService {
  private status: NetworkStatus = 'unknown';
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private unsubscribeNetInfo: (() => void) | null = null;

  initialize(): void {
    // Subscribe to changes
    this.unsubscribeNetInfo = NetInfo.addEventListener(this.handleNetInfoChange);

    // Fetch initial state
    void NetInfo.fetch().then(this.handleNetInfoChange);

    // Re-check on app foreground (connectivity may have changed while backgrounded)
    AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        void NetInfo.fetch().then(this.handleNetInfoChange);
      }
    });
  }

  private handleNetInfoChange = (state: NetInfoState): void => {
    const newStatus: NetworkStatus =
      state.isConnected === true && state.isInternetReachable === true
        ? 'online'
        : state.isInternetReachable === null
          ? 'unknown'
          : 'offline';

    if (newStatus !== this.status) {
      this.status = newStatus;
      this.listeners.forEach((fn) => fn(newStatus));
    }
  };

  isOnline(): boolean {
    return this.status === 'online';
  }

  isOffline(): boolean {
    return this.status === 'offline';
  }

  getStatus(): NetworkStatus {
    return this.status;
  }

  subscribe(fn: (status: NetworkStatus) => void): () => void {
    this.listeners.add(fn);
    fn(this.status); // immediate call with current state
    return () => this.listeners.delete(fn);
  }

  destroy(): void {
    this.unsubscribeNetInfo?.();
    this.listeners.clear();
  }
}

export const networkService = new NetworkService();
```

Initialize once in `App.tsx` or root provider:

```typescript
useEffect(() => {
  networkService.initialize();
}, []);
```

### React hook

```typescript
// src/hooks/useNetworkStatus.ts
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(networkService.getStatus());
  useEffect(() => networkService.subscribe(setStatus), []);
  return status;
}
```

---

## 6. Sync Architecture

### Revised sync model

With Firestore offline persistence enabled, the sync model simplifies significantly:

```
┌──────────────────────────────────────────────────────────────┐
│                         WRITES                               │
│                                                              │
│  User action → Local state (MMKV/React state) → Firestore   │
│                                          ↑                   │
│                              SDK queues offline writes       │
│                              and flushes when online         │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                          READS                               │
│                                                              │
│  App start → MMKV (sync, instant) → render                   │
│           ↘                                                  │
│            Firestore onSnapshot (cached or fresh) → update   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              NON-FIRESTORE OPERATIONS (manual queue)         │
│                                                              │
│  Cloud Functions calls                                       │
│  RevenueCat purchases                                        │
│  Analytics events (already batched by Firebase SDK)          │
└──────────────────────────────────────────────────────────────┘
```

### Conflict resolution strategy

Ellie uses **Last-Write-Wins (LWW) with server timestamps** — the correct choice for a single-user, single-active-device app:

| Data type             | Strategy                             | Rationale                                                        |
| --------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| ShiftCycle            | Remote wins                          | Set once at onboarding; rare edits are whole-object replacements |
| UserProfile           | Server timestamp LWW                 | Server assigns `updatedAt` — no clock drift                      |
| Preferences           | Field-level merge: local wins for UI | Theme/language are per-device preferences                        |
| Notification settings | Remote wins                          | Cross-device consistency matters here                            |

**Use Firestore server timestamps, not device clock:**

```typescript
import { serverTimestamp } from 'firebase/firestore';

// In all writes:
await updateDoc(docRef, {
  ...data,
  updatedAt: serverTimestamp(), // server assigns — immune to device clock drift
});
```

### `DataSyncService` status

`DataSyncService` is **not** the live production sync path anymore. The current production runtime relies on:

1. local-first app state and storage services
2. `FirebaseService` document cache fallback for Firestore-backed reads
3. feature-specific persistence paths (subscription cache, onboarding persistence, notifications, smart reminders)

`DataSyncService` still exists in the repo as a legacy/test compatibility service. It should not be expanded into the main offline architecture again unless the app introduces a new non-Firestore queue with a clear product need.

### App state sync trigger

```typescript
// In root provider or DataSyncService initialization:
AppState.addEventListener('change', (nextState) => {
  if (nextState === 'active') {
    void dataSyncService.processQueue();
    // Firestore SDK automatically drains its own write queue when online — no code needed
  }
});
```

---

## 7. Optimistic UI

### Firestore writes — free optimistic UI

With offline persistence enabled, all `setDoc`/`updateDoc` calls resolve immediately (they don't wait for network). `onSnapshot` fires immediately with the locally written value. **This is automatic** — no additional code required for Firestore-backed data.

### Non-Firestore state — `useOptimisticField` pattern

For state that is both in React and persisted to MMKV (preferences, settings):

```typescript
// src/hooks/useOptimisticField.ts
export function useOptimisticField<T>(
  currentValue: T,
  persist: (value: T) => Promise<void> | void
): [T, (value: T) => Promise<void>] {
  const [optimistic, setOptimistic] = useState<T>(currentValue);
  const [pending, setPending] = useState(false);

  const update = useCallback(
    async (newValue: T) => {
      const previous = optimistic;
      setOptimistic(newValue); // immediate UI update
      setPending(true);
      try {
        await persist(newValue);
      } catch {
        setOptimistic(previous); // rollback
        // surface error to user
      } finally {
        setPending(false);
      }
    },
    [optimistic, persist]
  );

  return [optimistic, update];
}
```

### Shift cycle edit — the most critical optimistic path

When a user changes their shift pattern:

1. Write to MMKV synchronously → UI updates immediately
2. Re-render calendar with new pattern (pure calculation — instant)
3. Firestore write queues offline or writes online → resolves/queues
4. Reschedule local notifications in background (cancel old, schedule new)
5. Invalidate computed shift cache for affected months

If Firestore write fails (impossible with offline persistence — it just queues), rollback the MMKV write and re-render the previous pattern.

---

## 8. Background Sync

### Honest iOS/Android constraints

| Mechanism                 | iOS                           | Android         | Reliability        |
| ------------------------- | ----------------------------- | --------------- | ------------------ |
| AppState 'active' trigger | ✅ 100%                       | ✅ 100%         | **Primary method** |
| Firestore SDK auto-flush  | ✅ On reconnect               | ✅ On reconnect | **Primary method** |
| expo-background-fetch     | ⚠️ OS discretion (~15m+)      | ⚠️ Doze mode    | Bonus only         |
| Silent push (FCM/APNs)    | ✅ Reliable (background wake) | ✅ Reliable     | Best for future    |

### Primary sync triggers (implement these)

```typescript
// 1. App comes to foreground
AppState.addEventListener('change', async (state) => {
  if (state === 'active') {
    await dataSyncService.processQueue(); // non-Firestore queue
    // Firestore SDK auto-drains its queue — no code needed
  }
});

// 2. Network comes online
networkService.subscribe(async (status) => {
  if (status === 'online') {
    await dataSyncService.processQueue();
    // Notify user if there were pending writes? Subtle "Synced" toast is good UX
  }
});
```

### Background fetch (register, but don't depend on it)

```typescript
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const BACKGROUND_SYNC_TASK = 'ellie-background-sync';

TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    if (networkService.isOnline()) {
      await dataSyncService.processQueue();
    }
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register after onboarding, not at app start (iOS may show permission prompt)
export async function registerBackgroundSync(): Promise<void> {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15 minutes minimum (iOS will usually exceed this)
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (error) {
    // Non-critical — log and move on
    logger.warn('Background sync registration failed', { error });
  }
}
```

### Silent push (future — the production-grade approach)

When the user updates their shift pattern from another device, send a silent push via Firebase Cloud Functions:

- **iOS:** `content-available: 1` APNs header — wakes the app for ~30 seconds in background
- **Android:** `priority: high` FCM data message — wakes the app from Doze

The app receives the push, fetches from Firestore (which will hit the cache or pull fresh), and updates MMKV. The user's calendar is updated before they even open the app.

This is the right long-term architecture but requires Cloud Functions work and should be Phase 3.

---

## 9. Subscription & Entitlement Offline

### The critical bug

In `src/hooks/useSubscription.ts`, the catch block around `Purchases.getCustomerInfo()` sets `isPro = false`. This means any paying user who launches the app without internet loses Pro access. **This must be fixed.**

### How RevenueCat's SDK actually works offline

`react-native-purchases` v9 has a multi-layer cache:

1. **In-memory cache** (session lifetime) — `getCustomerInfo()` returns this instantly
2. **Disk cache** (persisted across launches) — 5-minute staleness for most calls; entitlement status survives cold starts
3. If both caches are empty AND offline → the SDK throws. This is the only case where your catch block matters.

### The correct pattern

```typescript
// src/hooks/useSubscription.ts

// Step 1: Initialize from local cache synchronously (before any async call)
const [isPro, setIsPro] = useState<boolean>(() => {
  // MMKV synchronous read — no await, no flash of wrong state
  return mmkvService.get<boolean>('subscription:isPro') ?? false;
});

// Step 2: Async fetch from RevenueCat (hits in-memory → disk → network)
useEffect(() => {
  let mounted = true;

  const fetchEntitlements = async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      const proStatus = !!info.entitlements.active['pro'];

      if (mounted) setIsPro(proStatus);

      // Persist for next cold start
      mmkvService.set('subscription:isPro', proStatus, 7 * 24 * 60 * 60 * 1000); // 7-day TTL

      // Also persist to SecureStore for tamper-resistance
      void SecureStore.setItemAsync(
        'entitlement:isPro',
        JSON.stringify({
          isPro: proStatus,
          cachedAt: new Date().toISOString(),
          expiresAt: info.entitlements.active['pro']?.expirationDate ?? null,
        })
      );
    } catch {
      // DO NOT set isPro = false here.
      // The MMKV initial state already reflects the correct cached value.
      // If this is a genuine first launch with no network and no cache,
      // isPro=false (the MMKV default) is correct — they haven't purchased yet.
      if (mounted) setIsLoading(false);
    }
  };

  void fetchEntitlements();
  return () => {
    mounted = false;
  };
}, []);
```

### Entitlement expiry

Check the cached entitlement expiry and warn the user before it lapses if they remain offline for an extended period. For a subscription app, a 7-day cache is the correct balance between security (not caching forever) and UX (mining workers can be on site without signal for 14-28 days).

```typescript
// For FIFO workers on 14/14 or 28/14 rosters, 7 days may not be enough.
// Increase the TTL to 30 days but verify on every foreground:
mmkvService.set('subscription:isPro', proStatus, 30 * 24 * 60 * 60 * 1000);
```

---

## 10. Push Notifications Offline

### What works with zero network

Local notifications scheduled via `expo-notifications` are stored in the OS:

- **iOS:** `UNUserNotificationCenter` — fired by the system even in airplane mode
- **Android:** `AlarmManager` (exact) or `WorkManager` (inexact) — network-independent

Your `NotificationService.scheduleShiftReminder` and `scheduleOnboardingEngagementSequence` are already correct — they schedule locally and survive offline.

### What requires network

- **`Notifications.getExpoPushTokenAsync()`** — requires Expo's push servers to issue a token
- **`saveNotification()` to Firestore** — fails offline without persistence enabled (fixed by enabling Firestore offline persistence)

### Cache the push token

```typescript
// In NotificationService or a hook:
const PUSH_TOKEN_KEY = 'notifications:pushToken';

async function getOrFetchPushToken(): Promise<string | null> {
  // Read from MMKV first
  const cached = mmkvService.get<string>(PUSH_TOKEN_KEY);
  if (cached) return cached;

  if (!networkService.isOnline()) {
    // Can't fetch offline — return null and retry on next foreground
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    mmkvService.set(PUSH_TOKEN_KEY, token.data);
    return token.data;
  } catch {
    return null;
  }
}
```

### Notification scheduling budget (iOS 64-notification limit)

iOS allows a maximum of 64 pending local notifications per app. Strategy:

```typescript
// Constants
const MAX_NOTIFICATIONS = 60; // leave 4 slots for engagement nudges
const SCHEDULE_WINDOW_DAYS = 90;

// On shift cycle change or foreground refresh:
async function rescheduleShiftReminders(
  cycle: ShiftCycle,
  settings: NotificationSettings
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const shifts = getShiftDaysInRange(new Date(), addDays(new Date(), SCHEDULE_WINDOW_DAYS), cycle);
  const upcoming = shifts.filter((s) => s.isWorkDay).slice(0, MAX_NOTIFICATIONS / 2);
  // Schedule 24h and 4h reminders for each, up to budget
  let count = 0;
  for (const shift of upcoming) {
    if (count >= MAX_NOTIFICATIONS) break;
    if (settings.shift24HoursBefore) {
      await scheduleShiftReminder(shift, 24);
      count++;
    }
    if (settings.shift4HoursBefore && count < MAX_NOTIFICATIONS) {
      await scheduleShiftReminder(shift, 4);
      count++;
    }
  }
}
```

Trigger `rescheduleShiftReminders` on:

- App foreground (if last schedule was > 14 days ago)
- Shift cycle change
- Notification settings change

---

## 11. Voice Assistant Offline

### Current state (strong foundation)

`src/utils/offlineFallback.ts` is production-quality:

- Handles 5 core query types (today, tomorrow, am I working, next day off, next night shift)
- 11 language lexicons with locale-aware date formatting
- Pure function, fully testable, zero network dependency
- Already integrated into `VoiceAssistantService`

### Speech recognition — on-device mode

Request on-device recognition for iOS 16+ users:

```typescript
// In SpeechRecognitionService.startListening():
ExpoSpeechRecognitionModule.start({
  lang: resolvedLocale,
  interimResults: true,
  continuous: true,
  addsPunctuation: true,
  requiresOnDeviceRecognition: true, // ADD THIS — iOS 16+, Android if offline pack downloaded
  contextualStrings: [
    // Improves accuracy for Ellie's domain vocabulary
    'shift',
    'roster',
    'FIFO',
    'day off',
    'night shift',
    'day shift',
    'morning shift',
    'afternoon shift',
  ],
});
```

Check support before using it:

```typescript
const supportsOffline = await ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
if (!supportsOffline && !networkService.isOnline()) {
  // Fall back to text input, show message
  setVoiceMode('text-fallback');
  return;
}
```

### Extended offline query support

The current offline fallback handles 5 patterns. These additional patterns are high-value and computable locally:

| Query pattern                       | Data needed               | Computable locally?  |
| ----------------------------------- | ------------------------- | -------------------- |
| "What's my shift this week?"        | ShiftCycle + current date | ✅ Yes               |
| "How many days off this month?"     | ShiftCycle + month        | ✅ Yes               |
| "When do I next fly out?"           | FIFO ShiftCycle           | ✅ Yes               |
| "How many night shifts this month?" | ShiftCycle + month        | ✅ Yes               |
| "What's my pattern?"                | ShiftCycle                | ✅ Yes (describe it) |
| "When do I start back?"             | FIFO ShiftCycle           | ✅ Yes               |

Extend `offlineFallback.ts` with these in Phase 2. All data is available from `ShiftCycle` which is stored locally in MMKV.

### Graceful degradation flow

```
User taps mic
  → Check networkService.isOnline()
  → If offline: set `requiresOnDeviceRecognition: true`
  → Start speech recognition
  → On transcript: try offlineFallback.ts first
  → If handled: respond immediately
  → If not handled AND online: route to EllieBrain (Claude API)
  → If not handled AND offline: respond with "I can answer that when you're back online"
```

---

## 12. Data Integrity & Migrations

### Schema versioning

All breaking changes to stored data shapes must go through a migration. Add this to the app startup sequence, before any component renders:

```typescript
// src/utils/storageMigrations.ts

const SCHEMA_VERSION_KEY = 'app:schemaVersion';
const CURRENT_VERSION = 1; // increment on every breaking schema change

export async function runMigrationsIfNeeded(): Promise<void> {
  const stored = mmkvService.get<number>(SCHEMA_VERSION_KEY) ?? 0;

  if (stored >= CURRENT_VERSION) return;

  logger.info('Running storage migrations', { from: stored, to: CURRENT_VERSION });

  if (stored < 1) await migrateV0toV1();
  // if (stored < 2) await migrateV1toV2(); // add as needed

  mmkvService.set(SCHEMA_VERSION_KEY, CURRENT_VERSION);
  logger.info('Migrations complete');
}

async function migrateV0toV1(): Promise<void> {
  // Migration from AsyncStorage to MMKV for shift data
  // Read from AsyncStorage, write to MMKV, delete from AsyncStorage
  const keys = await AsyncStorage.getAllKeys();
  const shiftKeys = keys.filter(
    (k) => k.startsWith('app:shiftCycle:') || k.startsWith('app:user:')
  );

  for (const key of shiftKeys) {
    const value = await AsyncStorage.getItem(key);
    if (value) {
      mmkvService.set(key.replace('app:', ''), JSON.parse(value));
      await AsyncStorage.removeItem(key);
    }
  }
}
```

Call at the top of `App.tsx` before rendering any navigator:

```typescript
const [migrationsComplete, setMigrationsComplete] = useState(false);

useEffect(() => {
  runMigrationsIfNeeded()
    .catch(err => logger.error('Migration failed', err))
    .finally(() => setMigrationsComplete(true));
}, []);

if (!migrationsComplete) return <SplashScreen />;
```

### Zod validation at deserialization boundaries

You already have Zod in the project. Use it whenever reading back from storage:

```typescript
import { shiftCycleSchema } from '@/types/validation';

function readShiftCycle(userId: string): ShiftCycle | null {
  const raw = mmkvService.get(`shiftCycle:${userId}`);
  if (!raw) return null;

  const result = shiftCycleSchema.safeParse(raw);
  if (!result.success) {
    logger.warn('Corrupt shiftCycle in MMKV, clearing cache', {
      userId,
      error: result.error.flatten(),
    });
    mmkvService.remove(`shiftCycle:${userId}`);
    return null; // caller falls back to Firestore
  }

  return result.data;
}
```

Apply this pattern to every `mmkvService.get()` call that reads a complex object. Simple primitives (booleans, strings) don't need it.

### AsyncStorage serialize bug fix

`src/services/AsyncStorageService.ts` serialize/deserialize has a type coercion bug. Fix:

```typescript
private serialize<T>(value: T): string {
  // Always wrap — prevents JSON.parse("123") returning a number for a stored string
  return JSON.stringify({ __v: value });
}

private deserialize<T>(serialized: string): T {
  const parsed = JSON.parse(serialized);
  // Handle pre-fix data (without __v wrapper) and new format
  if (parsed && typeof parsed === 'object' && '__v' in parsed) {
    return parsed.__v as T;
  }
  // Legacy: __type: 'Date' envelope
  if (parsed && typeof parsed === 'object' && parsed.__type === 'Date') {
    return new Date(parsed.__value) as unknown as T;
  }
  return parsed as T;
}
```

### Storage size monitoring

Monitor storage usage in development and flag when it grows unexpectedly:

```typescript
// Development only — in a debug screen or logged on app start
if (__DEV__) {
  const allKeys = mmkvService.store.getAllKeys();
  logger.debug('MMKV key count', { count: allKeys.length });
  // MMKV doesn't expose total byte size directly — use key count as a proxy
}
```

---

## 13. Offline UX

### Connection status indicator

Add a subtle, non-intrusive offline indicator. Do **not** block the UI or show a modal when offline. Ellie works fully offline — just let the user know sync is paused.

```tsx
// src/components/common/OfflineBanner.tsx
export function OfflineBanner(): React.ReactElement | null {
  const status = useNetworkStatus();

  if (status === 'online') return null;

  return (
    <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={styles.banner}>
      <Text style={styles.text}>
        {status === 'offline' ? 'Offline — your data is saved locally' : 'Checking connection…'}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: theme.colors.deepVoid,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.sacredGold + '40',
    paddingVertical: 4,
    alignItems: 'center',
  },
  text: {
    color: theme.colors.ashStone,
    fontSize: 12,
    fontFamily: theme.fonts.body,
  },
});
```

Position: beneath the header, above main content. Animate in/out with Reanimated.

### Sync status indicator

For the profile/settings screen — show when data was last synced:

```tsx
// In ProfileScreen or settings:
const { lastSyncTime, pendingOperations } = useSyncStatus();

<Text>
  {pendingOperations > 0
    ? `${pendingOperations} change${pendingOperations > 1 ? 's' : ''} pending sync`
    : lastSyncTime
      ? `Synced ${formatRelativeTime(lastSyncTime)}`
      : 'Not yet synced'}
</Text>;
```

### Voice assistant offline state

When offline and on-device recognition is not available:

```tsx
// In VoiceAssistantButton or sheet:
const { status } = useNetworkStatus();
const supportsOfflineVoice = useOnDeviceRecognitionSupport();

if (status === 'offline' && !supportsOfflineVoice) {
  return (
    <OfflineVoiceMessage message="Voice assistant needs internet. You can still check your shifts using the calendar." />
  );
}
```

When offline and on-device recognition IS available:

- Allow voice input normally
- Route through `offlineFallback.ts`
- If query is not handled: "I can answer more questions when you're back online. For now, try: 'What shift today?' or 'When is my next day off?'"

### Error states that must never show offline

These screens/states must **never** show an error because the user is offline:

- **Dashboard / Shift calendar** — reads from local ShiftCycle, fully computed. Never fails offline.
- **Pro feature gating** — reads entitlement from MMKV cache. Must not revert to free tier offline.
- **Notification settings** — reads from MMKV. Must be editable offline (writes queue to Firestore).
- **Profile info display** — reads from MMKV UserProfile. Must display offline.

If you see an error state on these screens when offline, it is a bug.

---

## 14. Testing Strategy

### Unit tests

All pure offline-capable functions already have tests. Extend:

```typescript
// Test offline fallback for new patterns (week summary, FIFO fly-out, etc.)
// File: src/utils/__tests__/offlineFallback.test.ts — extend existing

// Test MMKV service TTL and eviction
// File: src/services/__tests__/MMKVService.test.ts (new)

// Test storage migrations — run migration, verify output
// File: src/utils/__tests__/storageMigrations.test.ts (new)

// Test Zod validation at deserialization
// File: src/services/__tests__/shiftCycleDeserialization.test.ts (new)
```

### Integration tests (offline mode)

Use `@react-native-community/netinfo`'s mock to simulate offline:

```typescript
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn().mockResolvedValue({
    isConnected: false,
    isInternetReachable: false,
  }),
}));
```

Test scenarios:

1. Cold start offline → shift calendar renders correctly
2. Cold start offline → Pro entitlement preserved from cache
3. Edit shift pattern offline → UI updates, Firestore queues write
4. Come online after offline → sync queue drains, Firestore flushes
5. Voice query offline → `offlineFallback.ts` handles correctly
6. Voice query offline (unhandled) → graceful "try when online" response

### Detox E2E (extend existing setup)

Add an offline E2E test:

```typescript
// e2e/offline.test.ts
it('shows shift calendar fully offline', async () => {
  await device.setStatusBar({ networkActivity: false });
  await device.reloadReactNative();
  // Verify calendar renders with correct shift data
  await expect(element(by.id('shift-calendar'))).toBeVisible();
  // Verify no error states
  await expect(element(by.id('error-screen'))).not.toBeVisible();
});
```

---

## 15. Implementation Phases

### Phase 1 — Critical bug fixes (do first, highest ROI, ~1 day)

These are bugs in existing code. Fix before building anything new.

- [ ] **Enable Firestore offline persistence** in `src/config/firebase.ts` (3 lines)
- [ ] **Remove `checkNetworkState()` calls** from `FirebaseService` CRUD methods
- [ ] **Fix RevenueCat catch block** in `useSubscription` hook — remove `setIsPro(false)` from catch
- [ ] **Fix `ShiftDataService`** to use `asyncStorageService` instead of `StorageService` (localStorage)
- [x] **Fix AsyncStorage serialize/deserialize** bug in `AsyncStorageService.ts`
- [x] **Fix `SessionService.getOrCreateDeviceId()`** — returns a new ID every call; persist to storage (Section 31)
- [x] **Fix `SessionService.getTotalSessions()` / `getAverageSessionDuration()`** — return graceful local defaults offline (Section 21)
- [ ] **Add sync watchdog** to `DataSyncService.processQueue()` — `isSyncing` can get stuck (Section 28)

### Phase 2 — Network & sync foundation (~2 days)

- [x] Install and configure `@react-native-community/netinfo`
- [x] Build `NetworkService` singleton
- [x] Build `useNetworkStatus` hook
- [ ] Wire `NetworkService` into `DataSyncService.initializeNetworkListener()`
- [ ] Add AppState listener for sync trigger (foreground resume)
- [ ] Add `OfflineBanner` component to navigation root
- [x] Cache push token locally with runtime storage fallback

### Phase 3 — MMKV migration (~2 days)

- [ ] Install `react-native-mmkv` with config plugin
- [ ] Build `MMKVService` implementing `IStorageService`
- [ ] Migrate `ShiftDataService` to `MMKVService`
- [ ] Migrate `HolidayService` to `MMKVService`
- [ ] Migrate subscription entitlement persistence to MMKV + SecureStore
- [ ] Write `storageMigrations.ts` with V0→V1 AsyncStorage→MMKV migration
- [ ] Add `runMigrationsIfNeeded()` to app startup

### Phase 4 — Data integrity (~1 day)

- [ ] Add Zod validation at all MMKV/AsyncStorage read boundaries for complex objects
- [ ] Add schema version constants to all stored data types
- [ ] Add storage size logging (debug only)
- [ ] Write migration tests

### Phase 5 — Voice & notifications (~1 day)

- [ ] Add `requiresOnDeviceRecognition: true` + `contextualStrings` to `SpeechRecognitionService`
- [ ] Add `supportsOnDeviceRecognition()` check with fallback to text input
- [ ] Extend `offlineFallback.ts` with week summary, monthly stats, FIFO fly-out queries
- [ ] Implement notification scheduling budget (60 max, rolling 90-day window)
- [ ] Add `rescheduleShiftReminders` trigger on foreground + shift cycle change

### Phase 6 — Polish & advanced (~2 days)

- [ ] Sync status display in profile/settings
- [ ] "Synced X minutes ago" formatting
- [ ] Register `expo-background-fetch` task after onboarding
- [ ] Offline voice UX states (text fallback, capabilities message)
- [ ] E2E offline test scenarios in Detox
- [ ] TTS offline fallback (text display on Android when no voice pack; Section 18)
- [ ] `resolveAvatarUri` guard when local avatar file missing after reinstall (Section 20)
- [ ] Offline-aware error boundaries on Dashboard, VoiceAssistant, Paywall (Section 32)
- [ ] Storage cleanup scheduler — daily `removeExpired()` + MMKV sweep (Section 30)
- [ ] Dead letter queue classification + user-visible "Retry sync" in Settings (Section 28)

### Phase 7 — Onboarding offline & account management (~2 days)

- [ ] Anonymous Firebase Auth on first launch when offline (Section 26)
- [ ] Account linking flow when user reconnects after anonymous onboarding
- [ ] Purchase flow offline gate — "Connect to subscribe" CTA state (Section 25)
- [ ] `deleteAllLocalData()` + queued remote deletion on account deletion (Section 33)
- [ ] Data export from local storage for GDPR access requests (Section 33)
- [ ] MMKV encryption key via SecureStore (Option A from Section 27) replacing `EXPO_PUBLIC_MMKV_ENCRYPTION_KEY`

### Phase 8 — Smart reminders offline hardening (~1 day)

- [ ] Confirm `SmartReminderOrchestrator` does not gate on `networkService.isOnline()` (Section 19)
- [ ] Fatigue-aware offset falls back to zero when sleep data unavailable offline (Section 19)
- [ ] Reminder settings key `'reminders:settings'` migrated from AsyncStorage to MMKV (Phase 3 work)
- [ ] Orchestrator triggered on app foreground + shift cycle change (no network gate)

---

## 16. Key Files Map

| File                                                  | Role in offline system                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| `src/config/firebase.ts`                              | **Phase 1:** Enable `persistentLocalCache`                       |
| `src/services/firebase/FirebaseService.ts`            | **Phase 1:** Remove `checkNetworkState()` from CRUD              |
| `src/hooks/useSubscription.ts`                        | **Phase 1:** Fix catch block (remove `setIsPro(false)`)          |
| `src/services/ShiftDataService.ts`                    | **Phase 1:** Replace `StorageService` with `asyncStorageService` |
| `src/services/AsyncStorageService.ts`                 | **Phase 1:** Fix serialize/deserialize bug                       |
| `src/services/NetworkService.ts`                      | **Phase 2:** New — NetInfo singleton                             |
| `src/hooks/useNetworkStatus.ts`                       | **Phase 2:** New — React hook for network status                 |
| `src/services/DataSyncService.ts`                     | **Phase 2:** Wire real NetInfo; scope to non-Firestore queue     |
| `src/components/common/OfflineBanner.tsx`             | **Phase 2:** New — subtle offline indicator                      |
| `src/services/MMKVService.ts`                         | **Phase 3:** New — MMKV-backed IStorageService                   |
| `src/utils/storageMigrations.ts`                      | **Phase 3:** New — schema versioning and migration runner        |
| `src/services/SpeechRecognitionService.ts`            | **Phase 5:** Add on-device recognition flags                     |
| `src/utils/offlineFallback.ts`                        | **Phase 5:** Extend with 6 new query patterns                    |
| `src/services/NotificationService.ts`                 | **Phase 5:** Cache push token; scheduling budget                 |
| `src/services/WakeWordService.ts`                     | **No change needed** — OpenWakeWord/Porcupine are fully offline  |
| `src/services/TextToSpeechService.ts`                 | **Phase 6:** Add offline TTS error handling for Android          |
| `src/services/SessionService.ts`                      | **Phase 1:** Fix `getOrCreateDeviceId()` bug; fix offline throws |
| `src/services/VoiceAssistantPersistenceService.ts`    | **Phase 3:** Migrate from AsyncStorage to MMKV                   |
| `src/services/SmartReminderOrchestrator.ts`           | **Phase 8:** Confirm no network gate; AppState trigger           |
| `src/utils/deviceId.ts`                               | **Phase 1:** New — stable device ID persisted to MMKV            |
| `src/utils/dataExport.ts`                             | **Phase 7:** New — GDPR data export from local storage           |
| `src/components/common/OfflineAwareErrorBoundary.tsx` | **Phase 6:** New — granular error boundaries                     |

---

_Document created: 2026-04-06. Updated: 2026-04-07 (pass 2). Reflects Expo SDK 54, React Native 0.81, Firebase JS SDK v11, react-native-purchases v9, expo-notifications, expo-speech-recognition._

---

## 34. OnboardingContext — Persistence & Offline Behaviour

### What it does

`OnboardingContext` (`src/contexts/OnboardingContext.tsx`) is the in-memory store for all shift configuration collected during onboarding. Every call to `updateData()` auto-saves to AsyncStorage at key `'onboarding:data'`. On provider mount it restores from that key, runs `migrateOnboardingDataToV2`, and normalises `startDate`.

### Why this is the most critical offline data path

`OnboardingData` is the single source of truth for:

- The user's `ShiftCycle` (which drives the entire shift calendar)
- `shiftTimes` (which drives smart reminders and `useActiveShift`)
- `avatarUri` (local file path)
- `name`, `occupation`, `company`, `country` (profile display)

If this key is lost or corrupted, the app has no shift data to show. Every offline capability in the app depends on this data being reliably available.

### Current risks

**1. Silent auto-save failures.** `updateData()` calls `asyncStorageService.set('onboarding:data', newData).catch(warn)` — if AsyncStorage fails, the warn goes to the console and the save is silently dropped. The in-memory state is correct but the persisted state is stale. On next cold start, the old data is restored.

**Fix:** Promote storage failures to an observable signal — at minimum track them in a `ref` and expose a `hasPendingPersistenceError` flag so the UI can inform the user.

**2. Two separate reads from the same key.** `MainDashboardScreen` reads `'onboarding:data'` from `asyncStorageService` directly in its `loadData()` function (separate from the `OnboardingContext`). This means there are two consumers of the same AsyncStorage key in the same session. If `updateData()` writes and the Dashboard hasn't re-read yet, the Dashboard shows stale data.

**Fix:** Remove the direct AsyncStorage read from `MainDashboardScreen`. Read exclusively from `useOnboarding().data`. The context is the single source of truth at runtime; AsyncStorage is only for persistence between sessions.

**3. No Zod validation on restore.** `asyncStorageService.get<OnboardingData>('onboarding:data')` casts the stored JSON directly to `OnboardingData` with no schema check. A shape change in `OnboardingData` (e.g. renaming `shiftTimes.nightShift3` to `shiftTimes.threeShiftNight`) silently passes the wrong shape into the context.

**Fix:** Add a Zod schema for `OnboardingData` (or at minimum a `safeParse`-style validator) and run it at restore time. On parse failure, log the error and fall back to `{}` — triggering onboarding re-entry is preferable to runtime type errors throughout the app.

**4. `startDate` normalisation — silent discard.** `normalizeStartDate` discards `startDate` if it cannot be parsed (`Number.isNaN(parsed.getTime())`). If a stored ISO string becomes unparseable (e.g. timezone shift after an OS update producing `"Invalid Date"`), the date is silently dropped. The next `validateData()` call will show a missing field and block the Completion screen.

**5. Phase 3 migration key.** When migrating `'onboarding:data'` from AsyncStorage to MMKV, use `migrateV0toV1()` to copy the value under the new key before deleting from AsyncStorage. The migration must be idempotent — re-running it on an already-migrated install must not clear data.

### The `'onboarding:complete'` flag

`AppNavigator.readOnboardingCompletionStatus()` reads `'onboarding:complete'` from AsyncStorage. This is written by `PremiumCompletionScreen` at the end of onboarding. This flag is the **routing gate** — if it is missing or unreadable, authenticated users are routed back to the Onboarding flow even if they have completed it.

See Section 35 for the routing gate fix.

---

## 35. AppNavigator Routing Gate — Offline Risk

### The critical path

Every time the app starts with an authenticated user, `AppNavigator` calls `readOnboardingCompletionStatus()`:

```typescript
export async function readOnboardingCompletionStatus(): Promise<boolean> {
  const completionFlag = await asyncStorageService.get<boolean>('onboarding:complete');
  if (completionFlag === true) return true;
  if (completionFlag === false) return false;

  // Falls back to reading onboarding:data for legacy installs
  const savedData = await asyncStorageService.get<Record<string, unknown>>('onboarding:data');
  // ...checks name, startDate, patternType, shiftSystem
}
```

### The failure mode

If AsyncStorage is unresponsive (iOS `SQLITE_BUSY`, Android storage permission lost, fresh install where AsyncStorage hasn't been written yet), this function throws. The catch block sets `isOnboardingComplete = false` and routes the user to Onboarding. **A paid user who has completed onboarding is sent back to step 1.**

### Fix — MMKV backup for the routing flag

```typescript
// In PremiumCompletionScreen, after writing to AsyncStorage:
// Write the flag to MMKV synchronously as a backup
mmkvService.set('onboarding:complete', true);

// In readOnboardingCompletionStatus():
export async function readOnboardingCompletionStatus(): Promise<boolean> {
  // Try MMKV first (synchronous, never throws)
  const mmkvFlag = mmkvService.get<boolean>('onboarding:complete');
  if (mmkvFlag === true) return true;

  // Fall through to AsyncStorage (for pre-MMKV installs)
  try {
    const completionFlag = await asyncStorageService.get<boolean>('onboarding:complete');
    if (completionFlag === true) {
      // Migrate to MMKV for next time
      mmkvService.set('onboarding:complete', true);
      return true;
    }
    if (completionFlag === false) return false;
    // ... legacy data check
  } catch {
    // AsyncStorage failed — check if onboarding:data exists in MMKV
    const mmkvData = mmkvService.get<Record<string, unknown>>('onboarding:data');
    if (mmkvData?.patternType && mmkvData?.startDate) return true;
    return false; // unknown state — route to onboarding (safe default)
  }
}
```

### The loading spinner race

`AppNavigator` shows an `ActivityIndicator` while `isOnboardingComplete === null`. On a fast device this is imperceptible. On a cold start with a large AsyncStorage, this can be 200–500ms. Using a synchronous MMKV read makes this check instant — the spinner disappears immediately.

---

## 36. Dashboard Data Loading — Dual Source Problem

### The problem

`MainDashboardScreen` has two separate data sources in the same component:

1. `const { data: onboardingContextData } = useOnboarding()` — the live in-memory context
2. `asyncStorageService.get<OnboardingData>('onboarding:data')` inside `loadData()` — a direct AsyncStorage read

The screen uses `hasOnboardingContextData` to decide whether to use context data or storage data, but it doesn't always stay in sync. The `loadData()` function only overrides the `userData` state with storage data if `isRefresh || !hasOnboardingContextDataRef.current`. This logic is fragile: if the context loads after the storage read (because `OnboardingProvider` hydrates asynchronously), `userData` may show briefly stale data.

### Fix — single source of truth

Remove the direct AsyncStorage read from `MainDashboardScreen`. Source all onboarding data exclusively from `useOnboarding().data`:

```typescript
// Remove:
const [userData, setUserData] = useState<OnboardingData | null>(null);
// and the loadData() function's AsyncStorage read

// Replace with:
const { data: userData } = useOnboarding();
// userData is now always fresh from the context
```

The `OnboardingProvider` already restores from AsyncStorage on mount — the Dashboard does not need to do this independently. The `loading` state can be derived from whether `userData.patternType` is defined.

### Pull-to-refresh behaviour offline

The current `onRefresh` / `loadData(true)` re-reads from AsyncStorage. With the fix above, pull-to-refresh simply re-reads from the context (which is already in memory). The "Synced" banner and haptic feedback still work — they are triggered by `isRefresh`, not by a successful network call. This is correct: the user is refreshing their view of locally computed data.

### The `lastUpdated` timestamp

`lastUpdated` is set on successful `loadData()`. Currently this tracks when the AsyncStorage read succeeded. Post-fix, it should track when the OnboardingContext data was last changed (i.e. `updatedAt` from the persisted `UserProfile` or the most recent `updateData()` call timestamp). Store the last-write timestamp alongside the data in MMKV.

---

## 37. `useActiveShift` — Confirmed Fully Offline

### Status: zero network dependency

`useActiveShift` (`src/hooks/useActiveShift.ts`) is a pure computation hook:

- Inputs: `shiftCycle` (from MMKV/context), `userData` (from context), `liveTick` (60-second counter), `dateStr` (today's date string)
- Outputs: shift type, `isOnShift`, `isOvernightCarryOver`, time display, countdown text
- All computation: `calculateShiftDay`, `getShiftTimesFromData`, string formatting via i18n (bundled)

**No network calls, no AsyncStorage reads, no Firestore reads.** The hook is a function of its inputs only.

### Overnight carry-over — works offline

The overnight carry-over logic (`getEffectiveShift`) reads yesterday's calendar date and checks whether the previous night shift window is still active based on the current wall clock time. This is 100% local and works correctly while offline.

### `liveTick` dependency

The caller (`MainDashboardScreen`) increments `liveTick` every 60 seconds via a `setInterval`. This interval must keep running when offline. Ensure it is not cleared on network status change — it has no network dependency. The 60-second tick is what keeps the countdown text ("4h 30m left in night shift") accurate.

### When `shiftCycle` is null

If `shiftCycle` cannot be built (e.g. `OnboardingData` is incomplete), `useActiveShift` returns `null`. The dashboard must handle this without crashing — render an "Add your shift pattern" empty state, not an error.

---

## 38. Language Persistence & i18n Offline

### i18n translation files — fully offline

All locale JSON files (`src/i18n/locales/{lang}/{namespace}.json`) are bundled in the app binary. There is no remote translation loading. `react-i18next` reads from the bundled resources. i18n is 100% offline.

### Language preference persistence — raw AsyncStorage with non-standard key

`src/i18n/languageDetector.ts` persists the user's language choice at key `@ellie_language` using raw `AsyncStorage.getItem/setItem` — not the `asyncStorageService` wrapper and not the `app:` prefix namespace.

**Problems:**

1. `asyncStorageService.removeExpired()` and `mmkvService.evictExpired()` won't touch this key
2. The migration runner (`storageMigrations.ts`) won't find it via `app:` prefix scan
3. If the user uninstalls and reinstalls, this key survives on Android (AsyncStorage is backed by SQLite which may persist across reinstalls without full data wipe on some Android versions)

**Fix for Phase 3 migration:**

```typescript
// In migrateV0toV1() or a dedicated language migration:
async function migrateLanguageKey(): Promise<void> {
  const stored = await AsyncStorage.getItem('@ellie_language');
  if (stored) {
    mmkvService.set('i18n:language', stored);
    await AsyncStorage.removeItem('@ellie_language');
  }
}

// Update languageDetector.ts to use MMKV:
export const LANGUAGE_KEY = 'i18n:language';

const languageDetector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    const stored = mmkvService.get<string>(LANGUAGE_KEY);
    if (stored) {
      callback(stored);
      return;
    }
    // Fall back to device locale
    const deviceLocale = Localization.getLocales()[0]?.languageTag ?? 'en';
    callback(normalizeLanguage(deviceLocale));
  },
  init: () => {},
  cacheUserLanguage: (language: string) => {
    mmkvService.set(LANGUAGE_KEY, language);
  },
};
```

### RTL language change — `expo-updates.reloadAsync()` is offline-safe

`LanguageContext.tryReloadAppAsync()` calls `expo-updates.reloadAsync()`. This **reloads the currently installed JS bundle** — it does NOT check for or download OTA updates. It works in airplane mode. The `try/catch` wrapper handles the case where `expo-updates` is unavailable (Expo Go, stale native build).

### Arabic RTL direction toggle

When switching to Arabic, `I18nManager.forceRTL(true)` + `reloadAsync()` flips the layout direction. This is a full app reload — not a React re-render. It works offline. The new direction is persisted in the native `I18nManager` state which survives across JS reloads.

The loading overlay (`isApplyingDirectionChange`) shown during the RTL toggle is a spinner over a darkened background. If `reloadAsync()` fails (returns `false`), an Alert is shown instructing the user to restart manually. This is the correct offline-safe fallback.

---

## 39. `usePaywallRecovery` — Raw AsyncStorage Outside the Namespace

### The issue

`usePaywallRecovery` (`src/hooks/usePaywallRecovery.ts`) reads and writes directly to `AsyncStorage` (not `asyncStorageService`) at key `'paywall:declined_at'` — no `app:` prefix, no TTL envelope.

**Problems:**

1. The key is invisible to `asyncStorageService.removeExpired()` — the 7-day expiry is enforced only by the hook's own `Date.now()` check, not by TTL metadata
2. The key is invisible to `asyncStorageService.getAllKeys()` and won't be migrated by `storageMigrations.ts` pattern scans
3. If the user reinstalls on Android, this key may survive (same issue as `@ellie_language`)
4. There is no encryption — the declined timestamp is stored in plaintext (acceptable, it's not sensitive)

### Fix for Phase 3

Migrate to MMKV with explicit TTL:

```typescript
// Before:
await AsyncStorage.getItem(PAYWALL_DECLINED_KEY);

// After (MMKV synchronous, with built-in TTL):
export const PAYWALL_DECLINED_KEY = 'paywall:declined_at';

// In AhaMomentScreen when user taps "Continue with Limited Access":
mmkvService.set(PAYWALL_DECLINED_KEY, Date.now(), RECOVERY_WINDOW_MS); // 7-day TTL baked in

// In usePaywallRecovery:
const declinedAt = mmkvService.get<number>(PAYWALL_DECLINED_KEY);
if (!declinedAt) {
  setShouldNudge(false);
  return;
}
const elapsed = Date.now() - declinedAt;
setShouldNudge(elapsed >= MIN_DELAY_MS); // TTL already handles 7-day expiry
```

With MMKV TTL, the `elapsed > RECOVERY_WINDOW_MS` branch and the `removeItem` call for expiry are no longer needed — MMKV evicts on read automatically.

---

## 40. `SmartReminderSettingsService` — Local Persistence Now Unified

### What it does

`SmartReminderSettingsService` (`src/services/SmartReminderSettingsService.ts`) now persists reminder settings and the anonymous reminder user ID through the shared app storage wrapper, with legacy AsyncStorage migration on read.

### The local user ID fallback

`resolveReminderUserId(firebaseUid)` still uses:

- the Firebase UID when authenticated
- a persisted anonymous reminder user ID when not authenticated

This is now stable across sessions on the same install, but it is still an app-local anonymous ID rather than a cross-reinstall or cross-device identity. That is acceptable for the current reminder feature because reminders are device-local.

### Settings JSON.parse without validation

`readLocalSettingsRecord()` calls `JSON.parse(raw)` and casts to `Partial<SmartReminderSettings>`. If the stored JSON is a valid JSON string but has an unexpected shape (e.g. a new field added in an app update, or an old field removed), `mergeSettings()` silently uses defaults for the missing fields. This is actually defensively correct for forward/backward compatibility — `DEFAULT_SMART_REMINDER_SETTINGS` fills gaps. No Zod needed here.

### Remaining gap

The remaining Smart Reminders storage gap is not correctness-related:

- the reminder settings path is still async through the shared storage layer
- there is no dedicated synchronous reminder settings store yet

That is a performance/architecture concern, not a broken offline reminder path.

---

## 41. `useSmartReminders` — Native `localStorage` Crash Fixed, MMKV Migration Still Pending

### Current state

`src/hooks/useSmartReminders.ts` still instantiates `ShiftDataService` from `getStorageService()`:

```typescript
const shiftDataService = new ShiftDataService(getStorageService());
const orchestrator = new SmartReminderOrchestrator(shiftDataService);
```

This is **no longer a correctness bug**. `src/services/StorageService.ts` now resolves to:

- `globalThis.localStorage` on web only
- `react-native-mmkv` on native when available
- AsyncStorage fallback on native when the current build does not include MMKV yet

So the old device-side `localStorage` crash is fixed.

### What is still left out

The remaining gap is architectural, not functional:

1. Smart reminder shift caching still runs through the generic async storage layer rather than a dedicated synchronous shift cache.
2. The current path is correct and offline-safe, but it does not yet take full advantage of the synchronous MMKV startup/read profile.
3. Phase 3 still needs a dedicated MMKV-backed `ShiftDataService` path if the reminder subsystem should become fully synchronous at startup.

**Impact today:** reminder scheduling works correctly offline; the remaining cost is performance and storage-layer inconsistency, not broken reminders.

### AppState trigger — confirmed working

`useSmartReminders` already registers an `AppState` listener at line 134–143 and calls `run()` on every `'active'` transition. The fingerprint check (`lastSuccessfulFingerprintRef`) prevents redundant reschedules when nothing has changed. This is correct and requires no changes.

### Fingerprint includes all relevant fields

The fingerprint in `buildReminderFingerprint()` includes: `userId`, `timeZone`, `language`, `settings`, `name`, `shiftSystem`, `rosterType`, `patternType`, `startDate`, `phaseOffset`, `customPattern`, `fifoConfig`, `shiftTimes`. If any of these change (e.g. user edits their shift pattern in Profile), the fingerprint changes and a reschedule runs. This is correct behaviour and fully offline.

---

## 42. OTA Updates (`expo-updates`) Offline

### What happens at startup when offline

If `expo-updates` is configured and the app starts with no network:

1. The SDK attempts to check for an update at the configured update URL
2. The check fails (network timeout or immediate error)
3. The currently installed bundle continues to run — **no crash, no degradation**
4. If there is a previously downloaded update pending, it is applied at startup regardless of network state

This is correct default behaviour. No code changes needed.

### The `UpdatesProvider` loading state

If you show a loading screen while `expo-updates` checks for an update, ensure it has a timeout. The default `expo-updates` check timeout is 10 seconds. On a mine site with 2G, this can block the app startup screen for 10 full seconds. Consider:

```typescript
// In app.config.js / expo config:
expo: {
  updates: {
    fallbackToCacheTimeout: 3000, // 3-second timeout before falling back to cached bundle
  }
}
```

This means: if the update check doesn't complete within 3 seconds, launch with the current bundle immediately. The update is applied on the next launch.

### `reloadAsync()` vs update check

`expo-updates.reloadAsync()` (used in `LanguageContext`) reloads the currently installed JS bundle. It does **not** trigger a new update check. It is synchronous-ish from the app's perspective and works offline.

### Critical-path update delivery for mine sites

If you push a breaking bug fix and workers at a mine site with no signal can't receive the update, they're stuck. Mitigation:

1. Use `fallbackToCacheTimeout: 3000` so the app doesn't hang waiting for the check
2. Set up meaningful update rollout channels (staging → production) with gradual rollout so bugs are caught before they reach all mine-site workers
3. Consider: for safety-critical fixes (e.g. wrong shift date shown), push a notification to trigger foreground app launch which will attempt the update check

---

## 43. AsyncStorage Key Namespace Fragmentation

### The problem

Ellie's codebase currently writes to AsyncStorage using at least **four different key patterns** with no unified namespace:

| Pattern              | Keys                                                                                                            | Who writes it                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `app:{key}`          | `app:onboarding:data`, `app:sync:queue`, etc.                                                                   | `asyncStorageService` (wraps with `KEY_PREFIX = 'app:'`)     |
| Raw `app:` keys      | `app:install_time`                                                                                              | Onboarding screens using raw `AsyncStorage`                  |
| `@ellie_{key}`       | `@ellie_language`                                                                                               | `languageDetector.ts` raw `AsyncStorage`                     |
| Bare keys            | `paywall:declined_at`, `notifications:soft_declined`, `checklist:ask_ellie_done`, `sync:queue` (without prefix) | Various hooks/services using raw `AsyncStorage`              |
| Smart reminder keys  | `reminder:settings`, `reminder:local-user-id`                                                                   | `SmartReminderSettingsService` raw `AsyncStorage`            |
| Voice assistant keys | `app:voice-assistant:history:v1`                                                                                | `VoiceAssistantPersistenceService` via `asyncStorageService` |

Note the inconsistency: `VoiceAssistantPersistenceService` uses `asyncStorageService` which adds the `app:` prefix, so stored keys are actually `app:voice-assistant:history:v1`. But the service itself declares the keys without the `app:` prefix — the prefix is added by the wrapper. This is correct but confusing.

### Why this matters for offline

1. **Migration runner can't find bare keys.** `storageMigrations.ts` scans by `app:` prefix — it misses `@ellie_language`, `paywall:declined_at`, `notifications:soft_declined`, `checklist:ask_ellie_done`, and reminder keys entirely. Phase 3 migration will be incomplete unless these are explicitly included.

2. **`removeExpired()` misses bare keys.** Only `app:*` keys get TTL metadata (from `asyncStorageService.setWithTTL`). Bare keys that implement expiry via the data payload (like `paywall:declined_at`) only evict when the hook reads them and notices they're stale.

3. **`AsyncStorage.clear()` in account deletion** wipes everything including `@ellie_language` and preference keys that belong to the device (not the user). After account deletion and re-registration on the same device, the language should be preserved — it was the device's preference, not the user's account data.

4. **Raw `app:` keys are especially dangerous.** `app:install_time` looks like an `asyncStorageService` key but is written without the wrapper's metadata semantics. This makes the prefix appear unified while still bypassing the storage contract, which is how the `app:app:install_time` read bug happened.

### Fix — unified key registry

Create `src/constants/storageKeys.ts` as the single source of truth:

```typescript
// All storage keys in one place
export const STORAGE_KEYS = {
  // AsyncStorage (via asyncStorageService — prefixed with 'app:' automatically)
  ONBOARDING_DATA: 'onboarding:data',
  ONBOARDING_COMPLETE: 'onboarding:complete',
  SYNC_QUEUE: 'sync:queue',
  INSTALL_TIME: 'install:startedAt',

  // AsyncStorage (raw — no prefix — to be migrated to MMKV in Phase 3)
  LANGUAGE: '@ellie_language', // migrate to MMKV as 'i18n:language'
  PAYWALL_DECLINED: 'paywall:declined_at', // migrate to MMKV as 'paywall:declined_at'
  REMINDER_SETTINGS: 'reminders:settings', // migrate to MMKV as 'reminders:settings'
  REMINDER_LOCAL_USER_ID: 'reminders:local-user-id', // migrate to MMKV as 'reminders:localUserId'
  NOTIFICATIONS_SOFT_DECLINED: 'notifications:soft_declined',
  CHECKLIST_ASK_ELLIE_DONE: 'checklist:ask_ellie_done',

  // MMKV (after Phase 3 migration)
  ONBOARDING_COMPLETE_MMKV: 'onboarding:complete',
  SUBSCRIPTION_IS_PRO: 'subscription:isPro',
  DEVICE_ID: 'device:id',
  LANGUAGE_MMKV: 'i18n:language',
  SCHEMA_VERSION: 'app:schemaVersion',
} as const;
```

This makes the migration runner's job explicit:

```typescript
// In storageMigrations.ts:
const RAW_ASYNCSTORAGE_KEYS_TO_MIGRATE = [
  { from: 'app:install_time', to: STORAGE_KEYS.INSTALL_TIME },
  { from: STORAGE_KEYS.LANGUAGE, to: STORAGE_KEYS.LANGUAGE_MMKV },
  { from: STORAGE_KEYS.PAYWALL_DECLINED, to: 'paywall:declined_at' },
  { from: STORAGE_KEYS.REMINDER_SETTINGS, to: 'reminders:settings' },
  { from: STORAGE_KEYS.REMINDER_LOCAL_USER_ID, to: 'reminders:localUserId' },
  { from: STORAGE_KEYS.NOTIFICATIONS_SOFT_DECLINED, to: 'notifications:soft_declined' },
  { from: STORAGE_KEYS.CHECKLIST_ASK_ELLIE_DONE, to: 'checklist:ask_ellie_done' },
];
```

### Account deletion — preserve device-level keys

When deleting a user account, do NOT call `AsyncStorage.clear()`. Instead, explicitly list user-data keys and clear only those. Device-level preferences (language, device ID, push token) persist across account deletion:

```typescript
const USER_DATA_KEYS_TO_DELETE = [
  STORAGE_KEYS.ONBOARDING_DATA,
  STORAGE_KEYS.ONBOARDING_COMPLETE,
  STORAGE_KEYS.PAYWALL_DECLINED,
  STORAGE_KEYS.REMINDER_SETTINGS,
  // voice history, session data, etc.
];
// Do NOT delete: LANGUAGE_KEY, DEVICE_ID, PUSH_TOKEN
```

---

## 44. `SubscriptionContext` — The Real File with the Bug

### Clarification on file location

The RevenueCat catch block bug documented in Section 9 is in **`src/contexts/SubscriptionContext.tsx`** lines 75–79, not in `src/hooks/useSubscription.ts`. The context exports `useSubscription = () => useContext(SubscriptionContext)`. Both `src/hooks/useSubscription.ts` (which also exports a `useSubscription`) and components that import directly from the context use the same underlying `SubscriptionContext`.

The specific bug line:

```typescript
.catch(() => {
  if (isMounted) {
    setIsPro(false);  // ← this line must be removed
  }
})
```

The `setIsLoading(false)` in `.finally()` is correct and must be kept. Only the `setIsPro(false)` in `.catch()` is wrong.

### `addCustomerInfoUpdateListener` — works offline

`Purchases.addCustomerInfoUpdateListener(customerInfoListener)` fires whenever RevenueCat receives updated customer info — including when coming back online after the SDK refreshes its cache. This listener is the correct place to update `isPro` reactively. It does not require the initial `getCustomerInfo()` call to succeed.

### `restorePurchases` — always requires network

`Purchases.restorePurchases()` contacts the App Store to verify receipts. It always requires network. The `usePaywallRecovery` nudge and the "Restore purchases" button in `PaywallScreen` should both be gated on `networkService.isOnline()`.

That gate should not live only in the button handler. `SubscriptionContext.restorePurchases()` itself currently always calls `Purchases.restorePurchases()` and swallows the failure. Any future caller outside `PaywallScreen` can therefore still hit the network-only path while offline. Put the network guard in the context/service layer, and let UI callers react to a typed `"offline"` result instead of a silent catch.

### `getOfferings()` — offline paywall metadata gap

`PaywallScreen` calls `Purchases.getOfferings()` on mount. If that fetch fails (offline, RevenueCat unavailable, App Store account issue), `annualPackage`, `monthlyPackage`, and `weeklyPackage` are all set to `null`, but the screen still renders hardcoded fallback prices and plan cards.

That creates a misleading offline state:

1. The user sees what looks like live pricing
2. The CTA is disabled because `selectedPackage` is `null`
3. There is no explicit message saying plan metadata could not be loaded

This is an offline UX bug, not just a purchase-flow bug. The paywall must either:

- cache the last successful offerings snapshot locally (price string, package identifier, trial metadata) and render that read-only snapshot offline, or
- show an explicit offline state like "Connect to load plans" instead of rendering interactive-looking plans with dead purchase behavior

Do not let the paywall silently fall back to hardcoded prices while the underlying package objects are missing.

---

## 45. `useSmartReminders` — `StorageService` Bug Propagation

### The same instance is used module-wide

Because `shiftDataService` and `orchestrator` are declared at module scope in `useSmartReminders.ts` (outside the hook function), they are shared across all React component instances. This means:

1. Only one `StorageService` (localStorage) instance exists for all smart reminder scheduling
2. After Phase 1 fix (replacing with `asyncStorageService`), all reminders will share one correctly-backed service
3. After Phase 3 (MMKV), the singleton should be replaced with an MMKV-backed `ShiftDataService`

The singleton pattern here is intentional and correct — just fix the underlying storage dependency.

### `isRunningRef` prevents concurrent reschedules

The `isRunningRef` guard prevents concurrent `run()` calls. If the AppState fires `'active'` while a reschedule is already in progress (e.g. user quickly backgrounds and foregrounds), the second call is a no-op. This is correct offline behaviour — no network state involved.

---

## 46. Navigation & Deep Link Offline

### AppNavigator routing is fully local

All routing decisions in `AppNavigator`, `AuthNavigator`, `OnboardingNavigator`, and `MainTabNavigator` are based on:

- Firebase Auth state (cached in memory by the SDK after first auth)
- AsyncStorage flags (`onboarding:complete`, `onboarding:data`)
- `requiresEmailVerification()` — based on `user.emailVerified` and `user.providerData` — both from the cached Firebase Auth user object

None of these require a network call at runtime. After initial sign-in (which does require network), all subsequent navigation decisions are offline-capable.

### Deep links while offline

If the user receives a deep link (e.g. from a notification tap) while offline:

- Local notifications (shift reminders) deep-link to the Dashboard tab — fully routable offline
- Remote push notifications with deep link payloads — the device must receive the push to process the link; if offline, the push is queued by the OS and delivered when connectivity returns

### Email verification redirect

`AppNavigator` checks `requiresEmailVerification()` and routes email/password users who haven't verified their email to `EmailVerificationScreen`. The resend path requires network.

There is a second call site too: `SignUpScreen` sends a verification email immediately after successful sign-up via `AuthContext.sendEmailVerification()`. That means the offline/network guard should live in `AuthContext` or `AuthService`, not only in the button handler on `EmailVerificationScreen`.

Gate it centrally:

```typescript
const sendEmailVerification = async () => {
  if (!networkService.isOnline()) {
    Alert.alert('No connection', 'Connect to the internet to resend the verification email.');
    return;
  }
  await authService.sendEmailVerification();
};
```

Then both:

- `EmailVerificationScreen.handleResend()`
- `SignUpScreen` post-sign-up verification

inherit the same offline-safe behavior.

---

## 47. Install-Time Marker — Raw Key + Double-Prefix Read Bug

### The current code path is inconsistent

Ellie currently tracks install/onboarding start time through three different call sites:

- `src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`
  - writes raw `AsyncStorage` key `'app:install_time'`
- `src/screens/onboarding/premium/PremiumAhaMomentScreen.tsx`
  - reads raw `AsyncStorage` key `'app:install_time'`
- `src/screens/onboarding/premium/PremiumCompletionScreen.tsx`
  - reads `asyncStorageService.get<string>('app:install_time')`

That last call is wrong. `asyncStorageService.get('app:install_time')` prepends `app:` internally, so it looks up:

```text
app:app:install_time
```

The actual raw key written by `PremiumWelcomeScreen` is:

```text
app:install_time
```

So Completion misses the value entirely.

### Why this matters offline

1. `time_to_complete_seconds` / install-duration analytics can be null, zero, or inconsistent across onboarding screens.
2. The bug is silent offline because there is no server-side correction path; the missing value is just treated as absent.
3. The raw write bypasses `asyncStorageService` metadata and makes later MMKV migration more error-prone.

### Fix

Unify this into one key and one storage API:

```typescript
// src/constants/storageKeys.ts
INSTALL_TIME: 'install:startedAt',
```

Then:

- write with `asyncStorageService.set('install:startedAt', isoString)` or MMKV after Phase 3
- read with the same wrapper everywhere
- add a one-time migration from raw `'app:install_time'`

Until that is done, onboarding timing analytics remain partially unreliable.

---

## 48. `notifications:soft_declined` — Write-Only Device Flag

### The current code writes a flag that nothing reads

`src/screens/onboarding/premium/PremiumCompletionScreen.tsx` writes:

```typescript
AsyncStorage.setItem('notifications:soft_declined', 'true');
```

There is currently no corresponding reader anywhere in the app.

### Why this matters offline

1. It is a bare AsyncStorage key outside the namespaced storage model.
2. It is invisible to migrations, TTL cleanup, and any future MMKV move unless explicitly listed.
3. The UX intent is not actually implemented: the app cannot suppress or tailor future notification prompts from this flag because no runtime path reads it.
4. Account deletion semantics are undefined: because it is device-scoped in intent but user-scoped in name, the wrong cleanup policy is easy to apply later.

### Fix

Choose one of two paths:

1. **Make it real**
   - add it to `storageKeys.ts`
   - decide whether it is device-level or user-level
   - read it in the notification-priming flow to suppress repeat prompts
   - migrate it to MMKV in Phase 3 if it is device-level

2. **Delete it**
   - remove the write entirely if the product does not actually use the flag

Until one of those happens, this key is orphaned state and should be treated as an offline-storage gap.

---

## 49. Auth Entry Screens — Network-Required Paths Still Ungated

### The current code paths

The auth UI still triggers several network-required Firebase / provider operations directly from the screens and context:

- `src/screens/auth/SignInScreen.tsx`
  - email/password sign-in
  - Google sign-in
  - Apple sign-in
- `src/screens/auth/SignUpScreen.tsx`
  - email/password account creation
  - Google sign-up
  - Apple sign-up
  - post-sign-up verification email
- `src/screens/auth/ForgotPasswordScreen.tsx`
  - password reset email
- `src/contexts/AuthContext.tsx`
  - `sendPasswordReset`
  - `sendEmailVerification`
  - `signInWithGoogle`
  - `signInWithApple`

All of those require network. Right now they rely on Firebase/provider errors bubbling back after the user taps.

### Why this matters offline

1. The current UX is reactive, not offline-aware. The user can tap through a full submit flow before getting a failure.
2. Social providers are especially bad offline:
   - `GoogleSignin.hasPlayServices()` / `GoogleSignin.signIn()`
   - `AppleAuthentication.signInAsync()`
     both fail late and opaquely when there is no connection.
3. Password-reset and resend-verification should not pretend to be available offline.
4. These flows are not part of the offline-first runtime, but they still need explicit offline UX so the app feels intentional rather than broken.

### Fix

Centralize a lightweight network gate in `AuthContext` or `AuthService`:

```typescript
function requireOnlineForAuthAction(): void {
  if (!networkService.isOnline()) {
    throw new NetworkError('Internet connection required', 'AUTH_NETWORK_REQUIRED');
  }
}
```

Apply it before:

- `signUpWithEmail`
- `signInWithEmail`
- `signInWithGoogle`
- `signInWithApple`
- `sendPasswordResetEmail`
- `sendEmailVerification`

Then map that error to explicit UI copy:

- `Sign in requires internet`
- `Creating an account requires internet`
- `Password reset requires internet`
- `Email verification resend requires internet`

This keeps all auth entry points consistent and prevents each screen from inventing its own offline behavior.

---

## 50. `checklist:ask_ellie_done` — Dead Raw Key from Removed UI

### The key still exists in code

`src/components/dashboard/OnboardingChecklist.tsx` still writes:

```typescript
const ASK_ELLIE_STORAGE_KEY = 'checklist:ask_ellie_done';
```

But the component is no longer mounted anywhere in the current app flow.

### Why this matters offline

1. It is another raw AsyncStorage key outside the unified storage model.
2. Because the component is effectively dead, the key is now dead state too.
3. Dead keys complicate migration design:
   - if you migrate them, you preserve useless state forever
   - if you ignore them, you leave garbage behind in old installs
4. This is exactly the kind of leftover offline state that causes storage systems to drift over time.

### Fix

Choose one:

1. **Delete the dead feature**
   - remove `OnboardingChecklist.tsx`
   - do not migrate `checklist:ask_ellie_done`
   - optionally clean it up once during a migration sweep

2. **Restore the feature intentionally**
   - mount the checklist again
   - move the key into the unified registry
   - define whether it is device-level or user-level

If the checklist is not coming back, the correct move is deletion plus one-time cleanup.

---

## Updated Implementation Phases — Additions from Pass 2

**Phase 1 additions (critical bugs):**

- [ ] Remove direct AsyncStorage read from `MainDashboardScreen.loadData()` — use `useOnboarding().data` exclusively (Section 36)
- [ ] Gate `sendEmailVerification()` on `networkService.isOnline()` (Section 46)
- [ ] Gate `SubscriptionContext.restorePurchases()` itself on `networkService.isOnline()`; keep the button/UI gate too (Section 44)
- [ ] Fix `SubscriptionContext` catch block — confirm line 76 `setIsPro(false)` is removed (Section 44)
- [ ] Unify install-time storage across Welcome, AhaMoment, and Completion; remove the `app:app:install_time` read miss (Section 47)
- [ ] Remove or formalise the write-only `notifications:soft_declined` flag (Section 48)
- [ ] Add centralized offline gating for auth entry actions: sign-in, sign-up, social auth, password reset, verification resend (Section 49)
- [ ] Delete or formally restore the dead `OnboardingChecklist` flow and clean up `checklist:ask_ellie_done` (Section 50)
- [ ] Cache RevenueCat offerings locally or show an explicit "Connect to load plans" offline state in `PaywallScreen` (Section 44)

**Phase 3 additions (MMKV migration):**

- [ ] Migrate `@ellie_language` → `i18n:language` in MMKV; update `languageDetector.ts` (Section 38)
- [ ] Migrate `paywall:declined_at` → MMKV with built-in TTL; update `usePaywallRecovery` (Section 39)
- [ ] Migrate `SmartReminderSettingsService` keys → MMKV; use `getDeviceId()` for local user ID (Section 40)
- [ ] Create `src/constants/storageKeys.ts` as unified key registry (Section 43)
- [ ] Add MMKV backup for `'onboarding:complete'` routing flag; update `readOnboardingCompletionStatus()` (Section 35)
- [ ] Migrate `OnboardingContext` persistence from AsyncStorage to MMKV for `'onboarding:data'` (Section 34)
- [ ] Move smart-reminder shift caching from AsyncStorage-backed `StorageService` to MMKV-backed `ShiftDataService` (Section 41)

**Phase 5 additions:**

- [ ] Add Zod validation at `OnboardingContext` restore boundary (Section 34)
- [ ] Make `MainDashboardScreen` `lastUpdated` timestamp derived from MMKV write timestamp (Section 36)

## Updated Key Files Map — Additions from Pass 2

| File                                                         | Role in offline system                                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `src/contexts/OnboardingContext.tsx`                         | **Phase 3:** Migrate persistence to MMKV; add Zod validation on restore                       |
| `src/navigation/AppNavigator.tsx`                            | **Phase 3:** MMKV backup for `onboarding:complete` routing flag                               |
| `src/screens/main/MainDashboardScreen.tsx`                   | **Phase 1:** Remove direct AsyncStorage read; use context exclusively                         |
| `src/hooks/useActiveShift.ts`                                | **No change needed** — pure computation, fully offline                                        |
| `src/i18n/languageDetector.ts`                               | **Phase 3:** Migrate `@ellie_language` to MMKV                                                |
| `src/hooks/usePaywallRecovery.ts`                            | **Phase 3:** Migrate to MMKV with built-in TTL                                                |
| `src/services/SmartReminderSettingsService.ts`               | **Phase 3:** Migrate raw AsyncStorage keys to MMKV                                            |
| `src/hooks/useSmartReminders.ts`                             | **Phase 3:** Move shift cache to MMKV-backed `ShiftDataService`                               |
| `src/contexts/SubscriptionContext.tsx`                       | **Phase 1:** Remove `setIsPro(false)` from catch; gate `restorePurchases()` offline           |
| `src/constants/storageKeys.ts`                               | **Phase 3:** New — unified key registry for all storage keys                                  |
| `src/screens/auth/EmailVerificationScreen.tsx`               | **Phase 2:** Gate resend on `networkService.isOnline()`                                       |
| `src/screens/auth/SignInScreen.tsx`                          | **Phase 2:** Offline-aware gating and copy for all sign-in actions                            |
| `src/screens/auth/SignUpScreen.tsx`                          | **Phase 2:** Offline-aware gating for account creation + post-sign-up verification            |
| `src/screens/auth/ForgotPasswordScreen.tsx`                  | **Phase 2:** Offline-aware gating for password reset                                          |
| `src/contexts/AuthContext.tsx`                               | **Phase 2:** Central auth network gate for all user-facing auth actions                       |
| `src/screens/subscription/PaywallScreen.tsx`                 | **Phase 2:** Gate purchase/restore flows and handle offline `getOfferings()` state            |
| `src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`    | **Phase 1:** Stop raw `app:install_time` writes; use unified key                              |
| `src/screens/onboarding/premium/PremiumAhaMomentScreen.tsx`  | **Phase 1:** Read unified install-time key only                                               |
| `src/screens/onboarding/premium/PremiumCompletionScreen.tsx` | **Phase 1:** Fix double-prefix install-time read; remove or use `notifications:soft_declined` |
| `src/components/dashboard/OnboardingChecklist.tsx`           | **Phase 1:** Delete dead storage key or reintroduce the feature intentionally                 |

## 17. Wake Word Detection Offline

### Status: fully offline — no changes needed

Both wake word providers in Ellie are 100% offline:

**OpenWakeWord** (default, `src/services/openWakeWordNative.ts`):

- Runs a TFLite/ONNX model entirely on-device — no network call of any kind
- The model files (`.onnx`, melspectrogram, embedding) are bundled with the app binary
- Detection latency is ~100–200ms on modern iPhones, unaffected by connectivity

**Porcupine** (fallback, `src/services/wakeWordNative.ts`):

- Also runs fully on-device — processes audio frames in the native layer
- The `accessKey` is validated against the locally bundled `.ppn` model file — **not a network call**
- `activation_limit` errors in `WakeWordError` mean the key has been used too many times against the model, not that a network check failed

### What to document/handle

**`auth_failed` errors while offline:** These indicate the Porcupine access key is invalid against the bundled model — not a network connectivity issue. Do not retry on reconnection. Disable for session and fall back to tap-to-talk as `WakeWordService` already does.

**Wake word resume on app foreground:** When the app returns to foreground after being backgrounded:

```typescript
// In VoiceAssistantService or the screen that owns wake word:
AppState.addEventListener('change', async (nextState) => {
  if (nextState === 'active' && wakeWordService.getIsInitialized()) {
    await wakeWordService.start(); // resume listening
  } else if (nextState === 'background') {
    await wakeWordService.stop(); // release microphone
  }
});
```

This is network-independent and must work the same offline.

**Microphone permission offline:** Permission is granted/denied at the OS level — no network needed. The permission state is cached by the OS. If permission was granted before going offline, wake word works offline seamlessly.

---

## 18. Text-to-Speech Offline

### Status: fully offline — confirmed

`TextToSpeechService` uses `expo-speech`, which wraps:

- **iOS:** `AVSpeechSynthesizer` — built into the OS, no network. Voices are bundled.
- **Android:** Android `TextToSpeech` API — uses the device's installed TTS engine (typically Google TTS). The default Google TTS voice on Android requires network for some languages. The device must have an offline TTS voice pack installed for reliable offline use.

### iOS — no action required

`AVSpeechSynthesizer` works offline without exception. All system voices (Siri voices, standard voices) work offline.

### Android — offline voice packs

Android users may not have offline TTS voices installed. Detect and inform:

```typescript
// When about to speak, check if TTS is network-dependent:
// expo-speech doesn't expose an "isOfflineCapable" check directly.
// Best approach: attempt speech with a timeout.
// If the device TTS engine fails offline, expo-speech calls onError.

async function speakWithOfflineFallback(text: string, options: TTSOptions): Promise<void> {
  if (!networkService.isOnline()) {
    // On Android offline with no local voice pack, TTS may fail silently.
    // Log the attempt — if onError fires, surface a toast rather than crashing.
    await textToSpeechService.speak(text, {
      ...options,
      onError: (err) => {
        logger.warn('TTS failed offline — no local voice pack', { error: err.message });
        // Fallback: display the response as text instead of speaking it
        options.onError?.(err);
      },
    });
    return;
  }
  await textToSpeechService.speak(text, options);
}
```

### Voice assistant TTS — offline response path

When `offlineFallback.ts` handles a query offline, the response text must be spoken using TTS (not just displayed). This already works on iOS. The full offline voice assistant loop is:

```
[Wake word detected] → [Speech recognition: on-device] → [offlineFallback.ts: response text] → [TTS: AVSpeechSynthesizer] → [spoken response]
```

All four steps function with zero network on iOS. This is the key differentiator for Ellie vs. competitors.

---

## 19. Smart Reminders Offline

### The planned system (from `ellie-smart-shift-reminders.md`)

The `SmartReminderOrchestrator` → `SmartReminderService` → `NotificationService` pipeline computes reminder trigger times from:

- `ShiftDays` (computed from `ShiftCycle` — pure local math)
- `shiftTimes` (stored in `OnboardingData` → MMKV)
- `SmartReminderSettings` (persisted to `'reminders:settings'` in AsyncStorage)
- Sleep insights (optional, enhancement only)

**The entire smart reminder system is offline-capable by design.** All inputs are local. All outputs are locally scheduled notifications.

### What must stay offline-safe

**Settings persistence key:** `'reminders:settings'` in AsyncStorage. Migrate to MMKV in Phase 3.

**Orchestrator trigger:** Must run on:

- App foreground (`AppState 'active'`)
- Shift cycle change
- `shiftTimes` change (post-onboarding settings update)
- Network reconnect (no-op — smart reminders don't need network)

Do **not** gate the orchestrator on `networkService.isOnline()`. It must schedule reminders regardless.

**`SmartReminderService.buildSchedule()` must remain a pure function** — no async, no I/O, no network. Takes data in, returns `ReminderEvent[]` out. This is correct per the design and must not drift.

**The 14-day scheduling window** defined in the reminders spec fits within the iOS 64-notification budget:

- 14 days × max ~4 reminders/day (prep, commute, pre-briefing, post-shift) = 56 reminders
- Add engagement nudges (4 slots) = 60 total — just within budget
- FIFO travel day reminders are infrequent; safe

**FIFO fly-out/fly-in reminders** depend on `fifoConfig.flyInDay` / `flyOutDay` from `ShiftCycle` — stored locally. Fully offline.

**Fatigue-aware adjustment** (if `fatigueAwareReminders: true`): the +30min early trigger requires sleep data. If sleep data source is network-dependent (HealthKit/Google Fit sync), the adjustment falls back to zero when offline. The base reminder still fires. Never skip a reminder because fatigue data is unavailable.

```typescript
// In SmartReminderService.buildSchedule():
const fatigueOffsetMs =
  sleepInsights?.highFatigue && settings.fatigueAwareReminders
    ? 30 * 60 * 1000 // +30 min earlier
    : 0; // no adjustment if offline or sleep data unavailable — safe default
```

**Quiet hours** are local settings — no network dependency. Critical reminders (safety classification) bypass quiet hours as per the spec. This is correct and must remain network-independent.

---

## 20. Avatar & File System Offline

### Status: already offline — avatar is local file storage

`AvatarService` copies picked images to `FileSystem.documentDirectory/avatars/profile-avatar.jpg` — this is the app's permanent local document storage. There is no Firebase Storage upload of the avatar. The URI stored in `OnboardingData.avatarUri` is a `file://` local path.

**This means avatars are 100% offline-capable and cross-device sync of avatars does not currently exist.** This is the correct design for now.

### What to watch for

**App reinstall:** `documentDirectory` is **not** backed up by default on Android (iOS backs it up to iCloud if the user has iCloud backup enabled). On reinstall/device migration, the avatar file is lost. The `avatarUri` in AsyncStorage will point to a non-existent file. Handle gracefully:

```typescript
// When reading avatarUri from storage, verify the file exists:
import * as FileSystem from 'expo-file-system/legacy';

async function resolveAvatarUri(storedUri: string | null): Promise<string | null> {
  if (!storedUri) return null;
  if (storedUri.startsWith('http')) return storedUri; // remote URL, no check needed
  try {
    const info = await FileSystem.getInfoAsync(storedUri);
    return info.exists ? storedUri : null; // return null if local file missing
  } catch {
    return null;
  }
}
```

**If Firebase Storage upload is added in future:** queue the upload in `DataSyncService` when offline. Local file continues to render while upload is pending. Never replace the local file URI with the remote URL until the upload succeeds.

---

## 21. Session Service Offline

### Current status

`SessionService` (`src/services/SessionService.ts`) is now locally mirrored and offline-safe:

1. Sessions are persisted locally per session ID and indexed per user.
2. `loadSession()` falls back to the local mirror when Firestore reads fail.
3. `getTotalSessions()` and `getAverageSessionDuration()` return local values when Firestore queries fail.
4. `cleanupOldSessions()` now applies local cleanup first and only treats remote deletion as best-effort.
5. `getOrCreateDeviceId()` now persists a stable device ID in app storage.
6. Session events are capped at 500 per session document.

The remaining limitation is architectural rather than functional: cross-device session analytics still depend on Firestore availability. On a fully offline device, analytics reflect the locally mirrored session set on that device.

### Session analytics — non-critical offline

Session analytics (total sessions, average duration) are enhancement data, not core functionality. These screens should show "Sync needed" or cached/placeholder values when offline rather than error states.

---

## 22. Voice Assistant Persistence Offline

### Status: already offline — uses AsyncStorage directly

`VoiceAssistantPersistenceService` (`src/services/VoiceAssistantPersistenceService.ts`) persists to `asyncStorageService` (not Firestore). It is fully offline. Key observations:

**Versioned keys** (`voice-assistant:history:v1`, `:last-error:v1`, etc.) — this is the correct pattern. When the shape of `VoiceMessage` or `VoiceAssistantError` changes, bump the version suffix and the old keys are ignored (and eventually cleaned up).

**Validation at deserialization** — `isValidVoiceMessage()`, `isValidVoiceAssistantError()`, etc. are already implemented inline. This is exactly the Zod-at-boundary pattern from Section 12, done manually. Consider migrating to Zod for consistency when the rest of the codebase adopts it, but the manual validators are correct today.

**Migration needed in Phase 3:** Move from `asyncStorageService` to `mmkvService` for synchronous reads. The voice assistant history is read on every mount of the voice assistant sheet — synchronous MMKV reads eliminate the async wait.

```typescript
// After MMKV migration:
const HISTORY_KEY = 'voice:history:v1';

hydrate(): VoiceAssistantPersistedState {
  // Synchronous — no await
  const historyRaw = mmkvService.get<unknown[]>(HISTORY_KEY);
  // ...validate and return
}
```

**The 50-message and 100-diagnostic caps** are correct — prevent unbounded storage growth.

**`wakeWordSession` persistence:** Stores whether the wake word was disabled this session (e.g., auth failure). On cold start, this is restored and wake word is not re-attempted if it was disabled. This is correct offline behavior — no network check needed.

---

## 23. Firebase Auth Token Offline

### The 1-hour token expiry problem

Firebase Auth ID tokens expire every 60 minutes. The Firebase SDK automatically refreshes them using the long-lived refresh token. The refresh token itself is valid for much longer (typically months, until the user changes their password or explicitly signs out).

**What happens when offline for >60 minutes:**

1. The ID token expires
2. The SDK attempts to refresh but has no network → refresh is queued
3. Firestore writes queue via offline persistence (unaffected — Firestore uses the SDK's own auth internally)
4. On reconnection, the SDK refreshes the token, then flushes all queued Firestore writes
5. The app continues working transparently

**The one failure mode:** If code directly reads `await user.getIdToken()` and passes it to a server (e.g., Cloud Functions via `httpsCallable` or a custom backend), the token may be expired. `getIdToken()` will attempt to refresh online before returning; if offline it will return the expired token or throw. `httpsCallable` will fail offline regardless (it's a network call).

**Fix for Cloud Functions calls (if any):**

```typescript
// Always use httpsCallable through the DataSyncService queue, never call directly.
// The queue only processes when networkService.isOnline().
// Never call httpsCallable inline in UI event handlers.
```

**Refresh token expiry (rare):** If a user changes their password or the refresh token is revoked while offline, they will be signed out on next network reconnect. The `onAuthStateChanged` listener will fire with `user = null`. The app must handle this gracefully: redirect to auth screen, preserve any unsynced data in MMKV (do not wipe local data on sign-out).

```typescript
// In AuthContext.tsx, onAuthStateChanged:
service.onAuthStateChanged((firebaseUser) => {
  if (!firebaseUser && previousUser) {
    // User was signed out — preserve local shift data.
    // Do NOT call mmkvService.clear() here.
    // Only clear auth-specific keys.
    mmkvService.remove('subscription:isPro');
    mmkvService.remove('user:profile');
    // ShiftCycle is intentionally kept — user may re-authenticate same account.
  }
  setUser(firebaseUser);
  setIsLoading(false);
});
```

### Anonymous auth — consider as an offline onboarding bridge

See Section 26 for the onboarding offline strategy which uses Firebase Anonymous Auth as the bridge.

---

## 24. Connection Quality & Degraded Networks

### The problem: FIFO mine sites have 2G/EDGE, not zero signal

Many Ellie users are not fully offline — they're on 2G/EDGE at a remote site. The app should detect degraded connectivity and behave appropriately: don't time out hard, but don't spin indefinitely either.

### NetInfo connection type

```typescript
import NetInfo, { NetInfoCellularGeneration } from '@react-native-community/netinfo';

const state = await NetInfo.fetch();

const isSlowConnection =
  state.type === 'cellular' &&
  (state.details?.cellularGeneration === '2g' || state.details?.cellularGeneration === '3g');

const isHighLatencyExpected = isSlowConnection || state.type === 'none';
```

### Timeout strategy by connection quality

```typescript
// src/services/NetworkService.ts — add to existing:
getConnectionQuality(): 'fast' | 'slow' | 'offline' {
  if (this.status === 'offline') return 'offline';
  // Store the last known NetInfoState details
  if (this.lastState?.type === 'cellular') {
    const gen = this.lastState.details?.cellularGeneration;
    if (gen === '2g' || gen === '3g') return 'slow';
  }
  return 'fast';
}

// Use in API calls:
const timeout = networkService.getConnectionQuality() === 'slow' ? 30_000 : 10_000;
```

### Voice assistant on slow network

The Claude API backend (`EllieBrainService`) has latency that's noticeable on 2G. On slow connections:

1. Try `offlineFallback.ts` first — as already done. If handled, respond immediately.
2. If not handled and slow network: show a typing indicator with a longer patience window (30s instead of 10s)
3. Add a "Too slow — answer might be delayed" toast after 8 seconds

```typescript
// In VoiceAssistantService or the hook that calls EllieBrain:
const SLOW_NETWORK_TIMEOUT_MS = networkService.getConnectionQuality() === 'slow' ? 30_000 : 10_000;
```

### Firestore reads on slow network

With offline persistence enabled, `getDoc` returns the cached value immediately (before the network response). No timeout is needed for Firestore reads — the cache serves instantly. The network response updates the cache in the background and `onSnapshot` fires again. This is the correct behavior; do not add timeouts to Firestore reads.

---

## 25. Purchase Flow Offline UX

### What RevenueCat does when offline

If `Purchases.purchaseStoreProduct()` or `Purchases.purchasePackage()` is called while offline:

- The SDK does NOT queue the purchase — it throws an error immediately
- The App Store (iOS) or Play Store (Android) handles the actual transaction; RevenueCat just facilitates it
- On iOS, the App Store purchase sheet will appear and show a network error natively if offline

### The correct UX

Gate the subscribe action on network status — show a clear message before the purchase sheet opens:

```typescript
// In PaywallScreen.tsx, on CTA press:
const handleSubscribePress = async () => {
  if (!networkService.isOnline()) {
    // Show inline message — do not open RevenueCat purchase flow
    setOfflinePaywallMessage(true);
    return;
  }
  // Proceed with Purchases.purchasePackage(...)
};
```

Display a non-blocking message:

```
"An internet connection is required to start your free trial.
 Your shift data is still available offline."
```

Do **not** show a modal or block the entire paywall screen. The user should still be able to browse the paywall features and dismiss. The CTA button should show "Connect to subscribe" when offline.

### Restore purchases offline

`Purchases.restorePurchases()` also requires network. Apply the same gate. If the user is offline and has existing entitlements, they are already being served from the RevenueCat + MMKV cache (Section 9) — no restore needed.

---

## 26. Onboarding Offline

### Current state: onboarding requires network

Firebase `createUserWithEmailAndPassword` / `signInWithCredential` (Google/Apple) require network. This is unavoidable — account creation is a server-side operation.

However, the rest of onboarding (shift pattern selection, name, occupation, shift times, AhaMoment display, calendar render) is **entirely local computation** and does not require network.

### The problem

If a new user downloads Ellie underground with no signal, they cannot create an account and cannot complete onboarding. The app is useless on first launch.

### Solution: Anonymous Auth → deferred account linking

Firebase supports anonymous sign-in, then account linking when network is available:

```
New user, offline:
  → Firebase Anonymous sign-in (works offline — no account created yet)
  → Complete onboarding flow (all local)
  → ShiftCycle saved to MMKV under anonymous UID
  → App is fully functional

User comes online:
  → Prompt: "Save your account to sync across devices"
  → User enters email/password or uses Google/Apple sign-in
  → Firebase links the anonymous account to the real account
  → All local data migrates from anonymous UID to real UID
  → Firestore sync begins
```

**Implementation sketch:**

```typescript
// In AuthService — add anonymous sign-in:
async signInAnonymously(): Promise<void> {
  const { signInAnonymously } = await import('firebase/auth');
  await signInAnonymously(this.auth);
}

// In AuthContext — detect network and try anonymous on failure:
// If both normal auth AND network are unavailable, sign in anonymously.
// Store a flag: 'auth:isAnonymous' in MMKV.

// In ProfileScreen — show "Secure your account" if auth.currentUser.isAnonymous === true
```

**Anonymous Auth works offline:** `signInAnonymously()` creates a locally-authenticated session that is synced to Firebase when network is available. The anonymous UID is assigned locally (not by server) and is consistent across sessions before linking.

### Onboarding screens that require network (only these)

| Screen                  | Network required?             | Why                                       |
| ----------------------- | ----------------------------- | ----------------------------------------- |
| WelcomeScreen           | ❌ No                         | No auth call                              |
| ShiftSystemScreen       | ❌ No                         | Pure UI                                   |
| ... all pattern screens | ❌ No                         | Local data collection                     |
| AhaMomentScreen         | ❌ No                         | Renders from local ShiftCycle             |
| PremiumCompletionScreen | ✅ Yes (for account creation) | `createOrSyncUserProfile` calls Firestore |

With anonymous auth, even `PremiumCompletionScreen` can succeed offline — it writes to Firestore which queues offline via persistence.

---

## 27. MMKV Encryption Key Management

### The problem with `EXPO_PUBLIC_MMKV_ENCRYPTION_KEY`

`EXPO_PUBLIC_*` env vars are **embedded in the JavaScript bundle and readable by anyone who extracts the app binary**. This is not a secret. Using it as the MMKV encryption key provides encryption at rest against casual data inspection (iOS file-sharing, Android ADB backup) but not against a determined attacker with the app binary.

### The correct approach for mobile

**Option A — OS keychain backed key (recommended):**

```typescript
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const MMKV_KEY_STORE_KEY = 'mmkv:encryptionKey';

async function getOrCreateMMKVKey(): Promise<string> {
  // Check SecureStore first (hardware-backed on supporting devices)
  const existing = await SecureStore.getItemAsync(MMKV_KEY_STORE_KEY);
  if (existing) return existing;

  // Generate a random 32-byte key
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const key = Buffer.from(randomBytes).toString('base64');

  await SecureStore.setItemAsync(MMKV_KEY_STORE_KEY, key, {
    requireAuthentication: false, // don't require biometrics for this key
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  return key;
}
```

This key is:

- Randomly generated per device (not shared across users or builds)
- Stored in the iOS Keychain or Android Keystore (hardware-backed on modern devices)
- Not included in iCloud backup (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`)
- Not in the app binary

**Option B — Derive from Firebase UID + device secret:**

After the user authenticates, derive the key from `uid + deviceId + EXPO_PUBLIC_SALT`:

```typescript
const key = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  `${uid}:${deviceId}:${process.env.EXPO_PUBLIC_MMKV_SALT}`
);
```

Weaker than Option A (attacker with UID + deviceId + app binary can derive the key) but simpler and does not require async initialization before MMKV is ready.

### Startup sequencing

MMKV must be initialized before any storage read. With Option A:

```typescript
// App.tsx startup sequence:
const [mmkvReady, setMMKVReady] = useState(false);

useEffect(() => {
  getOrCreateMMKVKey()
    .then(key => {
      initializeMMKV(key); // creates the MMKV instance with the key
      setMMKVReady(true);
    })
    .catch(() => {
      // Fallback: initialize without encryption rather than crash
      initializeMMKV(undefined);
      setMMKVReady(true);
    });
}, []);

if (!mmkvReady) return <SplashScreen />;
```

**Key rotation:** If the user's device is compromised, rotating the key requires re-encrypting all stored data. This is complex. For Ellie's data (shift cycles, preferences — not financial data), key rotation is not required. Document this decision.

---

## 28. Circuit Breaker & Dead Letter Queue

### The current problem in `DataSyncService`

`src/services/DataSyncService.ts` implements a basic retry with exponential backoff (max 3 retries). Operations that fail 3 times are moved to `failedOps` in AsyncStorage but are **never retried again**. There is no notification to the user, no way to manually retry, and no classification of why they failed.

Additionally, the `isSyncing` flag has no watchdog — if `processQueue()` throws before setting `isSyncing = false`, the sync is permanently stuck until app restart.

### Fix 1: Watchdog for `isSyncing`

```typescript
// In DataSyncService:
private syncStartTime: number | null = null;
private readonly SYNC_WATCHDOG_MS = 60_000; // 1 minute

async processQueue(): Promise<void> {
  // Watchdog: if a previous sync has been running for >1 minute, it's stuck — reset
  if (this.isSyncing) {
    const elapsed = this.syncStartTime ? Date.now() - this.syncStartTime : 0;
    if (elapsed > this.SYNC_WATCHDOG_MS) {
      logger.warn('DataSyncService: sync watchdog triggered — resetting stuck sync');
      this.isSyncing = false;
    } else {
      return;
    }
  }

  this.isSyncing = true;
  this.syncStartTime = Date.now();

  try {
    // ... existing queue processing
  } finally {
    this.isSyncing = false;
    this.syncStartTime = null;
  }
}
```

### Fix 2: Dead letter queue classification

Not all failures are equal. Classify before deciding to retry:

| Error type                              | Action                                                       |
| --------------------------------------- | ------------------------------------------------------------ |
| Network error (ETIMEDOUT, fetch failed) | Retry on reconnect — definitely retriable                    |
| Firestore `permission-denied`           | Dead letter — do not retry (auth issue, needs investigation) |
| Firestore `not-found`                   | Dead letter — document may have been deleted                 |
| Validation error                        | Dead letter — fix requires app update                        |
| Unknown / transient                     | Retry up to 3 times, then dead letter                        |

```typescript
private classifyOperation(error: Error): 'retry' | 'dead-letter' {
  const msg = error.message.toLowerCase();
  if (msg.includes('permission-denied') || msg.includes('not-found')) {
    return 'dead-letter';
  }
  if (error instanceof NetworkError) return 'retry';
  return 'retry'; // default: optimistic retry
}
```

Dead-lettered operations should be logged to Firebase Analytics (when online) for debugging, then cleared.

### Fix 3: User-visible failed sync indicator

If any operations are in `failedOps` after exhausting retries, surface this in Settings/Profile:

```tsx
{
  failedOperations > 0 && (
    <View style={styles.syncWarning}>
      <Text>Some changes couldn't sync. Tap to retry.</Text>
      <Button onPress={() => dataSyncService.retryFailed()} title="Retry" />
    </View>
  );
}
```

`retryFailed()` moves `failedOps` back into the main queue and calls `processQueue()`.

---

## 29. Analytics Offline

### Status: automatic — Firebase Analytics batches offline

Firebase Analytics (`src/utils/analytics.ts`) uses the Firebase Analytics SDK which:

- Batches events locally when offline (stored in the SDK's own internal SQLite database)
- Flushes the batch when network is restored
- Retains events for up to 72 hours offline before discarding

**No code changes are needed.** Do not wrap analytics calls in `if (networkService.isOnline())` — this would cause events to be silently dropped instead of queued.

### What to audit

Ensure `analytics.ts` never uses `await` in a way that would block the UI on the analytics call. Firebase Analytics calls are fire-and-forget. Current usage pattern:

```typescript
// Correct — non-blocking
logEvent('aha_moment_viewed', { shiftSystem });

// Wrong — would throw if offline without try/catch
await analytics().logEvent('aha_moment_viewed');
```

The existing `src/utils/analytics.ts` wraps calls in try/catch — this is correct.

### Analytics events during onboarding offline

All onboarding `logEvent` calls will be queued offline and sent when the user reconnects. This is the correct behavior — analytics data is not lost, just delayed.

---

## 30. Storage Cleanup Policy

### The `removeExpired()` method is never called

`AsyncStorageService.removeExpired()` iterates all keys and removes expired ones. It exists but has no caller in the codebase. Without periodic cleanup, expired entries accumulate in AsyncStorage indefinitely.

Similarly, `ShiftDataService` sets a 30-day TTL on cached shift months, but if the user never triggers a read of that key, the expired entries are never evicted.

### Cleanup schedule

Call `removeExpired()` at appropriate points:

```typescript
// In app startup (after migrations):
await asyncStorageService.removeExpired();

// Or on each foreground, rate-limited to once per day:
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const lastCleanup = mmkvService.get<number>('storage:lastCleanup') ?? 0;
if (Date.now() - lastCleanup > CLEANUP_INTERVAL_MS) {
  void asyncStorageService.removeExpired();
  mmkvService.set('storage:lastCleanup', Date.now());
}
```

### MMKV eviction

MMKV does not have a built-in TTL mechanism — the `MMKVService.get()` wrapper checks the `exp` field on read and deletes the key at that point. This means stale entries only evict when read. For large numbers of entries (e.g., shift cache with month-keyed entries), add a periodic full sweep:

```typescript
// In MMKVService:
evictExpired(): void {
  const keys = this.store.getAllKeys();
  for (const key of keys) {
    this.get(key); // triggers eviction check and delete if expired
  }
}
```

### What to clean up and when

| Data                        | TTL                         | Cleanup trigger                         |
| --------------------------- | --------------------------- | --------------------------------------- |
| Shift month cache           | 30 days                     | On cycle change + daily sweep           |
| Holiday cache               | 90 days                     | Daily sweep                             |
| Voice assistant history     | No TTL (cap at 50 messages) | On each write (already capped)          |
| Session data (AsyncStorage) | Session end                 | `SessionService.endSession()`           |
| Subscription entitlement    | 30 days                     | On each successful RevenueCat fetch     |
| Sync queue failed ops       | Manual                      | User "Retry" action or 7-day auto-clear |

---

## 31. Device ID Persistence

### The current bug

`SessionService.getOrCreateDeviceId()` returns `device-${Date.now()}` — a brand new ID every time it is called. Since `getDefaultMetadata()` calls this on every `SessionService` constructor, every session has a unique device ID, making device-level analytics useless.

### Fix

Persist the device ID in MMKV (or SecureStore) and only generate it once:

```typescript
// src/utils/deviceId.ts
import * as Crypto from 'expo-crypto';

const DEVICE_ID_KEY = 'device:id';

let cachedDeviceId: string | null = null;

export function getDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId;

  // Synchronous MMKV read
  const stored = mmkvService.get<string>(DEVICE_ID_KEY);
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }

  // Generate once — this is the first launch
  // Use a UUID-like string from available entropy
  const id = `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  mmkvService.set(DEVICE_ID_KEY, id);
  cachedDeviceId = id;
  return id;
}
```

**Alternative:** Use `expo-application`'s `applicationId` + `expo-device`'s `deviceName` as a stable identifier (no storage needed, but these can change with OS updates). MMKV persistence is more reliable.

**Do not use `expo-application.getAndroidId()` or `UIDevice.identifierForVendor`** — these reset on app reinstall on Android and on iOS if all apps from the vendor are uninstalled. Persist your own stable ID.

---

## 32. Error Boundaries for Offline

### The problem

A React error boundary catches JS rendering errors. Without offline-aware error boundaries, a component that tries to render stale/null data from a failed network call will show a generic "Something went wrong" screen — even though the fix is simply "the data is still loading from the offline cache."

### Offline-aware error boundary

```typescript
// src/components/common/OfflineAwareErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class OfflineAwareErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const isNetworkError =
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('fetch') ||
      error.message.toLowerCase().includes('unavailable');

    logger.error('Error boundary caught error', error, {
      componentStack: info.componentStack,
      isLikelyNetworkError: isNetworkError,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <OfflineErrorScreen
        error={this.state.error}
        onRetry={() => this.setState({ hasError: false, error: null })}
      />
    );
  }
}
```

### Where to apply error boundaries

Apply granular boundaries — not one global boundary:

```tsx
// Dashboard — never let shift calendar crash the whole app:
<OfflineAwareErrorBoundary fallback={<ShiftCalendarSkeleton />}>
  <ShiftCalendar />
</OfflineAwareErrorBoundary>

// Voice assistant — can fail gracefully without affecting the rest of the app:
<OfflineAwareErrorBoundary fallback={<VoiceAssistantOfflineFallback />}>
  <VoiceAssistantSheet />
</OfflineAwareErrorBoundary>

// Subscription paywall — must never crash during a purchase attempt:
<OfflineAwareErrorBoundary fallback={<PaywallErrorScreen />}>
  <PaywallScreen />
</OfflineAwareErrorBoundary>
```

### Screens that must NOT crash when data is null/offline

These screens must handle `null` data from local storage gracefully (skeleton, placeholder, or empty state) — never throw to an error boundary:

- `DashboardScreen` / shift calendar — render empty weeks, not an error
- `ProfileScreen` — render placeholder name/avatar, not a crash
- `SettingsScreen` — render toggle defaults, not a crash

---

## 33. Account & Data Deletion Offline

### GDPR right to erasure

If a user requests account deletion (from ProfileScreen or via support), all local data must be deleted in addition to the Firestore documents. If offline at the time of deletion:

**Local deletion** (always possible offline):

```typescript
async function deleteAllLocalData(): Promise<void> {
  // MMKV
  mmkvService.clear();

  // AsyncStorage (auth session, voice history, sessions)
  await AsyncStorage.clear();

  // Avatar file
  await avatarService.deleteAvatar();

  // Notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  // SecureStore
  await SecureStore.deleteItemAsync('entitlement:isPro');
  await SecureStore.deleteItemAsync('mmkv:encryptionKey');
}
```

**Remote deletion** (queue if offline):

```typescript
async function requestAccountDeletion(userId: string): Promise<void> {
  // Delete local data immediately
  await deleteAllLocalData();

  if (!networkService.isOnline()) {
    // Queue remote deletion — will run when online
    // Use a special high-priority queue entry that survives even before auth token refresh
    await dataSyncService.addToQueue({
      id: `delete-account-${userId}`,
      type: 'DELETE',
      collection: 'users',
      documentId: userId,
      timestamp: new Date(),
      retries: 0,
    });
    // Also sign out locally
    await authService.signOut();
    return;
  }

  // Delete from Firestore + Firebase Auth
  await userService.deleteUser(userId);
  await authService.deleteCurrentUser();
}
```

**After local deletion, sign the user out immediately.** Do not wait for the remote deletion to complete. The local data is gone; the user's session is invalid.

### What NOT to delete offline (queue it)

- Firestore `users/{uid}` document — queue if offline
- Firebase Auth account — requires network; queue deletion attempt
- Subscription cancellation (RevenueCat) — requires network; inform user to cancel via App Store settings if offline

### Data export before deletion

If the user requests a data export (GDPR access request) while offline, generate the export from local data (MMKV + AsyncStorage). This covers 100% of the user's operational data since local storage is the source of truth. The export does not need Firestore.

```typescript
async function generateDataExport(userId: string): Promise<DataExport> {
  return {
    profile: mmkvService.get<UserProfile>(`user:${userId}`),
    shiftCycle: mmkvService.get<ShiftCycle>(`shiftCycle:${userId}`),
    preferences: mmkvService.get<UserPreferences>(`preferences:${userId}`),
    voiceHistory: await voiceAssistantPersistenceService.hydrate().then((s) => s.history),
    exportedAt: new Date().toISOString(),
  };
}
```
