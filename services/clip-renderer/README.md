# defchat self-hosted clip renderer

A private FastAPI + FFmpeg service for defchat. It ranks candidate segments using audio energy, reframes them to the requested aspect ratio, optionally transcribes speech with faster-whisper, renders H.264/AAC MP4 files, and uploads outputs to the user's job folder in Supabase Storage.

## Deploy

Build and run this directory as a Docker container on a persistent container host (Cloud Run, Fly.io, Render private service, or your own VPS). Supabase Edge Functions are not suitable for running FFmpeg workloads.

Required environment variables (set in the hosting provider's secret manager):
- `SUPABASE_URL`: project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role secret; server-side only, never put it in Vite or the browser
- `CLIP_PROCESSOR_KEY`: long random secret shared with the Supabase Edge Function
- `ENABLE_ASR`: `true` (default) or `false`
- `WHISPER_MODEL`: faster-whisper model name, default `base`

Optional: `CLIP_BUCKET` (default `clip-studio`), `MAX_SOURCE_BYTES` (default 1 GiB), `MAX_SOURCE_SECONDS` (default 7200).

Example:
```sh
docker build -t defchat-clip-renderer .
docker run --rm -p 8080:8080 --env-file .env defchat-clip-renderer
```

Set the deployed service's `/process` URL as the Supabase Edge Function secret `CLIP_PROCESSOR_URL`, and set the same random key as `CLIP_PROCESSOR_KEY` using the Supabase dashboard's Edge Function Secrets page. Do not commit a populated .env file.

## Input restrictions

- Accepts direct HTTPS video-file URLs and signed Supabase Storage URLs (including uploads made through defchat).
- Does not extract streams from YouTube/Vimeo/Twitch webpages. A platform page is not a downloadable media file; use a video file you own or have permission to process.
- The output prefix is checked against the authenticated job's user ID and job ID.
- Audio-energy ranking is a lightweight highlight heuristic, not semantic AI highlight understanding. Speech captions use faster-whisper; the first request downloads the selected model and needs sufficient disk/RAM. Disable ASR if the host is too small.
- For production, place the service behind HTTPS, restrict ingress where possible, monitor resource usage, and set request/time limits at the host. Never expose the Supabase service-role key to clients.
