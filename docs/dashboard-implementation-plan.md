# MAIN DASHBOARD SCREEN - SHIFT CALENDAR VIEW

## Implementation Plan

---

## Context

After completing the onboarding flow, users need a **powerful, engaging, and highly personalized home screen** that serves as their daily shift management hub. The Main Dashboard will be the crown jewel of the app - where users start their day, check their current shift status, view their monthly schedule, and get insights into their work-life balance.

**Why this feature?**

- Users need instant visibility into "What shift am I on today?"
- Workers need to plan ahead with a visual monthly calendar
- Shift workers need work-life balance insights and metrics
- The app needs to maintain the premium, animated UX from onboarding

**Success Criteria:**

- Dashboard loads in <1 second with smooth animations
- Users can instantly identify their current shift status
- Calendar visualization makes complex shift patterns easy to understand
- Personalized greeting makes the experience feel tailored
- Animations are smooth and delightful without causing lag

---

## Industry Best Practices & Inspiration

Based on research of leading shift calendar apps and premium mobile dashboards:

### Key Design Patterns from Top Apps

**From [MyShiftPlanner](https://myshiftplanner.com/) and [Work Shift Calendar](https://apps.apple.com/us/app/work-shift-calendar-shifter/id1523513035):**

- Color-coded shifts are essential for instant recognition
- Multiple viewing modes (grid, list, agenda) provide flexibility
- Paint mode for batch editing shifts
- Theme options (light/dark) for different environments

**From [Calendar UI Best Practices](https://www.eleken.co/blog-posts/calendar-ui):**

- Natural gestures (swipe between days/weeks) feel intuitive
- Vertical flow for events maintains consistency
- Soft, complementary colors prevent visual overload
- Simplicity trumps feature bloat

**From [Dashboard Design Concepts](https://design4users.com/dashboard-design-concepts/):**

- Data visualization should be clear and actionable
- Progressive disclosure - show essentials first, details on demand
- Micro-interactions provide feedback and delight
- Consistent visual hierarchy guides the eye

**From [Mobile UX for Shift Management](https://www.myshyft.com/blog/mobile-user-experience-design/):**

- Lightning-fast performance is non-negotiable
- Prioritize essential tasks, eliminate clutter
- Optimize for quick interactions
- Accommodate diverse user needs (accessibility, languages)

### Core UX Principles to Implement

1. **Visual Hierarchy:** Most important info (today's shift) gets hero treatment
2. **Color Coding:** Consistent shift type colors across all views
3. **Gestural Navigation:** Swipe to change months, tap for details
4. **Accessibility First:** Large touch targets, keyboard support, dark mode
5. **Performance:** Minimal load times, smooth 60fps animations
6. **Personalization:** Use name, occupation, pattern preferences

Sources:

- [26 Calendar/Shift Scheduling UX ideas](https://www.pinterest.com/jonathanrbraun/calendarshift-scheduling-ux/)
- [Calendar UI Examples: 33 Inspiring Designs](https://www.eleken.co/blog-posts/calendar-ui)
- [Dashboard UI Concepts to Inspire](https://webdesign.tutsplus.com/dashboard-ui-concepts-to-inspire-your-designs--cms-107068a)
- [Mobile Dashboard Inspiration (Dribbble)](https://dribbble.com/search/mobile-dashboard)

---

## Architecture Overview

### Data Flow

```
App Launch
    ↓
Check AsyncStorage for onboarding data
    ↓
Build ShiftCycle from user config
    ↓
Calculate current shift (TODAY)
    ↓
Calculate month data (1st to last day)
    ↓
Render Dashboard with animations
    ↓
User interactions (swipe month, tap day, pull-to-refresh)
    ↓
Recalculate and animate transitions
```

### Component Hierarchy

```
MainDashboardScreen
├── AnimatedGradientBackground (deepVoid → darkStone)
├── ScrollView (with pull-to-refresh)
│   ├── PersonalizedHeader
│   │   ├── Avatar/Initials Circle
│   │   ├── Time-Aware Greeting ("Good morning, [Name]!")
│   │   └── Occupation Subtitle
│   │
│   ├── CurrentShiftStatusCard (HERO)
│   │   ├── Large Shift Type Badge (DAY/NIGHT/OFF)
│   │   ├── Color-Coded Background (Blue/Purple/Orange)
│   │   ├── Shift Time Display ("7:00 AM - 7:00 PM")
│   │   ├── Countdown Timer ("6h 32m until next shift")
│   │   └── Pulsing Glow Effect
│   │
│   ├── MonthlyCalendarCard
│   │   ├── Month Navigation (← Feb 2026 →)
│   │   ├── Weekday Headers (S M T W T F S)
│   │   ├── Calendar Grid (6 rows × 7 cols)
│   │   │   └── ShiftCalendarDayCell (each day)
│   │   │       ├── Day Number
│   │   │       ├── Shift Type Badge (D/N/O)
│   │   │       ├── Color-Coded Background
│   │   │       └── Today Indicator (pulsing ring)
│   │   └── Legend (Day Shift, Night Shift, Day Off)
│   │
│   ├── StatisticsRow
│   │   ├── WorkDaysCard (icon + value + label)
│   │   ├── OffDaysCard (icon + value + label)
│   │   └── BalanceCard (work-life %, green/amber/red)
│   │
│   ├── UpcomingShiftsCard
│   │   ├── Next Shift Preview (date + time)
│   │   ├── Shift After That
│   │   └── Third Upcoming Shift
│   │
│   └── QuickActionsBar
│       ├── Settings Button
│       ├── Notifications Button
│       ├── Profile Button
│       └── Export Calendar Button
│
└── FloatingActionButton (Add Note/Event)
```

---

## File Structure

### New Files to Create

```
/Users/Shared/Ellie/src/
├── screens/
│   └── main/
│       └── MainDashboardScreen.tsx          (Main screen orchestrator)
│
├── components/
│   └── dashboard/
│       ├── PersonalizedHeader.tsx           (Greeting + avatar)
│       ├── CurrentShiftStatusCard.tsx       (Hero shift status)
│       ├── MonthlyCalendarCard.tsx          (Calendar wrapper)
│       ├── ShiftCalendarDayCell.tsx         (Enhanced day cell)
│       ├── StatisticsCard.tsx               (Metric display card)
│       ├── UpcomingShiftsCard.tsx           (Next shifts preview)
│       ├── QuickActionsBar.tsx              (Bottom navigation)
│       └── __tests__/
│           ├── PersonalizedHeader.test.tsx
│           ├── CurrentShiftStatusCard.test.tsx
│           ├── MonthlyCalendarCard.test.tsx
│           └── ShiftCalendarDayCell.test.tsx
│
├── types/
│   └── dashboard.ts                         (Dashboard-specific types)
│
└── navigation/
    └── AppNavigator.tsx                     (Main app navigator)
```

### Existing Files to Reuse

- `/Users/Shared/Ellie/src/utils/shiftUtils.ts` - shift calculations
- `/Users/Shared/Ellie/src/utils/dateUtils.ts` - date manipulation
- `/Users/Shared/Ellie/src/components/onboarding/premium/PremiumCalendar.tsx`
- `/Users/Shared/Ellie/src/components/onboarding/premium/DayCell.tsx`

---

## Critical Components

### 1. MainDashboardScreen.tsx

**Location:** `/Users/Shared/Ellie/src/screens/main/MainDashboardScreen.tsx`

**Key Responsibilities:**

- Fetch onboarding data from AsyncStorage
- Build ShiftCycle from user configuration
- Calculate current shift using `calculateShiftDay()`
- Manage current month state
- Orchestrate staggered entrance animations
- Handle pull-to-refresh

**Animation Timing:**

```typescript
const ENTRANCE_DELAYS = {
  HEADER: 0,
  STATUS_CARD: 100,
  CALENDAR: 200,
  STATS_1: 300,
  STATS_2: 350,
  STATS_3: 400,
  UPCOMING: 500,
  ACTIONS: 600,
};
```

### 2. CurrentShiftStatusCard.tsx

**Purpose:** Large hero card showing TODAY's shift

**Features:**

- Color-coded by shift type (Blue=Day, Purple=Night, Orange=Off)
- Large shift type label with icon
- Shift time display ("7:00 AM - 7:00 PM")
- Countdown timer to next shift
- Pulsing glow animation for active shifts
- Floating effect (levitation -4px to 0px)

**Color Schemes:**

```typescript
const SHIFT_STYLES = {
  day: { background: ['#2196F3', '#1976D2'], icon: '☀️', label: 'DAY SHIFT' },
  night: { background: ['#651FFF', '#5E35B1'], icon: '🌙', label: 'NIGHT SHIFT' },
  off: { background: ['#FF9800', '#F57C00'], icon: '🏖️', label: 'DAY OFF' },
};
```

### 3. MonthlyCalendarCard.tsx

**Purpose:** Interactive monthly calendar with shift visualization

**Features:**

- Month navigation with swipe gestures
- Today indicator (pulsing gold ring)
- Color-coded day backgrounds based on shift type
- Shift type badges (D/N/O)
- Haptic feedback on month change
- Fade transition animation

**Gesture Support:**

```typescript
const panGesture = Gesture.Pan().onEnd((event) => {
  if (event.translationX < -50) handleMonthChange('next');
  else if (event.translationX > 50) handleMonthChange('prev');
});
```

### 4. ShiftCalendarDayCell.tsx

**Purpose:** Enhanced day cell with shift visualization

**Features:**

- Extends existing `DayCell` component
- Color-coded backgrounds (blue/purple/orange with 20% opacity)
- Shift type badge overlay (D = Day, N = Night, O = Off)
- Today indicator (pulsing gold ring)
- Press animation (scale to 0.95)

---

## Key Calculations

### Build ShiftCycle

```typescript
const buildShiftCycle = (data: OnboardingData): ShiftCycle => {
  if (data.patternType === ShiftPattern.CUSTOM && data.customPattern) {
    return {
      patternType: ShiftPattern.CUSTOM,
      shiftSystem: data.shiftSystem,
      daysOn: data.customPattern.daysOn,
      nightsOn: data.customPattern.nightsOn,
      morningOn: data.customPattern.morningOn,
      afternoonOn: data.customPattern.afternoonOn,
      nightOn: data.customPattern.nightOn,
      daysOff: data.customPattern.daysOff,
      startDate: toDateString(data.startDate!),
      phaseOffset: data.phaseOffset || 0,
    };
  }

  const pattern = getShiftPattern(data.patternType!);
  return {
    /* standard pattern */
  };
};
```

### Calculate Monthly Statistics

```typescript
const calculateMonthStats = (year: number, month: number, cycle: ShiftCycle) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const stats = getShiftStatistics(firstDay, lastDay, cycle);

  return {
    workDays: stats.dayShifts + stats.nightShifts,
    offDays: stats.daysOff,
    totalDays: stats.totalDays,
    workLifeBalance: ((stats.daysOff / stats.totalDays) * 100).toFixed(1),
  };
};
```

---

## Animation Specifications

### Entrance Animations (Staggered)

- **PersonalizedHeader:** FadeInDown, 0ms delay
- **CurrentShiftStatusCard:** FadeInUp, 100ms delay
- **MonthlyCalendarCard:** FadeIn, 200ms delay
- **StatisticsCards:** FadeInUp, 300ms/350ms/400ms delays
- **UpcomingShiftsCard:** FadeInRight, 500ms delay
- **QuickActionsBar:** FadeInUp, 600ms delay

### Continuous Animations

**Today Pulse:**

```typescript
pulseScale.value = withRepeat(
  withSequence(withTiming(1.0, { duration: 1000 }), withTiming(1.15, { duration: 1000 })),
  -1,
  true
);
```

**Floating Effect:**

```typescript
floatY.value = withRepeat(
  withSequence(withTiming(-4, { duration: 2000 }), withTiming(0, { duration: 2000 })),
  -1,
  true
);
```

---

## Navigation Integration

### AppNavigator Setup

**Location:** `/Users/Shared/Ellie/src/navigation/AppNavigator.tsx`

```typescript
export const AppNavigator = () => {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const data = await asyncStorageService.get<string>('onboarding:data');
    if (data) {
      const parsed = JSON.parse(data);
      setIsOnboardingComplete(!!(parsed.name && parsed.startDate));
    } else {
      setIsOnboardingComplete(false);
    }
  };

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isOnboardingComplete ? (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      ) : (
        <Stack.Screen name="MainDashboard" component={MainDashboardScreen} />
      )}
    </Stack.Navigator>
  );
};
```

### Update PremiumCompletionScreen

Add navigation reset after completion:

```typescript
const handleComplete = async () => {
  await asyncStorageService.set('onboarding:complete', 'true');
  navigation.reset({
    index: 0,
    routes: [{ name: 'MainDashboard' }],
  });
};
```

---

## Performance Optimizations

### Memoization

```typescript
const shiftCycle = useMemo(() => buildShiftCycle(userData), [userData]);
const currentShift = useMemo(() => calculateShiftDay(getToday(), shiftCycle), [shiftCycle]);
const monthShifts = useMemo(
  () => getShiftDaysInRange(firstDay, lastDay, shiftCycle),
  [currentMonth, shiftCycle]
);
const monthStats = useMemo(
  () => calculateMonthStats(year, month, shiftCycle),
  [currentMonth, shiftCycle]
);
```

### Callbacks

```typescript
const handleMonthChange = useCallback((direction: 'prev' | 'next') => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  setCurrentMonth((prev) => {
    const newDate = new Date(prev);
    newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
    return newDate;
  });
}, []);
```

---

## Testing Strategy

### Unit Tests

- `buildShiftCycle()` with various patterns
- `calculateMonthStats()` accuracy
- `getNextThreeShifts()` edge cases

### Component Tests

- PersonalizedHeader rendering
- CurrentShiftStatusCard with different shift types
- MonthlyCalendarCard month navigation
- ShiftCalendarDayCell color coding

### Integration Tests

- Full data flow from onboarding to dashboard
- Pull-to-refresh functionality
- Month navigation with data updates

---

## Implementation Timeline

**Week 1 (Days 1-2):** Core screen structure, header, status card
**Week 1 (Days 3-4):** Calendar integration, day cells, month navigation
**Week 2 (Days 5-6):** Statistics cards, upcoming shifts, quick actions
**Week 2 (Days 7-8):** Animations, navigation, integration
**Week 3 (Days 9-10):** Testing, accessibility, optimization

---

## Success Metrics

- Dashboard loads in < 1 second
- Animations run at 60fps
- Users identify current shift in < 2 seconds
- Calendar navigation feels intuitive
- Accessibility score: 100%
- Works offline (AsyncStorage data)

---

## Ready to Implement

This plan provides everything needed to build a **premium, animated, highly personalized Main Dashboard** that will serve as the heart of the Ellie app.

The dashboard will:

- Instantly show current shift status
- Visualize monthly schedule clearly
- Provide work-life balance insights
- Feel personalized and premium
- Maintain high-quality UX from onboarding
- Perform smoothly on all devices

**All required utilities are identified, reusable patterns are documented, and the implementation path is clear.**
