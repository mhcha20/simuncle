import { translateArticleToLanguages, type ArticleFields } from "./articleTranslation";

/**
 * Server-side translation jobs for the admin article editor. The admin page starts a job and polls
 * its progress, so translating keeps going when the phone locks or the browser tab goes to the
 * background. Jobs live in memory (one server instance); a redeploy or restart drops them and the
 * translation can simply be started again. Languages already saved stay saved.
 */
export type TranslateJob = {
  articleId: number;
  state: "running" | "done";
  sourceLang: string;
  total: number;
  completed: string[];
  failed: string[];
  current: string | null;
  startedAt: number;
  finishedAt: number | null;
};

const jobs = new Map<number, TranslateJob>();
const KEEP_FINISHED_MS = 30 * 60 * 1000;

export function getTranslateJob(articleId: number): TranslateJob | null {
  const job = jobs.get(articleId);
  if (!job) return null;
  if (job.state === "done" && job.finishedAt && Date.now() - job.finishedAt > KEEP_FINISHED_MS) {
    jobs.delete(articleId);
    return null;
  }
  return { ...job, completed: [...job.completed], failed: [...job.failed] };
}

export function startTranslateJob(opts: {
  articleId: number;
  source: ArticleFields;
  sourceLang: string;
  targetLangs: string[];
  /** Persist one finished language. */
  save: (lang: string, fields: ArticleFields) => Promise<void>;
  translate?: typeof translateArticleToLanguages;
}): { started: boolean } {
  const existing = jobs.get(opts.articleId);
  if (existing?.state === "running") return { started: false };

  const job: TranslateJob = {
    articleId: opts.articleId,
    state: "running",
    sourceLang: opts.sourceLang,
    total: opts.targetLangs.length,
    completed: [],
    failed: [],
    current: null,
    startedAt: Date.now(),
    finishedAt: null,
  };
  jobs.set(opts.articleId, job);
  const translate = opts.translate ?? translateArticleToLanguages;

  void (async () => {
    for (const lang of opts.targetLangs) {
      job.current = lang;
      try {
        const result = await translate(opts.source, opts.sourceLang, [lang], 1);
        const fields = result[lang];
        if (!fields) throw new Error("translation failed");
        await opts.save(lang, fields);
        job.completed.push(lang);
      } catch (error) {
        console.error(`[TranslateJob] article ${opts.articleId} ${lang}:`, error instanceof Error ? error.message : error);
        job.failed.push(lang);
      }
    }
    job.current = null;
    job.state = "done";
    job.finishedAt = Date.now();
  })();

  return { started: true };
}

/** Test helper. */
export function resetTranslateJobs() {
  jobs.clear();
}
