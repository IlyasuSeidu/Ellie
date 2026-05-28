# Ryvro Wake Word Setup

This app is configured with a best-effort strategy:

- Primary: custom wake word model named `Ryvro`
- Fallback: built-in Porcupine keyword if custom model fails to initialize at runtime

## 1. Generate keyword models in Picovoice Console

1. Open https://console.picovoice.ai/
2. Create a custom wake word phrase: `Ryvro`
3. Download both platform keyword files:
   - iOS `.ppn`
   - Android `.ppn`

## 2. Place model files in project

- Android model path:
  - `<repo-root>/android/app/src/main/assets/ryvro_android.ppn`
- iOS model path:
  - `<repo-root>/ios/Ellie/ryvro_ios.ppn`

For iOS, add `ryvro_ios.ppn` to the app target in Xcode:

1. Open `<repo-root>/ios/Ellie.xcworkspace`
2. Drag `ryvro_ios.ppn` into the current native iOS project
3. Ensure `Target Membership` includes the current app target

## 3. Set AccessKey

Set your key in `<repo-root>/.env`:

`PICOVOICE_ACCESS_KEY=...`

Set the display phrase in `<repo-root>/.env`:

`WAKE_WORD_PHRASE=Ryvro`

## 4. Rebuild native apps

- Android: `npx expo run:android`
- iOS: `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios`
