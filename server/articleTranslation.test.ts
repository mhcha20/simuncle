import { beforeEach, describe, expect, it, vi } from "vitest";

const invokeMock = vi.fn();
vi.mock("./_core/llm", () => ({ invokeLLM: invokeMock }));

const reply = (obj: unknown) => ({ choices: [{ message: { content: typeof obj === "string" ? obj : JSON.stringify(obj) } }] });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("splitHtmlChunks", () => {
  it("cuts only between blocks, never inside a tag, and loses nothing", async () => {
    const { splitHtmlChunks } = await import("./articleTranslation");
    const html = Array.from({ length: 30 }, (_, i) => `<p class="x">段落 ${i} ${"字".repeat(200)}</p>`).join("\n");
    const chunks = splitHtmlChunks(html, 1000);
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.join("")).toBe(html);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThan(1500);
      expect((chunk.match(/<p/g) ?? []).length).toBe((chunk.match(/<\/p>/g) ?? []).length);
    }
  });
});

describe("translateArticleToLanguages", () => {
  it("translates each language in chunks and joins the pieces", async () => {
    invokeMock.mockImplementation(async (params: { messages: { content: string }[] }) => {
      const prompt = params.messages[0].content;
      if (prompt.includes('"title" and "excerpt"')) return reply({ title: "T", excerpt: "E" });
      return reply({ content: "[" + (prompt.match(/HTML: ([\s\S]*)$/)?.[1].length ?? 0) + "]" });
    });
    const { translateArticleToLanguages } = await import("./articleTranslation");
    const html = Array.from({ length: 6 }, () => `<p>${"字".repeat(1200)}</p>`).join("");
    const result = await translateArticleToLanguages({ title: "標題", excerpt: "摘要", content: html }, "zh-TW", ["en", "ja"]);
    expect(result.en?.title).toBe("T");
    expect(result.ja?.content.split("][").length).toBeGreaterThan(1); // several chunks were translated and joined
  });

  it("retries an empty reply and strips code fences", async () => {
    let calls = 0;
    invokeMock.mockImplementation(async (params: { messages: { content: string }[] }) => {
      calls++;
      if (calls === 1) return reply("");
      if (params.messages[0].content.includes('"title" and "excerpt"')) return reply('```json\n{"title":"T","excerpt":"E"}\n```');
      return reply({ content: "ok" });
    });
    const { translateArticleToLanguages } = await import("./articleTranslation");
    const result = await translateArticleToLanguages({ title: "a", excerpt: "b", content: "<p>c</p>" }, "zh-TW", ["en"]);
    expect(result.en).toEqual({ title: "T", excerpt: "E", content: "ok" });
  });

  it("marks a language null when it keeps failing, without losing the others", async () => {
    invokeMock.mockImplementation(async (params: { messages: { content: string }[] }) => {
      if (params.messages[0].content.includes("Japanese")) return reply("not json");
      if (params.messages[0].content.includes('"title" and "excerpt"')) return reply({ title: "T", excerpt: "E" });
      return reply({ content: "ok" });
    });
    vi.useFakeTimers();
    const { translateArticleToLanguages } = await import("./articleTranslation");
    const pending = translateArticleToLanguages({ title: "a", excerpt: "b", content: "<p>c</p>" }, "zh-TW", ["en", "ja"]);
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(result.ja).toBeNull();
    expect(result.en?.title).toBe("T");
  });
});
