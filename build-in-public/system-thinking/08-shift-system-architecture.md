# Build-in-Public: Shift System Architecture & Screen Reordering

**Storytelling Angle**: System Thinking
**Date**: February 8, 2026
**Feature**: Premium Shift System Selection Screen
**Status**: ✅ Complete

---

## 1. HUMAN SUMMARY

### What Was Built

A new shift system selection screen that lets miners choose between 2-shift (12-hour) and 3-shift (8-hour) systems before picking their specific rotation pattern.

### Why It Matters for Mining Shift Workers

Before, the app assumed everyone works 12-hour shifts. But many miners—especially in manufacturing plants, processing facilities, and 24/7 operations—work 8-hour shifts across three daily rotations (morning/afternoon/night).

Now when a miner opens Ellie:

1. **Step 1**: They say "I work 8-hour shifts" or "I work 12-hour shifts"
2. **Step 2**: They only see relevant patterns (no more confusion about 4-4-4 vs 4-4-4-4)
3. **Step 3**: The calendar shows morning/afternoon/night shifts with correct colors
4. **Step 4**: Alarm reminders work with the right shift durations

A 3-shift miner working the Continental schedule (2 mornings, 2 afternoons, 2 nights, 4 off) can now track their cycle just like a 2-shift FIFO worker tracks 4-4-4.

---

## 2. BUILD-IN-PUBLIC POST

### The Order Was Wrong

I spent weeks building an onboarding flow for shift workers. Users picked their shift pattern (4-4-4, 7-7-7, etc.) and then I asked which shift system they used (8-hour vs 12-hour shifts).

**The problem**: You can't pick a pattern without knowing your shift duration first.

It's like asking "What kind of car do you want?" before asking "Do you want a sedan or an SUV?"

I had to reorder the entire flow. Move "shift system" from step 4 to step 3. Break the navigation chain. Rewrite pattern filtering.

**The insight**: Architecture mistakes reveal themselves through user confusion, not compiler errors.

A mining engineer tested the beta and said: "Why am I seeing 4-4-4? We do 4-4-4-4 with 8-hour shifts."

That one sentence broke my assumptions.

Now the flow is:

1. Who are you?
2. How long are your shifts? (8hr vs 12hr)
3. What's your rotation? (filtered by shift duration)

Simple. Logical. Obvious in hindsight.

**Question for experts**: When you're building a flow with dependent choices, do you prototype the information architecture before coding? Or do you let user feedback guide the structure?

---

## 3. BEGINNER LESSON: Information Hierarchy

### The Concept

When building multi-step forms or onboarding flows, the **order of questions** matters. Each question should provide context for the next.

### The Analogy

Think of building a house:

**Wrong order**:

1. What color should the walls be?
2. Do you want carpet or hardwood?
3. How many rooms do you need?
4. Oh wait, is this a house or an apartment?

**Right order**:

1. House or apartment? (Fundamental structure)
2. How many rooms? (Layout)
3. Flooring type? (Materials)
4. Wall colors? (Aesthetics)

Each decision narrows the possibilities for the next choice.

### The Implementation

In code, this means:

```typescript
// BAD: Filter patterns AFTER user picks one
const allPatterns = [4-4-4, 7-7-7, Continental, Pitman, ...];
// User sees everything, picks 4-4-4
// Later: "Oh you're 3-shift? That won't work."

// GOOD: Filter patterns BEFORE showing them
const shiftSystem = getShiftSystem(); // 2-shift or 3-shift
const relevantPatterns = allPatterns.filter(p =>
  p.supportedSystems.includes(shiftSystem)
);
// User only sees patterns that work for them
```

**Key takeaway**: Make fundamental choices first. Let earlier decisions filter later options.

---

## 4. EXPERT INSIGHT: Architecture & Tradeoffs

### The Architectural Decision

**Problem**: Support both 2-shift (12-hour) and 3-shift (8-hour) systems without duplicating code or creating brittle conditional logic.

**Solution**: Type-driven pattern filtering with explicit system declarations.

```typescript
// Every pattern declares which systems it supports
interface PatternCardData {
  type: ShiftPattern;
  supportedSystems: ShiftSystem[]; // The key field
  // ... other fields
}

// Examples:
{
  name: '4-4-4 Cycle',
  supportedSystems: [ShiftSystem.TWO_SHIFT], // 12-hour only
}

{
  name: 'Continental',
  supportedSystems: [ShiftSystem.THREE_SHIFT], // 8-hour only
}

{
  name: 'Custom Pattern',
  supportedSystems: [ShiftSystem.TWO_SHIFT, ShiftSystem.THREE_SHIFT], // Both
}
```

### The Tradeoffs

**Option 1: Runtime Conversion** (Original approach)

- ✅ Simpler initial implementation
- ✅ Single pattern data structure
- ❌ Requires conversion logic (4-4-4 → 4-4-4-4)
- ❌ Confusing for users (why am I seeing 12-hour patterns?)
- ❌ Error-prone (what if conversion fails?)

**Option 2: Separate Pattern Lists**

- ✅ No conversion needed
- ❌ Code duplication
- ❌ Hard to maintain (two lists to update)
- ❌ Custom pattern needs special handling

**Option 3: Declarative Filtering** (Chosen approach)

- ✅ Patterns declare their own compatibility
- ✅ Single source of truth
- ✅ Easy to add new patterns
- ✅ Type-safe filtering
- ❌ Requires upfront system selection
- ❌ More complex type system

### Scalability Considerations

**Adding a 4th shift system** (e.g., 6-hour for manufacturing):

```typescript
// Just add to the enum
enum ShiftSystem {
  TWO_SHIFT = '2-shift',
  THREE_SHIFT = '3-shift',
  FOUR_SHIFT = '4-shift', // New!
}

// Update pattern declarations
{
  name: 'Rapid Rotation 3-3-3-3-6',
  supportedSystems: [ShiftSystem.FOUR_SHIFT],
}
```

No changes to filtering logic. No runtime conversions. Just declarative data.

### Performance Impact

**Before** (Show all patterns):

- Rendered 9 cards regardless of system
- User swipes through irrelevant options
- Conversion happens at StartDate screen

**After** (Filter first):

- 2-shift users: 8 cards
- 3-shift users: 2 cards (90% fewer!)
- No conversion needed

Fewer renders. Faster decisions. Better UX.

### The Hidden Complexity

The hard part wasn't the filtering. It was **reordering the navigation flow**.

```typescript
// Before:
Introduction → Pattern → System → StartDate

// After:
Introduction → System → Pattern → StartDate
```

This broke:

- Navigation paths
- Context dependencies
- Test expectations
- Step numbering
- Screen indices

Had to update 15 files. 57 tests. All navigation logic.

**Lesson**: Sometimes the "simple" architectural change cascades through the entire system.

---

## 5. SHORT VIDEO SCRIPT (60-90 seconds)

**[0-10s - Hook]**

"I messed up my onboarding flow and had to rewrite it. Here's what I learned about information architecture."

**[10-30s - What I Built]**

"I'm building Ellie, an app for mining shift workers. These workers rotate through complex cycles—4 days on, 4 nights, 4 off—and they always lose track of which shift they're on.

The onboarding asks about their rotation pattern. But I made a mistake: I asked WHICH pattern before asking what KIND of shifts they work.

8-hour shifts? 12-hour shifts? Totally changes which patterns are possible."

**[30-60s - Why It Matters]**

"So I had to reorder everything. Shift system selection comes first. Then I filter the patterns based on what they picked.

Now a 3-shift worker sees 2 options, not 9. No confusion. No impossible choices.

The calendar shows morning, afternoon, night shifts with different colors. The app understands 8-hour cycles."

**[60-75s - One Lesson]**

"The lesson? In multi-step flows, fundamental choices come first. Each answer should narrow the next question.

Don't ask about wall colors before you know if it's a house or apartment."

**[75-90s - Invitation]**

"Building this for real shift workers. If you've ever built complex onboarding, what's your process? Do you prototype the information architecture first or let users guide you?

I'd love to know."

---

## 6. FUTURE IMPROVEMENTS

### Short Term (Next Sprint)

1. **Add More 3-Shift Patterns**
   - Implement 4-4-4-4, 5-5-5-5, 3-3-3-3
   - Add DuPont schedule
   - Research common manufacturing rotations

2. **Pattern Recommendations**
   - If occupation === "manufacturing", suggest Continental
   - If occupation === "mining", suggest 4-4-4
   - Show "Most popular for your industry" badge

3. **System Comparison Tool**
   - "Not sure? Compare 8hr vs 12hr shifts"
   - Side-by-side pros/cons
   - Sleep impact analysis

### Medium Term (Next Month)

4. **Visual Pattern Preview on System Cards**
   - Show mini calendar on each shift system card
   - Animate a week's rotation
   - Help users visualize the difference

5. **Smart Defaults Based on Country**
   - Australia/Canada: Default to 2-shift (FIFO mining)
   - USA manufacturing: Default to 3-shift
   - Europe: Default to 3-shift (EU work time directive)

6. **Pattern Library Expansion**
   - Import common industry patterns
   - User-submitted patterns
   - Pattern sharing between users

### Long Term (Next Quarter)

7. **AI-Powered Pattern Detection**
   - "Describe your shift pattern in words"
   - GPT parses and suggests matching pattern
   - Handles unique/custom rotations

8. **Multi-System Support**
   - Some workers switch between 8hr and 12hr
   - Seasonal changes
   - Contract variations

---

## 7. KEY FILES CREATED

### New Files (2)

**PremiumShiftSystemScreen.tsx** (810 lines)

- Location: `src/screens/onboarding/premium/PremiumShiftSystemScreen.tsx`
- Purpose: Tinder-style swipeable cards for shift system selection
- Key Features:
  - 2 shift system cards (2-shift, 3-shift)
  - Spring physics animations
  - Gesture handling (swipe right/left/up)
  - Learn more modal with detailed info
  - Progress tracking
  - Screen state reset on navigation return

**PremiumShiftSystemScreen.test.tsx** (260 lines)

- Location: `src/screens/onboarding/premium/__tests__/PremiumShiftSystemScreen.test.tsx`
- Coverage: 19 tests, 100% passing
- Tests:
  - Initial rendering
  - Card display
  - Progress tracking
  - Theme consistency
  - Gesture interactions
  - Edge cases

### Modified Files (15)

1. **src/types/index.ts** - Add `ShiftSystem` enum
2. **src/contexts/OnboardingContext.tsx** - Add `shiftSystem` to context state
3. **src/navigation/OnboardingNavigator.tsx** - Reorder screens (System before Pattern)
4. **src/screens/onboarding/premium/PremiumIntroductionScreen.tsx** - Navigate to ShiftSystem
5. **src/screens/onboarding/premium/PremiumShiftPatternScreen.tsx** - Add pattern filtering
6. **src/screens/onboarding/premium/PremiumStartDateScreen.tsx** - Support 3-shift calendars
7. **src/screens/onboarding/premium/PremiumCustomPatternScreen.tsx** - Support 3-shift sliders
8. **src/screens/onboarding/premium/PremiumShiftTimeInputScreen.tsx** - Validate shift durations
9. **src/utils/shiftUtils.ts** - Add 3-shift helper functions
10. **src/utils/shiftTimeUtils.ts** - Add time validation for both systems
11. **jest.setup.js** - Add `Gesture.Simultaneous` mock
    12-15. **Test files** - Update step numbers, add system support

### Code Metrics

- **Lines Added**: ~2,246
- **Lines Removed**: ~277
- **Net Change**: +1,969 lines
- **Files Changed**: 17
- **Tests Added**: 19
- **Total Tests Passing**: 57 (across all onboarding screens)

---

## 8. TECHNICAL SPECIFICATIONS

### Shift System Enum

```typescript
export enum ShiftSystem {
  TWO_SHIFT = '2-shift', // 12-hour: Day/Night/Off
  THREE_SHIFT = '3-shift', // 8-hour: Morning/Afternoon/Night/Off
}
```

### Pattern Filtering Algorithm

```typescript
// 1. User selects shift system (Step 3)
const selectedSystem: ShiftSystem = ShiftSystem.THREE_SHIFT;

// 2. Filter patterns (Step 4)
const filteredPatterns = SHIFT_PATTERNS.filter((pattern) =>
  pattern.supportedSystems.includes(selectedSystem)
);

// Result for 3-shift:
// [Continental, Custom] (2 patterns instead of 9)
```

### Pattern Conversion (3-Shift)

For predefined 2-shift patterns, convert to 3-shift structure:

```typescript
// Input: 4-4-4 pattern (2-shift)
{
  daysOn: 4,
  nightsOn: 4,
  daysOff: 4
}

// Output: 4-4-4-4 pattern (3-shift)
{
  morningOn: 4,    // Same as daysOn
  afternoonOn: 4,  // Same as daysOn
  nightOn: 4,      // Same as nightsOn
  daysOff: 4       // Same as daysOff
}

// Cycle length: 12 days → 16 days
```

### Calendar Color System

**2-Shift System**:

- Day: Blue (#2196F3)
- Night: Purple (#651FFF)
- Off: Amber (#FF9800)

**3-Shift System**:

- Morning: Yellow (#FCD34D) - Sunrise
- Afternoon: Orange (#FB923C) - Midday warmth
- Night: Purple (#651FFF) - Same as 2-shift
- Off: Amber (#FF9800) - Same as 2-shift

### Navigation Flow

```
Step 1: Welcome
Step 2: Introduction (name, occupation, company, country)
Step 3: Shift System ⭐ NEW
   ├─ If 2-Shift selected →
   │  Step 4: Pattern (8 options: 4-4-4, 7-7-7, 2-2-3, etc.)
   │     ├─ If predefined → Step 5: StartDate (3 phases)
   │     └─ If custom → Step 5: CustomPattern (3 sliders) → Step 6: StartDate
   └─ If 3-Shift selected →
      Step 4: Pattern (2 options: Continental, Custom)
         ├─ If Continental → Step 5: StartDate (4 phases)
         └─ If custom → Step 5: CustomPattern (4 sliders) → Step 6: StartDate

Step 7: ShiftTimeInput
   ├─ If 2-Shift: Duration locked to 12 hours
   └─ If 3-Shift: Duration locked to 8 hours
```

### Animation Specifications

**Card Entrance**:

- Delay: 100ms per card
- Duration: 400ms
- Easing: `Easing.out(Easing.ease)`
- Type: Opacity + TranslateY

**Swipe Physics**:

- Threshold: 120px
- Velocity: 500px/s
- Spring Config: `{ damping: 25, stiffness: 450 }`

**Haptic Feedback**:

- Swipe Right (Select): `NotificationFeedbackType.Success`
- Swipe Left (Skip): `ImpactFeedbackStyle.Light`
- Swipe Up (Learn More): `ImpactFeedbackStyle.Medium`

---

## 9. METRICS TO TRACK

### User Behavior

- [ ] % of users choosing 2-shift vs 3-shift
- [ ] Average time spent on shift system screen
- [ ] % of users who tap "Learn More"
- [ ] Pattern selection distribution per system
- [ ] Drop-off rate after system selection

### Performance

- [ ] Screen render time
- [ ] Animation frame rate (target: 60fps)
- [ ] Navigation latency
- [ ] Memory usage during swipe gestures

### Engagement

- [ ] How many users swipe left (skip) before selecting?
- [ ] Do users go back to change their system choice?
- [ ] Custom pattern usage rate (2-shift vs 3-shift)

---

## 10. LESSONS LEARNED

### What Went Well

1. **TypeScript Caught Most Errors Early**
   - Enum types prevented string literal mistakes
   - Interface contracts caught missing fields
   - Type-safe pattern filtering

2. **Test-Driven Development Paid Off**
   - 19 tests written alongside implementation
   - Caught navigation bugs before manual testing
   - Confidence to refactor without breaking things

3. **Reanimated 4 is a Pleasure**
   - Spring physics "just work"
   - Gesture handler integration is smooth
   - Native driver performance is excellent

### What Was Hard

1. **Navigation Reordering**
   - Had to update 15 files
   - Easy to miss edge cases
   - Step numbers were hardcoded (should be dynamic)

2. **Pattern Data Migration**
   - Old patterns didn't have `supportedSystems`
   - Had to audit each pattern manually
   - No automated migration script

3. **3-Shift Pattern Scarcity**
   - Only found 1 common 3-shift pattern (Continental)
   - Need industry research for more patterns
   - Custom pattern becomes critical for 3-shift users

### What I'd Do Differently

1. **Prototype Information Architecture First**
   - Should have mapped the decision tree before coding
   - User flow diagrams would have revealed the ordering issue
   - Wireframes with data dependencies

2. **Make Step Numbers Dynamic**

   ```typescript
   // Instead of:
   <ProgressHeader currentStep={3} totalSteps={10} />

   // Do this:
   const SCREEN_STEP_MAP = {
     'ShiftSystem': 3,
     'ShiftPattern': 4,
     // ...
   };
   <ProgressHeader
     currentStep={SCREEN_STEP_MAP[currentScreen]}
     totalSteps={10}
   />
   ```

3. **Add Pattern Validation**
   - Patterns should be validated on load
   - Check for missing `supportedSystems`
   - TypeScript should enforce this

---

## 11. QUESTIONS FOR THE COMMUNITY

1. **For Product Designers**: When building multi-step flows with dependent choices, what tools do you use to model the information architecture? Figma? Miro? Code?

2. **For React Native Developers**: How do you handle navigation state when reordering screens? Do you use route params, context, or Redux?

3. **For Mining Industry Folks**: Are there common 8-hour shift patterns I'm missing? What do processing plants and manufacturing facilities typically use?

4. **For UX Researchers**: Should I add a "Not sure?" option that shows a comparison tool? Or force the choice upfront?

---

## 12. RELATED BUILD-IN-PUBLIC POSTS

- [Day One Foundations](../system-thinking/01-day-one-foundations.md) - Initial architecture decisions
- [Tinder-Style Pattern Selection](../unexpected-challenge/04-tinder-style-pattern-selection.md) - Making boring content engaging
- [Start Date Calendar System](../technical-discovery/06-start-date-calendar-system.md) - Date math and phase offset calculation

---

## 13. NEXT STEPS

- [ ] Add more 3-shift patterns (research common manufacturing schedules)
- [ ] Implement pattern recommendations based on occupation
- [ ] Add system comparison tool for undecided users
- [ ] Update README with new screen
- [ ] Record demo video
- [ ] Share on LinkedIn/Twitter

---

**Status**: ✅ Committed, Pushed, Documented
**Commit**: `4b15591` - "Add 3-shift system support and optimize onboarding screen order"
**Branch**: `main`
**Date**: February 8, 2026

---

_Built with ❤️ for shift workers who deserve better tools._
