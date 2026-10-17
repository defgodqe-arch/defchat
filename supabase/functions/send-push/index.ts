import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "https://defgodqe-arch.github.io",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version, x-defchat-hook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...cors, "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    ?? (Deno.env.get("SUPABASE_SECRET_KEYS") ? JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")!)["default"] : undefined);
  if (!supabaseUrl || !serviceKey) return json({ error: "Server configuration is incomplete" }, 500);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: config, error: configError } = await admin.from("push_config")
    .select("vapid_public_key,vapid_private_key,webhook_secret").eq("singleton", true).maybeSingle();
  if (configError || !config) return json({ error: "Push delivery is not configured" }, 503);

  const hookSecret = req.headers.get("x-defchat-hook-secret");
  if (hookSecret) {
    if (hookSecret !== config.webhook_secret) return json({ error: "Unauthorized" }, 401);
    try {
      const { table, record } = await req.json();
      if (!(record?.user_id || (table === "friend_requests" && record?.sender_id)) || !["messages", "dm_messages", "friend_requests"].includes(table)) return json({ ok: true, ignored: true });
      const senderId = record.user_id || record.sender_id;
      let recipients: string[] = [];
      let title = "New message";
      let body = String(record.content || "Sent an attachment").slice(0, 180);
      if (table === "messages") {
        const { data: channel } = await admin.from("channels").select("id,name,server_id").eq("id", record.channel_id).maybeSingle();
        if (!channel) return json({ ok: true, ignored: true });
        title = "#" + (channel.name || "channel");
        const { data: members } = await admin.from("server_members").select("user_id").eq("server_id", channel.server_id).neq("user_id", senderId);
        recipients = (members || []).map((m: { user_id: string }) => m.user_id);
      } else if (table === "dm_messages") {
        const { data: members } = await admin.from("dm_members").select("user_id").eq("conversation_id", record.conversation_id).neq("user_id", senderId);
        recipients = (members || []).map((m: { user_id: string }) => m.user_id);
        const { data: sender } = await admin.from("profiles").select("username").eq("id", senderId).maybeSingle();
        title = sender?.username || "Direct message";
      } else {
        recipients = record.receiver_id ? [record.receiver_id] : [];
        const { data: sender } = await admin.from("profiles").select("username").eq("id", record.sender_id).maybeSingle();
        title = "Friend request";
        body = "@" + (sender?.username || "Someone") + " sent you a friend request.";
      }
      if (!recipients.length) return json({ ok: true, sent: 0 });
      const { data: subscriptions } = await admin.from("push_subscriptions")
        .select("id,user_id,endpoint,subscription").in("user_id", recipients);
      webpush.setVapidDetails("mailto:notifications@defchat.app", config.vapid_public_key, config.vapid_private_key);
      const targetUrl = "https://defgodqe-arch.github.io/defchat/";
      let sent = 0;
      await Promise.all((subscriptions || []).map(async (sub: { id: string; endpoint: string; subscription: object }) => {
        try {
          await webpush.sendNotification(sub.subscription, JSON.stringify({
            title: "defchat · " + title, body, url: targetUrl,
            tag: "defchat-" + (table === "dm_messages" ? record.conversation_id : table === "messages" ? record.channel_id : "friend-request"),
          }), { TTL: 3600, urgency: "high" });
          sent++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", sub.id);
          else console.error("Push delivery failed", status || "unknown");
        }
      }));
      return json({ ok: true, sent });
    } catch (e) {
      console.error("Push webhook error", e);
      return json({ error: "Could not process notification event" }, 500);
    }
  }

  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return json({ error: "Sign in to manage push notifications" }, 401);
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return json({ error: "Your session expired. Sign in again." }, 401);
    const userId = userData.user.id;
    const input = await req.json().catch(() => ({}));
    if (input.action === "public-key") return json({ publicKey: config.vapid_public_key });
    if (input.action === "subscribe") {
      const subscription = input.subscription;
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return json({ error: "Invalid browser subscription" }, 400);
      const { data: existing } = await admin.from("push_subscriptions").select("user_id").eq("endpoint", subscription.endpoint).maybeSingle();
      if (existing && existing.user_id !== userId) return json({ error: "This browser subscription belongs to another account. Disable notifications on that account first." }, 409);
      const { error } = await admin.from("push_subscriptions").upsert({
        user_id: userId, endpoint: subscription.endpoint, subscription, updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });
      if (error) return json({ error: "Could not save notification subscription" }, 500);
      return json({ ok: true });
    }
    if (input.action === "unsubscribe") {
      const endpoint = String(input.endpoint || "");
      if (endpoint) await admin.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
      return json({ ok: true });
    }
    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("Push subscription error", e);
    return json({ error: "Could not update notification settings" }, 500);
  }
});
