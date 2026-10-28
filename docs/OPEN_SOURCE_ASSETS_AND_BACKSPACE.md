# Open-source assets and Backspace-inspired features in Cinder

## Free asset library
Cinder's in-app Free Asset Library links to the following upstream collections and previews representative assets. Preview files are loaded from their source repositories; before bundling an asset, verify the individual file and license.

- Lucide icons — ISC: https://lucide.dev/ and https://github.com/lucide-icons/lucide
- OpenMoji — CC BY-SA 4.0: https://openmoji.org/ and https://github.com/hfg-gmuend/openmoji
- Fluent Emoji — MIT: https://github.com/microsoft/fluentui-emoji
- Game-icons.net — CC BY 3.0: https://game-icons.net/ and https://github.com/game-icons/icons
- Google Fonts — check the license for each family: https://fonts.google.com/ and https://github.com/google/fonts

The Cinder app already bundles Lucide React and imports DM Sans, Inter, Nunito Sans, Roboto, Space Grotesk, and Atkinson Hyperlegible from Google Fonts.

## Backspace project reference
Backspace (https://github.com/TheZwiss/backspace) is a separate self-hosted Discord alternative, licensed AGPL-3.0. It is built around a different server architecture (Fastify/TypeScript, WebSockets, LiveKit, and federation), so it is not a drop-in component for Cinder's Vite/React + Supabase application. This change does not copy or vendor Backspace source code.

The compatible inspiration added here is an optional live call connection inspector inside Cinder's existing peer-to-peer call UI. It reports the browser's WebRTC connection state and, when available, round-trip time, audio jitter, packet loss, and inbound bitrate. It does not provide LiveKit SFU routing, 4K screen sharing, federation, or Backspace's full media stack.

## Before shipping
- Keep attribution and license notices for any redistributed asset.
- OpenMoji is share-alike; review CC BY-SA 4.0 obligations before modifying or bundling it.
- Game-icons artwork requires attribution.
- Backspace's AGPL-3.0 applies if its code is copied or modified into a derivative work; consult the license and legal advice before any such integration.
