import { TRPCError } from "@trpc/server";
import { sendViaResend } from "../email";
import { ENV } from "./env";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 200;
const CONTENT_MAX_LENGTH = 20000;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";

  if (!title) throw new TRPCError({ code: "BAD_REQUEST", message: "Notification title is required." });
  if (!content) throw new TRPCError({ code: "BAD_REQUEST", message: "Notification content is required." });
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.` });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.` });
  }
  return { title, content };
};

/**
 * Emails the shop owner (OWNER_EMAIL, or the first ADMIN_EMAILS entry) through Resend.
 * Returns `true` if the email was accepted, `false` when it could not be sent
 * (no owner address, no Resend key, or Resend unreachable) so callers can carry on.
 * Validation errors bubble up as TRPC errors so callers can fix the payload.
 */
export async function notifyOwner(payload: NotificationPayload): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  if (!ENV.ownerEmail) {
    console.warn("[Notification] OWNER_EMAIL / ADMIN_EMAILS not set; owner notification skipped:", title);
    return false;
  }

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.6;color:#1f2933">
  <h2 style="margin:0 0 12px;font-size:16px">${escapeHtml(title)}</h2>
  <div style="white-space:pre-wrap">${escapeHtml(content)}</div>
</div>`;

  return sendViaResend({ to: ENV.ownerEmail, subject: `[SIM uncle] ${title}`, html, text: content });
}
