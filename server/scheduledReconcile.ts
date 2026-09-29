import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { reconcilePendingOrders } from "./stripe";
import { HttpError } from "@shared/_core/errors";

/**
 * Heartbeat handler: reconcile pending orders against Stripe.
 *
 * Scans orders/topup_orders that are stuck in pending_payment (or processing/paid)
 * with a Stripe session id and were created more than a few minutes ago, then
 * checks Stripe for the real payment status. If Stripe reports `paid`, the order
 * is auto-fulfilled via handleCheckoutCompleted (idempotent).
 *
 * This protects against missed/failed Stripe webhooks (the cause of the
 * "paid but order not updated" case for Order #480001).
 *
 * Called by the Manus platform cron at /api/scheduled/reconcileOrders.
 */
export async function handleScheduledReconcile(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    console.log(`[Reconcile] Starting order reconciliation job (taskUid=${user.taskUid ?? "n/a"})`);
    const result = await reconcilePendingOrders(3);
    res.json({ ok: true, ...result });
  } catch (err) {
    // Auth/identity failures (missing or invalid session cookie) are NOT server
    // errors. Return the original 4xx so the platform treats them as business
    // failures and does not retry. Only genuine 5xx should trigger retries.
    if (err instanceof HttpError && err.statusCode >= 400 && err.statusCode < 500) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("[Reconcile] Fatal error:", err);
    res.status(500).json({
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}
