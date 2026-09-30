import { Request, Response } from "express";
import { getDb } from "./db";
import { productsCache, articles } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { encodeProductSlug } from "../shared/productSlug";

const BASE_URL = "https://simuncle.com";

/** All destination slugs matching DestinationPage.tsx DESTINATIONS */
const DESTINATION_SLUGS = [
  "japan",
  "europe",
  "thailand",
  "korea",
  "taiwan",
  "singapore",
  "usa",
  "china",
  "india",
  "australia",
  "dubai",
  "uae",
  "turkey",
  "uk",
  "canada",
  "asia",
  "global",
];

/** Supported hreflang language codes mapped to URL query param */
const HREFLANG_LANGS: { hreflang: string; lang: string }[] = [
  { hreflang: "zh-TW", lang: "zh-TW" },
  { hreflang: "zh-CN", lang: "zh-CN" },
  { hreflang: "en",    lang: "en" },
  { hreflang: "ja",    lang: "ja" },
  { hreflang: "ko",    lang: "ko" },
  { hreflang: "th",    lang: "th" },
];

/** Static pages with their priority and change frequency */
const STATIC_PAGES = [
  { path: "/",               changefreq: "daily",   priority: "1.0" },
  { path: "/products",       changefreq: "daily",   priority: "0.9" },
  { path: "/blog",           changefreq: "daily",   priority: "0.8" },
  { path: "/how-to-install", changefreq: "monthly", priority: "0.7" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/track-order",    changefreq: "monthly", priority: "0.5" },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toW3CDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export async function handleSitemap(_req: Request, res: Response) {
  try {
    const today = toW3CDate(new Date());

    const db = await getDb();
    let productRows: { productId: string; updatedAt: Date | null }[] = [];
    let articleRows: { slug: string; updatedAt: Date | null; publishedAt: Date | null }[] = [];

    if (db) {
      // Fetch all active product IDs
      productRows = await db
        .select({
          productId: productsCache.productId,
          updatedAt: productsCache.updatedAt,
        })
        .from(productsCache)
        .where(eq(productsCache.isActive, true))
        .orderBy(sql`${productsCache.updatedAt} DESC`);

      // Fetch all published articles
      articleRows = await db
        .select({
          slug: articles.slug,
          updatedAt: articles.updatedAt,
          publishedAt: articles.publishedAt,
        })
        .from(articles)
        .where(eq(articles.status, "published"))
        .orderBy(sql`${articles.publishedAt} DESC`);
    }

    // Build XML
    const urlEntries: string[] = [];

    // 1. Static pages
    for (const page of STATIC_PAGES) {
      urlEntries.push(`
  <url>
    <loc>${escapeXml(BASE_URL + page.path)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
    }

    // 2. Blog article pages (self-hosted, URL: /blog/[slug])
    for (const article of articleRows) {
      const lastmod = article.updatedAt
        ? toW3CDate(article.updatedAt)
        : article.publishedAt
        ? toW3CDate(article.publishedAt)
        : today;
      urlEntries.push(`
  <url>
    <loc>${escapeXml(`${BASE_URL}/blog/${article.slug}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.75</priority>
  </url>`);
    }

    // 3. Destination landing pages (/esim/:slug)
    for (const slug of DESTINATION_SLUGS) {
      const hreflangLinks = HREFLANG_LANGS.map(
        ({ hreflang, lang }) =>
          `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeXml(`${BASE_URL}/esim/${slug}?lang=${lang}`)}"/>`
      ).join("\n");
      urlEntries.push(`
  <url>
    <loc>${escapeXml(`${BASE_URL}/esim/${slug}`)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
${hreflangLinks}
  </url>`);
    }

    // 4. Product pages
    for (const row of productRows) {
      const lastmod = row.updatedAt ? toW3CDate(row.updatedAt) : today;
      urlEntries.push(`
  <url>
    <loc>${escapeXml(`${BASE_URL}/products/${encodeProductSlug(row.productId)}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">${urlEntries.join("")}
</urlset>`;

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "no-cache, no-store, must-revalidate"); // Always fresh for crawlers
    res.send(xml);
  } catch (err) {
    console.error("[Sitemap] Error generating sitemap:", err);
    res.status(500).send("Error generating sitemap");
  }
}
