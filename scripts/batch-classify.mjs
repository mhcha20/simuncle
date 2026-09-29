/**
 * One-time script: classify all articles with no category using LLM
 * Run: node scripts/batch-classify.mjs
 */
import { createConnection } from "mysql2/promise";

const CATEGORIES = ["travel-tips", "esim-guide", "destination-guide", "news"];
const FORGE_API_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_API_KEY = process.env.BUILT_IN_FORGE_API_KEY;
const DB_URL = process.env.DATABASE_URL;

async function classifyArticle(title, excerpt) {
  const prompt = `Classify this article into exactly one category.
Categories:
- travel-tips: Travel tips, packing guides, travel hacks, airport tips, data usage tips
- esim-guide: eSIM tutorials, setup guides, how-to, compatibility, troubleshooting, what is eSIM
- destination-guide: Country/city guides, local info, attractions, what to do, travel itinerary
- news: Industry news, product launches, announcements, updates

Title: ${title}
Excerpt: ${excerpt}

Return JSON with a single "category" field.`;

  const res = await fetch(`${FORGE_API_URL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FORGE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "classification",
          strict: true,
          schema: {
            type: "object",
            properties: { category: { type: "string", enum: CATEGORIES } },
            required: ["category"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("No response from LLM");
  const parsed = JSON.parse(raw);
  return CATEGORIES.includes(parsed.category) ? parsed.category : "news";
}

async function main() {
  const conn = await createConnection(DB_URL);

  const [rows] = await conn.execute(
    "SELECT id, titleZhTW, titleEn, excerptZhTW, excerptEn FROM articles WHERE category IS NULL OR category = ''"
  );

  console.log(`Found ${rows.length} uncategorized articles`);

  for (const row of rows) {
    const title = row.titleZhTW || row.titleEn || "";
    const excerpt = row.excerptZhTW || row.excerptEn || "";
    try {
      const category = await classifyArticle(title, excerpt);
      await conn.execute("UPDATE articles SET category = ? WHERE id = ?", [category, row.id]);
      console.log(`✓ [${row.id}] "${title.slice(0, 40)}..." → ${category}`);
    } catch (err) {
      console.error(`✗ [${row.id}] Failed:`, err.message);
    }
  }

  await conn.end();
  console.log("Done!");
}

main().catch(console.error);
