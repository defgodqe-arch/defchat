# defgodqe / defchat

A Discord-inspired text-first community app built with React, Vite, Supabase Auth, Postgres, Realtime, and an Electron development wrapper. Responsive browser UI works on desktop and mobile browsers.

## Included

- Email/password sign-up, sign-in, and sign-out
- User profiles and unique usernames
- Communities (servers), membership, and text channels
- Persistent server messages with Supabase Realtime updates
- Direct messages by exact username, persistent DM history, and Realtime updates
- Friend-request database tables and row-level access policies
- Message-reaction database table
- Row Level Security on exposed app tables
- Mobile navigation and desktop Electron development wrapper
- CI build check on pushes and pull requests

## Supabase project

This repository is wired to the defgodqe Supabase project using its **publishable** key (safe for browser use). Public/publishable keys are not secrets; never add a Supabase secret or service-role key to frontend code.

To use another Supabase project, copy `.env.example` to `.env` and replace the URL and publishable key.

The database already has the schema applied. For a fresh project, run `supabase/schema.sql` once in the Supabase SQL Editor. The script sets up profiles, servers, channels, messages, DMs, friend requests, reactions, policies, and Realtime publication.

## Google sign-in setup

The app includes a **Continue with Google** button using Supabase OAuth. To activate it for real users:

1. In [Google Cloud Console](https://console.cloud.google.com/auth/clients), create an OAuth Client ID with application type **Web application**.
2. Add the deployed site's origin (for GitHub Pages, `https://defgodqe-arch.github.io`) to **Authorized JavaScript origins**.
3. Add the Supabase Auth callback URL `https://jklhnhnxyzqjvmqgfpjs.supabase.co/auth/v1/callback` to **Authorized redirect URIs**.
4. In [Supabase Google provider settings](https://supabase.com/dashboard/project/jklhnhnxyzqjvmqgfpjs/auth/providers), enable Google and enter the Google Client ID and Client Secret.
5. In [Supabase URL configuration](https://supabase.com/dashboard/project/jklhnhnxyzqjvmqgfpjs/auth/url-configuration), set the Site URL to `https://defgodqe-arch.github.io/defchat/` and add that same URL to the allowed redirect URLs. Add your local development URL too if needed.

Google sign-in cannot complete until the provider credentials and redirect allow-list are configured in the dashboards. Never commit the Google Client Secret to this repository.

## Run locally

1. Install Node.js LTS.
2. Clone this repository.
3. Run `npm install`.
4. Run `npm run dev` and open the local URL printed by Vite.
5. To use the Electron development window, keep Vite running and run `npm run desktop` in a second terminal.

For web hosting, run `npm run build` and deploy the `dist/` folder. The current code has safe public-key defaults for this Supabase project, so local `.env` configuration is optional for this project. Set environment variables in your hosting provider if using another project.

## Security and launch checklist

- Keep Row Level Security enabled.
- The server-creation RPC uses a narrow, authenticated-only wrapper; its internal privileged implementation lives in the non-exposed `private` schema and checks `auth.uid()`.
- Test with at least two separate accounts before inviting people.
- Before public launch, add abuse rate limits, blocking/reporting UI, account deletion, privacy/terms pages, backup review, and a packaged Windows installer.
- DMs currently start by entering the recipient's exact username. The friend-request tables are ready, but friend-request UI and invite links are not yet implemented.

## Current limitations

This is a working text-chat MVP, not a full Discord clone. Voice/video, file uploads, push notifications, full server-role management UI, friend-request UI, invite links, and a signed Windows installer are not included yet.
