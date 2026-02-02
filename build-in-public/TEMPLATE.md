# Build-in-Public Content Generation Template

This template captures the prompt structure used to generate build-in-public documentation for Ellie. Use this prompt whenever a feature or screen is fully built to create consistent, comprehensive documentation.

---

## When to Use This Template

Use this template when:

- A major feature or screen is completed and tested
- All tests are passing
- The feature is committed to git
- You want to document the journey and decisions behind the feature

---

## The Prompt

```
Ellie is an app that helps mining shift workers manage complex rotating shift schedules during multi-week work cycles so they can clearly see when they're working day shifts, night shifts, or off days and plan their lives accordingly.

Job role: Individual Surface and Underground hard rock miner

Shift type: All mine shift types
Biggest daily struggle: Losing track of which shift they're on on a date and missing shift start times

What they check their phone for during shifts:

"Did I set my alarm for the right time? Am I on days or nights tomorrow?"
"When's my next fly-out day?" (last day before 7 days off at home)
"Am I working on my kid's birthday in March?"

What would make their day easier:

Glancing at their phone and INSTANTLY seeing "Tomorrow: Night Shift 🌙 6pm-6am" without doing mental math about where they are in the 21-day cycle
Not having to count forward from their start date every time someone asks "You working Christmas?"
Automatic reminders 1 hour before shift starts so they don't miss muster

The core insight: This person's life runs on a 21-day loop that repeats forever, but humans aren't built to track repeating patterns across months. They constantly lose their place in the cycle, especially after days off when they return to work.

We are building the onboarding flow screen first, and we are at the [FEATURE_NAME]:

[INSERT ONBOARDING FLOW CONTEXT HERE - List of all 10 screens with current status]

Why I am posting?
- Attract future users
- Teach beginners
- Connect with experts
- Build accountability
- Career positioning

After implementing a feature or screen, you must produce the following:

1. HUMAN SUMMARY

Explain what was built and why it matters for mining shift workers. Use simple language.

2. BUILD-IN-PUBLIC POST

Write a thoughtful post that:
- shares one design decision
- includes one struggle or insight
- teaches beginners something
- gives experts something to think about
- ends with a question

Tone: Human, reflective, grounded, not salesy.

3. BEGINNER LESSON

Explain one concept used in this feature in simple terms with analogy.

4. EXPERT INSIGHT

Discuss architecture, tradeoffs, or scalability considerations.

5. SHORT VIDEO SCRIPT

60–90 seconds spoken script:
Hook → What I built → Why it matters → One lesson → Invitation

6. FUTURE IMPROVEMENT

End with what could be improved next.

Rotate storytelling angles each time:
- user empathy
- design tradeoff
- unexpected challenge
- system thinking
- emotional moment
- technical discovery

Avoid clichés.

Now Claude you become:
Builder + storyteller + teacher.

Create a dedicated folder for that and also always put the files in that folder and also you can also get subfolders for the storytelling angles too.

[INSERT SPECIFIC FEATURE DETAILS HERE]

Do not forget to update the README of Ellie on Github
```

---

## Variables to Fill In

When using this template, replace these placeholders:

### 1. `[FEATURE_NAME]`

The name of the feature/screen being documented.

**Example**: "Premium Start Date Screen" or "Energy Level Selection"

### 2. `[INSERT ONBOARDING FLOW CONTEXT HERE]`

The complete list of onboarding screens with current completion status.

**Example**:

```
1. Welcome Animation - Component: WelcomeAnimation ✅ Complete
2. Introduction (Step 1) - Component: IntroductionScreen ✅ Complete
3. Shift Pattern (Step 2) - Component: SwipeableShiftPatternScreen ✅ Complete
4. Custom Pattern (Step 3) - Component: PremiumCustomPatternScreen ✅ Complete
5. Shift Start Date (Step 4) - Component: PremiumStartDateScreen ✅ Complete
6. Energy Level (Step 5) - Component: EnergyLevelScreen 🚧 In Progress
7. AI Assistance (Step 6) - Component: AIAssistanceScreen ⏳ Planned
8. Reports Preference (Step 7) - Component: ReportsPreferenceScreen ⏳ Planned
9. Earnings Input (Step 8) - Component: EarningsInputScreen ⏳ Planned
10. Completion (Step 9) - Component: OnboardingCompletionScreen ⏳ Planned
```

### 3. `[INSERT SPECIFIC FEATURE DETAILS HERE]`

Specific details about what was implemented in this feature.

**Example**:

```
I just completed the PremiumStartDateScreen with the following features:
- Interactive calendar with swipe gestures for month navigation
- Phase selector (day/night/off shifts)
- Live shift preview icons on calendar days (☀️🌙🏠)
- 7-day timeline showing upcoming shifts
- Smart defaults (tomorrow as start date)
- Calendar legend for shift types
- Selected date display card with crossfade animation
- Pattern summary with timeline track
- All features from the implementation guide

Files changed:
- src/screens/onboarding/premium/PremiumStartDateScreen.tsx
- src/screens/onboarding/premium/__tests__/PremiumStartDateScreen.test.tsx
- All 32 tests passing

Generate comprehensive build-in-public content for this feature.
```

---

## Output Structure

The generated content will be saved in this structure:

```
build-in-public/
├── system-thinking/
│   └── [NN]-[feature-name].md
├── design-tradeoff/
│   └── [NN]-[feature-name].md
├── emotional-moment/
│   └── [NN]-[feature-name].md
├── unexpected-challenge/
│   └── [NN]-[feature-name].md
├── user-empathy/
│   └── [NN]-[feature-name].md
├── technical-discovery/
│   └── [NN]-[feature-name].md
└── TEMPLATE.md (this file)
```

Each story file will include:

1. Human Summary (for miners)
2. Build-in-Public Post (for social media)
3. Beginner Lesson (with analogies)
4. Expert Insight (architecture/tradeoffs)
5. Short Video Script (60-90 seconds)
6. Future Improvements
7. Key Files Created
8. Technical Specifications
9. Metrics (if available)

---

## Storytelling Angle Rotation

Each feature should use a different storytelling angle to keep content diverse:

| Feature           | Angle                | Focus                                            |
| ----------------- | -------------------- | ------------------------------------------------ |
| Foundation        | System Thinking      | Infrastructure, architecture, bottom-up approach |
| Sacred Theme      | Design Tradeoff      | Color choices, accessibility vs. aesthetics      |
| Welcome Screen    | Emotional Moment     | First impressions, animation orchestration       |
| Pattern Selection | Unexpected Challenge | Making boring content engaging                   |
| Custom Builder    | User Empathy         | Supporting edge cases, remote Arctic miners      |
| Start Date Screen | Technical Discovery  | Date math, phase offset calculation              |
| **Next Feature**  | **[Choose Next]**    | **[Your Focus]**                                 |

**Available angles**:

- ✅ System Thinking (used)
- ✅ Design Tradeoff (used)
- ✅ Emotional Moment (used)
- ✅ Unexpected Challenge (used)
- ✅ User Empathy (used)
- ✅ Technical Discovery (used)

**Rotation tip**: Start over with system-thinking for the next major phase, or choose based on the feature's nature.

---

## Example Usage

### Step 1: Complete the Feature

- Implement the feature
- Write tests (all passing)
- Commit to git
- Push to GitHub

### Step 2: Prepare the Prompt

```
[Copy the full prompt from above]

[FEATURE_NAME] = "Energy Level Selection Screen"

[INSERT ONBOARDING FLOW CONTEXT] = [Copy current onboarding flow status]

[INSERT SPECIFIC FEATURE DETAILS] =
"I just completed the EnergyLevelScreen with:
- Visual slider for energy level selection (1-10)
- Color-coded indicators (red=low, yellow=medium, green=high)
- Animated transitions between levels
- Persistent state in OnboardingContext
- Haptic feedback on level change
- 28 tests passing

Files changed:
- src/screens/onboarding/premium/EnergyLevelScreen.tsx
- src/screens/onboarding/premium/__tests__/EnergyLevelScreen.test.tsx

Generate comprehensive build-in-public content for this feature using the 'design-tradeoff' angle."
```

### Step 3: Run the Prompt

Give the complete prompt to Claude, and it will:

1. Analyze the git history for this feature
2. Create the folder structure
3. Generate all 6 story sections
4. Include technical specifications
5. Update the README
6. Commit and push everything

### Step 4: Review and Share

- Review the generated content
- Share on social media (LinkedIn, Twitter, blog)
- Link to the specific story from README

---

## Tips for Great Build-in-Public Content

### Do:

- ✅ Be honest about struggles and failures
- ✅ Share actual code snippets
- ✅ Use specific numbers and metrics
- ✅ Explain WHY you made decisions
- ✅ Ask genuine questions to experts
- ✅ Use analogies for complex concepts
- ✅ Show empathy for the end user (miners)

### Don't:

- ❌ Use marketing language ("amazing", "incredible")
- ❌ Pretend everything went smoothly
- ❌ Skip technical details
- ❌ Make content too generic
- ❌ Forget the user's perspective
- ❌ Use clichés ("game-changer", "disrupting")

---

## Content Quality Checklist

Before committing the generated content, verify:

- [ ] Human Summary explains WHY it matters for miners specifically
- [ ] Build-in-Public Post shares ONE specific decision
- [ ] Build-in-Public Post includes ONE genuine struggle
- [ ] Beginner Lesson uses a clear, relatable analogy
- [ ] Expert Insight discusses actual tradeoffs (not just what you did)
- [ ] Video Script is 60-90 seconds (read it aloud to check)
- [ ] Future Improvements are specific and actionable
- [ ] No marketing language or clichés used
- [ ] Technical specifications are accurate
- [ ] README is updated with links to the new story

---

## Maintenance

**This template should be updated when**:

- The app's target user changes
- New storytelling angles are discovered
- The output structure needs modification
- Better examples are found

**Last updated**: 2026-02-02

---

## Questions?

If you're unsure which storytelling angle to use, consider:

- **System Thinking**: Foundation, architecture, scalability
- **Design Tradeoff**: UI decisions, accessibility, aesthetics
- **Emotional Moment**: First impressions, user delight, critical moments
- **Unexpected Challenge**: Things that went wrong, pivots, lessons
- **User Empathy**: Edge cases, specific user needs, personas
- **Technical Discovery**: Algorithms, performance, complex implementations

Choose the angle that best matches what was most interesting or challenging about this feature.

---

_Remember: Great build-in-public content is honest, educational, and useful to others. Share what you learned, not just what you built._
