import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDb, getCustomerEmailByUserId, createEmailLog } from "./db";
import { orders, pushSubscriptions, productsCache } from "../drizzle/schema";
import { and, eq, or, sql } from "drizzle-orm";
import { getVizlyncUsage, getTopupPlans, extractTopupPlans, computeTopupPriceHkd, parsePlanDataGb } from "./vizlync";
import { sendPushNotification } from "./push";
import { sendDataExhaustedEmail, type TopupPlanOption } from "./email";

/**
 * Heartbeat handler: check eSIM data usage for all active orders.
 * 1. If remaining data < 20%, send a push notification to the user.
 * 2. If remaining data = 0% (exhausted), send an email notification with topup options.
 * Called by the Manus platform cron every day at UTC 02:00.
 */

const LOW_USAGE_THRESHOLD = 0.20; // 20%
const EXHAUSTED_THRESHOLD = 0.01; // < 1% = effectively exhausted

export async function handleScheduledLowUsageAlert(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "Forbidden: cron only" });
    }

    const db = await getDb();
    if (!db) throw new Error("DB not available");

    // Get all completed orders that have a vizlyncOrderId
    const activeOrders = await db
      .select({
        id: orders.id,
        userId: orders.userId,
        guestEmail: orders.guestEmail,
        productName: orders.productName,
        productId: orders.productId,
        preferredLang: orders.preferredLang,
        esimData: orders.esimData,
        vizlyncOrderId: sql<string>`JSON_EXTRACT(${orders.esimData}, '$.orderId')`,
      })
      .from(orders)
      .where(
        and(
          or(eq(orders.status, "completed"), eq(orders.status, "paid")),
          sql`JSON_EXTRACT(${orders.esimData}, '$.orderId') IS NOT NULL`,
        )
      )
      .limit(200);

    console.log(`[LowUsageAlert] Checking ${activeOrders.length} active orders`);

    let notified = 0;
    let exhaustedEmailed = 0;
    let skipped = 0;

    for (const order of activeOrders) {
      try {
        const esimData = order.esimData as Record<string, unknown> | null;
        const vizlyncOrderId = esimData?.orderId as string | undefined;
        if (!vizlyncOrderId) { skipped++; continue; }

        // Fetch usage from Vizlync
        let usageData: Record<string, unknown>;
        try {
          usageData = await getVizlyncUsage(vizlyncOrderId);
        } catch {
          skipped++;
          continue;
        }

        const totalBytes = Number(usageData.dataAllowance ?? 0);
        const usedBytes = Number(usageData.dataUsage ?? 0);
        const esimStatus = String(usageData.status ?? "");

        // Only process Active eSIMs with valid data
        if (esimStatus !== "Active" || totalBytes === 0) { skipped++; continue; }

        const remainingPct = (totalBytes - usedBytes) / totalBytes;

        // ---- Case 1: Data EXHAUSTED (< 1%) → send email ----
        if (remainingPct < EXHAUSTED_THRESHOLD) {
          // Dedupe: skip if exhausted email already sent
          const exhaustedEmailSent = esimData?.dataExhaustedEmailSent as string | undefined;
          if (exhaustedEmailSent) { skipped++; continue; }

          // Get customer email
          const customerEmail = order.guestEmail ??
            (order.userId ? await getCustomerEmailByUserId(order.userId) : null);
          if (!customerEmail) { skipped++; continue; }

          // Check if product supports topup
          const productRow = await db
            .select({ topUpAvailable: productsCache.topUpAvailable })
            .from(productsCache)
            .where(eq(productsCache.productId, order.productId))
            .limit(1);
          const topUpAvailable = productRow[0]?.topUpAvailable ?? false;

          // Fetch topup plans if available (pick representative low/mid/high, max 3)
          let topupPlanOptions: TopupPlanOption[] = [];
          if (topUpAvailable) {
            try {
              const rawPlans = await getTopupPlans(vizlyncOrderId);
              const plans = extractTopupPlans(rawPlans);
              // Sort by data volume, pick low/mid/high (max 3)
              const sorted = plans
                .map(p => ({ plan: p, gb: parsePlanDataGb(p) ?? 0 }))
                .filter(x => x.gb > 0)
                .sort((a, b) => a.gb - b.gb);
              const picks: typeof sorted = [];
              if (sorted.length > 0) picks.push(sorted[0]);
              if (sorted.length > 2) picks.push(sorted[Math.floor(sorted.length / 2)]);
              if (sorted.length > 1) picks.push(sorted[sorted.length - 1]);
              topupPlanOptions = picks.map(x => ({
                productId: x.plan.productId,
                name: x.plan.name,
                priceHkd: computeTopupPriceHkd(x.plan.price, 20, 7.8),
                dataLabel: x.gb >= 1 ? `${x.gb} GB` : `${Math.round(x.gb * 1024)} MB`,
              }));
            } catch {
              // If topup plans fetch fails, still send email without plans
            }
          }

          const emailOk = await sendDataExhaustedEmail({
            customerEmail,
            customerName: customerEmail,
            orderId: order.id,
            productName: order.productName,
            vizlyncOrderId,
            preferredLang: order.preferredLang ?? "zh-TW",
            topUpAvailable,
            topupPlans: topupPlanOptions,
          });

          // Log email
          await createEmailLog({
            orderId: order.id,
            userId: order.userId ?? undefined,
            toEmail: customerEmail,
            emailType: "data_exhausted",
            subject: `📵 Data Exhausted - Order #${order.id}`,
            status: emailOk ? "sent" : "failed",
          });

          if (emailOk) {
            // Mark exhausted email sent
            const dbUpd = await getDb();
            if (dbUpd) {
              await dbUpd
                .update(orders)
                .set({ esimData: { ...esimData, dataExhaustedEmailSent: new Date().toISOString() } })
                .where(eq(orders.id, order.id));
            }
            exhaustedEmailed++;
            console.log(`[LowUsageAlert] Order #${order.id}: data exhausted email sent`);
          }
          continue;
        }

        // ---- Case 2: Low usage (< 20%) → send push notification ----
        if (remainingPct >= LOW_USAGE_THRESHOLD) { skipped++; continue; }

        // Skip if already notified today (dedupe via esimData flag)
        const lastAlert = esimData?.lowUsageAlertSent as string | undefined;
        if (lastAlert) {
          const lastAlertDate = new Date(lastAlert);
          const today = new Date();
          if (
            lastAlertDate.getFullYear() === today.getFullYear() &&
            lastAlertDate.getMonth() === today.getMonth() &&
            lastAlertDate.getDate() === today.getDate()
          ) {
            skipped++;
            continue;
          }
        }

        // Only send push if user has subscriptions
        if (!order.userId) { skipped++; continue; }
        const db2 = await getDb();
        if (!db2) { skipped++; continue; }
        const subs = await db2
          .select()
          .from(pushSubscriptions)
          .where(eq(pushSubscriptions.userId, order.userId));

        if (subs.length === 0) { skipped++; continue; }

        const remainingGB = ((totalBytes - usedBytes) / 1073741824).toFixed(2);
        const remainingMB = ((totalBytes - usedBytes) / 1048576).toFixed(0);
        const remainingStr = (totalBytes - usedBytes) >= 1073741824 ? `${remainingGB} GB` : `${remainingMB} MB`;
        const pct = Math.round(remainingPct * 100);

        const payload = {
          title: `⚠️ eSIM 數據即將用盡`,
          body: `訂單 #${order.id}：剩餘 ${remainingStr}（${pct}%），立即購買續期方案`,
          url: `/orders`,
        };

        let pushSent = false;
        for (const sub of subs) {
          const result = await sendPushNotification(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            payload
          );
          if (result === true) pushSent = true;
        }

        if (pushSent) {
          const db3 = await getDb();
          if (db3) {
            await db3
              .update(orders)
              .set({ esimData: { ...esimData, lowUsageAlertSent: new Date().toISOString() } })
              .where(eq(orders.id, order.id));
          }
          notified++;
          console.log(`[LowUsageAlert] Order #${order.id}: low usage alert sent (${pct}% remaining)`);
        }
      } catch (e) {
        console.error(`[LowUsageAlert] Order #${order.id}: error:`, e);
      }
    }

    console.log(`[LowUsageAlert] Done. Notified: ${notified}, ExhaustedEmailed: ${exhaustedEmailed}, Skipped: ${skipped}`);
    res.json({ ok: true, checked: activeOrders.length, notified, exhaustedEmailed, skipped });
  } catch (err) {
    console.error("[LowUsageAlert] Fatal error:", err);
    res.status(500).json({
      error: String(err),
      timestamp: new Date().toISOString(),
    });
  }
}
