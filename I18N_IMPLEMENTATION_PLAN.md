# i18n_plan — Multi-Language Implementation for Ellie Mining Shift Companion

## Context

Ellie is used by shift workers in the global mining industry. The top mining nations — Australia, Chile, Peru, Brazil, China, Russia, South Africa, India, Indonesia, Canada — each have workers who speak different languages. Currently the app has 140+ hardcoded English strings across 43+ files with zero i18n infrastructure. This plan adds world-class multilingual support using the most battle-tested React Native i18n stack, prioritised by mining workforce density.

---

## Mining-Region Language Priority

| #   | Language   | Code    | Key Mining Region                                            |
| --- | ---------- | ------- | ------------------------------------------------------------ |
| 1   | English    | `en`    | Australia, Canada, USA, South Africa (base — already in app) |
| 2   | Spanish    | `es`    | Chile (#1 copper), Peru (#2 copper/silver), Mexico (gold)    |
| 3   | Portuguese | `pt-BR` | Brazil (iron ore, gold, nickel, niobium)                     |
| 4   | Mandarin   | `zh-CN` | China (top coal, rare earth, gold)                           |
| 5   | Russian    | `ru`    | Russia (gold, nickel, palladium, Siberian mines)             |
| 6   | Hindi      | `hi`    | India (coal, iron ore)                                       |
| 7   | French     | `fr`    | DRC (cobalt/copper), Canada (Québec)                         |
| 8   | Afrikaans  | `af`    | South Africa (gold, platinum, coal)                          |
| 9   | Zulu       | `zu`    | South Africa (most common mining lingua franca base)         |
| 10  | Indonesian | `id`    | Indonesia (nickel, coal, copper)                             |

**Phase 1 delivery:** `en` + `es` + `pt-BR` (covers ~60% of global mine workers, highest ROI)
**Phase 2:** `zh-CN` + `ru` + `hi`
**Phase 3:** `fr` + `af` + `zu` + `id`

### Runtime Extension Status (March 10, 2026)

- Implemented additional runtime languages ahead of Phase 3:
  - `fr` (French)
  - `ar` (Arabic)
- Added Arabic RTL behavior with direction toggle + app reload on language switch.
- Runtime UI language list now includes:
  - `en`, `es`, `pt-BR`, `fr`, `ar`

---

## Library Choice: `i18next` + `react-i18next` + `expo-localization`

**Why i18next over Lingui:** Lingui is smaller (~10 KB vs ~22 KB) but requires a compile step. i18next has no build changes, better AsyncStorage integration docs, and the largest React Native community. For an existing Expo project this is the right call.

**Packages to install (no native linking required — pure JS):**

```
npx expo install expo-localization
npm install i18next react-i18next
```

`@react-native-async-storage/async-storage` is already installed (v2.2.0 in package.json).

---

## New Files to Create

```
src/
  i18n/
    index.ts               — i18next init, language detection, AsyncStorage persistence
    languageDetector.ts    — custom detector: AsyncStorage → expo-localization → 'en'
    types.ts               — TypeScript namespace augmentation (type-safe t() keys)
    locales/
      en/
        common.json        — buttons, errors, shared labels
        onboarding.json    — all onboarding screen strings
        dashboard.json     — dashboard strings
        profile.json       — profile/settings strings
        schedule.json      — schedule screen strings
      es/ pt-BR/           — same structure, Phase 1
      zh-CN/ ru/ hi/       — Phase 2
      fr/ af/ zu/ id/      — Phase 3
  contexts/
    LanguageContext.tsx    — exposes { language, setLanguage }, wraps dayjs locale too
  components/
    profile/
      LanguageSelectorSheet.tsx  — bottom sheet (same spring pattern as PatternSelectorSheet)
```

---

## Complete String Inventory (Every File)

### `src/components/dashboard/PersonalizedHeader.tsx`

```
Line 58:  'Good morning'
Line 61:  'Good afternoon'
Line 64:  'Good evening'
Line 66:  'Good night'
Line 167: 'Choose from Library'
Line 174: 'Take Photo'
Line 184: 'Remove Photo'
Line 193: 'Cancel'
Line 195: 'Profile Photo'       ← Alert title
Line 195: 'Choose your avatar'  ← Alert message
```

Namespace: `dashboard` (greetings) + `common` (avatar action sheet)

### `src/screens/main/MainDashboardScreen.tsx`

```
Line 250: 'Just now'
Line 251: `${diffSec}s ago`          ← interpolation: {{count}}s ago
Line 253: `${diffMin}m ago`          ← interpolation: {{count}}m ago
Line 344: 'Unable to load shift data'
Line 366: 'Schedule updated'
Line 382: 'Refreshing schedule...'
Line 382: 'Pull to refresh'
Line 395: 'Updated '                 ← prefix for timestamp
Line 402: 'User'                     ← fallback name
Line 421: `${n}d until rest block`   ← FIFO countdown
Line 422: `${n}d until work block`   ← FIFO countdown
```

Namespace: `dashboard`

### `src/screens/main/ProfileScreen.tsx`

```
Line 159: 'Personal Information'    ← ProfileSectionHeader title
Line 204: 'Work Overview'           ← ProfileSectionHeader title
Line 220: 'Run Onboarding Again'    ← dev-only button
```

Namespace: `profile`

### `src/components/profile/ProfileEditForm.tsx`

```
Line 104: 'Name'
Line 105: 'Occupation'
Line 106: 'Company'
Line 107: 'Country'
Line 176: 'Select country'
Line 186: 'Cancel'
Line 193: 'Save Changes'
Line 228: 'Not set'
```

Namespace: `profile`

### `src/components/profile/ShiftSettingsPanel.tsx`

Read-mode labels (ReadRow label prop):

```
'System', 'Roster', 'Pattern', 'Start Date', 'Cycle',
'Day', 'Night', 'Morning', 'Afternoon',         ← shift type labels
'Work', 'Rest', 'Shifts',                        ← FIFO block labels
'Day Shifts', 'Night Shifts', 'Sequence',
'Day Shift', 'Night Shift', 'Fly-In', 'Fly-Out', 'Site'
```

Edit-mode section labels:

```
'SHIFT SYSTEM', 'ROSTER TYPE', 'SHIFT PATTERN', 'SHIFT TIMES',
'FIFO ROSTER', 'WORK PATTERN', 'CUSTOM SEQUENCE', 'SITE DETAILS',
'TRAVEL DAYS (OPTIONAL)', 'SCHEDULE ANCHOR'
```

Edit-mode time row labels:

```
'Day Start', 'Day End', 'Night Start', 'Night End',
'Morning Start', 'Afternoon Start',
'Work Block', 'Rest Block'
```

Edit-mode input placeholders / labels:

```
'Site Name (optional)', 'Fly-In Day', 'Fly-Out Day'
```

Edit-mode sub-labels (patternRowSub):

```
'Cycle reference date', 'Current position in cycle'
```

Chip labels (ShiftSystem):

```
'2-Shift (12h)', '3-Shift (8h)'
```

Chip labels (RosterType):

```
'Rotating Roster', 'FIFO Roster'
```

Chip labels (WorkPattern):

```
'Straight Days', 'Straight Nights', 'Swing', 'Custom'
```

Buttons:

```
'Edit Shift Settings', 'Save Changes', 'Cancel', 'Set'
```

getCyclePositionLabel return values:

```
'Work Block · Day {{day}} of {{total}}', 'Rest Block · Day {{day}} of {{total}}',
'{{phase}} · Day {{day}} of {{total}}', 'Day {{day}} of cycle'
```

formatStartDate fallback:

```
'Not set'
```

Namespace: `profile`

### `src/components/dashboard/CurrentShiftStatusCard.tsx`

```
Line 79:  'Stay energized!'          ← day shift subtitle
Line 84:  'Stay alert!'              ← night shift subtitle
Line 89:  'Rise and shine!'          ← morning shift subtitle
Line 94:  'Keep it going!'           ← afternoon shift subtitle
Line 99:  'Rest and recharge!'       ← off day subtitle
Line 106: 'On-site roster active'    ← FIFO work block subtitle
Line 112: 'Home block active'        ← FIFO rest block subtitle
Line 148: 'Work' / 'Rest'            ← FIFO block names
Line 165: 'Block change today!'
Line 166: 'Block change tomorrow!'
```

Namespace: `dashboard`

### `src/components/dashboard/UpcomingShiftsCard.tsx`

```
Line 38: 'Day Shift'
Line 39: 'Night Shift'
Line 40: 'Morning Shift'
Line 41: 'Afternoon Shift'
Line 42: 'Day Off'
```

Namespace: `dashboard`

### `src/components/dashboard/MonthlyCalendarCard.tsx`

```
Lines 87-98: 'January' through 'December'   ← REPLACE with dayjs().locale(lang).format('MMMM')
Line 602: 'Previous month'                   ← accessibilityLabel
Line 620: 'Next month'                       ← accessibilityLabel
Lines 757-774: 'Day', 'Morning', 'Afternoon', 'Night', 'Off'  ← legend labels
```

NOTE: Month names should use `dayjs(new Date(year, monthIndex)).locale(currentLang).format('MMMM')` instead of the hardcoded array — this automatically localises via dayjs.
Namespace: `dashboard`

### `src/components/dashboard/StatisticsCard.tsx`

```
Line 104: 'Work Days'
Line 112: 'Off Days'
Line 120: 'Balance'
```

Namespace: `dashboard`

### `src/components/profile/WorkStatsSummary.tsx`

```
Line 68: 'Day Cycle'
Line 73: 'Work : Rest'
Line 78: 'Per Shift'
```

Namespace: `profile`

### `src/screens/main/ScheduleScreen.tsx`

```
Line 33: 'Schedule'
Line 36: 'Coming Soon'
Line 39: 'Your detailed shift calendar and schedule management will appear here.'
```

Namespace: `schedule`

### `src/screens/main/StatsScreen.tsx`

(similar placeholder screen — same pattern as ScheduleScreen)
Namespace: `schedule`

### `src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`

```
Line 174: 'Your Mining Shift Companion'   ← tagline
Line 180: 'Get Started'                   ← button title
```

Namespace: `onboarding`

### `src/screens/onboarding/premium/PremiumIntroductionScreen.tsx`

Bot messages (hardcoded strings passed to `addBotMessage()`):

```
"Welcome to Ellie! I'm here to help you set up your shift calendar. Let's start by getting to know you a bit better."
"What's your name?"
`Great to meet you, ${formData.name}! What's your occupation?`    ← interpolation: {{name}}
"Got it! Which company do you work for?"
"Almost done! Which country are you based in?"
```

Validation errors (Zod schema strings):

```
'Name must be at least 2 characters'
'Name must not exceed 50 characters'
"Name can only contain letters, spaces, hyphens, and apostrophes"
'Occupation is required'
'Company is required'
'Country must be at least 2 characters'
'Country must not exceed 100 characters'
```

SPECIAL CASE — bot message dedup checks (lines 251, 273, 295, 317):
Currently the code checks `m.content.includes("What's your name?")` to avoid re-asking. This breaks with translation. FIX: add a `questionKey` field to `Message` type metadata, check by key not content:

```typescript
// In Message type — add optional questionKey to metadata
metadata?: { label?: string; validated?: boolean; questionKey?: string };

// When adding bot message for a question step, pass the key:
addBotMessage(t('onboarding:intro.askName'), 800, 'askName');
// addBotMessage signature becomes: (content, duration, questionKey?)

// Dedup check changes from:
messages.some(m => m.type === 'bot' && m.content.includes("What's your name?"))
// To:
messages.some(m => m.type === 'bot' && m.metadata?.questionKey === 'askName')
```

Namespace: `onboarding`

### `src/screens/onboarding/premium/PremiumShiftSystemScreen.tsx`

```
'Day & night'                                                    ← 2-shift name
'Your workplace runs two 12-hour shifts—one during the day, one at night'
'Mining sites', 'Oil & gas', '24/7 operations', 'Remote work'   ← useCases
'Extended rest periods', 'Predictable schedule', ...            ← pros
'Long shift duration', ...                                       ← cons
'Morning, afternoon & night'                                     ← 3-shift name
'Your workplace runs three 8-hour shifts...'
'Manufacturing', 'Healthcare', 'Call centers', ...
'Please review systems again to make your selection'
'Close', 'Review Systems', 'Continue'
```

Namespace: `onboarding`

### `src/screens/onboarding/premium/PremiumShiftPatternScreen.tsx`

All pattern descriptions, workRestRatio strings, useCases, pros, cons arrays.
Namespace: `onboarding`

### `src/screens/onboarding/premium/PremiumCompletionScreen.tsx`

```
Feature texts: 'Smart shift reminders', 'Sleep tracking & insights',
  'Fatigue monitoring', 'Team coordination', 'Work-life balance',
  'Earnings calculator', 'Meal & hydration'
Feature descriptions (7 long strings)
'Failed to save your data. Please try again.'
```

Namespace: `onboarding`

### All other onboarding screens

`PremiumRosterTypeScreen`, `PremiumCustomPatternScreen`, `PremiumFIFOCustomPatternScreen`,
`PremiumPhaseSelectorScreen`, `PremiumFIFOPhaseSelectorScreen`, `PremiumStartDateScreen`,
`PremiumShiftTimeInputScreen` — all UI labels, button titles, section headers.
Namespace: `onboarding`

---

## Key Files to Modify (Implementation Order)

### Step 1 — Install packages

```bash
npx expo install expo-localization
npm install i18next react-i18next
```

No native linking. `@react-native-async-storage/async-storage` v2.2.0 already in `package.json`.

### Step 2 — Create `src/i18n/languageDetector.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

export const LANGUAGE_KEY = '@ellie_language';

export const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lang: string) => void) => {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (saved) {
      callback(saved);
      return;
    }
    const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'en';
    callback(deviceLang);
  },
  init: () => {},
  cacheUserLanguage: async (lang: string) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  },
};
```

### Step 3 — Create `src/i18n/index.ts`

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { languageDetector } from './languageDetector';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import 'dayjs/locale/pt-br';

// Phase 1 locales
import enCommon from './locales/en/common.json';
import enOnboarding from './locales/en/onboarding.json';
import enDashboard from './locales/en/dashboard.json';
import enProfile from './locales/en/profile.json';
import enSchedule from './locales/en/schedule.json';
import esCommon from './locales/es/common.json';
import esOnboarding from './locales/es/onboarding.json';
import esDashboard from './locales/es/dashboard.json';
import esProfile from './locales/es/profile.json';
import esSchedule from './locales/es/schedule.json';
import ptBRCommon from './locales/pt-BR/common.json';
import ptBROnboarding from './locales/pt-BR/onboarding.json';
import ptBRDashboard from './locales/pt-BR/dashboard.json';
import ptBRProfile from './locales/pt-BR/profile.json';
import ptBRSchedule from './locales/pt-BR/schedule.json';

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    ns: ['common', 'onboarding', 'dashboard', 'profile', 'schedule'],
    defaultNS: 'common',
    resources: {
      en: {
        common: enCommon,
        onboarding: enOnboarding,
        dashboard: enDashboard,
        profile: enProfile,
        schedule: enSchedule,
      },
      es: {
        common: esCommon,
        onboarding: esOnboarding,
        dashboard: esDashboard,
        profile: esProfile,
        schedule: esSchedule,
      },
      'pt-BR': {
        common: ptBRCommon,
        onboarding: ptBROnboarding,
        dashboard: ptBRDashboard,
        profile: ptBRProfile,
        schedule: ptBRSchedule,
      },
    },
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

// Set dayjs locale on init
const syncDayjsLocale = (lang: string) => {
  if (lang === 'pt-BR' || lang === 'pt') dayjs.locale('pt-br');
  else dayjs.locale(lang.split('-')[0]);
};
i18n.on('initialized', () => syncDayjsLocale(i18n.language));
i18n.on('languageChanged', (lang) => syncDayjsLocale(lang));

export default i18n;
```

### Step 4 — Create `src/i18n/types.ts`

```typescript
import type enCommon from './locales/en/common.json';
import type enOnboarding from './locales/en/onboarding.json';
import type enDashboard from './locales/en/dashboard.json';
import type enProfile from './locales/en/profile.json';
import type enSchedule from './locales/en/schedule.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof enCommon;
      onboarding: typeof enOnboarding;
      dashboard: typeof enDashboard;
      profile: typeof enProfile;
      schedule: typeof enSchedule;
    };
  }
}
```

### Step 5 — Create `src/contexts/LanguageContext.tsx`

```typescript
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import i18n from '@/i18n';

interface LanguageContextValue {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: async () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(i18n.language ?? 'en');

  const setLanguage = useCallback(async (lang: string) => {
    await i18n.changeLanguage(lang); // this calls cacheUserLanguage in languageDetector
    setLanguageState(lang);
    // dayjs locale is synced via the i18n.on('languageChanged') listener in i18n/index.ts
  }, []);

  // Sync on first render once i18n has detected the language
  useEffect(() => {
    const onInit = () => setLanguageState(i18n.language);
    if (i18n.isInitialized) { setLanguageState(i18n.language); }
    else { i18n.on('initialized', onInit); }
    return () => { i18n.off('initialized', onInit); };
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
```

### Step 6 — Update `index.ts` (app root)

```typescript
// Add BEFORE the App import — i18n must init synchronously first
import './src/i18n';
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
```

### Step 7 — Update `App.tsx`

Add `LanguageProvider` between `OnboardingProvider` and `VoiceAssistantProvider`:

```typescript
import { LanguageProvider } from './src/contexts/LanguageContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <OnboardingProvider>
          <LanguageProvider>               {/* ADD */}
            <VoiceAssistantProvider>
              <AppContent />
            </VoiceAssistantProvider>
          </LanguageProvider>             {/* ADD */}
        </OnboardingProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

### Step 8 — Update `src/components/dashboard/PersonalizedHeader.tsx`

```typescript
// Add import
import { useTranslation } from 'react-i18next';

// Inside getGreeting() — change return values:
function getGreeting(t: (key: string) => string): GreetingData {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)
    return { text: t('greeting.morning'), icon: 'sunny-outline', iconColor: '#f97316' };
  if (hour >= 12 && hour < 17)
    return { text: t('greeting.afternoon'), icon: 'partly-sunny-outline', iconColor: '#d97706' };
  if (hour >= 17 && hour < 21)
    return { text: t('greeting.evening'), icon: 'moon-outline', iconColor: '#8b5cf6' };
  return { text: t('greeting.night'), icon: 'cloudy-night-outline', iconColor: '#6366f1' };
}

// In component body:
const { t } = useTranslation('dashboard');
const greeting = useMemo(() => getGreeting(t), [liveTick, t]); // eslint-disable-line

// showAvatarActionSheet — replace strings:
text: t('avatar.chooseFromLibrary', { ns: 'common' });
text: t('avatar.takePhoto', { ns: 'common' });
text: t('avatar.removePhoto', { ns: 'common' });
text: t('buttons.cancel');
Alert.alert(t('avatar.title', { ns: 'common' }), t('avatar.message', { ns: 'common' }), buttons);
```

### Step 9 — Update `src/screens/main/MainDashboardScreen.tsx`

```typescript
import { useTranslation } from 'react-i18next';
// In component body:
const { t } = useTranslation('dashboard');

// lastUpdatedText (line ~250):
if (diffSec < 10) return t('lastUpdated.justNow');
if (diffSec < 60) return t('lastUpdated.secondsAgo', { count: diffSec });
const diffMin = Math.floor(diffSec / 60);
if (diffMin < 60) return t('lastUpdated.minutesAgo', { count: diffMin });
return lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Error state (line 344):
<Animated.Text style={styles.errorText}>{t('errors.loadFailed')}</Animated.Text>

// Success banner (line 366):
<Text style={styles.refreshSuccessText}>{t('scheduleUpdated')}</Text>

// RefreshControl (line 382):
title={refreshing ? t('refreshing') : t('pullToRefresh')}

// Last updated prefix (line 395):
<Text style={styles.lastUpdatedText}>{t('lastUpdated.updatedPrefix')}{lastUpdatedText}</Text>

// Fallback name (line 402):
name={userData.name || t('user.defaultName')}

// FIFO countdown (line 421):
countdown={
  shiftCycle.rosterType === RosterType.FIFO && fifoBlockInfo
    ? t(fifoBlockInfo.inWorkBlock ? 'fifo.untilRest' : 'fifo.untilWork', { count: fifoBlockInfo.daysUntilBlockChange })
    : (activeShift.countdown ?? undefined)
}
```

### Step 10 — Update `src/screens/main/ProfileScreen.tsx`

```typescript
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelectorSheet } from '@/components/profile/LanguageSelectorSheet';

// In component body:
const { t } = useTranslation('profile');
const { language, setLanguage } = useLanguage();
const [languageSheetVisible, setLanguageSheetVisible] = useState(false);

// Replace hardcoded strings:
<ProfileSectionHeader title={t('sections.personalInfo')} ... />
<ProfileSectionHeader title={t('sections.workOverview')} ... />

// Add Language row AFTER WorkStatsSummary and BEFORE the dev tools section:
<TouchableOpacity
  style={styles.languageRow}
  onPress={() => setLanguageSheetVisible(true)}
  accessibilityRole="button"
>
  <Ionicons name="language-outline" size={18} color={theme.colors.sacredGold} />
  <Text style={styles.languageLabel}>{t('language.label')}</Text>
  <Text style={styles.languageValue}>{LANGUAGE_NAMES[language] ?? language}</Text>
  <Ionicons name="chevron-forward" size={16} color={theme.colors.dust} />
</TouchableOpacity>

<LanguageSelectorSheet
  visible={languageSheetVisible}
  onClose={() => setLanguageSheetVisible(false)}
  currentLanguage={language}
  onSelect={setLanguage}
/>
```

Add these styles to ProfileScreen's StyleSheet:

```typescript
languageRow: {
  flexDirection: 'row', alignItems: 'center', gap: 10,
  paddingHorizontal: theme.spacing.lg, paddingVertical: 14,
  backgroundColor: theme.colors.darkStone,
  borderRadius: theme.borderRadius.md,
  marginHorizontal: theme.spacing.lg, marginTop: theme.spacing.md,
  borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
},
languageLabel: { flex: 1, fontSize: theme.typography.fontSizes.sm, color: theme.colors.dust },
languageValue: { fontSize: theme.typography.fontSizes.sm, color: theme.colors.paper },
```

### Step 11 — Update `src/components/profile/ProfileEditForm.tsx`

```typescript
const { t } = useTranslation('profile');
// Field labels:
{ key: 'name', label: t('fields.name'), ... }
{ key: 'occupation', label: t('fields.occupation'), ... }
{ key: 'company', label: t('fields.company'), ... }
{ key: 'country', label: t('fields.country'), ... }
// Country placeholder:
{country || t('fields.selectCountry')}
// Buttons:
title={t('buttons.cancel', { ns: 'common' })}
title={t('fields.saveChanges')}
// Not set:
{field.value || t('fields.notSet')}
```

### Step 12 — Update `src/components/profile/ShiftSettingsPanel.tsx`

```typescript
const { t } = useTranslation('profile');

// All ReadRow label props — example:
label={t('shift.system')}         // 'System'
label={t('shift.roster')}         // 'Roster'
label={t('shift.pattern')}        // 'Pattern'
label={t('shift.startDate')}      // 'Start Date'
label={t('shift.cycle')}          // 'Cycle'
// ... all remaining labels

// formatStartDate fallback:
if (!date) return t('fields.notSet', { ns: 'profile' });

// getCyclePositionLabel:
return t('shift.cycleWorkBlock', { day: phaseOffset + 1, total: workBlockDays });
// etc.

// EditSectionLabel labels:
label={t('shift.sections.shiftSystem')}
label={t('shift.sections.rosterType')}
// etc.

// FlyDayStepper Set/Clear buttons use t('buttons.set') and t('buttons.clear')
// patternRowSub strings:
t('shift.cycleReferenceDate')     // 'Cycle reference date'
t('shift.currentPositionInCycle') // 'Current position in cycle'
```

### Step 13 — Update `src/components/dashboard/CurrentShiftStatusCard.tsx`

```typescript
const { t } = useTranslation('dashboard');
// Shift subtitles:
subtitle: t('shiftSubtitles.day'); // 'Stay energized!'
subtitle: t('shiftSubtitles.night'); // 'Stay alert!'
subtitle: t('shiftSubtitles.morning'); // 'Rise and shine!'
subtitle: t('shiftSubtitles.afternoon'); // 'Keep it going!'
subtitle: t('shiftSubtitles.off'); // 'Rest and recharge!'
subtitle: t('fifo.onSite'); // 'On-site roster active'
subtitle: t('fifo.homeBlock'); // 'Home block active'
// Block names:
const blockName = fifoBlockInfo.inWorkBlock ? t('fifo.workBlock') : t('fifo.restBlock');
// Block change:
t('fifo.blockChangeToday'); // 'Block change today!'
t('fifo.blockChangeTomorrow'); // 'Block change tomorrow!'
```

### Step 14 — Update `src/components/dashboard/MonthlyCalendarCard.tsx`

```typescript
import dayjs from 'dayjs';
// REMOVE the hardcoded MONTH_NAMES array (lines 87-98)
// REPLACE usage with:
const monthLabel = dayjs(new Date(year, month)).format('MMMM'); // uses active dayjs locale
// (dayjs locale is set globally in i18n/index.ts on language change — no prop needed)

// Legend labels:
const { t } = useTranslation('dashboard');
label={t('calendar.legendDay')}       // 'Day'
label={t('calendar.legendMorning')}   // 'Morning'
label={t('calendar.legendAfternoon')} // 'Afternoon'
label={t('calendar.legendNight')}     // 'Night'
label={t('calendar.legendOff')}       // 'Off'
```

### Step 15 — Update `src/components/dashboard/UpcomingShiftsCard.tsx`

```typescript
const { t } = useTranslation('dashboard');
// Shift label map — change from hardcoded object to translated:
const shiftLabelMap = {
  day: t('shiftLabels.day'),
  night: t('shiftLabels.night'),
  morning: t('shiftLabels.morning'),
  afternoon: t('shiftLabels.afternoon'),
  off: t('shiftLabels.off'),
};
```

### Step 16 — Update `src/components/dashboard/StatisticsCard.tsx`

```typescript
const { t } = useTranslation('dashboard');
label={t('stats.workDays')}   // 'Work Days'
label={t('stats.offDays')}    // 'Off Days'
label={t('stats.balance')}    // 'Balance'
```

### Step 17 — Update `src/components/profile/WorkStatsSummary.tsx`

```typescript
const { t } = useTranslation('profile');
label: t('stats.dayCycle'); // 'Day Cycle'
label: t('stats.workRest'); // 'Work : Rest'
label: t('stats.perShift'); // 'Per Shift'
```

### Step 18 — Update `src/screens/main/ScheduleScreen.tsx`

```typescript
const { t } = useTranslation('schedule');
<Animated.Text style={styles.title}>{t('title')}</Animated.Text>
<Animated.Text style={styles.subtitle}>{t('comingSoon')}</Animated.Text>
<Animated.Text style={styles.description}>{t('description')}</Animated.Text>
```

### Step 19 — Fix `src/screens/onboarding/premium/PremiumIntroductionScreen.tsx`

The key challenge: dedup checks (`messages.some(m => m.content.includes("What's your name?"))`)
must change to use a key, not content. See special case in string inventory above.

```typescript
// 1. Extend Message type metadata:
metadata?: { label?: string; validated?: boolean; questionKey?: string };

// 2. Add optional questionKey param to addBotMessage:
const addBotMessage = useCallback((content: string, typingDuration: number, questionKey?: string) => {
  // ...existing code...
  const newMessage: Message = {
    id: generateId(), type: 'bot', content, timestamp: Date.now(),
    metadata: questionKey ? { questionKey } : undefined,
  };
  // ...
}, [reducedMotion]);

// 3. Pass keys when adding question messages:
addBotMessage(t('intro.welcome'), 1000);
addBotMessage(t('intro.askName'), 800, 'askName');
addBotMessage(t('intro.askOccupation', { name: formData.name }), 900, 'askOccupation');
addBotMessage(t('intro.askCompany'), 1000, 'askCompany');
addBotMessage(t('intro.askCountry'), 900, 'askCountry');

// 4. Change dedup checks:
const nameQuestionExists = messages.some(m => m.type === 'bot' && m.metadata?.questionKey === 'askName');
const occupationQuestionExists = messages.some(m => m.type === 'bot' && m.metadata?.questionKey === 'askOccupation');
const companyQuestionExists = messages.some(m => m.type === 'bot' && m.metadata?.questionKey === 'askCompany');
const countryQuestionExists = messages.some(m => m.type === 'bot' && m.metadata?.questionKey === 'askCountry');

// 5. Zod validation messages → use t() for error strings
// (In catch blocks: setError(t('intro.errors.nameTooShort')) etc.)
```

### Step 20 — Update `src/screens/onboarding/premium/PremiumWelcomeScreen.tsx`

```typescript
const { t } = useTranslation('onboarding');
<Animated.Text style={[styles.tagline, taglineAnimatedStyle]}>
  {t('welcome.tagline')}
</Animated.Text>
<PremiumButton title={t('welcome.getStarted')} ... />
```

### Step 21 — Update remaining onboarding screens

`PremiumShiftSystemScreen`, `PremiumShiftPatternScreen`, `PremiumCompletionScreen`,
`PremiumRosterTypeScreen`, `PremiumCustomPatternScreen`, `PremiumFIFOCustomPatternScreen`,
`PremiumPhaseSelectorScreen`, `PremiumFIFOPhaseSelectorScreen`, `PremiumStartDateScreen`,
`PremiumShiftTimeInputScreen` — replace all hardcoded strings with `t()` calls.

### Step 22 — Create `src/components/profile/LanguageSelectorSheet.tsx`

Same animation pattern as `src/components/onboarding/PatternSelectorSheet.tsx`:

- `backdropOpacity` animated value: 0→1 via `withTiming(1, { duration: 280 })`
- `translateY`: from `SCREEN_HEIGHT` to 0 via `withSpring({ damping: 22, stiffness: 260 })`
- Returns `null` when `!visible` (no `isRendered` lifecycle needed — simplest pattern)

```typescript
const SUPPORTED_LANGUAGES = [
  { code: 'en', flag: '🇦🇺', name: 'English', nativeName: 'English' },
  { code: 'es', flag: '🇨🇱', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt-BR', flag: '🇧🇷', name: 'Portuguese', nativeName: 'Português' },
  // Phase 2+:
  { code: 'zh-CN', flag: '🇨🇳', name: 'Chinese', nativeName: '中文' },
  { code: 'ru', flag: '🇷🇺', name: 'Russian', nativeName: 'Русский' },
  { code: 'hi', flag: '🇮🇳', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'fr', flag: '🇫🇷', name: 'French', nativeName: 'Français' },
  { code: 'af', flag: '🇿🇦', name: 'Afrikaans', nativeName: 'Afrikaans' },
  { code: 'zu', flag: '🇿🇦', name: 'Zulu', nativeName: 'isiZulu' },
  { code: 'id', flag: '🇮🇩', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
];
// Only show Phase 1 languages until translations are ready for Phase 2+
// Filter: SUPPORTED_LANGUAGES.filter(l => ['en','es','pt-BR'].includes(l.code))

interface LanguageSelectorSheetProps {
  visible: boolean;
  onClose: () => void;
  currentLanguage: string;
  onSelect: (lang: string) => Promise<void>;
}
```

Sheet content: ScrollView of `TouchableOpacity` rows — flag + name + nativeName + gold `checkmark` icon on current selection. On tap: `onSelect(lang.code)` → `onClose()` → haptic Light.

Also export `LANGUAGE_NAMES` map used in ProfileScreen:

```typescript
export const LANGUAGE_NAMES: Record<string, string> = {
  'en': 'English', 'es': 'Español', 'pt-BR': 'Português', ...
};
```

---

## Complete Translation JSON Files

### `src/i18n/locales/en/common.json`

```json
{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "back": "Back",
    "next": "Next",
    "done": "Done",
    "set": "Set",
    "edit": "Edit",
    "clear": "Clear",
    "close": "Close"
  },
  "errors": {
    "loadFailed": "Failed to load data",
    "saveFailed": "Failed to save changes"
  },
  "avatar": {
    "title": "Profile Photo",
    "message": "Choose your avatar",
    "chooseFromLibrary": "Choose from Library",
    "takePhoto": "Take Photo",
    "removePhoto": "Remove Photo"
  },
  "language": {
    "label": "Language",
    "selector": "Select Language"
  }
}
```

### `src/i18n/locales/en/dashboard.json`

```json
{
  "greeting": {
    "morning": "Good morning",
    "afternoon": "Good afternoon",
    "evening": "Good evening",
    "night": "Good night"
  },
  "pullToRefresh": "Pull to refresh",
  "refreshing": "Refreshing schedule...",
  "scheduleUpdated": "Schedule updated",
  "lastUpdated": {
    "justNow": "Just now",
    "secondsAgo": "{{count}}s ago",
    "minutesAgo": "{{count}}m ago",
    "updatedPrefix": "Updated "
  },
  "errors": {
    "loadFailed": "Unable to load shift data"
  },
  "user": {
    "defaultName": "User"
  },
  "shiftLabels": {
    "day": "Day Shift",
    "night": "Night Shift",
    "morning": "Morning Shift",
    "afternoon": "Afternoon Shift",
    "off": "Day Off"
  },
  "shiftSubtitles": {
    "day": "Stay energized!",
    "night": "Stay alert!",
    "morning": "Rise and shine!",
    "afternoon": "Keep it going!",
    "off": "Rest and recharge!"
  },
  "fifo": {
    "onSite": "On-site roster active",
    "homeBlock": "Home block active",
    "workBlock": "Work",
    "restBlock": "Rest",
    "blockChangeToday": "Block change today!",
    "blockChangeTomorrow": "Block change tomorrow!",
    "untilRest": "{{count}}d until rest block",
    "untilWork": "{{count}}d until work block"
  },
  "stats": {
    "workDays": "Work Days",
    "offDays": "Off Days",
    "balance": "Balance"
  },
  "calendar": {
    "legendDay": "Day",
    "legendMorning": "Morning",
    "legendAfternoon": "Afternoon",
    "legendNight": "Night",
    "legendOff": "Off",
    "previousMonth": "Previous month",
    "nextMonth": "Next month"
  }
}
```

### `src/i18n/locales/en/profile.json`

```json
{
  "sections": {
    "personalInfo": "Personal Information",
    "workOverview": "Work Overview",
    "shiftSettings": "Shift Settings"
  },
  "fields": {
    "name": "Name",
    "occupation": "Occupation",
    "company": "Company",
    "country": "Country",
    "selectCountry": "Select country",
    "notSet": "Not set",
    "saveChanges": "Save Changes"
  },
  "stats": {
    "dayCycle": "Day Cycle",
    "workRest": "Work : Rest",
    "perShift": "Per Shift"
  },
  "language": {
    "label": "Language"
  },
  "shift": {
    "system": "System",
    "roster": "Roster",
    "pattern": "Pattern",
    "startDate": "Start Date",
    "cycle": "Cycle",
    "day": "Day",
    "night": "Night",
    "morning": "Morning",
    "afternoon": "Afternoon",
    "work": "Work",
    "rest": "Rest",
    "shifts": "Shifts",
    "dayShifts": "Day Shifts",
    "nightShifts": "Night Shifts",
    "sequence": "Sequence",
    "dayShift": "Day Shift",
    "nightShift": "Night Shift",
    "flyIn": "Fly-In",
    "flyOut": "Fly-Out",
    "site": "Site",
    "dayStart": "Day Start",
    "dayEnd": "Day End",
    "nightStart": "Night Start",
    "nightEnd": "Night End",
    "morningStart": "Morning Start",
    "afternoonStart": "Afternoon Start",
    "workBlock": "Work Block",
    "restBlock": "Rest Block",
    "siteName": "Site Name (optional)",
    "flyInDay": "Fly-In Day",
    "flyOutDay": "Fly-Out Day",
    "cycleReferenceDate": "Cycle reference date",
    "currentPositionInCycle": "Current position in cycle",
    "sections": {
      "shiftSystem": "SHIFT SYSTEM",
      "rosterType": "ROSTER TYPE",
      "shiftPattern": "SHIFT PATTERN",
      "shiftTimes": "SHIFT TIMES",
      "fifoRoster": "FIFO ROSTER",
      "workPattern": "WORK PATTERN",
      "customSequence": "CUSTOM SEQUENCE",
      "siteDetails": "SITE DETAILS",
      "travelDays": "TRAVEL DAYS (OPTIONAL)",
      "scheduleAnchor": "SCHEDULE ANCHOR"
    },
    "chips": {
      "twoShift": "2-Shift (12h)",
      "threeShift": "3-Shift (8h)",
      "rotating": "Rotating Roster",
      "fifo": "FIFO Roster",
      "straightDays": "Straight Days",
      "straightNights": "Straight Nights",
      "swing": "Swing",
      "custom": "Custom"
    },
    "editButton": "Edit Shift Settings",
    "cycleWorkBlock": "Work Block · Day {{day}} of {{total}}",
    "cycleRestBlock": "Rest Block · Day {{day}} of {{total}}",
    "cyclePhase": "{{phase}} · Day {{day}} of {{total}}",
    "cycleDay": "Day {{day}} of cycle"
  }
}
```

### `src/i18n/locales/en/onboarding.json`

```json
{
  "welcome": {
    "tagline": "Your Mining Shift Companion",
    "getStarted": "Get Started"
  },
  "intro": {
    "welcome": "Welcome to Ellie! I'm here to help you set up your shift calendar. Let's start by getting to know you a bit better.",
    "askName": "What's your name?",
    "askOccupation": "Great to meet you, {{name}}! What's your occupation?",
    "askCompany": "Got it! Which company do you work for?",
    "askCountry": "Almost done! Which country are you based in?",
    "errors": {
      "nameTooShort": "Name must be at least 2 characters",
      "nameTooLong": "Name must not exceed 50 characters",
      "nameInvalidChars": "Name can only contain letters, spaces, hyphens, and apostrophes",
      "occupationRequired": "Occupation is required",
      "companyRequired": "Company is required",
      "countryTooShort": "Country must be at least 2 characters",
      "countryTooLong": "Country must not exceed 100 characters"
    }
  },
  "shiftSystem": {
    "twoShiftName": "Day & night",
    "twoShiftDesc": "Your workplace runs two 12-hour shifts—one during the day, one at night",
    "twoShiftUseCases": ["Mining sites", "Oil & gas", "24/7 operations", "Remote work"],
    "twoShiftPros": ["Extended rest periods", "Predictable schedule", "Good work-life balance"],
    "twoShiftCons": [
      "Long shift duration",
      "Can be physically demanding",
      "Limited daylight in winter"
    ],
    "threeShiftName": "Morning, afternoon & night",
    "threeShiftDesc": "Your workplace runs three 8-hour shifts—morning, afternoon, and night",
    "threeShiftUseCases": ["Manufacturing", "Healthcare", "Call centers", "24/7 operations"],
    "threeShiftPros": ["Shorter shifts", "More time for family", "Easier to stay alert"],
    "threeShiftCons": [
      "More frequent shift changes",
      "Can disrupt sleep patterns",
      "Less rest between cycles"
    ],
    "reviewAgain": "Please review systems again to make your selection",
    "reviewButton": "Review Systems",
    "continueButton": "Continue",
    "closeButton": "Close"
  },
  "completion": {
    "features": {
      "reminders": "Smart shift reminders",
      "remindersDesc": "Never miss a shift with intelligent notifications that adapt to your rotation",
      "sleep": "Sleep tracking & insights",
      "sleepDesc": "Optimize your rest between shifts with personalized sleep analytics",
      "fatigue": "Fatigue monitoring",
      "fatigueDesc": "Track your energy levels and get alerts when fatigue risk is high",
      "team": "Team coordination",
      "teamDesc": "See your crew schedule and coordinate handovers seamlessly",
      "balance": "Work-life balance",
      "balanceDesc": "Maintain healthy routines with activity and wellness tracking",
      "earnings": "Earnings calculator",
      "earningsDesc": "Automatically calculate overtime, penalties, and shift allowances",
      "meals": "Meal & hydration",
      "mealsDesc": "Stay healthy with meal timing suggestions and hydration reminders"
    },
    "saveFailed": "Failed to save your data. Please try again."
  }
}
```

### `src/i18n/locales/en/schedule.json`

```json
{
  "title": "Schedule",
  "comingSoon": "Coming Soon",
  "description": "Your detailed shift calendar and schedule management will appear here."
}
```

### `src/i18n/locales/es/` (Phase 1 — Spanish)

`common.json`:

```json
{
  "buttons": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "confirm": "Confirmar",
    "back": "Atrás",
    "next": "Siguiente",
    "done": "Listo",
    "set": "Establecer",
    "edit": "Editar",
    "clear": "Limpiar",
    "close": "Cerrar"
  },
  "errors": { "loadFailed": "No se pudo cargar", "saveFailed": "No se pudo guardar" },
  "avatar": {
    "title": "Foto de perfil",
    "message": "Elige tu avatar",
    "chooseFromLibrary": "Elegir de la biblioteca",
    "takePhoto": "Tomar foto",
    "removePhoto": "Eliminar foto"
  },
  "language": { "label": "Idioma", "selector": "Seleccionar idioma" }
}
```

`dashboard.json`:

```json
{
  "greeting": {
    "morning": "Buenos días",
    "afternoon": "Buenas tardes",
    "evening": "Buenas noches",
    "night": "Buenas noches"
  },
  "pullToRefresh": "Desliza para actualizar",
  "refreshing": "Actualizando turno...",
  "scheduleUpdated": "Horario actualizado",
  "lastUpdated": {
    "justNow": "Ahora mismo",
    "secondsAgo": "hace {{count}}s",
    "minutesAgo": "hace {{count}}m",
    "updatedPrefix": "Actualizado "
  },
  "errors": { "loadFailed": "No se pudo cargar el turno" },
  "user": { "defaultName": "Usuario" },
  "shiftLabels": {
    "day": "Turno de día",
    "night": "Turno de noche",
    "morning": "Turno mañana",
    "afternoon": "Turno tarde",
    "off": "Día libre"
  },
  "shiftSubtitles": {
    "day": "¡Mantén la energía!",
    "night": "¡Mantente alerta!",
    "morning": "¡Buenos días!",
    "afternoon": "¡Sigue adelante!",
    "off": "¡Descansa y recarga!"
  },
  "fifo": {
    "onSite": "Turno en faena activo",
    "homeBlock": "Bloque en casa activo",
    "workBlock": "Trabajo",
    "restBlock": "Descanso",
    "blockChangeToday": "¡Cambio de bloque hoy!",
    "blockChangeTomorrow": "¡Cambio de bloque mañana!",
    "untilRest": "{{count}}d hasta descanso",
    "untilWork": "{{count}}d hasta trabajo"
  },
  "stats": { "workDays": "Días trabajo", "offDays": "Días libres", "balance": "Balance" },
  "calendar": {
    "legendDay": "Día",
    "legendMorning": "Mañana",
    "legendAfternoon": "Tarde",
    "legendNight": "Noche",
    "legendOff": "Libre",
    "previousMonth": "Mes anterior",
    "nextMonth": "Mes siguiente"
  }
}
```

`profile.json`, `onboarding.json`, `schedule.json` — same structure, translated to Spanish.

### `src/i18n/locales/pt-BR/` (Phase 1 — Brazilian Portuguese)

`dashboard.json` greeting excerpt:

```json
{
  "greeting": {
    "morning": "Bom dia",
    "afternoon": "Boa tarde",
    "evening": "Boa noite",
    "night": "Boa noite"
  },
  "pullToRefresh": "Puxe para atualizar",
  "refreshing": "Atualizando turno...",
  "scheduleUpdated": "Agenda atualizada"
}
```

All other namespaces translated to Portuguese.

---

## dayjs Locale Notes

- dayjs v1.11.19 already installed
- Locale sync happens via `i18n.on('languageChanged')` listener in `src/i18n/index.ts` (Step 3)
- `af` (Afrikaans) and `zu` (Zulu) have no dayjs locale — fall back to `'en'` (dates display in English, which is acceptable)
- Month names in `MonthlyCalendarCard`: remove the hardcoded `MONTH_NAMES` array and use `dayjs(new Date(year, month)).format('MMMM')` — locale is set globally so no prop required

---

## Phased Delivery

### Phase 1 — Steps 1–22 above (Infrastructure + en/es/pt-BR)

Touches 22 files. Creates 15 new files (i18n infra + 3×5 locale JSON files + LanguageContext + LanguageSelectorSheet).

### Phase 2 — Add zh-CN, ru, hi

- Add dayjs imports: `import 'dayjs/locale/zh-cn'`, `'ru'`, `'hi'`
- Add import + resource entries in `src/i18n/index.ts`
- Create `src/i18n/locales/zh-CN/`, `ru/`, `hi/` with all 5 JSON files

### Phase 3 — Add fr, af, zu, id

- Same pattern — add locales + update `SUPPORTED_LANGUAGES` list in `LanguageSelectorSheet.tsx`
- `af` and `zu`: no dayjs locale, use English fallback for dates

---

## Verification

1. `npx tsc --noEmit` — 0 errors. TypeScript validates all `t()` key paths via `types.ts` augmentation.
2. `npx jest --testPathPattern="Profile|Dashboard|Onboarding"` — all pass. The `PremiumIntroductionScreen` tests need updating for `questionKey` metadata change.
3. **English (baseline):** Fresh install → default English → all strings render correctly.
4. **Spanish auto-detect:** Set device language to Spanish → cold launch → greeting shows "Buenos días" → RefreshControl shows "Desliza para actualizar".
5. **Language picker:** ProfileScreen → Language row shows current language → tap → LanguageSelectorSheet → select "Português" → app re-renders immediately in Portuguese.
6. **Persistence:** Background/foreground app → language stays Portuguese. Kill + relaunch → still Portuguese (AsyncStorage).
7. **Fallback:** Set device language to Arabic (no translation) → app renders in English.
8. **dayjs locale:** Switch to Spanish → MonthlyCalendarCard month header shows "marzo" (not "March").
9. **FIFO countdown:** Switch to Spanish → countdown shows "3d hasta descanso".
10. **Chat bot dedup:** PremiumIntroductionScreen — navigate back to name question step → bot does NOT ask again → uses `metadata.questionKey` not content match.
11. **Missing key fallback:** Remove one key from es/dashboard.json → that string falls back to English, no crash, no blank.
12. **TypeScript guard:** Add a typo like `t('greeting.mornnig')` → TypeScript compile error, proving type safety works.
