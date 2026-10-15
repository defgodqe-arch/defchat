# defchat mobile app builds

## Android

Every push to `main` starts **Build defchat for Android**. When it succeeds, the workflow publishes an installable debug-signed APK to the repository's [Releases](https://github.com/defgodqe-arch/defchat/releases) page and keeps a temporary copy in the Actions run artifacts.

1. Open the latest **defchat Android build** release on an Android phone.
2. Download `defchat-android.apk`.
3. Open it and approve Android's “install unknown apps” prompt for the browser or file manager if asked.

This is a real native Android package, but it is a debug/testing build and is not yet a Google Play release.

## iPhone and iPad

The iOS workflow builds a native iOS archive. Its default artifact is **unsigned**, so it is for signing in Xcode and is not directly installable on an iPhone. Apple requires app signing and a provisioning profile for device installation/distribution. To produce a signed IPA or publish through TestFlight, configure Apple Developer signing credentials and a provisioning profile in GitHub Actions secrets, then add the signed export step.

The native project is generated with Capacitor during CI; the website remains deployed separately to GitHub Pages.
