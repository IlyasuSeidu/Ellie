# Ellie — Profile Screen Implementation

## Context

The Ellie app has 5 bottom tabs: Home, Schedule, Ellie (voice), Stats, and Profile. The Profile tab is currently a placeholder showing "Coming Soon". The user wants to implement the Profile tab in stages — starting with just the **Profile** portion (personal info + shift config display). Settings and Preferences will follow as separate phases.

**Goal:** Build a premium, modern Profile screen with an animated hero avatar section, editable personal information, read-only shift configuration summary, and work overview stats — all within the Sacred design system with rich Reanimated animations and haptic feedback.

---

## Phase 1: Utilities — `profileUtils.ts` (new file)

**File:** `src/utils/profileUtils.ts`

Extract display-name helpers currently duplicated inside `PremiumCompletionScreen.tsx` (lines 368-445) into a shared utility:

```typescript
export function getPatternDisplayName(data: {
  patternType?;
  shiftSystem?;
  customPattern?;
  fifoConfig?;
}): string;
export function getShiftSystemDisplayName(shiftSystem?: string): string;
export function getRosterTypeDisplayName(rosterType?: string): string;
export function getFIFOWorkPatternName(fifoConfig?: FIFOConfig): string;
export function getFIFOCycleDescription(fifoConfig?: FIFOConfig): string;
export function getCycleLengthDays(data: OnboardingData): number | null;
export function getWorkRestRatio(data: OnboardingData): string;
export function formatShiftTime(time?: string): string; // "06:00" → "6:00 AM"
```

Sources to extract from:

- `getPatternName()` at `PremiumCompletionScreen.tsx:368-410`
- `getShiftSystemName()` at `PremiumCompletionScreen.tsx:413-415`
- `getRosterTypeName()` at `PremiumCompletionScreen.tsx:418-420`
- `getFIFOWorkPatternName()` at `PremiumCompletionScreen.tsx:423-437`
- `getFIFOCycleDescription()` at `PremiumCompletionScreen.tsx:440-445`

New functions to add:

- `getCycleLengthDays()` — computes total cycle days from pattern config
- `getWorkRestRatio()` — returns "2:1", "1:1", etc.
- `formatShiftTime()` — formats 24h time string for display

---

## Phase 2: Custom Hook — `useProfileData.ts` (new file)

**File:** `src/hooks/useProfileData.ts`

Encapsulates all profile data management logic:

```typescript
interface UseProfileDataReturn {
  // Data from OnboardingContext
  data: OnboardingData;
  shiftCycle: ShiftCycle | null;

  // Edit mode
  isEditing: boolean;
  editedFields: Partial<OnboardingData>;

  // Actions
  startEditing: () => void; // copies current data → editedFields, sets isEditing=true
  cancelEditing: () => void; // discards editedFields, sets isEditing=false
  updateField: (field: string, value: string) => void; // updates editedFields locally
  saveChanges: () => void; // calls updateData() on context, haptic success, exits edit mode
  handleAvatarChange: (uri: string | null) => void; // saves immediately (no edit mode needed)

  // Computed display values (from profileUtils)
  patternDisplayName: string;
  shiftSystemName: string;
  rosterTypeName: string;
  cycleLengthText: string;
  workRestRatio: string;
}
```

Uses:

- `useOnboarding()` from `src/contexts/OnboardingContext.tsx` — provides `data` and `updateData`
- `buildShiftCycle()` from `src/utils/shiftUtils.ts` — computes ShiftCycle from onboarding data
- `profileUtils` functions for computed display values
- `expo-haptics` for save success feedback

---

## Phase 3: Section Header — `ProfileSectionHeader.tsx` (new file)

**File:** `src/components/profile/ProfileSectionHeader.tsx`

Simple reusable section divider:

```typescript
interface ProfileSectionHeaderProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  animationDelay?: number;
}
```

- Layout: Row with icon (18px, `sacredGold`) + title (`md` size, `semibold`, `paper` color)
- Below: 1px divider line (`softStone` color)
- Entrance animation: `FadeInUp` with configurable delay
- Padding: `horizontal: theme.spacing.lg`, `vertical: theme.spacing.md`

---

## Phase 4: Hero Section — `ProfileHeroSection.tsx` (new file)

**File:** `src/components/profile/ProfileHeroSection.tsx`

Centered column avatar hero (larger than dashboard's `PersonalizedHeader`):

```typescript
interface ProfileHeroSectionProps {
  name: string;
  occupation?: string;
  company?: string;
  country?: string;
  avatarUri?: string;
  isEditing: boolean;
  onAvatarChange: (uri: string | null) => void;
  onEditPress: () => void;
  animationDelay?: number;
}
```

### 4A. Large Avatar (90px)

- Gold border (3px, `sacredGold`)
- Pulsing glow ring (opacity 0.15→0.4, 1400ms cycle) — same pattern as `PersonalizedHeader.tsx:132-139`
- Outer ring scale pulse (1.0→1.08, 1800ms cycle) — same pattern as `PersonalizedHeader.tsx:142-149`
- Float animation (translateY 0→-4→0, 2500ms cycle) — same pattern as `PersonalizedHeader.tsx:122-129`
- Camera badge (22px circle, `sacredGold` bg, bottom-right) — reuse pattern from `PersonalizedHeader.tsx:304-311`
- Initials fallback: Reuse `getInitials()` logic from `PersonalizedHeader.tsx:72-77`
- Tap: bounce scale 0.92→1.05→1.0 + haptic — reuse gesture from `PersonalizedHeader.tsx:199-212`
- Long press: avatar action sheet via `avatarService` — reuse from `PersonalizedHeader.tsx:158-196`

### 4B. User Info Text (below avatar)

- Name: `xxl` size, `bold`, `paper` color, centered
- Occupation: `md` size, `medium`, `dust` color
- Company + Country: Row with `business-outline` + `location-outline` icons, `sm` size, `shadow` color
- Staggered entrance: name at D+150ms, occupation at D+300ms, company/country at D+450ms (`FadeInUp`)

### 4C. Edit Button

- Positioned top-right of hero section (absolute, `top: 0, right: theme.spacing.lg`)
- Icon: `create-outline` (not editing) → `checkmark-circle` (editing, gold color)
- Small circular button (40px), `softStone` bg, `1px border opacity.white10`
- Tap scale bounce + haptic
- When editing: gold tinted border

---

## Phase 5: Edit Form — `ProfileEditForm.tsx` (new file)

**File:** `src/components/profile/ProfileEditForm.tsx`

```typescript
interface ProfileEditFormProps {
  name: string;
  occupation: string;
  company: string;
  country: string;
  isEditing: boolean;
  onFieldChange: (field: string, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  animationDelay?: number;
}
```

### 5A. Read-Only Mode (default)

Display within a card (`darkStone` bg, `sm` borderRadius, `softStone` 1px border):

Each field row:

- Left: Icon (18px, `shadow` color) + Label text (`xs`, `shadow`)
- Right: Value text (`sm`, `paper`, `semibold`)
- Divider between rows (1px, `softStone`)
- Staggered entrance: 80ms per row

Field icons:
| Field | Icon |
|-------|------|
| Name | `person-outline` |
| Occupation | `briefcase-outline` |
| Company | `business-outline` |
| Country | `flag-outline` |

### 5B. Edit Mode

Transition with `withTiming` opacity+translateY (300ms):

- Each field becomes a `PremiumTextInput` (from `src/components/onboarding/premium/PremiumTextInput.tsx`)
- Country field: `TouchableOpacity` styled to look like PremiumTextInput, opens `PremiumCountrySelectorModal` (from `src/components/onboarding/premium/PremiumCountrySelectorModal.tsx`)
- Wrapped in `KeyboardAvoidingView` (behavior `padding` on iOS)

### 5C. Save/Cancel Buttons (edit mode only)

Horizontal row at bottom:

- Save: `PremiumButton` primary variant, small size, "Save Changes" — triggers `onSave` + haptic
- Cancel: `PremiumButton` outline variant, small size, "Cancel" — triggers `onCancel`
- Save success: Brief gold border flash on the card (withTiming border color `sacredGold` opacity 0→0.5→0, 600ms)

---

## Phase 6: Shift Config Card — `ShiftConfigCard.tsx` (new file)

**File:** `src/components/profile/ShiftConfigCard.tsx`

```typescript
interface ShiftConfigCardProps {
  shiftSystem?: '2-shift' | '3-shift';
  rosterType?: 'rotating' | 'fifo';
  patternType?: ShiftPattern;
  customPattern?: OnboardingData['customPattern'];
  fifoConfig?: FIFOConfig;
  shiftTimes?: OnboardingData['shiftTimes'];
  animationDelay?: number;
}
```

Read-only card (`darkStone` bg, `sm` borderRadius) with info rows:

### 6A. Common Rows (all users)

| Row          | Icon                      | Label   | Value Example                         |
| ------------ | ------------------------- | ------- | ------------------------------------- |
| Shift System | `time-outline`            | System  | Gold pill badge: "2-Shift (12h)"      |
| Roster Type  | `swap-horizontal-outline` | Roster  | Gold pill badge: "FIFO" or "Rotating" |
| Pattern      | `refresh-outline`         | Pattern | "14/7 FIFO Roster"                    |
| Shift Times  | `sunny-outline`           | Times   | "Day: 6:00 AM - 6:00 PM"              |

### 6B. FIFO-Specific Rows (conditional: `rosterType === 'fifo'`)

| Row          | Icon               | Label  | Value Example                      |
| ------------ | ------------------ | ------ | ---------------------------------- |
| Site Name    | `location-outline` | Site   | "Newman Mine" (or hidden if empty) |
| Work Block   | `hammer-outline`   | Work   | "14 days on-site"                  |
| Rest Block   | `home-outline`     | Rest   | "7 days at home"                   |
| Work Pattern | `flash-outline`    | Shifts | "Swing (7D + 7N)"                  |

### 6C. Pill Badges

- Background: `theme.colors.opacity.gold10`
- Border: 1px `theme.colors.sacredGold` at 30% opacity
- Border radius: `theme.borderRadius.full`
- Text: `xs` size, `sacredGold` color, `semibold`
- Padding: horizontal 12, vertical 4

### 6D. Footer Note

Small text: "Shift settings can be updated in Settings" — `xs` size, `shadow` color, italic

### 6E. Animations

Each row entrance staggered with 60ms delays using `FadeInUp` + configurable base delay.

---

## Phase 7: Work Overview — `WorkStatsSummary.tsx` (new file)

**File:** `src/components/profile/WorkStatsSummary.tsx`

```typescript
interface WorkStatsSummaryProps {
  data: OnboardingData;
  animationDelay?: number;
}
```

Horizontal row of 3 mini stat cards:

| Stat           | Value Example | Label       | Icon                |
| -------------- | ------------- | ----------- | ------------------- |
| Cycle Length   | "21"          | "Day Cycle" | `repeat-outline`    |
| Work:Rest      | "2:1"         | "Ratio"     | `scale-outline`     |
| Shift Duration | "12h"         | "Per Shift" | `hourglass-outline` |

### 7A. Mini Stat Card Style

- Background: `softStone`
- Border: 1px `opacity.white10`
- Border radius: `md` (12px)
- Value: `xl` size (24px), `bold`, `sacredGold`
- Label: `xs` size (12px), `dust`
- Icon: 16px, `shadow` color, above value
- Centered content, equal flex distribution with 8px gap

### 7B. Animation

Scale entrance: each card from 0.8→1.0 with spring (`damping: 12, stiffness: 200`), staggered 100ms apart.

---

## Phase 8: Screen Assembly — `ProfileScreen.tsx`

**File:** `src/screens/main/ProfileScreen.tsx` (replace placeholder)

```typescript
export const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const profile = useProfileData();

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={[theme.colors.deepVoid, theme.colors.darkStone, theme.colors.deepVoid]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeroSection
          name={profile.data.name || ''}
          occupation={profile.data.occupation}
          company={profile.data.company}
          country={profile.data.country}
          avatarUri={profile.data.avatarUri}
          isEditing={profile.isEditing}
          onAvatarChange={profile.handleAvatarChange}
          onEditPress={profile.isEditing ? profile.saveChanges : profile.startEditing}
          animationDelay={0}
        />

        <ProfileSectionHeader title="Personal Information" icon="person-outline" animationDelay={500} />
        <ProfileEditForm
          name={profile.isEditing ? (profile.editedFields.name ?? profile.data.name ?? '') : (profile.data.name ?? '')}
          occupation={...}
          company={...}
          country={...}
          isEditing={profile.isEditing}
          onFieldChange={profile.updateField}
          onSave={profile.saveChanges}
          onCancel={profile.cancelEditing}
          animationDelay={600}
        />

        <ProfileSectionHeader title="Shift Configuration" icon="time-outline" animationDelay={800} />
        <ShiftConfigCard
          shiftSystem={profile.data.shiftSystem}
          rosterType={profile.data.rosterType}
          patternType={profile.data.patternType}
          customPattern={profile.data.customPattern}
          fifoConfig={profile.data.fifoConfig}
          shiftTimes={profile.data.shiftTimes}
          animationDelay={900}
        />

        <ProfileSectionHeader title="Work Overview" icon="stats-chart-outline" animationDelay={1100} />
        <WorkStatsSummary data={profile.data} animationDelay={1200} />
      </Animated.ScrollView>
    </View>
  );
};
```

---

## Files Summary

| File                                              | Action     | Purpose                                                                |
| ------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| `src/utils/profileUtils.ts`                       | **Create** | Shared display-name utilities (extracted from PremiumCompletionScreen) |
| `src/hooks/useProfileData.ts`                     | **Create** | Profile data management hook (edit state, save, computed values)       |
| `src/components/profile/ProfileSectionHeader.tsx` | **Create** | Reusable section divider with icon + title                             |
| `src/components/profile/ProfileHeroSection.tsx`   | **Create** | Large animated avatar hero with user info                              |
| `src/components/profile/ProfileEditForm.tsx`      | **Create** | Editable personal info fields (read-only/edit modes)                   |
| `src/components/profile/ShiftConfigCard.tsx`      | **Create** | Read-only shift configuration summary                                  |
| `src/components/profile/WorkStatsSummary.tsx`     | **Create** | Mini stat cards (cycle, ratio, duration)                               |
| `src/screens/main/ProfileScreen.tsx`              | **Modify** | Replace placeholder with full profile assembly                         |

### Existing code to reuse:

- `useOnboarding()` from `src/contexts/OnboardingContext.tsx` — data + updateData
- `buildShiftCycle()` from `src/utils/shiftUtils.ts` — ShiftCycle computation
- `avatarService` from `src/services/AvatarService.ts` — image picking/persistence
- `PremiumTextInput` from `src/components/onboarding/premium/PremiumTextInput.tsx` — edit form inputs
- `PremiumButton` from `src/components/onboarding/premium/PremiumButton.tsx` — save/cancel buttons
- `PremiumCountrySelectorModal` from `src/components/onboarding/premium/PremiumCountrySelectorModal.tsx` — country picker
- Avatar animation patterns from `PersonalizedHeader.tsx` — glow, float, ring, gesture, initials
- `getPatternName()` logic from `PremiumCompletionScreen.tsx:368-410` — extract to profileUtils

---

## Animation Summary

| Element              | Animation            | Spec                                                         |
| -------------------- | -------------------- | ------------------------------------------------------------ |
| Avatar entrance      | scale 0.3→1 + fade   | `withSpring({ damping: 14, stiffness: 200 })`                |
| Avatar float         | translateY 0→-4→0    | `withRepeat` 2500ms each, infinite                           |
| Avatar glow pulse    | opacity 0.15→0.4     | `withRepeat` 1400ms each, infinite                           |
| Avatar ring scale    | scale 1.0→1.08       | `withRepeat` 1800ms each, infinite                           |
| Avatar tap           | scale 0.92→1.05→1.0  | Spring + haptic Medium                                       |
| Name text            | FadeInUp             | delay 150ms, duration 400ms                                  |
| Occupation text      | FadeInUp             | delay 300ms, duration 400ms                                  |
| Company/country      | FadeInUp             | delay 450ms, duration 400ms                                  |
| Section headers      | FadeInUp             | configurable delay                                           |
| Info rows (read)     | FadeInUp             | stagger 80ms per row                                         |
| Edit mode transition | opacity + translateY | `withTiming` 300ms                                           |
| Stat cards           | scale 0.8→1          | `withSpring({ damping: 12, stiffness: 200 })`, stagger 100ms |
| Save success         | border gold flash    | `withTiming` 600ms                                           |
| Edit button          | scale bounce         | Spring + haptic Light                                        |

---

## Edge Cases

| Case                      | Handling                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| Missing name              | Show "?" as initials, "Not set" for text fields                                           |
| Missing avatar            | Initials fallback (gold text on softStone circle)                                         |
| Avatar load error         | `onError` clears URI, reverts to initials                                                 |
| No shift config           | ShiftConfigCard shows "No shift configuration" graceful state                             |
| Legacy shiftTimes         | Check both `shiftTimes` and legacy `shiftStartTime/shiftEndTime` fields                   |
| FIFO vs Rotating          | ShiftConfigCard conditionally shows FIFO-specific rows                                    |
| No siteName (FIFO)        | Hide site name row entirely                                                               |
| Edit mode + navigate away | Reset edit mode on tab blur (use `useIsFocused` from React Navigation)                    |
| Keyboard covering inputs  | `KeyboardAvoidingView` wrapping edit form (behavior `padding` on iOS)                     |
| Country selector          | Open `PremiumCountrySelectorModal`, match current value by name                           |
| Empty onboarding data     | Show friendly "Complete your setup" prompt (edge case — app normally requires onboarding) |

---

## Verification

1. `npx tsc --noEmit` — zero type errors in new/modified files
2. `npx jest --no-coverage src/utils/__tests__/profileUtils.test.ts` — unit tests for utility functions
3. Manual verification:
   - Navigate to Profile tab — gradient background, avatar with pulsing glow, staggered entrance
   - Verify name, occupation, company, country match onboarding data
   - Tap avatar → bounce + haptic. Long press → action sheet (library/camera/remove)
   - Tap edit button → fields become PremiumTextInputs with gold focus borders
   - Change name, tap Save → haptic + gold flash + data persists (navigate away and back)
   - Tap Cancel → reverts all changes
   - Tap country field in edit mode → PremiumCountrySelectorModal opens
   - Shift Configuration card shows correct pattern, system, roster type, times
   - FIFO users: see site name, work/rest blocks, work pattern rows
   - Work Overview: correct cycle length, work:rest ratio, shift duration
   - Test with: FIFO roster, rotating roster, 3-shift system, custom pattern, no avatar
