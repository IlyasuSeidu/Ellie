# Universal Shift Builder Spec

## Status

Implementation specification for the current universal-only Ryvro shift system.

The app is not live, so the legacy rotating/FIFO configuration system has been removed from the product flow. The Universal Shift Builder is now the single shift setup surface for onboarding and settings. Any remaining legacy names in helper files are temporary compatibility shims and should not be expanded into new product behavior.

## Product Goal

Build one schedule system that can model shift work for any industry through user-defined shift definitions and a repeating sequence.

The builder must support:

- AI-assisted schedule drafting from natural language.
- Manual one-screen schedule construction.
- Drag-and-drop sequence editing.
- Non-drag reorder controls for accessibility.
- Shift names, icons, colors, kinds, start times, end times, and overnight shifts.
- Timed, all-day, and no-time shift definitions.
- Work, off, travel, on-call, training, leave, and custom shift kinds.
- Current-cycle alignment without exposing technical terms like `phaseOffset`.
- Calendar preview before saving.
- Public holiday exceptions that can turn normal work days into holiday/off days or replacement shift definitions.
- One-off irregular exceptions that change one exact date without changing the repeating sequence.
- Calendar import/export for `.ics` files, including Apple Calendar, Google Calendar, Outlook, and roster exports that use the iCalendar format.
- Advanced reminder-profile editing per shift type inside the builder.
- Deterministic validation before persistence.
- Dashboard, calendar, settings, onboarding, reminders, voice, and offline support.

## Architecture Decision

Universal schedules are the source of truth.

```ts
export type ShiftCycle = UniversalShiftSchedule;
```

Do not reintroduce legacy rotating/FIFO screens, pattern selectors, fixed count-based setup flows, or legacy first-class schedule fields. If old helper names still exist, they must read universal data or be removed when safe.

## Data Model

The saved model is `UniversalShiftSchedule`.

Required schedule fields:

- `version: 3`
- `name`
- `timezone`
- `anchorDate` as `YYYY-MM-DD`
- `phaseOffset` as an internal zero-based cycle index
- `shiftDefinitions`
- `sequence`
- optional `holidayExceptions`
- optional `oneOffExceptions`
- `source: 'manual' | 'ai' | 'template' | 'migration'`
- optional `updatedAt`
- optional `aiDraftMeta`

Required shift definition fields:

- `id`
- `name`
- `kind`
- `timePolicy`
- `activePolicy`
- optional `startTime`
- optional `endTime`
- optional `durationMinutes`
- optional `crossesMidnight`
- `countsAsWork`
- `countsAsNight`
- `countsForStats`
- `color`
- `icon`
- optional `locationName`
- optional `reminderProfileId`
- optional `reminderProfile` with per-shift overrides for early reminder hours, prep minutes, commute minutes, imminent reminder, pre-briefing reminder, fatigue-aware timing, post-shift check-in, and travel reminders

Required sequence item fields:

- `id`
- `shiftDefinitionId`
- optional `labelOverride`

Optional holiday exception fields:

- `id`
- `date` as `YYYY-MM-DD`
- `holidayName`
- `country` as ISO 3166-1 alpha-2
- `action: 'mark_off' | 'use_shift_definition'`
- optional `shiftDefinitionId`, required when `action` is `use_shift_definition`
- optional `paidOverride`
- optional `appliesToWorkShiftsOnly`, defaulting to `true`

Optional one-off exception fields:

- `id`
- `date` as `YYYY-MM-DD`
- `action: 'mark_off' | 'use_shift_definition'`
- optional `shiftDefinitionId`, required when `action` is `use_shift_definition`
- optional `label`
- optional `reason`
- optional `paidOverride`

## Calculation Rules

Cycle math must use calendar-day arithmetic, not raw millisecond differences.

The sequence index for a date is:

```ts
normalizedIndex = modulo(daysBetweenCalendarDates(date, anchorDate) + phaseOffset, sequence.length);
```

Rules:

- `startTime === endTime` with `crossesMidnight: true` means a 24-hour shift.
- Overnight shifts must produce a carry-over end date.
- Off/no-time shifts must not become active timed shifts.
- Invalid schedules must not be consumed by dashboard, reminders, voice, or offline tools.
- Custom shift names, colors, icons, and kinds must be preserved across all display surfaces.

## Holiday Exceptions

Holiday exceptions are materialized schedule overrides generated from public holiday data or added manually by the builder UI. They are stored on the schedule so calculation stays deterministic on device, offline, in backend tools, and in tests.

Required behavior:

- If a holiday exception date matches a calculated work shift and `action` is `mark_off`, the day becomes a non-working all-day holiday/off day.
- The holiday/off day must use the holiday name as the displayed shift name, a holiday color, and a calendar icon.
- The original shift definition must be preserved in `universal.holidayException` so the UI can explain what changed.
- If `action` is `use_shift_definition`, the matching day uses the referenced replacement shift definition.
- `paidOverride` is a payroll hint for future pay/earnings logic and must be preserved in metadata.
- `appliesToWorkShiftsOnly` defaults to `true`; existing off/rest days are not changed by holidays unless this is explicitly disabled.
- Duplicate exceptions for the same date should warn because only the first match is applied.
- Holiday exceptions must affect dashboard, calendar, upcoming shifts, stats, active-shift checks, reminders, voice, and offline answers through the same universal calculation path.
- Holiday exceptions generated from public holiday lists should be created via `buildHolidayExceptionsFromHolidays`, using `HolidayService` as the data source.

## One-Off Irregular Exceptions

One-off exceptions are user-created overrides for a single calendar date. They must never mutate the repeating sequence, shift definitions, anchor date, or current-cycle alignment.

Required behavior:

- If a one-off exception date matches a calculated shift and `action` is `use_shift_definition`, that exact date uses the referenced replacement shift definition.
- If `action` is `mark_off`, that exact date becomes a non-working all-day off day.
- The original shift definition must be preserved in `universal.oneOffException` so the UI can explain what changed.
- The `reason` field should capture user language such as “swapped with Alex” or “covering training”.
- One-off exceptions have higher priority than holiday exceptions because they are explicit user decisions for a specific date.
- Only the matching date is changed. The next cycle occurrence of the same sequence slot must remain unchanged.
- One-off exceptions must affect dashboard, calendar, upcoming shifts, stats, active-shift checks, reminders, voice, and offline answers through the same universal calculation path.

## Calendar Import/Export

Calendar import/export connects Ryvro schedules with outside calendar products without creating a second schedule model.

Required export behavior:

- Export must generate an `.ics` file using iCalendar `VCALENDAR` and `VEVENT` records.
- Export range must be user-controlled with `YYYY-MM-DD` start and end dates.
- Export must support both “all days” and “work shifts only” modes.
- Timed shifts must export `DTSTART` and `DTEND` with the schedule timezone.
- Overnight shifts must export an end date on the following calendar day.
- All-day/off/leave shifts must export date-only events.
- Event `SUMMARY` must use the universal shift definition name.
- Event metadata must preserve Ryvro shift id, color, icon, kind, and schedule name where possible through standard text fields and `X-RYVRO-*` fields.
- Import should still read legacy `X-ELLIE-*` fields as a compatibility fallback, but every new export must write `X-RYVRO-*`.
- Export must block invalid schedules instead of producing a misleading calendar.
- The app must share the generated `.ics` file through the native share sheet so users can send it to Google Calendar, Apple Calendar, Outlook, email, files, or any calendar-compatible destination.

Required import behavior:

- Import must accept `.ics` calendar/roster files from the native document picker.
- Import must parse `VEVENT` summaries, date-only events, timed events, and overnight events.
- Imported roster events must become one-off exceptions, not repeating sequence edits.
- Imported event summaries must create or reuse universal shift definitions.
- Imported work events should infer timed/all-day, overnight, kind, icon, color, and stats flags.
- Imported off/rest/leave events should create non-working universal definitions and one-off overrides for those dates.
- If an imported date already has a one-off exception, the builder must replace it only when explicitly using the import flow’s replacement behavior.
- Import results must mark the builder dirty, update preview immediately, and keep the schedule save step explicit.
- Import/export must be available from the same Universal Shift Builder screen in onboarding and settings.

## Advanced Reminder Profiles

Reminder profiles let different shift types use different notification rules without making the user leave the builder.

Required behavior:

- Each work shift definition can store a `reminderProfileId` and `reminderProfile`.
- The reminder editor must live in the shift inspector sheet, so users configure reminders while creating or editing a shift type.
- Users must be able to set:
  - first reminder lead time in hours
  - prep time in minutes
  - travel/commute time in minutes
  - final 15-minute start alert
  - pre-briefing reminder
  - fatigue-aware timing
  - post-shift check-in
  - travel reminders
- Off and leave shift types should not schedule pre-shift reminders.
- If a shift has a reminder profile, `SmartReminderService` must merge it over the global reminder settings for that shift only.
- Reminder event identity must keep `universalDefinitionId` and `reminderProfileId` so rescheduling does not collide across shift types.
- Global reminder settings remain the fallback when a shift type has no custom profile.
- The builder must preserve reminder profiles through save, edit, reload, preview calculation, backend-compatible metadata, and fingerprinting.

## AI Builder

AI is a draft generator only. It must never save directly.

Client requirements:

- The AI section is visible only when `AI_SHIFT_BUILDER_ENABLED=true` and `SHIFT_SCHEDULE_PARSER_URL` is configured.
- The manual builder must remain fully usable when AI is disabled, unavailable, rate-limited, or offline.
- AI results must open in a review sheet.
- Users must explicitly accept, discard, or continue manually.

Backend requirements:

- `parseShiftScheduleDescription` accepts only `POST`.
- Validate `prompt`, `timezone`, `locale`, and `today`.
- Cap prompt length.
- Rate-limit repeated parser requests.
- Use structured JSON output from the provider.
- Generate/normalize IDs server-side.
- Force `source: 'ai'`.
- Run deterministic validation before returning a draft.
- Return `draft`, `needs_clarification`, or `invalid`.

Response contract:

```ts
interface ShiftScheduleParserResult {
  status: 'draft' | 'needs_clarification' | 'invalid';
  scheduleDraft?: UniversalShiftSchedule;
  summary: string;
  assumptions: string[];
  questions: string[];
  warnings: string[];
  confidence: number;
  requestId?: string;
}
```

## Manual Builder UX

The builder is a full-screen route available from onboarding and settings.

Required controls:

- Schedule name editor.
- AI prompt section, gated by the AI feature flag.
- Shift definition palette.
- Shift inspector sheet for name, kind, icon, color, time policy, active policy, times, and stats flags.
- Sequence canvas.
- Add single shift.
- Add repeated block.
- Reorder by drag gesture.
- Reorder by buttons.
- Duplicate sequence item.
- Delete sequence item.
- Sequence item label override.
- Match-date editor for `anchorDate`.
- User-facing current-cycle selector for `phaseOffset`.
- Preview calendar.
- Validation banner.
- Warning confirmation.
- Save retry/error handling.
- Dirty-draft discard confirmation.
- One-off date change controls for swapping one date to another shift type or making it off.
- Calendar import/export controls with export date range, include-off-days toggle, native `.ics` sharing, and native `.ics` roster import.
- Advanced reminder controls inside each shift type editor.

User-facing copy must avoid internal terms such as `phase offset` and `anchor date`. Use language like “Match schedule from” and “What day are you on?”.

## UI Integration

Universal shift metadata must flow into:

- Onboarding setup.
- Settings shift setup.
- Dashboard current shift card.
- Monthly calendar.
- Upcoming shifts.
- Schedule screen placeholders or future schedule screen.
- Smart reminders.
- Voice assistant prompts and tools.
- Offline fallback answers.
- Profile summary/stats.

Colors and icons selected in the builder must render anywhere a shift is displayed, especially calendar cells and dashboard status cards.

## Validation

Validation must block saving when:

- Schedule name is empty.
- No shift definitions exist.
- Sequence is empty.
- A sequence item references a missing definition.
- A timed shift is missing start or end time.
- Time values are not valid `HH:mm`.
- Color is not a valid hex color.
- Icon is missing.
- Cycle alignment points outside the sequence.
- A holiday exception has an invalid date, missing name, invalid country code, or references a missing replacement shift definition.
- A one-off exception has an invalid date or references a missing replacement shift definition.
- Calendar export dates are invalid or the schedule itself is invalid.
- A reminder-profile number is outside supported bounds.

Validation should warn, but may allow save, when:

- A long cycle may be difficult to inspect.
- A schedule has no work days.
- A schedule has no off days.
- A timed shift is longer than normal but valid.

## i18n

All static builder copy should live in locale files. English is the source locale. Every supported locale must contain the same key structure and matching interpolation tokens.

Until full translation copy is written, non-English locales may use English fallback values, but keys must exist so locale parity tests pass.

## Feature Flags

Required flags:

- `UNIVERSAL_SHIFT_BUILDER_ENABLED`: exposes optional settings/profile builder entry points. Onboarding always uses the universal builder because it is the only schedule setup flow.
- `AI_SHIFT_BUILDER_ENABLED`: exposes AI-assisted drafting inside the builder.

The universal data model and pure utilities must not depend on feature flags.

## Testing Requirements

Before marking the feature matched to this spec, run:

```sh
npm run type-check
npm run lint
npm test -- --runInBand
cd backend/functions && npm test
cd backend/functions && npm run build
```

Required automated coverage:

- Universal calculation utilities.
- Universal validation and normalization.
- 24-hour shifts.
- Overnight shifts.
- Broad industry AI fallback patterns.
- AI parser client errors.
- AI parser backend errors and fallback.
- Onboarding navigation into the builder.
- Settings navigation into the builder.
- Voice/offline universal schedule queries.
- Reminder scheduling from universal shift times.
- Holiday exceptions that mark a normal work day as holiday/off.
- Holiday exceptions that replace a normal work day with another shift definition.
- Holiday exceptions that leave existing off/rest days untouched by default.
- One-off exceptions that swap a single date to a different shift definition.
- One-off exceptions that make a single date off without changing the rest of the sequence.
- One-off exception priority over holiday exceptions on the same date.
- Calendar export for timed, overnight, all-day, and off shifts.
- Calendar import for roster `.ics` timed events, overnight events, all-day events, and duplicate one-off dates.
- Per-shift reminder profiles overriding global reminder defaults.
- Reminder event identities include the shift definition and reminder profile.

Required manual/device coverage:

- Onboarding create and save.
- Settings edit and save.
- AI draft accept.
- Manual schedule creation.
- Drag reorder.
- Non-drag reorder.
- Calendar icon/color rendering.
- Dashboard active/up-next rendering.
- App reload after save.
- Calendar export through the native share sheet.
- Calendar import from a real `.ics` roster file.
- Night, training, and travel shift types with different reminder profiles.

## Deferred Scope

These are not required for current spec match:

- Free shift template library.

Do not build a paid template marketplace as the default monetization plan. Common shift templates should help users start faster and should be included as part of the core builder experience. Premium value should come from higher-leverage features such as AI schedule drafting, smart reminders, calendar sync, long-range forecasting, fatigue insights, pay/overtime tracking, and advanced customization.

## Definition Of Done

The implementation matches this spec when:

- Universal schedules are the only product schedule model.
- Onboarding and settings both use the Universal Shift Builder.
- AI builder access is clear in both onboarding and settings when enabled.
- Manual builder works without AI.
- Saved schedules reload and render correctly across dashboard/calendar/settings.
- Smart reminders use universal start/end times.
- Smart reminders use per-shift reminder profiles when present.
- Voice and offline answers use universal shift names and kinds.
- Colors and icons propagate to display surfaces.
- Calendar import/export works from the builder and imported roster days render as one-off changes.
- Invalid drafts cannot save.
- Dirty drafts cannot be lost silently.
- AI parser has a kill switch and rate limiting.
- Locale key parity passes.
- The required test/build commands pass, or any remaining failures are documented as unrelated pre-existing failures.
