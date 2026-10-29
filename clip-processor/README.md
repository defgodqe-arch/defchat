# defchat AI Clip Processor

This is the real media-processing service for AI Clip Studio. It uses FFmpeg to render MP4s, faster-whisper to transcribe speech, transcript-based scoring to select non-overlapping highlight windows, burns captions into the video, and stores output clips in the private Supabase `clip-studio` bucket.

## Deploy on Render

1. In Render, choose **New + → Blueprint** and connect `defgodqe-arch/defchat`. Render will read the repository's `render.yaml`.
2. Set these environment variables on the service:
   - `SUPABASE_URL=https://jklhnhnxyzqjvmqgfpjs.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: the project's service-role/secret key. Keep it server-side only.
   - `CLIP_PROCESSOR_KEY`: generate a long random secret and keep it private.
   - `WHISPER_MODEL=small` (first startup downloads the model).
3. Wait for the deployment to finish and check `https://YOUR-RENDER-SERVICE.onrender.com/health`. It should return JSON with `"ok": true` and `"configured": true`.

The worker needs a container that can run FFmpeg and Whisper. Processing can take several minutes. The first model download can make startup slower.

## Connect Supabase Edge Function

In Supabase Dashboard → Edge Functions → Secrets, set these function secrets:

- `CLIP_PROCESSOR_URL=https://YOUR-RENDER-SERVICE.onrender.com/process`
- `CLIP_PROCESSOR_KEY=` the exact same secret configured in Render

Do not put the service-role key or processor key into frontend code or commit them to GitHub. The public frontend only uses the Supabase publishable key.

## Processing notes

- Uploads are stored in a private bucket, and rendered outputs stay private; the worker returns signed URLs that expire after seven days.
- YouTube/Vimeo/Twitch links work only when the source is accessible to the downloader and platform rules permit it. Upload a video you own if the platform blocks access.
- The current highlight selection uses speech transcription and transcript heuristics, not a proprietary multimodal highlight model.
- Render may require a paid container plan for reliable memory/CPU while running Whisper and FFmpeg. Do not upgrade to a paid plan without reviewing the cost first.
