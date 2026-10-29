# defchat AI Clip Processor — 100% free local setup

This version processes videos on your own Windows PC. No Render account, payment card, or paid hosting is needed. Your PC must remain on while processing.

## 1. Install prerequisites

1. Install Python 3.11 from https://www.python.org/downloads/windows/ and enable **Add Python to PATH**.
2. Open PowerShell and install FFmpeg:
   `winget install --id Gyan.FFmpeg.Shared --exact`
3. Copy `.env.example` to `.env` in this folder.
4. Open `.env` and set `SUPABASE_SERVICE_ROLE_KEY` to your project's private server-side key from Supabase Dashboard → Project Settings → API Keys. Do not share it or commit the real `.env` file.

## 2. Start the processor

Double-click `start-windows.bat` in this folder. It creates a Python virtual environment, installs dependencies, and starts the local API. The first install can take a while; Whisper also downloads its model the first time it processes audio.

Open http://127.0.0.1:8765/health. The response should include `"ok": true` and `"configured": true`. Keep the terminal window open while using AI Clip Studio.

## 3. Use AI Clip Studio

1. Open https://defgodqe-arch.github.io/defchat/ and sign in.
2. Open AI Clip Studio and upload a video you own for your first test.
3. Start processing and keep your PC and processor terminal running until the clips finish.

## Free-tier and safety notes

- Processing runs locally; it will not work while your PC is off or the local processor is stopped.
- Supabase free-tier storage and bandwidth limits still apply.
- YouTube/Vimeo/Twitch may block downloading. Uploading a video you have permission to use is the most reliable test.
- Do not port-forward or expose port 8765 to the internet.
- The engine selects highlights using speech transcription and transcript heuristics; it is not a proprietary multimodal highlight model.
