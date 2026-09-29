// File storage for uploaded images and assets.
//
// Uses any S3-compatible bucket (Cloudflare R2, AWS S3, Backblaze B2, ...) when
// S3_BUCKET is set; otherwise falls back to a local folder (STORAGE_DIR,
// default ./storage-data) - fine for local development.
//
// Public URLs stay in the form /manus-storage/{key} so every image path already
// saved in the database, emails and source code keeps working after the migration.

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ENV } from "./_core/env";

export const STORAGE_URL_PREFIX = "/manus-storage/";

let _client: S3Client | null = null;

export function isS3Configured() {
  return Boolean(ENV.s3Bucket && ENV.s3AccessKeyId && ENV.s3SecretAccessKey);
}

function getS3Client() {
  if (!_client) {
    _client = new S3Client({
      region: ENV.s3Region || "auto",
      endpoint: ENV.s3Endpoint || undefined,
      credentials: { accessKeyId: ENV.s3AccessKeyId, secretAccessKey: ENV.s3SecretAccessKey },
    });
  }
  return _client;
}

function localStorageDir() {
  return path.resolve(process.env.STORAGE_DIR || "storage-data");
}

/** Normalise a key and refuse anything that could escape the storage root. */
export function normalizeKey(relKey: string): string {
  const key = relKey.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!key || key.split("/").some(part => part === ".." || part === ".")) {
    throw new Error(`Invalid storage key: ${relKey}`);
  }
  return key;
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

/** Store under a key with a random suffix, so the same name never overwrites an older file. */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  return storagePutAtKey(appendHashSuffix(normalizeKey(relKey)), data, contentType);
}

/** Store at exactly `relKey` (no random suffix), overwriting any existing object. */
export async function storagePutAtKey(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const body = typeof data === "string" ? Buffer.from(data) : data;

  if (isS3Configured()) {
    await getS3Client().send(
      new PutObjectCommand({ Bucket: ENV.s3Bucket, Key: key, Body: body, ContentType: contentType }),
    );
  } else {
    const filePath = path.join(localStorageDir(), key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
  }

  return { key, url: `${STORAGE_URL_PREFIX}${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `${STORAGE_URL_PREFIX}${key}` };
}

/** Short-lived direct URL for a stored object (S3 only). */
export async function storageGetSignedUrl(relKey: string, expiresInSeconds = 3600): Promise<string> {
  const key = normalizeKey(relKey);
  if (!isS3Configured()) return `${STORAGE_URL_PREFIX}${key}`;
  return getSignedUrl(getS3Client(), new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}

/** Read a stored object's bytes (S3 or the local folder). */
export async function storageRead(relKey: string): Promise<Buffer> {
  const key = normalizeKey(relKey);
  if (isS3Configured()) {
    const result = await getS3Client().send(new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }));
    if (!result.Body) throw new Error(`Empty object: ${key}`);
    return Buffer.from(await result.Body.transformToByteArray());
  }
  return readFile(path.join(localStorageDir(), key));
}
