import { invokeLLM } from "./_core/llm";

export const ARTICLE_LANG_NAMES: Record<string, string> = {
  "zh-TW": "Traditional Chinese (繁體中文)",
  "zh-CN": "Simplified Chinese (简体中文)",
  en: "English",
  ja: "Japanese (日本語)",
  ko: "Korean (한국어)",
  th: "Thai (ภาษาไทย)",
};

export type ArticleFields = { title: string; excerpt: string; content: string };

/** Ask the model for a JSON object, retrying when the reply is empty or not valid JSON. */
export async function invokeJson<T>(params: Parameters<typeof invokeLLM>[0], label: string, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await invokeLLM(params);
      const raw = response.choices[0]?.message?.content;
      if (typeof raw !== "string") return raw as unknown as T;
      const text = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      if (!text) throw new Error("empty reply from the model");
      return JSON.parse(text) as T;
    } catch (error) {
      lastError = error;
      console.warn(`[Translate] ${label}: attempt ${attempt}/${attempts} failed: ${error instanceof Error ? error.message : error}`);
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
    }
  }
  throw lastError;
}

/**
 * Split HTML into pieces of roughly `maxLen` characters, cutting only between blocks
 * (after a closing block tag or at a blank line) so no tag is ever cut in half.
 */
export function splitHtmlChunks(html: string, maxLen = 2500): string[] {
  const blocks = html.split(/(?<=<\/(?:p|h[1-6]|ul|ol|li|table|blockquote|div|section|figure|pre)>)|(?<=\n\n)/i);
  const chunks: string[] = [];
  let current = "";
  for (const block of blocks) {
    if (current && current.length + block.length > maxLen) {
      chunks.push(current);
      current = "";
    }
    current += block;
  }
  if (current) chunks.push(current);
  return chunks;
}

async function translateMeta(title: string, excerpt: string, from: string, to: string): Promise<{ title: string; excerpt: string }> {
  return invokeJson<{ title: string; excerpt: string }>(
    {
      messages: [{
        role: "user",
        content: `Translate from ${from} to ${to}. Return JSON with "title" and "excerpt" fields only.\nTitle: ${title}\nExcerpt: ${excerpt}`,
      }],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "meta",
          strict: true,
          schema: {
            type: "object",
            properties: { title: { type: "string" }, excerpt: { type: "string" } },
            required: ["title", "excerpt"],
            additionalProperties: false,
          },
        },
      },
    },
    `meta (${to})`,
  );
}

async function translateContent(content: string, from: string, to: string): Promise<string> {
  const translated: string[] = [];
  for (const chunk of splitHtmlChunks(content)) {
    const parsed = await invokeJson<{ content: string }>(
      {
        messages: [{
          role: "user",
          content: `Translate the following HTML content from ${from} to ${to}.\nPreserve ALL HTML tags and attributes exactly as-is. Return JSON with a single "content" field.\nHTML: ${chunk}`,
        }],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "content_translation",
            strict: true,
            schema: {
              type: "object",
              properties: { content: { type: "string" } },
              required: ["content"],
              additionalProperties: false,
            },
          },
        },
      },
      `content (${to})`,
    );
    translated.push(parsed.content || "");
  }
  return translated.join("");
}

/**
 * Translate an article into each target language with separate, chunked calls (a whole article in
 * one reply gets cut off by the output limit). Languages run in parallel, `concurrency` at a time.
 * A language that still fails after retries is `null` in the result.
 */
export async function translateArticleToLanguages(
  source: ArticleFields,
  fromLang: string,
  targetLangs: string[],
  concurrency = 3,
): Promise<Record<string, ArticleFields | null>> {
  const from = ARTICLE_LANG_NAMES[fromLang] ?? fromLang;
  const result: Record<string, ArticleFields | null> = {};
  const queue = [...targetLangs];

  async function worker() {
    for (let lang = queue.shift(); lang; lang = queue.shift()) {
      const to = ARTICLE_LANG_NAMES[lang] ?? lang;
      try {
        const [meta, content] = await Promise.all([
          translateMeta(source.title, source.excerpt, from, to),
          source.content ? translateContent(source.content, from, to) : Promise.resolve(""),
        ]);
        result[lang] = { title: meta.title, excerpt: meta.excerpt, content };
      } catch (error) {
        console.error(`[Translate] ${lang} failed:`, error instanceof Error ? error.message : error);
        result[lang] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, targetLangs.length) }, worker));
  return result;
}
