# Ellie Auth Implementation Tasks (1 to 13)

Source of truth: `/Users/Shared/Ellie/ellie-auth.md`

Scope in this file:

- Includes every implementation-order task from **1 through 13** in `ellie-auth.md`.
- Excludes task 14 (`.env` update) because you requested up to second-to-last task.
- Includes implemented auth screens (tasks 6-9) and strict verification gating behavior.

Execution rule:

- Tasks are executed strictly in order.
- Do not start the next task until the current task passes a hard review.

---

## Task Checklist

- [x] **Task 1 — `src/config/firebase.ts`**
  - Replace Firebase Auth initialization from `getAuth(firebaseApp)` to `initializeAuth(firebaseApp, { persistence: getReactNativePersistence(AsyncStorage) })`.
  - Ensure singleton guard remains (`if (auth) return auth`).
  - Keep existing initialization flow for app/firestore/storage/functions intact.
  - Hard review gate:
    - Imports compile.
    - No second initialization path for auth.
    - Auth getter still returns initialized instance.

- [x] **Task 2 — `src/services/AuthService.ts`**
  - Remove `signInWithPopup` usage/import.
  - Implement native `signInWithGoogle()` using `GoogleSignin` + `GoogleAuthProvider.credential(idToken)` + `signInWithCredential`.
  - Implement native `signInWithApple()` using `expo-apple-authentication` + `OAuthProvider('apple.com')` + `signInWithCredential`.
  - Preserve existing error mapping/logging patterns.
  - Hard review gate:
    - No web popup API remains.
    - Token null checks exist.
    - Methods return `User` and reset inactivity timer.

- [x] **Task 3 — `src/services/UserService.ts`**
  - Add `createOrSyncUserProfile(userId, onboarding)` method.
  - Build `profileData` from onboarding fields and timestamps.
  - Build shift cycle when onboarding has required shift fields.
  - Update existing user when present; otherwise create new user.
  - Hard review gate:
    - Type compatibility with `UserProfile`.
    - No destructive overwrite of unrelated fields.
    - Logging and error propagation in place.

- [x] **Task 4 — `src/contexts/AuthContext.tsx` (new file)**
  - Create `AuthProvider` and `useAuth()` hook.
  - Expose state: `user`, `isLoading`, `error`.
  - Expose actions: `signIn`, `signUp`, `signInWithGoogle`, `signInWithApple`, `signOut`, `sendPasswordReset`, `sendEmailVerification`, `clearError`.
  - Subscribe to auth state via `AuthService.onAuthStateChanged`.
  - Configure `GoogleSignin` with `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
  - Hard review gate:
    - Context throws if used outside provider.
    - Cleanup unsubscribes and service cleanup run.
    - No stale callback dependencies.

- [x] **Task 5 — `src/navigation/AuthNavigator.tsx` (new file)**
  - Create Auth stack and `AuthStackParamList`.
  - Hard review gate:
    - Exported types usable by `AppNavigator`.
    - Navigator compiles and does not reference missing files.

- [x] **Task 6 — `src/screens/auth/SignInScreen.tsx`**
  - Implemented from `ellie-auth.md`.
  - Localized with `useTranslation('common')` and new `common.auth.*` keys.

- [x] **Task 7 — `src/screens/auth/SignUpScreen.tsx`**
  - Implemented from `ellie-auth.md`.
  - Localized with `useTranslation('common')` and new `common.auth.*` keys.

- [x] **Task 8 — `src/screens/auth/ForgotPasswordScreen.tsx`**
  - Implemented from `ellie-auth.md`.
  - Localized with `useTranslation('common')` and new `common.auth.*` keys.

- [x] **Task 9 — `src/screens/auth/EmailVerificationScreen.tsx`**
  - Implemented from `ellie-auth.md`.
  - Localized with `useTranslation('common')` and new `common.auth.*` keys.

- [x] **Task 10 — `src/navigation/AppNavigator.tsx`**
  - Rewrite root navigation to gate by auth + onboarding:
    - unauthenticated -> `Auth`
    - authenticated + unverified email/password account -> `Auth > EmailVerification`
    - authenticated + onboarding incomplete -> `Onboarding`
    - authenticated + onboarding complete -> `Main`
  - Preserve loading states for auth restore and onboarding-read.
  - Keep backward compatibility onboarding completeness fallback via `onboarding:data`.
  - Hard review gate:
    - `RootStackParamList` updated safely.
    - Existing screens that import root params still type-check.
    - No incorrect initial route behavior on state changes.

- [x] **Task 11 — `App.tsx`**
  - Wrap provider tree with `AuthProvider` above `OnboardingProvider`.
  - Keep existing providers and app composition otherwise intact.
  - Hard review gate:
    - No provider order regressions for language/voice contexts.
    - `AppNavigator` can consume `useAuth()`.

- [x] **Task 12 — `src/screens/onboarding/premium/PremiumCompletionScreen.tsx`**
  - Add Firestore sync after local onboarding save:
    - `useAuth()` for `user`.
    - `UserService.createOrSyncUserProfile(user.uid, data)`.
    - `UserService.updateUser(user.uid, { email: user.email ?? '' })`.
  - Do not block completion navigation if Firestore sync fails.
  - Keep existing success/error haptics behavior intact.
  - Hard review gate:
    - Sync only runs when `user` exists.
    - Local completion remains source of truth for navigation.
    - Errors are logged and non-fatal.

- [x] **Task 13 — Firestore rules deployment assets**
  - Create `firestore.rules` with owner-scoped rules for `users`, `notifications`, `sleepLogs` plus default deny.
  - Ensure `firebase.json` includes Firestore rules mapping so deployment tooling can use the file.
  - Hard review gate:
    - Rules syntax valid.
    - No accidental open access.

---

## Explicitly Excluded in This Pass

- Task 14 (`.env`): user-owned secret configuration and outside this first-to-second-last scope.

## Responsibility Notes

- You must provide/confirm real OAuth values and platform setup in Firebase Console/Xcode/Android project for end-to-end sign-in runtime.
- I can wire code and config files in-repo; I cannot fetch private Firebase console values directly.
