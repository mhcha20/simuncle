import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTranslateJob, resetTranslateJobs, startTranslateJob } from "./articleTranslateJobs";

const source = { title: "標題", excerpt: "摘要", content: "<p>內容</p>" };
const fields = (lang: string) => ({ title: `T-${lang}`, excerpt: "E", content: "<p>C</p>" });

async function waitUntilDone(id: number) {
  for (let i = 0; i < 100; i++) {
    if (getTranslateJob(id)?.state === "done") return getTranslateJob(id)!;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error("job did not finish");
}

beforeEach(() => resetTranslateJobs());

describe("translate jobs", () => {
  it("translates and saves one language at a time and reports progress", async () => {
    const saved: string[] = [];
    const translate = vi.fn(async (_s: unknown, _from: string, langs: string[]) => ({ [langs[0]]: fields(langs[0]) }));
    const { started } = startTranslateJob({
      articleId: 1, source, sourceLang: "zh-TW", targetLangs: ["en", "ja", "ko"],
      save: async lang => { saved.push(lang); },
      translate: translate as never,
    });
    expect(started).toBe(true);
    expect(getTranslateJob(1)).toMatchObject({ state: "running", total: 3 });
    const job = await waitUntilDone(1);
    expect(saved).toEqual(["en", "ja", "ko"]);
    expect(job).toMatchObject({ completed: ["en", "ja", "ko"], failed: [], current: null });
  });

  it("keeps the languages that worked when one fails", async () => {
    const saved: string[] = [];
    const translate = async (_s: unknown, _from: string, langs: string[]) => ({ [langs[0]]: langs[0] === "ja" ? null : fields(langs[0]) });
    startTranslateJob({
      articleId: 2, source, sourceLang: "zh-TW", targetLangs: ["en", "ja", "ko"],
      save: async lang => { saved.push(lang); },
      translate: translate as never,
    });
    const job = await waitUntilDone(2);
    expect(saved).toEqual(["en", "ko"]);
    expect(job.failed).toEqual(["ja"]);
  });

  it("does not start a second job for an article that is already being translated", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    const translate = async (_s: unknown, _from: string, langs: string[]) => { await gate; return { [langs[0]]: fields(langs[0]) }; };
    const args = { articleId: 3, source, sourceLang: "zh-TW", targetLangs: ["en"], save: async () => {}, translate: translate as never };
    expect(startTranslateJob(args).started).toBe(true);
    expect(startTranslateJob(args).started).toBe(false);
    release();
    await waitUntilDone(3);
    expect(startTranslateJob(args).started).toBe(true); // can run again after it finished
  });

  it("counts a failing save as a failed language", async () => {
    const translate = async (_s: unknown, _from: string, langs: string[]) => ({ [langs[0]]: fields(langs[0]) });
    startTranslateJob({
      articleId: 4, source, sourceLang: "zh-TW", targetLangs: ["en"],
      save: async () => { throw new Error("db down"); },
      translate: translate as never,
    });
    expect((await waitUntilDone(4)).failed).toEqual(["en"]);
  });
});
