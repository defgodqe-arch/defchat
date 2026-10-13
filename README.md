# defgodqe

A Discord-inspired community chat MVP built with React, Vite, Supabase, and Electron.

## Features
- Email/password signup and login
- User profiles
- Communities (servers) and text channels
- Persistent messages and real-time message updates
- Row Level Security for database access
- Browser app and Electron development wrapper

## Setup
1. Create a project at https://supabase.com/dashboard.
2. Open Supabase SQL Editor and run all of `supabase/schema.sql`.
3. Copy `.env.example` to `.env` and fill in your Supabase project URL and publishable/anon key. Never use a service-role/secret key in the frontend.
4. Install Node.js LTS (https://nodejs.org/).
5. Run `npm install`, then `npm run dev`; open the URL printed by Vite.
6. To open the Electron development window, keep Vite running and run `npm run desktop` in a second terminal.

For production web hosting, run `npm run build` and deploy `dist/`; configure the same VITE environment variables in the hosting provider. Electron is currently a development wrapper, not a packaged installer.

## Security
Keep Supabase Row Level Security enabled. Test with at least two accounts before inviting people. Public launch still needs abuse prevention/rate limiting, reporting/blocking, account deletion, terms/privacy pages, and backups.

## Not included yet
Friends, DMs, invite links, file uploads, voice/video, push notifications, full role management UI, and a Windows installer.
