import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { fetchAllTgtProducts, normalizeTgtProduct } from "./tgt";
import { upsertProduct, insertSyncHistory, deactivateMissingTgtProducts } from "./db";
import { notifyOwner } from "./_core/notification";

/**
 * Heartbeat handler for daily TGT product sync.
 * Called by the Manus platform cron at /api/scheduled/sync-tgt-products.
 *
 * Responds 200 immediately, then runs sync in background to avoid
 * Heartbeat's 2-minute StartToClose timeout.
 */
export async function handleScheduledTgtSync(req: Request, res: Response) {
  // Authenticate first (fast, <100ms)
  let user: Awaited<ReturnType<typeof sdk.authenticateRequest>>;
  try {
    user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }
  } catch {
    return res.status(401).json({ error: "auth failed" });
  }

  console.log(`[TgtSync] Cron triggered by taskUid=${user.taskUid}, responding 200 immediately`);

  // ✅ Respond immediately so Heartbeat doesn't timeout
  res.json({ ok: true, status: "tgt sync started in background" });

  // Run the actual sync in background (after response is sent)
  setImmediate(() =>
    runTgtSync().catch((err) => {
      console.error("[TgtSync] Background sync crashed:", err);
    })
  );
}

async function runTgtSync() {
  const startTime = Date.now();
  console.log("[TgtSync] Background sync started");

  try {
    const { products } = await fetchAllTgtProducts();
    let synced = 0;
    let deactivated = 0;
    const errors: { productId: string; error: string }[] = [];

    // Build set of valid productIds from TGT API (for deactivation step)
    const validTgtProductIds = products.map((p) => {
      const normalized = normalizeTgtProduct(p);
      return normalized.productId;
    });

    for (let i = 0; i < products.length; i += 50) {
      const batch = products.slice(i, i + 50);
      const results = await Promise.allSettled(
        batch.map((p) => {
          const normalized = normalizeTgtProduct(p);
          return upsertProduct({
            productId: normalized.productId,
            name: normalized.name,
            description: normalized.description,
            price: normalized.price,
            validityDays: normalized.validityDays,
            countries: normalized.countries,
            dataAmount: normalized.dataAmount,
            dataUnit: normalized.dataUnit,
            networkType: normalized.networkType,
            planType: normalized.planType,
            topUpAvailable: normalized.topUpAvailable,
            activationPolicy: normalized.activationPolicy,
            startDateEnabled: normalized.startDateEnabled,
            rawData: normalized.rawData,
            supplier: "tgt",
          });
        })
      );

      results.forEach((result, idx) => {
        if (result.status === "rejected") {
          const p = batch[idx];
          errors.push({
            productId: `tgt_${p.productCode}`,
            error:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          });
        } else {
          synced++;
        }
      });
    }

    // Deactivate products that are no longer in TGT API
    try {
      deactivated = await deactivateMissingTgtProducts(validTgtProductIds);
      if (deactivated > 0) {
        console.log(`[TgtSync] Deactivated ${deactivated} products no longer in TGT API.`);
      }
    } catch (deactivateErr) {
      console.error("[TgtSync] Failed to deactivate missing products:", deactivateErr);
    }

    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `[TgtSync] Completed: synced ${synced}/${products.length} products, deactivated ${deactivated}, errors: ${errors.length}, elapsed: ${elapsed}s`
    );

    // Record sync history
    await insertSyncHistory({
      triggeredBy: "scheduled",
      status: errors.length === 0 ? "success" : "failed",
      totalProducts: products.length,
      added: 0,
      removed: deactivated,
      priceChanged: 0,
      failedCount: errors.length,
      errorMessage:
        errors.length > 0
          ? errors
              .slice(0, 5)
              .map((e) => `[${e.productId}] ${e.error}`)
              .join("\n")
          : null,
    }).catch(() => {});

    // Notify owner
    if (errors.length > 0 || deactivated > 0) {
      const parts = [
        `TGT daily sync completed in ${elapsed}s.`,
        `Synced: ${synced}/${products.length}`,
        deactivated > 0 ? `Deactivated (no longer in API): ${deactivated}` : null,
        errors.length > 0 ? `Errors: ${errors.length}` : null,
        errors.length > 0
          ? `\nFirst 5 errors:\n${errors.slice(0, 5).map((e) => `• ${e.productId}: ${e.error}`).join("\n")}`
          : null,
      ].filter(Boolean).join("\n");

      const title = errors.length > 0
        ? `⚠️ TGT Sync: ${errors.length} errors${deactivated > 0 ? `, ${deactivated} deactivated` : ""}`
        : `ℹ️ TGT Sync: ${deactivated} products deactivated`;

      await notifyOwner({ title, content: parts }).catch(() => {});
    } else {
      console.log(`[TgtSync] All ${synced} products synced successfully. No deactivations needed.`);
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error(`[TgtSync] Background sync failed after ${elapsed}s:`, error);

    await insertSyncHistory({
      triggeredBy: "scheduled",
      status: "failed",
      totalProducts: 0,
      added: 0,
      removed: 0,
      priceChanged: 0,
      failedCount: 0,
      errorMessage: error,
    }).catch(() => {});

    await notifyOwner({
      title: "⚠️ TGT Daily Sync Failed",
      content: `TGT scheduled sync failed after ${elapsed}s at ${new Date().toISOString()}\n\nError: ${error}\n\nPlease check server logs or trigger a manual sync from Admin Settings.`,
    }).catch(() => {});
  }
}
