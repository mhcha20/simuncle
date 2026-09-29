import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { orders, topupOrders, searchAnalytics } from "../drizzle/schema";
import { and, gte, lt, sql, count, eq } from "drizzle-orm";
import { sendViaResend } from "./email";

/**
 * Monthly Traffic Report — Heartbeat handler
 * Runs on the 1st of each month at UTC 01:00 (HKT 09:00).
 * Collects:
 *   1. Umami analytics (UV/PV, traffic sources, top pages, countries)
 *   2. DB orders/revenue data (current month vs previous month)
 *   3. Search analytics (top searches)
 * Sends a formatted HTML email report to manhey@gmail.com.
 */

const REPORT_EMAIL = "manhey@gmail.com";
// Umami API base, e.g. https://api.umami.is/v1 (Umami Cloud) or https://umami.example.com/api (self-hosted).
// Without UMAMI_API_URL / UMAMI_WEBSITE_ID the report simply leaves out the traffic section.
const UMAMI_API_URL = (process.env.UMAMI_API_URL || "").replace(/\/+$/, "");
const UMAMI_WEBSITE_ID = process.env.UMAMI_WEBSITE_ID || "";
const UMAMI_API_KEY = process.env.UMAMI_API_KEY || "";
const umamiHeaders = (): Record<string, string> => (UMAMI_API_KEY ? { "x-umami-api-key": UMAMI_API_KEY } : {});

// ─── Umami API helpers ───────────────────────────────────────────────────────

const umamiConfigured = () => Boolean(UMAMI_API_URL && UMAMI_WEBSITE_ID);

interface UmamiStats {
  pageviews: { value: number; prev: number };
  visitors: { value: number; prev: number };
  visits: { value: number; prev: number };
  bounces: { value: number; prev: number };
  totaltime: { value: number; prev: number };
}

interface UmamiMetric {
  x: string;
  y: number;
}

async function fetchUmamiStats(startAt: number, endAt: number): Promise<UmamiStats | null> {
  if (!umamiConfigured()) return null;
  try {
    const url = `${UMAMI_API_URL}/websites/${UMAMI_WEBSITE_ID}/stats?startAt=${startAt}&endAt=${endAt}`;
    const r = await fetch(url, { headers: umamiHeaders() });
    if (!r.ok) {
      console.log(`[MonthlyReport] Umami stats failed: ${r.status}`);
      return null;
    }
    return await r.json() as UmamiStats;
  } catch (e) {
    console.log(`[MonthlyReport] Umami stats error:`, e);
    return null;
  }
}

async function fetchUmamiMetrics(startAt: number, endAt: number, type: string, limit = 10): Promise<UmamiMetric[]> {
  if (!umamiConfigured()) return [];
  try {
    const url = `${UMAMI_API_URL}/websites/${UMAMI_WEBSITE_ID}/metrics?startAt=${startAt}&endAt=${endAt}&type=${type}&limit=${limit}`;
    const r = await fetch(url, { headers: umamiHeaders() });
    if (!r.ok) {
      console.log(`[MonthlyReport] Umami metrics (${type}) failed: ${r.status}`);
      return [];
    }
    return await r.json() as UmamiMetric[];
  } catch (e) {
    console.log(`[MonthlyReport] Umami metrics (${type}) error:`, e);
    return [];
  }
}

// ─── DB data helpers ─────────────────────────────────────────────────────────

interface MonthlyOrderStats {
  totalOrders: number;
  paidOrders: number;
  completedOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  topProducts: { name: string; count: number }[];
}

async function getOrderStats(startDate: Date, endDate: Date): Promise<MonthlyOrderStats> {
  const db = await getDb();
  if (!db) return { totalOrders: 0, paidOrders: 0, completedOrders: 0, totalRevenue: 0, avgOrderValue: 0, topProducts: [] };

  // Total orders in period
  const [totalResult] = await db
    .select({ count: count() })
    .from(orders)
    .where(and(gte(orders.createdAt, startDate), lt(orders.createdAt, endDate)));

  // Paid/completed orders
  const [paidResult] = await db
    .select({ count: count() })
    .from(orders)
    .where(and(
      gte(orders.createdAt, startDate),
      lt(orders.createdAt, endDate),
      sql`${orders.status} IN ('paid', 'completed', 'processing')`
    ));

  // Revenue (sum of totalAmount for paid orders)
  const [revenueResult] = await db
    .select({ total: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)` })
    .from(orders)
    .where(and(
      gte(orders.createdAt, startDate),
      lt(orders.createdAt, endDate),
      sql`${orders.status} IN ('paid', 'completed', 'processing')`
    ));

  // Top products
  const topProducts = await db
    .select({
      name: orders.productName,
      count: count(),
    })
    .from(orders)
    .where(and(
      gte(orders.createdAt, startDate),
      lt(orders.createdAt, endDate),
      sql`${orders.status} IN ('paid', 'completed', 'processing')`
    ))
    .groupBy(orders.productName)
    .orderBy(sql`count(*) DESC`)
    .limit(5);

  const totalOrders = totalResult?.count ?? 0;
  const paidOrders = paidResult?.count ?? 0;
  const totalRevenue = parseFloat(revenueResult?.total ?? "0");
  const avgOrderValue = paidOrders > 0 ? totalRevenue / paidOrders : 0;

  return {
    totalOrders,
    paidOrders,
    completedOrders: paidOrders,
    totalRevenue,
    avgOrderValue,
    topProducts: topProducts.map(p => ({ name: p.name, count: p.count })),
  };
}

async function getTopupStats(startDate: Date, endDate: Date): Promise<{ count: number; revenue: number }> {
  const db = await getDb();
  if (!db) return { count: 0, revenue: 0 };

  const [result] = await db
    .select({
      count: count(),
      revenue: sql<string>`COALESCE(SUM(${topupOrders.priceHkd}), 0)`,
    })
    .from(topupOrders)
    .where(and(
      gte(topupOrders.createdAt, startDate),
      lt(topupOrders.createdAt, endDate),
      eq(topupOrders.status, "completed")
    ));

  return {
    count: result?.count ?? 0,
    revenue: parseFloat(result?.revenue ?? "0"),
  };
}

async function getTopSearches(startDate: Date, endDate: Date, limit = 10): Promise<{ query: string; count: number }[]> {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select({
      query: searchAnalytics.query,
      count: count(),
    })
    .from(searchAnalytics)
    .where(and(
      gte(searchAnalytics.createdAt, startDate),
      lt(searchAnalytics.createdAt, endDate)
    ))
    .groupBy(searchAnalytics.query)
    .orderBy(sql`count(*) DESC`)
    .limit(limit);

  return results.map(r => ({ query: r.query, count: r.count }));
}

// ─── Email HTML builder ──────────────────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

function formatCurrency(n: number): string {
  return `HK$${Math.round(n).toLocaleString("en-US")}`;
}

function calcChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? "+∞%" : "—";
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function changeColor(current: number, previous: number): string {
  if (current >= previous) return "#22c55e"; // green
  return "#ef4444"; // red
}

function buildReportHtml(params: {
  monthLabel: string;
  prevMonthLabel: string;
  umamiStats: UmamiStats | null;
  prevUmamiStats: UmamiStats | null;
  topPages: UmamiMetric[];
  trafficSources: UmamiMetric[];
  topCountries: UmamiMetric[];
  orderStats: MonthlyOrderStats;
  prevOrderStats: MonthlyOrderStats;
  topupStats: { count: number; revenue: number };
  prevTopupStats: { count: number; revenue: number };
  topSearches: { query: string; count: number }[];
}): string {
  const { monthLabel, prevMonthLabel, umamiStats, prevUmamiStats, topPages, trafficSources, topCountries, orderStats, prevOrderStats, topupStats, prevTopupStats, topSearches } = params;

  // Traffic section
  const pv = umamiStats?.pageviews?.value ?? 0;
  const prevPv = prevUmamiStats?.pageviews?.value ?? 0;
  const uv = umamiStats?.visitors?.value ?? 0;
  const prevUv = prevUmamiStats?.visitors?.value ?? 0;
  const visits = umamiStats?.visits?.value ?? 0;
  const prevVisits = prevUmamiStats?.visits?.value ?? 0;
  const bounceRate = visits > 0 && umamiStats?.bounces ? Math.round((umamiStats.bounces.value / visits) * 100) : 0;
  const avgTime = visits > 0 && umamiStats?.totaltime ? Math.round(umamiStats.totaltime.value / visits) : 0;

  const trafficAvailable = umamiStats !== null;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:24px 16px;">

<!-- Header -->
<div style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);border-radius:12px;padding:32px 24px;text-align:center;margin-bottom:24px;">
  <h1 style="color:#fff;margin:0 0 8px;font-size:22px;">📊 SIM Uncle 月度報告</h1>
  <p style="color:#94a3b8;margin:0;font-size:14px;">${monthLabel} | simuncle.com</p>
</div>

<!-- Traffic Overview -->
<div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <h2 style="margin:0 0 16px;font-size:16px;color:#1e293b;">🌐 流量概覽</h2>
  ${trafficAvailable ? `
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:12px;text-align:center;border-bottom:1px solid #f1f5f9;">
        <div style="font-size:24px;font-weight:700;color:#1e293b;">${formatNumber(uv)}</div>
        <div style="font-size:12px;color:#64748b;">獨立訪客 (UV)</div>
        <div style="font-size:11px;color:${changeColor(uv, prevUv)};">${calcChange(uv, prevUv)} vs 上月</div>
      </td>
      <td style="padding:12px;text-align:center;border-bottom:1px solid #f1f5f9;">
        <div style="font-size:24px;font-weight:700;color:#1e293b;">${formatNumber(pv)}</div>
        <div style="font-size:12px;color:#64748b;">頁面瀏覽 (PV)</div>
        <div style="font-size:11px;color:${changeColor(pv, prevPv)};">${calcChange(pv, prevPv)} vs 上月</div>
      </td>
    </tr>
    <tr>
      <td style="padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#1e293b;">${formatNumber(visits)}</div>
        <div style="font-size:12px;color:#64748b;">訪問次數</div>
        <div style="font-size:11px;color:${changeColor(visits, prevVisits)};">${calcChange(visits, prevVisits)} vs 上月</div>
      </td>
      <td style="padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#1e293b;">${bounceRate}%</div>
        <div style="font-size:12px;color:#64748b;">跳出率</div>
        <div style="font-size:11px;color:#64748b;">平均停留 ${avgTime}s</div>
      </td>
    </tr>
  </table>` : `
  <p style="color:#94a3b8;text-align:center;font-size:14px;">⚠️ Umami Analytics 數據暫時無法獲取</p>`}
</div>

<!-- Traffic Sources -->
${trafficSources.length > 0 ? `
<div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <h2 style="margin:0 0 16px;font-size:16px;color:#1e293b;">📡 流量來源 Top 5</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <tr style="background:#f8fafc;">
      <th style="padding:8px;text-align:left;color:#64748b;">來源</th>
      <th style="padding:8px;text-align:right;color:#64748b;">訪問</th>
    </tr>
    ${trafficSources.slice(0, 5).map((s, i) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:8px;">${i + 1}. ${s.x || '(直接訪問)'}</td>
      <td style="padding:8px;text-align:right;font-weight:600;">${formatNumber(s.y)}</td>
    </tr>`).join('')}
  </table>
</div>` : ''}

<!-- Top Pages -->
${topPages.length > 0 ? `
<div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <h2 style="margin:0 0 16px;font-size:16px;color:#1e293b;">📄 熱門頁面 Top 10</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <tr style="background:#f8fafc;">
      <th style="padding:8px;text-align:left;color:#64748b;">頁面</th>
      <th style="padding:8px;text-align:right;color:#64748b;">瀏覽</th>
    </tr>
    ${topPages.slice(0, 10).map((p, i) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:8px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${i + 1}. ${p.x}</td>
      <td style="padding:8px;text-align:right;font-weight:600;">${formatNumber(p.y)}</td>
    </tr>`).join('')}
  </table>
</div>` : ''}

<!-- Top Countries -->
${topCountries.length > 0 ? `
<div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <h2 style="margin:0 0 16px;font-size:16px;color:#1e293b;">🌍 訪客地區 Top 5</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <tr style="background:#f8fafc;">
      <th style="padding:8px;text-align:left;color:#64748b;">國家/地區</th>
      <th style="padding:8px;text-align:right;color:#64748b;">訪客</th>
    </tr>
    ${topCountries.slice(0, 5).map((c, i) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:8px;">${i + 1}. ${c.x}</td>
      <td style="padding:8px;text-align:right;font-weight:600;">${formatNumber(c.y)}</td>
    </tr>`).join('')}
  </table>
</div>` : ''}

<!-- Orders & Revenue -->
<div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <h2 style="margin:0 0 16px;font-size:16px;color:#1e293b;">💰 訂單與收入</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:12px;text-align:center;border-bottom:1px solid #f1f5f9;">
        <div style="font-size:24px;font-weight:700;color:#1e293b;">${formatNumber(orderStats.paidOrders)}</div>
        <div style="font-size:12px;color:#64748b;">已付款訂單</div>
        <div style="font-size:11px;color:${changeColor(orderStats.paidOrders, prevOrderStats.paidOrders)};">${calcChange(orderStats.paidOrders, prevOrderStats.paidOrders)} vs 上月</div>
      </td>
      <td style="padding:12px;text-align:center;border-bottom:1px solid #f1f5f9;">
        <div style="font-size:24px;font-weight:700;color:#1e293b;">${formatCurrency(orderStats.totalRevenue)}</div>
        <div style="font-size:12px;color:#64748b;">總收入</div>
        <div style="font-size:11px;color:${changeColor(orderStats.totalRevenue, prevOrderStats.totalRevenue)};">${calcChange(orderStats.totalRevenue, prevOrderStats.totalRevenue)} vs 上月</div>
      </td>
    </tr>
    <tr>
      <td style="padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#1e293b;">${formatCurrency(orderStats.avgOrderValue)}</div>
        <div style="font-size:12px;color:#64748b;">平均訂單金額</div>
      </td>
      <td style="padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#1e293b;">${formatNumber(orderStats.totalOrders)}</div>
        <div style="font-size:12px;color:#64748b;">總訂單數</div>
      </td>
    </tr>
  </table>
  ${orderStats.topProducts.length > 0 ? `
  <div style="margin-top:16px;padding-top:16px;border-top:1px solid #f1f5f9;">
    <h3 style="margin:0 0 8px;font-size:13px;color:#64748b;">🏆 熱銷產品 Top 5</h3>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      ${orderStats.topProducts.map((p, i) => `
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:6px 8px;">${i + 1}. ${p.name.substring(0, 50)}${p.name.length > 50 ? '...' : ''}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:600;">${p.count} 單</td>
      </tr>`).join('')}
    </table>
  </div>` : ''}
</div>

<!-- Top-up Stats -->
<div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <h2 style="margin:0 0 16px;font-size:16px;color:#1e293b;">🔋 加值訂單</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#1e293b;">${formatNumber(topupStats.count)}</div>
        <div style="font-size:12px;color:#64748b;">加值訂單</div>
        <div style="font-size:11px;color:${changeColor(topupStats.count, prevTopupStats.count)};">${calcChange(topupStats.count, prevTopupStats.count)} vs 上月</div>
      </td>
      <td style="padding:12px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#1e293b;">${formatCurrency(topupStats.revenue)}</div>
        <div style="font-size:12px;color:#64748b;">加值收入</div>
        <div style="font-size:11px;color:${changeColor(topupStats.revenue, prevTopupStats.revenue)};">${calcChange(topupStats.revenue, prevTopupStats.revenue)} vs 上月</div>
      </td>
    </tr>
  </table>
</div>

<!-- Search Analytics -->
${topSearches.length > 0 ? `
<div style="background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <h2 style="margin:0 0 16px;font-size:16px;color:#1e293b;">🔍 熱門搜尋</h2>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <tr style="background:#f8fafc;">
      <th style="padding:8px;text-align:left;color:#64748b;">關鍵字</th>
      <th style="padding:8px;text-align:right;color:#64748b;">次數</th>
    </tr>
    ${topSearches.slice(0, 10).map((s, i) => `
    <tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:8px;">${i + 1}. ${s.query}</td>
      <td style="padding:8px;text-align:right;font-weight:600;">${formatNumber(s.count)}</td>
    </tr>`).join('')}
  </table>
</div>` : ''}

<!-- Footer -->
<div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;">
  <p>此報告由 SIM Uncle 系統自動生成 | ${new Date().toISOString().split('T')[0]}</p>
  <p>上月數據：${prevMonthLabel}</p>
</div>

</div>
</body>
</html>`;
}

function buildReportText(params: {
  monthLabel: string;
  umamiStats: UmamiStats | null;
  orderStats: MonthlyOrderStats;
  topupStats: { count: number; revenue: number };
}): string {
  const { monthLabel, umamiStats, orderStats, topupStats } = params;
  const pv = umamiStats?.pageviews?.value ?? 0;
  const uv = umamiStats?.visitors?.value ?? 0;

  return `SIM Uncle 月度報告 - ${monthLabel}

流量概覽:
- 獨立訪客 (UV): ${formatNumber(uv)}
- 頁面瀏覽 (PV): ${formatNumber(pv)}

訂單與收入:
- 已付款訂單: ${formatNumber(orderStats.paidOrders)}
- 總收入: ${formatCurrency(orderStats.totalRevenue)}
- 平均訂單金額: ${formatCurrency(orderStats.avgOrderValue)}

加值訂單:
- 訂單數: ${formatNumber(topupStats.count)}
- 收入: ${formatCurrency(topupStats.revenue)}

此報告由 SIM Uncle 系統自動生成。`;
}

// ─── Main handler ────────────────────────────────────────────────────────────

export async function handleScheduledMonthlyReport(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    console.log("[MonthlyReport] Starting monthly traffic report generation");

    // Calculate date ranges for last month and the month before
    const now = new Date();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of current month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); // 1st of last month
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 2, 1); // 1st of 2 months ago

    const monthLabel = lastMonthStart.toLocaleDateString("zh-TW", { year: "numeric", month: "long" });
    const prevMonthLabel = prevMonthStart.toLocaleDateString("zh-TW", { year: "numeric", month: "long" });

    const lastMonthStartMs = lastMonthStart.getTime();
    const lastMonthEndMs = lastMonthEnd.getTime();
    const prevMonthStartMs = prevMonthStart.getTime();
    const prevMonthEndMs = lastMonthStart.getTime();

    // 1. Fetch Umami analytics
    console.log("[MonthlyReport] Fetching Umami stats...");
    const [umamiStats, prevUmamiStats, topPages, trafficSources, topCountries] = await Promise.all([
      fetchUmamiStats(lastMonthStartMs, lastMonthEndMs),
      fetchUmamiStats(prevMonthStartMs, prevMonthEndMs),
      fetchUmamiMetrics(lastMonthStartMs, lastMonthEndMs, "url", 10),
      fetchUmamiMetrics(lastMonthStartMs, lastMonthEndMs, "referrer", 10),
      fetchUmamiMetrics(lastMonthStartMs, lastMonthEndMs, "country", 10),
    ]);

    // 2. Fetch DB order stats
    console.log("[MonthlyReport] Fetching order stats...");
    const [orderStats, prevOrderStats, topupStats, prevTopupStats, topSearches] = await Promise.all([
      getOrderStats(lastMonthStart, lastMonthEnd),
      getOrderStats(prevMonthStart, lastMonthStart),
      getTopupStats(lastMonthStart, lastMonthEnd),
      getTopupStats(prevMonthStart, lastMonthStart),
      getTopSearches(lastMonthStart, lastMonthEnd, 10),
    ]);

    // 3. Build email
    console.log("[MonthlyReport] Building report email...");
    const html = buildReportHtml({
      monthLabel,
      prevMonthLabel,
      umamiStats,
      prevUmamiStats,
      topPages,
      trafficSources,
      topCountries,
      orderStats,
      prevOrderStats,
      topupStats,
      prevTopupStats,
      topSearches,
    });

    const text = buildReportText({ monthLabel, umamiStats, orderStats, topupStats });

    // 4. Send email
    console.log("[MonthlyReport] Sending report to", REPORT_EMAIL);
    const sent = await sendViaResend({
      to: REPORT_EMAIL,
      subject: `📊 SIM Uncle 月度報告 — ${monthLabel}`,
      html,
      text,
    });

    if (sent) {
      console.log("[MonthlyReport] Report sent successfully");
    } else {
      console.log("[MonthlyReport] Failed to send report email");
    }

    res.json({
      ok: true,
      sent,
      month: monthLabel,
      stats: {
        umamiAvailable: umamiStats !== null,
        orders: orderStats.paidOrders,
        revenue: orderStats.totalRevenue,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[MonthlyReport] Error:", msg);
    res.status(500).json({
      error: msg,
      stack: err instanceof Error ? err.stack : undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
