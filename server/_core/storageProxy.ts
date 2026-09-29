import type { Express } from "express";
import { ENV } from "./env";
import { isS3Configured, normalizeKey, storageRead } from "../storage";

const CACHE_CONTROL = "public, max-age=86400";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  pdf: "application/pdf",
  json: "application/json",
};

function contentTypeFor(key: string): string {
  return CONTENT_TYPES[key.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

function publicUrl(key: string) {
  return `${ENV.s3PublicUrl}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * Serves /manus-storage/{key} (the URL format already stored in the database).
 * - S3/R2 with S3_PUBLIC_URL: redirect to the public bucket URL.
 * - Otherwise the bytes are served from here with a cacheable response
 *   (a presigned-URL redirect changes on every visit, so browsers could not cache it).
 */
export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    let key: string;
    try {
      key = normalizeKey((req.params as Record<string, string>)[0] ?? "");
    } catch {
      res.status(400).send("Invalid storage key");
      return;
    }

    try {
      if (isS3Configured() && ENV.s3PublicUrl) {
        res.set("Cache-Control", CACHE_CONTROL);
        res.redirect(301, publicUrl(key));
        return;
      }

      let bytes: Buffer;
      try {
        bytes = await storageRead(key);
      } catch {
        res.status(404).send("Not found");
        return;
      }
      res.set({ "Content-Type": contentTypeFor(key), "Cache-Control": CACHE_CONTROL });
      res.send(bytes);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage error");
    }
  });
}
