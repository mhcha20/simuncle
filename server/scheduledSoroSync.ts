import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { articles } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { translateArticleToLanguages } from "./articleTranslation";
import { notifyOwner } from "./_core/notification";
import { submitToIndexNow, SITE_HOST } from "./indexnow";

const SORO_EMBED_TOKEN = process.env.SORO_EMBED_TOKEN ?? "";
const SORO_API_BASE = "https://app.trysoro.com";

interface SoroArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string | null;
  date: string;
  isoDate: string;
  image: string | null;
}

/**
 * Fetch the article list from Soro embed API.
 * Returns an array of articles (content is null in list view).
 */
async function fetchSoroArticleList(): Promise<SoroArticle[]> {
  const url = `${SORO_API_BASE}/api/embed/${SORO_EMBED_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Soro embed fetch failed: ${res.status}`);
  const js = await res.text();
  const match = js.match(/var SORO_ARTICLES = (\[[\s\S]*?\]);/);
  if (!match) throw new Error("SORO_ARTICLES not found in embed script");
  return JSON.parse(match[1]) as SoroArticle[];
}

/**
 * Fetch the full HTML content of a single Soro article by its UUID.
 */
async function fetchSoroArticleContent(articleId: string): Promise<string> {
  const url = `${SORO_API_BASE}/api/embed/${SORO_EMBED_TOKEN}/article/${articleId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Soro article content fetch failed: ${res.status} for ${articleId}`);
  const data = await res.json() as { content: string };
  return data.content || "";
}

const CATEGORIES = [
  "travel-tips",      // 旅遊攻略、旅遊貼士
  "esim-guide",       // eSIM 教學、使用指南
  "destination-guide", // 目的地指南、國家介紹
  "news",             // 最新消息、行業動態
] as const;
type ArticleCategory = typeof CATEGORIES[number];

/**
 * Use LLM to classify an article into one of the 4 categories.
 */
async function classifyArticle(
  title: string,
  excerpt: string
): Promise<ArticleCategory> {
  try {
    const response = await invokeLLM({
      messages: [{
        role: "user",
        content: `Classify this article into exactly one category.
Categories:
- travel-tips: Travel tips, packing guides, travel hacks, airport tips
- esim-guide: eSIM tutorials, setup guides, how-to, compatibility, troubleshooting
- destination-guide: Country/city guides, local info, attractions, what to do
- news: Industry news, product launches, announcements, updates

Title: ${title}
Excerpt: ${excerpt}

Return JSON with a single "category" field.`,
      }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "classification",
          strict: true,
          schema: {
            type: "object",
            properties: { category: { type: "string", enum: [...CATEGORIES] } },
            required: ["category"],
            additionalProperties: false,
          },
        },
      },
    });
    const raw = response.choices[0].message.content;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : (raw as unknown) as { category: string };
    const cat = parsed.category as ArticleCategory;
    return CATEGORIES.includes(cat) ? cat : "news";
  } catch (err) {
    console.warn("[SoroSync] Classification failed, defaulting to 'news':", err);
    return "news";
  }
}

/** Translate a Soro article (Traditional Chinese) into the other five languages. */
async function translateArticle(
  title: string,
  excerpt: string,
  content: string
): Promise<Record<string, { title: string; excerpt: string; content: string }>> {
  const translated = await translateArticleToLanguages({ title, excerpt, content }, "zh-TW", ["zh-CN", "en", "ja", "ko", "th"]);
  const result: Record<string, { title: string; excerpt: string; content: string }> = {};
  for (const [lang, fields] of Object.entries(translated)) {
    result[lang] = fields ?? { title: "", excerpt: "", content: "" };
  }
  return result;
}

/**
 * Heartbeat handler for daily Soro article sync.
 * Called by the Manus platform cron at /api/scheduled/sync-soro-articles.
 *
 * IMPORTANT: Heartbeat has a 2-minute timeout. To stay within budget:
 * - Process ONE article per invocation (the oldest unsynced one)
 * - The cron runs daily; if there are N new articles, they'll be synced over N days
 * - For backfill, trigger "Run Now" multiple times from the Manus dashboard
 *
 * Flow:
 * 1. Fetch article list from Soro embed API
 * 2. Find the oldest article not yet in DB (by soroId)
 * 3. Fetch full content + AI-translate to 5 languages
 * 4. Insert as published article + submit to IndexNow
 * 5. Notify owner
 */
export async function handleScheduledSoroSync(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    console.log(`[SoroSync] Starting Soro article sync, triggered by taskUid=${user.taskUid}`);

    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: "DB unavailable" });
    }

    // Step 1: Fetch article list from Soro (oldest first for FIFO processing)
    const soroArticles = await fetchSoroArticleList();
    console.log(`[SoroSync] Found ${soroArticles.length} articles from Soro`);

    // Step 2: Find which articles are new (not yet in DB by soroId)
    const existingRows = await db
      .select({ soroId: articles.soroId })
      .from(articles);
    const existingSoroIds = new Set(existingRows.map((r) => r.soroId).filter(Boolean));

    const newArticles = soroArticles
      .filter((a) => !existingSoroIds.has(a.id))
      .sort((a, b) => new Date(a.isoDate).getTime() - new Date(b.isoDate).getTime()); // oldest first

    console.log(`[SoroSync] ${newArticles.length} new articles pending sync`);

    if (newArticles.length === 0) {
      return res.json({ success: true, synced: 0, message: "No new articles", remaining: 0 });
    }

    // Step 3: Process ONLY the first (oldest) article to stay within 2-min timeout
    const soroArticle = newArticles[0];
    const remaining = newArticles.length - 1;

    console.log(`[SoroSync] Processing: "${soroArticle.title}" (${remaining} more pending)`);

    // Fetch full HTML content
    const htmlContent = await fetchSoroArticleContent(soroArticle.id);
    console.log(`[SoroSync] Fetched content: ${htmlContent.length} chars`);

    // Classify article into a category
    const category = await classifyArticle(soroArticle.title, soroArticle.excerpt);
    console.log(`[SoroSync] Category: ${category}`);

    // Translate to all languages (per-language, chunked)
    const translations = await translateArticle(
      soroArticle.title,
      soroArticle.excerpt,
      htmlContent
    );

    // Build slug (use Soro slug, ensure uniqueness)
    let slug = soroArticle.slug || soroArticle.id;
    const existing = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, slug));
    if (existing.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    // Insert article with all translations
    await db.insert(articles).values({
      slug,
      soroId: soroArticle.id,
      category,
      coverImage: soroArticle.image || null,
      status: "published",
      publishedAt: new Date(soroArticle.isoDate),
      // zh-TW (source from Soro)
      titleZhTW: soroArticle.title,
      excerptZhTW: soroArticle.excerpt,
      contentZhTW: htmlContent,
      // zh-CN
      titleZhCN: translations["zh-CN"]?.title || null,
      excerptZhCN: translations["zh-CN"]?.excerpt || null,
      contentZhCN: translations["zh-CN"]?.content || null,
      // en
      titleEn: translations["en"]?.title || null,
      excerptEn: translations["en"]?.excerpt || null,
      contentEn: translations["en"]?.content || null,
      // ja
      titleJa: translations["ja"]?.title || null,
      excerptJa: translations["ja"]?.excerpt || null,
      contentJa: translations["ja"]?.content || null,
      // ko
      titleKo: translations["ko"]?.title || null,
      excerptKo: translations["ko"]?.excerpt || null,
      contentKo: translations["ko"]?.content || null,
      // th
      titleTh: translations["th"]?.title || null,
      excerptTh: translations["th"]?.excerpt || null,
      contentTh: translations["th"]?.content || null,
    });

    console.log(`[SoroSync] ✓ Synced: "${soroArticle.title}" → slug: ${slug}`);

    // Submit newly published article to Bing IndexNow
    try {
      const articleUrl = `https://${SITE_HOST}/blog/${slug}`;
      await submitToIndexNow([articleUrl]);
      console.log(`[SoroSync] IndexNow: submitted ${articleUrl}`);
    } catch (indexNowErr) {
      console.warn(`[SoroSync] IndexNow submission failed for ${slug}:`, indexNowErr);
    }

    // Notify owner
    await notifyOwner({
      title: `📝 Soro 文章同步：${soroArticle.title}`,
      content: `已自動從 Soro 同步並翻譯成 5 種語言。\n文章：${soroArticle.title}\n連結：https://simuncle.com/blog/${slug}${remaining > 0 ? `\n\n⏳ 尚有 ${remaining} 篇待同步，明日將繼續處理。` : ""}`,
    });

    console.log(`[SoroSync] Done. Synced 1 article. ${remaining} remaining.`);
    return res.json({ success: true, synced: 1, title: soroArticle.title, slug, remaining });
  } catch (err) {
    console.error("[SoroSync] Fatal error:", err);
    return res.status(500).json({
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
      context: { url: req.url, taskUid: "unknown" },
      timestamp: new Date().toISOString(),
    });
  }
}
