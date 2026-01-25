# Deployment Guide

## Overview

This guide covers building and deploying the Ellie application to iOS and Android platforms using Expo Application Services (EAS).

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

This creates `eas.json` configuration file.

### 2. Configure EAS Build Profiles

Edit `eas.json`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "store",
      "autoIncrement": true,
      "env": {
        "APP_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "your-app-store-connect-id",
        "appleTeamId": "your-team-id"
      },
      "android": {
        "serviceAccountKeyPath": "./path/to/api-key.json",
        "track": "internal"
      }
    }
  }
}
```

### 3. Update app.json

```json
{
  "expo": {
    "name": "Ellie",
    "slug": "ellie",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "bundleIdentifier": "com.ilyasuseidu.ellie",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Allow Ellie to access your camera",
        "NSPhotoLibraryUsageDescription": "Allow Ellie to access your photos"
      }
    },
    "android": {
      "package": "com.ilyasuseidu.ellie",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": ["CAMERA", "READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"]
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id"
      }
    }
  }
}
```

## Environment Configuration

### 1. Create Environment Files

Create separate `.env` files for each environment:

- `.env.development`
- `.env.staging`
- `.env.production`

### 2. Configure Environment in EAS

Add environment variables to EAS:

```bash
eas secret:create --scope project --name FIREBASE_API_KEY --value "your-api-key"
eas secret:create --scope project --name FIREBASE_PROJECT_ID --value "your-project-id"
```

Or add to `eas.json`:

```json
{
  "build": {
    "production": {
      "env": {
        "FIREBASE_API_KEY": "your-api-key",
        "FIREBASE_PROJECT_ID": "your-project-id"
      }
    }
  }
}
```

### 3. Load Environment Variables

Install dotenv:

```bash
npm install --save-dev dotenv
```

Update `app.config.js`:

```javascript
require('dotenv').config();

export default {
  expo: {
    // ... existing config
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      // ... other env vars
    },
  },
};
```

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

Generate a new keystore for signing:

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore ellie.keystore \
  -alias ellie-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**Important**: Store keystore and passwords securely!

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
   - Name: Ellie
   - Primary Language: English
   - Bundle ID: com.ilyasuseidu.ellie
   - SKU: ellie-ios

3. **Pricing and Availability**:
   - Set price tier
   - Select availability countries

### 2. Prepare App Metadata

- **App Description**: Compelling description of Ellie
- **Keywords**: Search optimization keywords
- **Screenshots**: Required sizes for all devices
  - iPhone 6.7": 1290 x 2796
  - iPhone 6.5": 1242 x 2688
  - iPhone 5.5": 1242 x 2208
  - iPad Pro 12.9": 2048 x 2732
- **App Icon**: 1024 x 1024 (no transparency)
- **Privacy Policy URL**: Required
- **Support URL**: Required

### 3. Submit to App Store

#### Option 1: Using EAS Submit

```bash
eas submit --platform ios --profile production
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
   - Name: Ellie
   - Default Language: English
   - Package name: com.ilyasuseidu.ellie

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
eas submit --platform android --profile production
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
      "url": "https://u.expo.dev/your-project-id"
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
          eas submit --platform ios --profile production --non-interactive
          eas submit --platform android --profile production --non-interactive
```

## Environment-Specific Configs

### Development

```json
{
  "build": {
    "development": {
      "env": {
        "APP_ENV": "development",
        "API_URL": "https://dev-api.ellie.app"
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
        "API_URL": "https://staging-api.ellie.app"
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
        "API_URL": "https://api.ellie.app"
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
keytool -list -v -keystore ellie.keystore
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
