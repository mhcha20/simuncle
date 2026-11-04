// One-shot fill for articles that were published without translations (the Soro
// sync does not revisit an article once it is in the database). Runs only when
// RETRANSLATE_MISSING=1, and only the newest incomplete article.
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { articles } from "../drizzle/schema";
import { translateArticleToLanguages } from "./articleTranslation";
import { getDb } from "./db";

const TARGETS = ["zh-CN", "en", "ja", "ko", "th"] as const;

function columns(lang: string, t: { title: string; excerpt: string; content: string }) {
  switch (lang) {
    case "zh-CN": return { titleZhCN: t.title, excerptZhCN: t.excerpt, contentZhCN: t.content };
    case "en": return { titleEn: t.title, excerptEn: t.excerpt, contentEn: t.content };
    case "ja": return { titleJa: t.title, excerptJa: t.excerpt, contentJa: t.content };
    case "ko": return { titleKo: t.title, excerptKo: t.excerpt, contentKo: t.content };
    case "th": return { titleTh: t.title, excerptTh: t.excerpt, contentTh: t.content };
    default: return {};
  }
}

function missingLangs(article: typeof articles.$inferSelect): string[] {
  const title: Record<string, string | null> = {
    "zh-CN": article.titleZhCN,
    en: article.titleEn,
    ja: article.titleJa,
    ko: article.titleKo,
    th: article.titleTh,
  };
  return TARGETS.filter(lang => !title[lang]);
}

export async function retranslateMissingArticle(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Retranslate] DB unavailable");
    return;
  }
  const [article] = await db
    .select()
    .from(articles)
    .where(and(
      eq(articles.status, "published"),
      or(
        isNull(articles.titleZhCN),
        isNull(articles.titleEn),
        isNull(articles.titleJa),
        isNull(articles.titleKo),
        isNull(articles.titleTh),
      ),
    ))
    .orderBy(desc(articles.publishedAt))
    .limit(1);

  if (!article) {
    console.log("[Retranslate] No article is missing a translation");
    return;
  }
  if (!article.titleZhTW && !article.contentZhTW) {
    console.warn(`[Retranslate] ${article.slug} has no Traditional Chinese source`);
    return;
  }
  const targetLangs = missingLangs(article);
  console.log(`[Retranslate] "${article.titleZhTW}" → ${targetLangs.join(", ")}`);
  const translated = await translateArticleToLanguages(
    { title: article.titleZhTW || "", excerpt: article.excerptZhTW || "", content: article.contentZhTW || "" },
    "zh-TW",
    targetLangs,
  );
  const update: Partial<typeof articles.$inferInsert> = {};
  const done: string[] = [];
  const failed: string[] = [];
  for (const lang of targetLangs) {
    const fields = translated[lang];
    if (fields) {
      Object.assign(update, columns(lang, fields));
      done.push(lang);
    } else {
      failed.push(lang);
    }
  }
  if (done.length === 0) {
    console.error(`[Retranslate] ${article.slug}: every language failed`);
    return;
  }
  await db.update(articles).set(update).where(eq(articles.id, article.id));
  console.log(`[Retranslate] Saved ${article.slug}: ${done.join(", ")}${failed.length ? `; failed ${failed.join(", ")}` : ""}`);
}
