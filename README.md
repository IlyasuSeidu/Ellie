# Ellie

![CI Pipeline](https://github.com/IlyasuSeidu/Ellie/workflows/CI%20Pipeline/badge.svg)
![E2E Tests](https://github.com/IlyasuSeidu/Ellie/workflows/E2E%20Tests/badge.svg)
[![codecov](https://codecov.io/gh/IlyasuSeidu/Ellie/branch/main/graph/badge.svg)](https://codecov.io/gh/IlyasuSeidu/Ellie)

A modern React Native mobile application built with Expo, TypeScript, and best practices for code quality and testing.

## Features

- **TypeScript**: Strict type checking with comprehensive compiler options
- **React Navigation**: Seamless navigation with native stack and bottom tabs
- **Firebase Integration**: Authentication and backend services
- **React Native Paper**: Material Design UI components
- **Comprehensive Testing**: Unit tests with Jest and E2E tests with Detox
- **Code Quality**: ESLint, Prettier, and pre-commit hooks
- **CI/CD**: Automated testing and builds with GitHub Actions

## Tech Stack

- **Framework**: Expo SDK 54 with React Native 0.81
- **Language**: TypeScript 5.9
- **UI Library**: React Native Paper 5.14
- **Navigation**: React Navigation 7.x
- **Backend**: Firebase 11.10
- **State Management**: React Context (built-in)
- **Testing**: Jest, React Testing Library, Detox
- **Code Quality**: ESLint, Prettier, Husky, lint-staged

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.x or later
- **npm**: v9.x or later
- **Expo CLI**: Latest version
- **iOS Development** (macOS only):
  - Xcode 14 or later
  - CocoaPods
- **Android Development**:
  - Android Studio
  - Android SDK (API 33 or later)
  - Java Development Kit (JDK) 17

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/IlyasuSeidu/Ellie.git
cd Ellie
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

### 4. Start the Development Server

```bash
npm start
```

This will open Expo DevTools in your browser. You can then:

- Press `i` to open in iOS simulator
- Press `a` to open in Android emulator
- Scan the QR code with Expo Go app on your physical device

## Available Scripts

### Development

```bash
npm start                # Start Expo development server
npm run android          # Run on Android emulator
npm run ios              # Run on iOS simulator
npm run web              # Run in web browser
```

### Code Quality

```bash
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors automatically
npm run format           # Format code with Prettier
npm run format:check     # Check if code is formatted
npm run type-check       # Run TypeScript type checking
npm run validate         # Run type-check and lint together
```

### Testing

```bash
npm test                 # Run unit tests with Jest
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
npm run test:e2e         # Run E2E tests with Detox
npm run test:e2e:build   # Build app for E2E testing
```

### Build

```bash
npm run build:ios        # Build for iOS
npm run build:android    # Build for Android
```

## Project Structure

```
Ellie/
├── .github/                 # GitHub configuration
│   ├── workflows/          # CI/CD workflows
│   └── PULL_REQUEST_TEMPLATE.md
├── .husky/                 # Git hooks
│   └── pre-commit
├── assets/                 # Images, fonts, and other static assets
├── e2e/                    # End-to-end tests
│   ├── app.test.ts
│   └── jest.config.js
├── src/                    # Source code
│   ├── components/         # Reusable UI components
│   ├── screens/            # Screen components
│   ├── navigation/         # Navigation configuration
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API and service integrations
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   ├── constants/          # Constants and configuration
│   ├── config/             # App configuration
│   └── __tests__/          # Unit tests
├── tests/                  # Additional test utilities
├── App.tsx                 # Root application component
├── app.json                # Expo configuration
├── babel.config.js         # Babel configuration
├── tsconfig.json           # TypeScript configuration
├── jest.config.js          # Jest configuration
├── .eslintrc.js            # ESLint configuration
├── .prettierrc             # Prettier configuration
├── .editorconfig           # Editor configuration
└── README.md               # This file
```

## Path Aliases

The project uses TypeScript path aliases for cleaner imports:

```typescript
import Button from '@/components/Button';
import HomeScreen from '@/screens/HomeScreen';
import useAuth from '@/hooks/useAuth';
import api from '@/services/api';
import { User } from '@/types/user';
import { API_URL } from '@/constants/config';
```

Available aliases:

- `@/*` → `src/*`
- `@/components/*` → `src/components/*`
- `@/screens/*` → `src/screens/*`
- `@/utils/*` → `src/utils/*`
- `@/hooks/*` → `src/hooks/*`
- `@/services/*` → `src/services/*`
- `@/types/*` → `src/types/*`
- `@/constants/*` → `src/constants/*`
- `@/config/*` → `src/config/*`
- `@/assets/*` → `assets/*`

## Code Quality Standards

### TypeScript

- Strict mode enabled with all strict compiler flags
- No implicit `any` types allowed
- No unused variables or parameters
- Explicit return types for exported functions (recommended)

### ESLint Rules

- No `console.log` (use `console.warn` or `console.error`)
- No explicit `any` types
- React Hooks dependencies must be exhaustive
- Consistent return statements
- Prefer `const` over `let`, no `var`
- Always use strict equality (`===`)

### Testing Requirements

- Minimum code coverage: 70%
- All new features must include tests
- E2E tests for critical user flows

## Pre-commit Hooks

The project uses Husky and lint-staged to enforce code quality before commits:

1. **lint-staged**: Automatically formats and lints staged files
2. **type-check**: Runs TypeScript type checking

If any check fails, the commit will be rejected.

## CI/CD Pipeline

### CI Pipeline (runs on every push/PR to main)

1. **Lint and Type Check**: ESLint and TypeScript validation
2. **Unit Tests**: Jest tests with coverage reporting
3. **Build Check**: Validates Expo configuration and package.json

### E2E Pipeline (runs on release branches)

1. **iOS E2E Tests**: Detox tests on iOS simulator
2. **Android E2E Tests**: Detox tests on Android emulator

## Contributing

We welcome contributions! Please follow these guidelines:

### 1. Fork and Clone

```bash
git clone https://github.com/your-username/Ellie.git
cd Ellie
git remote add upstream https://github.com/IlyasuSeidu/Ellie.git
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Make Your Changes

- Write clean, maintainable code
- Follow the existing code style
- Add tests for new features
- Update documentation as needed

### 4. Commit Your Changes

Use conventional commit messages:

```bash
git commit -m "feat: add user profile screen"
git commit -m "fix: resolve authentication bug"
git commit -m "docs: update README with new instructions"
```

Commit types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 5. Push and Create a Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub using the provided template.

## Troubleshooting

### Common Issues

**Metro bundler not starting**

```bash
npx expo start -c
```

**iOS build failing**

```bash
cd ios && pod install && cd ..
```

**Android build failing**

```bash
cd android && ./gradlew clean && cd ..
```

**Type errors after installing dependencies**

```bash
npm run type-check
```

**Pre-commit hook failing**

```bash
npm run validate
npm run format
```

## License

This project is private and proprietary.

## Contact

For questions or support, please contact:

- **GitHub**: [@IlyasuSeidu](https://github.com/IlyasuSeidu)
- **Repository**: [Ellie](https://github.com/IlyasuSeidu/Ellie)

---

Built with ❤️ using Expo and React Native
