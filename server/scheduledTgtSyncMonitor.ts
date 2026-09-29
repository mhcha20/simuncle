import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { notifyOwner } from "./_core/notification";
import { getRecentSyncHistory } from "./db";

const STALE_AFTER_MS = 26 * 60 * 60 * 1000;

const hkt = (d: Date) => d.toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong", hour12: false });

/**
 * Daily check that the TGT product sync (sync_history rows with supplier=tgt)
 * ran and succeeded within the last 26 hours; emails the owner a short report.
 */
export async function handleScheduledTgtSyncMonitor(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }
  } catch {
    return res.status(401).json({ error: "auth failed" });
  }

  res.json({ ok: true, status: "tgt sync monitor running in background" });

  setImmediate(() =>
    runTgtSyncMonitor().catch(err => {
      console.error("[TgtSyncMonitor] Background check crashed:", err);
    })
  );
}

export async function runTgtSyncMonitor(now = new Date()) {
  try {
    const runs = await getRecentSyncHistory(5, "tgt");
    const latest = runs[0];
    const isRecent = latest ? now.getTime() - new Date(latest.createdAt).getTime() <= STALE_AFTER_MS : false;

    const lines: string[] = ["📊 TGT 產品同步每日狀態報告", `報告時間：${hkt(now)} (HKT)`, ""];
    let title: string;

    if (!latest) {
      title = "⚠️ TGT Sync Monitor: 找不到任何同步記錄";
      lines.push("同步記錄表入面冇任何 TGT 同步紀錄，請檢查排程是否正常運行。");
    } else {
      lines.push("━━━ 最新一次同步 ━━━");
      lines.push(`狀態：${latest.status === "success" ? "✅ 成功" : "❌ 失敗"}`);
      lines.push(`時間：${hkt(new Date(latest.createdAt))} (HKT)`);
      lines.push(`產品數：${latest.totalProducts}（新增 ${latest.added}、停用 ${latest.removed}、失敗 ${latest.failedCount}）`);
      if (latest.errorMessage) lines.push(`錯誤訊息：${latest.errorMessage.slice(0, 300)}`);
      if (runs.length > 1) {
        lines.push("", `━━━ 近期 ${runs.length} 次記錄 ━━━`);
        runs.forEach((r, i) => {
          lines.push(`${i + 1}. ${hkt(new Date(r.createdAt))} → ${r.status === "success" ? "✅" : "❌"} (${r.totalProducts} 個產品)`);
        });
      }
      if (!isRecent) {
        lines.push("", `⚠️ 警告：過去 26 小時內未發現同步記錄，最近一次為 ${hkt(new Date(latest.createdAt))}。`);
        title = "⚠️ TGT Sync Monitor: 今日同步未執行";
      } else if (latest.status !== "success") {
        title = "❌ TGT Sync Monitor: 同步失敗";
      } else {
        title = "✅ TGT Sync Monitor: 同步正常";
      }
    }

    await notifyOwner({ title, content: lines.join("\n") }).catch(() => {});
    console.log(`[TgtSyncMonitor] Report sent: ${title}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[TgtSyncMonitor] Failed to check sync status:", error);
    await notifyOwner({
      title: "⚠️ TGT Sync Monitor: 監控任務執行失敗",
      content: `TGT sync monitor 在 ${hkt(now)} 執行時發生錯誤。\n\n錯誤：${error}\n\n請手動檢查 TGT 同步狀態。`,
    }).catch(() => {});
  }
}
