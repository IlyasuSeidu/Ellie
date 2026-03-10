# Smart Shift Reminders — Ellie App

## Context

Ellie currently schedules two blunt reminders: 24 hours before a shift and 4 hours before a shift. These are hardcoded offsets that ignore the actual shift start time, commute distance, prep requirements, or the worker's fatigue state. For a shift worker, the difference between a generic "24h before" notification and a smart "leave home now — 35-minute drive to site" alert is the difference between useful and useless.

This feature replaces and dramatically expands the reminder system with:

- **Smart timing** — reminders calculated from real shift start times (stored in `shiftTimes`), not just date boundaries
- **Prep + commute buffer** — user-configured lead time so the alert fires when it's actually time to act
- **Rich reminder types** — prep, commute, pre-briefing, post-shift check-in, fatigue alert, back-to-back warning, short-turnaround alert
- **FIFO-specific reminders** — travel day and fly-out day notifications for fly-in/fly-out workers
- **Fatigue-aware adjustment** — when sleep data shows high/critical fatigue, reminders fire earlier
- **Quiet hours** — configurable do-not-disturb window that silences non-critical alerts
- **Orchestration layer** — automatic scheduling of all reminders for the next 14 days on app start and whenever shift data changes

---

## Research Insights (Applied)

| Finding                                                     | Applied As                                                        |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| Personalised reminders are 4× more likely to be opened      | Reminder content includes user name, exact shift type, exact time |
| Prep + commute time is the #1 missing feature in shift apps | `prepTimeMinutes` + `commuteTimeMinutes` user settings            |
| 70% of sentinel events involve handover failures            | Pre-briefing reminder type 15 min before shift                    |
| Fatigue-aware systems: earlier alert when sleep <6h         | `fatigueAwareReminders` flag adjusts trigger by +30 min           |
| FIFO workers need flight/travel day alerts                  | `FIFO_TRAVEL_DAY` and `FIFO_FLY_OUT_DAY` types                    |
| Back-to-back nights = highest injury risk pattern           | `BACK_TO_BACK_WARNING` for ≥3 consecutive night shifts            |
| Quiet hours must respect sleep windows                      | `quietHoursStart/End` with critical-override for safety           |
| Fewer, smarter notifications → better long-term engagement  | All reminder types are individually toggleable                    |

---

## Architecture

```
App start / shift change
       ↓
SmartReminderOrchestrator   (src/services/SmartReminderOrchestrator.ts)
  1. Cancel all pending notifications via NotificationService
  2. Fetch next 14 days of ShiftDays from ShiftDataService
  3. Call SmartReminderService.buildSchedule() → ReminderEvent[]
  4. For each event: NotificationService.scheduleSmartReminder()

SmartReminderService        (src/services/SmartReminderService.ts)
  Pure computation — no I/O
  buildSchedule(shiftDays, shiftTimes, settings, sleepInsights?) → ReminderEvent[]
  Each ReminderEvent: { triggerAt: Date, type, content, isCritical }

NotificationService         (src/services/NotificationService.ts)  ← MODIFIED
  + 9 new NotificationType values
  + scheduleSmartReminder(userId, event) method
  + buildSmartReminderContent(event) content builders

SmartReminderSettings       (src/types/reminders.ts)
  Persisted to AsyncStorage: 'reminders:settings'
  Also exposed in ProfileScreen settings UI
```

**Hook integration:**

```
useSmartReminders  (src/hooks/useSmartReminders.ts)
  - Called in App.tsx (AppContent component)
  - Runs orchestrator on mount + when onboardingData changes
  - Also re-runs when sleep insights change (if fatigueAware enabled)
```

---

## Files to Create

---

### 1. `src/types/reminders.ts`

```typescript
/**
 * Smart Shift Reminder Types
 */
import type { ShiftType } from './index';
import type { FatigueRiskLevel } from './sleep';

// ─── Reminder types ────────────────────────────────────────────────────────────

export type SmartReminderType =
  // Replaces old SHIFT_REMINDER_24H / SHIFT_REMINDER_4H
  | 'SHIFT_REMINDER_CUSTOM_EARLY' // User-configured hours-before (default 8h)
  | 'SHIFT_PREP_REMINDER' // "Time to get ready" — prep start trigger
  | 'COMMUTE_REMINDER' // "Leave now" — prep + commute before shift start
  | 'SHIFT_START_IMMINENT' // "Shift starts in 15 minutes"
  | 'PRE_BRIEFING_REMINDER' // "Briefing in 15 min" — for safety-critical roles
  // Pattern & safety warnings
  | 'BACK_TO_BACK_WARNING' // ≥3 consecutive night shifts detected ahead
  | 'SHORT_TURNAROUND_WARNING' // <10h gap between end of last shift and start of next
  | 'FATIGUE_ALERT' // Critical fatigue risk before a night shift
  // FIFO-specific
  | 'FIFO_TRAVEL_DAY_TOMORROW' // Day before fly-in: "Pack your gear"
  | 'FIFO_FLY_OUT_TODAY' // Fly-out day: "Safe travels home"
  // Post-shift
  | 'POST_SHIFT_CHECKIN'; // "How did that shift go?"

/**
 * A computed reminder event ready to be scheduled.
 */
export interface ReminderEvent {
  type: SmartReminderType;
  triggerAt: Date; // exact moment to fire the notification
  shiftDate: string; // YYYY-MM-DD of the shift this relates to
  shiftType: ShiftType;
  isCritical: boolean; // critical = bypasses quiet hours
  title: string;
  body: string;
  data: Record<string, unknown>;
}

/**
 * User-configurable smart reminder settings.
 * Persisted to AsyncStorage at key 'reminders:settings'.
 */
export interface SmartReminderSettings {
  // ── Core timing ─────────────────────────────────────────────────────
  /** Hours before shift for the early reminder (default 8) */
  earlyReminderHours: number;
  /** Minutes before shift start to begin prep (default 60) */
  prepTimeMinutes: number;
  /** Minutes to add on top of prep for commute (default 30) */
  commuteTimeMinutes: number;
  /** Fire "shift starts in 15 min" alert */
  imminentReminderEnabled: boolean;
  /** Fire "pre-briefing in 15 min" alert (safety roles) */
  preBriefingEnabled: boolean;

  // ── Quiet hours ──────────────────────────────────────────────────────
  quietHoursEnabled: boolean;
  /** HH:MM — start of do-not-disturb window */
  quietHoursStart: string;
  /** HH:MM — end of do-not-disturb window */
  quietHoursEnd: string;

  // ── Smart / adaptive ────────────────────────────────────────────────
  /** When sleep fatigue is high/critical, fire prep reminder 30 min earlier */
  fatigueAwareReminders: boolean;
  /** Warn when ≥3 consecutive night shifts coming up */
  backToBackWarnings: boolean;
  /** Warn when turnaround between shifts is <10h */
  shortTurnaroundWarnings: boolean;
  /** Post-shift check-in prompt (1h after shift ends) */
  postShiftCheckin: boolean;

  // ── FIFO-specific ────────────────────────────────────────────────────
  /** Travel day and fly-out reminders (only relevant for FIFO users) */
  fifoTravelReminders: boolean;
}

export const DEFAULT_SMART_REMINDER_SETTINGS: SmartReminderSettings = {
  earlyReminderHours: 8,
  prepTimeMinutes: 60,
  commuteTimeMinutes: 30,
  imminentReminderEnabled: true,
  preBriefingEnabled: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '06:00',
  fatigueAwareReminders: true,
  backToBackWarnings: true,
  shortTurnaroundWarnings: true,
  postShiftCheckin: false,
  fifoTravelReminders: true,
};
```

---

### 2. `src/services/SmartReminderService.ts`

Pure computation — no Firebase, no AsyncStorage, no side effects. Takes data in, returns `ReminderEvent[]` out. Fully unit-testable.

```typescript
/**
 * Smart Reminder Service — pure computation.
 *
 * Builds the full reminder schedule for a given set of upcoming shifts.
 * No I/O — all results are returned as ReminderEvent[].
 */
import dayjs from 'dayjs';
import type { ShiftDay, ShiftType } from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import type { SleepInsights } from '@/types/sleep';
import type { SmartReminderSettings, ReminderEvent, SmartReminderType } from '@/types/reminders';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse "HH:MM" into a dayjs object on the given date */
function applyTime(date: string, time: string): dayjs.Dayjs {
  const [h, m] = time.split(':').map(Number);
  return dayjs(date).hour(h).minute(m).second(0).millisecond(0);
}

/**
 * Check whether a given time falls within a quiet-hours window.
 * Handles overnight windows (e.g. 22:00–06:00).
 */
function isInQuietHours(time: dayjs.Dayjs, start: string, end: string): boolean {
  const startMinutes = parseHHMM(start);
  const endMinutes = parseHHMM(end);
  const t = time.hour() * 60 + time.minute();

  if (startMinutes < endMinutes) {
    // Same-day window e.g. 10:00–14:00
    return t >= startMinutes && t < endMinutes;
  } else {
    // Overnight window e.g. 22:00–06:00
    return t >= startMinutes || t < endMinutes;
  }
}

function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Get shift start time string "HH:MM" from shiftTimes for the given shiftType */
function getShiftStartTime(
  shiftType: ShiftType,
  shiftTimes: OnboardingData['shiftTimes']
): string | null {
  if (!shiftTimes) return null;
  switch (shiftType) {
    case 'day':
      return shiftTimes.dayShift?.startTime ?? null;
    case 'night':
      return shiftTimes.nightShift?.startTime ?? null;
    case 'morning':
      return shiftTimes.morningShift?.startTime ?? null;
    case 'afternoon':
      return shiftTimes.afternoonShift?.startTime ?? null;
    default:
      return null;
  }
}

/** Get shift end time string "HH:MM" from shiftTimes for the given shiftType */
function getShiftEndTime(
  shiftType: ShiftType,
  shiftTimes: OnboardingData['shiftTimes']
): string | null {
  if (!shiftTimes) return null;
  switch (shiftType) {
    case 'day':
      return shiftTimes.dayShift?.endTime ?? null;
    case 'night':
      return shiftTimes.nightShift?.endTime ?? null;
    case 'morning':
      return shiftTimes.morningShift?.endTime ?? null;
    case 'afternoon':
      return shiftTimes.afternoonShift?.endTime ?? null;
    default:
      return null;
  }
}

function shiftLabel(shiftType: ShiftType): string {
  const labels: Record<ShiftType, string> = {
    day: 'day shift',
    night: 'night shift',
    morning: 'morning shift',
    afternoon: 'afternoon shift',
    off: 'day off',
  };
  return labels[shiftType] ?? shiftType;
}

// ── Main service ──────────────────────────────────────────────────────────────

export class SmartReminderService {
  /**
   * Build the full reminder schedule for upcoming work days.
   *
   * @param userName       - User's first name (for personalised content)
   * @param workDays       - ShiftDay[] for the next 14 days (from ShiftDataService)
   * @param shiftTimes     - Exact start/end times per shift type (from OnboardingData)
   * @param settings       - User's SmartReminderSettings
   * @param fatigueRisk    - Current fatigue risk from SleepInsightsService (optional)
   * @param isNowBeforeDay - Only schedule reminders that are still in the future
   */
  buildSchedule(
    userName: string,
    workDays: ShiftDay[],
    shiftTimes: OnboardingData['shiftTimes'],
    settings: SmartReminderSettings,
    fatigueRisk?: SleepInsights['fatigueRisk']
  ): ReminderEvent[] {
    const now = dayjs();
    const events: ReminderEvent[] = [];

    // ── Per-shift reminders ─────────────────────────────────────────────────

    const upcomingWorkDays = workDays.filter((d) => d.isWorkDay);

    for (const shift of upcomingWorkDays) {
      const startTimeStr = getShiftStartTime(shift.shiftType, shiftTimes);
      const endTimeStr = getShiftEndTime(shift.shiftType, shiftTimes);

      if (!startTimeStr) continue; // No time data → skip

      const shiftStart = applyTime(shift.date, startTimeStr);

      // Night shifts that start in the evening should be treated as
      // beginning on that calendar day even if they end next day.
      const isNightStart = shift.isNightShift && shiftStart.hour() >= 18;

      // ── 1. Early reminder (user-configured hours before) ─────────────────
      const earlyTrigger = shiftStart.subtract(settings.earlyReminderHours, 'hour');
      if (earlyTrigger.isAfter(now)) {
        events.push(
          this._buildEvent({
            type: 'SHIFT_REMINDER_CUSTOM_EARLY',
            triggerAt: earlyTrigger.toDate(),
            shift,
            isCritical: false,
            settings,
            fatigueRisk,
            userName,
            title: `${this._cap(shiftLabel(shift.shiftType))} tomorrow`,
            body: `Your ${shiftLabel(shift.shiftType)} starts at ${this._fmt12(startTimeStr)}. Get some rest tonight.`,
          })
        );
      }

      // ── 2. Prep reminder ──────────────────────────────────────────────────
      // Fires prepTimeMinutes + commuteTimeMinutes before shift start
      const totalLeadMin = settings.prepTimeMinutes + settings.commuteTimeMinutes;
      let prepTrigger = shiftStart.subtract(totalLeadMin, 'minute');
      // Fatigue-aware: move 30 min earlier if fatigue is high/critical
      if (
        settings.fatigueAwareReminders &&
        (fatigueRisk === 'high' || fatigueRisk === 'critical')
      ) {
        prepTrigger = prepTrigger.subtract(30, 'minute');
      }
      if (prepTrigger.isAfter(now)) {
        const fatigueNote =
          fatigueRisk === 'critical'
            ? ' ⚠️ Fatigue risk is critical — allow extra time.'
            : fatigueRisk === 'high'
              ? ' Rest and prepare carefully.'
              : '';
        events.push(
          this._buildEvent({
            type: 'SHIFT_PREP_REMINDER',
            triggerAt: prepTrigger.toDate(),
            shift,
            isCritical: fatigueRisk === 'critical',
            settings,
            fatigueRisk,
            userName,
            title: `Time to prepare, ${userName}`,
            body: `Your ${shiftLabel(shift.shiftType)} starts at ${this._fmt12(startTimeStr)}.${fatigueNote}`,
          })
        );
      }

      // ── 3. Commute reminder ───────────────────────────────────────────────
      // Fires commuteTimeMinutes before shift start (after prep time has elapsed)
      if (settings.commuteTimeMinutes > 0) {
        const commuteTrigger = shiftStart.subtract(settings.commuteTimeMinutes, 'minute');
        if (commuteTrigger.isAfter(now) && commuteTrigger.isAfter(prepTrigger)) {
          events.push(
            this._buildEvent({
              type: 'COMMUTE_REMINDER',
              triggerAt: commuteTrigger.toDate(),
              shift,
              isCritical: false,
              settings,
              fatigueRisk,
              userName,
              title: 'Leave now',
              body: `Head out now to reach your ${shiftLabel(shift.shiftType)} on time (starts ${this._fmt12(startTimeStr)}).`,
            })
          );
        }
      }

      // ── 4. Imminent reminder (15 min before) ─────────────────────────────
      if (settings.imminentReminderEnabled) {
        const imminentTrigger = shiftStart.subtract(15, 'minute');
        if (imminentTrigger.isAfter(now)) {
          events.push(
            this._buildEvent({
              type: 'SHIFT_START_IMMINENT',
              triggerAt: imminentTrigger.toDate(),
              shift,
              isCritical: false,
              settings,
              fatigueRisk,
              userName,
              title: `Starting in 15 minutes`,
              body: `Your ${shiftLabel(shift.shiftType)} begins at ${this._fmt12(startTimeStr)}.`,
            })
          );
        }
      }

      // ── 5. Pre-briefing reminder (15 min before, safety roles) ───────────
      if (settings.preBriefingEnabled) {
        const briefingTrigger = shiftStart.subtract(15, 'minute');
        if (briefingTrigger.isAfter(now)) {
          events.push(
            this._buildEvent({
              type: 'PRE_BRIEFING_REMINDER',
              triggerAt: briefingTrigger.toDate(),
              shift,
              isCritical: true, // safety-critical → bypasses quiet hours
              settings,
              fatigueRisk,
              userName,
              title: 'Briefing soon',
              body: `Shift briefing in 15 minutes — ${shiftLabel(shift.shiftType)} at ${this._fmt12(startTimeStr)}.`,
            })
          );
        }
      }

      // ── 6. Post-shift check-in (1h after shift end) ───────────────────────
      if (settings.postShiftCheckin && endTimeStr) {
        let shiftEnd = applyTime(shift.date, endTimeStr);
        // If night shift ends before it starts → it ends next day
        if (shift.isNightShift && shiftEnd.isBefore(shiftStart)) {
          shiftEnd = shiftEnd.add(1, 'day');
        }
        const checkinTrigger = shiftEnd.add(1, 'hour');
        if (checkinTrigger.isAfter(now)) {
          events.push(
            this._buildEvent({
              type: 'POST_SHIFT_CHECKIN',
              triggerAt: checkinTrigger.toDate(),
              shift,
              isCritical: false,
              settings,
              fatigueRisk,
              userName,
              title: 'How did that go?',
              body: `How was your ${shiftLabel(shift.shiftType)}? Log your energy level in Ellie.`,
            })
          );
        }
      }

      // ── 7. Fatigue alert (night shifts only when critical risk) ───────────
      if (settings.fatigueAwareReminders && fatigueRisk === 'critical' && shift.isNightShift) {
        // Fire 2 hours before shift start — enough time to rest if possible
        const fatigueTrigger = shiftStart.subtract(2, 'hour');
        if (fatigueTrigger.isAfter(now)) {
          events.push(
            this._buildEvent({
              type: 'FATIGUE_ALERT',
              triggerAt: fatigueTrigger.toDate(),
              shift,
              isCritical: true,
              settings,
              fatigueRisk,
              userName,
              title: '⚠️ Critical fatigue alert',
              body: `You have a night shift at ${this._fmt12(startTimeStr)} but your sleep data shows critical fatigue. Rest now if you can.`,
            })
          );
        }
      }
    }

    // ── Pattern-level warnings (computed across all upcoming days) ─────────

    if (settings.backToBackWarnings) {
      events.push(...this._buildBackToBackWarnings(userName, workDays, settings, now));
    }

    if (settings.shortTurnaroundWarnings) {
      events.push(
        ...this._buildShortTurnaroundWarnings(userName, workDays, shiftTimes, settings, now)
      );
    }

    // ── FIFO reminders ──────────────────────────────────────────────────────
    // (Only generates events if fifoTravelReminders is enabled AND shift days
    //  include FIFO travel markers — detected by checking for consecutive
    //  work-to-off transitions that match FIFO fly-out and fly-in patterns)
    if (settings.fifoTravelReminders) {
      events.push(...this._buildFifoTravelReminders(userName, workDays, settings, now));
    }

    // ── Deduplicate: remove events that overlap within 5 minutes of each other ──
    return this._deduplicateEvents(events);
  }

  // ─── Pattern-level helpers ─────────────────────────────────────────────────

  /**
   * Detect sequences of ≥3 consecutive night shifts.
   * Fires a warning notification the morning before the sequence begins.
   */
  private _buildBackToBackWarnings(
    userName: string,
    workDays: ShiftDay[],
    settings: SmartReminderSettings,
    now: dayjs.Dayjs
  ): ReminderEvent[] {
    const events: ReminderEvent[] = [];
    let streak = 0;
    let streakStart: ShiftDay | null = null;

    for (let i = 0; i < workDays.length; i++) {
      const d = workDays[i];
      if (d.isWorkDay && d.isNightShift) {
        if (streak === 0) streakStart = d;
        streak++;
      } else {
        if (streak >= 3 && streakStart) {
          // Fire warning the morning before the streak starts (08:00 AM)
          const warnAt = dayjs(streakStart.date).subtract(1, 'day').hour(8).minute(0);
          if (warnAt.isAfter(now)) {
            events.push({
              type: 'BACK_TO_BACK_WARNING',
              triggerAt: warnAt.toDate(),
              shiftDate: streakStart.date,
              shiftType: 'night',
              isCritical: false,
              title: `${streak} night shifts coming up`,
              body: `You have ${streak} consecutive night shifts starting ${dayjs(streakStart.date).format('ddd D MMM')}. Prioritise rest.`,
              data: { streakLength: streak, startDate: streakStart.date },
            });
          }
        }
        streak = 0;
        streakStart = null;
      }
    }
    return events;
  }

  /**
   * Detect gaps of <10 hours between end of one shift and start of the next.
   * Fires a warning the day before the short turnaround.
   */
  private _buildShortTurnaroundWarnings(
    userName: string,
    workDays: ShiftDay[],
    shiftTimes: OnboardingData['shiftTimes'],
    settings: SmartReminderSettings,
    now: dayjs.Dayjs
  ): ReminderEvent[] {
    const events: ReminderEvent[] = [];
    const work = workDays.filter((d) => d.isWorkDay);

    for (let i = 0; i < work.length - 1; i++) {
      const curr = work[i];
      const next = work[i + 1];

      const currEnd = getShiftEndTime(curr.shiftType, shiftTimes);
      const nextStart = getShiftStartTime(next.shiftType, shiftTimes);

      if (!currEnd || !nextStart) continue;

      let endTime = applyTime(curr.date, currEnd);
      const startTime = applyTime(next.date, nextStart);

      // Night shift ending next calendar day
      if (
        curr.isNightShift &&
        endTime.isBefore(applyTime(curr.date, currEnd).subtract(6, 'hour'))
      ) {
        endTime = endTime.add(1, 'day');
      }

      const gapHours = startTime.diff(endTime, 'hour', true);
      if (gapHours < 10 && gapHours > 0) {
        const warnAt = startTime.subtract(1, 'day').hour(9).minute(0);
        if (warnAt.isAfter(now)) {
          events.push({
            type: 'SHORT_TURNAROUND_WARNING',
            triggerAt: warnAt.toDate(),
            shiftDate: next.date,
            shiftType: next.shiftType,
            isCritical: false,
            title: 'Short turnaround ahead',
            body: `Only ${Math.round(gapHours)}h between your ${shiftLabel(curr.shiftType)} and next ${shiftLabel(next.shiftType)} on ${dayjs(next.date).format('ddd D MMM')}. Plan your rest.`,
            data: { gapHours, prevShiftDate: curr.date, nextShiftDate: next.date },
          });
        }
      }
    }

    return events;
  }

  /**
   * Detect FIFO fly-in / fly-out transitions.
   * A fly-out occurs when a work block transitions to an off block.
   * A travel-day-tomorrow reminder is fired the day before a fly-in.
   */
  private _buildFifoTravelReminders(
    userName: string,
    workDays: ShiftDay[],
    settings: SmartReminderSettings,
    now: dayjs.Dayjs
  ): ReminderEvent[] {
    const events: ReminderEvent[] = [];

    for (let i = 0; i < workDays.length - 1; i++) {
      const curr = workDays[i];
      const next = workDays[i + 1];

      // Fly-out: work day followed by off day
      if (curr.isWorkDay && !next.isWorkDay) {
        const flyOutAt = applyTime(curr.date, '07:00');
        if (flyOutAt.isAfter(now)) {
          events.push({
            type: 'FIFO_FLY_OUT_TODAY',
            triggerAt: flyOutAt.toDate(),
            shiftDate: curr.date,
            shiftType: curr.shiftType,
            isCritical: false,
            title: 'Fly-out day — safe travels!',
            body: `Today you head home. Complete your handover, pack your gear, and have a safe trip.`,
            data: { flyOutDate: curr.date },
          });
        }
      }

      // Travel day tomorrow: off day followed by work day
      if (!curr.isWorkDay && next.isWorkDay) {
        const travelWarnAt = applyTime(curr.date, '18:00'); // Evening before fly-in
        if (travelWarnAt.isAfter(now)) {
          events.push({
            type: 'FIFO_TRAVEL_DAY_TOMORROW',
            triggerAt: travelWarnAt.toDate(),
            shiftDate: next.date,
            shiftType: next.shiftType,
            isCritical: false,
            title: 'Travel day tomorrow',
            body: `You fly in tomorrow for your ${shiftLabel(next.shiftType)}. Pack your gear and check your documents tonight.`,
            data: { travelDate: next.date },
          });
        }
      }
    }

    return events;
  }

  // ─── Quiet hours filter ────────────────────────────────────────────────────

  /**
   * Apply quiet hours: if a non-critical event falls in the quiet window,
   * postpone it to quietHoursEnd time.
   */
  private _applyQuietHours(event: ReminderEvent, settings: SmartReminderSettings): ReminderEvent {
    if (!settings.quietHoursEnabled || event.isCritical) return event;

    const trigger = dayjs(event.triggerAt);
    if (isInQuietHours(trigger, settings.quietHoursStart, settings.quietHoursEnd)) {
      // Move to the end of quiet hours
      const [endH, endM] = settings.quietHoursEnd.split(':').map(Number);
      let adjusted = trigger.hour(endH).minute(endM).second(0);
      if (adjusted.isBefore(trigger)) adjusted = adjusted.add(1, 'day');
      return { ...event, triggerAt: adjusted.toDate() };
    }
    return event;
  }

  // ─── Event builder helper ──────────────────────────────────────────────────

  private _buildEvent(params: {
    type: SmartReminderType;
    triggerAt: Date;
    shift: ShiftDay;
    isCritical: boolean;
    settings: SmartReminderSettings;
    fatigueRisk?: SleepInsights['fatigueRisk'];
    userName: string;
    title: string;
    body: string;
  }): ReminderEvent {
    const raw: ReminderEvent = {
      type: params.type,
      triggerAt: params.triggerAt,
      shiftDate: params.shift.date,
      shiftType: params.shift.shiftType,
      isCritical: params.isCritical,
      title: params.title,
      body: params.body,
      data: {
        type: params.type,
        shiftDate: params.shift.date,
        shiftType: params.shift.shiftType,
      },
    };
    return this._applyQuietHours(raw, params.settings);
  }

  // ─── Deduplication ─────────────────────────────────────────────────────────

  private _deduplicateEvents(events: ReminderEvent[]): ReminderEvent[] {
    const sorted = [...events].sort((a, b) => a.triggerAt.getTime() - b.triggerAt.getTime());
    const result: ReminderEvent[] = [];

    for (const event of sorted) {
      const tooClose = result.some(
        (e) =>
          e.shiftDate === event.shiftDate &&
          e.type === event.type &&
          Math.abs(e.triggerAt.getTime() - event.triggerAt.getTime()) < 5 * 60 * 1000
      );
      if (!tooClose) result.push(event);
    }

    return result;
  }

  // ─── Format helpers ────────────────────────────────────────────────────────

  private _fmt12(hhmm: string): string {
    const [h, m] = hhmm.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
  }

  private _cap(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

export const smartReminderService = new SmartReminderService();
```

---

### 3. `src/services/SmartReminderOrchestrator.ts`

The missing orchestration layer. Coordinates all services to cancel stale notifications and reschedule fresh ones.

```typescript
/**
 * Smart Reminder Orchestrator
 *
 * Coordinates ShiftDataService + SmartReminderService + NotificationService
 * to keep the reminder schedule fresh.
 *
 * Called:
 *   1. On app start (via useSmartReminders hook in AppContent)
 *   2. Whenever shift cycle changes (onboardingData change)
 *   3. Whenever sleep insights change (if fatigueAwareReminders enabled)
 */
import dayjs from 'dayjs';
import { notificationService } from './NotificationService';
import { smartReminderService } from './SmartReminderService';
import { ShiftDataService } from './ShiftDataService';
import { logger } from '@/utils/logger';
import type { ShiftCycle } from '@/types';
import type { OnboardingData } from '@/contexts/OnboardingContext';
import type { SmartReminderSettings } from '@/types/reminders';
import type { SleepInsights } from '@/types/sleep';

export class SmartReminderOrchestrator {
  constructor(private shiftDataService: ShiftDataService) {}

  /**
   * Full reschedule: cancel all pending + schedule fresh reminders for next 14 days.
   * Safe to call repeatedly — idempotent from a user-experience perspective.
   */
  async reschedule(params: {
    userId: string;
    userName: string;
    shiftCycle: ShiftCycle;
    shiftTimes: OnboardingData['shiftTimes'];
    settings: SmartReminderSettings;
    sleepInsights?: SleepInsights | null;
  }): Promise<void> {
    const { userId, userName, shiftCycle, shiftTimes, settings, sleepInsights } = params;

    logger.info('SmartReminderOrchestrator: rescheduling', { userId });

    // 1. Cancel all currently pending notifications
    await notificationService.cancelAllNotifications(userId);

    // 2. Fetch upcoming 14 days of shift days
    const start = dayjs().toDate();
    const end = dayjs().add(14, 'day').toDate();
    const shiftDays = await this.shiftDataService.getShiftDaysInRange(
      start,
      end,
      shiftCycle,
      userId
    );

    // 3. Build reminder schedule
    const events = smartReminderService.buildSchedule(
      userName,
      shiftDays,
      shiftTimes,
      settings,
      sleepInsights?.fatigueRisk
    );

    logger.info('SmartReminderOrchestrator: events computed', { count: events.length });

    // 4. Schedule each event
    let scheduledCount = 0;
    for (const event of events) {
      try {
        await notificationService.scheduleSmartReminder(userId, event);
        scheduledCount++;
      } catch (err) {
        // Log but don't abort — partial scheduling is better than none
        logger.error('Failed to schedule reminder event', err as Error, {
          type: event.type,
          triggerAt: event.triggerAt.toISOString(),
        });
      }
    }

    logger.info('SmartReminderOrchestrator: done', { scheduled: scheduledCount });
  }
}
```

---

### 4. `src/hooks/useSmartReminders.ts`

Triggers the orchestrator reactively — on mount and when shift cycle changes.

> **Note on sleep integration:** `SleepContext` won't exist until the sleep tracking feature is implemented. The hook passes `null` for `sleepInsights` for now. Once `SleepContext` is live, add `const { insights: sleepInsights } = useSleep();` and pass it through, then include `fatigueRisk` in the fingerprint.

```typescript
/**
 * useSmartReminders
 *
 * Triggers SmartReminderOrchestrator on app start and whenever
 * the user's shift cycle changes.
 *
 * Called in AppContent (App.tsx) so it runs for the full app lifetime.
 * Sleep fatigue integration: connect to SleepContext after sleep tracking
 * feature is implemented.
 */
import { useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ShiftDataService } from '@/services/ShiftDataService';
import { SmartReminderOrchestrator } from '@/services/SmartReminderOrchestrator';
import { notificationService } from '@/services/NotificationService';
import { getStorageService } from '@/services/StorageService';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { logger } from '@/utils/logger';
import type { SmartReminderSettings } from '@/types/reminders';
import { DEFAULT_SMART_REMINDER_SETTINGS } from '@/types/reminders';
import { buildShiftCycle } from '@/utils/shiftUtils';

const REMINDER_SETTINGS_KEY = 'reminders:settings';

// Module-level singletons — created once when the module loads.
// getStorageService() is the lazy singleton factory from StorageService.ts.
const _shiftDataService = new ShiftDataService(getStorageService());
const _orchestrator = new SmartReminderOrchestrator(_shiftDataService);

export function useSmartReminders(): void {
  const { data: onboardingData } = useOnboarding();
  const lastRunRef = useRef<string | null>(null);

  const run = useCallback(async () => {
    if (!onboardingData?.name || !onboardingData?.startDate || !onboardingData?.patternType) {
      return; // Not onboarded yet — skip
    }

    const shiftCycle = buildShiftCycle(onboardingData);
    if (!shiftCycle) return;

    // Load persisted settings from AsyncStorage (falls back to defaults)
    let settings: SmartReminderSettings = DEFAULT_SMART_REMINDER_SETTINGS;
    try {
      const raw = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
      if (raw) settings = { ...DEFAULT_SMART_REMINDER_SETTINGS, ...JSON.parse(raw) };
    } catch {
      /* use defaults */
    }

    // Require notification permissions before scheduling
    const hasPermission = await notificationService.checkPermissions();
    if (!hasPermission) {
      logger.debug('useSmartReminders: notification permission not granted, skipping');
      return;
    }

    // Throttle: skip if the shift cycle hasn't changed since last run
    const fingerprint = JSON.stringify({
      patternType: onboardingData.patternType,
      startDate:
        onboardingData.startDate instanceof Date
          ? onboardingData.startDate.toISOString()
          : onboardingData.startDate,
      phaseOffset: onboardingData.phaseOffset,
    });
    if (fingerprint === lastRunRef.current) return;
    lastRunRef.current = fingerprint;

    // TODO: Replace with Firebase Auth UID once auth is wired up.
    // Currently uses name as a stable identifier (onboarding doesn't have auth yet).
    const userId = onboardingData.name;

    try {
      await _orchestrator.reschedule({
        userId,
        userName: onboardingData.name,
        shiftCycle,
        shiftTimes: onboardingData.shiftTimes,
        settings,
        sleepInsights: null, // TODO: pass sleepInsights from SleepContext after sleep feature lands
      });
    } catch (err) {
      logger.error('useSmartReminders: reschedule failed', err as Error);
    }
  }, [onboardingData]);

  useEffect(() => {
    run();
  }, [run]);
}
```

---

### 5. `src/services/__mocks__/SmartReminderService.ts`

```typescript
export const smartReminderService = {
  buildSchedule: jest.fn().mockReturnValue([]),
};
```

---

### 6. `src/services/__tests__/SmartReminderService.test.ts`

```typescript
import { SmartReminderService } from '../SmartReminderService';
import { DEFAULT_SMART_REMINDER_SETTINGS } from '@/types/reminders';

const service = new SmartReminderService();

// Fixture helpers
const makeShift = (
  date: string,
  shiftType: 'day' | 'night' | 'morning' | 'afternoon',
  isWorkDay = true
) => ({
  date,
  shiftType,
  isWorkDay,
  isNightShift: shiftType === 'night',
  notes: undefined,
});
const shiftTimes = {
  dayShift: { startTime: '06:00', endTime: '18:00', duration: 12 as const },
  nightShift: { startTime: '18:00', endTime: '06:00', duration: 12 as const },
};
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().slice(0, 10);

describe('SmartReminderService', () => {
  describe('buildSchedule', () => {
    it('returns empty array when no upcoming work days');
    it('generates earlyReminder, prepReminder, commuteReminder, imminentReminder for a day shift');
    it('generates earlyReminder and prepReminder for a night shift');
    it('skips events that are already in the past');
    it('moves prep reminder 30 min earlier when fatigue is critical');
    it('generates FATIGUE_ALERT for critical fatigue + night shift');
    it('generates POST_SHIFT_CHECKIN when setting is enabled');
  });
  describe('quiet hours', () => {
    it('postpones non-critical events that fall inside quiet window');
    it('does NOT postpone critical events inside quiet window');
    it('handles overnight quiet window (22:00–06:00) correctly');
  });
  describe('back-to-back warnings', () => {
    it('fires BACK_TO_BACK_WARNING for 3+ consecutive night shifts');
    it('does NOT fire warning for 2 consecutive night shifts');
  });
  describe('short turnaround warnings', () => {
    it('fires SHORT_TURNAROUND_WARNING when gap between shifts < 10h');
    it('does NOT fire when gap is ≥ 10h');
  });
  describe('FIFO reminders', () => {
    it('fires FIFO_FLY_OUT_TODAY on last work day before off block');
    it('fires FIFO_TRAVEL_DAY_TOMORROW on last off day before work block');
  });
  describe('deduplication', () => {
    it('removes duplicate events of the same type within 5 min');
  });
});
```

---

## Files to Modify

---

### 7. `src/services/NotificationService.ts`

**Edit 1 — Add to `NotificationType` enum:**

```typescript
// Smart reminder types (replace the old pair)
SHIFT_REMINDER_CUSTOM_EARLY = 'SHIFT_REMINDER_CUSTOM_EARLY',
SHIFT_PREP_REMINDER = 'SHIFT_PREP_REMINDER',
COMMUTE_REMINDER = 'COMMUTE_REMINDER',
SHIFT_START_IMMINENT = 'SHIFT_START_IMMINENT',
PRE_BRIEFING_REMINDER = 'PRE_BRIEFING_REMINDER',
BACK_TO_BACK_WARNING = 'BACK_TO_BACK_WARNING',
SHORT_TURNAROUND_WARNING = 'SHORT_TURNAROUND_WARNING',
FATIGUE_ALERT = 'FATIGUE_ALERT',
FIFO_TRAVEL_DAY_TOMORROW = 'FIFO_TRAVEL_DAY_TOMORROW',
FIFO_FLY_OUT_TODAY = 'FIFO_FLY_OUT_TODAY',
POST_SHIFT_CHECKIN = 'POST_SHIFT_CHECKIN',
// Sleep reminders (from sleep tracking plan)
SLEEP_BEDTIME_REMINDER = 'SLEEP_BEDTIME_REMINDER',
SLEEP_LOG_REMINDER = 'SLEEP_LOG_REMINDER',
```

**Edit 2 — Add `scheduleSmartReminder` method to `NotificationService` class:**

```typescript
import type { ReminderEvent } from '@/types/reminders';

/**
 * Schedule a smart reminder event produced by SmartReminderService.
 * Uses event.title/body directly (content already built by SmartReminderService).
 */
async scheduleSmartReminder(userId: string, event: ReminderEvent): Promise<string> {
  if (!this.scheduler) throw new Error('Notification scheduler not configured');

  const content: NotificationContent = {
    title: event.title,
    body: event.body,
    data: event.data,
    sound: 'default',
    badge: 1,
  };

  const notificationId = await this.scheduler.scheduleNotification(content, event.triggerAt);

  const record: ScheduledNotification = {
    id: notificationId,
    userId,
    type: event.type as unknown as NotificationType, // enum widening
    scheduledFor: event.triggerAt.toISOString(),
    content,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  await this.saveNotification(userId, record);

  logger.info('Smart reminder scheduled', {
    userId, type: event.type, scheduledFor: event.triggerAt.toISOString(),
  });

  return notificationId;
}
```

> The existing `scheduleShiftReminder()` method is kept for backwards compatibility but is no longer called by the app — the orchestrator uses `scheduleSmartReminder()` instead.

---

### 8. `src/types/index.ts`

Extend `NotificationSettings` to include smart reminder fields. Add after `vibrationEnabled`:

```typescript
// Smart reminder settings (extended)
/** Hours before shift for the early reminder (default 8) */
earlyReminderHours?: number;
/** Minutes of prep time before commute (default 60) */
prepTimeMinutes?: number;
/** Minutes of commute time (default 30) */
commuteTimeMinutes?: number;
/** Enable "starts in 15 min" alert */
imminentReminderEnabled?: boolean;
/** Enable pre-briefing reminder (safety roles) */
preBriefingEnabled?: boolean;
/** Quiet hours: don't send non-critical alerts */
quietHoursEnabled?: boolean;
quietHoursStart?: string;
quietHoursEnd?: string;
/** Adjust reminder timing based on sleep fatigue */
fatigueAwareReminders?: boolean;
/** Warn about back-to-back night shifts */
backToBackWarnings?: boolean;
/** Warn about short turnarounds between shifts */
shortTurnaroundWarnings?: boolean;
/** Post-shift energy check-in prompt */
postShiftCheckin?: boolean;
/** FIFO travel day reminders */
fifoTravelReminders?: boolean;
```

> All fields optional so existing `UserProfile` records don't break. Defaults are applied in `SmartReminderOrchestrator` via `DEFAULT_SMART_REMINDER_SETTINGS`.

---

### 9. `App.tsx`

Add `useSmartReminders()` call inside `AppContent`:

```typescript
// Add import:
import { useSmartReminders } from './src/hooks/useSmartReminders';

// Inside AppContent component (after existing hooks):
function AppContent() {
  const insets = useSafeAreaInsets();
  const { statusAreaColor } = useShiftAccent();
  useSmartReminders();   // ← ADD THIS LINE

  return ( /* existing JSX unchanged */ );
}
```

---

### 10. `src/components/profile/SmartRemindersPanel.tsx` ← **NEW FILE**

A self-contained settings panel that loads/saves `SmartReminderSettings` from AsyncStorage and immediately triggers a reschedule on every change. Inserted into `ProfileScreen.tsx` as a new section after "Work Overview".

```typescript
/**
 * SmartRemindersPanel
 *
 * Full settings UI for smart shift reminders.
 * - Loads SmartReminderSettings from AsyncStorage on mount.
 * - Saves + triggers immediate reschedule on every toggle/segment change.
 * - Conditionally shows FIFO section for fifo roster users.
 * - Quiet hours section expands inline when enabled.
 *
 * Placed inside ProfileScreen's Animated.ScrollView after WorkStatsSummary.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@/utils/theme';
import { notificationService } from '@/services/NotificationService';
import { SmartReminderOrchestrator } from '@/services/SmartReminderOrchestrator';
import { ShiftDataService } from '@/services/ShiftDataService';
import { getStorageService } from '@/services/StorageService';
import { buildShiftCycle } from '@/utils/shiftUtils';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { DEFAULT_SMART_REMINDER_SETTINGS } from '@/types/reminders';
import type { SmartReminderSettings } from '@/types/reminders';

// ── Module-level singletons ────────────────────────────────────────────────

const REMINDER_SETTINGS_KEY = 'reminders:settings';
const _shiftDataService = new ShiftDataService(getStorageService());
const _orchestrator = new SmartReminderOrchestrator(_shiftDataService);

// ── Reusable sub-components ────────────────────────────────────────────────

interface SegmentOption<T> {
  label: string;
  value: T;
}

/** Horizontal row of pill chips — single-select */
function SegmentedRow<T extends string | number>({
  label,
  sublabel,
  options,
  value,
  onChange,
}: {
  label: string;
  sublabel?: string;
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={panelStyles.row}>
      <Text style={panelStyles.rowLabel}>{label}</Text>
      {sublabel ? <Text style={panelStyles.rowSublabel}>{sublabel}</Text> : null}
      <View style={panelStyles.segmentRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={String(opt.value)}
            style={[
              panelStyles.segmentChip,
              value === opt.value && panelStyles.segmentChipActive,
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(opt.value);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                panelStyles.segmentChipText,
                value === opt.value && panelStyles.segmentChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/** Label + optional sublabel + Switch on the right */
function ToggleRow({
  label,
  sublabel,
  value,
  onChange,
}: {
  label: string;
  sublabel?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={[panelStyles.row, panelStyles.rowHorizontal]}>
      <View style={panelStyles.rowTextCol}>
        <Text style={panelStyles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={panelStyles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={(v) => {
          Haptics.selectionAsync();
          onChange(v);
        }}
        trackColor={{ false: theme.colors.softStone, true: theme.colors.sacredGold }}
        thumbColor={theme.colors.paper}
        ios_backgroundColor={theme.colors.softStone}
      />
    </View>
  );
}

/** Section label ("TIMING", "DO NOT DISTURB", etc.) */
function SubsectionLabel({ title }: { title: string }) {
  return (
    <View style={panelStyles.subsectionHeader}>
      <Text style={panelStyles.subsectionTitle}>{title}</Text>
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

interface SmartRemindersPanelProps {
  animationDelay?: number;
}

export const SmartRemindersPanel: React.FC<SmartRemindersPanelProps> = ({
  animationDelay = 0,
}) => {
  const { data: onboardingData } = useOnboarding();
  const [settings, setSettings] = useState<SmartReminderSettings>(DEFAULT_SMART_REMINDER_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Load persisted settings on mount
  useEffect(() => {
    AsyncStorage.getItem(REMINDER_SETTINGS_KEY).then((raw) => {
      if (raw) {
        try {
          setSettings((prev) => ({ ...prev, ...JSON.parse(raw) }));
        } catch {
          /* keep defaults */
        }
      }
      setLoaded(true);
    });
  }, []);

  /** Persist a partial settings update and immediately reschedule reminders */
  const applyUpdate = useCallback(
    async (patch: Partial<SmartReminderSettings>) => {
      const updated: SmartReminderSettings = { ...settings, ...patch };
      setSettings(updated);

      await AsyncStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(updated));

      // Reschedule only if onboarding is complete
      if (!onboardingData?.startDate || !onboardingData?.patternType) return;
      const shiftCycle = buildShiftCycle(onboardingData);
      if (!shiftCycle) return;

      const hasPermission = await notificationService.checkPermissions();
      if (!hasPermission) return;

      setIsRescheduling(true);
      try {
        await _orchestrator.reschedule({
          userId: onboardingData.name ?? 'unknown',
          userName: onboardingData.name ?? 'there',
          shiftCycle,
          shiftTimes: onboardingData.shiftTimes,
          settings: updated,
          sleepInsights: null, // TODO: connect to SleepContext
        });
      } finally {
        setIsRescheduling(false);
      }
    },
    [settings, onboardingData]
  );

  /** Fire a test notification 5 seconds from now */
  const sendTestNotification = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await notificationService.scheduleSmartReminder('test', {
      type: 'SHIFT_REMINDER_CUSTOM_EARLY',
      triggerAt: new Date(Date.now() + 5000),
      shiftDate: new Date().toISOString().slice(0, 10),
      shiftType: 'day',
      isCritical: false,
      title: 'Smart Reminders ✓',
      body: 'Your smart reminders are working perfectly.',
      data: { test: true },
    });
  }, []);

  /** Manually trigger a full reschedule */
  const manualReschedule = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await applyUpdate({}); // Empty patch → saves current settings + reschedules
  }, [applyUpdate]);

  const isFifoUser = onboardingData?.rosterType === 'fifo';

  if (!loaded) {
    return (
      <View style={panelStyles.loadingRow}>
        <ActivityIndicator size="small" color={theme.colors.sacredGold} />
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.delay(animationDelay).duration(400)}>
      {/* ── TIMING ─────────────────────────────────────────────── */}
      <SubsectionLabel title="TIMING" />

      <SegmentedRow
        label="Early reminder"
        sublabel="Get an early heads-up before your shift"
        options={[
          { label: '4 h', value: 4 },
          { label: '8 h', value: 8 },
          { label: '12 h', value: 12 },
          { label: '24 h', value: 24 },
        ]}
        value={settings.earlyReminderHours}
        onChange={(v) => applyUpdate({ earlyReminderHours: v })}
      />

      <SegmentedRow
        label="Prep time"
        sublabel="Time to get ready before leaving"
        options={[
          { label: '30 m', value: 30 },
          { label: '60 m', value: 60 },
          { label: '90 m', value: 90 },
          { label: '2 h', value: 120 },
        ]}
        value={settings.prepTimeMinutes}
        onChange={(v) => applyUpdate({ prepTimeMinutes: v })}
      />

      <SegmentedRow
        label="Commute time"
        sublabel="How long to get to work"
        options={[
          { label: '0', value: 0 },
          { label: '15 m', value: 15 },
          { label: '30 m', value: 30 },
          { label: '60 m', value: 60 },
        ]}
        value={settings.commuteTimeMinutes}
        onChange={(v) => applyUpdate({ commuteTimeMinutes: v })}
      />

      <ToggleRow
        label="15-min imminent alert"
        sublabel="Alert when shift is 15 minutes away"
        value={settings.imminentReminderEnabled}
        onChange={(v) => applyUpdate({ imminentReminderEnabled: v })}
      />

      <ToggleRow
        label="Pre-shift briefing alert"
        sublabel="For roles requiring a safety briefing (mining, ICU)"
        value={settings.preBriefingEnabled}
        onChange={(v) => applyUpdate({ preBriefingEnabled: v })}
      />

      {/* ── DO NOT DISTURB ─────────────────────────────────────── */}
      <SubsectionLabel title="DO NOT DISTURB" />

      <ToggleRow
        label="Quiet hours"
        sublabel="Silence non-critical alerts while you sleep"
        value={settings.quietHoursEnabled}
        onChange={(v) => applyUpdate({ quietHoursEnabled: v })}
      />

      {/* Inline time chips — expand when quiet hours is on */}
      {settings.quietHoursEnabled && (
        <View style={panelStyles.quietTimeRow}>
          {/* "From" chip — tapping opens TimePickerModal (reuse existing component) */}
          <TouchableOpacity
            style={panelStyles.timeChip}
            onPress={() => {
              /* TODO: open TimePickerModal with value=quietHoursStart,
                 onChange=(t) => applyUpdate({ quietHoursStart: t }) */
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="moon-outline" size={14} color={theme.colors.dust} />
            <Text style={panelStyles.timeChipLabel}>{settings.quietHoursStart}</Text>
          </TouchableOpacity>

          <Text style={panelStyles.timeChipSeparator}>→</Text>

          {/* "Until" chip */}
          <TouchableOpacity
            style={panelStyles.timeChip}
            onPress={() => {
              /* TODO: open TimePickerModal with value=quietHoursEnd,
                 onChange=(t) => applyUpdate({ quietHoursEnd: t }) */
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="sunny-outline" size={14} color={theme.colors.dust} />
            <Text style={panelStyles.timeChipLabel}>{settings.quietHoursEnd}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── ADAPTIVE ───────────────────────────────────────────── */}
      <SubsectionLabel title="ADAPTIVE" />

      {/* fatigue-aware is always shown; will use SleepContext once sleep feature is live */}
      <ToggleRow
        label="Fatigue-aware reminders"
        sublabel="Fire prep reminder earlier when sleep shows high fatigue"
        value={settings.fatigueAwareReminders}
        onChange={(v) => applyUpdate({ fatigueAwareReminders: v })}
      />

      <ToggleRow
        label="Back-to-back night shift warning"
        sublabel="Warn when 3+ consecutive night shifts are coming up"
        value={settings.backToBackWarnings}
        onChange={(v) => applyUpdate({ backToBackWarnings: v })}
      />

      <ToggleRow
        label="Short turnaround warning"
        sublabel="Alert when you have less than 10h between shifts"
        value={settings.shortTurnaroundWarnings}
        onChange={(v) => applyUpdate({ shortTurnaroundWarnings: v })}
      />

      <ToggleRow
        label="Post-shift check-in"
        sublabel="Prompt to log your energy after each shift"
        value={settings.postShiftCheckin}
        onChange={(v) => applyUpdate({ postShiftCheckin: v })}
      />

      {/* ── FIFO (only for fifo roster users) ──────────────────── */}
      {isFifoUser && (
        <>
          <SubsectionLabel title="FIFO" />
          <ToggleRow
            label="Travel day reminders"
            sublabel="Remind you the evening before fly-in and morning of fly-out"
            value={settings.fifoTravelReminders}
            onChange={(v) => applyUpdate({ fifoTravelReminders: v })}
          />
        </>
      )}

      {/* ── ACTIONS ────────────────────────────────────────────── */}
      <View style={panelStyles.actionsRow}>
        <TouchableOpacity
          style={panelStyles.actionButton}
          onPress={sendTestNotification}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-outline" size={16} color={theme.colors.sacredGold} />
          <Text style={panelStyles.actionButtonText}>Send test notification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={panelStyles.actionButton}
          onPress={manualReschedule}
          activeOpacity={0.7}
          disabled={isRescheduling}
        >
          {isRescheduling ? (
            <ActivityIndicator size="small" color={theme.colors.sacredGold} />
          ) : (
            <Ionicons name="refresh-outline" size={16} color={theme.colors.sacredGold} />
          )}
          <Text style={panelStyles.actionButtonText}>Reschedule all reminders</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────

const panelStyles = StyleSheet.create({
  loadingRow: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  subsectionHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  subsectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.dust,
    letterSpacing: 1.2,
  },
  row: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.softStone,
  },
  rowHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTextCol: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  rowLabel: {
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: '600',
    color: theme.colors.paper,
  },
  rowSublabel: {
    fontSize: 12,
    color: theme.colors.dust,
    marginTop: 2,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: theme.spacing.xs,
  },
  segmentChip: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    backgroundColor: theme.colors.darkStone,
    paddingVertical: 6,
    alignItems: 'center',
  },
  segmentChipActive: {
    borderColor: theme.colors.sacredGold,
    backgroundColor: 'rgba(205, 165, 0, 0.15)',
  },
  segmentChipText: {
    fontSize: 12,
    color: theme.colors.dust,
    fontWeight: '500',
  },
  segmentChipTextActive: {
    color: theme.colors.sacredGold,
    fontWeight: '700',
  },
  quietTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.softStone,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.softStone,
    backgroundColor: theme.colors.darkStone,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  timeChipLabel: {
    color: theme.colors.paper,
    fontSize: 14,
    fontWeight: '600',
  },
  timeChipSeparator: {
    color: theme.colors.dust,
    fontSize: 14,
  },
  actionsRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(205, 165, 0, 0.3)',
    backgroundColor: 'rgba(205, 165, 0, 0.08)',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  actionButtonText: {
    color: theme.colors.sacredGold,
    fontSize: theme.typography.fontSizes.sm,
    fontWeight: '600',
  },
});
```

> **Quiet hours time picker:** The `TimePickerModal` component already exists in `src/components/onboarding/premium/TimePickerModal.tsx` (used by `ShiftSettingsPanel`). Wire it up by adding local state `quietPickerTarget: 'start' | 'end' | null` and rendering `<TimePickerModal visible={!!quietPickerTarget} ... />` when the time chips are tapped.

---

### 11. `src/screens/main/ProfileScreen.tsx` ← **MINIMAL EDIT**

Add two lines to `ProfileScreen.tsx` — a section header and the panel component. Insert after `<WorkStatsSummary>` and before the `__DEV__` block:

**Add import at top of file:**

```typescript
import { SmartRemindersPanel } from '@/components/profile/SmartRemindersPanel';
```

**Add inside `Animated.ScrollView`, after `<WorkStatsSummary data={profile.data} animationDelay={1200} />`:**

```tsx
<ProfileSectionHeader
  title="Smart Reminders"
  icon="notifications-outline"
  animationDelay={1300}
/>
<SmartRemindersPanel animationDelay={1400} />
```

That's all — no other changes to `ProfileScreen.tsx`. The panel is fully self-contained.

---

### 12. `src/services/__mocks__/NotificationService.ts`

Add mock for new method (append to existing mock object):

```typescript
scheduleSmartReminder: jest.fn().mockResolvedValue('mock-notif-id'),
```

---

## Implementation Order

1. `src/types/reminders.ts` — types, no deps
2. `src/services/SmartReminderService.ts` — pure computation, no I/O
3. `src/services/__mocks__/SmartReminderService.ts` — test mock
4. `src/services/__tests__/SmartReminderService.test.ts` — unit tests (use mock)
5. `src/services/NotificationService.ts` — add 11 enum values + `scheduleSmartReminder()` method
6. `src/types/index.ts` — extend `NotificationSettings` with optional smart reminder fields
7. `src/services/SmartReminderOrchestrator.ts` — depends on SmartReminderService + NotificationService + ShiftDataService
8. `src/hooks/useSmartReminders.ts` — depends on orchestrator + OnboardingContext + getStorageService
9. `App.tsx` — call `useSmartReminders()` in AppContent
10. `src/components/profile/SmartRemindersPanel.tsx` — new self-contained component
11. `src/screens/main/ProfileScreen.tsx` — add import + 2 JSX lines after WorkStatsSummary
12. `src/services/__mocks__/NotificationService.ts` — add scheduleSmartReminder mock

---

## Verification Plan

1. **Unit tests** — `npm test src/services/__tests__/SmartReminderService.test.ts`
   - All reminder types generated for correct trigger times
   - Quiet hours postponement logic
   - Back-to-back detection with 3+ nights
   - Short turnaround detection <10h
   - Fatigue-aware 30min shift
   - FIFO fly-in/fly-out detection
   - Deduplication

2. **Orchestrator flow** — fresh app install (no shift cycle) → no notifications scheduled. Complete onboarding → orchestrator runs → check Firestore `notifications` collection for records matching next 14 days of shifts.

3. **Reminder timing** — User with `dayShift.startTime: "06:00"`, prepTime=60m, commuteTime=30m:
   - `earlyReminder` fires at 22:00 the night before (8h before 06:00)
   - `prepReminder` fires at 04:30 (90min before 06:00)
   - `commuteReminder` fires at 05:30 (30min before 06:00)
   - `imminentReminder` fires at 05:45 (15min before 06:00)

4. **Quiet hours** — Set quiet hours 22:00–06:00. Early reminder at 22:00 should be postponed to 06:00. Critical fatigue alert should NOT be postponed.

5. **Fatigue-aware** — When sleep shows `fatigueRisk: 'critical'` and next shift is a night shift:
   - Prep reminder fires 30 min earlier than configured
   - `FATIGUE_ALERT` fires 2h before shift start
   - Both appear in Firestore `notifications`

6. **Back-to-back warning** — Set up user on `STANDARD_3_3_3` pattern in night phase (3 consecutive night shifts upcoming). `BACK_TO_BACK_WARNING` appears with correct streak count.

7. **FIFO reminders** — Set user on `FIFO_14_14`. On last day of work block: `FIFO_FLY_OUT_TODAY` fires at 07:00. On last day of rest block: `FIFO_TRAVEL_DAY_TOMORROW` fires at 18:00.

8. **Profile settings UI** — Navigate to Profile → Smart Reminders:
   - Change prep time from 60m to 90m → tap away → reopen settings → 90m is selected
   - Toggle quiet hours on → time chips appear inline (showing quietHoursStart / quietHoursEnd)
   - FIFO section visible for `rosterType === 'fifo'` users, hidden for rotating roster users
   - "Send test notification" fires a notification within 5 seconds
   - "Reschedule all reminders" shows spinner while running, clears when done

9. **Reschedule on shift change** — User modifies shift pattern in onboarding → `useSmartReminders` detects fingerprint change → orchestrator cancels old + schedules new set.

10. **No duplicate scheduling** — Call orchestrator twice in quick succession → only one set of notifications exists in Firestore (cancel-all + reschedule is idempotent).
