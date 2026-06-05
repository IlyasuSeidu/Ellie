# Deployment Guide

## Overview

This guide covers building and deploying the Ryvro application to iOS and Android platforms using Expo Application Services (EAS).

Current Ryvro release source of truth:

- `docs/MINIMUM_VIABLE_DEPLOYMENT_PLAN.md` for the minimum store-release sequence.
- `docs/RYVRO_EXTERNAL_SERVICE_SETUP.md` for Firebase, OAuth, RevenueCat, App Store Connect, Play Console, domain, social, and support setup.
- `RYVRO_ENVIRONMENT_CONFIGURATION_TEMPLATE.md` for production environment values.
- `RYVRO_RELEASE_TASKS.md` for owner/account steps that cannot be completed from the repo.

## Release Checklist (Ryvro Universal Builder + Voice)

Before cutting a release, run this gate in order:

1. `npm run type-check`
2. `npm test -- --runInBand`
3. `npm run backend:build`
4. Confirm backend env values are set (`RYVRO_BRAIN_URL`, `RYVRO_BRAIN_TIMEOUT`, `SHIFT_SCHEDULE_PARSER_URL`, parser timeout/length values, and wake-word env keys; retired `ELLIE_BRAIN_*` values must be removed before Ryvro release builds)
5. Build dev clients for smoke:
   - `npx expo run:ios`
   - `npx expo run:android`
6. Smoke pass:
   - Universal Builder onboarding path: AI description, manual builder, and template start
   - Settings Universal Builder entry: AI rewrite and manual edit
   - Dashboard colors/icons for current, next, holiday exception, one-off exception, imported day, and overnight shift
   - Calendar import/export, reminder profiles, and exception editing
   - Voice assistant: no-speech/offline/backend failure/wake-word-unavailable paths
7. Update release notes:
   - `SHIFT_WORKER_APP_REBRAND_AUDIT.md` and the release notes for the current PR/release branch

Recommended branch naming:

- `release/<version>` for release prep
- `hotfix/<version>-<topic>` for post-release critical fixes

## Table of Contents

- [Prerequisites](#prerequisites)
- [EAS Build Setup](#eas-build-setup)
- [Environment Configuration](#environment-configuration)
- [Building for iOS](#building-for-ios)
- [Building for Android](#building-for-android)
- [App Store Deployment](#app-store-deployment)
- [Google Play Deployment](#google-play-deployment)
- [Over-the-Air Updates](#over-the-air-updates)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- **Expo CLI**: Install globally

  ```bash
  npm install -g expo-cli
  ```

- **EAS CLI**: Install globally

  ```bash
  npm install -g eas-cli
  ```

- **Expo Account**: Sign up at [expo.dev](https://expo.dev/)

### Platform-Specific Requirements

#### iOS Development

- **macOS**: Required for iOS builds
- **Apple Developer Account**: $99/year
  - Sign up at [developer.apple.com](https://developer.apple.com/)
- **Xcode**: Latest version from App Store
- **CocoaPods**: Install via Homebrew
  ```bash
  brew install cocoapods
  ```

#### Android Development

- **Java Development Kit (JDK)**: Version 17

  ```bash
  brew install openjdk@17
  ```

- **Google Play Developer Account**: $25 one-time fee
  - Sign up at [play.google.com/console](https://play.google.com/console)

- **Android Studio**: For creating keystore
  - Download from [developer.android.com](https://developer.android.com/studio)

## EAS Build Setup

### 1. Initialize EAS

```bash
eas login
eas build:configure
```

This repo already tracks `eas.json`. Use `eas build:configure` only when refreshing EAS project linkage, then keep the committed Ryvro build profiles intact.

### 2. Verify EAS Build Profiles

Do not replace the committed `eas.json` with an older sample from Expo docs. The tracked Ryvro file is the source of truth and must keep:

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "node": "20.19.4",
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "node": "20.19.4",
      "distribution": "internal"
    },
    "production": {
      "node": "20.19.4",
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
        "appleId": "seiduilyasu94@gmail.com",
        "ascAppId": "6776994726",
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

`submit.production` now includes the verified App Store Connect Apple ID email and ASC app ID. It still keeps Android service-account evidence outside the repository, so `npm run release:submit:check` must fail until the remaining console values, local key file, and `docs/RYVRO_LAUNCH_EVIDENCE_LOG.md` are complete.

Because `cli.appVersionSource` is `remote`, Expo ignores tracked `ios.buildNumber` and `android.versionCode` for EAS store builds. Before each production-auth rebuild, check the remote values:

```bash
npm run release:versions:get
```

If iOS build number or Android versionCode still matches an uploaded store binary, increment the remote value before rebuilding:

```bash
eas build:version:set --platform ios --profile production
eas build:version:set --platform android --profile production
```

The latest checked production remote values on 2026-06-05 were iOS build number `1` and Android versionCode `1`, so the next production-auth TestFlight and Play internal builds must bump remote versions first.

### 3. Verify app.config.js

Ryvro uses dynamic Expo config in `app.config.js`, not a static `app.json` release sample. Before release, verify `app.config.js` still owns:

- `name: 'Ryvro Shift Planner'`
- `slug: 'ryvro'`
- `scheme: 'ryvro'`
- `icon: './assets/icon.png'`
- `splash.image: './assets/splash-icon.png'`
- iOS bundle identifier `com.ryvro.shiftplanner`
- Android package `com.ryvro.shiftplanner`
- native display name `Ryvro`
- legal/support URLs on `https://getryvro.com`
- Ryvro function defaults for `ryvroBrain` and `parseShiftScheduleDescription`

## Environment Configuration

### 1. Create Environment Files

Create a production `.env` from the Ryvro production template. Do not start release builds from `.env.example`; that file is for local development defaults.

```bash
cp RYVRO_ENVIRONMENT_CONFIGURATION_TEMPLATE.md /tmp/ryvro-env-reference.md
cp .env.production.example .env
```

Fill `.env` with real production values for Firebase, Google OAuth, RevenueCat, legal/support URLs, EAS project ID, `RYVRO_BRAIN_URL`, and `SHIFT_SCHEDULE_PARSER_URL`. Keep the real Firebase native service files at the repo root and set `EXPO_IOS_GOOGLE_SERVICES_FILE=./GoogleService-Info.plist` plus `EXPO_ANDROID_GOOGLE_SERVICES_FILE=./google-services.json`. The production example is intentionally placeholder-filled and should fail `npm run release:env:check` until those owner/account values are replaced.

Before pushing secrets to EAS or starting production builds, run:

```bash
npm run release:env:check
```

### 2. Configure Environment in EAS

After `npm run release:env:check` passes, push the checked `.env` values to EAS:

```bash
eas secret:push --scope project --env-file .env
```

Do not commit `.env`, service account keys, keystores, provisioning profiles, or real Firebase config copied from the consoles.

### 3. Load Environment Variables

Ryvro already loads release configuration from `app.config.js`; do not replace it with a static sample. If you add a new environment key, add it to:

- `.env.example`
- `RYVRO_ENVIRONMENT_CONFIGURATION_TEMPLATE.md`
- `.env.production.example` when the key is required for release builds
- `src/config/env.ts`
- `scripts/verify-ryvro-production-env.js`
- related tests in `tests/config/`

## Building for iOS

### 1. Configure iOS Credentials

```bash
eas credentials
```

Choose one of:

- **Let EAS manage credentials** (recommended for beginners)
- **Provide your own credentials** (for existing apps)

### 2. Build iOS App

#### Development Build

```bash
eas build --profile development --platform ios
```

#### Preview Build (TestFlight)

```bash
eas build --profile preview --platform ios
```

#### Production Build

```bash
eas build --profile production --platform ios
```

### 3. Local iOS Build

For faster iteration during development:

```bash
npx expo prebuild --platform ios
cd ios
pod install
cd ..
npx expo run:ios
```

### 4. Build Configuration

Edit `eas.json` for iOS-specific settings:

```json
{
  "build": {
    "production": {
      "ios": {
        "resourceClass": "m-medium",
        "buildConfiguration": "Release",
        "credentialsSource": "auto",
        "simulator": false
      }
    }
  }
}
```

## Building for Android

### 1. Create Keystore

Generate a new upload keystore for signing if you are not letting EAS manage Android credentials:

```bash
keytool -genkeypair -v \
  -keystore ryvro-upload-key.keystore \
  -alias ryvro-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

**Important**: Store keystore and passwords securely. Never commit the keystore. If using local Gradle signing, use `RYVRO_UPLOAD_*` properties as described in `docs/MINIMUM_VIABLE_DEPLOYMENT_PLAN.md`.

### 2. Configure Android Credentials

```bash
eas credentials
```

Upload your keystore or let EAS generate one.

### 3. Build Android App

#### Development Build (APK)

```bash
eas build --profile development --platform android
```

#### Preview Build (APK)

```bash
eas build --profile preview --platform android
```

#### Production Build (AAB)

```bash
eas build --profile production --platform android
```

### 4. Local Android Build

```bash
npx expo prebuild --platform android
npx expo run:android
```

### 5. Build Configuration

Edit `eas.json` for Android-specific settings:

```json
{
  "build": {
    "production": {
      "android": {
        "resourceClass": "medium",
        "buildType": "app-bundle",
        "gradleCommand": ":app:bundleRelease"
      }
    }
  }
}
```

## App Store Deployment

### 1. Prepare App Store Connect

1. **Create App Record**:
   - Go to [App Store Connect](https://appstoreconnect.apple.com/)
   - Click "My Apps" → "+" → "New App"
   - Fill in app information

2. **App Information**:
   - Name: Ryvro Shift Planner
   - Primary Language: English
   - Bundle ID: com.ryvro.shiftplanner
   - SKU: ryvro-shift-ios

3. **Pricing and Availability**:
   - Set price tier
   - Select availability countries

### 2. Prepare App Metadata

- **App Description**: Use `docs/RYVRO_STORE_LISTING.md`
- **Keywords**: Search optimization keywords
- **Screenshots**: Required sizes for all devices
  - iPhone 6.7": 1290 x 2796
  - iPhone 6.5": 1242 x 2688
  - iPhone 5.5": 1242 x 2208
  - iPad Pro 12.9": 2048 x 2732
- **App Icon**: 1024 x 1024 (no transparency)
- **Privacy Policy URL**: Publish from `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md`
- **Support URL**: Publish from `docs/RYVRO_PRIVACY_SUPPORT_TEMPLATES.md`

### 3. Submit to App Store

#### Option 1: Using EAS Submit

```bash
npm run release:submit:check
eas submit --platform ios --latest
```

#### Option 2: Manual Upload

1. Download IPA from EAS build
2. Use Transporter app or Xcode to upload
3. Go to App Store Connect
4. Select build and submit for review

### 4. App Store Review Checklist

- [ ] All required metadata filled
- [ ] Screenshots uploaded
- [ ] Privacy policy URL provided
- [ ] Support URL provided
- [ ] App tested thoroughly
- [ ] No crashes or bugs
- [ ] Follows App Store guidelines
- [ ] Export compliance documentation

## Google Play Deployment

### 1. Prepare Google Play Console

1. **Create Application**:
   - Go to [Google Play Console](https://play.google.com/console/)
   - Create new app
   - Fill in app details

2. **App Information**:
   - Name: Ryvro Shift Planner
   - Default Language: English
   - Package name: com.ryvro.shiftplanner

3. **Store Listing**:
   - Short description (80 chars)
   - Full description (4000 chars)
   - App icon: 512 x 512 PNG
   - Feature graphic: 1024 x 500 PNG
   - Screenshots: At least 2 for each device type

### 2. Create Release

1. Go to "Production" → "Create new release"
2. Upload AAB file from EAS build
3. Fill in release notes
4. Set rollout percentage (optional)

### 3. Submit to Google Play

#### Option 1: Using EAS Submit

```bash
npm run release:submit:check
eas submit --platform android --latest
```

#### Option 2: Manual Upload

1. Download AAB from EAS build
2. Go to Google Play Console
3. Upload to production track
4. Fill in release details
5. Review and rollout

### 4. Content Rating

Complete the content rating questionnaire:

- Go to "Store presence" → "Content rating"
- Answer all questions honestly
- Submit for rating

### 5. Review Checklist

- [ ] Store listing complete
- [ ] Screenshots uploaded
- [ ] Privacy policy added
- [ ] Content rating completed
- [ ] Target audience set
- [ ] App category selected
- [ ] Contact details provided
- [ ] Pricing set

## Over-the-Air Updates

### 1. Configure EAS Update

Install EAS Update:

```bash
npx expo install expo-updates
```

Configure in `app.json`:

```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/FILL_AFTER_EAS_INIT"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

### 2. Publish Update

```bash
eas update --branch production --message "Bug fixes and improvements"
```

### 3. Channel Management

Create update channels for different environments:

```bash
# Development updates
eas update --branch development --message "Dev changes"

# Staging updates
eas update --branch staging --message "Staging changes"

# Production updates
eas update --branch production --message "Production changes"
```

### 4. Rollback Update

```bash
eas update:rollback --branch production
```

## Version Management

### Semantic Versioning

Follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

### Updating Version

#### app.json

```json
{
  "expo": {
    "version": "1.2.0",
    "ios": {
      "buildNumber": "12"
    },
    "android": {
      "versionCode": 12
    }
  }
}
```

#### Auto-increment with EAS

```json
{
  "build": {
    "production": {
      "autoIncrement": true
    }
  }
}
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Stores

on:
  push:
    tags:
      - 'v*'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18.x'

      - name: Install dependencies
        run: npm ci

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build iOS
        run: eas build --platform ios --profile production --non-interactive

      - name: Build Android
        run: eas build --platform android --profile production --non-interactive

      - name: Submit to stores
        run: |
          npm run release:submit:check
          eas submit --platform ios --latest --non-interactive
          eas submit --platform android --latest --non-interactive
```

## Environment-Specific Configs

### Development

```json
{
  "build": {
    "development": {
      "env": {
        "APP_ENV": "development",
        "API_URL": "https://dev-api.getryvro.com"
      }
    }
  }
}
```

### Staging

```json
{
  "build": {
    "staging": {
      "env": {
        "APP_ENV": "staging",
        "API_URL": "https://staging-api.getryvro.com"
      }
    }
  }
}
```

### Production

```json
{
  "build": {
    "production": {
      "env": {
        "APP_ENV": "production",
        "API_URL": "https://api.getryvro.com"
      }
    }
  }
}
```

## Troubleshooting

### Common iOS Issues

**Build fails with code signing error**:

```bash
eas credentials
# Re-configure credentials
```

**App crashes on launch**:

- Check Firebase configuration
- Verify all required permissions in Info.plist
- Check Xcode logs

### Common Android Issues

**Build fails with Gradle error**:

```bash
# Clear Gradle cache
cd android
./gradlew clean
cd ..
```

**Keystore issues**:

```bash
# Verify keystore
keytool -list -v -keystore ryvro.keystore
```

### EAS Build Issues

**Build timeout**:

- Increase resource class in `eas.json`
- Optimize dependencies

**Out of memory**:

```json
{
  "build": {
    "production": {
      "resourceClass": "large"
    }
  }
}
```

## Monitoring

### Crash Reporting

Integrate Sentry or Firebase Crashlytics:

```bash
npx expo install @sentry/react-native
```

### Analytics

Firebase Analytics is included with Firebase SDK.

### Performance Monitoring

```bash
npx expo install @react-native-firebase/perf
```

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [EAS Update Documentation](https://docs.expo.dev/eas-update/introduction/)
- [App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)
- [Expo Documentation](https://docs.expo.dev/)

## Support

For deployment issues:

- Check [Expo Forums](https://forums.expo.dev/)
- Review [EAS Build Status](https://status.expo.dev/)
- Contact Expo support (paid plans)
