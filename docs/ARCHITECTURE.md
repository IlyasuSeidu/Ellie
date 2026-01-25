# Architecture Documentation

## Overview

Ellie is built using a modern React Native architecture with Expo, following best practices for scalability, maintainability, and testability. The application uses a layered architecture with clear separation of concerns.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Screens    │  │  Components  │  │  Navigation  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Hooks     │  │    Utils     │  │    Types     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Services Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Firebase   │  │     API      │  │   Storage    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      External Services                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Firebase   │  │  Third-party │  │    Device    │      │
│  │   Backend    │  │     APIs     │  │   Storage    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Layer Descriptions

### 1. Presentation Layer

**Responsibilities:**

- Rendering UI components
- Handling user interactions
- Displaying data from business logic layer
- Navigation between screens

**Components:**

- **Screens**: Full-page views that represent different app sections
  - Location: `src/screens/`
  - Examples: `HomeScreen.tsx`, `ProfileScreen.tsx`, `LoginScreen.tsx`

- **Components**: Reusable UI building blocks
  - Location: `src/components/`
  - Examples: `Button.tsx`, `Card.tsx`, `Header.tsx`

- **Navigation**: Navigation configuration using React Navigation
  - Location: `src/navigation/`
  - Examples: `RootNavigator.tsx`, `AuthNavigator.tsx`

**Rules:**

- Screens and components should be presentational (dumb components)
- Business logic should be delegated to hooks and services
- Direct Firebase/API calls are not allowed in this layer
- Use TypeScript interfaces for all props

### 2. Business Logic Layer

**Responsibilities:**

- Managing application state
- Implementing business rules
- Data transformation and validation
- Coordinating between UI and services

**Components:**

- **Hooks**: Custom React hooks for state and logic
  - Location: `src/hooks/`
  - Examples: `useAuth.ts`, `useUser.ts`, `useForm.ts`

- **Utils**: Pure utility functions
  - Location: `src/utils/`
  - Examples: `validation.ts`, `formatters.ts`, `helpers.ts`

- **Types**: TypeScript type definitions
  - Location: `src/types/`
  - Examples: `user.ts`, `auth.ts`, `common.ts`

**Rules:**

- Hooks should encapsulate state management logic
- Utils must be pure functions (no side effects)
- All business logic must be testable
- Type definitions should be comprehensive

### 3. Services Layer

**Responsibilities:**

- Managing external service integrations
- Handling API requests
- Data persistence
- Error handling for external calls

**Components:**

- **Firebase Service**: Firebase SDK integration
  - Location: `src/services/firebase.ts`
  - Handles: Authentication, Firestore, Storage

- **API Service**: HTTP client for external APIs
  - Location: `src/services/api.ts`
  - Handles: REST API calls, request/response interceptors

- **Storage Service**: Local data persistence
  - Location: `src/services/storage.ts`
  - Handles: AsyncStorage, SecureStore

**Rules:**

- Services should return Promises
- Implement proper error handling
- Use TypeScript for request/response types
- Services should be singleton instances

### 4. External Services

**Components:**

- Firebase Backend (Authentication, Firestore, Cloud Storage)
- Third-party APIs (future integrations)
- Device APIs (Camera, Location, Notifications)

## Data Flow

### Read Flow (Data Fetching)

```
User Action → Screen → Hook → Service → Firebase → Service → Hook → Screen → UI Update
```

**Example: Fetching User Profile**

1. User navigates to Profile Screen
2. Screen calls `useUser()` hook
3. Hook calls `fetchUserProfile()` from Firebase service
4. Service makes request to Firebase Firestore
5. Firebase returns user data
6. Service transforms data to match TypeScript interface
7. Hook updates state with data
8. Screen re-renders with new data

### Write Flow (Data Mutation)

```
User Action → Screen → Hook → Service → Firebase → Service → Hook → Screen → UI Feedback
```

**Example: Updating User Profile**

1. User submits profile form
2. Screen calls `updateProfile()` from `useUser()` hook
3. Hook validates data using utility functions
4. Hook calls `updateUserProfile()` from Firebase service
5. Service makes update request to Firebase Firestore
6. Firebase returns success/error
7. Service handles response
8. Hook updates local state
9. Screen shows success message or error

## State Management Strategy

### Approach: React Context + Custom Hooks

We use React's built-in Context API combined with custom hooks for state management, avoiding heavy libraries like Redux.

**Rationale:**

- Lightweight and built-in to React
- Sufficient for most mobile app use cases
- Better TypeScript support
- Easier to test and debug
- Lower learning curve for new developers

### Context Structure

```typescript
// Auth Context
const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// User Context
const UserContext = React.createContext<UserContextType | undefined>(undefined);

// Theme Context
const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined);
```

### State Organization

- **Global State**: Shared across the entire app
  - Authentication state (`AuthContext`)
  - User profile data (`UserContext`)
  - Theme settings (`ThemeContext`)

- **Local State**: Component-specific state
  - Form inputs (`useState`)
  - UI toggles (`useState`)
  - Component-level caching

### State Update Pattern

```typescript
// 1. Define context type
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// 2. Create custom hook
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// 3. Use in components
function LoginScreen() {
  const { signIn, loading } = useAuth();
  // Component logic
}
```

## Navigation Structure

### Navigator Hierarchy

```
RootNavigator (Stack)
├── AuthNavigator (Stack) - When not authenticated
│   ├── LoginScreen
│   ├── SignUpScreen
│   └── ForgotPasswordScreen
│
└── AppNavigator (Stack) - When authenticated
    ├── MainTabNavigator (Bottom Tabs)
    │   ├── HomeTab (Stack)
    │   │   ├── HomeScreen
    │   │   └── DetailsScreen
    │   ├── ProfileTab (Stack)
    │   │   ├── ProfileScreen
    │   │   └── EditProfileScreen
    │   └── SettingsTab (Stack)
    │       ├── SettingsScreen
    │       └── PreferencesScreen
    │
    └── ModalStack (Stack)
        ├── NotificationModal
        └── ConfirmationModal
```

### Navigation Types

1. **Stack Navigator**: For hierarchical navigation (back button)
2. **Tab Navigator**: For parallel sections (bottom tabs)
3. **Drawer Navigator**: For side menu (future consideration)

### Deep Linking

Support for deep links using Expo's linking configuration:

```typescript
const linking = {
  prefixes: ['ellie://', 'https://ellie.app'],
  config: {
    screens: {
      Home: 'home',
      Profile: 'profile/:userId',
      Settings: 'settings',
    },
  },
};
```

## Code Organization

### Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components (Button, Input, Card)
│   ├── forms/          # Form-specific components
│   └── layout/         # Layout components (Header, Footer)
├── screens/            # Full-page screen components
│   ├── auth/           # Authentication screens
│   ├── home/           # Home feature screens
│   └── profile/        # Profile feature screens
├── navigation/         # Navigation configuration
├── hooks/              # Custom React hooks
├── services/           # External service integrations
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── constants/          # App constants and configuration
├── config/             # App configuration files
└── __tests__/          # Unit tests
```

### File Naming Conventions

- **Components**: PascalCase (e.g., `Button.tsx`, `UserCard.tsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useAuth.ts`, `useForm.ts`)
- **Utils**: camelCase (e.g., `validation.ts`, `formatters.ts`)
- **Types**: PascalCase (e.g., `User.ts`, `Auth.ts`)
- **Tests**: Match source file with `.test.tsx` suffix

### Import Order

1. React and React Native imports
2. Third-party library imports
3. Local component imports
4. Hook imports
5. Utility imports
6. Type imports
7. Style imports

```typescript
// 1. React imports
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// 2. Third-party imports
import { Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

// 3. Component imports
import Header from '@/components/common/Header';
import UserCard from '@/components/UserCard';

// 4. Hook imports
import { useAuth } from '@/hooks/useAuth';

// 5. Utility imports
import { formatDate } from '@/utils/formatters';

// 6. Type imports
import { User } from '@/types/user';
```

## Design Patterns

### 1. Container/Presenter Pattern

Separate data fetching (container) from presentation (presenter).

```typescript
// Container (HomeScreen.tsx)
export function HomeScreen() {
  const { data, loading } = useHomeData();
  return <HomeView data={data} loading={loading} />;
}

// Presenter (HomeView.tsx)
export function HomeView({ data, loading }: HomeViewProps) {
  // Pure presentational logic
}
```

### 2. Custom Hook Pattern

Encapsulate reusable logic in custom hooks.

```typescript
function useForm<T>(initialValues: T) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  // Form logic

  return { values, errors, handleChange, handleSubmit };
}
```

### 3. Service Pattern

Centralize API and external service calls.

```typescript
class FirebaseService {
  async getUser(userId: string): Promise<User> {
    // Firebase logic
  }

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    // Firebase logic
  }
}

export default new FirebaseService();
```

## Performance Considerations

### 1. Memoization

Use `React.memo`, `useMemo`, and `useCallback` to prevent unnecessary re-renders.

```typescript
const MemoizedComponent = React.memo(Component);

const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);

const memoizedCallback = useCallback(() => doSomething(a, b), [a, b]);
```

### 2. Lazy Loading

Use dynamic imports for code splitting.

```typescript
const ProfileScreen = React.lazy(() => import('@/screens/ProfileScreen'));
```

### 3. List Optimization

Use `FlatList` with proper optimization props.

```typescript
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  removeClippedSubviews
  maxToRenderPerBatch={10}
  windowSize={10}
/>
```

## Security Considerations

### 1. Authentication

- Use Firebase Authentication for user management
- Store tokens securely using Expo SecureStore
- Implement automatic token refresh
- Handle session expiration gracefully

### 2. Data Validation

- Validate all user inputs on the client and server
- Use TypeScript for compile-time type checking
- Implement runtime validation with libraries like Zod or Yup

### 3. Sensitive Data

- Never store sensitive data in AsyncStorage
- Use SecureStore for tokens and credentials
- Implement proper error handling to avoid leaking sensitive information

## Future Enhancements

### Planned Improvements

1. **Offline Support**: Implement offline-first architecture with local caching
2. **Push Notifications**: Add Firebase Cloud Messaging for notifications
3. **Analytics**: Integrate Firebase Analytics for user behavior tracking
4. **Performance Monitoring**: Add Firebase Performance Monitoring
5. **Crash Reporting**: Integrate Sentry or Firebase Crashlytics
6. **Feature Flags**: Implement feature toggles for A/B testing

### Scalability Considerations

- Modular architecture allows easy addition of new features
- Service layer can be extended with new integrations
- Navigation structure supports deep nesting
- State management can be enhanced with more contexts as needed

## References

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
