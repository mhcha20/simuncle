/**
 * SE Ranking API helper
 * Data API: https://api.seranking.com (site audit, backlinks)
 * Project API: https://api.seranking.com (keyword rank tracking)
 * Auth: Authorization: Token <KEY>
 */

const SE_RANKING_BASE = "https://api.seranking.com";

function getApiKey(): string {
  const key = process.env.SE_RANKING_API_KEY;
  if (!key) throw new Error("SE_RANKING_API_KEY is not set");
  return key;
}

function getProjectToken(): string {
  const token = process.env.SE_RANKING_PROJECT_TOKEN;
  if (!token) throw new Error("SE_RANKING_PROJECT_TOKEN is not set");
  return token;
}

async function seRankingGet<T>(
  path: string,
  params?: Record<string, string | number>,
  token?: string
): Promise<T> {
  const url = new URL(`${SE_RANKING_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Token ${token ?? getApiKey()}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SE Ranking API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ─── Data API Types ────────────────────────────────────────────────────────────

export interface SubscriptionInfo {
  subscription_info: {
    status: string;
    start_date: string;
    expiraton_date: string;
    units_limit: number;
    units_left: number;
  };
}

export interface AuditListItem {
  id: number;
  url: string;
  title: string;
  last_update: string;
  status: string;
  stats: {
    score: number;
    errors: number;
    warnings: number;
    notices: number;
    crawled: number;
  };
  prev_stats: {
    score: number;
    errors: number;
    warnings: number;
    notices: number;
    crawled: number;
  } | null;
}

export interface AuditListResponse {
  items: AuditListItem[];
  total: number;
}

export interface AuditIssue {
  code: string;
  status: "error" | "warning" | "notice" | "passed";
  name: string;
  value: number;
}

export interface AuditSection {
  uid: string;
  name: string;
  props: Record<string, AuditIssue>;
}

export interface AuditReport {
  total_pages: number;
  total_warnings: number;
  total_errors: number;
  total_passed: number;
  total_notices: number;
  is_finished: boolean;
  score_percent: number;
  weighted_score_percent: number;
  audit_time: string;
  sections: AuditSection[];
  domain_props: {
    domain: string;
    expdate: string;
    backlinks: string;
  };
}

export interface BacklinksCountResponse {
  metrics: Array<{
    target: string;
    backlinks: number;
  }>;
}

export interface BacklinksAuthorityResponse {
  pages: Array<{
    url: string;
    inlink_rank: number;
    domain_inlink_rank: number;
  }>;
}

export interface AuditPage {
  id: string;
  url: string;
  status: string;
  title: string | null;
  description: string | null;
  issues: string;
  errors: string;
  warnings: string;
  notices: string;
  words_count: string;
  load_ms: string;
  indexable: string;
  indexable_status: string;
}

export interface AuditPagesResponse {
  items: AuditPage[];
  total: number;
}

// ─── Project API Types ─────────────────────────────────────────────────────────

export interface ProjectSite {
  id: number;
  title: string;
  name: string;
  group_id: number;
  is_active: number;
  match_mode?: string;
  exact_url: number;
  subdomain_match: number;
  depth: number;
  check_freq: string;
  check_day: number | null;
  guest_link: string;
  keyword_count: number;
}

export interface ProjectSearchEngine {
  site_engine_id: number;
  search_engine_id: number;
  region_id: number;
  region_name: string | null;
  lang_code: string;
  merge_map: number;
  business_name: string | null;
  phone: string | null;
  paid_results: number;
  keyword_count: number;
}

export interface ProjectKeyword {
  id: string;
  name: string;
  group_id: string;
  link: string | null;
  first_check_date: string;
  tags: string[];
  site_engine_ids: number[];
}

export interface KeywordPosition {
  date: string;
  pos: number;
  depth: number;
  change: number;
  price: number;
  is_map: number;
  map_position: number;
  paid_position: number;
}

export interface KeywordWithPositions {
  id: string;
  name: string;
  group_id: number;
  volume: number;
  competition: number;
  suggested_bid: number;
  cpc: number;
  results: number;
  total_sum: number;
  positions: KeywordPosition[];
}

export interface EnginePositions {
  site_engine_id: number;
  keywords: KeywordWithPositions[];
}

export interface ProjectSummary {
  top5: number;
  top10: number;
  top30: number;
  top50: number;
  top100: number;
  visibility: number;
  visibility_percent: number;
  avg_pos: number | null;
  keywords_count: number;
}

// ─── Data API Functions ────────────────────────────────────────────────────────

/** Check account subscription and credits */
export async function getSubscription(): Promise<SubscriptionInfo> {
  return seRankingGet<SubscriptionInfo>("/v1/account/subscription");
}

/** List all site audits */
export async function listAudits(): Promise<AuditListResponse> {
  return seRankingGet<AuditListResponse>("/v1/site-audit/audits");
}

/** Get detailed audit report for a specific audit */
export async function getAuditReport(auditId: number): Promise<AuditReport> {
  return seRankingGet<AuditReport>("/v1/site-audit/audits/report", { audit_id: auditId });
}

/** Get crawled pages for a specific audit */
export async function getAuditPages(auditId: number, limit = 50): Promise<AuditPagesResponse> {
  return seRankingGet<AuditPagesResponse>("/v1/site-audit/audits/pages", {
    audit_id: auditId,
    limit,
  });
}

/** Get backlinks count for a domain */
export async function getBacklinksCount(domain: string): Promise<BacklinksCountResponse> {
  return seRankingGet<BacklinksCountResponse>("/v1/backlinks/count", {
    target: domain,
    mode: "host",
  });
}

/** Get domain authority (inlink rank) */
export async function getDomainAuthority(domain: string): Promise<BacklinksAuthorityResponse> {
  return seRankingGet<BacklinksAuthorityResponse>("/v1/backlinks/authority", {
    target: domain,
  });
}

/**
 * Get a consolidated SEO summary for simuncle.com:
 * - Latest audit score, errors, warnings
 * - Top issues (errors + warnings) from the report
 * - Backlinks count
 * - Domain authority
 */
export async function getSeoSummary(domain = "simuncle.com") {
  const [auditsRes, backlinksRes, authorityRes] = await Promise.all([
    listAudits(),
    getBacklinksCount(domain),
    getDomainAuthority(domain),
  ]);

  // Pick the most recent finished audit
  const latestAudit = auditsRes.items.find((a) => a.status === "finished") ?? auditsRes.items[0];

  let auditReport: AuditReport | null = null;
  if (latestAudit) {
    auditReport = await getAuditReport(latestAudit.id);
  }

  // Extract top issues (errors first, then warnings)
  const topIssues: Array<{ name: string; status: string; count: number; section: string }> = [];
  if (auditReport) {
    for (const section of auditReport.sections) {
      for (const issue of Object.values(section.props)) {
        if ((issue.status === "error" || issue.status === "warning") && issue.value > 0) {
          topIssues.push({
            name: issue.name,
            status: issue.status,
            count: issue.value,
            section: section.name,
          });
        }
      }
    }
    // Sort: errors first, then by count desc
    topIssues.sort((a, b) => {
      if (a.status !== b.status) return a.status === "error" ? -1 : 1;
      return b.count - a.count;
    });
  }

  return {
    audit: latestAudit
      ? {
          id: latestAudit.id,
          url: latestAudit.url,
          lastUpdate: latestAudit.last_update,
          score: latestAudit.stats.score,
          errors: latestAudit.stats.errors,
          warnings: latestAudit.stats.warnings,
          notices: latestAudit.stats.notices,
          crawledPages: latestAudit.stats.crawled,
          prevScore: latestAudit.prev_stats?.score ?? null,
        }
      : null,
    topIssues: topIssues.slice(0, 10),
    backlinks: backlinksRes.metrics[0]?.backlinks ?? 0,
    domainAuthority: authorityRes.pages[0]?.domain_inlink_rank ?? 0,
    pageAuthority: authorityRes.pages[0]?.inlink_rank ?? 0,
    auditSections: auditReport?.sections ?? [],
  };
}

// ─── Project API Functions ─────────────────────────────────────────────────────

/** List all rank-tracker projects */
export async function listProjects(): Promise<ProjectSite[]> {
  return seRankingGet<ProjectSite[]>("/v1/project-management/sites", undefined, getProjectToken());
}

/** List search engines configured for a project */
export async function listSearchEngines(siteId: number): Promise<ProjectSearchEngine[]> {
  return seRankingGet<ProjectSearchEngine[]>(
    "/v1/project-management/sites/search-engines",
    { site_id: siteId },
    getProjectToken()
  );
}

/** List keywords for a project and search engine */
export async function listKeywords(
  siteId: number,
  siteEngineId: number
): Promise<ProjectKeyword[]> {
  return seRankingGet<ProjectKeyword[]>(
    "/v1/project-management/keywords",
    { site_id: siteId, site_engine_id: siteEngineId },
    getProjectToken()
  );
}

/** Get keyword ranking positions for a date range */
export async function getKeywordPositions(
  siteId: number,
  siteEngineId: number,
  dateFrom: string,
  dateTo: string
): Promise<EnginePositions[]> {
  return seRankingGet<EnginePositions[]>(
    "/v1/project-management/sites/positions",
    {
      site_id: siteId,
      site_engine_id: siteEngineId,
      date_from: dateFrom,
      date_to: dateTo,
    },
    getProjectToken()
  );
}

/** Get project summary statistics */
export async function getProjectSummary(siteId: number): Promise<ProjectSummary> {
  return seRankingGet<ProjectSummary>(
    "/v1/project-management/sites/summary",
    { site_id: siteId },
    getProjectToken()
  );
}

/**
 * Get consolidated keyword rankings for a project.
 * Returns the first project's keywords with their latest positions.
 */
export async function getKeywordRankings(siteId?: number, siteEngineId?: number) {
  // If no siteId provided, use the first project
  let targetSiteId = siteId;
  let targetEngineId = siteEngineId;

  if (!targetSiteId) {
    const projects = await listProjects();
    if (projects.length === 0) return { projects: [], keywords: [], summary: null };
    targetSiteId = projects[0].id;
  }

  if (!targetEngineId) {
    const engines = await listSearchEngines(targetSiteId);
    if (engines.length === 0) return { projects: await listProjects(), keywords: [], summary: null };
    // Prefer English engine
    const engEngine = engines.find((e) => e.lang_code === "en") ?? engines[0];
    targetEngineId = engEngine.site_engine_id;
  }

  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [projects, positionsData, summary] = await Promise.all([
    listProjects(),
    getKeywordPositions(targetSiteId, targetEngineId, thirtyDaysAgo, today),
    getProjectSummary(targetSiteId),
  ]);

  // Flatten keywords from the matching engine
  const engineData = positionsData.find((e) => e.site_engine_id === targetEngineId);
  const keywords = engineData?.keywords ?? [];

  return {
    projects,
    selectedSiteId: targetSiteId,
    selectedEngineId: targetEngineId,
    keywords: keywords.map((kw) => ({
      id: kw.id,
      name: kw.name,
      volume: kw.volume,
      competition: kw.competition,
      cpc: kw.cpc,
      latestPosition: kw.positions[kw.positions.length - 1]?.pos ?? 0,
      positionChange: kw.positions[kw.positions.length - 1]?.change ?? 0,
      positions: kw.positions,
    })),
    summary,
  };
}
