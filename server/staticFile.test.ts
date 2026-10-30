import { describe, expect, it } from "vitest";
import { looksLikeStaticFile } from "./_core/vite";

describe("looksLikeStaticFile", () => {
  it("treats image, script and font paths as files", () => {
    for (const p of ["/apple-touch-icon.png", "/favicon.ico", "/assets/app.js", "/fonts/x.woff2", "/a/b.JPG"]) {
      expect(looksLikeStaticFile(p)).toBe(true);
    }
  });
  it("leaves app routes alone", () => {
    for (const p of ["/", "/products", "/products/ABC123", "/blog/esim-guide", "/track-order", "/admin/seo"]) {
      expect(looksLikeStaticFile(p)).toBe(false);
    }
  });
});
