import type { Express } from "express";
import { ENV } from "./env";

// In-memory cache for signed URLs to avoid hammering the Forge API
// Key: storage key, Value: { signedUrl, expiresAt }
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_URL_TTL_MS = 50 * 60 * 1000; // 50 minutes (signed URLs typically valid for 1 hour)

// Browser cache duration for image responses (1 day)
// We use a shorter duration than the signed URL TTL so the browser re-fetches
// before the signed URL expires, at which point we issue a fresh signed URL.
const BROWSER_CACHE_MAX_AGE = 86400; // 1 day in seconds

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      // Check in-memory signed URL cache first
      let signedUrl: string | null = null;
      const cached = signedUrlCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        signedUrl = cached.url;
      } else {
        // Fetch a fresh signed URL from the Forge API
        const forgeUrl = new URL(
          "v1/storage/presign/get",
          ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
        );
        forgeUrl.searchParams.set("path", key);

        const forgeResp = await fetch(forgeUrl, {
          headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
        });

        if (!forgeResp.ok) {
          const body = await forgeResp.text().catch(() => "");
          console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
          res.status(502).send("Storage backend error");
          return;
        }

        const { url } = (await forgeResp.json()) as { url: string };
        if (!url) {
          res.status(502).send("Empty signed URL from backend");
          return;
        }

        // Cache the signed URL for 50 minutes
        signedUrlCache.set(key, { url, expiresAt: Date.now() + SIGNED_URL_TTL_MS });
        signedUrl = url;
      }

      // Fetch the actual image content server-side and pipe it to the browser
      // This allows us to set proper Cache-Control headers that the browser will respect
      const imageResp = await fetch(signedUrl);

      if (!imageResp.ok) {
        // Signed URL may have expired; clear cache and return error
        signedUrlCache.delete(key);
        console.error(`[StorageProxy] image fetch error: ${imageResp.status} for key: ${key}`);
        res.status(502).send("Failed to fetch image from storage");
        return;
      }

      // Forward content-type from the upstream response
      const contentType = imageResp.headers.get("content-type") || "application/octet-stream";
      const contentLength = imageResp.headers.get("content-length");

      res.set("Content-Type", contentType);
      res.set("Cache-Control", `public, max-age=${BROWSER_CACHE_MAX_AGE}, stale-while-revalidate=3600`);
      res.set("Vary", "Accept-Encoding");
      if (contentLength) {
        res.set("Content-Length", contentLength);
      }

      // Pipe the image bytes directly to the response
      const buffer = await imageResp.arrayBuffer();
      res.status(200).send(Buffer.from(buffer));
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
