# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1xpyDBKGqGv5OKyRpR5DXVWyYAISp96tb

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

# Set up and building 
1. adb devices -> Turn on your USB debugging, this should show you device

## Install the debug build directly to mobile wire connected
2. npx expo run:android

## Builds
3. npx expo prebuild -> creates ios and android folders
4. cd android

## create the debug build
5. ./gradlew assembleDebug
6. android/app/build/outputs/apk/debug/app-debug.apk

## Creates the release build
7. ./gradlew assembleRelease
8. android/app/build/outputs/apk/release/app-release.apk