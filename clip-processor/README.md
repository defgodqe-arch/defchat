# AI Clip Studio processing

The public defchat website now renders uploaded video clips directly in the user's browser with FFmpeg WebAssembly. You do not need to deploy this Python processor, use Render, add a payment card, or install a local server.

## Using it
1. Open https://defgodqe-arch.github.io/defchat/ and open AI Clip Studio.
2. Choose **Upload video** and select a local video file under 500 MB.
3. Choose clip length, number of clips, and aspect ratio, then select **Create clips in browser**.
4. Wait for the MP4 files to render, then preview or download each clip.

The first run downloads the FFmpeg WebAssembly core from jsDelivr; it runs in the browser. Processing consumes your device's CPU and memory, so shorter MP4 videos work best.

## Current limits
- This browser version creates evenly spaced MP4 clips. It does not yet use AI to detect the most interesting moments or burn captions into the video.
- YouTube, Vimeo, and Twitch links cannot be downloaded reliably from a browser due to platform restrictions; upload a video file instead.
- Files are processed locally in the browser and are not uploaded to Supabase by this flow.
- Browser support and available memory vary by device. A failed render should be retried with a smaller/shorter MP4.
