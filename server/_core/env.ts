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

  // Login
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  /** Comma-separated emails that are always admins. */
  adminEmails: list(process.env.ADMIN_EMAILS),
  /** Where owner notifications go. Falls back to the first admin email. */
  ownerEmail: (process.env.OWNER_EMAIL ?? list(process.env.ADMIN_EMAILS)[0] ?? "").trim(),
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  indexNowKey: process.env.INDEXNOW_KEY ?? "",

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
