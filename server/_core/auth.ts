/**
 * Self-hosted login: Google OAuth + email magic link.
 * Replaces the Manus OAuth portal. Sessions are the same signed JWT cookie
 * (COOKIE_NAME) as before, keyed on users.openId.
 *
 * Existing users (created under Manus) are matched by email, so their
 * orders, cart, referral code and admin role carry over automatically.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { createHash, randomBytes } from "crypto";
import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { sendViaResend } from "../email";
import { sdk } from "./sdk";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const STATE_COOKIE = "oauth_state";
const MAGIC_LINK_TTL_S = 15 * 60;

const secretKey = () => new TextEncoder().encode(ENV.cookieSecret);

function publicOrigin(req: Request) {
  if (ENV.publicUrl) return ENV.publicUrl.replace(/\/+$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim() || req.protocol;
  return `${proto}://${req.get("host")}`;
}

/** Only allow same-site relative paths as post-login destinations. */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  if (value.startsWith("/api/")) return "/";
  return value.slice(0, 512);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function signToken(payload: Record<string, unknown>, ttlSeconds: number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(secretKey());
}

async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
  return payload as Record<string, unknown>;
}

async function startSession(req: Request, res: Response, email: string, name: string | null, method: "google" | "email", providerId: string) {
  const user = await db.findOrCreateUserByEmail({ email, name, loginMethod: method, providerId });
  const token = await sdk.createSessionToken(user.openId, { name: user.name || email, expiresInMs: ONE_YEAR_MS });
  res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
}

function loginErrorRedirect(res: Response, code: string, returnTo = "/") {
  res.redirect(302, `/login?error=${encodeURIComponent(code)}&returnTo=${encodeURIComponent(returnTo)}`);
}

// ── Simple in-memory rate limit for magic-link requests ──────────────────────
const recentRequests = new Map<string, number[]>();
function rateLimited(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const hits = (recentRequests.get(key) ?? []).filter(t => now - t < windowMs);
  hits.push(now);
  recentRequests.set(key, hits);
  if (recentRequests.size > 5000) recentRequests.clear();
  return hits.length > max;
}

type MagicCopy = { subject: string; title: string; body: string; button: string; ignore: string };

const MAGIC_COPY: Record<string, MagicCopy> = {
  "zh-TW": { subject: "你的 SIM uncle 登入連結", title: "登入 SIM uncle", body: "請按下面的按鈕登入。連結 15 分鐘內有效，只可使用一次。", button: "登入", ignore: "如你沒有要求登入，請忽略此電郵。" },
  "zh-CN": { subject: "你的 SIM uncle 登录链接", title: "登录 SIM uncle", body: "请点击下面的按钮登录。链接 15 分钟内有效，只能使用一次。", button: "登录", ignore: "如果你没有请求登录，请忽略此邮件。" },
  en: { subject: "Your SIM uncle sign-in link", title: "Sign in to SIM uncle", body: "Click the button below to sign in. The link is valid for 15 minutes and can be used once.", button: "Sign in", ignore: "If you didn't request this, you can ignore this email." },
  ja: { subject: "SIM uncle ログインリンク", title: "SIM uncle にログイン", body: "下のボタンからログインしてください。リンクは15分間有効で、1回のみ使用できます。", button: "ログイン", ignore: "心当たりがない場合は、このメールを無視してください。" },
  ko: { subject: "SIM uncle 로그인 링크", title: "SIM uncle 로그인", body: "아래 버튼을 눌러 로그인하세요. 링크는 15분 동안 유효하며 한 번만 사용할 수 있습니다.", button: "로그인", ignore: "요청하지 않으셨다면 이 이메일을 무시하세요." },
  th: { subject: "ลิงก์เข้าสู่ระบบ SIM uncle", title: "เข้าสู่ระบบ SIM uncle", body: "กดปุ่มด้านล่างเพื่อเข้าสู่ระบบ ลิงก์ใช้ได้ 15 นาทีและใช้ได้เพียงครั้งเดียว", button: "เข้าสู่ระบบ", ignore: "หากคุณไม่ได้ร้องขอ โปรดละเว้นอีเมลนี้" },
};

function magicCopy(lang: unknown): MagicCopy {
  return (typeof lang === "string" && MAGIC_COPY[lang]) || MAGIC_COPY["zh-TW"];
}

function magicLinkEmailHtml(link: string, c: MagicCopy) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1f2933">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;border:1px solid #e3e8ef">
    <h1 style="font-size:20px;margin:0 0 12px">${c.title}</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 24px">${c.body}</p>
    <p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#0f62fe;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:600">${c.button}</a></p>
    <p style="font-size:13px;color:#697586;line-height:1.6;margin:0">${c.ignore}</p>
  </div></body></html>`;
}

// Magic-link tokens are single-use: remember consumed token ids until they expire.
const usedTokenIds = new Map<string, number>();
function consumeTokenId(jti: string, expSeconds: number) {
  const now = Date.now();
  usedTokenIds.forEach((exp, id) => { if (exp < now) usedTokenIds.delete(id); });
  if (usedTokenIds.has(jti)) return false;
  usedTokenIds.set(jti, expSeconds * 1000);
  return true;
}

export function registerAuthRoutes(app: Express) {
  // Which login methods are configured (used by the /login page).
  app.get("/api/auth/providers", (_req, res) => {
    res.json({ google: Boolean(ENV.googleClientId && ENV.googleClientSecret), email: Boolean(process.env.RESEND_API_KEY && (ENV.publicUrl || !ENV.isProduction)) });
  });

  // ── Google ──────────────────────────────────────────────────────────────────
  app.get("/api/auth/google", async (req, res) => {
    if (!ENV.googleClientId || !ENV.googleClientSecret) return loginErrorRedirect(res, "google_not_configured");
    const returnTo = safeReturnTo(req.query.returnTo);
    const nonce = randomBytes(16).toString("hex");
    const state = await signToken({ nonce, returnTo }, 10 * 60);
    res.cookie(STATE_COOKIE, nonce, { ...getSessionCookieOptions(req), maxAge: 10 * 60 * 1000 });

    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", ENV.googleClientId);
    url.searchParams.set("redirect_uri", `${publicOrigin(req)}/api/auth/google/callback`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "select_account");
    res.redirect(302, url.toString());
  });

  app.get("/api/auth/google/callback", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    let returnTo = "/";
    try {
      if (!code || !state) return loginErrorRedirect(res, "google_cancelled");
      const statePayload = await verifyToken(state);
      returnTo = safeReturnTo(statePayload.returnTo);
      const cookieNonce = req.headers.cookie?.split(";").map(c => c.trim()).find(c => c.startsWith(`${STATE_COOKIE}=`))?.slice(STATE_COOKIE.length + 1);
      if (!cookieNonce || cookieNonce !== statePayload.nonce) return loginErrorRedirect(res, "state_mismatch", returnTo);
      res.clearCookie(STATE_COOKIE, getSessionCookieOptions(req));

      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: ENV.googleClientId,
          client_secret: ENV.googleClientSecret,
          redirect_uri: `${publicOrigin(req)}/api/auth/google/callback`,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenRes.ok) throw new Error(`token exchange failed (${tokenRes.status}): ${await tokenRes.text()}`);
      const { access_token } = (await tokenRes.json()) as { access_token?: string };
      if (!access_token) throw new Error("no access_token from Google");

      const infoRes = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${access_token}` } });
      if (!infoRes.ok) throw new Error(`userinfo failed (${infoRes.status})`);
      const info = (await infoRes.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
      if (!info.sub || !info.email || info.email_verified !== true) return loginErrorRedirect(res, "email_not_verified", returnTo);

      await startSession(req, res, normalizeEmail(info.email), info.name ?? null, "google", info.sub);
      res.redirect(302, returnTo);
    } catch (error) {
      console.error("[Auth] Google callback failed", error);
      loginErrorRedirect(res, "google_failed", returnTo);
    }
  });

  // ── Email magic link ───────────────────────────────────────────────────────
  app.post("/api/auth/email/request", async (req, res) => {
    const email = typeof req.body?.email === "string" ? normalizeEmail(req.body.email) : "";
    const returnTo = safeReturnTo(req.body?.returnTo);
    if (!EMAIL_RE.test(email) || email.length > 320) return res.status(400).json({ error: "invalid_email" });
    // Links in emails must never be built from the (client-controlled) Host header.
    if (!process.env.RESEND_API_KEY || (ENV.isProduction && !ENV.publicUrl)) return res.status(503).json({ error: "email_not_configured" });
    if (rateLimited(`email:${email}`, 3, 10 * 60 * 1000) || rateLimited(`ip:${req.ip}`, 10, 10 * 60 * 1000)) {
      return res.status(429).json({ error: "too_many_requests" });
    }

    try {
      const token = await signToken({ purpose: "magic", email, returnTo, jti: randomBytes(12).toString("hex") }, MAGIC_LINK_TTL_S);
      // Link opens a confirm page (a button POSTs the token) so email link scanners
      // that prefetch URLs can't burn the one-time token.
      const link = `${publicOrigin(req)}/login/verify?token=${encodeURIComponent(token)}`;
      const copy = magicCopy(req.body?.lang);
      const sent = await sendViaResend({
        to: email,
        subject: copy.subject,
        html: magicLinkEmailHtml(link, copy),
        text: `${copy.title}: ${link}\n\n${copy.body}\n${copy.ignore}`,
      });
      if (!sent) throw new Error("Resend failed");
      res.json({ ok: true });
    } catch (error) {
      console.error("[Auth] Failed to send magic link", error);
      res.status(500).json({ error: "send_failed" });
    }
  });

  app.post("/api/auth/email/verify", async (req, res) => {
    const token = typeof req.body?.token === "string" ? req.body.token : "";
    try {
      const payload = await verifyToken(token);
      const returnTo = safeReturnTo(payload.returnTo);
      const email = typeof payload.email === "string" ? payload.email : "";
      const jti = typeof payload.jti === "string" ? payload.jti : "";
      if (payload.purpose !== "magic" || !email || !jti) return res.status(400).json({ error: "link_invalid" });
      if (!consumeTokenId(jti, Number(payload.exp))) return res.status(400).json({ error: "link_used" });

      const providerId = createHash("sha256").update(email).digest("hex");
      await startSession(req, res, email, null, "email", providerId);
      res.json({ ok: true, returnTo });
    } catch (error) {
      console.warn("[Auth] Magic link verification failed", String(error));
      res.status(400).json({ error: "link_expired" });
    }
  });
}
