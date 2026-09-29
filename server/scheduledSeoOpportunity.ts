/**
 * Weekly SEO Opportunity Analysis
 * Every Monday 09:00 HKT (01:00 UTC):
 * 1. Pull keyword rankings from SE Ranking API
 * 2. Find "opportunity" keywords (positions 4-15) that are easiest to push to top 3
 * 3. Auto-add those keywords to Soro Calendar for content generation
 * 4. Notify owner with the weekly opportunity report
 */

import { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { notifyOwner } from "./_core/notification";
import {
  listProjects,
  listSearchEngines,
  getKeywordPositions,
  getProjectSummary,
} from "./seranking";

const SORO_API_BASE = "https://app.trysoro.com";
const SORO_SUPABASE_URL = "https://afocirmbqdxnkyescnev.supabase.co";

// ─── Soro Auth: Supabase session-cookie based ─────────────────────────────────

interface SoroSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
  user: Record<string, unknown>;
}

let cachedSession: SoroSession | null = null;

/**
 * Get a valid Soro access token, refreshing via Supabase if needed.
 * Rotates SORO_REFRESH_TOKEN in-process (persists for the lifetime of the server).
 */
async function getSoroSession(): Promise<SoroSession | null> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached session if still valid (with 60s buffer)
  if (cachedSession && cachedSession.expires_at > now + 60) {
    return cachedSession;
  }

  const refreshToken = process.env.SORO_REFRESH_TOKEN;
  const anonKey = process.env.SORO_SUPABASE_ANON_KEY;

  if (!refreshToken || !anonKey) {
    console.warn("[Soro] SORO_REFRESH_TOKEN or SORO_SUPABASE_ANON_KEY not set");
    return null;
  }

  try {
    const resp = await fetch(`${SORO_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!resp.ok) {
      console.error("[Soro] Token refresh failed:", resp.status, await resp.text());
      return null;
    }

    const data = await resp.json();
    if (!data.access_token) {
      console.error("[Soro] No access_token in refresh response");
      return null;
    }

    // Update the in-process refresh token (rotates on each use)
    process.env.SORO_REFRESH_TOKEN = data.refresh_token;

    cachedSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      token_type: data.token_type ?? "bearer",
      user: data.user ?? {},
    };

    console.log("[Soro] Token refreshed, new refresh_token:", data.refresh_token);
    return cachedSession;
  } catch (err) {
    console.error("[Soro] Token refresh error:", err);
    return null;
  }
}

/**
 * Build the Soro session cookie string from a session object.
 * Soro splits the base64-encoded session into .0 and .1 cookie parts.
 */
function buildSoroCookieString(session: SoroSession): string {
  const sessionObj = {
    access_token: session.access_token,
    token_type: session.token_type,
    expires_in: 3600,
    expires_at: session.expires_at,
    refresh_token: session.refresh_token,
    user: session.user,
  };

  const sessionB64 = "base64-" + Buffer.from(JSON.stringify(sessionObj)).toString("base64");
  const MAX_PART0 = 3180;
  const part0 = sessionB64.substring(0, MAX_PART0);
  const part1 = sessionB64.substring(MAX_PART0);

  return `sb-afocirmbqdxnkyescnev-auth-token.0=${part0}; sb-afocirmbqdxnkyescnev-auth-token.1=${part1}`;
}

// ─── Soro API Helpers ──────────────────────────────────────────────────────────

/**
 * Add a keyword to Soro's keyword library.
 * Returns the keyword ID if successful, null otherwise.
 */
async function soroAddKeyword(keyword: string, cookieStr: string): Promise<string | null> {
  try {
    const resp = await fetch(`${SORO_API_BASE}/api/keywords/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieStr,
      },
      body: JSON.stringify({ keyword }),
    });

    if (!resp.ok) {
      console.warn(`[Soro] addKeyword failed for "${keyword}":`, resp.status);
      return null;
    }

    const data = await resp.json();
    return data?.keyword?.id ?? null;
  } catch (err) {
    console.warn(`[Soro] addKeyword error for "${keyword}":`, err);
    return null;
  }
}

/**
 * Schedule a keyword in Soro Calendar (next available day).
 * Returns the scheduled date if successful, null otherwise.
 */
async function soroScheduleKeyword(keywordId: string, cookieStr: string): Promise<string | null> {
  try {
    const resp = await fetch(`${SORO_API_BASE}/api/schedule/add-keyword`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieStr,
      },
      body: JSON.stringify({ keywordId }),
    });

    if (!resp.ok) {
      console.warn(`[Soro] scheduleKeyword failed for ID ${keywordId}:`, resp.status);
      return null;
    }

    const data = await resp.json();
    return data?.scheduledDate ?? null;
  } catch (err) {
    console.warn(`[Soro] scheduleKeyword error for ID ${keywordId}:`, err);
    return null;
  }
}

// Fetch existing Soro keywords to avoid duplicates
async function fetchSoroKeywords(): Promise<string[]> {
  try {
    const SORO_EMBED_TOKEN = process.env.SORO_EMBED_TOKEN ?? "";
    const url = `${SORO_API_BASE}/api/embed/${SORO_EMBED_TOKEN}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const js = await res.text();
    const match = js.match(/var SORO_ARTICLES = (\[[\s\S]*?\]);/);
    if (!match) return [];
    const articles = JSON.parse(match[1]) as Array<{ title: string }>;
    return articles.map((a) => a.title.toLowerCase());
  } catch {
    return [];
  }
}

// ─── Main Handler ──────────────────────────────────────────────────────────────

export async function scheduledSeoOpportunityHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    const isOwner = user.role === "admin";
    if (!user.isCron && !isOwner) {
      return res.status(403).json({ error: "cron-or-owner-only" });
    }

    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Step 1: Get all projects and find simuncle.com
    const projects = await listProjects();
    const site =
      projects.find((p) => p.name?.includes("simuncle") || p.title?.includes("simuncle")) ??
      projects[0];
    if (!site) {
      return res.json({ ok: true, skipped: "no projects found" });
    }

    // Step 2: Get search engines (prefer English/US)
    const engines = await listSearchEngines(site.id);
    const engEngine = engines.find((e) => e.lang_code === "en") ?? engines[0];
    if (!engEngine) {
      return res.json({ ok: true, skipped: "no search engines found" });
    }

    // Step 3: Get keyword positions for the past 7 days
    const positionsData = await getKeywordPositions(
      site.id,
      engEngine.site_engine_id,
      sevenDaysAgo,
      today
    );

    const summary = await getProjectSummary(site.id);
    const engineData = positionsData.find((e) => e.site_engine_id === engEngine.site_engine_id);
    const keywords = engineData?.keywords ?? [];

    // Step 4: Find opportunity keywords (positions 4-15)
    const opportunityKeywords = keywords
      .filter((kw) => {
        const latestPos = kw.positions[kw.positions.length - 1]?.pos ?? 0;
        return latestPos >= 4 && latestPos <= 15;
      })
      .sort((a, b) => {
        const posA = a.positions[a.positions.length - 1]?.pos ?? 99;
        const posB = b.positions[b.positions.length - 1]?.pos ?? 99;
        return posA - posB;
      })
      .slice(0, 10);

    // Step 5: Find keywords that improved this week
    const improvedKeywords = keywords
      .filter((kw) => {
        const latestChange = kw.positions[kw.positions.length - 1]?.change ?? 0;
        return latestChange > 0;
      })
      .sort((a, b) => {
        const changeA = a.positions[a.positions.length - 1]?.change ?? 0;
        const changeB = b.positions[b.positions.length - 1]?.change ?? 0;
        return changeB - changeA;
      })
      .slice(0, 5);

    // Step 6: Find keywords that dropped this week (need attention)
    const droppedKeywords = keywords
      .filter((kw) => {
        const latestChange = kw.positions[kw.positions.length - 1]?.change ?? 0;
        return latestChange < -3;
      })
      .sort((a, b) => {
        const changeA = a.positions[a.positions.length - 1]?.change ?? 0;
        const changeB = b.positions[b.positions.length - 1]?.change ?? 0;
        return changeA - changeB;
      })
      .slice(0, 5);

    // Step 7: Auto-add opportunity keywords to Soro Calendar
    const soroResults: Array<{ keyword: string; scheduledDate: string | null; error?: string }> = [];
    let soroAddedCount = 0;

    const session = await getSoroSession();
    if (session && opportunityKeywords.length > 0) {
      const cookieStr = buildSoroCookieString(session);
      const existingKeywords = await fetchSoroKeywords();

      for (const kw of opportunityKeywords) {
        // Skip if already in Soro
        if (existingKeywords.some((existing) => existing.includes(kw.name.toLowerCase()))) {
          soroResults.push({ keyword: kw.name, scheduledDate: null, error: "already in Soro" });
          continue;
        }

        // Add keyword to Soro library
        const keywordId = await soroAddKeyword(kw.name, cookieStr);
        if (!keywordId) {
          soroResults.push({ keyword: kw.name, scheduledDate: null, error: "failed to add" });
          continue;
        }

        // Schedule it in Soro Calendar
        const scheduledDate = await soroScheduleKeyword(keywordId, cookieStr);
        soroResults.push({ keyword: kw.name, scheduledDate });
        if (scheduledDate) soroAddedCount++;

        // Small delay to avoid rate limiting
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    // Step 8: Build notification report
    const opportunityList = opportunityKeywords
      .map((kw) => {
        const pos = kw.positions[kw.positions.length - 1]?.pos ?? 0;
        const change = kw.positions[kw.positions.length - 1]?.change ?? 0;
        const changeStr = change > 0 ? `↑${change}` : change < 0 ? `↓${Math.abs(change)}` : "→";
        const soroResult = soroResults.find((r) => r.keyword === kw.name);
        const soroTag = soroResult?.scheduledDate
          ? ` ✅ Soro: ${soroResult.scheduledDate}`
          : soroResult?.error === "already in Soro"
          ? " (已在 Soro)"
          : " ❌ Soro 新增失敗";
        return `• "${kw.name}" — 第 ${pos} 位 (${changeStr}) | 月搜 ${kw.volume ?? 0}${soroTag}`;
      })
      .join("\n");

    const improvedList = improvedKeywords
      .map((kw) => {
        const pos = kw.positions[kw.positions.length - 1]?.pos ?? 0;
        const change = kw.positions[kw.positions.length - 1]?.change ?? 0;
        return `• "${kw.name}" — 第 ${pos} 位 ↑${change}`;
      })
      .join("\n");

    const droppedList = droppedKeywords
      .map((kw) => {
        const pos = kw.positions[kw.positions.length - 1]?.pos ?? 0;
        const change = kw.positions[kw.positions.length - 1]?.change ?? 0;
        return `• "${kw.name}" — 第 ${pos} 位 ↓${Math.abs(change)}`;
      })
      .join("\n");

    const reportDate = new Date().toLocaleDateString("zh-HK", {
      timeZone: "Asia/Hong_Kong",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const soroSummaryLine =
      session
        ? `🤖 已自動新增 ${soroAddedCount} 個關鍵字至 Soro Calendar`
        : "⚠️ Soro 未連接（請更新 SORO_REFRESH_TOKEN）";

    const notificationContent = `
📊 每週 SEO 排名報告 (${reportDate})

📈 整體概況
• Top 5: ${summary.top5} 個關鍵字
• Top 10: ${summary.top10} 個關鍵字
• Top 30: ${summary.top30} 個關鍵字
• 平均排名: ${summary.avg_pos?.toFixed(1) ?? "N/A"}

🎯 機會關鍵字（排名 4-15，最容易衝上前 3）
${opportunityList || "本週無機會關鍵字"}

${soroSummaryLine}

✅ 本週進步關鍵字
${improvedList || "本週無進步關鍵字"}

⚠️ 本週下跌關鍵字（需關注）
${droppedList || "本週無大幅下跌關鍵字"}

💡 建議行動
• 針對機會關鍵字撰寫更深度的內容
• 為排名 4-10 的頁面增加內部連結
• 檢查下跌關鍵字的頁面，更新內容或修復技術問題
    `.trim();

    await notifyOwner({
      title: `📊 每週 SEO 報告 — ${opportunityKeywords.length} 個機會關鍵字，已加 ${soroAddedCount} 個至 Soro`,
      content: notificationContent,
    });

    return res.json({
      ok: true,
      date: today,
      summary,
      opportunityKeywords: opportunityKeywords.map((kw) => ({
        name: kw.name,
        position: kw.positions[kw.positions.length - 1]?.pos ?? 0,
        change: kw.positions[kw.positions.length - 1]?.change ?? 0,
        volume: kw.volume,
      })),
      soroResults,
      soroAddedCount,
      improvedCount: improvedKeywords.length,
      droppedCount: droppedKeywords.length,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[scheduledSeoOpportunity] Error:", error);
    return res.status(500).json({
      error,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
