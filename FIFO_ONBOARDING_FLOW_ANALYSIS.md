# 🛤️ FIFO ONBOARDING FLOW ANALYSIS

**Project:** Ellie Mining Shift Tracker
**Document:** Complete FIFO Roster Onboarding Flow
**Created:** February 26, 2026
**Status:** Implementation Planning

---

## 📋 Table of Contents

1. [Current Flow (Rotating Rosters)](#current-flow-rotating-rosters)
2. [NEW Flow (FIFO Rosters)](#new-flow-fifo-rosters)
3. [Screen-by-Screen Breakdown](#screen-by-screen-breakdown)
4. [Navigation Logic Changes](#navigation-logic-changes)
5. [Data Collection Summary](#data-collection-summary)
6. [Code Changes Required](#code-changes-required)

---

## 🔄 Current Flow (Rotating Rosters)

### Existing Onboarding Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT ONBOARDING FLOW                      │
│                    (Rotating Rosters Only)                       │
└─────────────────────────────────────────────────────────────────┘

Step 1: Welcome Screen
├─ Auto-advances after 3 seconds
├─ No data collected
└─ Navigation: → Introduction

Step 2: Introduction Screen (Chat-based)
├─ Collects: name, occupation, company, country
├─ Data saved to: OnboardingData.{name, occupation, company, country}
└─ Navigation: → ShiftSystem

Step 3: Shift System Screen (Swipe cards)
├─ User selects: 2-shift (12h) OR 3-shift (8h)
├─ Data saved to: OnboardingData.shiftSystem = '2-shift' | '3-shift'
└─ Navigation: → ShiftPattern

Step 4: Shift Pattern Screen (Swipe cards)
├─ Shows patterns filtered by shift system
├─ User selects: 4-4-4, 5-5-5, 7-7-7, etc.
├─ Data saved to: OnboardingData.patternType = ShiftPattern.*
└─ Navigation: → CustomPattern (if CUSTOM) OR PhaseSelector

Step 4b: Custom Pattern Screen (CONDITIONAL)
├─ Only shown if patternType === ShiftPattern.CUSTOM
├─ User configures: daysOn, nightsOn, daysOff (or 3-shift equivalents)
├─ Data saved to: OnboardingData.customPattern = {...}
└─ Navigation: → PhaseSelector

Step 5: Phase Selector Screen (Swipe cards - 2 stages)
├─ Stage 1: Select phase (day/night/morning/afternoon/night/off)
├─ Stage 2: Select day within phase (e.g., Day 3 of 5 in day phase)
├─ Calculates phaseOffset based on selection
├─ Data saved to: OnboardingData.phaseOffset = number
└─ Navigation: → StartDate

Step 6: Start Date Screen (Calendar)
├─ User selects cycle start date
├─ Shows preview of shift pattern on calendar
├─ Data saved to: OnboardingData.startDate = Date
└─ Navigation: → ShiftTimeInput

Step 7: Shift Time Input Screen (Multi-stage)
├─ 2-shift: Collect day shift times + night shift times
├─ 3-shift: Collect morning + afternoon + night shift times
├─ Data saved to: OnboardingData.shiftTimes = {...}
└─ Navigation: → Completion

Step 8: Completion Screen
├─ Validates all data
├─ Shows summary
├─ Saves to AsyncStorage
└─ Navigation: → MainDashboard (app entry point)
```

**File:** `src/utils/onboardingNavigation.ts` (Lines 23-39)

```typescript
const NAVIGATION_FLOW: Record<
  keyof OnboardingStackParamList,
  (data?: OnboardingData) => keyof OnboardingStackParamList | null
> = {
  Welcome: () => 'Introduction',
  Introduction: () => 'ShiftSystem',
  ShiftSystem: () => 'ShiftPattern',
  ShiftPattern: (data) => {
    // Conditional: Go to CustomPattern if CUSTOM selected, else PhaseSelector
    return data?.patternType === ShiftPattern.CUSTOM ? 'CustomPattern' : 'PhaseSelector';
  },
  CustomPattern: () => 'PhaseSelector',
  PhaseSelector: () => 'StartDate',
  StartDate: () => 'ShiftTimeInput',
  ShiftTimeInput: () => 'Completion',
  Completion: () => null, // Final screen
};
```

---

## ✨ NEW Flow (FIFO Rosters)

### Proposed FIFO Onboarding Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                      NEW FIFO ONBOARDING FLOW                    │
│                 (With Roster Type Selection)                     │
└─────────────────────────────────────────────────────────────────┘

Step 1: Welcome Screen
├─ Auto-advances after 3 seconds
├─ No data collected
└─ Navigation: → Introduction

Step 2: Introduction Screen (Chat-based)
├─ Collects: name, occupation, company, country
├─ Data saved to: OnboardingData.{name, occupation, company, country}
└─ Navigation: → ShiftSystem

Step 3: Shift System Screen (Swipe cards)
├─ User selects: 2-shift (12h) OR 3-shift (8h)
├─ Data saved to: OnboardingData.shiftSystem = '2-shift' | '3-shift'
├─ Note: FIFO typically uses 2-shift only
└─ Navigation: → RosterType ⭐ NEW SCREEN

Step 3.5: Roster Type Screen ⭐ NEW (Swipe cards)
├─ User selects roster paradigm:
│  ○ Rotating Roster (Days → Nights → Off)
│  ○ FIFO Roster (Work blocks → Rest blocks)
├─ Data saved to: OnboardingData.rosterType = 'rotating' | 'fifo'
└─ Navigation: → ShiftPattern

Step 4: Shift Pattern Screen (Swipe cards)
├─ Patterns FILTERED based on rosterType:
│
│  IF rosterType === 'rotating':
│  ├─ Shows: 3-3-3, 4-4-4, 5-5-5, 7-7-7, 10-10-10, Continental, Pitman
│  └─ User selects rotating pattern
│
│  IF rosterType === 'fifo': ⭐ NEW PATH
│  ├─ Shows: FIFO 7/7, FIFO 8/6, FIFO 14/14, FIFO 14/7, FIFO 21/7, FIFO 28/14
│  └─ User selects FIFO pattern
│
├─ Data saved to: OnboardingData.patternType = ShiftPattern.*
└─ Navigation:
   ├─ IF CUSTOM → CustomPattern (rotating) OR FIFOCustomPattern (fifo)
   └─ ELSE → PhaseSelector (rotating) OR FIFOPhaseSelector (fifo)

Step 4b-R: Custom Pattern Screen (CONDITIONAL - Rotating)
├─ Only if patternType === CUSTOM AND rosterType === 'rotating'
├─ User configures: daysOn, nightsOn, daysOff
├─ Data saved to: OnboardingData.customPattern = {...}
└─ Navigation: → PhaseSelector

Step 4b-F: FIFO Custom Pattern Screen ⭐ NEW (CONDITIONAL - FIFO)
├─ Only if patternType === FIFO_CUSTOM AND rosterType === 'fifo'
├─ User configures:
│  ├─ Work block days (slider 1-60)
│  ├─ Rest block days (slider 1-60)
│  ├─ Work pattern: Straight Days / Straight Nights / Swing
│  └─ If Swing: days on day shift, days on night shift
├─ Data saved to: OnboardingData.fifoConfig = {
│    workBlockDays: number,
│    restBlockDays: number,
│    workBlockPattern: 'straight-days' | 'straight-nights' | 'swing',
│    swingPattern?: { daysOnDayShift, daysOnNightShift }
│  }
└─ Navigation: → FIFOPhaseSelector

Step 5-R: Phase Selector Screen (Rotating rosters)
├─ Two-stage: Select phase → Select day within phase
├─ Phases: day, night, morning, afternoon, off (based on pattern)
├─ Example: "Day 3 of 5" in day phase
├─ Calculates phaseOffset for rotation
├─ Data saved to: OnboardingData.phaseOffset = number
└─ Navigation: → StartDate

Step 5-F: FIFO Phase Selector Screen ⭐ NEW (FIFO rosters)
├─ Simplified: Only 2 options
│  ○ Work Block (currently at site)
│  ○ Rest Block (currently at home)
├─ Then select: "Day X of Y" within that block
├─ Example: "Day 3 of 8" in work block
├─ Calculates phaseOffset for FIFO cycle
├─ Data saved to: OnboardingData.phaseOffset = number
└─ Navigation: → StartDate

Step 6: Start Date Screen (Calendar)
├─ User selects cycle start date
├─ Preview shows different visualization based on rosterType:
│  ├─ Rotating: Shows day/night/off pattern
│  └─ FIFO: Shows work/rest blocks
├─ Data saved to: OnboardingData.startDate = Date
└─ Navigation: → ShiftTimeInput

Step 7: Shift Time Input Screen (Multi-stage)
├─ Behavior depends on rosterType:
│
│  IF rosterType === 'rotating':
│  ├─ 2-shift: Collect day shift times + night shift times
│  └─ 3-shift: Collect morning + afternoon + night shift times
│
│  IF rosterType === 'fifo': ⭐ MODIFIED
│  └─ If workBlockPattern === 'swing':
│     ├─ Collect day shift times
│     └─ Collect night shift times
│  └─ If workBlockPattern === 'straight-days':
│     └─ Collect day shift times only
│  └─ If workBlockPattern === 'straight-nights':
│     └─ Collect night shift times only
│
├─ Data saved to: OnboardingData.shiftTimes = {...}
└─ Navigation: → Completion

Step 8: Completion Screen
├─ Validates all data (including new fifoConfig if applicable)
├─ Shows summary with roster-specific information
├─ Saves to AsyncStorage
└─ Navigation: → MainDashboard
```

---

## 📱 Screen-by-Screen Breakdown

### Step 3.5: Roster Type Selection ⭐ NEW SCREEN

**File:** `src/screens/onboarding/premium/PremiumRosterTypeScreen.tsx` (NEW)

**Purpose:** Let user choose between rotating roster and FIFO roster paradigms

**UI:**

- Swipeable cards (similar to ShiftSystemScreen and ShiftPatternScreen)
- 2 cards total

**Card 1: Rotating Roster**

```typescript
{
  id: 'rotating',
  type: RosterType.ROTATING,
  icon: '🔄',
  title: 'Rotating Roster',
  subtitle: 'Days → Nights → Off pattern',
  description: 'You rotate through different shift times in a repeating cycle',
  examples: ['5-5-5 (South Africa)', '4-4-4 (common globally)', '7-7-7 (long cycle)'],
  regions: ['South Africa', 'Zambia', 'DRC', 'Europe', 'Some US operations'],
}
```

**Card 2: FIFO Roster**

```typescript
{
  id: 'fifo',
  type: RosterType.FIFO,
  icon: '✈️',
  title: 'FIFO / Swing Roster',
  subtitle: 'Work blocks → Home blocks',
  description: 'You work consecutive days on-site, then get extended time at home',
  examples: ['8/6 (common WA)', '14/14 (even-time)', '21/7 (remote sites)'],
  regions: ['Australia', 'Canada', 'Remote global mining'],
}
```

**User Actions:**

- Swipe right on card → Select that roster type
- Swipe left → Skip to next card
- Swipe up → Learn more (modal with details)

**Data Collected:**

```typescript
OnboardingData.rosterType = 'rotating' | 'fifo';
```

**Navigation:**

```typescript
// After selection:
navigation.navigate('ShiftPattern');
```

---

### Step 4: Shift Pattern Selection (MODIFIED)

**File:** `src/screens/onboarding/premium/PremiumShiftPatternScreen.tsx` (MODIFIED)

**Current Code (Lines 696-700):**

```typescript
const { data, updateData } = useOnboarding();

// Filter patterns based on selected shift system
const shiftSystem: ShiftSystem = (data.shiftSystem as ShiftSystem) || ShiftSystem.TWO_SHIFT;
const filteredPatterns = SHIFT_PATTERNS.filter((pattern) =>
  pattern.supportedSystems.includes(shiftSystem)
);
```

**NEW Code (with roster type filtering):**

```typescript
const { data, updateData } = useOnboarding();

// Filter patterns based on shift system AND roster type
const shiftSystem: ShiftSystem = (data.shiftSystem as ShiftSystem) || ShiftSystem.TWO_SHIFT;
const rosterType: RosterType = data.rosterType || RosterType.ROTATING; // Default to rotating

const filteredPatterns = SHIFT_PATTERNS.filter((pattern) => {
  const patternInfo = getShiftPattern(pattern.type);

  return pattern.supportedSystems.includes(shiftSystem) && patternInfo.rosterType === rosterType;
});
```

**Pattern Cards Shown:**

**IF rosterType === 'rotating':**

```
Patterns shown:
├─ 4-4-4 Rotation (FIFO sites)
├─ 7-7-7 Rotation
├─ 2-2-3 Rotation
├─ 5-5-5 Rotation
├─ 3-3-3 Rotation
├─ 10-10-10 Rotation (Remote mining)
├─ Continental Rotation (3-shift only)
├─ Pitman Schedule
└─ Custom Rotation
```

**IF rosterType === 'fifo':** ⭐ NEW

```
Patterns shown:
├─ FIFO 7/7 (Even-time)
├─ FIFO 8/6 (Popular WA)
├─ FIFO 14/14 (Even-time, 2 weeks)
├─ FIFO 14/7 (2:1 ratio)
├─ FIFO 21/7 (Remote sites)
├─ FIFO 28/14 (Long cycle)
└─ FIFO Custom
```

**Example FIFO Pattern Card:**

```typescript
{
  id: 'fifo-8-6',
  type: ShiftPattern.FIFO_8_6,
  icon: '⛏️',
  name: 'FIFO 8/6',
  schedule: '8 days work • 6 days home',
  description: 'Work 8 consecutive days on-site, then 6 days at home—popular in WA mining',
  supportedSystems: [ShiftSystem.TWO_SHIFT],
  detailedInfo: {
    workRestRatio: '8 days at site, 6 days at home (14-day cycle)',
    useCases: ['Western Australian mining', 'Remote operations', 'FIFO camps'],
    pros: ['Good work-life balance', 'Enough time to recover', 'Easy to plan around'],
    cons: ['Travel days can be tiring', 'Away from home for over a week'],
  },
}
```

**Navigation:**

```typescript
// When user selects a pattern:
if (pattern.type === ShiftPattern.CUSTOM) {
  navigation.navigate('CustomPattern'); // Rotating custom
} else if (pattern.type === ShiftPattern.FIFO_CUSTOM) {
  navigation.navigate('FIFOCustomPattern'); // FIFO custom (NEW)
} else if (data.rosterType === 'fifo') {
  navigation.navigate('FIFOPhaseSelector'); // FIFO phase (NEW)
} else {
  navigation.navigate('PhaseSelector'); // Rotating phase (existing)
}
```

---

### Step 4b-F: FIFO Custom Pattern Screen ⭐ NEW SCREEN

**File:** `src/screens/onboarding/premium/PremiumFIFOCustomPatternScreen.tsx` (NEW)

**Purpose:** Configure custom FIFO roster parameters

**UI Components:**

1. **Work Block Days Slider**
   - Label: "Days at Site"
   - Range: 1-60 days
   - Default: 14
   - Icon: 🏗️ (construction/work)

2. **Rest Block Days Slider**
   - Label: "Days at Home"
   - Range: 1-60 days
   - Default: 14
   - Icon: 🏠 (home)

3. **Work Pattern Selector** (3 cards)

   **Card A: Straight Days**

   ```typescript
   {
     id: 'straight-days',
     title: 'Straight Days',
     description: 'Work day shifts only (e.g., 7am-7pm) for the entire work block',
     icon: '☀️',
   }
   ```

   **Card B: Straight Nights**

   ```typescript
   {
     id: 'straight-nights',
     title: 'Straight Nights',
     description: 'Work night shifts only (e.g., 7pm-7am) for the entire work block',
     icon: '🌙',
   }
   ```

   **Card C: Swing Roster**

   ```typescript
   {
     id: 'swing',
     title: 'Swing Roster',
     description: 'Alternate between day shifts and night shifts during work block',
     icon: '🔄',
   }
   ```

4. **Swing Configuration** (shown if "Swing Roster" selected)

   **Days on Day Shift Slider**
   - Label: "Days on Day Shift"
   - Range: 1-30
   - Default: 7

   **Days on Night Shift Slider**
   - Label: "Days on Night Shift"
   - Range: 1-30
   - Default: 7

5. **Live Preview**
   - Visual blocks showing work/rest pattern
   - Example: `[WORK WORK WORK WORK WORK WORK WORK WORK][REST REST REST REST REST REST]`
   - Color-coded: Blue for work, Gray for rest

**Data Collected:**

```typescript
OnboardingData.fifoConfig = {
  workBlockDays: number,          // e.g., 8
  restBlockDays: number,          // e.g., 6
  workBlockPattern: 'straight-days' | 'straight-nights' | 'swing',
  swingPattern?: {                // Only if workBlockPattern === 'swing'
    daysOnDayShift: number,       // e.g., 7
    daysOnNightShift: number,     // e.g., 7
  }
}
```

**Navigation:**

```typescript
// After configuration:
navigation.navigate('FIFOPhaseSelector');
```

---

### Step 5-F: FIFO Phase Selector Screen ⭐ NEW SCREEN

**File:** `src/screens/onboarding/premium/PremiumFIFOPhaseSelectorScreen.tsx` (NEW)

**Purpose:** Determine where user currently is in their FIFO cycle

**Differences from Rotating Phase Selector:**

| Aspect      | Rotating Phase Selector             | FIFO Phase Selector                     |
| ----------- | ----------------------------------- | --------------------------------------- |
| **Phases**  | day/night/morning/afternoon/off     | work/rest (only 2 options)              |
| **Stage 1** | Select shift type (5-6 options)     | Select block type (2 options)           |
| **Stage 2** | Day within phase (e.g., Day 3 of 5) | Day within block (e.g., Day 3 of 8)     |
| **Context** | "Which shift are you currently on?" | "Are you at site or at home right now?" |

**UI - Stage 1:**

**Card 1: Work Block**

```typescript
{
  id: 'work',
  title: 'At Site (Working)',
  description: 'You are currently at the mine site on your work block',
  icon: '⛏️',
  gradientColors: ['#2196F3', '#1976D2'], // Blue gradient
}
```

**Card 2: Rest Block**

```typescript
{
  id: 'rest',
  title: 'At Home (Rest)',
  description: 'You are currently at home on your rest block',
  icon: '🏠',
  gradientColors: ['#78716c', '#57534e'], // Stone gradient
}
```

**UI - Stage 2 (after selecting Work or Rest):**

If user selected "Work Block" with FIFO 8/6:

```
┌─────────────────────────────────────┐
│ Which day of your work block?       │
│                                      │
│ ○ Day 1 (Just arrived at site)     │
│ ○ Day 2                             │
│ ○ Day 3                             │
│ ○ Day 4                             │
│ ○ Day 5 (Midway)                    │
│ ○ Day 6                             │
│ ○ Day 7                             │
│ ○ Day 8 (Last day before flying out)│
└─────────────────────────────────────┘
```

If user selected "Rest Block" with FIFO 8/6:

```
┌─────────────────────────────────────┐
│ Which day of your rest block?       │
│                                      │
│ ○ Day 1 (Just got home)             │
│ ○ Day 2                             │
│ ○ Day 3 (Midway)                    │
│ ○ Day 4                             │
│ ○ Day 5                             │
│ ○ Day 6 (Last day before flying back)│
└─────────────────────────────────────┘
```

**Phase Offset Calculation:**

```typescript
function calculateFIFOPhaseOffset(
  blockType: 'work' | 'rest',
  dayInBlock: number,
  fifoConfig: FIFOConfig
): number {
  if (blockType === 'work') {
    // User is on day X of work block
    // phaseOffset = dayInBlock - 1
    return dayInBlock - 1;
  } else {
    // User is on day X of rest block
    // phaseOffset = workBlockDays + (dayInBlock - 1)
    return fifoConfig.workBlockDays + (dayInBlock - 1);
  }
}

// Example: FIFO 8/6, user is on Day 3 of work block
// phaseOffset = 3 - 1 = 2

// Example: FIFO 8/6, user is on Day 2 of rest block
// phaseOffset = 8 + (2 - 1) = 9
```

**Data Collected:**

```typescript
OnboardingData.phaseOffset = number; // Calculated offset
```

**Navigation:**

```typescript
// After selection:
navigation.navigate('StartDate');
```

---

### Step 7: Shift Time Input Screen (MODIFIED)

**File:** `src/screens/onboarding/premium/PremiumShiftTimeInputScreen.tsx` (MODIFIED)

**Current Behavior:**

- 2-shift: Collect day shift times + night shift times (2 stages)
- 3-shift: Collect morning + afternoon + night times (3 stages)

**NEW Behavior for FIFO:**

```typescript
const { data } = useOnboarding();

if (data.rosterType === 'fifo' && data.fifoConfig) {
  // FIFO roster - determine which times to collect
  const workPattern = data.fifoConfig.workBlockPattern;

  if (workPattern === 'straight-days') {
    // Only collect day shift times (1 stage)
    stages = ['dayShift'];
  } else if (workPattern === 'straight-nights') {
    // Only collect night shift times (1 stage)
    stages = ['nightShift'];
  } else if (workPattern === 'swing') {
    // Collect both day and night shift times (2 stages)
    stages = ['dayShift', 'nightShift'];
  }
} else {
  // Rotating roster - use existing logic
  if (data.shiftSystem === '2-shift') {
    stages = ['dayShift', 'nightShift'];
  } else {
    stages = ['morningShift', 'afternoonShift', 'nightShift3'];
  }
}
```

**UI Changes:**

**For FIFO Straight Days:**

```
┌─────────────────────────────────────┐
│ Day Shift Times                     │
│                                      │
│ What time does your day shift start?│
│ [07:00] (picker)                    │
│                                      │
│ What time does your day shift end?  │
│ [19:00] (picker)                    │
│                                      │
│ Duration: 12 hours                  │
└─────────────────────────────────────┘

Navigation: → Completion (skip night shift stage)
```

**For FIFO Swing:**

```
Stage 1: Day Shift Times
┌─────────────────────────────────────┐
│ Day Shift Times                     │
│ (For your day shift week)           │
│                                      │
│ Start: [07:00]                      │
│ End:   [19:00]                      │
│ Duration: 12 hours                  │
└─────────────────────────────────────┘

Navigation: → Stage 2 (Night Shift)

Stage 2: Night Shift Times
┌─────────────────────────────────────┐
│ Night Shift Times                   │
│ (For your night shift week)         │
│                                      │
│ Start: [19:00]                      │
│ End:   [07:00]                      │
│ Duration: 12 hours                  │
└─────────────────────────────────────┘

Navigation: → Completion
```

**Data Collected:**

```typescript
OnboardingData.shiftTimes = {
  dayShift?: {
    startTime: string,    // e.g., "07:00"
    endTime: string,      // e.g., "19:00"
    duration: 12,
  },
  nightShift?: {
    startTime: string,    // e.g., "19:00"
    endTime: string,      // e.g., "07:00"
    duration: 12,
  },
}
```

---

### Step 8: Completion Screen (MODIFIED)

**File:** `src/screens/onboarding/premium/PremiumCompletionScreen.tsx` (MODIFIED)

**Summary Display Changes:**

**For Rotating Rosters (existing):**

```
┌─────────────────────────────────────┐
│ 📋 Your Shift Setup Summary         │
├─────────────────────────────────────┤
│ Name: John Smith                    │
│ Occupation: Mining Engineer         │
│ Company: BHP                         │
│ Country: South Africa               │
├─────────────────────────────────────┤
│ Shift System: 2-Shift (12 hours)    │
│ Pattern: 5-5-5 Rotation             │
│ Cycle: 5 days → 5 nights → 5 off   │
│ Current Position: Day 3 of day phase│
│ Start Date: March 15, 2026          │
├─────────────────────────────────────┤
│ Day Shift: 07:00 - 19:00 (12h)     │
│ Night Shift: 19:00 - 07:00 (12h)   │
└─────────────────────────────────────┘
```

**For FIFO Rosters (NEW):** ⭐

```
┌─────────────────────────────────────┐
│ 📋 Your FIFO Roster Summary         │
├─────────────────────────────────────┤
│ Name: Sarah Johnson                 │
│ Occupation: FIFO Worker             │
│ Company: Rio Tinto                  │
│ Country: Australia                  │
├─────────────────────────────────────┤
│ Roster Type: FIFO                   │
│ Pattern: 8/6 Roster                 │
│ Cycle: 8 days work → 6 days home   │
│ Work Pattern: Swing (Days + Nights)│
│  └─ 4 days on day shift             │
│  └─ 4 days on night shift           │
│ Current Position: Day 3 of work block│
│ Start Date: March 15, 2026          │
├─────────────────────────────────────┤
│ Day Shift: 06:00 - 18:00 (12h)     │
│ Night Shift: 18:00 - 06:00 (12h)   │
└─────────────────────────────────────┘
```

**Validation Changes:**

```typescript
function validateOnboardingData(data: OnboardingData): ValidationResult {
  const missingFields: string[] = [];

  // Common fields (both rotating and FIFO)
  if (!data.name) missingFields.push('name');
  if (!data.shiftSystem) missingFields.push('shiftSystem');
  if (!data.patternType) missingFields.push('patternType');
  if (!data.startDate) missingFields.push('startDate');
  if (data.phaseOffset === undefined) missingFields.push('phaseOffset');

  // Roster type specific validation
  if (data.rosterType === 'fifo') {
    // FIFO-specific validation
    if (!data.fifoConfig) {
      missingFields.push('fifoConfig');
    } else {
      if (!data.fifoConfig.workBlockDays) missingFields.push('fifoConfig.workBlockDays');
      if (!data.fifoConfig.restBlockDays) missingFields.push('fifoConfig.restBlockDays');
      if (!data.fifoConfig.workBlockPattern) missingFields.push('fifoConfig.workBlockPattern');
    }
  } else {
    // Rotating roster validation
    if (data.patternType === ShiftPattern.CUSTOM && !data.customPattern) {
      missingFields.push('customPattern');
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}
```

**Data Saved to AsyncStorage:**

```typescript
// For FIFO rosters, the complete OnboardingData object includes:
{
  // Profile
  name: "Sarah Johnson",
  occupation: "FIFO Worker",
  company: "Rio Tinto",
  country: "Australia",

  // Roster Configuration
  shiftSystem: "2-shift",
  rosterType: "fifo",             // ⭐ NEW
  patternType: "FIFO_8_6",        // ⭐ NEW

  // FIFO-specific config
  fifoConfig: {                   // ⭐ NEW
    workBlockDays: 8,
    restBlockDays: 6,
    workBlockPattern: "swing",
    swingPattern: {
      daysOnDayShift: 4,
      daysOnNightShift: 4,
    },
  },

  // Position in cycle
  phaseOffset: 2,                 // Day 3 of work block
  startDate: Date("2026-03-15"),

  // Shift times
  shiftTimes: {
    dayShift: {
      startTime: "06:00",
      endTime: "18:00",
      duration: 12,
    },
    nightShift: {
      startTime: "18:00",
      endTime: "06:00",
      duration: 12,
    },
  },
}
```

---

## 🔀 Navigation Logic Changes

### Updated Navigation Flow Map

**File:** `src/utils/onboardingNavigation.ts` (MODIFIED)

**Current Code (Lines 23-39):**

```typescript
const NAVIGATION_FLOW: Record<
  keyof OnboardingStackParamList,
  (data?: OnboardingData) => keyof OnboardingStackParamList | null
> = {
  Welcome: () => 'Introduction',
  Introduction: () => 'ShiftSystem',
  ShiftSystem: () => 'ShiftPattern',
  ShiftPattern: (data) => {
    return data?.patternType === ShiftPattern.CUSTOM ? 'CustomPattern' : 'PhaseSelector';
  },
  CustomPattern: () => 'PhaseSelector',
  PhaseSelector: () => 'StartDate',
  StartDate: () => 'ShiftTimeInput',
  ShiftTimeInput: () => 'Completion',
  Completion: () => null,
};
```

**NEW Code (with FIFO support):** ⭐

```typescript
const NAVIGATION_FLOW: Record<
  keyof OnboardingStackParamList,
  (data?: OnboardingData) => keyof OnboardingStackParamList | null
> = {
  Welcome: () => 'Introduction',
  Introduction: () => 'ShiftSystem',
  ShiftSystem: () => 'RosterType', // ⭐ NEW: Go to roster type selection

  RosterType: () => 'ShiftPattern', // ⭐ NEW SCREEN

  ShiftPattern: (data) => {
    // ⭐ MODIFIED: More complex routing based on pattern type AND roster type

    // Custom rotating pattern
    if (data?.patternType === ShiftPattern.CUSTOM && data?.rosterType === 'rotating') {
      return 'CustomPattern';
    }

    // Custom FIFO pattern
    if (data?.patternType === ShiftPattern.FIFO_CUSTOM && data?.rosterType === 'fifo') {
      return 'FIFOCustomPattern';
    }

    // FIFO patterns (non-custom)
    if (data?.rosterType === 'fifo') {
      return 'FIFOPhaseSelector';
    }

    // Rotating patterns (non-custom) - default
    return 'PhaseSelector';
  },

  CustomPattern: () => 'PhaseSelector', // Rotating custom → rotating phase

  FIFOCustomPattern: () => 'FIFOPhaseSelector', // ⭐ NEW: FIFO custom → FIFO phase

  PhaseSelector: () => 'StartDate', // Rotating phase → start date

  FIFOPhaseSelector: () => 'StartDate', // ⭐ NEW: FIFO phase → start date

  StartDate: () => 'ShiftTimeInput',
  ShiftTimeInput: () => 'Completion',
  Completion: () => null,
};
```

### Navigation Decision Tree

```
Start → Welcome
  ↓
  Welcome → Introduction
  ↓
  Introduction → ShiftSystem
  ↓
  ShiftSystem → RosterType ⭐ NEW
  ↓
  RosterType → ShiftPattern
  ↓
  ┌─────────────────────────────────────────────────────────────┐
  │                     ShiftPattern Routing                     │
  └─────────────────────────────────────────────────────────────┘
  │
  ├─ IF patternType === CUSTOM && rosterType === 'rotating'
  │  └→ CustomPattern → PhaseSelector → StartDate
  │
  ├─ IF patternType === FIFO_CUSTOM && rosterType === 'fifo' ⭐ NEW
  │  └→ FIFOCustomPattern → FIFOPhaseSelector → StartDate
  │
  ├─ IF rosterType === 'fifo' (non-custom) ⭐ NEW
  │  └→ FIFOPhaseSelector → StartDate
  │
  └─ ELSE (rotating, non-custom)
     └→ PhaseSelector → StartDate

  ↓
  StartDate → ShiftTimeInput
  ↓
  ShiftTimeInput → Completion
  ↓
  Completion → MainDashboard
```

---

## 📊 Data Collection Summary

### Complete OnboardingData Structure (with FIFO)

```typescript
interface OnboardingData {
  // ============================================
  // STEP 2: Introduction
  // ============================================
  name?: string; // User's full name
  occupation?: string; // Job title
  company?: string; // Employer
  country?: string; // Location
  avatarUri?: string; // Profile picture

  // ============================================
  // STEP 3: Shift System
  // ============================================
  shiftSystem?: '2-shift' | '3-shift';

  // ============================================
  // STEP 3.5: Roster Type ⭐ NEW
  // ============================================
  rosterType?: 'rotating' | 'fifo';

  // ============================================
  // STEP 4: Shift Pattern
  // ============================================
  patternType?: ShiftPattern; // e.g., STANDARD_5_5_5 or FIFO_8_6

  // ============================================
  // STEP 4b-R: Custom Pattern (Rotating)
  // ============================================
  customPattern?: {
    daysOn: number;
    nightsOn: number;
    morningOn?: number;
    afternoonOn?: number;
    nightOn?: number;
    daysOff: number;
  };

  // ============================================
  // STEP 4b-F: FIFO Custom Pattern ⭐ NEW
  // ============================================
  fifoConfig?: {
    workBlockDays: number;
    restBlockDays: number;
    workBlockPattern: 'straight-days' | 'straight-nights' | 'swing' | 'custom';
    swingPattern?: {
      daysOnDayShift: number;
      daysOnNightShift: number;
    };
    customWorkSequence?: ShiftType[];
    flyInDay?: number;
    flyOutDay?: number;
    siteName?: string;
  };

  // ============================================
  // STEP 5: Phase Selector (Rotating or FIFO)
  // ============================================
  phaseOffset?: number; // Position in cycle

  // ============================================
  // STEP 6: Start Date
  // ============================================
  startDate?: Date; // Cycle start date

  // ============================================
  // STEP 7: Shift Times
  // ============================================
  shiftTimes?: {
    dayShift?: {
      startTime: string; // "07:00"
      endTime: string; // "19:00"
      duration: 8 | 12;
    };
    nightShift?: {
      startTime: string;
      endTime: string;
      duration: 8 | 12;
    };
    morningShift?: {
      startTime: string;
      endTime: string;
      duration: 8 | 12;
    };
    afternoonShift?: {
      startTime: string;
      endTime: string;
      duration: 8 | 12;
    };
    nightShift3?: {
      startTime: string;
      endTime: string;
      duration: 8 | 12;
    };
  };
}
```

### Data Flow Example: FIFO 8/6 Swing Roster

```typescript
// User journey:
// 1. Introduction: Name = "Sarah", Occupation = "Driller", Company = "Rio Tinto"
// 2. Shift System: Selects 2-shift
// 3. Roster Type: Selects FIFO
// 4. Pattern: Selects FIFO 8/6
// 5. FIFO Phase: Work block, Day 3
// 6. Start Date: March 15, 2026
// 7. Shift Times: Day 06:00-18:00, Night 18:00-06:00

const savedData: OnboardingData = {
  // Profile
  name: 'Sarah Johnson',
  occupation: 'Driller',
  company: 'Rio Tinto',
  country: 'Australia',

  // Roster
  shiftSystem: '2-shift',
  rosterType: 'fifo',
  patternType: 'FIFO_8_6',

  // FIFO Config (auto-populated from FIFO_8_6 pattern + default swing)
  fifoConfig: {
    workBlockDays: 8,
    restBlockDays: 6,
    workBlockPattern: 'swing',
    swingPattern: {
      daysOnDayShift: 4,
      daysOnNightShift: 4,
    },
  },

  // Position
  phaseOffset: 2, // Day 3 of work = offset 2
  startDate: new Date('2026-03-15'),

  // Times
  shiftTimes: {
    dayShift: {
      startTime: '06:00',
      endTime: '18:00',
      duration: 12,
    },
    nightShift: {
      startTime: '18:00',
      endTime: '06:00',
      duration: 12,
    },
  },
};
```

---

## 💻 Code Changes Required

### File Modifications

| File                                                             | Changes                                                            | Lines | Priority |
| ---------------------------------------------------------------- | ------------------------------------------------------------------ | ----- | -------- |
| `src/types/index.ts`                                             | Add `RosterType` enum, `fifoConfig` to OnboardingData              | ~50   | P0       |
| `src/utils/onboardingNavigation.ts`                              | Update NAVIGATION_FLOW with RosterType and FIFO routing            | ~30   | P0       |
| `src/navigation/OnboardingNavigator.tsx`                         | Add RosterType and FIFOCustomPattern and FIFOPhaseSelector screens | ~20   | P0       |
| `src/contexts/OnboardingContext.tsx`                             | Update OnboardingData interface, add fifoConfig field              | ~30   | P0       |
| `src/screens/onboarding/premium/PremiumShiftPatternScreen.tsx`   | Add roster type filtering logic                                    | ~10   | P0       |
| `src/screens/onboarding/premium/PremiumShiftTimeInputScreen.tsx` | Add FIFO-specific stage logic                                      | ~30   | P1       |
| `src/screens/onboarding/premium/PremiumCompletionScreen.tsx`     | Update summary display and validation                              | ~50   | P1       |

### New Files

| File                                                                | Purpose                   | Lines | Priority |
| ------------------------------------------------------------------- | ------------------------- | ----- | -------- |
| `src/screens/onboarding/premium/PremiumRosterTypeScreen.tsx`        | Roster type selection UI  | ~400  | P0       |
| `src/screens/onboarding/premium/PremiumFIFOCustomPatternScreen.tsx` | FIFO custom configuration | ~500  | P0       |
| `src/screens/onboarding/premium/PremiumFIFOPhaseSelectorScreen.tsx` | FIFO phase/block selector | ~350  | P0       |

---

## ✅ Summary

### FIFO Onboarding Flow (Quick Reference)

```
1. Welcome (3s auto-advance)
2. Introduction (chat: name, occupation, company, country)
3. Shift System (2-shift or 3-shift)
4. Roster Type ⭐ (Rotating or FIFO)
5. Shift Pattern (filtered by roster type)
6a. IF CUSTOM: Custom Pattern (rotating) OR FIFO Custom Pattern (fifo)
7a. Phase Selector (rotating) OR FIFO Phase Selector (fifo)
8. Start Date (calendar with preview)
9. Shift Times (adjusted based on FIFO work pattern)
10. Completion (validate + save + summary)
```

### Key Differences: Rotating vs FIFO

| Aspect                | Rotating                       | FIFO                                  |
| --------------------- | ------------------------------ | ------------------------------------- |
| **Screens**           | 9 screens                      | 10 screens (adds RosterType)          |
| **Pattern Selection** | 8 patterns                     | 6 FIFO patterns                       |
| **Custom Config**     | Days/Nights/Off                | Work block/Rest block/Swing           |
| **Phase Selection**   | 5-6 phase options              | 2 block options (work/rest)           |
| **Shift Times**       | Always collect all shift types | Conditional (depends on work pattern) |
| **Data Structure**    | customPattern                  | fifoConfig                            |

---

**Document Status:** Complete
**Last Updated:** February 26, 2026
**Ready for:** Development Implementation
