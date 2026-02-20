# Ellie Wake Word Setup

This app is configured with a best-effort strategy:
- Primary: custom wake word model named `Ellie`
- Fallback: built-in Porcupine keyword if custom model fails to initialize at runtime

## 1. Generate keyword models in Picovoice Console

1. Open https://console.picovoice.ai/
2. Create a custom wake word phrase: `Ellie`
3. Download both platform keyword files:
   - iOS `.ppn`
   - Android `.ppn`

## 2. Place model files in project

- Android model path:
  - `/Users/Shared/Ellie/android/app/src/main/assets/ellie_android.ppn`
- iOS model path:
  - `/Users/Shared/Ellie/ios/Ellie/ellie_ios.ppn`

For iOS, add `ellie_ios.ppn` to the app target in Xcode:
1. Open `/Users/Shared/Ellie/ios/Ellie.xcworkspace`
2. Drag `ellie_ios.ppn` into the `Ellie` project
3. Ensure `Target Membership` includes `Ellie`

## 3. Set AccessKey

Set your key in `/Users/Shared/Ellie/.env`:

`PICOVOICE_ACCESS_KEY=...`

Set the display phrase in `/Users/Shared/Ellie/.env`:

`WAKE_WORD_PHRASE=Hey Ellie`

## 4. Rebuild native apps

- Android: `npx expo run:android`
- iOS: `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios`
