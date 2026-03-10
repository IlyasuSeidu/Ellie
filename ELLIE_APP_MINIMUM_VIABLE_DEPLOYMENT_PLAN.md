# Ellie App — Minimum Viable Deployment Plan

Source of truth status: **This file is canonical**.  
Last consolidated update: **March 10, 2026** (merged with additional deployment audit).

## Locked Release Identity (Current)

- App Store/Play display name: **Ellie: Miner Shift Assistant**
- Bundle/package ID (iOS + Android): **`com.ellie.minershiftassistant`**
- Version: **`1.0.0`**
- iOS build number: **`1`**
- Android version code: **`1`**

## Execution Status Snapshot (March 10, 2026)

Completed:

- Quality gates pass: `lint`, `type-check`, `test`, `backend:build`, `release:check`
- Android release bundle built locally: `android/app/build/outputs/bundle/release/app-release.aab`
- Bundle ID propagated through Expo + native Android + native iOS files
- `eas.json` created

Still blocking store deployment:

- Apple signing/provisioning not configured for `com.ellie.minershiftassistant`
- EAS account steps not completed (`eas login`, `eas init`, secrets push)
- Production `.env` values not set (`APP_ENV`, `EAS_PROJECT_ID`, `GOOGLE_WEB_CLIENT_ID`)
- Manual store console setup + submission tasks

## Context

The Ellie app (shift schedule assistant for mining workers) has excellent code quality — 1,701 passing tests, 0 TypeScript errors, 0 ESLint errors, complete onboarding + dashboard + voice assistant. The only things blocking App Store / Play Store submission are configuration issues and two tasks:

1. Hide the Schedule and Stats tabs (removed from nav for v1 — files kept intact for v2)
2. Fix deployment configuration (bundle ID, signing, EAS)

---

## App Name Warning — "Ellie" Already Exists

There is already a well-established app called **"Ellie - Daily Planner"** by AloaLabs LLC on the App Store (ID 1602196200, website ellieplanner.com). Both Apple and Google **allow** duplicate app names — they use bundle ID as the unique identifier, not the name. However:

- If AloaLabs holds a registered trademark on "Ellie" in the productivity category, they could file a dispute and get your listing removed after launch
- To be safe, use a subtitle to differentiate: **"Hey Ellie - Shift Assistant"** or **"Ellie: Shift Scheduler for Miners"**
- The voice assistant angle ("Hey Ellie") is a strong differentiator since that daily planner app has no voice features

**Recommendation:** Use **`Ellie: Miner Shift Assistant`** consistently in both stores (name/subtitle split as required by each store UI).

---

## What You're Shipping (Scope)

**Complete + shippable:**

- 12-step premium onboarding (Rotating + FIFO roster types, swipeable card UI)
- Main dashboard: shift calendar, upcoming shifts, statistics
- Profile screen: edit name, shift times, pattern
- Voice assistant: "Hey Ellie" wake word, speech recognition, TTS, AI answers
- Offline-first, push notifications, haptics, i18n (9 languages)

**Hidden for v1:**

- Schedule tab — removed from tab navigation only. `src/screens/main/ScheduleScreen.tsx` is NOT deleted. Re-add in v2 by adding it back to `MainTabNavigator.tsx` and reverting the `CustomTabBar.tsx` changes below.
- Stats tab — same treatment. `src/screens/main/StatsScreen.tsx` is NOT deleted. Icons (`calendar`, `bar-chart`) remain defined in `TAB_ICONS` and will automatically work when the tabs are re-added.

---

## PART 1 — Code Changes: Remove Schedule and Stats Tabs

Two files need editing. The `CustomTabBar` has hardcoded index math assuming 5 tabs — it must be updated for 3 tabs (Home | Ellie | Profile).

### File 1: `src/navigation/MainTabNavigator.tsx`

Replace the entire file content with:

```tsx
/**
 * MainTabNavigator
 *
 * Bottom tab navigator for the main app with 3 tabs:
 *   Home | Ellie (center) | Profile
 *
 * Schedule and Stats are intentionally omitted for v1.0.
 * Uses a custom floating glassmorphic tab bar (CustomTabBar).
 * The center "Ellie" tab opens the VoiceAssistantModal.
 */

import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainDashboardScreen } from '@/screens/main/MainDashboardScreen';
import { ProfileScreen } from '@/screens/main/ProfileScreen';
import { VoiceAssistantModal } from '@/components/voice';
import { CustomTabBar } from '@/components/navigation/CustomTabBar';

export type MainTabParamList = {
  Home: undefined;
  Ellie: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Empty component — the Ellie tab never renders; its button opens the modal */
const ElliePlaceholder = () => <View />;

export const MainTabNavigator: React.FC = () => {
  return (
    <>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Home" component={MainDashboardScreen} />
        <Tab.Screen name="Ellie" component={ElliePlaceholder} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>

      {/* Global voice assistant modal — accessible from any tab via center button */}
      <VoiceAssistantModal />
    </>
  );
};
```

---

### File 2: `src/components/navigation/CustomTabBar.tsx`

**The `TAB_ICONS` object (lines 50-59) is NOT changed.** It still contains `Schedule: { calendar }` and `Stats: { bar-chart }`. Those entries are just unreachable until the tabs are re-added in v2.

Make these 5 targeted changes:

**Change 1 — Line 47:** `FLEX_TOTAL_WIDTH / 4` → `FLEX_TOTAL_WIDTH / 2`

```ts
// Before
const FLEX_TAB_WIDTH = FLEX_TOTAL_WIDTH / 4;
// After
const FLEX_TAB_WIDTH = FLEX_TOTAL_WIDTH / 2;
```

**Change 2 — Lines 67-77:** Replace the entire `getTabCenterX` function

```ts
// Before
function getTabCenterX(index: number): number {
  if (index < 2) {
    // Tabs before center: index 0, 1
    return FLEX_TAB_WIDTH * index + FLEX_TAB_WIDTH / 2;
  }
  // Tabs after center: index 3, 4 → visual slot 2, 3
  const slot = index - 2; // 3→1, 4→2
  return (
    FLEX_TAB_WIDTH * 2 + CENTER_PLACEHOLDER_WIDTH + FLEX_TAB_WIDTH * (slot - 1) + FLEX_TAB_WIDTH / 2
  );
}

// After
function getTabCenterX(index: number): number {
  if (index < 1) {
    // Tabs before center: index 0 (Home)
    return FLEX_TAB_WIDTH * index + FLEX_TAB_WIDTH / 2;
  }
  // Tabs after center: index 2 (Profile) → visual slot 0
  const slot = index - 2;
  return FLEX_TAB_WIDTH + CENTER_PLACEHOLDER_WIDTH + FLEX_TAB_WIDTH * slot + FLEX_TAB_WIDTH / 2;
}
```

**Change 3 — Line 162:** `state.index === 2` → `state.index === 1`

```ts
// Before
const indicatorOpacity = useSharedValue(state.index === 2 ? 0 : 1);
// After
const indicatorOpacity = useSharedValue(state.index === 1 ? 0 : 1);
```

**Change 4 — Line 166:** `state.index === 2` → `state.index === 1`

```ts
// Before
const isCenter = state.index === 2;
// After
const isCenter = state.index === 1;
```

**Change 5 — Line 289:** `state.routes[2], 2` → `state.routes[1], 1`

```tsx
// Before
onPress={() => handleTabPress(state.routes[2], 2)}
// After
onPress={() => handleTabPress(state.routes[1], 1)}
```

**To re-add Schedule + Stats in v2:** Revert all 5 changes above to their original values and add the screens back to `MainTabNavigator.tsx`. Icons will work automatically.

---

## PART 2 — Deployment Configuration

### Prerequisites

- **Apple Developer Account ($99/year):** Enroll at https://developer.apple.com/programs/enroll/ — approval takes 24-48 hours. Your Xcode project already has team ID `BZ798WZJCB` — confirm this is your enrolled account.
- **Bundle Identifier:** Decide now and replace `YOUR_BUNDLE_ID` everywhere below. Options: `com.shiftsync.ellie`, `com.ellie.app`, `io.ellie.app`. **Cannot be changed on Google Play after first submission.**
- **Google Play Developer Account ($25 one-time):** https://play.google.com/console

---

### STEP 1 — Set Up EAS

```bash
cd /Users/Shared/Ellie

# Install EAS CLI
npm install -g eas-cli

# Log in (use your Expo account credentials)
eas login

# Initialize EAS — prints your EAS Project ID UUID
eas init
# Output: "Project successfully linked to: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
# Copy that UUID for Step 2
```

---

### STEP 2 — Update `.env`

Open `.env` and make these 3 changes:

**Line 6:**

```
APP_ENV=production
```

**Line 20** — get from: Firebase Console → project `ellie-20260220135308` → Authentication → Sign-in method → Google → pencil icon → "Web SDK configuration" → copy "Web client ID":

```
GOOGLE_WEB_CLIENT_ID=PASTE_WEB_CLIENT_ID_HERE.apps.googleusercontent.com
```

**Line 32** — use the UUID from `eas init`:

```
EAS_PROJECT_ID=PASTE_EAS_UUID_HERE
```

---

### STEP 3 — Update Bundle Identifier in 3 Files

Replace every occurrence of `com.anonymous.ellie` with `YOUR_BUNDLE_ID`.

**`app.json`** — update iOS and Android blocks to:

```json
"ios": {
  "supportsTablet": true,
  "deploymentTarget": "16.0",
  "buildNumber": "1",
  "bundleIdentifier": "YOUR_BUNDLE_ID",
  "infoPlist": {
    "NSSpeechRecognitionUsageDescription": "Ellie needs speech recognition to understand your questions.",
    "NSMicrophoneUsageDescription": "Ellie needs microphone access for voice commands."
  }
},
"android": {
  "package": "YOUR_BUNDLE_ID",
  "versionCode": 1,
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#ffffff"
  },
  "edgeToEdgeEnabled": true,
  "predictiveBackGestureEnabled": false,
  "permissions": [
    "android.permission.RECORD_AUDIO"
  ]
},
```

**`android/app/build.gradle`** — lines 90 and 92:

- Line 90: `namespace 'com.anonymous.ellie'` → `namespace 'YOUR_BUNDLE_ID'`
- Line 92: `applicationId 'com.anonymous.ellie'` → `applicationId 'YOUR_BUNDLE_ID'`

**`ios/Ellie.xcodeproj/project.pbxproj`** — run this command (replace with your actual ID):

```bash
sed -i '' 's/com\.anonymous\.ellie/YOUR_BUNDLE_ID/g' \
  ios/Ellie.xcodeproj/project.pbxproj

# Verify it changed (should show YOUR_BUNDLE_ID twice):
grep "PRODUCT_BUNDLE_IDENTIFIER" ios/Ellie.xcodeproj/project.pbxproj
```

---

### STEP 4 — Create `eas.json`

Create this file in the project root:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      },
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID_EMAIL",
        "ascAppId": "FILL_AFTER_STEP_6",
        "appleTeamId": "BZ798WZJCB"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json",
        "track": "internal"
      }
    }
  }
}
```

---

### STEP 5 — Register App ID on Apple Developer Portal

1. Go to https://developer.apple.com/account/resources/identifiers/list
2. Click **+** → "App IDs" → "App" → Continue
3. Description: `Ellie`
4. Bundle ID: select "Explicit" → enter `YOUR_BUNDLE_ID`
5. Capabilities: check **Push Notifications**
6. Continue → Register

---

### STEP 6 — Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com → My Apps → **+** → New App
2. Fill in:
   - Platforms: iOS
   - Name: `Hey Ellie` or `Ellie: Shift Assistant` (differentiates from the daily planner app)
   - Primary Language: English (Australia)
   - Bundle ID: select `YOUR_BUNDLE_ID` (appears after Step 5)
   - SKU: `ellie-shift-001`
3. After creating, find the **Apple ID** number on the app's page (10-digit number)
4. Put that number in `eas.json` → `submit.production.ios.ascAppId`

**App Store listing content:**

Short description (30 chars max):

```
Shift assistant for miners
```

Full description:

```
Ellie is the shift schedule assistant built for mining workers on rotating and FIFO rosters.

Know exactly when you're working, when you're home, and never miss what matters.
Just ask "Hey Ellie" — and Ellie answers in plain language.

• Works with all rotating roster patterns (2-2-3, 4-4-4, 7-7-7 and more)
• Full FIFO roster support with work block and rest block tracking
• Voice assistant powered by AI — ask natural questions like "am I working on Christmas?"
• Offline-first — works underground, no phone signal needed
• Push notifications for shift reminders
• Supports 9 languages
```

- Category: Productivity
- Age Rating: 4+
- Privacy Policy URL: Required (see Step 10)

---

### STEP 7 — Create App in Google Play Console

1. Go to https://play.google.com/console → Create app
2. App name: `Hey Ellie` (match App Store name)
3. Default language: English
4. App type: App / Free
5. Complete all required policy declarations
6. Fill store listing with same description as Step 6

---

### STEP 8 — Set Up iOS Signing via EAS

```bash
cd /Users/Shared/Ellie

# EAS automatically creates and manages Distribution Certificate + Provisioning Profile
eas credentials --platform ios
# Select: "Add new distribution certificate" → confirm
# Select: "Add new provisioning profile" → confirm
# EAS stores these in your Expo account — you don't manage them manually
```

---

### STEP 9 — Verify Firebase Backend is Live

Firebase project `ellie-20260220135308` and `.firebaserc` are already configured correctly.

```bash
cd /Users/Shared/Ellie

# Check if Cloud Function is deployed
curl -s -o /dev/null -w "%{http_code}" \
  https://us-central1-ellie-20260220135308.cloudfunctions.net/ellieBrain
# Returns 400 or 200 = deployed. Returns 404 = need to deploy.

# If 404 — deploy the function:
npm --prefix backend/functions install
npm --prefix backend/functions run build

# Set OpenAI key (if not already set)
firebase functions:secrets:set OPENAI_API_KEY --project ellie-20260220135308
# Paste your OpenAI API key when prompted

npm run firebase:deploy:functions
```

The `ELLIE_BRAIN_URL` in `.env` is already correct for your Firebase project.

---

### STEP 10 — Create a Privacy Policy

Required by both App Store and Play Store because the app uses microphone + Firebase + AsyncStorage.

Fastest option: create a Notion page (free, public URL) or GitHub Pages page:

```
Privacy Policy for Ellie
Last updated: [today's date]

What we collect:
- Voice input: Used only to answer your question. Never stored or shared.
- Your name and shift configuration: Stored locally on your device only.
- Firebase Authentication (optional): If you sign in, your email is stored by Firebase.
- Anonymous usage analytics via Firebase Analytics.

What we don't do:
- We do not sell your data.
- We do not share your data except as required to operate the app
  (Firebase for auth/storage, OpenAI for voice responses).

Contact: [your email]
```

Paste the public URL into App Store Connect and Google Play Console before submitting.

---

### STEP 11 — Push Secrets to EAS and Build

```bash
cd /Users/Shared/Ellie

# Push your .env values as EAS secrets for production builds
eas secret:push --scope project --env-file .env

# Build both platforms in Expo's cloud (~15-30 min each)
eas build --platform all --profile production

# Or one at a time:
eas build --platform ios --profile production
eas build --platform android --profile production
```

EAS will:

- Use iOS signing credentials from Step 8 automatically
- Create and manage an Android keystore automatically — **back it up** from Expo dashboard → Settings → Credentials after the first build
- Return download links for the `.ipa` and `.aab`

---

### STEP 12 — Take Screenshots

Required before App Store submission.

| Platform                     | Required size | Min count |
| ---------------------------- | ------------- | --------- |
| iOS 6.7" iPhone (15 Pro Max) | 1290×2796 px  | 3         |
| iOS 12.9" iPad               | 2048×2732 px  | 3         |
| Android phone                | 1080×1920 px  | 2         |

Screenshot these 3 screens:

1. **Main dashboard** with a shift showing — most important
2. **Voice assistant modal** open (gold mic button glowing)
3. **Onboarding pattern selection** screen (swipeable cards — looks great)

To get screenshots from simulator:

```bash
# iOS simulator
npx expo run:ios --configuration Release

# Or build a preview binary
eas build --platform ios --profile preview
```

---

### STEP 13 — Submit

```bash
cd /Users/Shared/Ellie

# Submit iOS to App Store Connect
eas submit --platform ios --latest
# Then: App Store Connect → TestFlight → confirm build → Submit for Review
# Apple review: 1-3 days

# For Android — first create Google Play Service Account key:
# 1. Google Play Console → Setup → API access → Link Google Cloud project
# 2. Create Service Account with "Release Manager" role
# 3. Download JSON key → save as google-play-key.json in project root
# 4. Add google-play-key.json to .gitignore
eas submit --platform android --latest
# Goes to "internal" track — promote to production when ready
```

---

## Summary of All Files to Change

| File                                         | Change                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| `src/navigation/MainTabNavigator.tsx`        | Full rewrite — 3 tabs only (Home, Ellie, Profile)                       |
| `src/components/navigation/CustomTabBar.tsx` | 5 targeted edits (index math for 3-tab layout)                          |
| `app.json`                                   | Add `buildNumber: "1"`, `versionCode: 1`, change both bundle IDs        |
| `android/app/build.gradle`                   | Lines 90+92: change namespace + applicationId                           |
| `ios/Ellie.xcodeproj/project.pbxproj`        | Replace bundle ID (sed command or Xcode)                                |
| `.env`                                       | Fill `GOOGLE_WEB_CLIENT_ID`, `EAS_PROJECT_ID`, set `APP_ENV=production` |
| `eas.json`                                   | Create new file                                                         |

---

## Files That Do NOT Need to Change

| File                                                                       | Why it's fine                                              |
| -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/screens/main/ScheduleScreen.tsx`                                      | Kept intact for v2                                         |
| `src/screens/main/StatsScreen.tsx`                                         | Kept intact for v2                                         |
| `src/components/navigation/CustomTabBar.tsx` TAB_ICONS                     | Schedule + Stats icon entries stay defined, ready for v2   |
| `android/app/build.gradle` line 115 (`signingConfig signingConfigs.debug`) | EAS Build overrides this automatically for release         |
| Firebase credentials in `.env`                                             | Already gitignored                                         |
| `DEVELOPMENT_TEAM = BZ798WZJCB` in Xcode project                           | Correct team ID                                            |
| `assets/icon.png`, `assets/adaptive-icon.png`                              | Already 1024×1024                                          |
| All permission usage descriptions                                          | Already complete                                           |
| `PICOVOICE_ACCESS_KEY` in `.env`                                           | Fine as-is for Porcupine wake word                         |
| Expo SDK 54                                                                | Still supported — upgrade to SDK 55 after first submission |

---

## Verification Checklist

```
□ Tab bar shows only 3 tabs: Home | [Ellie center button] | Profile
□ Tapping center button opens voice assistant modal
□ No Schedule or Stats tabs visible
□ eas build --platform ios --profile production completes without error
□ eas build --platform android --profile production completes without error
□ TestFlight build installs on real iPhone → complete full onboarding
□ Dashboard shows correct shifts after onboarding
□ Close app, reopen → dashboard still shows data (AsyncStorage persistence)
□ Say "Hey Ellie" or tap mic → voice responds
□ .apk installs on Android → repeat same checks
□ Firebase Cloud Function responds (curl test from Step 9)
□ Privacy Policy URL is live and accessible
□ Screenshots uploaded to App Store Connect and Google Play Console
```

---

## Source-of-Truth Addendum (Supersedes Any Older Conflicting Notes Above)

This addendum merges all additional MVD details and is mandatory for release.

### A) Confirmed blocker corrections (must be done)

1. **`release:check` must pass with exit code 0**
   - Current known issue class: Jest teardown warning from haptics async path.
   - Treat as release blocker even when all test suites show PASS.

2. **Bundle/package ID replacement must be complete across all layers**
   - `app.json`
   - `app.config.js` if it overrides Expo config
   - `android/app/build.gradle` (`namespace`, `applicationId`)
   - iOS Xcode project bundle ID fields
   - Any deep-link schemes still tied to `com.anonymous.ellie`

3. **Android release signing must be production-safe**
   - If using **EAS cloud build**, EAS-managed release credentials are acceptable.
   - If using **local `./gradlew bundleRelease` for submission artifact**, do not use debug signing; configure a release keystore.

4. **Android permissions must be policy-safe**
   - Remove unneeded `SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` unless there is strict product/legal justification.
   - Keep only required permissions for shipped v1 behavior.

5. **Dead actions must not ship silently**
   - Any visible quick-action buttons must navigate or perform a real action.
   - If not implemented for v1, hide/remove those specific actions from the UI.

### B) Release exit criteria (go/no-go gate)

Do not submit until all are true:

1. `npm run lint` passes.
2. `npm run type-check` passes.
3. `npm test -- --runInBand --silent` passes cleanly.
4. `npm run backend:build` passes.
5. `npm run release:check` exits with code 0.
6. iOS archive built with production bundle ID.
7. Android AAB built with production ID and valid release signing path.
8. Manual smoke tests pass on physical iOS and Android devices.
9. App Store Connect metadata/privacy form completed.
10. Play Console data safety/content forms completed.

### C) Mandatory command sequence before every RC build

```bash
cd /Users/Shared/Ellie
npm ci --legacy-peer-deps
npm run lint
npm run type-check
npm test -- --runInBand --silent
npm run backend:build
npm run release:check
```

Then:

```bash
# iOS archive validation
cd /Users/Shared/Ellie
npx expo prebuild --platform ios --clean
cd ios
xcodebuild -workspace Ellie.xcworkspace \
  -scheme Ellie \
  -configuration Release \
  -destination generic/platform=iOS \
  -archivePath /tmp/Ellie.xcarchive archive
```

```bash
# Android AAB validation
cd /Users/Shared/Ellie
npx expo prebuild --platform android --clean
cd android
./gradlew bundleRelease
```

### D) Manual smoke test matrix (must-pass)

1. Fresh install -> complete onboarding (rotating path).
2. Fresh install -> complete onboarding (FIFO path).
3. Profile shift edits reflect immediately on dashboard.
4. Hero/status/tab colors switch correctly by active shift behavior.
5. App relaunch preserves onboarding data.
6. Voice assistant opens, handles permission flow, and responds.
7. Hidden tabs are truly not visible in v1 nav.
8. No dead UI tap targets remain in visible screens.

### E) 7-day execution plan (fastest safe path)

Day 1:

- Finalize bundle ID, EAS setup, signing approach.
- Remove risky Android permissions.

Day 2:

- Fix `release:check` teardown issue.
- Confirm all local quality gates pass.

Day 3:

- Complete nav/UI v1 trim (hidden tabs + no dead actions).
- Build release candidates.

Day 4:

- Full device smoke testing and bugfix pass.

Day 5:

- Upload to TestFlight + Play Internal.

Day 6:

- Internal feedback patch cycle.

Day 7:

- Store submission (or one more internal cycle if blocker feedback appears).

### F) Risks and mitigations

Risk: Scope creep delays launch.  
Mitigation: Only blocker fixes allowed until first public build.

Risk: Policy rejection due to permissions.  
Mitigation: Keep minimum permission surface and document each permission use.

Risk: CI appears green but release command fails.  
Mitigation: `release:check` is mandatory gate for every release candidate.

Risk: UX confusion from partially complete features.  
Mitigation: Hide non-v1 tabs and remove dead actions.

### G) Post-v1 backlog (explicitly deferred)

1. Reintroduce Schedule tab with full functionality.
2. Reintroduce Stats tab with full functionality.
3. Expand production-grade E2E suite beyond placeholder assertions.
4. Complete end-to-end notification automation UX loop.
5. Add automated release lanes (EAS/Fastlane) after first stable launch.
