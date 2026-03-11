# Auth QA Report (Real Signed Builds)

Date: 2026-03-11
Project: @ilyasu/ellie
Bundle ID: com.ellie.minershiftassistant
Android package: com.ellie.minershiftassistant

## 1) Signed Build Artifacts (Production)

- iOS (production): `f605446b-08f9-4801-b881-393fd0cde958` - `FINISHED`
  - IPA: https://expo.dev/artifacts/eas/wo2d53XwYxM8XASWNq2yio.ipa
- Android (production): `5b56fbfe-6d77-4898-9fac-dd25c96a042a` - `FINISHED`
  - AAB: https://expo.dev/artifacts/eas/chbDgUjuWSES6uvw1YMwg5.aab

## 2) Hard-Review Preflight Checks Executed

All checks below were actually run and passed.

### 2.1 Type and config health

- `npm run type-check -- --pretty false` -> PASS
- `npx expo-doctor --verbose` -> PASS (17/17 checks)

### 2.2 Auth screen/context/navigation/persistence tests

- `npm test -- --runInBand --silent src/contexts/__tests__/AuthContext.test.tsx src/navigation/__tests__/AppNavigator.test.tsx tests/config/firebase.persistence.test.ts src/screens/auth/__tests__/SignInScreen.test.tsx src/screens/auth/__tests__/SignUpScreen.test.tsx src/screens/auth/__tests__/ForgotPasswordScreen.test.tsx src/screens/auth/__tests__/EmailVerificationScreen.test.tsx`
- Result: PASS
  - Test Suites: 7/7 passed
  - Tests: 27/27 passed

### 2.3 Provider wiring and native config verification

- iOS URL scheme check (`ios/Ellie/Info.plist`) -> PASS
  - Found Google reversed scheme: `com.googleusercontent.apps.197162533368-5mhtc7pnngbq2n50rll6857n90n3t97r`
- Android google-services OAuth cert hashes -> PASS
  - Release SHA1 hash present: `3a349c8cf283b77b181d4ac1eed241e2199ac9b9`
  - Debug SHA1 hash present: `5e8f16062ea3cd2c4a0d547876baa6f38cabf625`
- EAS production env vars for auth/Firebase/OAuth -> PASS
  - `FIREBASE_*`, `EXPO_PUBLIC_GOOGLE_*`, `GOOGLE_*`, `EAS_PROJECT_ID`, `APP_ENV` set

### 2.4 i18n auth key coverage

- Script check across locales for `common.json -> auth.*` key parity vs `en` -> PASS
  - `ALL_AUTH_KEYS_PRESENT 11 locales 42 keys`

## 3) What Could Not Be Fully Executed From This Shell

The following cannot be conclusively validated without interactive UI use on physical devices/accounts:

- Real user sign-up/sign-in UI interactions
- Google sign-in consent/account chooser end-to-end UI
- Apple sign-in biometric/device account chooser end-to-end UI
- Password reset email delivery + link handling on device/mail app
- Email verification send/open/refresh behavior
- Session restore after app kill/relaunch on real device
- Onboarding route transition after real authenticated session

Reason: these flows require human interaction with native system dialogs, external account selectors, and mailbox actions on physical device runtime.

### 3.1 Direct device install attempt from CLI (executed)

- Device detected: `Thinky iPhone 13` (`available (paired)`)
- Attempted install of production IPA:
  - Command: `xcrun devicectl device install app --device 15231081-C4FE-54D9-9F2E-38FD57DB1A03 .tmp-auth-qa/ellie-prod.ipa`
  - Result: FAIL (as expected for this distribution type)
  - Error: `CoreDeviceError 3002` / `MIInstallerErrorDomain 13`
  - iOS reason: `This app cannot be installed because its integrity could not be verified ... Attempted to install a Beta profile without the proper entitlement.`
- Conclusion:
  - This production IPA must be installed via the proper Apple distribution channel (TestFlight/App Store), then tested on-device.

## 4) Real-Device Execution Matrix (Run This Exactly)

Use the production artifacts above, then execute the matrix below on:

- iOS physical device with the production signed build
- Android physical device with release-signed build from Play track/internal testing

Record PASS/FAIL and evidence (screenshot/video/log snippet).

### 4.1 Email/Password Sign-up

- Steps:
  1. Open app while signed out.
  2. Go to Sign Up.
  3. Enter valid new email + strong password + matching confirm password.
  4. Submit.
- Expected:
  - Account is created.
  - User reaches post-auth route (verification or onboarding as designed).
  - No red error screen.
- Result: [ ] PASS [ ] FAIL
- Evidence: **********\_\_**********

### 4.2 Email/Password Sign-in

- Steps:
  1. Sign out if needed.
  2. Sign in with existing valid credentials.
- Expected:
  - Sign-in succeeds.
  - Correct routing to onboarding/main based on completion state.
- Result: [ ] PASS [ ] FAIL
- Evidence: **********\_\_**********

### 4.3 Google Sign-In

- Steps:
  1. Tap Google sign-in button.
  2. Complete account chooser/consent.
- Expected:
  - Returns to app authenticated.
  - No client-id / plist / SHA mismatch error.
- Result: [ ] PASS [ ] FAIL
- Evidence: **********\_\_**********

### 4.4 Apple Sign-In (iOS)

- Steps:
  1. Tap Apple sign-in button.
  2. Complete Apple sheet auth.
- Expected:
  - Apple flow returns Firebase-authenticated user.
  - No "operation-not-allowed" / nonce / identity-token errors.
- Result: [ ] PASS [ ] FAIL
- Evidence: **********\_\_**********

### 4.5 Forgot Password

- Steps:
  1. Open Forgot Password.
  2. Submit valid registered email.
- Expected:
  - Reset email sent confirmation.
  - User receives reset mail.
- Result: [ ] PASS [ ] FAIL
- Evidence: **********\_\_**********

### 4.6 Email Verification

- Steps:
  1. From verification screen, trigger verification email.
  2. Open inbox and verify.
  3. Return to app and refresh status.
- Expected:
  - Verification state updates correctly.
- Result: [ ] PASS [ ] FAIL
- Evidence: **********\_\_**********

### 4.7 Session Restore

- Steps:
  1. Authenticate successfully.
  2. Kill app fully.
  3. Reopen app.
- Expected:
  - User session restored.
  - No forced sign-out unless token invalidated.
- Result: [ ] PASS [ ] FAIL
- Evidence: **********\_\_**********

### 4.8 Onboarding Routing

- Steps:
  1. Test with onboarding incomplete account.
  2. Test with onboarding complete account.
- Expected:
  - Incomplete -> onboarding route.
  - Complete -> main app route.
- Result: [ ] PASS [ ] FAIL
- Evidence: **********\_\_**********

## 5) Failure Triage Map

- Google sign-in fails with SHA/client mismatch:
  - Recheck Firebase Android SHA1/SHA256 and iOS client IDs.
- iOS Google sign-in complains about plist/client ID:
  - Verify `ios/Ellie/GoogleService-Info.plist` is included and correct.
- Apple sign-in fails with provider/capability errors:
  - Confirm Apple provider enabled in Firebase and Sign In with Apple capability on App ID/build.
- Session not restored:
  - Inspect RN persistence initialization path in `src/config/firebase.ts` and auth state listener in `src/contexts/AuthContext.tsx`.

## 6) Current Status Summary

- Production signed builds: READY (iOS + Android) -> PASS
- Automated auth QA: PASS
- Real-device interactive QA: PENDING USER EXECUTION (physical interaction required)
