# Ellie - Shift Schedule Manager for Mining Workers

![CI Pipeline](https://github.com/IlyasuSeidu/Ellie/workflows/CI%20Pipeline/badge.svg)
![E2E Tests](https://github.com/IlyasuSeidu/Ellie/workflows/E2E%20Tests/badge.svg)
[![codecov](https://codecov.io/gh/IlyasuSeidu/Ellie/branch/main/graph/badge.svg)](https://codecov.io/gh/IlyasuSeidu/Ellie)

**Ellie** helps mining shift workers manage complex rotating shift schedules during multi-week work cycles. Never lose track of whether you're on day shifts, night shifts, or off days again.

> **"Did I set my alarm for the right time? Am I on days or nights tomorrow?"**
> **"When's my next fly-out day?"**
> **"Am I working on my kid's birthday in March?"**

Ellie answers these questions with a glance—no mental math, no counting forward from your start date, no missed shifts.

---

## 🎯 The Problem

Mining shift workers operate on repeating cycles (7-7-7, 4-4-4, 2-2-3, custom patterns) that span weeks. Keeping track of which day of the cycle you're on, across months and life events, is mentally exhausting. Workers constantly:

- Lose their place in the 21-day cycle, especially after days off
- Do mental math to figure out if they're working a specific future date
- Miss shift start times because they set alarms for the wrong shift
- Can't plan family events without counting through their pattern manually

**The Core Insight**: Humans aren't built to track repeating patterns across months. We need a tool that does the math for us.

---

## ✨ The Solution

Ellie is a **premium shift schedule app** built specifically for mining workers. It provides:

- **Instant shift visibility**: "Tomorrow: Night Shift 🌙 6pm-6am"
- **Long-term planning**: See your schedule months in advance
- **Smart notifications**: Reminders before shift starts
- **Offline-first**: Works underground with no cell signal
- **Pattern flexibility**: Supports all standard patterns + custom cycles
- **Dual roster paradigms**: Rotating rosters and FIFO/block rosters
- **Voice assistant tooling**: Date/range queries, next block, days-until-work/rest, and current block info

---

## 🚀 Current Features

### FIFO + Rotating Support (Phase 1-7)

- **Dual-paradigm scheduling**: `RosterType` split between `rotating` and `fifo`
- **FIFO onboarding path**: Roster selection, FIFO patterns, custom FIFO config, FIFO phase selector
- **FIFO dashboard UX**: Work/Rest block labels, block countdowns, FIFO legends and badges
- **Voice assistant FIFO tools**:
  - `get_next_work_block`
  - `get_next_rest_block`
  - `days_until_work`
  - `days_until_rest`
  - `current_block_info`
- **Backend parity**: Cloud Function tool execution supports rotating + FIFO behaviors
- **Persistence + migration**: Backward-compatible onboarding migration to `rosterType`

### Premium Onboarding Flow (Completed)

Ellie features a polished, Tinder-inspired onboarding experience built with React Native Reanimated 4:

#### 1. **Welcome Screen** - First Impressions Matter

- Orchestrated entrance animations with staggered delays
- Spring physics for natural motion
- Accessibility-first with reduced motion support
- [Read the story →](build-in-public/emotional-moment/03-welcome-screen-first-impression.md)

#### 2. **Introduction Screen** - Conversational Onboarding

- Progressive disclosure chatbot experience (one question at a time)
- Animated mining helmet avatar with breathing animation
- Typing indicators for natural conversation feel
- Smart editing (long-press any response to rewind conversation)
- Name personalization ("Great to meet you, John!")
- Sacred Theme colors throughout (gold and stone)
- 60fps spring animations for all transitions
- [Read the story →](build-in-public/emotional-moment/10-conversational-introduction.md)

#### 3. **Shift Pattern Selection** - Tinder-Style Cards

- Swipeable cards for 9 standard patterns (4-4-4, 7-7-7, 2-2-3, etc.)
- Physics-based gestures with rotation and depth effects
- Learn More modals for pattern details
- Custom pattern option
- [Read the story →](build-in-public/unexpected-challenge/04-tinder-style-pattern-selection.md)

#### 4. **Custom Pattern Builder** - Every Mine is Different

- Visual sliders with 3D icon thumbs (sun, moon, rest)
- Real-time pattern preview with color-coded blocks
- Smart validation with helpful warnings
- Live cycle visualization
- [Read the story →](build-in-public/user-empathy/05-custom-pattern-builder.md)

#### 5. **Phase Selector** - Tinder-Style Phase Selection

- Dedicated screen for phase selection (separated from Start Date)
- Swipeable cards for phases (Day/Night/Off for 2-shift, +Morning/Afternoon for 3-shift)
- Two-stage selection flow: Phase cards → Day-within-phase cards
- **Day-within-phase selector** - capture exact cycle position (e.g., day 3 of 7 nights)
- Physics-based gestures with spring animations
- Stack depth effects (scale, opacity, rotation)
- Progressive disclosure (day cards only shown if phase length > 1)
- Calculates phaseOffset and saves to context
- [Read the story →](build-in-public/system-thinking/11-phase-selector-separation.md)

#### 6. **Start Date Selection** - Calendar Intelligence

- Interactive calendar with swipe gestures for month navigation
- Live shift preview icons on calendar days (☀️🌙🏠)
- 7-day timeline showing upcoming shifts
- Smart defaults (tomorrow as start date)
- Calendar legend for shift types
- Uses phaseOffset from Phase Selector for accurate positioning
- [Read the calendar story →](build-in-public/technical-discovery/06-start-date-calendar-system.md)
- [Day positioning story →](build-in-public/user-empathy/09-day-within-phase-positioning.md)

#### 7. **Shift Time Input** - Smart Time Configuration

- 6 preset shift times (Early Day, Standard Day, Late Day, Evening, Night)
- Custom time input with 12/24-hour format conversion
- Auto-detection of day/night shifts based on start time
- Overnight shift handling (crossing midnight)
- Duration selector (8 or 12 hours)
- Live preview of shift start/end times
- Pattern summary card with floating animations
- [Read the story →](build-in-public/unexpected-challenge/07-shift-time-animation-crashes.md)

### Core Technology (Foundation)

- **Bulletproof Shift Calculation**: Pure functions for instant, offline calculations
- **TypeScript + Zod Validation**: Runtime safety for user data
- **Firebase Backend**: Cloud Firestore for data sync
- **Sacred Theme System**: Premium design language for shift workers
- **1,500+ Tests**: Comprehensive coverage across 42 test suites
- [Read the story →](build-in-public/system-thinking/01-day-one-foundations.md)

---

## 🛠 Tech Stack

### Frontend

- **Framework**: Expo SDK 54 with React Native 0.81
- **Language**: TypeScript 5.9 (strict mode)
- **Animations**: React Native Reanimated 4
- **Gestures**: React Native Gesture Handler
- **UI Components**: Custom components with Sacred theme
- **Navigation**: React Navigation 7.x (Native Stack)

### Backend

- **Database**: Firebase Cloud Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage (for icons/assets)
- **Environment Management**: dotenv with environment validation

### State Management

- **Onboarding**: React Context (`OnboardingContext`)
- **Shift Calculations**: Pure functions (client-side)
- **User Data**: Firebase Firestore + local state

### Code Quality

- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier
- **Pre-commit Hooks**: Husky + lint-staged
- **Type Checking**: TypeScript strict mode
- **Testing**: Jest (1,500 tests), React Testing Library, Detox (E2E)

### CI/CD

- **GitHub Actions**: Automated testing and builds
- **Code Coverage**: Codecov integration
- **Platform Builds**: EAS Build (iOS/Android)

---

## 📦 Getting Started

### Prerequisites

- **Node.js**: v18.x or later
- **npm**: v9.x or later
- **Expo CLI**: Latest version
- **iOS Development** (macOS only):
  - Xcode 14 or later
  - CocoaPods
- **Android Development**:
  - Android Studio
  - Android SDK (API 33 or later)
  - JDK 17

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/IlyasuSeidu/Ellie.git
cd Ellie

# 2. Install dependencies (use --legacy-peer-deps due to React Native constraints)
npm install --legacy-peer-deps

# 3. Set up environment variables
# Create .env file in root directory
cp .env.example .env

# 4. Add your Firebase configuration to .env
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# 5. Start the development server
npm start
```

### Running the App

```bash
# iOS Simulator (macOS only)
npm run ios

# Android Emulator
npm run android

# Expo Go (physical device)
npm start  # Then scan QR code with Expo Go app
```

---

## 🧪 Development

### Available Scripts

#### Development

```bash
npm start                # Start Expo development server
npm run android          # Run on Android emulator
npm run ios              # Run on iOS simulator
npm run web              # Run in web browser (limited support)
```

#### Code Quality

```bash
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors automatically
npm run format           # Format code with Prettier
npm run format:check     # Check if code is formatted
npm run type-check       # Run TypeScript type checking
npm run validate         # Run type-check and lint together
```

#### Testing

```bash
npm test                 # Run all unit tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:e2e         # Run E2E tests (requires built app)
npm run test:e2e:build   # Build app for E2E testing
```

#### Specific Test Suites

```bash
# Test individual screens
npm test -- --testPathPattern="PremiumWelcomeScreen"
npm test -- --testPathPattern="PremiumShiftPatternScreen"
npm test -- --testPathPattern="PremiumStartDateScreen"

# Test utils and services
npm test -- --testPathPattern="shiftUtils"
npm test -- --testPathPattern="ShiftDataService"
```

---

## 📁 Project Structure

```
Ellie/
├── .github/                      # GitHub configuration & CI/CD workflows
├── .husky/                       # Git hooks (pre-commit)
├── assets/                       # Static assets
│   └── onboarding/
│       └── icons/
│           ├── consolidated/     # 3D pattern icons
│           ├── phase-selector/   # Day/night/off icons
│           └── ui-elements/      # Buttons, hints, etc.
├── build-in-public/              # 📝 Build-in-public content
│   ├── system-thinking/          # Foundation & architecture stories
│   ├── design-tradeoff/          # Sacred theme & design decisions
│   ├── emotional-moment/         # Welcome screen & first impressions
│   ├── unexpected-challenge/     # Tinder-style pattern selection
│   ├── user-empathy/             # Custom pattern builder
│   └── technical-discovery/      # Start date calendar system
├── src/
│   ├── components/               # Reusable UI components
│   │   └── onboarding/
│   │       └── premium/          # Premium onboarding components
│   │           ├── PatternCard.tsx
│   │           ├── PhaseSelector.tsx
│   │           ├── PremiumButton.tsx
│   │           ├── PremiumCalendar.tsx
│   │           ├── PremiumSlider.tsx
│   │           └── __tests__/    # Component tests
│   ├── contexts/                 # React contexts
│   │   ├── OnboardingContext.tsx # Onboarding state management
│   │   └── __tests__/
│   ├── navigation/               # Navigation configuration
│   │   └── OnboardingNavigator.tsx
│   ├── screens/                  # Screen components
│   │   └── onboarding/
│   │       └── premium/
│   │           ├── PremiumWelcomeScreen.tsx
│   │           ├── PremiumIntroductionScreen.tsx
│   │           ├── PremiumShiftPatternScreen.tsx     # Tinder-style cards
│   │           ├── PremiumCustomPatternScreen.tsx    # Custom builder
│   │           ├── PremiumStartDateScreen.tsx        # Calendar & phase
│   │           ├── PremiumShiftTimeInputScreen.tsx   # Shift time configuration
│   │           └── __tests__/
│   ├── services/                 # Backend services
│   │   ├── AsyncStorageService.ts
│   │   ├── AuthService.ts
│   │   ├── FirebaseService.ts
│   │   ├── ShiftDataService.ts
│   │   └── __tests__/
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts              # ShiftPattern, ShiftCycle, etc.
│   ├── utils/                    # Utility functions
│   │   ├── shiftUtils.ts         # Shift calculation logic
│   │   ├── dateUtils.ts          # Date manipulation
│   │   ├── theme.ts              # Sacred theme system
│   │   └── __tests__/
│   └── config/                   # App configuration
│       └── firebase.config.ts
├── tests/                        # Integration tests
├── App.tsx                       # Root component
├── app.json                      # Expo configuration
└── README.md                     # This file
```

---

## 🎨 Design System - Sacred Theme

Ellie uses a custom design system called **"Sacred"** - built specifically for shift workers who check their schedules at 4am before heading underground.

### Color Palette

Colors inspired by the mining environment itself:

| Name           | Hex       | Usage                                   |
| -------------- | --------- | --------------------------------------- |
| **deepVoid**   | `#0C0A09` | Backgrounds (the darkness underground)  |
| **sacredGold** | `#C5975C` | Primary accents (the mineral extracted) |
| **paleGold**   | `#F5F1E8` | Body text (4.8:1 contrast, WCAG AA)     |
| **ashStone**   | `#1C1917` | Card backgrounds (the rock face)        |
| **warmStone**  | `#A8A29E` | Secondary text                          |
| **lightStone** | `#78716C` | Labels and hints                        |
| **dayShift**   | `#2196F3` | Day shift indicators                    |
| **nightShift** | `#651FFF` | Night shift indicators                  |
| **daysOff**    | `#FF9800` | Days off indicators                     |

[Read the design story →](build-in-public/design-tradeoff/02-sacred-theme-system.md)

---

## 🧭 Roadmap

### ✅ Phase 1: Foundation (Completed)

- [x] Project setup and development environment
- [x] TypeScript types and Zod validation
- [x] Utility functions (shift calculation, date handling)
- [x] Firebase integration
- [x] Sacred theme system
- [x] Testing infrastructure (1,500+ tests)

### ✅ Phase 2: Premium Onboarding (In Progress)

- [x] Welcome screen with orchestrated animations
- [x] Introduction screen (name, occupation, company, country)
- [x] Tinder-style shift pattern selection
- [x] Custom pattern builder with visual sliders
- [x] Start date & phase selection with calendar
- [x] Shift time input with presets and custom options
- [x] Onboarding navigation flow

### 🚧 Phase 3: Core App Features (In Progress)

- [ ] Energy level selection
- [ ] AI assistance preference
- [ ] Earnings input (hourly rate, overtime)
- [ ] Onboarding completion screen

### 📋 Phase 4: Main App (Planned)

- [ ] Home screen with "Tomorrow: [Shift Type]" display
- [ ] Full calendar view with shift preview
- [ ] Shift notifications (1 hour before start)
- [ ] Pattern editing and management
- [ ] Fly-out day countdown
- [ ] Important date checking ("Am I working on...")

### 🔮 Phase 5: Advanced Features (Future)

- [ ] Multiple pattern support (different sites)
- [ ] Shift swap tracking
- [ ] Calendar export (Google Calendar integration)
- [ ] Pattern sharing with coworkers
- [ ] Recurring event support (holidays, shutdowns)
- [ ] Analytics and insights (hours worked, earnings tracking)

---

## 📖 Build-in-Public Journey

I'm building Ellie in public, documenting every decision, challenge, and lesson learned. Each major feature has a dedicated story:

| Feature                 | Story Angle          | Link                                                                                |
| ----------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| **Day 1: Foundation**   | System Thinking      | [Read →](build-in-public/system-thinking/01-day-one-foundations.md)                 |
| **Sacred Theme**        | Design Tradeoff      | [Read →](build-in-public/design-tradeoff/02-sacred-theme-system.md)                 |
| **Welcome Screen**      | Emotional Moment     | [Read →](build-in-public/emotional-moment/03-welcome-screen-first-impression.md)    |
| **Pattern Selection**   | Unexpected Challenge | [Read →](build-in-public/unexpected-challenge/04-tinder-style-pattern-selection.md) |
| **Custom Builder**      | User Empathy         | [Read →](build-in-public/user-empathy/05-custom-pattern-builder.md)                 |
| **Start Date Screen**   | Technical Discovery  | [Read →](build-in-public/technical-discovery/06-start-date-calendar-system.md)      |
| **Shift Time Input**    | Unexpected Challenge | [Read →](build-in-public/unexpected-challenge/07-shift-time-animation-crashes.md)   |
| **Shift System**        | System Thinking      | [Read →](build-in-public/system-thinking/08-shift-system-architecture.md)           |
| **Day Within Phase**    | User Empathy         | [Read →](build-in-public/user-empathy/09-day-within-phase-positioning.md)           |
| **Introduction Screen** | Emotional Moment     | [Read →](build-in-public/emotional-moment/10-conversational-introduction.md)        |
| **Phase Selector**      | System Thinking      | [Read →](build-in-public/system-thinking/11-phase-selector-separation.md)           |

Each story includes:

- Human summary for miners
- Build-in-public post
- Beginner lesson
- Expert insight
- Short video script
- Future improvements

---

## 🧪 Testing Strategy

Ellie has comprehensive test coverage across all layers:

### Unit Tests (1,500+ tests)

- **Utilities**: Shift calculations, date manipulation, validation
- **Components**: All onboarding components
- **Services**: Firebase, storage, auth, shift data
- **Contexts**: Onboarding state management

### Integration Tests

- **Services Integration**: Cross-service data flow
- **Onboarding Flow**: Complete user journey

### E2E Tests (Planned)

- **Critical Flows**: Onboarding completion, shift viewing
- **Platform-Specific**: iOS and Android behavior

### Test Commands

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- --testPathPattern="PremiumStartDateScreen"

# Watch mode for TDD
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

### 1. Code Standards

- **TypeScript**: Strict mode, no `any` types
- **Testing**: Add tests for all new features
- **Formatting**: Prettier + ESLint (auto-fixed on commit)
- **Commits**: Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)

### 2. Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/your-feature-name

# 2. Make changes and add tests
# 3. Run validation
npm run validate
npm test

# 4. Commit (pre-commit hooks will run automatically)
git commit -m "feat: add new feature"

# 5. Push and create PR
git push origin feature/your-feature-name
```

### 3. Pull Request Template

- Describe what changed and why
- Link related issues
- Include screenshots for UI changes
- Verify all CI checks pass

---

## 🐛 Troubleshooting

### Common Issues

**Metro bundler cache issues**

```bash
npx expo start -c
```

**iOS build failing**

```bash
cd ios && pod install && cd ..
npm run ios
```

**Android build failing**

```bash
cd android && ./gradlew clean && cd ..
npm run android
```

**Type errors after dependency update**

```bash
npm run type-check
```

**Pre-commit hook failing**

```bash
npm run validate
npm run format
```

**Firebase connection issues**

- Verify `.env` file has correct Firebase credentials
- Check Firebase project is active
- Ensure Firestore rules allow read/write

---

## 📊 Metrics

### Current Status (as of latest commit)

- **Total Tests**: 1,701 passing (51 test suites)
- **Test Coverage**:
  - Branches: 62.03% (≥60% ✅)
  - Functions: 76.95% (≥70% ✅)
  - Lines: 73.60% (≥70% ✅)
  - Statements: 74.27% (≥70% ✅)
- **TypeScript Errors**: 0
- **ESLint Errors**: 0
- **Onboarding Screens**: 7 completed (Welcome, Introduction, Shift System, Pattern Selection, Custom Builder, Phase Selector, Start Date, Shift Time Input)
- **Lines of Code**: ~18,000+
- **Commits**: 79+
- **Build Time**: ✅ Passing
- **CI/CD**: ✅ All workflows green

---

## 📄 License

This project is private and proprietary.

---

## 📞 Contact

**GitHub**: [@IlyasuSeidu](https://github.com/IlyasuSeidu)
**Repository**: [Ellie](https://github.com/IlyasuSeidu/Ellie)

---

## 💡 The Vision

**Ellie exists because shift work is hard enough without the mental overhead of tracking complex rotating schedules.**

Every feature is designed with one question in mind: _"Will this help a miner know what shift they're on at 4am?"_

If you're a shift worker tired of counting through your pattern, Ellie is for you.

---

_Built with respect for the work, using Expo and React Native._

_"Track your shifts. Own your time."_
