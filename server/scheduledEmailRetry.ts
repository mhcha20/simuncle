import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { orders, users } from "../drizzle/schema";
import { and, eq, isNull, or, sql } from "drizzle-orm";
import { getVizlyncOrder } from "./vizlync";
import { sendOrderConfirmationEmail } from "./email";
import { recoverVizlyncOrders } from "./vizlyncRecovery";
import { recoverTgtOrders } from "./tgtRecovery";
import { updateOrderStatus, createEmailLog } from "./db";

/**
 * Heartbeat handler: retry sending confirmation emails for completed orders
 * where lpaString is missing or email was not sent yet.
 * Called by the Manus platform cron every 10 minutes.
 */
export async function handleScheduledEmailRetry(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) return res.json({ ok: true, skipped: "no-db" });

    console.log("[EmailRetry] Starting email retry job");

    // Find orders that are completed/paid but emailSent=false, created in last 24h
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const pendingOrders = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        guestEmail: orders.guestEmail,
        productName: orders.productName,
        totalAmount: orders.totalAmount,
        vizlyncOrderId: orders.vizlyncOrderId,
        esimData: orders.esimData,
        emailSent: orders.emailSent,
        status: orders.status,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .where(
        and(
          or(eq(orders.status, "completed"), eq(orders.status, "paid")),
          eq(orders.emailSent, false),
          sql`${orders.createdAt} > ${new Date(cutoff)}`
        )
      )
      .limit(20);

    console.log(`[EmailRetry] Found ${pendingOrders.length} orders needing email retry`);

    let sent = 0;
    for (const order of pendingOrders) {
      try {
        // Determine customer email
        let customerEmail: string | null = order.guestEmail ?? null;
        if (!customerEmail && order.userId) {
          const userRow = await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, order.userId))
            .limit(1);
          customerEmail = userRow[0]?.email ?? null;
        }

        if (!customerEmail) {
          console.log(`[EmailRetry] Order #${order.id}: no customer email, skipping`);
          continue;
        }

        // Try to fetch lpaString from Vizlync if missing
        let esimData = order.esimData as Record<string, unknown> | null;
        if (order.vizlyncOrderId && !esimData?.lpaString) {
          try {
            const fullOrder = await getVizlyncOrder(order.vizlyncOrderId);
            if (fullOrder?.lpaString || fullOrder?.iccid) {
              esimData = { ...(esimData ?? {}), ...fullOrder };
              await updateOrderStatus(order.id, order.status, { esimData });
              console.log(`[EmailRetry] Order #${order.id}: fetched lpaString from Vizlync`);
            }
          } catch (e) {
            console.warn(`[EmailRetry] Order #${order.id}: failed to fetch Vizlync data:`, e);
          }
        }

        // Send email
        const hkdAmount = Math.round(parseFloat(String(order.totalAmount ?? "0")));
        const emailSent = await sendOrderConfirmationEmail({
          customerEmail,
          customerName: "顧客",
          orderId: order.id,
          productName: String(order.productName ?? ""),
          totalAmount: `HK$${hkdAmount}`,
          lpaString: (esimData as Record<string, string> | null)?.lpaString,
          iccid: (esimData as Record<string, string> | null)?.iccid,
          smdpAddress: (esimData as Record<string, string> | null)?.smdpAddress,
          activationCode: (esimData as Record<string, string> | null)?.activationCode,
        });

        // Log email attempt
        await createEmailLog({
          orderId: order.id,
          userId: order.userId ?? null,
          toEmail: customerEmail,
          emailType: "order_confirmation",
          subject: `✅ 付款成功 - 訂單 #${order.id} | SIM uncle`,
          status: emailSent ? "sent" : "failed",
          errorMessage: emailSent ? null : "sendOrderConfirmationEmail returned false",
        }).catch((e) => console.warn("[EmailLog] Failed to write log:", e));
        if (emailSent) {
          await updateOrderStatus(order.id, order.status, { emailSent: true });
          sent++;
          console.log(`[EmailRetry] Order #${order.id}: email sent successfully to ${customerEmail}`);
        }
      } catch (e) {
        console.error(`[EmailRetry] Order #${order.id}: error during retry:`, e);
      }
    }

    console.log(`[EmailRetry] Done. Sent ${sent}/${pendingOrders.length} emails.`);

    // Vizlync eSIMs can take minutes to appear: finish those that were completed without a QR.
    const recovery = await recoverVizlyncOrders().catch(e => {
      console.warn("[EmailRetry] Vizlync recovery failed:", e);
      return null;
    });
    if (recovery) console.log(`[EmailRetry] Vizlync recovery: ${JSON.stringify(recovery)}`);

    // TGT QR codes arrive by callback; ask TGT directly for any whose callback never came.
    const tgtRecovery = await recoverTgtOrders().catch(e => {
      console.warn("[EmailRetry] TGT recovery failed:", e);
      return null;
    });
    if (tgtRecovery) console.log(`[EmailRetry] TGT recovery: ${JSON.stringify(tgtRecovery)}`);

    res.json({ ok: true, processed: pendingOrders.length, sent, vizlyncRecovery: recovery, tgtRecovery });
  } catch (err) {
    console.error("[EmailRetry] Fatal error:", err);
    res.status(500).json({
      error: String(err),
      timestamp: new Date().toISOString(),
    });
  }
}
