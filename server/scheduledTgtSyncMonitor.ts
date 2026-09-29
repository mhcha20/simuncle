import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { notifyOwner } from "./_core/notification";
import { ENV } from "./_core/env";

const TGT_SYNC_TASK_UID = "NVcpWbNzs6MWaf8JzWHkj5";

type HeartbeatRun = {
  runUid: string;
  taskUid: string;
  status: string;
  scheduledAt: string;
  startedAt?: string;
  finishedAt?: string;
  durationMs?: string | number;
  attempts: number;
  httpStatus?: number;
  error?: string;
  responseBody?: string;
};

/**
 * Fetch recent runs for a Heartbeat task directly from the Forge API.
 * Uses the project-owner identity (BUILT_IN_FORGE_API_KEY).
 */
async function listTgtSyncRuns(pageSize = 5): Promise<HeartbeatRun[]> {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error("Forge API credentials not configured");
  }

  const endpoint = `${forgeUrl.replace(/\/$/, "")}/webdevtoken.v1.WebDevService/ListHeartbeatJobRuns`;
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${forgeKey}`,
      "connect-protocol-version": "1",
    },
    body: JSON.stringify({
      taskUid: TGT_SYNC_TASK_UID,
      pageSize,
      withBody: true,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`ListHeartbeatJobRuns failed (${resp.status}): ${text}`);
  }

  const data = (await resp.json()) as { runs?: HeartbeatRun[]; total?: string };
  return data.runs ?? [];
}

/**
 * Heartbeat handler for daily TGT sync status monitoring.
 * Runs at UTC 03:00 (one hour after TGT sync at 02:00).
 * Checks the last run of the TGT sync task and sends an owner notification.
 */
export async function handleScheduledTgtSyncMonitor(req: Request, res: Response) {
  // Authenticate
  let user: Awaited<ReturnType<typeof sdk.authenticateRequest>>;
  try {
    user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }
  } catch {
    return res.status(401).json({ error: "auth failed" });
  }

  console.log(`[TgtSyncMonitor] Triggered by taskUid=${user.taskUid}`);

  // Respond immediately to avoid Heartbeat 2-minute timeout
  res.json({ ok: true, status: "tgt sync monitor running in background" });

  setImmediate(() =>
    runTgtSyncMonitor().catch((err) => {
      console.error("[TgtSyncMonitor] Background check crashed:", err);
    })
  );
}

async function runTgtSyncMonitor() {
  const now = new Date();
  const reportTime = now.toISOString();

  try {
    const runs = await listTgtSyncRuns(5);

    if (runs.length === 0) {
      await notifyOwner({
        title: "⚠️ TGT Sync Monitor: No runs found",
        content: `Daily TGT sync monitor ran at ${reportTime}.\n\nNo execution records found for the TGT product sync task (taskUid: ${TGT_SYNC_TASK_UID}).\n\nPlease verify the Heartbeat job is still active.`,
      }).catch(() => {});
      return;
    }

    // Find the most recent run within the last 26 hours (covers UTC 02:00 yesterday to today)
    const cutoff = new Date(now.getTime() - 26 * 60 * 60 * 1000);
    const recentRuns = runs.filter((r) => new Date(r.scheduledAt) >= cutoff);
    const latestRun = runs[0];

    const statusMap: Record<string, string> = {
      HEARTBEAT_RUN_STATUS_SUCCESS: "✅ 成功",
      HEARTBEAT_RUN_STATUS_FAILED: "❌ 失敗",
      HEARTBEAT_RUN_STATUS_TIMEOUT: "⏱ 超時",
      HEARTBEAT_RUN_STATUS_SKIPPED: "⏭ 跳過",
      HEARTBEAT_RUN_STATUS_RUNNING: "🔄 執行中",
    };

    const formatStatus = (s: string) => statusMap[s] ?? s;
    const formatDuration = (ms?: string | number) => {
      if (!ms) return "N/A";
      const n = typeof ms === "string" ? parseInt(ms, 10) : ms;
      return isNaN(n) ? "N/A" : `${(n / 1000).toFixed(1)}s`;
    };
    const formatTime = (iso?: string) => {
      if (!iso) return "N/A";
      // Convert to HKT (UTC+8)
      const d = new Date(iso);
      return d.toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong", hour12: false });
    };

    const latestStatus = latestRun.status;
    const isSuccess = latestStatus === "HEARTBEAT_RUN_STATUS_SUCCESS";
    const isRecentEnough = recentRuns.length > 0;

    // Build report lines
    const lines: string[] = [];
    lines.push(`📊 TGT 產品同步每日狀態報告`);
    lines.push(`報告時間：${formatTime(reportTime)} (HKT)`);
    lines.push(``);
    lines.push(`━━━ 最新一次執行 ━━━`);
    lines.push(`狀態：${formatStatus(latestStatus)}`);
    lines.push(`排程時間：${formatTime(latestRun.scheduledAt)} (HKT)`);
    lines.push(`執行時長：${formatDuration(latestRun.durationMs)}`);
    lines.push(`HTTP 狀態碼：${latestRun.httpStatus ?? "N/A"}`);
    lines.push(`嘗試次數：${latestRun.attempts}`);
    if (latestRun.error) {
      lines.push(`錯誤訊息：${latestRun.error}`);
    }
    if (latestRun.responseBody) {
      lines.push(`回應內容：${latestRun.responseBody.slice(0, 200)}`);
    }

    if (runs.length > 1) {
      lines.push(``);
      lines.push(`━━━ 近期 ${Math.min(runs.length, 5)} 次執行記錄 ━━━`);
      runs.slice(0, 5).forEach((r, i) => {
        lines.push(`${i + 1}. ${formatTime(r.scheduledAt)} → ${formatStatus(r.status)} (${formatDuration(r.durationMs)})`);
      });
    }

    if (!isRecentEnough) {
      lines.push(``);
      lines.push(`⚠️ 警告：過去 26 小時內未發現執行記錄，最近一次執行為 ${formatTime(latestRun.scheduledAt)}。`);
    }

    const content = lines.join("\n");

    // Determine notification title
    let title: string;
    if (!isRecentEnough) {
      title = "⚠️ TGT Sync Monitor: 今日同步未執行";
    } else if (!isSuccess) {
      title = `❌ TGT Sync Monitor: 同步失敗 (${formatStatus(latestStatus)})`;
    } else {
      title = `✅ TGT Sync Monitor: 同步正常`;
    }

    await notifyOwner({ title, content }).catch(() => {});
    console.log(`[TgtSyncMonitor] Report sent: ${title}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[TgtSyncMonitor] Failed to check sync status:`, error);

    await notifyOwner({
      title: "⚠️ TGT Sync Monitor: 監控任務執行失敗",
      content: `TGT sync monitor 在 ${reportTime} 執行時發生錯誤。\n\n錯誤：${error}\n\n請手動檢查 TGT 同步任務狀態。`,
    }).catch(() => {});
  }
}
