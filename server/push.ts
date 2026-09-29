import webpush from "web-push";

let _initialized = false;

function initWebPush() {
  if (_initialized) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn("[WebPush] VAPID keys not configured");
    return;
  }
  webpush.setVapidDetails(
    "mailto:support@simuncle.com",
    publicKey,
    privateKey
  );
  _initialized = true;
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string; icon?: string }
) {
  initWebPush();
  const pushSub = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };
  try {
    await webpush.sendNotification(pushSub, JSON.stringify(payload));
    return true;
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string };
    // 410 Gone = subscription expired/unsubscribed
    if (error.statusCode === 410 || error.statusCode === 404) {
      return "expired";
    }
    console.error("[WebPush] Send failed:", error.message);
    return false;
  }
}

export async function sendPushToAll(
  subscriptions: { endpoint: string; p256dh: string; auth: string }[],
  payload: { title: string; body: string; url?: string }
) {
  initWebPush();
  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, payload))
  );
  const sent = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
  const expired = results.filter((r) => r.status === "fulfilled" && r.value === "expired").length;
  const failed = results.filter((r) => r.status === "fulfilled" && r.value === false).length;
  return { sent, expired, failed, total: subscriptions.length };
}
