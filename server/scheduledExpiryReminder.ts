import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { orders, users } from "../drizzle/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { sendViaResend } from "./email";

/**
 * Heartbeat handler: send expiry reminder emails 3 days before eSIM expires.
 * Called by the Manus platform cron every day at UTC 01:00.
 */

// We store which orders have already received an expiry reminder
// by checking a flag in esimData or a separate column.
// For simplicity, we add a field `expiryReminderSent` to esimData JSON.

function getExpiryDate(order: {
  esimData: unknown;
  productData: unknown;
  createdAt: Date;
}): Date | null {
  const esim = order.esimData as Record<string, unknown> | null;
  const product = order.productData as Record<string, unknown> | null;

  // 1. Use expiryDate from Vizlync esimData if available
  if (esim?.expiryDate) {
    const d = new Date(esim.expiryDate as string);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Estimate from createdAt + validityDays from productData
  const validityDays = product?.validityDays as number | undefined;
  if (validityDays && validityDays > 0) {
    const d = new Date(order.createdAt);
    d.setDate(d.getDate() + validityDays);
    return d;
  }

  return null;
}

function buildExpiryReminderHtml(params: {
  customerName: string;
  orderId: number;
  productName: string;
  expiryDate: Date;
  preferredLang?: string;
}): string {
  const lang = params.preferredLang ?? "zh-TW";
  const localeMap: Record<string, string> = { "zh-TW": "zh-TW", "zh-CN": "zh-CN", "en": "en-US", "ja": "ja-JP", "ko": "ko-KR", "th": "th-TH" };
  const locale = localeMap[lang] ?? "en-US";
  const expiryStr = params.expiryDate.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const daysLeft = Math.ceil(
    (params.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const tr = {
    "zh-TW": {
      subtitle: "eSIM 即將到期提醒",
      title: "⏰ 您的 eSIM 即將到期",
      body: `親愛的 ${params.customerName}，您的 eSIM 方案將於 <strong style="color:#16a34a;">${expiryStr}</strong>（${daysLeft} 天後）到期。`,
      orderNo: "訂單編號",
      plan: "方案",
      expiry: "到期日",
      ctaText: "立即購買續期方案，保持網路暢通！",
      ctaBtn: "🛒 立即購買 eSIM 方案",
      trackText: `您也可以前往 <a href="https://simuncle.com/track-order?orderId=${params.orderId}" style="color:#16a34a;">訂單查詢頁面</a> 查看目前 eSIM 狀態。`,
      contact: "如有疑問，請聯絡 SIM uncle 客服",
    },
    "zh-CN": {
      subtitle: "eSIM 即将到期提醒",
      title: "⏰ 您的 eSIM 即将到期",
      body: `亲爱的 ${params.customerName}，您的 eSIM 方案将于 <strong style="color:#16a34a;">${expiryStr}</strong>（${daysLeft} 天后）到期。`,
      orderNo: "订单编号",
      plan: "方案",
      expiry: "到期日",
      ctaText: "立即购买续期方案，保持网络畅通！",
      ctaBtn: "🛒 立即购买 eSIM 方案",
      trackText: `您也可以前往 <a href="https://simuncle.com/track-order?orderId=${params.orderId}" style="color:#16a34a;">订单查询页面</a> 查看目前 eSIM 状态。`,
      contact: "如有疑问，请联系 SIM uncle 客服",
    },
    "en": {
      subtitle: "eSIM Expiry Reminder",
      title: "⏰ Your eSIM is Expiring Soon",
      body: `Dear ${params.customerName}, your eSIM plan will expire on <strong style="color:#16a34a;">${expiryStr}</strong> (in ${daysLeft} day${daysLeft > 1 ? 's' : ''}).`,
      orderNo: "Order No.",
      plan: "Plan",
      expiry: "Expiry Date",
      ctaText: "Renew your plan now to stay connected!",
      ctaBtn: "🛒 Buy eSIM Plan Now",
      trackText: `You can also visit the <a href="https://simuncle.com/track-order?orderId=${params.orderId}" style="color:#16a34a;">Order Tracking Page</a> to check your eSIM status.`,
      contact: "For any questions, contact SIM uncle support",
    },
    "ja": {
      subtitle: "eSIM 有効期限切れお知らせ",
      title: "⏰ eSIM の有効期限が近づいています",
      body: `${params.customerName} 様、eSIM プランは <strong style="color:#16a34a;">${expiryStr}</strong>（${daysLeft} 日後）に有効期限が切れます。`,
      orderNo: "注文番号",
      plan: "プラン",
      expiry: "有効期限",
      ctaText: "今すぐ更新プランを購入して接続を維持しましょう！",
      ctaBtn: "🛒 eSIM プランを購入する",
      trackText: `<a href="https://simuncle.com/track-order?orderId=${params.orderId}" style="color:#16a34a;">注文確認ページ</a> で現在の eSIM 状態をご確認いただけます。`,
      contact: "ご不明な点は SIM uncle サポートまでお問い合わせください",
    },
    "ko": {
      subtitle: "eSIM 만료 알림",
      title: "⏰ eSIM 이 곳 만료됩니다",
      body: `${params.customerName} 님, eSIM 플랜이 <strong style="color:#16a34a;">${expiryStr}</strong>에 (${daysLeft}일 후) 만료됩니다.`,
      orderNo: "주문 번호",
      plan: "플랜",
      expiry: "만료일",
      ctaText: "지금 갱신 플랜을 구매하여 연결을 유지하세요!",
      ctaBtn: "🛒 eSIM 플랜 구매하기",
      trackText: `<a href="https://simuncle.com/track-order?orderId=${params.orderId}" style="color:#16a34a;">주문 조회 페이지</a>에서 현재 eSIM 상태를 확인하세요.`,
      contact: "문의사항이 있으시면 SIM uncle 고객센터로 연락해 주세요",
    },
    "th": {
      subtitle: "แจ้งเตือน eSIM ใกล้หมดอายุ",
      title: "⏰ eSIM ของคุณกำลังจะหมดอายุ",
      body: `${params.customerName} eSIM แพ็กเกจของคุณจะหมดอายุในวันที่ <strong style="color:#16a34a;">${expiryStr}</strong> (อีก ${daysLeft} วัน)`,
      orderNo: "หมายเลขคำสั่งซื้อ",
      plan: "แพ็กเกจ",
      expiry: "วันหมดอายุ",
      ctaText: "ต่ออายุแผนตอนนี้เพื่อให้เชื่อมต่อได้ต่อเนื่อง!",
      ctaBtn: "🛒 ซื้อแผน eSIM ตอนนี้",
      trackText: `เยี่ยมชม <a href="https://simuncle.com/track-order?orderId=${params.orderId}" style="color:#16a34a;">หน้าติดตามคำสั่งซื้อ</a> เพื่อตรวจสอบสถานะ eSIM ปัจจุบัน`,
      contact: "หากมีคำถาม กรุณาติดต่อฝ่ายสนับสนุน SIM uncle",
    },
  };
  const t = tr[lang as keyof typeof tr] ?? tr["en"];

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6;margin:0;padding:20px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);padding:28px 24px;text-align:center;">
      <img src="https://simuncle.com/manus-storage/logo-full-transparent_061e610c.png" alt="SIM uncle" width="160" height="auto" style="display:block;margin:0 auto 12px auto;max-width:160px;" />
      <p style="color:#15803d;margin:0;font-size:14px;">${t.subtitle}</p>
    </div>
    <!-- Body -->
    <div style="padding:24px;">
      <h2 style="color:#111827;margin:0 0 8px 0;">${t.title}</h2>
      <p style="color:#6b7280;margin:0 0 20px 0;">${t.body}</p>

      <!-- Order Summary -->
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:16px;margin-bottom:20px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">${t.orderNo}</td>
            <td style="color:#111827;font-weight:600;text-align:right;">#${params.orderId}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">${t.plan}</td>
            <td style="color:#111827;text-align:right;font-size:13px;">${params.productName}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:13px;padding:4px 0;">${t.expiry}</td>
            <td style="color:#16a34a;font-weight:700;text-align:right;">${expiryStr}</td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
        <p style="color:#15803d;margin:0 0 12px 0;font-size:14px;">${t.ctaText}</p>
        <a href="https://simuncle.com/products" style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">${t.ctaBtn}</a>
      </div>

      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">${t.trackText}</p>
    </div>
    <!-- Footer -->
    <div style="background:#f9fafb;padding:20px 24px;text-align:center;border-top:1px solid #e5e7eb;">
      <p style="margin:0 0 12px 0;">
        <a href="https://www.instagram.com/esim_uncle/" style="display:inline-block;text-decoration:none;" title="Follow us on Instagram">
          <img src="https://cdn-icons-png.flaticon.com/32/2111/2111463.png" alt="Instagram" width="28" height="28" style="border-radius:6px;vertical-align:middle;" />
        </a>
      </p>
      <p style="color:#9ca3af;font-size:12px;margin:0 0 4px 0;">${t.contact}</p>
      <p style="color:#9ca3af;font-size:11px;margin:0;">© 2026 SIM uncle · <a href="https://simuncle.com" style="color:#9ca3af;">simuncle.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

export async function handleScheduledExpiryReminder(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) return res.json({ ok: true, skipped: "no-db" });

    console.log("[ExpiryReminder] Starting expiry reminder job");

    // Find completed orders with lpaString (active eSIMs), not yet sent expiry reminder
    const activeOrders = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        guestEmail: orders.guestEmail,
        productName: orders.productName,
        esimData: orders.esimData,
        productData: orders.productData,
        createdAt: orders.createdAt,
        status: orders.status,
        preferredLang: orders.preferredLang,
      })
      .from(orders)
      .where(
        and(
          or(eq(orders.status, "completed"), eq(orders.status, "paid")),
          sql`JSON_EXTRACT(${orders.esimData}, '$.lpaString') IS NOT NULL`,
          sql`JSON_EXTRACT(${orders.esimData}, '$.expiryReminderSent') IS NULL`
        )
      )
      .limit(100);

    console.log(`[ExpiryReminder] Checking ${activeOrders.length} active orders`);

    const now = Date.now();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
    let sent = 0;

    for (const order of activeOrders) {
      try {
        const expiryDate = getExpiryDate({
          esimData: order.esimData,
          productData: order.productData,
          createdAt: order.createdAt,
        });

        if (!expiryDate) continue;

        const timeUntilExpiry = expiryDate.getTime() - now;

        // Only send if expiry is within 3 days and hasn't expired yet
        if (timeUntilExpiry <= 0 || timeUntilExpiry > threeDaysMs) continue;

        // Get customer email
        let customerEmail: string | null = order.guestEmail ?? null;
        if (!customerEmail && order.userId) {
          const userRow = await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, order.userId))
            .limit(1);
          customerEmail = userRow[0]?.email ?? null;
        }

        if (!customerEmail) continue;

        // Send reminder email
        const lang = order.preferredLang ?? "zh-TW";
        const customerNameMap: Record<string, string> = {
          "zh-TW": "顧客",
          "zh-CN": "顾客",
          "en": "Customer",
          "ja": "お客様",
          "ko": "고객님",
          "th": "ลูกค้า",
        };
        const html = buildExpiryReminderHtml({
          customerName: customerNameMap[lang] ?? "Customer",
          orderId: order.id,
          productName: String(order.productName ?? ""),
          expiryDate,
          preferredLang: lang,
        });

        const localeMap2: Record<string, string> = { "zh-TW": "zh-TW", "zh-CN": "zh-CN", "en": "en-US", "ja": "ja-JP", "ko": "ko-KR", "th": "th-TH" };
        const expiryStr = expiryDate.toLocaleDateString(localeMap2[lang] ?? "en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const subjectMap: Record<string, string> = {
          "zh-TW": `⏰ 您的 eSIM 即將到期 - 訂單 #${order.id} | SIM uncle`,
          "zh-CN": `⏰ 您的 eSIM 即将到期 - 订单 #${order.id} | SIM uncle`,
          "en": `⏰ Your eSIM is Expiring Soon - Order #${order.id} | SIM uncle`,
          "ja": `⏰ eSIM の有効期限が近づいています - 注文 #${order.id} | SIM uncle`,
          "ko": `⏰ eSIM 이 곳 만료됩니다 - 주문 #${order.id} | SIM uncle`,
          "th": `⏰ eSIM ของคุณกำลังจะหมดอายุ - คำสั่งซื้อ #${order.id} | SIM uncle`,
        };
        const textMap: Record<string, string> = {
          "zh-TW": `您的 eSIM 方案（訂單 #${order.id}）將於 ${expiryStr} 到期。立即前往 https://simuncle.com/products 購買續期方案。`,
          "zh-CN": `您的 eSIM 方案（订单 #${order.id}）将于 ${expiryStr} 到期。立即前往 https://simuncle.com/products 购买续期方案。`,
          "en": `Your eSIM plan (Order #${order.id}) will expire on ${expiryStr}. Visit https://simuncle.com/products to renew now.`,
          "ja": `eSIM プラン（注文 #${order.id}）は ${expiryStr} に有効期限が切れます。https://simuncle.com/products で更新プランをご購入ください。`,
          "ko": `eSIM 플랜 (주문 #${order.id})이 ${expiryStr}에 만료됩니다. https://simuncle.com/products 에서 갱신 플랜을 구매하세요.`,
          "th": `eSIM แพ็กเกจ (คำสั่งซื้อ #${order.id}) จะหมดอายุในวันที่ ${expiryStr} เยี่ยมชม https://simuncle.com/products เพื่อต่ออายุตอนนี้`,
        };

        const emailSent = await sendViaResend({
          to: customerEmail,
          subject: subjectMap[lang] ?? subjectMap["en"],
          html,
          text: textMap[lang] ?? textMap["en"],
        });

        if (emailSent) {
          // Mark expiryReminderSent in esimData
          const esimData = (order.esimData as Record<string, unknown>) ?? {};
          await db
            .update(orders)
            .set({
              esimData: { ...esimData, expiryReminderSent: new Date().toISOString() },
            })
            .where(eq(orders.id, order.id));

          sent++;
          console.log(`[ExpiryReminder] Order #${order.id}: reminder sent to ${customerEmail}, expires ${expiryDate.toISOString()}`);
        }
      } catch (e) {
        console.error(`[ExpiryReminder] Order #${order.id}: error:`, e);
      }
    }

    console.log(`[ExpiryReminder] Done. Sent ${sent} reminders.`);
    res.json({ ok: true, checked: activeOrders.length, sent });
  } catch (err) {
    console.error("[ExpiryReminder] Fatal error:", err);
    res.status(500).json({
      error: String(err),
      timestamp: new Date().toISOString(),
    });
  }
}
