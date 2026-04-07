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

### Critical bugs and gaps

| Issue                                                 | File                                       | Severity    | Impact                                                                  |
| ----------------------------------------------------- | ------------------------------------------ | ----------- | ----------------------------------------------------------------------- |
| **Firestore offline persistence not enabled**         | `src/config/firebase.ts`                   | 🔴 Critical | All Firestore reads/writes fail offline                                 |
| **ShiftDataService uses `localStorage`**              | `src/services/ShiftDataService.ts`         | 🔴 Critical | Shift cache silently broken on device (localStorage is web-only)        |
| **NetInfo not wired**                                 | `src/services/DataSyncService.ts`          | 🔴 Critical | Network detection hardcoded to `true`                                   |
| **RevenueCat catch block sets `isPro = false`**       | `src/hooks/useSubscription.ts`             | 🔴 Critical | Paying users lose Pro access on cold start offline                      |
| **FirebaseService checks network, throws if offline** | `src/services/firebase/FirebaseService.ts` | 🔴 Critical | `checkNetworkState()` throws before Firestore can use its offline cache |
| **No schema versioning on AsyncStorage**              | `src/services/AsyncStorageService.ts`      | 🟡 High     | Silent data corruption on schema changes                                |
| **AsyncStorage serialize bug**                        | `src/services/AsyncStorageService.ts`      | 🟡 High     | `JSON.parse("123")` returns number not string — silent type coercion    |
| **Sync queue duplicates Firestore's own queue**       | `src/services/DataSyncService.ts`          | 🟡 Medium   | Double-queuing Firestore writes wastes writes and causes conflicts      |
| **Voice recognition not requesting on-device**        | `src/services/SpeechRecognitionService.ts` | 🟠 Medium   | iOS 16+ could use on-device model; currently always requires network    |
| **Push token not cached**                             | `src/services/NotificationService.ts`      | 🟠 Medium   | Push token fetch fails offline; should cache after first fetch          |

---

## 3. Storage Layer

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

### The fix — 3 lines in `src/config/firebase.ts`

Replace `getFirestore(firebaseApp)` with `initializeFirestore`:

```typescript
import {
  initializeFirestore,
  persistentLocalCache,
  CACHE_SIZE_UNLIMITED,
} from 'firebase/firestore';

function initializeFirebaseFirestore(firebaseApp: FirebaseApp): Firestore {
  if (firestoreInstance) return firestoreInstance;

  firestoreInstance = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({
      cacheSizeBytes: 10 * 1024 * 1024, // 10MB — Ellie's data is tiny; this is generous
    }),
  });

  return firestoreInstance;
}
```

**Do not use:**

- `persistentMultipleTabManager` — web-only, crashes in RN
- `enableIndexedDbPersistence()` — deprecated web API, not available in RN
- `CACHE_SIZE_UNLIMITED` — unnecessary; 10MB is 100x what Ellie needs

### What offline persistence gives you for free

Once enabled, the Firestore SDK:

1. **Reads:** `getDoc` and `getDocs` return cached data when offline (no network error)
2. **Writes:** `setDoc`, `updateDoc`, `deleteDoc` return a resolved Promise immediately when offline. Writes are queued in the SDK's internal write queue and flushed when connectivity returns.
3. **Snapshots:** `onSnapshot` listeners fire immediately with locally cached data. When online, they fire again with server-fresh data.
4. **No code changes needed** in `UserService`, `FirebaseService`, or `DataSyncService` for basic offline reads/writes — the SDK handles it transparently.

### Fix `FirebaseService.checkNetworkState()`

`src/services/firebase/FirebaseService.ts` currently calls `checkNetworkState()` before every CRUD operation and throws a `NetworkError` if offline. **This must be removed** — it prevents the Firestore SDK from using its offline cache.

```typescript
// REMOVE this call from create, read, update, delete, query:
this.checkNetworkState();

// The Firestore SDK will handle offline gracefully after persistence is enabled.
// Only throw network errors for operations that genuinely require network:
// (e.g., calling a Cloud Function, fetching a storage URL)
```

Keep `NetworkError` for non-Firestore operations (Cloud Functions, RevenueCat, Speech API calls).

### What offline persistence does NOT cover

- Cloud Functions invocations (`httpsCallable`) — these fail offline. Queue them manually.
- Firebase Storage uploads/downloads — fail offline. Queue metadata, retry upload.
- Firebase Auth sign-in — requires network for initial sign-in. After first sign-in, the auth session is cached.
- `getDoc` with `{ source: 'server' }` option — explicitly bypasses cache, fails offline. Never use this in Ellie.

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

### Revised `DataSyncService`

The existing `DataSyncService` should be scoped down: its manual sync queue is now **only for non-Firestore operations**. Firestore writes use the SDK's internal queue.

Key changes to `src/services/DataSyncService.ts`:

1. Wire up `networkService` in `initializeNetworkListener()`
2. Remove Firestore read/write operations from `processOperation()` — those are handled by the Firestore SDK
3. Scope the queue to: Cloud Functions calls, external API calls that must happen server-side
4. On `'active'` app state, call `processQueue()` for the non-Firestore queue
5. Use server timestamps from Firestore (not `Date.now()`) for conflict resolution

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
- [ ] **Fix AsyncStorage serialize/deserialize** bug in `AsyncStorageService.ts`

### Phase 2 — Network & sync foundation (~2 days)

- [ ] Install and configure `@react-native-community/netinfo`
- [ ] Build `NetworkService` singleton
- [ ] Build `useNetworkStatus` hook
- [ ] Wire `NetworkService` into `DataSyncService.initializeNetworkListener()`
- [ ] Add AppState listener for sync trigger (foreground resume)
- [ ] Add `OfflineBanner` component to navigation root
- [ ] Cache push token in MMKV

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

---

## 16. Key Files Map

| File                                       | Role in offline system                                           |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `src/config/firebase.ts`                   | **Phase 1:** Enable `persistentLocalCache`                       |
| `src/services/firebase/FirebaseService.ts` | **Phase 1:** Remove `checkNetworkState()` from CRUD              |
| `src/hooks/useSubscription.ts`             | **Phase 1:** Fix catch block (remove `setIsPro(false)`)          |
| `src/services/ShiftDataService.ts`         | **Phase 1:** Replace `StorageService` with `asyncStorageService` |
| `src/services/AsyncStorageService.ts`      | **Phase 1:** Fix serialize/deserialize bug                       |
| `src/services/NetworkService.ts`           | **Phase 2:** New — NetInfo singleton                             |
| `src/hooks/useNetworkStatus.ts`            | **Phase 2:** New — React hook for network status                 |
| `src/services/DataSyncService.ts`          | **Phase 2:** Wire real NetInfo; scope to non-Firestore queue     |
| `src/components/common/OfflineBanner.tsx`  | **Phase 2:** New — subtle offline indicator                      |
| `src/services/MMKVService.ts`              | **Phase 3:** New — MMKV-backed IStorageService                   |
| `src/utils/storageMigrations.ts`           | **Phase 3:** New — schema versioning and migration runner        |
| `src/services/SpeechRecognitionService.ts` | **Phase 5:** Add on-device recognition flags                     |
| `src/utils/offlineFallback.ts`             | **Phase 5:** Extend with 6 new query patterns                    |
| `src/services/NotificationService.ts`      | **Phase 5:** Cache push token; scheduling budget                 |

---

_Document created: 2026-04-06. Reflects Expo SDK 54, React Native 0.81, Firebase JS SDK v11, react-native-purchases v9, expo-notifications, expo-speech-recognition._
