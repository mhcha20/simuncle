import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { normalizeKey, storagePut, storagePutAtKey, storageRead } from "./storage";

describe("storage (local folder fallback)", () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(path.join(tmpdir(), "simuncle-storage-"));
    process.env.STORAGE_DIR = dir;
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.STORAGE_DIR;
  });

  it("stores at an exact key and reads it back with a /manus-storage/ url", async () => {
    const { key, url } = await storagePutAtKey("logo/a.webp", Buffer.from("hello"), "image/webp");
    expect(key).toBe("logo/a.webp");
    expect(url).toBe("/manus-storage/logo/a.webp");
    expect((await storageRead(key)).toString()).toBe("hello");
  });

  it("adds a random suffix so the same name never overwrites", async () => {
    const a = await storagePut("x/pic.png", Buffer.from("1"));
    const b = await storagePut("x/pic.png", Buffer.from("2"));
    expect(a.key).not.toBe(b.key);
    expect(a.key).toMatch(/^x\/pic_[0-9a-f]{8}\.png$/);
  });

  it("refuses keys that escape the storage root", () => {
    expect(() => normalizeKey("../etc/passwd")).toThrow();
    expect(() => normalizeKey("a/../../b")).toThrow();
    expect(normalizeKey("/a/b.png")).toBe("a/b.png");
  });
});
