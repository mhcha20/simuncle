import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import {
  getSeoSummary,
  getSubscription,
  listAudits,
  getAuditReport,
  getAuditPages,
  listProjects,
  listSearchEngines,
  getKeywordRankings,
  getProjectSummary,
} from "../seranking";

export const serankingRouter = router({
  /** Get SEO summary: audit score, top issues, backlinks, domain authority */
  getSeoSummary: adminProcedure.query(async () => {
    return getSeoSummary("simuncle.com");
  }),

  /** Get SE Ranking account subscription & credits */
  getSubscription: adminProcedure.query(async () => {
    return getSubscription();
  }),

  /** List all audits */
  listAudits: adminProcedure.query(async () => {
    return listAudits();
  }),

  /** Get detailed audit report */
  getAuditReport: adminProcedure
    .input(z.object({ auditId: z.number() }))
    .query(async ({ input }) => {
      return getAuditReport(input.auditId);
    }),

  /** Get crawled pages for an audit */
  getAuditPages: adminProcedure
    .input(z.object({ auditId: z.number(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      return getAuditPages(input.auditId, input.limit ?? 50);
    }),

  // ─── Project API (Rank Tracker) ─────────────────────────────────────────────

  /** List all rank-tracker projects */
  listProjects: adminProcedure.query(async () => {
    return listProjects();
  }),

  /** List search engines for a project */
  listSearchEngines: adminProcedure
    .input(z.object({ siteId: z.number() }))
    .query(async ({ input }) => {
      return listSearchEngines(input.siteId);
    }),

  /** Get keyword rankings with positions for a project */
  getKeywordRankings: adminProcedure
    .input(
      z.object({
        siteId: z.number().optional(),
        siteEngineId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return getKeywordRankings(input.siteId, input.siteEngineId);
    }),

  /** Get project summary statistics */
  getProjectSummary: adminProcedure
    .input(z.object({ siteId: z.number() }))
    .query(async ({ input }) => {
      return getProjectSummary(input.siteId);
    }),
});
