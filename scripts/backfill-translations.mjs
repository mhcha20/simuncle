/**
 * Backfill translations for existing Soro articles that have no translations.
 * Run: node scripts/backfill-translations.mjs
 *
 * Strategy: translate title+excerpt and content separately to avoid JSON truncation.
 */
import mysql from "mysql2/promise";

const SORO_EMBED_TOKEN = process.env.SORO_EMBED_TOKEN ?? "";
const SORO_API_BASE = "https://app.trysoro.com";
const LLM_URL = process.env.BUILT_IN_FORGE_API_URL + "/v1/chat/completions";
const LLM_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function fetchSoroArticleContent(articleId) {
  const url = `${SORO_API_BASE}/api/embed/${SORO_EMBED_TOKEN}/article/${articleId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Soro fetch failed: ${res.status} for ${articleId}`);
  const data = await res.json();
  return data.content || "";
}

async function llmCall(messages, schema) {
  const body = {
    model: "claude-sonnet-4-5",
    messages,
    max_tokens: 4096,
  };
  if (schema) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: "result", strict: true, schema },
    };
  }
  const response = await fetch(LLM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_KEY}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM failed: ${response.status} ${err.substring(0, 200)}`);
  }
  const result = await response.json();
  const raw = result.choices[0].message.content;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

async function translateMeta(title, excerpt, langCode, langName) {
  return llmCall(
    [{
      role: "user",
      content: `Translate from Traditional Chinese to ${langName}. Return JSON with "title" and "excerpt" fields only.
Title: ${title}
Excerpt: ${excerpt}`,
    }],
    {
      type: "object",
      properties: { title: { type: "string" }, excerpt: { type: "string" } },
      required: ["title", "excerpt"],
      additionalProperties: false,
    }
  );
}

async function translateContent(content, langCode, langName) {
  // Split content into chunks of ~3000 chars to avoid truncation
  const CHUNK = 3000;
  if (content.length <= CHUNK) {
    const result = await llmCall(
      [{
        role: "user",
        content: `Translate the following HTML content from Traditional Chinese to ${langName}.
Preserve ALL HTML tags exactly as-is. Return JSON with a single "content" field.
HTML: ${content}`,
      }],
      {
        type: "object",
        properties: { content: { type: "string" } },
        required: ["content"],
        additionalProperties: false,
      }
    );
    return result.content;
  }

  // For long content, translate in chunks
  const chunks = [];
  for (let i = 0; i < content.length; i += CHUNK) {
    chunks.push(content.substring(i, i + CHUNK));
  }
  const translated = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`    chunk ${i + 1}/${chunks.length}...`);
    const result = await llmCall(
      [{
        role: "user",
        content: `Translate the following HTML content from Traditional Chinese to ${langName}.
Preserve ALL HTML tags exactly as-is. Return JSON with a single "content" field.
HTML: ${chunks[i]}`,
      }],
      {
        type: "object",
        properties: { content: { type: "string" } },
        required: ["content"],
        additionalProperties: false,
      }
    );
    translated.push(result.content);
  }
  return translated.join("");
}

const langs = [
  { code: "zh-CN", name: "Simplified Chinese (简体中文)", titleCol: "titleZhCN", excerptCol: "excerptZhCN", contentCol: "contentZhCN" },
  { code: "en",    name: "English",                       titleCol: "titleEn",   excerptCol: "excerptEn",   contentCol: "contentEn"   },
  { code: "ja",    name: "Japanese (日本語)",               titleCol: "titleJa",   excerptCol: "excerptJa",   contentCol: "contentJa"   },
  { code: "ko",    name: "Korean (한국어)",                  titleCol: "titleKo",   excerptCol: "excerptKo",   contentCol: "contentKo"   },
  { code: "th",    name: "Thai (ภาษาไทย)",                 titleCol: "titleTh",   excerptCol: "excerptTh",   contentCol: "contentTh"   },
];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  const [rows] = await conn.execute(
    `SELECT id, soroId, titleZhTW, excerptZhTW, contentZhTW 
     FROM articles 
     WHERE soroId IS NOT NULL 
     AND (titleEn IS NULL OR titleEn = '')
     ORDER BY id ASC`
  );

  console.log(`Found ${rows.length} articles needing translation backfill`);

  for (const row of rows) {
    console.log(`\n=== Article id=${row.id}: ${row.titleZhTW} ===`);

    // Fetch content from Soro if missing
    let content = row.contentZhTW || "";
    if (!content && row.soroId) {
      console.log(`  Fetching content from Soro...`);
      content = await fetchSoroArticleContent(row.soroId);
      await conn.execute(`UPDATE articles SET contentZhTW = ? WHERE id = ?`, [content, row.id]);
      console.log(`  ✓ Content fetched (${content.length} chars)`);
    }
    console.log(`  Content length: ${content.length} chars`);

    for (const lang of langs) {
      try {
        console.log(`  [${lang.code}] Translating meta...`);
        const meta = await translateMeta(row.titleZhTW || "", row.excerptZhTW || "", lang.code, lang.name);

        console.log(`  [${lang.code}] Translating content...`);
        const translatedContent = await translateContent(content, lang.code, lang.name);

        await conn.execute(
          `UPDATE articles SET \`${lang.titleCol}\` = ?, \`${lang.excerptCol}\` = ?, \`${lang.contentCol}\` = ?, updatedAt = NOW() WHERE id = ?`,
          [meta.title || null, meta.excerpt || null, translatedContent || null, row.id]
        );
        console.log(`  ✓ [${lang.code}] Done: ${meta.title}`);
      } catch (err) {
        console.error(`  ✗ [${lang.code}] Failed:`, err.message);
      }
    }
  }

  await conn.end();
  console.log("\n=== All done! ===");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
