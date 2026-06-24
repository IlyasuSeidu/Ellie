# Sleep Tracking Feature — Ellie App

## Context

Ellie targets shift workers (healthcare, mining, security) who face disrupted circadian rhythms, sleep debt from night shifts, and fatigue-related safety risks. Sleep is added as **automatic-only** tracking — no manual logging. The phone/watch already tracks sleep; Ellie reads it from Apple Health (iOS) or Google Health Connect (Android) with a single toggle in Settings.

Sleep data surfaces in **two places**:

1. **Stats tab** — redesigned from the current "Coming Soon" placeholder to an analytics hub. Shows sleep summary + fatigue risk card + shift stats cards.
2. **Dedicated Sleep tab** (new 6th tab) — full-detail view: sleep score, weekly chart, insights, recent history, and full insights breakdown.

When health platform is **not configured**, a graceful setup flow guides the user step-by-step — no crashes, no blank screens.

---

## New Dependencies

```bash
# iOS HealthKit
npx expo install react-native-health

# Android Health Connect
npx expo install react-native-health-connect

# Deep linking to Health apps (already in Expo but confirm):
# expo-linking is already part of expo — no install needed
```

Already in `package.json` (no install):

- `react-native-svg` ^15.15.3 ✓
- `dayjs` ✓
- `Ionicons` via `@expo/vector-icons` ✓
- `expo-linear-gradient`, `react-native-reanimated`, `expo-haptics` ✓

---

## Architecture & Data Flow

```
User's Device
  Apple Health (HealthKit)  ─────┐
  Google Health Connect     ─────┤──→  HealthSleepService
                                 │        (reads platform data, deduplicates)
                                 │               ↓
                                 └──────→  SleepService  (Firestore CRUD)
                                                 │
                                    sleepLogs/{userId}/entries/{entryId}
                                                 │
                                    SleepInsightsService  (pure computation)
                                                 │
                                    SleepContext  (React state + actions)
                                          ↙              ↘
                              SleepTab screens       StatsScreen (summary card)
```

**App provider tree** (App.tsx):

```tsx
<GestureHandlerRootView>
  <SafeAreaProvider>
    <OnboardingProvider>
      <SleepProvider>
        {' '}
        ← NEW (above VoiceAssistant)
        <VoiceAssistantProvider>
          <AppContent />
        </VoiceAssistantProvider>
      </SleepProvider>
    </OnboardingProvider>
  </SafeAreaProvider>
</GestureHandlerRootView>
```

**Tab layout** (6 tabs — Ellie stays at center index 2):

```
Home(0) | Schedule(1) | Ellie(2-center) | Sleep(3) | Stats(4) | Profile(5)
```

**Firestore schema:**

```
sleepLogs/{userId}/entries/{entryId}
  id           string
  userId       string
  bedTime      string  (ISO 8601)
  wakeTime     string  (ISO 8601)
  durationMinutes  number
  qualityRating    number  (always null for imported entries; populated by health platform if available)
  source       'healthkit' | 'health_connect'
  shiftContext {priorShiftPhase?, nextShiftPhase?, nextShiftStart?}
  createdAt    string
  updatedAt    string
```

---

## Files to Create

---

### 1. `src/types/sleep.ts`

```typescript
/**
 * Sleep Tracking Types
 */
import type { Phase } from './index';

export type SleepDataSource = 'healthkit' | 'health_connect';
export type FatigueRiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface SleepEntry {
  id: string;
  userId: string;
  bedTime: string; // ISO 8601
  wakeTime: string; // ISO 8601
  durationMinutes: number; // computed: wakeTime − bedTime
  source: SleepDataSource;
  shiftContext?: {
    priorShiftPhase?: Phase; // phase worked BEFORE sleep
    nextShiftPhase?: Phase; // phase coming up AFTER wake
    nextShiftStart?: string; // ISO — used for bedtime recommendation
  };
  createdAt: string;
  updatedAt: string;
}

export type SleepEntryInput = Omit<SleepEntry, 'id' | 'createdAt' | 'updatedAt'>;

export interface SleepInsights {
  weeklyAvgDurationMinutes: number; // avg over last 7 days
  sleepScore: number; // 0–100
  sleepDebtMinutes: number; // positive = deficit
  consistencyScore: number; // 0–100 (bedtime regularity)
  fatigueRisk: FatigueRiskLevel;
  shiftImpact: {
    nightShiftAvgDurationMinutes: number;
    dayShiftAvgDurationMinutes: number;
    hasEnoughData: boolean; // true only when ≥3 entries each
  };
  recommendedBedtime: string | null; // "22:30" or null
  primaryInsight: string; // one-line message
}

/** Slim context for VoiceAssistantUserContext */
export interface SleepSummaryContext {
  lastNightDurationMinutes: number | null;
  weeklyAvgDurationMinutes: number;
  sleepScore: number;
  sleepDebtMinutes: number;
  fatigueRisk: FatigueRiskLevel;
}

/** Health platform connection state */
export type HealthPlatformStatus =
  | 'unconfigured' // user has never tapped "Connect"
  | 'connecting' // permission request in flight
  | 'connected' // permissions granted, syncing
  | 'denied' // user denied permissions
  | 'unavailable'; // platform not available on this device (e.g. no Apple Watch)

export interface SleepSettings {
  healthStatus: HealthPlatformStatus;
  bedtimeReminderEnabled: boolean;
  sleepLogReminderEnabled: boolean;
  targetSleepHours: number; // default 8
  lastSyncAt: string | null; // ISO
}

export const DEFAULT_SLEEP_SETTINGS: SleepSettings = {
  healthStatus: 'unconfigured',
  bedtimeReminderEnabled: true,
  sleepLogReminderEnabled: true,
  targetSleepHours: 8,
  lastSyncAt: null,
};
```

---

### 2. `src/services/SleepService.ts`

Extends `FirebaseService` from `src/services/firebase/FirebaseService.ts`.

```typescript
/**
 * Sleep Service — Firestore CRUD for sleep entries.
 * Collection: sleepLogs/{userId}/entries
 */
import { where, orderBy, limit } from 'firebase/firestore';
import dayjs from 'dayjs';
import { FirebaseService } from './firebase/FirebaseService';
import { logger } from '@/utils/logger';
import type { SleepEntry, SleepEntryInput } from '@/types/sleep';

export class SleepService extends FirebaseService {
  private col(userId: string): string {
    return `sleepLogs/${userId}/entries`;
  }

  async saveSleepEntry(input: SleepEntryInput): Promise<SleepEntry> {
    const durationMinutes = dayjs(input.wakeTime).diff(dayjs(input.bedTime), 'minute');
    const docId = await this.create(this.col(input.userId), { ...input, durationMinutes });
    logger.info('Sleep entry saved', { userId: input.userId, docId, source: input.source });
    const entry = await this.read<SleepEntry>(this.col(input.userId), docId);
    return entry!;
  }

  async deleteSleep(userId: string, entryId: string): Promise<void> {
    await this.delete(this.col(userId), entryId);
  }

  async getEntriesInRange(userId: string, fromDate: string, toDate: string): Promise<SleepEntry[]> {
    return this.query<SleepEntry>(this.col(userId), [
      where('bedTime', '>=', dayjs(fromDate).startOf('day').toISOString()),
      where('bedTime', '<=', dayjs(toDate).endOf('day').toISOString()),
      orderBy('bedTime', 'desc'),
    ]);
  }

  async getRecentEntries(userId: string, count = 30): Promise<SleepEntry[]> {
    return this.query<SleepEntry>(this.col(userId), [orderBy('bedTime', 'desc'), limit(count)]);
  }

  /** Real-time subscription. Returns unsubscribe fn — call on cleanup. */
  subscribeToEntries(userId: string, callback: (entries: SleepEntry[]) => void): () => void {
    return this.subscribeToQuery<SleepEntry>(
      this.col(userId),
      [orderBy('bedTime', 'desc'), limit(30)],
      callback
    );
  }
}

export const sleepService = new SleepService();
```

---

### 3. `src/services/HealthSleepService.ts`

Reads from Apple Health (iOS) or Google Health Connect (Android). Handles all platform branching.

```typescript
/**
 * Health Sleep Service
 *
 * Reads sleep sessions from the device health platform:
 *   iOS     → Apple HealthKit  (react-native-health)
 *   Android → Google Health Connect  (react-native-health-connect)
 *
 * No manual entry — all sleep data flows through here.
 *
 * Setup flow:
 *   1. Call requestPermissions() → user sees OS permission sheet
 *   2. Call importSleepSessions() → returns SleepEntryInput[]
 *   3. SleepContext deduplicates and saves via SleepService
 */
import { Platform, Linking } from 'react-native';
import dayjs from 'dayjs';
import { logger } from '@/utils/logger';
import type { SleepEntryInput, HealthPlatformStatus } from '@/types/sleep';

// Lazy platform imports — avoids cross-platform bundle errors
let AppleHealthKit: any = null;
if (Platform.OS === 'ios') {
  try {
    AppleHealthKit = require('react-native-health').default;
  } catch {
    /* optional native */
  }
}

let HealthConnect: any = null;
if (Platform.OS === 'android') {
  try {
    HealthConnect = require('react-native-health-connect');
  } catch {
    /* optional native */
  }
}

export class HealthSleepService {
  /** Returns true if the health platform library is available on this device. */
  isPlatformAvailable(): boolean {
    if (Platform.OS === 'ios') return !!AppleHealthKit;
    if (Platform.OS === 'android') return !!HealthConnect;
    return false;
  }

  /**
   * Request health read permissions.
   * Shows the native OS permission sheet.
   * Returns the resulting status.
   */
  async requestPermissions(): Promise<HealthPlatformStatus> {
    if (!this.isPlatformAvailable()) return 'unavailable';

    try {
      if (Platform.OS === 'ios') {
        return new Promise((resolve) => {
          AppleHealthKit.initHealthKit(
            { permissions: { read: ['SleepAnalysis'], write: [] } },
            (err: unknown) => resolve(err ? 'denied' : 'connected')
          );
        });
      }

      if (Platform.OS === 'android') {
        await HealthConnect.initialize();
        const result = await HealthConnect.requestPermission([
          { accessType: 'read', recordType: 'SleepSession' },
        ]);
        return result.length > 0 ? 'connected' : 'denied';
      }

      return 'unavailable';
    } catch (err) {
      logger.error('Health permission request failed', err as Error);
      return 'denied';
    }
  }

  /**
   * Check current permission state without showing a prompt.
   */
  async checkPermissions(): Promise<HealthPlatformStatus> {
    if (!this.isPlatformAvailable()) return 'unavailable';
    try {
      if (Platform.OS === 'ios') {
        return new Promise((resolve) => {
          AppleHealthKit.isAvailable((_: unknown, available: boolean) =>
            resolve(available ? 'connected' : 'denied')
          );
        });
      }
      if (Platform.OS === 'android') {
        await HealthConnect.initialize();
        const granted = await HealthConnect.getGrantedPermissions();
        return granted.some((p: any) => p.recordType === 'SleepSession') ? 'connected' : 'denied';
      }
      return 'unavailable';
    } catch {
      return 'denied';
    }
  }

  /**
   * Deep-link to the native Health app so the user can enable sleep tracking.
   * Call this when status is 'denied' or when giving the setup guide.
   */
  async openHealthApp(): Promise<void> {
    const url =
      Platform.OS === 'ios'
        ? 'x-apple-health://' // opens Apple Health
        : 'healthconnect://settings'; // opens Health Connect settings (Android 14+)
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  }

  /**
   * Import sleep sessions from the last `days` days.
   * Returns SleepEntryInput[] ready for SleepService.saveSleepEntry().
   */
  async importSleepSessions(userId: string, days = 7): Promise<SleepEntryInput[]> {
    if (!this.isPlatformAvailable()) return [];
    const from = dayjs().subtract(days, 'day').toDate();
    const to = dayjs().toDate();
    if (Platform.OS === 'ios') return this._importFromHealthKit(userId, from, to);
    if (Platform.OS === 'android') return this._importFromHealthConnect(userId, from, to);
    return [];
  }

  // ─── iOS ─────────────────────────────────────────────────────────────────────

  private async _importFromHealthKit(
    userId: string,
    from: Date,
    to: Date
  ): Promise<SleepEntryInput[]> {
    return new Promise((resolve) => {
      AppleHealthKit.getSleepSamples(
        { startDate: from.toISOString(), endDate: to.toISOString(), limit: 30 },
        (err: unknown, results: Array<{ startDate: string; endDate: string; value: string }>) => {
          if (err || !results) {
            resolve([]);
            return;
          }

          // Group consecutive stage samples into complete sleep sessions
          const sessions = this._groupHealthKitSamples(results);

          resolve(
            sessions
              .filter((s) => dayjs(s.endDate).diff(dayjs(s.startDate), 'minute') >= 30)
              .map((s) => ({
                userId,
                bedTime: s.startDate,
                wakeTime: s.endDate,
                durationMinutes: dayjs(s.endDate).diff(dayjs(s.startDate), 'minute'),
                source: 'healthkit' as const,
                shiftContext: undefined,
              }))
          );
        }
      );
    });
  }

  /**
   * HealthKit returns per-stage samples (INBED, ASLEEP, AWAKE, REM, DEEP, CORE).
   * This merges consecutive samples within a 60-min gap into one session.
   */
  private _groupHealthKitSamples(
    samples: Array<{ startDate: string; endDate: string; value: string }>
  ): Array<{ startDate: string; endDate: string }> {
    const relevant = samples.filter((s) =>
      ['ASLEEP', 'INBED', 'ASLEEPCORE', 'ASLEEPDEEP', 'ASLEEPREM'].includes(s.value)
    );
    if (!relevant.length) return [];

    relevant.sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)));

    const sessions: Array<{ startDate: string; endDate: string }> = [];
    let cur = { startDate: relevant[0].startDate, endDate: relevant[0].endDate };

    for (let i = 1; i < relevant.length; i++) {
      const gap = dayjs(relevant[i].startDate).diff(dayjs(cur.endDate), 'minute');
      if (gap < 60) {
        if (dayjs(relevant[i].endDate).isAfter(dayjs(cur.endDate))) {
          cur.endDate = relevant[i].endDate;
        }
      } else {
        sessions.push(cur);
        cur = { startDate: relevant[i].startDate, endDate: relevant[i].endDate };
      }
    }
    sessions.push(cur);
    return sessions;
  }

  // ─── Android ─────────────────────────────────────────────────────────────────

  private async _importFromHealthConnect(
    userId: string,
    from: Date,
    to: Date
  ): Promise<SleepEntryInput[]> {
    try {
      await HealthConnect.initialize();
      const { records } = await HealthConnect.readRecords('SleepSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: from.toISOString(),
          endTime: to.toISOString(),
        },
      });

      return (records as any[])
        .filter((r) => dayjs(r.endTime).diff(dayjs(r.startTime), 'minute') >= 30)
        .map((r) => ({
          userId,
          bedTime: r.startTime,
          wakeTime: r.endTime,
          durationMinutes: dayjs(r.endTime).diff(dayjs(r.startTime), 'minute'),
          source: 'health_connect' as const,
          shiftContext: undefined,
        }));
    } catch (err) {
      logger.error('Health Connect import failed', err as Error);
      return [];
    }
  }
}

export const healthSleepService = new HealthSleepService();
```

---

### 4. `src/services/SleepInsightsService.ts`

Pure computation — no I/O, no Firestore.

```typescript
/**
 * Sleep Insights Service — pure computation.
 */
import dayjs from 'dayjs';
import type {
  SleepEntry,
  SleepInsights,
  SleepSummaryContext,
  FatigueRiskLevel,
} from '@/types/sleep';

const DEFAULT_TARGET = 480; // 8h in minutes

export class SleepInsightsService {
  /**
   * Composite score 0–100.
   * 60% duration adherence vs target, 40% bedtime consistency.
   * (Quality removed since it's not available from health platforms)
   */
  computeSleepScore(entries: SleepEntry[], targetMinutes = DEFAULT_TARGET): number {
    if (!entries.length) return 0;
    const recent = entries.slice(0, 7);
    const durationScore = this._durationScore(recent, targetMinutes);
    const consistencyScore = this.computeConsistencyScore(recent);
    return Math.round(durationScore * 0.6 + consistencyScore * 0.4);
  }

  /** Sleep debt in minutes over last 7 days (positive = deficit). */
  computeSleepDebt(entries: SleepEntry[], targetMinutes = DEFAULT_TARGET): number {
    const recent = entries.slice(0, 7);
    return targetMinutes * 7 - recent.reduce((s, e) => s + e.durationMinutes, 0);
  }

  /** Bedtime consistency 0–100. Lower std-dev of bed-hour → higher score. */
  computeConsistencyScore(entries: SleepEntry[]): number {
    if (entries.length < 2) return 100;
    const hours = entries.map((e) => {
      const d = dayjs(e.bedTime);
      return d.hour() + d.minute() / 60;
    });
    const mean = hours.reduce((a, b) => a + b, 0) / hours.length;
    const std = Math.sqrt(hours.reduce((s, h) => s + Math.pow(h - mean, 2), 0) / hours.length);
    return Math.max(0, Math.round(100 - (std / 3) * 100));
  }

  computeShiftImpact(entries: SleepEntry[]): SleepInsights['shiftImpact'] {
    const nightEntries = entries.filter((e) => e.shiftContext?.priorShiftPhase === 'night');
    const dayEntries = entries.filter((e) =>
      ['day', 'morning', 'afternoon'].includes(e.shiftContext?.priorShiftPhase ?? '')
    );
    return {
      nightShiftAvgDurationMinutes: this._avgDuration(nightEntries),
      dayShiftAvgDurationMinutes: this._avgDuration(dayEntries),
      hasEnoughData: nightEntries.length >= 3 && dayEntries.length >= 3,
    };
  }

  /** Recommended bedtime: nextShiftStart − 90min buffer − targetSleep. Returns "HH:mm". */
  getRecommendedBedtime(
    nextShiftStart?: string | null,
    targetMinutes = DEFAULT_TARGET
  ): string | null {
    if (!nextShiftStart) return null;
    return dayjs(nextShiftStart)
      .subtract(90 + targetMinutes, 'minute')
      .format('HH:mm');
  }

  getFatigueRisk(entries: SleepEntry[], nextShiftPhase?: string): FatigueRiskLevel {
    if (!entries.length) return 'moderate';
    const avg = this._avgDuration(entries.slice(0, 3));
    const isNight = nextShiftPhase === 'night';
    if (avg < 300) return 'critical';
    if (avg < 360 && isNight) return 'critical';
    if (avg < 360) return 'high';
    if (avg < 420 && isNight) return 'high';
    if (avg < 420) return 'moderate';
    return 'low';
  }

  /** Full insights — called from SleepContext on every entries change. */
  computeInsights(
    entries: SleepEntry[],
    nextShiftStart?: string | null,
    nextShiftPhase?: string,
    targetMinutes = DEFAULT_TARGET
  ): SleepInsights {
    const recent7 = entries.slice(0, 7);
    const weeklyAvgDurationMinutes = recent7.length
      ? Math.round(recent7.reduce((s, e) => s + e.durationMinutes, 0) / recent7.length)
      : 0;
    const sleepScore = this.computeSleepScore(entries, targetMinutes);
    const sleepDebtMinutes = this.computeSleepDebt(entries, targetMinutes);
    const consistencyScore = this.computeConsistencyScore(recent7);
    const fatigueRisk = this.getFatigueRisk(entries, nextShiftPhase);
    const shiftImpact = this.computeShiftImpact(entries);
    const recommendedBedtime = this.getRecommendedBedtime(nextShiftStart, targetMinutes);
    const primaryInsight = this._buildInsight({
      fatigueRisk,
      sleepDebtMinutes,
      weeklyAvgDurationMinutes,
    });

    return {
      weeklyAvgDurationMinutes,
      sleepScore,
      sleepDebtMinutes,
      consistencyScore,
      fatigueRisk,
      shiftImpact,
      recommendedBedtime,
      primaryInsight,
    };
  }

  buildSummaryContext(entries: SleepEntry[], insights: SleepInsights | null): SleepSummaryContext {
    return {
      lastNightDurationMinutes: entries[0]?.durationMinutes ?? null,
      weeklyAvgDurationMinutes: insights?.weeklyAvgDurationMinutes ?? 0,
      sleepScore: insights?.sleepScore ?? 0,
      sleepDebtMinutes: insights?.sleepDebtMinutes ?? 0,
      fatigueRisk: insights?.fatigueRisk ?? 'moderate',
    };
  }

  // ─── Private ─────────────────────────────────────────────────────────────────

  private _avgDuration(entries: SleepEntry[]): number {
    return entries.length ? entries.reduce((s, e) => s + e.durationMinutes, 0) / entries.length : 0;
  }

  private _durationScore(entries: SleepEntry[], target: number): number {
    if (!entries.length) return 0;
    const avg = this._avgDuration(entries);
    return Math.max(0, 100 - (Math.abs(avg - target) / 60) * 12.5);
  }

  private _buildInsight(p: {
    fatigueRisk: FatigueRiskLevel;
    sleepDebtMinutes: number;
    weeklyAvgDurationMinutes: number;
  }): string {
    if (p.fatigueRisk === 'critical') {
      return `Critical fatigue risk — avg ${Math.round(p.weeklyAvgDurationMinutes / 60)}h sleep. Rest before your next shift.`;
    }
    if (p.fatigueRisk === 'high') return 'Fatigue risk is high. Try to get to bed earlier tonight.';
    if (p.sleepDebtMinutes > 300)
      return `You're ${Math.round(p.sleepDebtMinutes / 60)}h behind on sleep this week. Prioritise rest.`;
    return `Weekly avg ${Math.round(p.weeklyAvgDurationMinutes / 60)}h ${p.weeklyAvgDurationMinutes % 60}min — keep it consistent.`;
  }
}

export const sleepInsightsService = new SleepInsightsService();
```

---

### 5. `src/contexts/SleepContext.tsx`

Mirrors `OnboardingContext.tsx` pattern: React state + Firestore subscription + AsyncStorage settings.

```typescript
/**
 * SleepContext
 *
 * - Subscribes to Firestore for live sleep entries
 * - Syncs from Apple Health / Health Connect automatically
 * - Recomputes insights on every entries change
 * - Persists settings to AsyncStorage ('sleep:settings')
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sleepService } from '@/services/SleepService';
import { sleepInsightsService } from '@/services/SleepInsightsService';
import { healthSleepService } from '@/services/HealthSleepService';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { logger } from '@/utils/logger';
import type { SleepEntry, SleepInsights, SleepSettings, HealthPlatformStatus } from '@/types/sleep';
import { DEFAULT_SLEEP_SETTINGS } from '@/types/sleep';

const SLEEP_SETTINGS_KEY = 'sleep:settings';

interface SleepContextValue {
  entries: SleepEntry[];
  insights: SleepInsights | null;
  settings: SleepSettings;
  loading: boolean;
  syncing: boolean;         // true while health import is in progress
  error: string | null;
  /** Connect to Apple Health / Google Health Connect. Shows OS permission sheet. */
  connectHealth(): Promise<void>;
  /** Disconnect and clear health status. */
  disconnectHealth(): Promise<void>;
  /** Manually trigger a health sync. */
  syncFromHealth(): Promise<void>;
  /** Update individual settings fields. */
  updateSettings(patch: Partial<SleepSettings>): Promise<void>;
  /** Clear the error message. */
  clearError(): void;
}

const SleepContext = createContext<SleepContextValue | null>(null);

export function useSleep(): SleepContextValue {
  const ctx = useContext(SleepContext);
  if (!ctx) throw new Error('useSleep must be used inside <SleepProvider>');
  return ctx;
}

export const SleepProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // TODO: Replace with real auth UID once AuthService/UserService uid is threaded through.
  const { data: onboardingData } = useOnboarding();
  const userId: string | null = (onboardingData as any)?.name ?? null;

  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [insights, setInsights] = useState<SleepInsights | null>(null);
  const [settings, setSettings] = useState<SleepSettings>(DEFAULT_SLEEP_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load persisted settings
  useEffect(() => {
    AsyncStorage.getItem(SLEEP_SETTINGS_KEY).then((raw) => {
      if (raw) {
        try { setSettings((prev) => ({ ...prev, ...JSON.parse(raw) })); }
        catch { /* ignore */ }
      }
    });
  }, []);

  const recompute = useCallback((newEntries: SleepEntry[]) => {
    // TODO: thread in nextShiftStart from ShiftDataService
    setInsights(sleepInsightsService.computeInsights(newEntries));
  }, []);

  // Firestore real-time subscription
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const unsub = sleepService.subscribeToEntries(userId, (newEntries) => {
      setEntries(newEntries);
      recompute(newEntries);
      setLoading(false);
    });
    return () => unsub();
  }, [userId, recompute]);

  // Auto-sync on mount if already connected
  useEffect(() => {
    if (settings.healthStatus === 'connected' && userId) {
      syncFromHealth();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const _persistSettings = async (updated: SleepSettings) => {
    setSettings(updated);
    await AsyncStorage.setItem(SLEEP_SETTINGS_KEY, JSON.stringify(updated));
  };

  const updateSettings = useCallback(async (patch: Partial<SleepSettings>) => {
    await _persistSettings({ ...settings, ...patch });
  }, [settings]);

  const connectHealth = useCallback(async () => {
    if (!userId) return;

    // Platform not available on this device
    if (!healthSleepService.isPlatformAvailable()) {
      await updateSettings({ healthStatus: 'unavailable' });
      setError('Sleep tracking via a health platform is not available on this device.');
      return;
    }

    await updateSettings({ healthStatus: 'connecting' });
    const status: HealthPlatformStatus = await healthSleepService.requestPermissions();
    await updateSettings({ healthStatus: status });

    if (status === 'connected') {
      await syncFromHealth();
    } else if (status === 'denied') {
      setError('Permission was denied. Please allow access in your device settings, then try again.');
    }
  }, [userId, updateSettings]);

  const disconnectHealth = useCallback(async () => {
    await updateSettings({ healthStatus: 'unconfigured', lastSyncAt: null });
  }, [updateSettings]);

  const syncFromHealth = useCallback(async () => {
    if (!userId || settings.healthStatus !== 'connected') return;
    setSyncing(true);
    try {
      const imported = await healthSleepService.importSleepSessions(userId, 14);
      // Deduplicate: skip if bedTime (to the minute) already exists
      const existingSet = new Set(entries.map((e) => e.bedTime.slice(0, 16)));
      const newEntries = imported.filter((e) => !existingSet.has(e.bedTime.slice(0, 16)));
      for (const entry of newEntries) {
        await sleepService.saveSleepEntry(entry);
      }
      await updateSettings({ lastSyncAt: new Date().toISOString() });
      logger.info('Health sync complete', { newEntries: newEntries.length });
    } catch (err) {
      logger.error('syncFromHealth failed', err as Error);
      setError('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  }, [userId, settings.healthStatus, entries, updateSettings]);

  return (
    <SleepContext.Provider value={{
      entries, insights, settings, loading, syncing, error,
      connectHealth, disconnectHealth, syncFromHealth, updateSettings, clearError: () => setError(null),
    }}>
      {children}
    </SleepContext.Provider>
  );
};
```

---

### 6. `src/navigation/SleepNavigator.tsx`

Nested stack for the Sleep tab.

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SleepScreen } from '@/screens/main/SleepScreen';
import { SleepInsightsScreen } from '@/screens/main/SleepInsightsScreen';
import { SleepSetupScreen } from '@/screens/main/SleepSetupScreen';

export type SleepStackParamList = {
  SleepHome: undefined;
  SleepInsights: undefined;
  SleepSetup: undefined;
};

const Stack = createNativeStackNavigator<SleepStackParamList>();

export const SleepNavigator: React.FC = () => (
  <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
    <Stack.Screen name="SleepHome" component={SleepScreen} />
    <Stack.Screen name="SleepInsights" component={SleepInsightsScreen} />
    <Stack.Screen name="SleepSetup" component={SleepSetupScreen} />
  </Stack.Navigator>
);
```

---

### 7. `src/screens/main/SleepSetupScreen.tsx`

Shown when `healthStatus` is `'unconfigured'`, `'denied'`, or `'unavailable'`. Guides the user step-by-step.

**Structure:**

```
<LinearGradient deepVoid → darkStone>
  ── Header ──────────────────────────────────────
  Back (←)   "Connect Sleep Tracking"

  ── Illustration ────────────────────────────────
  Large moon/stars icon (Ionicons moon + stars, sacredGold)

  ── Status-aware title ──────────────────────────
  'unconfigured': "Track sleep automatically"
  'denied':       "Permission Required"
  'unavailable':  "Not Available on This Device"

  ── Description ─────────────────────────────────
  iOS unconfigured/denied:
    "Ellie reads sleep data from Apple Health.
     Make sure sleep tracking is enabled on your iPhone or Apple Watch."
  Android unconfigured/denied:
    "Ellie reads sleep data from Google Health Connect.
     Make sure a sleep-tracking app (e.g. Samsung Health, Fitbit) is
     connected to Health Connect."

  ── Step guide (iOS) ────────────────────────────
  Step 1: Open the Health app → Browse → Sleep → Set up sleep
  Step 2: Or use your Apple Watch's Sleep app
  Step 3: Tap "Connect" below to grant Ellie access

  ── Step guide (Android) ────────────────────────
  Step 1: Install Health Connect from Play Store (if not already)
  Step 2: Connect your sleep app to Health Connect
  Step 3: Tap "Connect" below to grant Ellie access

  ── CTA Button ──────────────────────────────────
  "Connect Apple Health" (iOS) / "Connect Health Connect" (Android)
  → calls connectHealth()
  Shows ActivityIndicator when status === 'connecting'

  ── Secondary link ──────────────────────────────
  "Open Health app" → calls healthSleepService.openHealthApp()
  (shown on denied to guide user to enable permissions in settings)
</LinearGradient>
```

---

### 8. `src/screens/main/SleepScreen.tsx`

Main sleep hub. Guards on health status — shows setup prompt when not connected.

```
if healthStatus === 'unconfigured' | 'denied' | 'unavailable':
  ─ Show inline banner ───────────────────────────
  🌙  "Connect Apple Health to track sleep automatically"
  [Connect] button → navigate to SleepSetup
  ─ Below: empty state placeholder ───────────────

else if loading:
  ActivityIndicator

else if entries.length === 0:
  ─ Empty state ──────────────────────────────────
  Moon icon + "No sleep data yet"
  "Your sleep data will appear here once your health
   platform syncs. This may take a few minutes."
  [Sync Now] button → syncFromHealth()

else:
  ─ Header ────────────────────────────────────────
  "Sleep" title  +  Sync button (right, shows last sync time)

  ─ Sleep Score Card ──────────────────────────────
  SVG ring (react-native-svg Circle, strokeDasharray):
    Large number in center (sleepScore / 100)
    Colour: green ≥70, amber 50–69, red <50
  Fatigue risk badge: colour-coded pill
  primaryInsight text

  ─ Recommended Bedtime (if not null) ────────────
  🌙 "Go to bed by 22:30 for your 06:00 shift"

  ─ This Week — 3 stat tiles ─────────────────────
  [Avg Duration]  [Sleep Debt]  [Consistency]
  7h 30min        +1h 20min      82%

  ─ Recent entries (last 7) ───────────────────────
  FlatList of cards:
    Date (e.g. "Mon 3 Mar") | Duration | Source badge (Apple Health / Health Connect)
    Shift context tag if available (e.g. "After night shift")
  No swipe-to-delete (health data is source of truth; delete from health app)

  ─ Full Insights button ──────────────────────────
  → navigate to SleepInsights
```

---

### 9. `src/screens/main/SleepInsightsScreen.tsx`

```
<LinearGradient>
  <ScrollView>
    ── Header: Back + "Sleep Insights" ─────────────
    ── Sleep Score donut ────────────────────────────
    SVG donut (react-native-svg) — score / 100
    Label: "Sleep Score"  sub-label: "Good/Fair/Poor"
    ── Weekly Bar Chart ─────────────────────────────
    7 SVG Rect bars, heights proportional to durationMinutes/600
    Colours: green ≥420min, amber 300–419, red <300
    Dashed target line at 480min (8h)
    Day labels: M T W T F S S
    ── Sleep Debt ────────────────────────────────────
    Animated horizontal bar:  debt% of (7 × target)
    Text: "2h 40min behind" or "30min surplus"
    ── Bedtime Consistency ───────────────────────────
    Score ring + label "How regular is your bedtime?"
    ── Shift Impact (only when hasEnoughData) ────────
    Two-column comparison table:
      │                 │ Night  │ Day    │
      │ Avg Duration    │ 6h 20m │ 7h 45m │
    ── Fatigue Risk ──────────────────────────────────
    Colour badge + one-line explanation
    ── Recommended Bedtime ───────────────────────────
    🌙 "Based on your 06:00 shift — go to bed by 22:30"
    ── Top Insight Card ──────────────────────────────
    primaryInsight highlighted in a bordered card
  </ScrollView>
</LinearGradient>
```

All SVG via `react-native-svg` (already in `package.json`). No new chart library needed.

---

### 10. `src/services/__mocks__/SleepService.ts`

```typescript
export const sleepService = {
  saveSleepEntry: jest.fn().mockResolvedValue({ id: 'mock-id', durationMinutes: 480 }),
  deleteSleep: jest.fn().mockResolvedValue(undefined),
  getRecentEntries: jest.fn().mockResolvedValue([]),
  getEntriesInRange: jest.fn().mockResolvedValue([]),
  subscribeToEntries: jest.fn().mockReturnValue(() => {}),
};
```

---

### 11. `src/services/__tests__/SleepInsightsService.test.ts`

```typescript
describe('SleepInsightsService', () => {
  describe('computeSleepScore', () => {
    it('returns 0 for no entries');
    it('returns ~80 for consistent 7h30m sleep');
    it('returns 100 for perfect 8h with same bedtime nightly');
  });
  describe('computeSleepDebt', () => {
    it('positive debt when avg < 8h');
    it('negative surplus when avg > 8h');
    it('zero when exactly 8h each night');
  });
  describe('getFatigueRisk', () => {
    it('critical for avg <5h');
    it('critical for avg <6h + night shift');
    it('low for avg ≥7h');
  });
  describe('getRecommendedBedtime', () => {
    it('returns "22:30" for 06:00 shift with 8h target');
    it('returns null when nextShiftStart is null');
  });
  describe('computeConsistencyScore', () => {
    it('100 for identical bedtimes');
    it('~0 for ±4h variance in bedtimes');
  });
});
```

---

## Files to Modify

---

### 12. `src/screens/main/StatsScreen.tsx` — Full redesign

Replace the "Coming Soon" placeholder with a real stats hub.

```
<LinearGradient>
  <ScrollView>
    ── Header: "Statistics" ────────────────────────

    ── Sleep Summary Card ──────────────────────────
    Shows last night's duration + weekly avg
    Fatigue risk badge
    [View Sleep Details] → navigates to Sleep tab
    (data from useSleep() imported at top of component)

    ── Shift Summary Card (placeholder) ────────────
    "Shifts this month: 14  |  Hours worked: 168"
    (computed from ShiftDataService)

    ── Fatigue Risk Card ────────────────────────────
    Large risk badge + short description
    Linked to sleep & shift pattern data

    ── Earnings Placeholder Card ────────────────────
    "Earnings tracker — coming soon"
    (styled card, not "Coming Soon" full-screen)

    ── Work Pattern Card ────────────────────────────
    Days on / Days off ratio this month
    Night shifts vs day shifts count
  </ScrollView>
</LinearGradient>
```

Import: `import { useSleep } from '@/contexts/SleepContext';`

For the "View Sleep Details" navigation — since Stats tab and Sleep tab are siblings in MainTabNavigator, use `navigation.navigate('Sleep')` (tab-level navigation, no stack push needed).

---

### 13. `src/navigation/MainTabNavigator.tsx`

```typescript
// BEFORE
export type MainTabParamList = {
  Home: undefined; Schedule: undefined; Ellie: undefined; Stats: undefined; Profile: undefined;
};
// AFTER
export type MainTabParamList = {
  Home: undefined; Schedule: undefined; Ellie: undefined; Sleep: undefined; Stats: undefined; Profile: undefined;
};

// Add import:
import { SleepNavigator } from './SleepNavigator';

// Add tab (after Ellie, before Stats):
<Tab.Screen name="Sleep" component={SleepNavigator} />
// Keep Stats:
<Tab.Screen name="Stats" component={StatsScreen} />
```

---

### 14. `src/components/navigation/CustomTabBar.tsx`

**Three surgical edits:**

**Edit 1** — Add Sleep icon to `TAB_ICONS` (after the Stats entry, line 58):

```typescript
Sleep: { outline: 'moon-outline', filled: 'moon' },
```

**Edit 2** — Update `FLEX_TAB_WIDTH` (line 47):

```typescript
// BEFORE:
const FLEX_TAB_WIDTH = FLEX_TOTAL_WIDTH / 4;
// AFTER (5 flex tabs: Home, Schedule, Sleep, Stats, Profile):
const FLEX_TAB_WIDTH = FLEX_TOTAL_WIDTH / 5;
```

**Edit 3** — Replace `getTabCenterX` body (lines 67–77).
New 6-tab layout: `Home(0) Schedule(1) Ellie(2-center) Sleep(3) Stats(4) Profile(5)`
2 flex tabs before center, 3 flex tabs after center.

```typescript
// BEFORE
function getTabCenterX(index: number): number {
  if (index < 2) {
    return FLEX_TAB_WIDTH * index + FLEX_TAB_WIDTH / 2;
  }
  const slot = index - 2;
  return (
    FLEX_TAB_WIDTH * 2 + CENTER_PLACEHOLDER_WIDTH + FLEX_TAB_WIDTH * (slot - 1) + FLEX_TAB_WIDTH / 2
  );
}

// AFTER
function getTabCenterX(index: number): number {
  if (index < 2) {
    // Before center: Home(0), Schedule(1)
    return FLEX_TAB_WIDTH * index + FLEX_TAB_WIDTH / 2;
  }
  // After center: Sleep(3)→slot 0, Stats(4)→slot 1, Profile(5)→slot 2
  const slot = index - 3; // 3→0, 4→1, 5→2
  return FLEX_TAB_WIDTH * 2 + CENTER_PLACEHOLDER_WIDTH + FLEX_TAB_WIDTH * slot + FLEX_TAB_WIDTH / 2;
}
```

---

### 15. `App.tsx`

```typescript
// Add import:
import { SleepProvider } from './src/contexts/SleepContext';

// Wrap (between OnboardingProvider and VoiceAssistantProvider):
<OnboardingProvider>
  <SleepProvider>
    <VoiceAssistantProvider>
      <AppContent />
    </VoiceAssistantProvider>
  </SleepProvider>
</OnboardingProvider>
```

---

### 16. `src/services/NotificationService.ts`

**Edit 1** — Add to `NotificationType` enum:

```typescript
SLEEP_BEDTIME_REMINDER = 'SLEEP_BEDTIME_REMINDER',
SLEEP_LOG_REMINDER = 'SLEEP_LOG_REMINDER',
```

**Edit 2** — Extract private helper `_saveHistory(...)` from existing `scheduleShiftReminder` logic (to avoid duplication), then add:

```typescript
async scheduleBedtimeReminder(userId: string, bedtimeISO: string): Promise<void> {
  if (!this.scheduler) return;
  const fireAt = new Date(new Date(bedtimeISO).getTime() - 30 * 60_000);
  if (fireAt <= new Date()) return;
  const content: NotificationContent = {
    title: 'Bedtime in 30 minutes',
    body: 'Wind down — your shift starts early tomorrow.',
    data: { type: NotificationType.SLEEP_BEDTIME_REMINDER },
  };
  const notifId = await this.scheduler.scheduleNotification(content, fireAt);
  await this._saveHistory(userId, NotificationType.SLEEP_BEDTIME_REMINDER, content, fireAt.toISOString(), notifId);
}

async scheduleSleepLogReminder(userId: string, estimatedWakeISO: string): Promise<void> {
  if (!this.scheduler) return;
  const fireAt = new Date(new Date(estimatedWakeISO).getTime() + 60 * 60_000);
  if (fireAt <= new Date()) return;
  const content: NotificationContent = {
    title: 'How did you sleep?',
    body: "Log last night's sleep in Ellie.",
    data: { type: NotificationType.SLEEP_LOG_REMINDER },
  };
  const notifId = await this.scheduler.scheduleNotification(content, fireAt);
  await this._saveHistory(userId, NotificationType.SLEEP_LOG_REMINDER, content, fireAt.toISOString(), notifId);
}
```

---

### 17. `src/types/voiceAssistant.ts`

```typescript
// Add import:
import type { SleepSummaryContext } from './sleep';

// Add to VoiceAssistantUserContext interface (after fifoConfig):
sleepContext?: SleepSummaryContext;
```

---

### 18. `src/contexts/VoiceAssistantContext.tsx`

In the userContext builder (where `VoiceAssistantUserContext` is assembled for `EllieBrainRequest`):

```typescript
// Add at top of file:
import { useSleep } from './SleepContext';
import { sleepInsightsService } from '@/services/SleepInsightsService';

// Inside VoiceAssistantProvider component, after existing hook calls:
const { entries: sleepEntries, insights: sleepInsights } = useSleep();

// When building userContext object, add:
sleepContext: sleepInsightsService.buildSummaryContext(sleepEntries, sleepInsights),
```

---

### 19. `src/screens/main/ProfileScreen.tsx`

Add a **"Sleep Tracking" settings section** to the existing profile screen, between `WorkStatsSummary` and the bottom area. This is the one-toggle-and-done entry point for the user.

```
── Sleep Tracking section ──────────────────────────
Section header: "Sleep Tracking"

Row: "Automatic Sleep Import"
  Left:  Moon icon + "Apple Health" (iOS) / "Health Connect" (Android) label
         Sub-label: "Your phone tracks sleep automatically"
  Right: Status badge — "Connected" (green) | "Not connected" (grey) | "Denied" (red)
  Tap entire row → if not connected: connectHealth()
                   if connected: navigate to SleepSetup (to show status + disconnect option)

Row: "Bedtime Reminder"  [Toggle]  (disabled if not connected)
  Sub-label: "30 min before recommended bedtime"

Row: "Sleep Log Reminder"  [Toggle]  (disabled if not connected)
  Sub-label: "Morning reminder to review your sleep"

Row: "Target Sleep Duration"
  Label + stepper: 6h · 7h · 8h · 9h  (default 8h)
──────────────────────────────────────────────────
```

Implementation:

- `useSleep()` → `{ settings, connectHealth, updateSettings }`
- Toggle handlers call `updateSettings({ bedtimeReminderEnabled: !settings.bedtimeReminderEnabled })` etc.
- The "Connect" status row calls `connectHealth()` which handles permission internally
- Reminders are scheduled by `NotificationService` when the toggle is turned on

---

## Firestore Security Rules

Add to `firestore.rules`:

```
match /sleepLogs/{userId}/entries/{entryId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## Implementation Order

1. Install deps: `react-native-health`, `react-native-health-connect`
2. `src/types/sleep.ts`
3. `src/services/SleepService.ts`
4. `src/services/HealthSleepService.ts`
5. `src/services/SleepInsightsService.ts`
6. `src/services/__mocks__/SleepService.ts`
7. `src/services/__tests__/SleepInsightsService.test.ts`
8. `src/contexts/SleepContext.tsx`
9. `src/navigation/SleepNavigator.tsx`
10. `src/screens/main/SleepSetupScreen.tsx`
11. `src/screens/main/SleepScreen.tsx`
12. `src/screens/main/SleepInsightsScreen.tsx`
13. `src/screens/main/StatsScreen.tsx` (redesign)
14. `src/navigation/MainTabNavigator.tsx` (add Sleep tab)
15. `src/components/navigation/CustomTabBar.tsx` (moon icon + 6-tab math)
16. `App.tsx` (add SleepProvider)
17. `src/services/NotificationService.ts` (sleep notification types)
18. `src/types/voiceAssistant.ts` (add sleepContext)
19. `src/contexts/VoiceAssistantContext.tsx` (wire sleepContext)
20. `src/screens/main/ProfileScreen.tsx` (Sleep Tracking settings section)
21. `firestore.rules` update

---

## Verification Plan

1. **Unit tests** — `npm test src/services/__tests__/SleepInsightsService.test.ts`

2. **Health connect toggle (iOS)**
   - Go to Profile → Sleep Tracking → tap "Apple Health" row
   - Apple Health permission sheet appears
   - Grant access → status changes to "Connected" (green)
   - Sleep tab syncs and shows last 14 days of entries from Apple Health

3. **Health connect toggle (Android)** — same via Health Connect

4. **Permission denied flow**
   - Deny health permission → status shows "Denied" (red) + error message
   - "Open Health app" link opens Apple Health / Health Connect settings
   - After enabling in settings, tapping "Connect" again succeeds

5. **Not available on device** — On a device without HealthKit/Health Connect libraries built in:
   - Status shows "Not Available on This Device"
   - SleepScreen shows friendly message (not a crash)

6. **No data yet** — Connected but health app has no sleep data:
   - SleepScreen shows "No sleep data yet" empty state with explanation
   - Not a blank screen, not an error

7. **Stats tab** — Open Stats tab:
   - Sleep Summary card shows last night + weekly avg from SleepContext
   - Fatigue risk card matches the Sleep tab's risk level
   - "View Sleep Details" button navigates to Sleep tab

8. **Sleep tab with data** — After sync with 7+ days of data:
   - Score ring renders with correct number
   - Recommended bedtime shows based on next shift
   - Weekly bar chart shows 7 bars

9. **SleepInsightsScreen** — Open full insights:
   - Bar chart heights match actual sleep durations
   - Sleep debt calculated correctly
   - Shift impact section appears only when ≥3 entries exist for both shift types

10. **6-tab layout** — All 6 tabs render correctly:
    - Moon icon glows when Sleep tab focused
    - Glow indicator slides correctly across all 5 non-centre tabs
    - Tab bar dimensions still fit the screen (5 flex tabs instead of 4)

11. **Voice assistant** — Ask "How much sleep did I get this week?":
    - Ellie responds with actual data from `sleepContext.weeklyAvgDurationMinutes`

12. **Notifications** — Set bedtime reminder on → next time health sync sets recommendedBedtime:
    - Bedtime reminder fires 30 min before recommended bedtime
    - Firestore `notifications` collection records the entry
