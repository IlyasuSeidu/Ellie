# Ryvro Shift Planner

![CI Pipeline](https://github.com/IlyasuSeidu/Ellie/workflows/CI%20Pipeline/badge.svg)
![E2E Tests](https://github.com/IlyasuSeidu/Ellie/workflows/E2E%20Tests/badge.svg)
[![codecov](https://codecov.io/gh/IlyasuSeidu/Ellie/branch/main/graph/badge.svg)](https://codecov.io/gh/IlyasuSeidu/Ellie)

**Ryvro** helps FIFO crews, healthcare teams, security staff, emergency services, transport operators, hospitality workers, miners, and other shift workers build reliable schedules from AI, templates, or the Universal Shift Builder. It keeps rotating rosters, block schedules, reminders, exceptions, colors, and calendar exports in one practical shift-work app.

> **"Did I set my alarm for the right time? Am I on days or nights tomorrow?"**
> **"When's my next fly-out day?"**
> **"Am I working on my kid's birthday in March?"**

Ryvro answers these questions with a glance—no mental math, no counting forward from your start date, no missed shifts.

---

## The Problem

Shift workers operate on repeating cycles, FIFO blocks, overnight rotations, 24-hour duty patterns, weekly venue schedules, and custom rosters that span weeks. Keeping track of which day of the cycle you're on, across months and life events, is mentally exhausting. Workers constantly:

- Lose their place in the 21-day cycle, especially after days off
- Do mental math to figure out if they're working a specific future date
- Miss shift start times because they set alarms for the wrong shift
- Can't plan family events without counting through their pattern manually

**The Core Insight**: Humans aren't built to track repeating patterns across months. We need a tool that does the math for us.

---

## The Solution

Ryvro is a **shift planner for FIFO, rotating, and irregular work** built on a universal schedule engine. It provides:

- **Instant shift visibility**: "Tomorrow: Night Shift 🌙 6pm-6am"
- **Long-term planning**: See your schedule months in advance
- **Smart notifications**: Reminders before shift starts
- **Offline-first**: Works at remote work locations, in transit, in hospitals, at venues, at depots, or anywhere signal is unreliable
- **Universal schedule flexibility**: Supports repeating rotations, FIFO/block rosters, irregular one-off swaps, holidays, travel, training, on-call work, leave, and custom cycles
- **AI + manual setup**: Describe a roster in plain English, start from an industry template, or build it manually
- **Voice assistant tooling**: Date/range queries, next block, days-until-work/rest, current block info, and schedule questions

---

## 🚀 Current Features

### Universal Shift Builder

- **Universal schedule model**: `UniversalShiftSchedule` is the single source of truth for onboarding, settings, dashboard, reminders, import/export, and voice answers.
- **AI-assisted schedule drafting**: Natural-language schedule descriptions become editable drafts.
- **Manual drag-and-drop builder**: Users can define shift types, colors, icons, times, locations, reminder profiles, and sequence order.
- **Industry launch templates**: Mining/FIFO plus healthcare, security, emergency services, manufacturing, transport, hospitality, aviation, and rail examples.
- **Exceptions**: Public holiday overrides and one-off irregular swaps without mutating the repeating sequence.
- **Calendar import/export**: `.ics` export and roster import for Apple Calendar, Google Calendar, Outlook, files, and email.

### Premium Onboarding Flow (Completed)

Ryvro now uses the Universal Shift Builder as its onboarding schedule setup, replacing the old fixed-pattern onboarding screens. The original onboarding work included a polished, Tinder-inspired experience built with React Native Reanimated 4:

#### 1. **Welcome Screen** - First Impressions Matter

- Orchestrated entrance animations with staggered delays
- Spring physics for natural motion
- Accessibility-first with reduced motion support
- [Read the story →](build-in-public/emotional-moment/03-welcome-screen-first-impression.md)

#### 2. **Introduction Screen** - Conversational Onboarding

- Progressive disclosure chatbot experience (one question at a time)
- Ryvro assistant avatar with breathing animation
- Typing indicators for natural conversation feel
- Smart editing (long-press any response to rewind conversation)
- Name personalization ("Great to meet you, John!")
- Sacred Theme colors throughout (gold and stone)
- 60fps spring animations for all transitions
- [Read the story →](build-in-public/emotional-moment/10-conversational-introduction.md)

#### 3. **Universal Shift Builder Entry** - AI, Templates, Or Manual

- Describe shifts in natural language
- Start from industry templates
- Build shift definitions and sequences manually
- Preview schedule before saving

#### 4. **Manual Shift Builder** - Every Work Pattern Is Different

- Drag-and-drop sequence canvas with non-drag reorder controls
- Per-shift color, icon, name, time, work location, and reminder settings
- Real-time calendar preview with color-coded blocks
- Smart validation with helpful warnings
- Live cycle visualization
- [Read the story →](build-in-public/user-empathy/05-custom-pattern-builder.md)

#### 5. **Current Position Selection** - Plain-Language Alignment

- Users choose what shift they are currently on without seeing technical terms like `phaseOffset`.
- Supports positions such as "second night" in a 4 days / 4 nights / 4 off style sequence.
- Saves internal cycle alignment while keeping the UI understandable.
- [Read the story →](build-in-public/system-thinking/11-phase-selector-separation.md)

#### 6. **Start Date Selection** - Calendar Intelligence

- Interactive calendar with swipe gestures for month navigation
- Live shift preview icons and colors on calendar days
- 7-day timeline showing upcoming shifts
- Smart defaults (tomorrow as start date)
- Calendar legend for shift types
- Uses Universal Shift Builder alignment for accurate positioning
- [Read the calendar story →](build-in-public/technical-discovery/06-start-date-calendar-system.md)
- [Day positioning story →](build-in-public/user-empathy/09-day-within-phase-positioning.md)

#### 7. **Shift Time Input** - Smart Time Configuration

- Preset and custom shift times
- Custom time input with 12/24-hour format conversion
- Auto-detection of day/night/evening/morning buckets based on start time
- Overnight shift handling (crossing midnight)
- Duration support for standard and custom shift lengths
- Live preview of shift start/end times
- Pattern summary card with floating animations
- [Read the story →](build-in-public/unexpected-challenge/07-shift-time-animation-crashes.md)

### Core Technology (Foundation)

- **Bulletproof Shift Calculation**: Pure functions for instant, offline calculations
- **TypeScript + Zod Validation**: Runtime safety for user data
- **Firebase Backend**: Cloud Firestore for data sync
- **Sacred Theme System**: Premium design language for shift workers
- **1,779 Tests**: Comprehensive unit, config, service, and integration coverage
- [Read the story →](build-in-public/system-thinking/01-day-one-foundations.md)

---

## Release Status Snapshot

Ryvro is release-prep ready in the repository, but it is not live in the App Store or Google Play yet.

Repo-proven launch state:

- App identity: `Ryvro Shift Planner`, native display name `Ryvro`, bundle/package `com.ryvro.shiftplanner`
- Launch surface: Universal Shift Builder onboarding, dashboard, profile/settings, Ryvro voice entry point, reminders, exceptions, and calendar import/export
- Support/legal surface: Profile links open the configured support, account deletion, privacy policy, and terms URLs
- Hidden v1 tabs: Schedule and Stats are omitted from the bottom navigation; their helper screens are kept free of placeholder copy for any internal entry points
- Templates and fixtures: mining/FIFO plus healthcare, security, emergency services, manufacturing, transport, hospitality, aviation, rail, and operations examples
- Latest local gate: `npm run release:check` passed TypeScript, 110 Jest suites / 1,779 tests / 4 snapshots, the Ryvro native scaffold preflight, the store readiness preflight, the owner handoff preflight, and backend build on 2026-06-01
- Latest iOS simulator gate: `npm run test:e2e -- e2e/onboarding.test.ts --reuse` passed the fresh onboarding path into the Universal Shift Builder, and `npm run test:e2e -- e2e/dashboard.test.ts --reuse` passed 16 dashboard checks including the active universal shift icon
- Owner handoff gate: `npm run release:owner:check` keeps the not-live status, owner account tasks, physical-device QA, and store submission handoff docs visible
- Recent pushed PR gates: GitHub Actions CI run `26735606843` on commit `f194981`, CI run `26728238458` on commit `d7f8f0e`, and CI run `26728115119` on commit `50bc770` passed Unit Tests, Lint and Type Check, Build Check, and the dedicated Release Check job running `npm run release:check`

Owner/account work still required before launch:

- Formal trademark/legal clearance for `Ryvro`
- App Store Connect and Google Play Console app creation/name/package reservation
- Domain and social handle reservation
- Fresh Firebase, Google OAuth, Apple Sign-In, RevenueCat, legal/support/account deletion URLs, and EAS production secrets
- Production `ryvroBrain` and `parseShiftScheduleDescription` deploys and smoke tests, including a valid-prompt `SHIFT_SCHEDULE_PARSER_URL` parser response
- Physical iOS and Android device smoke tests, store screenshots, privacy forms, data-safety forms, TestFlight/internal track upload, and final submission

Current launch handoff lives in [docs/RYVRO_OWNER_LAUNCH_RUNBOOK.md](docs/RYVRO_OWNER_LAUNCH_RUNBOOK.md), [docs/RYVRO_RELEASE_READINESS_REPORT.md](docs/RYVRO_RELEASE_READINESS_REPORT.md), [RYVRO_RELEASE_TASKS.md](RYVRO_RELEASE_TASKS.md), and [docs/RYVRO_EXTERNAL_SERVICE_SETUP.md](docs/RYVRO_EXTERNAL_SERVICE_SETUP.md).

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
- **Testing**: Jest (1,779 tests in the latest release check), React Testing Library, Detox (E2E)

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
# 1. Clone the current repository
git clone https://github.com/IlyasuSeidu/Ellie.git
cd Ellie

# 2. Install dependencies (use --legacy-peer-deps due to React Native constraints)
npm install --legacy-peer-deps

# 3. Set up local development environment variables
cp .env.example .env

# 4. Add your local Firebase configuration to .env
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-firebase-app-id

# For production release builds, use .env.production.example instead
# and run npm run release:env:check before pushing secrets to EAS.

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
# Test current setup and schedule surfaces
npm test -- --testPathPattern="PremiumWelcomeScreen"
npm test -- --testPathPattern="UniversalShiftBuilder"
npm test -- --testPathPattern="CalendarImportExport"

# Test utils and services
npm test -- --testPathPattern="shiftUtils"
npm test -- --testPathPattern="ShiftDataService"
```

---

## 📁 Project Structure

```
Ryvro/
├── .github/                      # GitHub configuration & CI/CD workflows
├── .husky/                       # Git hooks (pre-commit)
├── assets/                       # Static assets
│   └── onboarding/
│       └── icons/
│           ├── 1x/               # Ryvro onboarding and builder visuals
│           └── source/           # Source notes for generated assets
├── src/
│   ├── components/               # Reusable UI components
│   │   └── onboarding/
│   │       └── premium/          # Premium onboarding components
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
│   │   ├── onboarding/
│   │   │   └── premium/
│   │   │       ├── PremiumWelcomeScreen.tsx
│   │   │       ├── PremiumIntroductionScreen.tsx
│   │   │       └── __tests__/
│   │   └── main/
│   │       ├── UniversalShiftBuilderScreen.tsx       # AI/template/manual builder
│   │       └── __tests__/
│   ├── services/                 # Backend services
│   │   ├── AsyncStorageService.ts
│   │   ├── AuthService.ts
│   │   ├── FirebaseService.ts
│   │   ├── ShiftDataService.ts
│   │   └── __tests__/
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts              # Universal schedule and shift types
│   ├── utils/                    # Utility functions
│   │   ├── universalShiftUtils.ts         # Universal shift calculations
│   │   ├── universalShiftScheduleUtils.ts # Schedule projection helpers
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

Ryvro uses a custom design system called **"Sacred"** - built for shift workers who check their schedules at 4am before heading to a work location, ward, depot, airport, plant, venue, or control room.

### Color Palette

Colors are grounded in low-light shift-work conditions and broad enough for every shift-work setting:

| Name           | Hex       | Usage                                  |
| -------------- | --------- | -------------------------------------- |
| **deepVoid**   | `#0C0A09` | Backgrounds and night-shift contrast   |
| **sacredGold** | `#C5975C` | Primary accents and high-value actions |
| **paleGold**   | `#F5F1E8` | Body text (4.8:1 contrast, WCAG AA)    |
| **ashStone**   | `#1C1917` | Card backgrounds (the rock face)       |
| **warmStone**  | `#A8A29E` | Secondary text                         |
| **lightStone** | `#78716C` | Labels and hints                       |
| **dayShift**   | `#2196F3` | Day shift indicators                   |
| **nightShift** | `#651FFF` | Night shift indicators                 |
| **daysOff**    | `#FF9800` | Days off indicators                    |

[Read the design story →](build-in-public/design-tradeoff/02-sacred-theme-system.md)

---

## 🧭 Roadmap

### ✅ Phase 1: Foundation

- [x] Project setup and development environment
- [x] TypeScript types and Zod validation
- [x] Utility functions (shift calculation, date handling)
- [x] Firebase integration
- [x] Sacred theme system
- [x] Testing infrastructure (1,779 tests in the latest release check)

### ✅ Phase 2: Premium Onboarding And Universal Builder

- [x] Welcome screen with orchestrated animations
- [x] Introduction screen (name, occupation, company, country)
- [x] Universal Shift Builder in onboarding and Settings
- [x] AI-assisted schedule drafting
- [x] Manual shift types, colors, icons, reminders, and sequence editing
- [x] Exceptions, holiday overrides, import/export, and calendar preview
- [x] Onboarding navigation flow

### ✅ Phase 3: Core Launch App

- [x] Home dashboard with current/next shift visibility
- [x] Month calendar preview with colors, icons, overnight shifts, and locked future weeks
- [x] Profile and shift settings editing
- [x] Ryvro voice assistant entry point
- [x] Smart reminder configuration and notification service coverage
- [x] Calendar import/export from the Universal Shift Builder
- [x] Dashboard quick actions route to implemented launch surfaces

### 🚧 Phase 4: Store Launch Readiness

- [x] Repo-side Ryvro identity, assets, copy, templates, release docs, and CI gates
- [x] Public clearance preflight script and current public evidence
- [ ] Account-owner clearance, console setup, production secrets, and production backend deploy
- [ ] Physical iOS and Android smoke tests
- [ ] Store screenshots, privacy/data-safety forms, TestFlight/internal track upload, and final submission

### 🔮 Phase 5: Post-Launch Expansion

- [ ] Full Schedule tab
- [ ] Full Stats/analytics surface
- [ ] Team sharing and coworker pattern exchange
- [ ] Advanced shift swap tracking
- [ ] Deeper earnings and allowance analytics
- [ ] Automated EAS/Fastlane release lanes

---

## 📖 Build-in-Public Journey

I'm building Ryvro in public, documenting every decision, challenge, and lesson learned. Each major feature has a dedicated story:

| Feature                 | Story Angle          | Link                                                                                |
| ----------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| **Day 1: Foundation**   | System Thinking      | [Read →](build-in-public/system-thinking/01-day-one-foundations.md)                 |
| **Sacred Theme**        | Design Tradeoff      | [Read →](build-in-public/design-tradeoff/02-sacred-theme-system.md)                 |
| **Welcome Screen**      | Emotional Moment     | [Read →](build-in-public/emotional-moment/03-welcome-screen-first-impression.md)    |
| **Template Discovery**  | Unexpected Challenge | [Read →](build-in-public/unexpected-challenge/04-tinder-style-pattern-selection.md) |
| **Manual Builder**      | User Empathy         | [Read →](build-in-public/user-empathy/05-custom-pattern-builder.md)                 |
| **Start Date Screen**   | Technical Discovery  | [Read →](build-in-public/technical-discovery/06-start-date-calendar-system.md)      |
| **Shift Time Input**    | Unexpected Challenge | [Read →](build-in-public/unexpected-challenge/07-shift-time-animation-crashes.md)   |
| **Shift System**        | System Thinking      | [Read →](build-in-public/system-thinking/08-shift-system-architecture.md)           |
| **Day Within Phase**    | User Empathy         | [Read →](build-in-public/user-empathy/09-day-within-phase-positioning.md)           |
| **Introduction Screen** | Emotional Moment     | [Read →](build-in-public/emotional-moment/10-conversational-introduction.md)        |
| **Current Position**    | System Thinking      | [Read →](build-in-public/system-thinking/11-phase-selector-separation.md)           |

Each story includes:

- Human summary for shift workers
- Build-in-public post
- Beginner lesson
- Expert insight
- Short video script
- Future improvements

---

## 🧪 Testing Strategy

Ryvro has comprehensive test coverage across all layers:

### Unit Tests (1,779 tests in the latest release check)

- **Utilities**: Shift calculations, date manipulation, validation
- **Components**: Onboarding, dashboard, voice, profile, and builder components
- **Services**: Firebase, storage, auth, schedule parsing, notifications, RevenueCat, voice, and analytics
- **Contexts**: Auth, language, onboarding, and subscription state management

### Integration Tests

- **Services Integration**: Cross-service data flow
- **Onboarding Flow**: Complete user journey

### E2E Tests

- **Simulator/emulator smoke**: iOS and Android release-style dashboard, auth, onboarding, and profile language flows have repo-documented evidence
- **Physical device smoke**: still required before store submission

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

### Current Status (as of 2026-06-01 release check)

- **Total Tests**: 1,779 passing (110 Jest suites, 4 snapshots)
- **Test Coverage**:
  - Branches: 62.03% (≥60% ✅)
  - Functions: 76.95% (≥70% ✅)
  - Lines: 73.60% (≥70% ✅)
  - Statements: 74.27% (≥70% ✅)
- **TypeScript Errors**: 0
- **ESLint Errors**: 0
- **Onboarding Flow**: Universal Shift Builder setup completed (Welcome, Introduction, builder entry, AI/template/manual builder, current-position alignment, preview, completion)
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
**Repository**: [Current Ryvro app repository](https://github.com/IlyasuSeidu/Ellie)

---

## 💡 The Vision

**Ryvro exists because shift work is hard enough without the mental overhead of tracking complex rotating schedules.**

Every feature is designed with one question in mind: _"Will this help a shift worker know what they're working at 4am?"_

If you're a shift worker tired of counting through your pattern, Ryvro is for you.

---

_Built with respect for the work, using Expo and React Native._

_"Track your shifts. Own your time."_
