/**
 * SEO Article Generator
 * Generates high-quality, SEO-optimized articles for target keywords
 * and inserts them into the articles database.
 */

import { getDb } from "./db";
import { articles } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { submitToIndexNow, SITE_HOST } from "./indexnow";

// ---- Article topics to generate ----
const SEO_ARTICLE_TOPICS = [
  {
    slug: "best-esim-for-japan-2026",
    keyword: "best eSIM for Japan 2026",
    titleZhTW: "日本 eSIM 推薦 2026：最佳日本上網卡完整評比",
    excerptZhTW: "前往日本旅遊必看！2026 年最新日本 eSIM 推薦，比較各大品牌方案、價格、網絡覆蓋，幫你找到最適合的日本上網卡。",
    titleEn: "Best eSIM for Japan 2026: Complete Guide & Comparison",
    excerptEn: "Planning a trip to Japan? Our 2026 guide compares the best Japan eSIM plans by price, data, and coverage to help you stay connected.",
  },
  {
    slug: "best-esim-for-europe-2026",
    keyword: "best eSIM for Europe 2026",
    titleZhTW: "歐洲 eSIM 推薦 2026：一張 eSIM 暢遊 30+ 國家",
    excerptZhTW: "遊覽歐洲多國？2026 年最新歐洲 eSIM 推薦，一張 eSIM 覆蓋英法德意西等 30+ 國家，即買即用，無需換 SIM 卡。",
    titleEn: "Best eSIM for Europe 2026: One eSIM for 30+ Countries",
    excerptEn: "Traveling across Europe? Our 2026 guide covers the best Europe eSIM plans covering 30+ countries including UK, France, Germany, Italy and Spain.",
  },
  {
    slug: "what-is-esim-complete-guide",
    keyword: "what is eSIM complete guide",
    titleZhTW: "eSIM 是什麼？2026 年完整新手指南",
    excerptZhTW: "eSIM 是什麼？如何使用？支援哪些手機？本文詳細解釋 eSIM 的工作原理、優缺點及使用方法，讓你快速了解 eSIM 技術。",
    titleEn: "What is eSIM? Complete Beginner's Guide 2026",
    excerptEn: "New to eSIM? This complete guide explains what eSIM is, how it works, compatible devices, and how to activate it for travel.",
  },
  {
    slug: "esim-vs-physical-sim-comparison",
    keyword: "eSIM vs physical SIM card",
    titleZhTW: "eSIM vs 實體 SIM 卡：2026 年完整比較",
    excerptZhTW: "eSIM 和實體 SIM 卡有什麼分別？哪個更適合旅遊？本文從價格、方便程度、網絡覆蓋等多角度比較，幫你做出最佳選擇。",
    titleEn: "eSIM vs Physical SIM Card: Which is Better for Travel in 2026?",
    excerptEn: "eSIM or physical SIM? We compare both options on price, convenience, coverage, and compatibility to help you choose the best option for your next trip.",
  },
  {
    slug: "how-to-activate-esim-iphone",
    keyword: "how to activate eSIM on iPhone",
    titleZhTW: "iPhone eSIM 如何啟動？詳細步驟教學（2026）",
    excerptZhTW: "iPhone eSIM 啟動步驟詳解！從購買到掃描 QR Code 到成功連線，本文提供最完整的 iPhone eSIM 安裝教學，適用 iPhone XS 至 iPhone 16。",
    titleEn: "How to Activate eSIM on iPhone: Step-by-Step Guide (2026)",
    excerptEn: "Learn how to activate an eSIM on your iPhone with our step-by-step guide. Works for iPhone XS and later, including iPhone 16 series.",
  },
  {
    slug: "best-esim-for-thailand-2026",
    keyword: "best eSIM for Thailand 2026",
    titleZhTW: "泰國 eSIM 推薦 2026：曼谷清邁普吉島全覆蓋",
    excerptZhTW: "去泰國旅遊必看！2026 年最新泰國 eSIM 推薦，比較 AIS、DTAC、True Move H 等網絡方案，曼谷、清邁、普吉島全覆蓋。",
    titleEn: "Best eSIM for Thailand 2026: Bangkok, Chiang Mai & Phuket",
    excerptEn: "Visiting Thailand? Our 2026 guide compares the best Thailand eSIM plans with coverage across Bangkok, Chiang Mai, Phuket and all major tourist areas.",
  },
];

async function generateArticleContent(topic: typeof SEO_ARTICLE_TOPICS[0]): Promise<{
  contentZhTW: string;
  contentEn: string;
  titleZhCN: string;
  excerptZhCN: string;
  contentZhCN: string;
}> {
  // Generate Traditional Chinese content
  const zhTWResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `你是 SIM uncle 的 SEO 內容撰寫專家。請撰寫高品質、SEO 優化的繁體中文文章。
文章要求：
- 字數：1500-2500 字
- 格式：使用 Markdown（## 標題、**粗體**、列表等）
- 語氣：專業但親切，適合香港/台灣讀者
- 包含：關鍵字自然融入、實用建議、比較表格（如適用）
- 不要包含虛假的品牌評分或用戶評論
- 文章末尾加入「為什麼選擇 SIM uncle？」段落，強調即時激活、多國覆蓋、港幣結算等優點`,
      },
      {
        role: "user",
        content: `請為以下主題撰寫 SEO 文章：
標題：${topic.titleZhTW}
目標關鍵字：${topic.keyword}
摘要：${topic.excerptZhTW}

請撰寫完整的 Markdown 格式文章內容。`,
      },
    ],
  });

  const contentZhTW = String(zhTWResponse.choices?.[0]?.message?.content ?? "");

  // Generate English content
  const enResponse = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are an SEO content writer for SIM uncle, a global eSIM provider based in Hong Kong.
Write high-quality, SEO-optimized English articles.
Requirements:
- Length: 1200-2000 words
- Format: Markdown (## headings, **bold**, lists, tables)
- Tone: Professional yet friendly, targeting international travelers
- Include: Natural keyword integration, practical tips, comparison tables where relevant
- Do NOT fabricate brand ratings or user reviews
- End with a "Why Choose SIM uncle?" section highlighting instant activation, global coverage, HKD pricing`,
      },
      {
        role: "user",
        content: `Write an SEO article for:
Title: ${topic.titleEn}
Target keyword: ${topic.keyword}
Description: ${topic.excerptEn}

Write the full Markdown article content.`,
      },
    ],
  });

  const contentEn = String(enResponse.choices?.[0]?.message?.content ?? "");

  // Generate Simplified Chinese from Traditional Chinese
  const zhCNResponse = await invokeLLM({
    messages: [
      {
        role: "user",
        content: `將以下繁體中文翻譯成簡體中文。只需翻譯，不要添加任何解釋。
標題：${topic.titleZhTW}
摘要：${topic.excerptZhTW}

請以 JSON 格式回覆：{"title": "...", "excerpt": "..."}`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "zh_cn_meta",
        strict: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            excerpt: { type: "string" },
          },
          required: ["title", "excerpt"],
          additionalProperties: false,
        },
      },
    },
  });

  let titleZhCN = topic.titleZhTW;
  let excerptZhCN = topic.excerptZhTW;
  try {
    const zhCNMeta = JSON.parse(String(zhCNResponse.choices?.[0]?.message?.content ?? "{}"));
    titleZhCN = zhCNMeta.title || titleZhCN;
    excerptZhCN = zhCNMeta.excerpt || excerptZhCN;
  } catch {
    // fallback to Traditional Chinese
  }

  // Convert content to Simplified Chinese
  const zhCNContentResponse = await invokeLLM({
    messages: [
      {
        role: "user",
        content: `將以下繁體中文文章翻譯成簡體中文。保持 Markdown 格式不變，只翻譯文字內容。\n\n${contentZhTW}`,
      },
    ],
  });
  const contentZhCN = String(zhCNContentResponse.choices?.[0]?.message?.content ?? contentZhTW);

  return { contentZhTW, contentEn, titleZhCN, excerptZhCN, contentZhCN };
}

export async function generateAndStoreSeoArticles(req?: { query?: { topic?: string } }): Promise<{
  success: boolean;
  generated: number;
  skipped: number;
  errors: string[];
}> {
  const db = await getDb();
  if (!db) return { success: false, generated: 0, skipped: 0, errors: ["DB not available"] };

  const errors: string[] = [];
  let generated = 0;
  let skipped = 0;

  // Filter topics if specific topic requested
  const targetSlug = req?.query?.topic;
  const topicsToProcess = targetSlug
    ? SEO_ARTICLE_TOPICS.filter((t) => t.slug === targetSlug)
    : SEO_ARTICLE_TOPICS;

  for (const topic of topicsToProcess) {
    try {
      // Check if article already exists
      const existing = await db
        .select({ id: articles.id })
        .from(articles)
        .where(eq(articles.slug, topic.slug))
        .limit(1);

      if (existing.length > 0) {
        console.log(`[SEO Articles] Skipping existing article: ${topic.slug}`);
        skipped++;
        continue;
      }

      console.log(`[SEO Articles] Generating article: ${topic.slug}`);
      const content = await generateArticleContent(topic);

      await db.insert(articles).values({
        slug: topic.slug,
        status: "published",
        titleZhTW: topic.titleZhTW,
        excerptZhTW: topic.excerptZhTW,
        contentZhTW: content.contentZhTW,
        titleZhCN: content.titleZhCN,
        excerptZhCN: content.excerptZhCN,
        contentZhCN: content.contentZhCN,
        titleEn: topic.titleEn,
        excerptEn: topic.excerptEn,
        contentEn: content.contentEn,
        publishedAt: new Date(),
      });

      console.log(`[SEO Articles] Generated: ${topic.slug}`);
      generated++;

      // Submit newly published article to Bing IndexNow
      try {
        const articleUrl = `https://${SITE_HOST}/blog/${topic.slug}`;
        await submitToIndexNow([articleUrl]);
        console.log(`[SEO Articles] IndexNow: submitted ${articleUrl}`);
      } catch (indexNowErr) {
        console.warn(`[SEO Articles] IndexNow submission failed for ${topic.slug}:`, indexNowErr);
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[SEO Articles] Error generating ${topic.slug}:`, msg);
      errors.push(`${topic.slug}: ${msg}`);
    }
  }

  // Notify owner
  if (generated > 0) {
    await notifyOwner({
      title: `SEO 文章生成完成`,
      content: `已生成 ${generated} 篇 SEO 文章，跳過 ${skipped} 篇（已存在），失敗 ${errors.length} 篇。`,
    }).catch(() => {});
  }

  return { success: errors.length === 0, generated, skipped, errors };
}
