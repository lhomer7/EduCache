# Android App Setup

This project can be wrapped as an Android app with Capacitor.

## What Is Already Prepared

- `package.json` contains the Capacitor scripts.
- `capacitor.config.json` points Capacitor at the generated `mobile-web` folder.
- `scripts/prepare-mobile.ps1` copies the current static site into `mobile-web`.

## What Still Needs To Be Installed On This Computer

1. Node.js
2. Java JDK
3. Android Studio

## Commands To Run After Installing Node.js

```powershell
npm install
npm run cap:add:android
```

If Android has already been added once, use:

```powershell
npm run cap:open:android
```

## What Happens Next

1. Capacitor creates the Android project in `android/`
2. Android Studio opens the native app project
3. You can test on an Android phone or emulator
4. When the app is ready, generate a signed release build in Android Studio
5. Upload the Android App Bundle to Google Play Console

## Recommended Next Mobile Features

- Native QR scanning
- Offline support for student pages
- Better mobile bottom navigation
- App icon and splash screen
- Push notifications for teachers
