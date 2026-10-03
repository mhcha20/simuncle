import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { fetchAllProducts } from "./vizlync";
import { upsertProduct, getDb, insertSyncHistory } from "./db";
import { notifyOwner } from "./_core/notification";
import { productsCache } from "../drizzle/schema";
import { submitAllPages } from "./indexnow";

/**
 * Heartbeat handler for daily Vizlync product sync.
 * Called by the Manus platform cron at /api/scheduled/sync-products.
 *
 * FIX (2026-07-07): Heartbeat has a 2-minute StartToClose timeout.
 * Syncing 9000+ products takes ~90-180s, causing timeout.
 * Solution: respond 200 immediately, run sync in background (setImmediate).
 */
export async function handleScheduledSync(req: Request, res: Response) {
  // Authenticate first (fast, <100ms)
  let user: Awaited<ReturnType<typeof sdk.authenticateRequest>>;
  try {
    user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }
  } catch (authErr) {
    return res.status(401).json({ error: "auth failed" });
  }

  console.log(`[ScheduledSync] Cron triggered by taskUid=${user.taskUid}, responding 200 immediately`);

  // ✅ Respond immediately so Heartbeat doesn't timeout
  res.json({ ok: true, status: "sync started in background" });

  // Run the actual sync in background (after response is sent)
  setImmediate(() => runSync().catch((err) => {
    console.error("[ScheduledSync] Background sync crashed:", err);
  }));
}

async function runSync() {
  const startTime = Date.now();
  console.log("[ScheduledSync] Background sync started");

  try {
    // --- Step 1: Snapshot existing products (productId → price) ---
    const db = await getDb();
    type PriceRow = { productId: string; price: string };
    const existingRows: PriceRow[] = db
      ? await db.select({ productId: productsCache.productId, price: productsCache.price }).from(productsCache) as PriceRow[]
      : [];
    const vizlyncRows = existingRows.filter((r) => !r.productId.startsWith("tgt_"));
    const existingMap = new Map<string, number>(
      vizlyncRows.map((r) => [r.productId, parseFloat(r.price)])
    );
    const existingIds = new Set(existingMap.keys());

    // --- Step 2: Fetch all products from Vizlync API (~5s) ---
    const { products } = await fetchAllProducts();
    let synced = 0;

    // Use larger batch size (200) to reduce DB round-trips
    // 9000 products / 200 = 45 batches instead of 183 batches
    const BATCH = 200;
    for (let i = 0; i < products.length; i += BATCH) {
      const batch = products.slice(i, i + BATCH);
      await Promise.all(
        batch.map((p) =>
          upsertProduct({
            productId: p.productId,
            name: p.name,
            description: p.description,
            planInfo: p.planInfo,
            price: p.price,
            validityDays: p.validityDays,
            countries: p.countries,
            region: p.region,
            dataAmount: p.dataAmount,
            dataUnit: p.dataUnit,
            speed: p.speed,
            planType: p.planType,
            category: p.category,
            networkName: p.networkName,
            networkType: p.networkType,
            isVoiceAvailable: p.isVoiceAvailable,
            isSmsAvailable: p.isSmsAvailable,
            hotspotAvailable: p.hotspotAvailable,
            topUpAvailable: p.topUpAvailable,
            profile: p.profile,
            activationPolicy: p.activationPolicy,
            startDateEnabled: p.startDateEnabled,
            rawData: p,
          })
        )
      );
      synced += batch.length;
      // Log progress every 1000 products
      if (synced % 1000 === 0 || synced === products.length) {
        console.log(`[ScheduledSync] Progress: ${synced}/${products.length} products upserted`);
      }
    }

    const total = products.length;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[ScheduledSync] Completed: synced ${synced}/${total} products in ${elapsed}s`);

    // --- Step 3: Detect changes ---
    const newIds = new Set(products.map((p) => p.productId));
    const added = products.filter((p) => !existingIds.has(p.productId));
    const removedIds = [...existingIds].filter((id) => !newIds.has(id));
    const priceChanged = products.filter((p) => {
      const oldPrice = existingMap.get(p.productId);
      if (oldPrice === undefined) return false;
      // The database keeps 2 decimals, the API can return more; compare at cent precision so
      // rounding alone does not count as a price change every day.
      return Math.round(oldPrice * 100) !== Math.round(Number(p.price) * 100);
    });

    const hasChanges = added.length > 0 || removedIds.length > 0 || priceChanged.length > 0;

    if (hasChanges) {
      const groupByRegion = (items: typeof added) => {
        const groups: Record<string, number> = {};
        items.forEach((p) => {
          const name = p.name || "";
          let region = "Other";
          if (/greater china|china|taiwan|hong kong|macau/i.test(name)) region = "Greater China";
          else if (/japan/i.test(name)) region = "Japan";
          else if (/korea/i.test(name)) region = "Korea";
          else if (/europe/i.test(name)) region = "Europe";
          else if (/usa|united states|america/i.test(name)) region = "USA";
          else if (/asia/i.test(name)) region = "Asia";
          else if (/global|worldwide/i.test(name)) region = "Global";
          groups[region] = (groups[region] || 0) + 1;
        });
        return Object.entries(groups)
          .sort((a, b) => b[1] - a[1])
          .map(([r, c]) => `${r}: ${c}`)
          .join(" | ");
      };

      const parts: string[] = [`📦 Total: ${total} products (synced in ${elapsed}s)`];
      if (added.length > 0) parts.push(`✅ +${added.length} new  [${groupByRegion(added)}]`);
      if (removedIds.length > 0) parts.push(`❌ -${removedIds.length} removed`);
      if (priceChanged.length > 0) {
        const top5 = priceChanged
          .sort((a, b) => {
            const diffA = Math.abs(Number(a.price) - (existingMap.get(a.productId) || 0));
            const diffB = Math.abs(Number(b.price) - (existingMap.get(b.productId) || 0));
            return diffB - diffA;
          })
          .slice(0, 5);
        parts.push(`💰 ${priceChanged.length} price changes (top 5):`);
        top5.forEach((p) => {
          const oldPrice = existingMap.get(p.productId)!;
          const direction = Number(p.price) > oldPrice ? "▲" : "▼";
          parts.push(`  ${direction} ${p.name}: $${Number(oldPrice).toFixed(2)}→$${Number(p.price).toFixed(2)}`);
        });
        if (priceChanged.length > 5) parts.push(`  … +${priceChanged.length - 5} more`);
      }

      const content = parts.join("\n").trim();
      const title = `eSIM Sync: +${added.length} new / -${removedIds.length} removed / ${priceChanged.length} price changes`;
      try {
        await notifyOwner({ title, content });
        console.log(`[ScheduledSync] Owner notified: ${title}`);
      } catch (notifyErr) {
        console.warn("[ScheduledSync] Failed to notify owner:", notifyErr);
      }
    } else {
      console.log("[ScheduledSync] No product changes detected, skipping notification.");
    }

    // --- Step 4: Record sync history ---
    try {
      await insertSyncHistory({
        triggeredBy: "scheduled",
        status: "success",
        totalProducts: total,
        added: added.length,
        removed: removedIds.length,
        priceChanged: priceChanged.length,
        failedCount: 0,
      });
    } catch (histErr) {
      console.warn("[ScheduledSync] Failed to record sync history:", histErr);
    }

    // --- Step 5: Submit all pages to Bing IndexNow ---
    try {
      const indexNowResult = await submitAllPages();
      if (indexNowResult.success) {
        console.log(`[ScheduledSync] IndexNow: submitted ${indexNowResult.submitted} URLs (HTTP ${indexNowResult.status})`);
      } else {
        console.warn(`[ScheduledSync] IndexNow submission failed: ${indexNowResult.error}`);
      }
    } catch (indexNowErr) {
      console.warn("[ScheduledSync] IndexNow submission error:", indexNowErr);
    }

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error(`[ScheduledSync] Background sync failed after ${elapsed}s:`, error);

    try {
      await insertSyncHistory({
        triggeredBy: "scheduled",
        status: "failed",
        totalProducts: 0,
        added: 0,
        removed: 0,
        priceChanged: 0,
        failedCount: 0,
        errorMessage: error,
      });
    } catch (_) { /* ignore */ }

    try {
      await notifyOwner({
        title: "⚠️ eSIM Product Sync Failed",
        content: `Scheduled product sync failed after ${elapsed}s at ${new Date().toISOString()}\n\nError: ${error}\n\nPlease check server logs or trigger a manual sync from Admin Settings.`,
      });
    } catch (_) { /* ignore */ }
  }
}
