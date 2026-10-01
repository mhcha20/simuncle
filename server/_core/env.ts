const list = (value: string | undefined) =>
  (value ?? "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);

export const ENV = {
  appId: process.env.APP_ID ?? "simuncle",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  /** Public site origin, e.g. https://simuncle.com (used for OAuth redirect + email links). */
  publicUrl: process.env.PUBLIC_URL ?? "",

  /** Shared secret for triggering /api/scheduled/* over HTTP (also used by the built-in scheduler). */
  cronSecret: process.env.CRON_SECRET ?? "",
  disableScheduler: process.env.DISABLE_SCHEDULER === "1",
  /** Comma-separated job names to run (see server/scheduler.ts). Unset = all jobs. */
  schedulerJobs: list(process.env.SCHEDULER_JOBS),

  // Login
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  /** Comma-separated emails that are always admins. */
  adminEmails: list(process.env.ADMIN_EMAILS),
  /** Where owner notifications go. Falls back to the first admin email. */
  ownerEmail: (process.env.OWNER_EMAIL ?? list(process.env.ADMIN_EMAILS)[0] ?? "").trim(),
  indexNowKey: process.env.INDEXNOW_KEY ?? "",

  // LLM (Anthropic)
  llmApiKey: process.env.LLM_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? "",
  /** "anthropic" (default) | "openrouter" | "openai" (any OpenAI-compatible endpoint, set LLM_API_URL). Keys starting sk-or- are treated as OpenRouter. */
  llmProvider: (process.env.LLM_PROVIDER ?? "").toLowerCase(),
  llmModel: process.env.LLM_MODEL || undefined,
  llmApiUrl: process.env.LLM_API_URL ?? "",

  // File storage (any S3-compatible service: Cloudflare R2, AWS S3, ...)
  s3Endpoint: process.env.S3_ENDPOINT ?? "",
  s3Region: process.env.S3_REGION ?? "auto",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  /** Optional public base URL for the bucket. If unset, files are served through the app. */
  s3PublicUrl: (process.env.S3_PUBLIC_URL ?? "").replace(/\/+$/, ""),
};

if (ENV.isProduction && ENV.cookieSecret.length < 32) {
  throw new Error("JWT_SECRET must be set to a random string of at least 32 characters");
}
