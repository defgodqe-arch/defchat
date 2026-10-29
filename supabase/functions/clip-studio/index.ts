import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://defgodqe-arch.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST to analyze a video." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Supabase function environment is incomplete." }, 500);

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Sign in to use AI Clip Studio." }, 401);
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: "Your session is invalid or expired. Sign in again." }, 401);

  const processorUrl = Deno.env.get("CLIP_PROCESSOR_URL");
  const processorKey = Deno.env.get("CLIP_PROCESSOR_KEY");

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Send a valid JSON request." }, 400); }
  const sourceType = body.sourceType === "upload" ? "upload" : "url";
  const sourceUrl = typeof body.url === "string" ? body.url.trim() : "";
  const sourcePath = typeof body.sourcePath === "string" ? body.sourcePath.trim() : "";
  const clipLength = Number(body.clipLength ?? 30);
  const clipCount = Number(body.clipCount ?? 5);
  const aspectRatio = String(body.aspectRatio ?? "9:16");
  const captionStyle = String(body.captionStyle ?? "bold");

  if (sourceType === "url") {
    let parsed: URL;
    try { parsed = new URL(sourceUrl); } catch { return json({ error: "Enter a valid video URL." }, 400); }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (!(host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be" || host === "vimeo.com" || host.endsWith(".vimeo.com") || host === "twitch.tv" || host.endsWith(".twitch.tv"))) {
      return json({ error: "Supported links are YouTube, Vimeo, and Twitch." }, 400);
    }
  } else if (!sourcePath.startsWith(user.id + "/")) {
    return json({ error: "The uploaded source must be stored in your own clip-studio folder." }, 403);
  }
  if (!Number.isInteger(clipLength) || clipLength < 10 || clipLength > 180) return json({ error: "Clip length must be between 10 and 180 seconds." }, 400);
  if (!Number.isInteger(clipCount) || clipCount < 1 || clipCount > 20) return json({ error: "Choose between 1 and 20 clips." }, 400);
  if (!["9:16", "1:1", "16:9"].includes(aspectRatio)) return json({ error: "Unsupported aspect ratio." }, 400);
  if (!["bold", "minimal", "karaoke"].includes(captionStyle)) return json({ error: "Unsupported caption style." }, 400);

  const admin = createClient(supabaseUrl, serviceKey);
  let processorSource = sourceUrl;
  if (sourceType === "upload") {
    const { data, error } = await admin.storage.from("clip-studio").createSignedUrl(sourcePath, 60 * 60);
    if (error || !data?.signedUrl) return json({ error: "Could not access the uploaded video. Upload it again and retry." }, 400);
    processorSource = data.signedUrl;
  }

  const { data: job, error: jobError } = await admin.from("clip_jobs").insert({
    user_id: user.id, status: "processing", source_type: sourceType,
    source_url: sourceType === "url" ? sourceUrl : null,
    source_path: sourceType === "upload" ? sourcePath : null,
    clip_length: clipLength, clip_count: clipCount, aspect_ratio: aspectRatio,
    caption_style: captionStyle
  }).select("id").single();
  if (jobError || !job) return json({ error: "Could not create the clip job in Supabase." }, 500);
  if (!processorUrl) {
    const message = "Supabase is connected, but the video-rendering engine is not configured yet. Set the CLIP_PROCESSOR_URL secret to a service that supports highlight detection, captions, vertical reframing, and MP4 rendering. No fake clips were generated.";
    await admin.from("clip_jobs").update({ status: "failed", error_message: message, updated_at: new Date().toISOString() }).eq("id", job.id);
    return json({ error: message, jobId: job.id }, 503);
  }

  try {
    const response = await fetch(processorUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(processorKey ? { "Authorization": "Bearer " + processorKey } : {}) },
      body: JSON.stringify({
        jobId: job.id, userId: user.id, sourceType, sourceUrl: processorSource,
        clipLength, clipCount, aspectRatio, captionStyle,
        output: { bucket: "clip-studio", prefix: user.id + "/" + job.id + "/" }
      }),
      signal: AbortSignal.timeout(15000)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "The video processor rejected this job.");
    const clips = Array.isArray(result.clips) ? result.clips : [];
    if (!clips.length) {
      return json({ jobId: job.id, status: "processing", message: "The job was accepted by the video processor and is still processing.", clips: [] }, 202);
    }
    await admin.from("clip_jobs").update({ status: "completed", clips, updated_at: new Date().toISOString() }).eq("id", job.id);
    return json({ jobId: job.id, status: "completed", clips });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Video processing failed.";
    await admin.from("clip_jobs").update({ status: "failed", error_message: message.slice(0, 500), updated_at: new Date().toISOString() }).eq("id", job.id);
    return json({ error: message, jobId: job.id }, 502);
  }
});