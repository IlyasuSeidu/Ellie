# Ellie: Miner Shift Assistant — Narrowing Audit

Audit of all user-facing text and copy that positions the app as broadly for "shift workers"
rather than specifically for miners. Use this as a checklist before App Store submission.

---

## Subscription Name Recommendation

| Option            | Notes                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------- |
| **Deep Shift** ⭐ | "Deep" = underground mining. "Shift" = work shift. Clean dual meaning, sounds premium |
| Pit Pass          | Open-pit mining reference. "Pass" implies exclusive access                            |
| Headlamp Pro      | Miners wear cap lamps. Recognisable symbol of the trade                               |
| Site Pro          | Neutral "mine site" framing                                                           |

**Recommended: "Deep Shift"** — mining-specific, memorable, and naturally incorporates
the word "shift" which is the app's core concept.

---

## Already Good — Mining-Specific Content ✅

These areas are already well-narrowed. No changes needed.

| Location                                      | Content                                                                             | Why it's good                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------- |
| `app.json:3`                                  | `"name": "Ellie: Miner Shift Assistant"`                                            | Explicit miner branding                            |
| `src/i18n/locales/en/onboarding.json` tagline | `"Your Mining Shift Companion"`                                                     | Clear mining identity on welcome screen            |
| `onboarding.json` FIFO section                | "fly in to remote sites", "isolated at camp", "popular in WA mining"                | Mining-region specific                             |
| `onboarding.json` shift patterns              | "8/6 (common WA)", "14/14 (even-time)", "21/7 (remote sites)", "28/14 (long cycle)" | FIFO patterns = mining                             |
| `onboarding.json` 2-shift useCases            | `["Mining sites", "Oil & gas", "24/7 operations", "Remote work"]`                   | Mining leads the list                              |
| `onboarding.json` completion feature: team    | "See your **crew** schedule and coordinate **handovers** seamlessly"                | "Crew" and "handovers" are mining-compatible terms |

---

## Issues to Fix ⚠️

---

### 🔴 CRITICAL — 3-Shift Use Cases

**File:** `src/i18n/locales/en/onboarding.json`
**Key path:** `shiftSystem.cards["3-shift"].details.useCases`

Explicitly lists non-mining industries — a miner configuring 8-hour shifts for a
processing plant will see "Healthcare" and "Call centers" as examples.

```json
// CURRENT — explicitly names non-mining industries:
"useCases": ["Manufacturing", "Healthcare", "Call centers", "24/7 operations"]

// REPLACE WITH:
"useCases": ["Underground mines", "Processing plants", "Mine infrastructure", "24/7 operations"]
```

---

### 🟡 MEDIUM — "Workplace" Language in Shift System Descriptions

**File:** `src/i18n/locales/en/onboarding.json`
**Key paths:** `shiftSystem.cards["2-shift"].description`, `shiftSystem.cards["3-shift"].description`,
`shiftPattern.instruction`

Generic "workplace" could refer to any office, hospital, or call centre.
Miners say "mine site" or just "site."

| Key                                        | Current text                                   | Suggested replacement                                 |
| ------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------- |
| `shiftSystem.cards["2-shift"].description` | "Your **workplace** runs two 12-hour shifts…"  | "Your **mine** runs two 12-hour shifts…"              |
| `shiftSystem.cards["3-shift"].description` | "Your **workplace** runs three 8-hour shifts…" | "Your **processing plant** runs three 8-hour shifts…" |
| `shiftPattern.instruction`                 | "Choose the rotation your **workplace** uses"  | "Choose the rotation your **mine site** uses"         |

---

### 🟡 MEDIUM — Feature Pill Descriptions — Completion Screen

**Files:**

- `src/screens/onboarding/premium/PremiumCompletionScreen.tsx` lines ~178–234 (hardcoded fallbacks in `FEATURE_HIGHLIGHTS`)
- `src/i18n/locales/en/onboarding.json` → `completion.features.*` (translated versions)

The descriptions are generic shift-worker wellness copy. Rephrase to reference
mining-specific context (underground safety, FIFO swings, site allowances).

| Feature key | Current description                                                             | Mining-specific replacement                                              |
| ----------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `fatigue`   | "Track your energy levels and get alerts when fatigue risk is high"             | "Monitor fatigue risk on long shifts — critical for underground safety"  |
| `balance`   | "Maintain healthy routines with activity and wellness tracking"                 | "Stay healthy between FIFO swings with routine and wellness tracking"    |
| `earnings`  | "Automatically calculate overtime, penalties, and shift allowances"             | "Calculate site allowances, FIFO loadings, and overtime automatically"   |
| `meals`     | "Stay healthy with meal timing suggestions and hydration reminders"             | "Stay hydrated and fuelled through 12-hour underground shifts"           |
| `reminders` | "Never miss a shift with intelligent notifications that adapt to your rotation" | "Never miss a callout — smart reminders that adapt to your roster swing" |
| `team`      | "See your crew schedule and coordinate handovers seamlessly"                    | ✅ Keep — "crew" and "handovers" are already mining-compatible           |

---

### 🟢 LOW — Occupation Field Placeholder

**File:** `src/i18n/locales/en/onboarding.json`
**Keys:** `introduction.askOccupation`, `introduction.placeholders.occupation`

The occupation field has no mining examples — a user could enter "Nurse" or "Barista"
without any cue that this is a mining app.

```json
// CURRENT:
"askOccupation": "Great to meet you, {{name}}! What's your occupation?",
"placeholders": { "occupation": "Enter your occupation" }

// SUGGESTED:
"askOccupation": "Great to meet you, {{name}}! What's your role on site?",
"placeholders": { "occupation": "e.g. Haul truck operator, Boilermaker, Electrician" }
```

---

### 🟢 LOW — Sign-Up Screen Subtitle

**File:** `src/screens/auth/SignUpScreen.tsx` (planned — not yet created)
**Location:** header subtitle, ~line 1056 in plan

```typescript
// CURRENT (generic):
'Start tracking your shifts with Ellie';

// SUGGESTED:
'Your mine site roster, always in your pocket';
```

---

### 🟢 LOW — Notification Title Text

**File:** `src/services/NotificationService.ts`
**Lines:** ~275–294 — `buildShiftReminderContent()`

```typescript
// CURRENT:
const title = `${shiftType} Reminder`; // → "Day Shift Reminder"

// SUGGESTED:
const title = shift.isNightShift ? 'Night Shift Callout' : 'Day Shift Callout';
```

"Callout" is the mining term for being notified to come to work.

---

### 🟢 LOW — Onboarding Loading Text

**File:** `src/i18n/locales/en/onboarding.json`
**Key:** `completion.loading`

```json
// CURRENT:
"loading": "Setting up your calendar..."

// SUGGESTED:
"loading": "Building your roster calendar..."
```

"Roster" is the standard mining term. "Calendar" reads as generic office language.

---

## Summary

| Priority    | Count | What to change                                                                                      |
| ----------- | ----- | --------------------------------------------------------------------------------------------------- |
| 🔴 Critical | 1     | 3-shift use cases — replace Healthcare/Call centers with underground mines/processing plants        |
| 🟡 Medium   | 2     | "Workplace" → "mine"/"mine site" in shift system descriptions; rephrase 5 feature pill descriptions |
| 🟢 Low      | 4     | Occupation placeholder examples, sign-up subtitle, notification title, loading text                 |
