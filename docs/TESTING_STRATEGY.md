# Testing Strategy

## Overview

This document outlines the current testing strategy for the Ryvro application. It combines the normal testing pyramid with launch-specific gates for the Ryvro rebrand, the `com.ryvro.shiftplanner` native identity, the Universal Shift Builder, authentication, subscriptions, reminders, exceptions, calendar import/export, and the owner handoff work that cannot be completed inside the repository.

Current release evidence on June 9, 2026:

- `npm run release:check` passes TypeScript, 112 Jest suites / 1,795 tests / 4 snapshots, the Ryvro native scaffold preflight, the store readiness preflight, the owner handoff preflight, and backend build.
- The PR CI pipeline must pass Lint and Type Check, Unit Tests, Build Check, and the dedicated Release Check job before launch-readiness evidence is treated as current.
- Simulator E2E coverage includes fresh onboarding into the Universal Shift Builder, dashboard color/icon checks, profile navigation into builder settings, and mobile-fit coverage.
- Release is still not complete until the account-only store setup, production environment push, TestFlight/internal-track install proof, subscription sandbox QA, screenshots, and physical iOS/Android device smoke tests are recorded in the launch evidence log.

## Testing Pyramid

```
                    ▲
                   ╱ ╲
                  ╱   ╲
                 ╱ E2E ╲           (Slow, Expensive, Fewer)
                ╱───────╲
               ╱         ╲
              ╱Integration╲        (Moderate Speed & Cost)
             ╱─────────────╲
            ╱               ╲
           ╱  Unit Tests     ╲     (Fast, Cheap, Many)
          ╱___________________╲
```

## Testing Layers

## Universal Shift Builder + Voice Reliability Coverage

The Universal Shift Builder rollout adds explicit coverage for:

- universal schedule calculation and migration tests
- builder onboarding/settings navigation path tests
- dashboard rendering tests for colors, icons, exceptions, reminders, and imported/exported calendars
- Voice tool tests for:
  - `get_next_work_block`
  - `get_next_rest_block`
  - `days_until_work`
  - `days_until_rest`
  - `current_block_info`
- Backend parity tests for tool execution in `backend/functions/src/__tests__/shift-tools.test.ts`
- Performance sanity test:
  - `tests/utils/shiftUtils.performance.test.ts` (included in full suite)

### 1. Unit Tests

**Purpose**: Test individual functions, components, and hooks in isolation.

**Tools**:

- Jest (test runner and assertion library)
- React Testing Library (component testing)
- @testing-library/react-hooks (hook testing)

**What to Test**:

- Utility functions
- Custom hooks
- Individual components
- Service functions
- Data transformations

**Example**:

```typescript
// src/utils/__tests__/validation.test.ts
import { validateEmail, validatePassword } from '../validation';

describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('should return false for invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

### 2. Integration Tests (20% of tests)

**Purpose**: Test how different parts of the application work together.

**Tools**:

- Jest
- React Testing Library
- Mock Service Worker (MSW) for API mocking

**What to Test**:

- Screen components with hooks
- Navigation flows
- Form submissions
- API integrations
- State management with services

**Example**:

```typescript
// src/screens/auth/__tests__/SignInScreen.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SignInScreen } from '../SignInScreen';
import { AuthProvider } from '@/contexts/AuthContext';

describe('SignInScreen', () => {
  it('shows launch authentication options and submits email/password input', async () => {
    const { getByPlaceholderText, getByText } = render(
      <AuthProvider>
        <SignInScreen />
      </AuthProvider>
    );

    expect(getByText('Continue with Google')).toBeTruthy();
    expect(getByText('Continue with Apple')).toBeTruthy();

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Sign in'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });
});
```

### 3. End-to-End Tests

**Purpose**: Test complete user workflows in a real environment.

**Tools**:

- Detox (React Native E2E testing framework)
- Jest (test runner for Detox)

**What to Test**:

- Critical user journeys
- Authentication flows
- Core feature workflows
- Cross-screen interactions

**Example**:

```typescript
// e2e/dashboard.test.ts
import { device, element, by, expect as detoxExpect } from 'detox';

describe('Dashboard launch smoke', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('renders the shipped dashboard and Universal Shift status icon', async () => {
    await element(by.id('tab-home')).tap();
    await detoxExpect(element(by.id('dashboard-scroll-view'))).toBeVisible();
    await detoxExpect(element(by.id('dashboard-shift-status'))).toBeVisible();
    await detoxExpect(element(by.id('shift-status-universal-icon'))).toBeVisible();
  });
});
```

## Test File Naming Conventions

### Unit Tests

**Location**: Colocated with source files in `__tests__/` directory

```
src/
├── components/
│   └── Button/
│       ├── Button.tsx
│       └── __tests__/
│           └── Button.test.tsx
├── hooks/
│   └── __tests__/
│       └── useAuth.test.ts
└── utils/
    └── __tests__/
        └── validation.test.ts
```

**Naming Pattern**: `{FileName}.test.{ts|tsx}`

### Integration Tests

**Location**: In screen `__tests__/` directories or `tests/integration/`

```
src/
└── screens/
    └── auth/
        ├── SignInScreen.tsx
        └── __tests__/
            └── SignInScreen.test.tsx
```

**Naming Pattern**: `{ScreenName}.test.tsx`

### E2E Tests

**Location**: `e2e/` directory at project root

```
e2e/
├── auth-flow.test.ts
├── profile-management.test.ts
└── navigation.test.ts
```

**Naming Pattern**: `{feature-name}.test.ts`

## Coverage Goals

### Minimum Coverage Thresholds

```javascript
{
  "global": {
    "branches": 70,
    "functions": 70,
    "lines": 70,
    "statements": 70
  }
}
```

### Coverage by File Type

| File Type  | Target Coverage | Priority |
| ---------- | --------------- | -------- |
| Utils      | 90%             | High     |
| Hooks      | 85%             | High     |
| Services   | 80%             | High     |
| Components | 70%             | Medium   |
| Screens    | 60%             | Medium   |

### Coverage Exclusions

Files excluded from coverage requirements:

- Type definition files (`*.d.ts`)
- Test files (`*.test.ts`, `*.test.tsx`)
- Configuration files
- Index files that only re-export
- Mock files

## Testing Best Practices

### 1. Test Behavior, Not Implementation

**Bad**:

```typescript
it('should set loading state to true', () => {
  const { result } = renderHook(() => useAuth());
  expect(result.current.loading).toBe(true);
});
```

**Good**:

```typescript
it('should show loading spinner while authenticating', () => {
  const { getByTestId } = render(<SignInScreen />);
  expect(getByTestId('loading-spinner')).toBeVisible();
});
```

### 2. Arrange-Act-Assert Pattern

```typescript
it('should validate email format', () => {
  // Arrange
  const validEmail = 'test@example.com';
  const invalidEmail = 'invalid-email';

  // Act
  const validResult = validateEmail(validEmail);
  const invalidResult = validateEmail(invalidEmail);

  // Assert
  expect(validResult).toBe(true);
  expect(invalidResult).toBe(false);
});
```

### 3. Use Descriptive Test Names

**Bad**:

```typescript
it('works', () => {
  /* ... */
});
it('test login', () => {
  /* ... */
});
```

**Good**:

```typescript
it('should display error message when email is invalid', () => {
  /* ... */
});
it('should navigate to home screen after successful login', () => {
  /* ... */
});
```

### 4. Test Edge Cases

Always test:

- Empty inputs
- Null/undefined values
- Maximum/minimum values
- Invalid data types
- Error states
- Loading states

### 5. Keep Tests Independent

Each test should:

- Set up its own data
- Clean up after itself
- Not depend on other tests
- Be runnable in any order

```typescript
describe('UserService', () => {
  beforeEach(() => {
    // Set up fresh state for each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    jest.resetAllMocks();
  });
});
```

## Mocking Strategy

### 1. Mock External Dependencies

```typescript
// Mock Firebase
jest.mock('@/services/firebase', () => ({
  auth: {
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  firestore: {
    collection: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
```

### 2. Mock Navigation

```typescript
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));
```

### 3. Mock Modules Selectively

```typescript
jest.mock('@/services/api', () => ({
  ...jest.requireActual('@/services/api'),
  fetchUser: jest.fn(), // Mock only specific function
}));
```

## Continuous Integration

### CI Test Pipeline

```yaml
# .github/workflows/ci.yml
jobs:
  unit-tests:
    - Run Jest tests
    - Generate coverage report
    - Upload coverage to Codecov
  release-check:
    - Run npm run release:check
    - Verify Ryvro native scaffold and bundle/package identity
    - Verify store readiness handoff files
    - Verify owner handoff blockers remain visible
```

### Pre-commit Hooks

```bash
# .husky/pre-commit
npm run type-check
npm run lint
npm test -- --bail --findRelatedTests
```

## Test Data Management

### Test Fixtures

Create reusable test data:

```typescript
// tests/fixtures/user.ts
export const mockUser = {
  id: '123',
  email: 'test@example.com',
  name: 'Test User',
  createdAt: new Date('2024-01-01'),
};

export const mockUsers = [mockUser /* ... */];
```

### Factory Functions

Use factories for dynamic test data:

```typescript
// tests/factories/user.factory.ts
export function createMockUser(overrides = {}) {
  return {
    id: faker.datatype.uuid(),
    email: faker.internet.email(),
    name: faker.name.findName(),
    ...overrides,
  };
}
```

## Performance Testing

### Test Performance Metrics

```typescript
it('should render large list efficiently', async () => {
  const startTime = performance.now();

  const { getByTestId } = render(
    <FlatList data={largeDataSet} renderItem={renderItem} />
  );

  const endTime = performance.now();
  const renderTime = endTime - startTime;

  expect(renderTime).toBeLessThan(1000); // Should render in < 1s
});
```

## Snapshot Testing

### When to Use Snapshots

Use snapshot tests for:

- UI component rendering
- Data transformations
- Configuration objects

**Example**:

```typescript
it('should match snapshot', () => {
  const tree = renderer.create(<Button title="Click me" />).toJSON();
  expect(tree).toMatchSnapshot();
});
```

### Snapshot Guidelines

- Keep snapshots small and focused
- Review snapshot changes carefully
- Update snapshots intentionally, not blindly
- Avoid snapshots for dynamic content

## Accessibility Testing

### Test for Accessibility

```typescript
import { render } from '@testing-library/react-native';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = render(<SignInScreen />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Accessibility Checklist

- [ ] All interactive elements have accessible labels
- [ ] Color contrast meets WCAG standards
- [ ] Screen reader navigation works correctly
- [ ] Touch targets are at least 44x44 points

## Visual Regression Testing

### Future Enhancement

Consider adding visual regression testing with:

- Percy
- Chromatic
- Applitools

## Test Documentation

### Document Complex Tests

```typescript
/**
 * Tests the authentication flow when user credentials are invalid.
 *
 * Scenario:
 * 1. User enters invalid email
 * 2. User enters valid password
 * 3. User submits form
 *
 * Expected:
 * - Error message should be displayed
 * - Navigation should not occur
 * - Loading state should return to false
 */
it('should display error for invalid credentials', async () => {
  // Test implementation
});
```

## Running Tests

### Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run specific test file
npm test -- Button.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="login"
```

### Debug Tests

```bash
# Run tests in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Run single test file in debug mode
npm test -- --debug Button.test.tsx
```

## Common Testing Patterns

### Testing Async Operations

```typescript
it('should fetch user data', async () => {
  const { result, waitForNextUpdate } = renderHook(() => useUser('123'));

  expect(result.current.loading).toBe(true);

  await waitForNextUpdate();

  expect(result.current.loading).toBe(false);
  expect(result.current.data).toEqual(mockUser);
});
```

### Testing Error States

```typescript
it('should handle API errors', async () => {
  const mockError = new Error('Network error');
  jest.spyOn(api, 'fetchUser').mockRejectedValue(mockError);

  const { getByText } = render(<UserProfile userId="123" />);

  await waitFor(() => {
    expect(getByText('Failed to load user')).toBeVisible();
  });
});
```

### Testing Forms

```typescript
it('should submit form with valid data', async () => {
  const onSubmit = jest.fn();
  const { getByPlaceholderText, getByText } = render(
    <LoginForm onSubmit={onSubmit} />
  );

  fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
  fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
  fireEvent.press(getByText('Submit'));

  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });
});
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Detox Documentation](https://wix.github.io/Detox/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [React Native Testing Guide](https://reactnative.dev/docs/testing-overview)

## Appendix: Test Coverage Report

Generate and view coverage reports:

```bash
# Generate coverage report
npm run test:coverage

# Open HTML coverage report
open coverage/lcov-report/index.html
```

Coverage reports include:

- Overall coverage percentages
- File-by-file coverage breakdown
- Uncovered lines highlighted
- Branch coverage details
