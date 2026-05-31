# Ryvro Offline-First Strategy

## Why This Matters

Ryvro is built for shift workers who may operate underground, on remote sites, in hospitals, in transport depots, at venues, or anywhere with unreliable signal. The app promises shift visibility without a connection: tomorrow's start time, remaining days off, block schedule, exceptions, reminders, and calendar state without a network call. Offline-first is a core launch promise.

---

## Current State Assessment

The offline infrastructure is partially implemented.

### What Already Works

| Component                                  | File                                       | Status                                       |
| ------------------------------------------ | ------------------------------------------ | -------------------------------------------- |
| NetInfo-backed network state               | `src/services/NetworkService.ts`           | Implemented with native-module fallback      |
| Sync queue (CREATE/UPDATE/DELETE)          | `src/services/DataSyncService.ts`          | Wired to network state and flushes on online |
| Firebase network guards and cache fallback | `src/services/firebase/FirebaseService.ts` | Wired to network state                       |
| Type-safe local storage with TTL           | `src/services/AsyncStorageService.ts`      | Implemented                                  |
| Exponential backoff retry                  | `src/utils/reliableRetry.ts`               | Implemented                                  |
| Offline voice query fallback               | `src/utils/offlineFallback.ts`             | Implemented across bundled locales           |
| Shift calculations                         | `src/utils/shiftUtils.ts`                  | Pure functions with no network dependency    |
| Firebase Auth session persistence          | `src/config/firebase.ts`                   | Implemented                                  |

Resolved since the original audit:

- `@react-native-community/netinfo` is installed.
- `NetworkService` is the single connectivity source.
- `DataSyncService.initializeNetworkListener()` subscribes to `networkService` and calls `setOnlineState()` so queued writes can flush when connectivity returns.
- `FirebaseService.initializeNetworkListener()` subscribes to `networkService` and updates network guards from the current snapshot.
- `NetworkService` falls back safely when the native NetInfo module is unavailable, which keeps Jest and unsupported runtimes from crashing at import time.

### Remaining Gaps

| Gap                                                | Location                    | Launch impact                           |
| -------------------------------------------------- | --------------------------- | --------------------------------------- |
| No app-level network context/hook                  | `src/contexts`, `src/hooks` | UI cannot reflect offline state         |
| No offline banner or sync indicator                | `src/components/`           | Users get weak feedback offline         |
| No shared cache TTL constants                      | `src/config/`               | Expiry policy is harder to audit        |
| Startup cache expiry sweep needs stronger evidence | `App.tsx`                   | Storage cleanup evidence is incomplete  |
| Device offline QA still required                   | iOS and Android devices     | Simulator/unit coverage is insufficient |

The remaining work is now the user-visible offline experience and cache-maintenance hardening, not basic network detection.

---

## Architecture

```text
React Native app
  |
  |-- NetworkService (@react-native-community/netinfo)
  |     |-- broadcasts network snapshots
  |
  |-- DataSyncService
  |     |-- queues offline writes
  |     |-- flushes when NetworkService reports online
  |
  |-- FirebaseService
  |     |-- guards network writes
  |     |-- falls back to local Firestore/AsyncStorage cache where supported
  |
  |-- AsyncStorageService
        |-- TTL-aware persisted cache
```

### Read Path

```text
Component requests data
  |
  |-- local cache available -> render immediately
  |      |
  |      |-- online -> refresh in background and update cache
  |
  |-- no local cache
         |
         |-- online -> fetch remote, then cache
         |-- offline -> return empty/error state with saved-data messaging
```

### Write Path

```text
User edits profile, schedule, exception, or reminder
  |
  |-- update local state/cache optimistically
  |
  |-- online -> write to Firebase
  |-- offline -> queue operation in DataSyncService
  |
  |-- network returns -> DataSyncService processes queue
```

---

## Remaining Implementation Plan

Use the existing `src/services/NetworkService.ts`; do not add a parallel network-state singleton.

### Files To Create

| File                                     | Purpose                                            |
| ---------------------------------------- | -------------------------------------------------- |
| `src/contexts/NetworkContext.tsx`        | React context exposing network and sync state      |
| `src/hooks/useNetworkState.ts`           | Convenience hook for UI components                 |
| `src/components/OfflineBanner.tsx`       | Top-level user feedback when the device is offline |
| `src/components/SyncStatusIndicator.tsx` | Badge showing pending queue count and sync action  |
| `src/config/cacheConfig.ts`              | Shared TTL constants used across cached services   |

### Files To Modify

| File                              | Change                                                                 |
| --------------------------------- | ---------------------------------------------------------------------- |
| `src/services/UserService.ts`     | Continue moving profile and schedule reads toward local-first behavior |
| `src/config/firebase.ts`          | Verify native/web Firestore cache behavior for the production runtime  |
| `App.tsx`                         | Add network provider, offline banner, and startup cache expiry sweep   |
| `src/services/DataSyncService.ts` | Surface pending queue count for UI and keep reconnect flush guarded    |

### Step-By-Step Work

1. Add a `NetworkContext` backed by `networkService.subscribe()` and `dataSyncService.getQueue()`.
2. Add `useNetworkState()` for screens and cards that need `isOffline`, `pendingSyncCount`, and `syncNow`.
3. Add an `OfflineBanner` that says “Offline mode: showing saved schedule” only when the app is offline.
4. Add a compact `SyncStatusIndicator` wherever profile or schedule edits can queue.
5. Centralize cache TTL values in `src/config/cacheConfig.ts`.
6. Verify `asyncStorageService.removeExpired()` runs once during startup without blocking app render.
7. Add tests for NetInfo transitions, queue flush on reconnect, offline banner visibility, and cache expiry cleanup.

---

## Conflict Resolution Strategy

When local and remote records differ:

1. Prefer the latest `updatedAt` timestamp for schedule/profile content.
2. Prefer local UI preferences such as theme, language, and timezone.
3. Prefer remote subscription and entitlement state.
4. Log conflicts with enough metadata to diagnose bad merges.
5. Keep destructive deletes queued until the user is online and the remote delete succeeds.

---

## Cache TTL Reference

| Data type         | Suggested TTL | Reasoning                                |
| ----------------- | ------------- | ---------------------------------------- |
| User profile      | 24 hours      | Profile changes are infrequent           |
| Shift schedules   | 7 days        | Schedules must survive multi-day outages |
| Active schedule   | 7 days        | Dashboard should remain useful offline   |
| Reminder settings | 7 days        | Reminder state should survive outages    |
| Holidays          | 30 days       | Holiday dates change rarely              |
| Voice fallback    | No TTL        | Static bundled behavior                  |

---

## Files That Do Not Need Changes

| File                             | Why                                                 |
| -------------------------------- | --------------------------------------------------- |
| `src/utils/offlineFallback.ts`   | Already provides localized fallback answers         |
| `src/utils/shiftUtils.ts`        | Pure calculations work offline                      |
| `src/utils/reliableRetry.ts`     | Existing retry utility is suitable for queue writes |
| `src/services/NetworkService.ts` | Already wraps NetInfo and provides runtime fallback |

---

## Verification Checklist

### Automated

- `npm test -- --runInBand --silent tests/config/ryvroEnvTemplate.test.ts`
- `npm test -- --runInBand --silent src/services/__tests__/NetworkService.test.ts src/services/__tests__/NetworkService.runtimeFallback.test.ts tests/services/DataSyncService.test.ts`
- `npm run release:check`

### Manual Device QA

1. Launch app online and complete onboarding.
2. Turn airplane mode on.
3. Relaunch the app.
4. Confirm dashboard renders saved schedule data.
5. Edit a schedule/profile field and confirm a pending-sync state appears.
6. Turn network back on.
7. Confirm queued changes sync and the pending state clears.
8. Repeat on iOS and Android physical devices before store submission.
