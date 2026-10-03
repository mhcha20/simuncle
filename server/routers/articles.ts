import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { articles } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";
import { translateArticleToLanguages } from "../articleTranslation";
import { TRPCError } from "@trpc/server";
import { submitToIndexNow, SITE_HOST } from "../indexnow";

// Helper: check admin
function requireAdmin(role: string | undefined) {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
}

// Helper: slugify
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 200);
}

const articleInputSchema = z.object({
  slug: z.string().min(1).max(255).optional(),
  coverImage: z.string().optional().nullable(),
  status: z.enum(["draft", "published"]).optional(),
  // zh-TW
  titleZhTW: z.string().max(512).optional().nullable(),
  excerptZhTW: z.string().optional().nullable(),
  contentZhTW: z.string().optional().nullable(),
  // zh-CN
  titleZhCN: z.string().max(512).optional().nullable(),
  excerptZhCN: z.string().optional().nullable(),
  contentZhCN: z.string().optional().nullable(),
  // en
  titleEn: z.string().max(512).optional().nullable(),
  excerptEn: z.string().optional().nullable(),
  contentEn: z.string().optional().nullable(),
  // ja
  titleJa: z.string().max(512).optional().nullable(),
  excerptJa: z.string().optional().nullable(),
  contentJa: z.string().optional().nullable(),
  // ko
  titleKo: z.string().max(512).optional().nullable(),
  excerptKo: z.string().optional().nullable(),
  contentKo: z.string().optional().nullable(),
  // th
  titleTh: z.string().max(512).optional().nullable(),
  excerptTh: z.string().optional().nullable(),
  contentTh: z.string().optional().nullable(),
  publishedAt: z.date().optional().nullable(),
});

export const articlesRouter = router({
  // Public: get related articles by category (excluding current article)
  related: publicProcedure
    .input(z.object({
      category: z.string().nullable().optional(),
      excludeSlug: z.string(),
      limit: z.number().min(1).max(6).default(3),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { and: andOp, ne } = await import("drizzle-orm");
      const conditions = [
        eq(articles.status, "published"),
        ne(articles.slug, input.excludeSlug),
      ];
      if (input.category) {
        conditions.push(eq(articles.category, input.category));
      }
      return db
        .select({
          id: articles.id,
          slug: articles.slug,
          coverImage: articles.coverImage,
          category: articles.category,
          publishedAt: articles.publishedAt,
          titleZhTW: articles.titleZhTW,
          titleZhCN: articles.titleZhCN,
          titleEn: articles.titleEn,
          titleJa: articles.titleJa,
          titleKo: articles.titleKo,
          titleTh: articles.titleTh,
          excerptZhTW: articles.excerptZhTW,
          excerptZhCN: articles.excerptZhCN,
          excerptEn: articles.excerptEn,
          excerptJa: articles.excerptJa,
          excerptKo: articles.excerptKo,
          excerptTh: articles.excerptTh,
        })
        .from(articles)
        .where(andOp(...conditions))
        .orderBy(desc(articles.publishedAt))
        .limit(input.limit);
    }),

  // Public: list published articles (with optional category filter)
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().default(0),
      category: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { and: andOp } = await import("drizzle-orm");
      const conditions = [eq(articles.status, "published")];
      if (input.category && input.category !== "all") {
        conditions.push(eq(articles.category, input.category));
      }
      const rows = await db
        .select()
        .from(articles)
        .where(andOp(...conditions))
        .orderBy(desc(articles.publishedAt))
        .limit(input.limit)
        .offset(input.offset);
      return rows;
    }),

  // Public: count published articles (with optional category filter)
  count: publicProcedure
    .input(z.object({ category: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { total: 0 };
      const { count: countFn, and: andOp } = await import("drizzle-orm");
      const conditions = [eq(articles.status, "published")];
      if (input.category && input.category !== "all") {
        conditions.push(eq(articles.category, input.category));
      }
      const [row] = await db
        .select({ total: countFn() })
        .from(articles)
        .where(andOp(...conditions));
      return { total: row?.total ?? 0 };
    }),

  // Public: get category counts for all published articles
  categoryCounts: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const { count: countFn, sql } = await import("drizzle-orm");
    const rows = await db
      .select({
        category: articles.category,
        count: countFn(),
      })
      .from(articles)
      .where(eq(articles.status, "published"))
      .groupBy(sql`${articles.category}`);
    return rows;
  }),

  // Public: search published articles by keyword (for related articles on destination pages)
  search: publicProcedure
    .input(z.object({ keyword: z.string().min(1).max(100), limit: z.number().min(1).max(10).default(3) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const { like, or } = await import("drizzle-orm");
      const kw = `%${input.keyword}%`;
      const rows = await db
        .select({
          id: articles.id,
          slug: articles.slug,
          titleZhTW: articles.titleZhTW,
          titleEn: articles.titleEn,
          titleZhCN: articles.titleZhCN,
          titleJa: articles.titleJa,
          titleKo: articles.titleKo,
          titleTh: articles.titleTh,
          excerptZhTW: articles.excerptZhTW,
          excerptEn: articles.excerptEn,
          coverImage: articles.coverImage,
          publishedAt: articles.publishedAt,
        })
        .from(articles)
        .where(
          and(
            eq(articles.status, "published"),
            or(
              like(articles.titleZhTW, kw),
              like(articles.titleEn, kw),
              like(articles.titleZhCN, kw),
              like(articles.excerptZhTW, kw),
              like(articles.excerptEn, kw)
            )
          )
        )
        .orderBy(desc(articles.publishedAt))
        .limit(input.limit);
      return rows;
    }),

  // Public: get single article by slug
  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db
        .select()
        .from(articles)
        .where(and(eq(articles.slug, input.slug), eq(articles.status, "published")));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  // Admin: batch classify articles that have no category
  batchClassify: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(5) }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { isNull, or } = await import("drizzle-orm");
      // Fetch articles without category
      const uncategorized = await db
        .select({ id: articles.id, titleZhTW: articles.titleZhTW, titleEn: articles.titleEn, excerptZhTW: articles.excerptZhTW, excerptEn: articles.excerptEn })
        .from(articles)
        .where(or(isNull(articles.category), eq(articles.category, "")))
        .limit(input.limit);

      if (uncategorized.length === 0) return { classified: 0, remaining: 0 };

      const CATEGORIES_LIST = ["travel-tips", "esim-guide", "destination-guide", "news"] as const;
      let classified = 0;

      for (const article of uncategorized) {
        try {
          const title = article.titleZhTW || article.titleEn || "";
          const excerpt = article.excerptZhTW || article.excerptEn || "";
          const response = await invokeLLM({
            messages: [{
              role: "user",
              content: `Classify this article into exactly one category.\nCategories:\n- travel-tips: Travel tips, packing guides, travel hacks, airport tips\n- esim-guide: eSIM tutorials, setup guides, how-to, compatibility, troubleshooting\n- destination-guide: Country/city guides, local info, attractions, what to do\n- news: Industry news, product launches, announcements, updates\n\nTitle: ${title}\nExcerpt: ${excerpt}\n\nReturn JSON with a single "category" field.`,
            }],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "classification",
                strict: true,
                schema: {
                  type: "object",
                  properties: { category: { type: "string", enum: [...CATEGORIES_LIST] } },
                  required: ["category"],
                  additionalProperties: false,
                },
              },
            },
          });
          const raw = response.choices[0].message.content;
          const parsed = typeof raw === "string" ? JSON.parse(raw) : (raw as unknown) as { category: string };
          const cat = parsed.category as string;
          const validCat = CATEGORIES_LIST.includes(cat as any) ? cat : "news";
          await db.update(articles).set({ category: validCat }).where(eq(articles.id, article.id));
          classified++;
        } catch (err) {
          console.warn(`[batchClassify] Failed for article ${article.id}:`, err);
        }
      }

      // Count remaining uncategorized
      const { count: countFn } = await import("drizzle-orm");
      const [rem] = await db.select({ total: countFn() }).from(articles).where(or(isNull(articles.category), eq(articles.category, "")));
      return { classified, remaining: rem?.total ?? 0 };
    }),

  // Admin: list all articles (including drafts)
  adminList: protectedProcedure.query(async ({ ctx }) => {
    requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) return [];
      return db.select().from(articles).orderBy(desc(articles.updatedAt));
  }),

  // Admin: get single article by id (for editing)
  adminGet: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [row] = await db.select().from(articles).where(eq(articles.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  // Admin: create article
  create: protectedProcedure
    .input(articleInputSchema)
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Auto-generate slug from titleZhTW or titleEn if not provided
      let slug = input.slug;
      if (!slug) {
        const base = input.titleZhTW || input.titleEn || `article-${Date.now()}`;
        slug = slugify(base) || `article-${Date.now()}`;
      }
      // Ensure unique slug
      const existing = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug));
      if (existing.length > 0) {
        slug = `${slug}-${Date.now()}`;
      }
      const [result] = await db.insert(articles).values({
        ...input,
        slug,
        authorId: ctx.user.id,
        publishedAt: input.status === "published" ? (input.publishedAt ?? new Date()) : null,
      });
      // Submit to Bing IndexNow if publishing immediately
      if (input.status === "published") {
        submitToIndexNow([`https://${SITE_HOST}/blog/${slug}`]).catch((err) =>
          console.warn("[IndexNow] Article create submission failed:", err)
        );
      }
      return { id: (result as any).insertId, slug };
    }),

  // Admin: update article
  update: protectedProcedure
    .input(z.object({ id: z.number() }).merge(articleInputSchema))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { id, ...data } = input;
      // If publishing for first time, set publishedAt
      const [existing] = await db.select().from(articles).where(eq(articles.id, id));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const publishedAt =
        data.status === "published" && !existing.publishedAt
          ? new Date()
          : data.publishedAt !== undefined
          ? data.publishedAt
          : existing.publishedAt;
      await db.update(articles).set({ ...data, publishedAt }).where(eq(articles.id, id));
      // Submit to Bing IndexNow when publishing (new publish or re-publish)
      if (data.status === "published") {
        const slug = data.slug || existing.slug;
        if (slug) {
          submitToIndexNow([`https://${SITE_HOST}/blog/${slug}`]).catch((err) =>
            console.warn("[IndexNow] Article update submission failed:", err)
          );
        }
      }
      return { success: true };
    }),

  // Admin: delete article
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(articles).where(eq(articles.id, input.id));
      return { success: true };
    }),

  // Admin: AI translate — given source language content, translate to all other languages
  aiTranslate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        sourceLang: z.enum(["zh-TW", "zh-CN", "en", "ja", "ko", "th"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [article] = await db.select().from(articles).where(eq(articles.id, input.id));
      if (!article) throw new TRPCError({ code: "NOT_FOUND" });

      // Get source content
      const langMap: Record<string, { title: string | null; excerpt: string | null; content: string | null }> = {
        "zh-TW": { title: article.titleZhTW, excerpt: article.excerptZhTW, content: article.contentZhTW },
        "zh-CN": { title: article.titleZhCN, excerpt: article.excerptZhCN, content: article.contentZhCN },
        en: { title: article.titleEn, excerpt: article.excerptEn, content: article.contentEn },
        ja: { title: article.titleJa, excerpt: article.excerptJa, content: article.contentJa },
        ko: { title: article.titleKo, excerpt: article.excerptKo, content: article.contentKo },
        th: { title: article.titleTh, excerpt: article.excerptTh, content: article.contentTh },
      };

      const source = langMap[input.sourceLang];
      if (!source.title && !source.content) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Source language has no content to translate" });
      }

      const targetLangs = ["zh-TW", "zh-CN", "en", "ja", "ko", "th"].filter((l) => l !== input.sourceLang);
      const translated = await translateArticleToLanguages(
        { title: source.title || "", excerpt: source.excerpt || "", content: source.content || "" },
        input.sourceLang,
        targetLangs,
      );
      const translations: Record<string, { title: string; excerpt: string; content: string }> = {};
      const failedLanguages: string[] = [];
      for (const lang of targetLangs) {
        const t = translated[lang];
        if (t) translations[lang] = t;
        else failedLanguages.push(lang);
      }
      if (Object.keys(translations).length === 0) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI translation failed for every language, please try again" });
      }

      // Build update object
      const updateData: Partial<typeof articles.$inferInsert> = {};
      for (const lang of targetLangs) {
        const t = translations[lang];
        if (!t) continue;
        if (lang === "zh-TW") {
          updateData.titleZhTW = t.title;
          updateData.excerptZhTW = t.excerpt;
          updateData.contentZhTW = t.content;
        } else if (lang === "zh-CN") {
          updateData.titleZhCN = t.title;
          updateData.excerptZhCN = t.excerpt;
          updateData.contentZhCN = t.content;
        } else if (lang === "en") {
          updateData.titleEn = t.title;
          updateData.excerptEn = t.excerpt;
          updateData.contentEn = t.content;
        } else if (lang === "ja") {
          updateData.titleJa = t.title;
          updateData.excerptJa = t.excerpt;
          updateData.contentJa = t.content;
        } else if (lang === "ko") {
          updateData.titleKo = t.title;
          updateData.excerptKo = t.excerpt;
          updateData.contentKo = t.content;
        } else if (lang === "th") {
          updateData.titleTh = t.title;
          updateData.excerptTh = t.excerpt;
          updateData.contentTh = t.content;
        }
      }

      await db.update(articles).set(updateData).where(eq(articles.id, input.id));
      return { success: true, translatedLanguages: targetLangs.filter((l) => !failedLanguages.includes(l)), failedLanguages };
    }),
});
