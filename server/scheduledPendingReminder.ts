import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { HttpError } from "@shared/_core/errors";
import { getPendingOrdersForReminder, markOrderReminderSent, getPushSubscriptionByUser, getCustomerEmailByUserId, createEmailLog } from "./db";
import { sendPushNotification } from "./push";
import { sendCustomEmailToCustomer } from "./email";

/**
 * Heartbeat handler: send payment reminder to users with pending_payment orders.
 *
 * Runs every 6 hours. Finds orders that:
 * - Are still in pending_payment status
 * - Were created more than 1 hour ago
 * - Haven't had a reminder sent in the last 24 hours
 *
 * Sends Push Notification (if subscribed) + Email reminder.
 * Records paymentReminderSentAt to prevent duplicate reminders.
 *
 * Called by the Manus platform cron at /api/scheduled/pending-reminder.
 */

const CTA_TEXTS: Record<string, string> = {
  "zh-TW": "立即完成付款",
  "zh-CN": "立即完成付款",
  en: "Complete Payment Now",
  ja: "今すぐお支払いを完了する",
  ko: "지금 결제 완료하기",
  th: "ชำระเงินตอนนี้",
};

const REMINDER_MESSAGES: Record<string, { subject: string; push: string; email: string }> = {
  "zh-TW": {
    subject: "您有一個待付款的 eSIM 訂單",
    push: "您有一個待付款的 eSIM 訂單，請盡快完成付款以確保您的行程不受影響。",
    email: `您好，

您有一個尚未完成付款的 eSIM 訂單。請登入 SIM uncle 完成付款，以確保您的行程網路連線不受影響。

如有任何問題，請聯絡我們的客服。

SIM uncle 團隊`,
  },
  "zh-CN": {
    subject: "您有一个待付款的 eSIM 订单",
    push: "您有一个待付款的 eSIM 订单，请尽快完成付款以确保您的行程不受影响。",
    email: `您好，

您有一个尚未完成付款的 eSIM 订单。请登录 SIM uncle 完成付款，以确保您的行程网络连接不受影响。

如有任何问题，请联系我们的客服。

SIM uncle 团队`,
  },
  en: {
    subject: "You have a pending eSIM order",
    push: "You have a pending eSIM order. Please complete your payment to ensure your trip connectivity.",
    email: `Hi,

You have an eSIM order that is awaiting payment. Please log in to SIM uncle to complete your payment and ensure your travel connectivity.

If you have any questions, please contact our support team.

SIM uncle Team`,
  },
  ja: {
    subject: "お支払い待ちのeSIMご注文があります",
    push: "お支払い待ちのeSIMご注文があります。旅行の接続を確保するため、お早めにお支払いください。",
    email: `こんにちは、

お支払いが完了していないeSIMのご注文があります。SIM uncleにログインしてお支払いを完了し、旅行中のインターネット接続を確保してください。

ご不明な点がございましたら、サポートチームまでお問い合わせください。

SIM uncle チーム`,
  },
  ko: {
    subject: "결제 대기 중인 eSIM 주문이 있습니다",
    push: "결제 대기 중인 eSIM 주문이 있습니다. 여행 연결을 위해 빨리 결제를 완료해 주세요.",
    email: `안녕하세요,

결제가 완료되지 않은 eSIM 주문이 있습니다. SIM uncle에 로그인하여 결제를 완료하고 여행 중 인터넷 연결을 확보하세요.

문의 사항이 있으시면 고객 지원팀에 연락해 주세요.

SIM uncle 팀`,
  },
  th: {
    subject: "คุณมีคำสั่งซื้อ eSIM ที่รอการชำระเงิน",
    push: "คุณมีคำสั่งซื้อ eSIM ที่รอการชำระเงิน กรุณาชำระเงินให้เสร็จสิ้นเพื่อให้แน่ใจว่าการเชื่อมต่อในการเดินทางของคุณ",
    email: `สวัสดี,

คุณมีคำสั่งซื้อ eSIM ที่ยังไม่ได้ชำระเงิน กรุณาเข้าสู่ระบบ SIM uncle เพื่อชำระเงินให้เสร็จสิ้นและรับประกันการเชื่อมต่ออินเทอร์เน็ตระหว่างการเดินทาง

หากมีคำถามใด ๆ กรุณาติดต่อทีมสนับสนุนของเรา

ทีม SIM uncle`,
  },
};

export async function handleScheduledPendingReminder(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    console.log(`[PendingReminder] Starting pending payment reminder job (taskUid=${user.taskUid ?? "n/a"})`);

    // Find orders pending > 1 hour, reminder not sent in last 24 hours
    // Reminder schedule: 6h, 18h, 36h, 72h after order creation (max 4 reminders)
    const pendingOrders = await getPendingOrdersForReminder();
    console.log(`[PendingReminder] Found ${pendingOrders.length} orders needing reminder`);

    let pushSent = 0;
    let emailSent = 0;
    let skipped = 0;

    for (const order of pendingOrders) {
      const lang = (order.preferredLang ?? "zh-TW") as string;
      const messages = REMINDER_MESSAGES[lang] ?? REMINDER_MESSAGES["zh-TW"];
      let notified = false;

      // 1. Push notification (if user has subscriptions)
      if (order.userId) {
        const subs = await getPushSubscriptionByUser(order.userId);
        if (subs.length > 0) {
          for (const sub of subs) {
            const result = await sendPushNotification(sub, {
              title: messages.subject,
              body: messages.push,
              url: "/orders?status=pending_payment",
            });
            if (result === true) {
              pushSent++;
              notified = true;
            }
          }
        }
      }

      // 2. Email reminder
      // For guests: use guestEmail; for registered users: look up from users table
      let email = order.guestEmail ?? null;
      if (!email && order.userId) {
        email = await getCustomerEmailByUserId(order.userId);
      }
      // Build a direct orders page URL so the user can click "Continue Payment"
      const ordersUrl = `https://simuncle.com/orders?status=pending_payment`;
      const ctaText = CTA_TEXTS[lang] ?? CTA_TEXTS["zh-TW"];
      if (email) {
        let emailOk = false;
        try {
          await sendCustomEmailToCustomer({
            to: email,
            subject: messages.subject,
            content: messages.email,
            ctaUrl: ordersUrl,
            ctaText,
          });
          emailOk = true;
          emailSent++;
          notified = true;
        } catch (err) {
          console.error(`[PendingReminder] Email failed for order #${order.id}:`, err);
        }
        // Log email attempt
        await createEmailLog({
          orderId: order.id,
          userId: order.userId ?? null,
          toEmail: email,
          emailType: "payment_reminder",
          subject: messages.subject,
          status: emailOk ? "sent" : "failed",
          errorMessage: emailOk ? null : "sendCustomEmailToCustomer threw an error",
        }).catch((e) => console.warn("[EmailLog] Failed to write log:", e));
      }

      const reminderCount = order.paymentReminderCount ?? 0;
      if (notified) {
        await markOrderReminderSent(order.id, reminderCount);
        console.log(`[PendingReminder] Reminder #${reminderCount + 1}/4 sent for order #${order.id} (lang=${lang})`);
      } else {
        skipped++;
        // Still increment count to avoid re-checking orders with no contact info
        await markOrderReminderSent(order.id, reminderCount);
      }
    }

    const result = {
      ok: true,
      total: pendingOrders.length,
      pushSent,
      emailSent,
      skipped,
    };
    console.log("[PendingReminder] Done:", result);
    res.json(result);
  } catch (err) {
    if (err instanceof HttpError && err.statusCode >= 400 && err.statusCode < 500) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("[PendingReminder] Fatal error:", err);
    res.status(500).json({
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}
