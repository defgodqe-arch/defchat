# defchat

defchat is a Discord-inspired, text-first community app with Supabase Auth, Postgres, and Realtime.

## Run as a desktop app (no browser tabs or address bar)

### Windows
1. Install [Node.js LTS](https://nodejs.org/) and [Git](https://git-scm.com/downloads).
2. Clone this repository, or download the repository ZIP and extract it.
3. Open a terminal in the project folder.
4. Run `npm install`.
5. Run `npm run desktop:win`.
6. Open the `release` folder and run the generated `defchat-1.0.0-win-x64.exe` installer.
7. Launch **defchat** from the Start menu or desktop shortcut.

The installed Windows version opens in its own desktop window, without a browser address bar or tabs. You do not need to keep a terminal or development server open after installation.

### macOS / Linux
- macOS: `npm install`, then `npm run desktop:mac`. Open the generated DMG in `release`.
- Linux: `npm install`, then `npm run desktop:linux`. Run the generated AppImage from `release`.

For development, run `npm run dev` in one terminal and `npm run desktop` in another.

## Install on a phone
The hosted site has an installable app manifest and standalone display mode. Android: open the site in Chrome and choose **Install app**. iPhone: open it in Safari, tap **Share**, then **Add to Home Screen**. It launches from the home-screen icon without normal browser tabs. This is not yet a signed native Android APK or iOS App Store build.

## Features
- Email/password sign-up, sign-in, and sign-out
- User profiles and unique usernames
- Communities (servers), membership, and text channels
- Persistent server messages and direct messages with Supabase Realtime
- Friends, reactions, and cosmetic support where implemented
- Responsive mobile layout and free cosmetic shop
- Personal accent themes (yellow, purple, cyan, rose, green), compact chat density, adjustable message text size, and reduced-motion mode
- Keyboard shortcuts for message search, settings, emoji picker, and focusing the composer
- Export the currently loaded conversation as JSON, plain text, or CSV
- Per-device preferences, a notification-permission control, and separate auto-saved drafts for every channel and DM

## Supabase configuration
The app uses the defgodqe Supabase project with its public/publishable key. Never put a Supabase secret or service-role key in frontend code.

To use another Supabase project, configure `.env` using `.env.example`. For a fresh project, run `supabase/schema.sql` in the Supabase SQL Editor. To add the Phase 1 feature tables (message threads, pins, polls, scheduled events and RSVPs) to an existing setup, run `supabase/discord_features_phase1.sql` after the base schema. This migration adds membership-aware row-level security policies; the new features still need their UI integrations before they appear in the app. Google sign-in requires valid OAuth credentials and matching Supabase redirect URLs.

## Packaging
- Windows installer: `npm run desktop:win`
- macOS DMG: `npm run desktop:mac`
- Linux AppImage: `npm run desktop:linux`

Desktop release packages are built by GitHub Actions when a `v*` tag is pushed. Unsigned installers may show an operating-system security warning.

## Current limitations
This is an MVP, not a full Discord replacement. Voice/video, push notifications, and file uploads are not included. Native mobile store packages and signed desktop installers are not yet included.
