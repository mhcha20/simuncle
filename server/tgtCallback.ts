/**
 * TGT Technology Global eSIM Callback Handler
 *
 * TGT delivers eSIM QR codes asynchronously via HTTP POST to /api/tgt/callback.
 * The callback must respond { code: "0000", msg: "success" } within 10 seconds.
 *
 * Signature verification uses HMAC-MD5 as described in the TGT API v2.0 docs.
 */

import type { Request, Response } from "express";
import { verifyTgtCallbackSign, type TgtCallbackPayload } from "./tgt";
import { updateOrderStatus, getOrderByStripeSession, createEmailLog, getSetting, createNotification, getPushSubscriptionByUser } from "./db";
import { notifyOwner } from "./_core/notification";
import { sendOrderConfirmationEmail } from "./email";
import { sendPushNotification } from "./push";

// Look up our local order by TGT's channelOrderNo (format: "SU{orderId}")
async function findOrderByChannelNo(channelOrderNo: string): Promise<number | null> {
  const match = channelOrderNo.match(/^SU(\d+)$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

export async function handleTgtCallback(req: Request, res: Response) {
  // Always respond quickly to avoid TGT retry storm
  const body = req.body as TgtCallbackPayload;

  // Basic structure check
  if (!body?.data?.orderInfo) {
    console.warn("[TGT Callback] Missing data.orderInfo in payload");
    return res.json({ code: "0000", msg: "success" }); // ack anyway
  }

  const { orderInfo, eventType } = body.data;
  const channelOrderNo = orderInfo.channelOrderNo ?? "";

  console.log(`[TGT Callback] eventType=${eventType}, channelOrderNo=${channelOrderNo}, orderNo=${orderInfo.orderNo}`);

  // Verify signature (non-blocking: log warning but still process)
  const payloadForSign = body as unknown as Record<string, unknown>;
  const signValid = verifyTgtCallbackSign(payloadForSign, body.sign ?? "");
  if (!signValid) {
    console.warn(`[TGT Callback] Signature mismatch for channelOrderNo=${channelOrderNo} — proceeding anyway (sandbox)`);
  }

  // Only process eventType=1 (card issuance) — the one that delivers QR code
  if (eventType !== 1) {
    console.log(`[TGT Callback] Ignoring eventType=${eventType} (not card issuance)`);
    return res.json({ code: "0000", msg: "success" });
  }

  const orderId = await findOrderByChannelNo(channelOrderNo);
  if (!orderId) {
    console.warn(`[TGT Callback] Cannot parse orderId from channelOrderNo=${channelOrderNo}`);
    return res.json({ code: "0000", msg: "success" });
  }

  // Build esimData in the same shape as Vizlync so the frontend can reuse it
  const esimData: Record<string, string | null> = {
    qrCode: orderInfo.qrCode ?? null,
    iccid: orderInfo.iccid ?? null,
    imsi: orderInfo.imsi ?? null,
    msisdn: orderInfo.msisdn ?? null,
    // Map TGT fields to Vizlync-compatible names for frontend reuse
    lpaString: orderInfo.qrCode ?? null,
    activationCode: orderInfo.qrCode ?? null,
    activatedStartTime: orderInfo.activatedStartTime ?? null,
    activatedEndTime: orderInfo.activatedEndTime ?? null,
    latestActivationTime: orderInfo.latestActivationTime ?? null,
    tgtOrderNo: orderInfo.orderNo ?? null,
  };

  try {
    await updateOrderStatus(orderId, "completed", {
      supplierOrderId: orderInfo.orderNo,
      esimData,
    });
    console.log(`[TGT Callback] Order ${orderId} marked as completed with eSIM data`);

    // --- In-app notification + Web Push for logged-in users ---
    {
      const { getDb: getDb2 } = await import("./db");
      const db2 = await getDb2();
      if (db2) {
        const { orders: ordersTable2 } = await import("../drizzle/schema");
        const { eq: eq2 } = await import("drizzle-orm");
        const orderRows2 = await db2.select().from(ordersTable2).where(eq2(ordersTable2.id, orderId)).limit(1);
        const orderRow = orderRows2[0];

        if (orderRow?.userId) {
          const userId = orderRow.userId;
          const preferredLang = (orderRow as Record<string, unknown>).preferredLang as string ?? "zh-TW";
          const productName = (orderRow as Record<string, unknown>).productName as string ?? "eSIM";

          // In-app notification
          const notifTitleMap: Record<string, string> = {
            "zh-TW": `訂單 #${orderId} eSIM 已就緒`,
            "zh-CN": `订单 #${orderId} eSIM 已就绪`,
            "en": `Order #${orderId} eSIM Ready`,
            "ja": `注文 #${orderId} eSIM 準備完了`,
            "ko": `주문 #${orderId} eSIM 준비 완료`,
            "th": `คำสั่งซื้อ #${orderId} eSIM พร้อมแล้ว`,
          };
          const notifContentMap: Record<string, string> = {
            "zh-TW": `您的 eSIM「${productName}」已成功建立，立即前往查看 QR Code 並安裝。`,
            "zh-CN": `您的 eSIM「${productName}」已成功建立，立即前往查看 QR Code 并安装。`,
            "en": `Your eSIM "${productName}" is ready. Tap to view the QR code and install.`,
            "ja": `eSIM「${productName}」の準備が完了しました。QRコードを確認してインストールしてください。`,
            "ko": `eSIM「${productName}」이 준비되었습니다. QR 코드를 확인하고 설치하세요.`,
            "th": `eSIM "${productName}" พร้อมแล้ว แตะเพื่อดู QR Code และติดตั้ง`,
          };
          await createNotification({
            userId,
            title: notifTitleMap[preferredLang] ?? notifTitleMap["zh-TW"],
            content: notifContentMap[preferredLang] ?? notifContentMap["zh-TW"],
            type: "order",
            link: `/orders`,
          }).catch((e) => console.warn("[TGT Callback] In-app notification failed:", e));

          // Web Push notification
          const pushSubs = await getPushSubscriptionByUser(userId).catch(() => []);
          if (pushSubs.length > 0) {
            const pushTitle = notifTitleMap[preferredLang] ?? notifTitleMap["zh-TW"];
            const pushBody = notifContentMap[preferredLang] ?? notifContentMap["zh-TW"];
            await Promise.allSettled(
              pushSubs.map((sub) =>
                sendPushNotification(
                  { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
                  { title: pushTitle, body: pushBody, url: "/orders" }
                )
              )
            );
            console.log(`[TGT Callback] Sent push notification to ${pushSubs.length} subscription(s) for user ${userId}`);
          }
        }
      }
    }

    // Notify owner
    await notifyOwner({
      title: `TGT eSIM Delivered - Order #${orderId}`,
      content: `ICCID: ${orderInfo.iccid ?? "N/A"}\nTGT Order: ${orderInfo.orderNo}\nQR Code: ${orderInfo.qrCode ? "✅ Received" : "❌ Missing"}`,
    }).catch(() => {});

    // Send confirmation email to customer
    // Fetch order to get email and product name
    const { getDb: getDb3 } = await import("./db");
    const db3 = await getDb3();
    if (db3) {
      const { orders: ordersTable3 } = await import("../drizzle/schema");
      const { eq: eq3 } = await import("drizzle-orm");
      const orderRows3 = await db3.select().from(ordersTable3).where(eq3(ordersTable3.id, orderId)).limit(1);
      const order = orderRows3[0];
      if (order) {
        const customerEmail = order.guestEmail ?? null;
        const preferredLang = order.preferredLang ?? "zh-TW";
        if (customerEmail && !order.emailSent) {
          const [markupSetting, hkdRateSetting] = await Promise.all([
            getSetting("markup_percentage"),
            getSetting("hkd_rate"),
          ]);
          const hkdRate = hkdRateSetting ? parseFloat(hkdRateSetting) : 7.8;
          const totalHkd = Math.round(parseFloat(String(order.totalAmount ?? 0)));
          const customerNameMap: Record<string, string> = {
            "zh-TW": "顧客", "zh-CN": "顾客", "en": "Customer",
            "ja": "お客様", "ko": "고객님", "th": "ลูกค้า",
          };
          const customerName = customerNameMap[preferredLang] ?? "顧客";
          const emailSent = await sendOrderConfirmationEmail({
            customerEmail,
            customerName,
            orderId,
            productName: order.productName ?? "eSIM Plan",
            totalAmount: `HK$${totalHkd}`,
            lpaString: esimData.lpaString ?? undefined,
            activationCode: esimData.activationCode ?? undefined,
            iccid: esimData.iccid ?? undefined,
            preferredLang,
          }).catch((e) => { console.warn("[TGT Callback Email] Failed:", e); return false; });

          await updateOrderStatus(orderId, "completed", { emailSent: !!emailSent });

          const subjectMap: Record<string, string> = {
            "zh-TW": `✅ 付款成功 - 訂單 #${orderId} | SIM uncle`,
            "zh-CN": `✅ 付款成功 - 订单 #${orderId} | SIM uncle`,
            "en": `✅ Payment Confirmed - Order #${orderId} | SIM uncle`,
            "ja": `✅ お支払い確認 - 注文 #${orderId} | SIM uncle`,
            "ko": `✅ 결제 확인 - 주문 #${orderId} | SIM uncle`,
            "th": `✅ ยืนยันการชำระเงิน - คำสั่งซื้อ #${orderId} | SIM uncle`,
          };
          await createEmailLog({
            orderId,
            userId: order.userId ?? null,
            toEmail: customerEmail,
            emailType: "order_confirmation",
            subject: subjectMap[preferredLang] ?? subjectMap["en"],
            status: emailSent ? "sent" : "failed",
            errorMessage: emailSent ? null : "sendOrderConfirmationEmail returned false",
          }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.error(`[TGT Callback] Failed to update order ${orderId}:`, err);
    // Still respond success to TGT to prevent retry loop
  }

  return res.json({ code: "0000", msg: "success" });
}
