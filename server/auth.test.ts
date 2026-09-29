import { describe, expect, it } from "vitest";
import { safeReturnTo, normalizeEmail } from "./_core/auth";
import { sdk } from "./_core/sdk";

describe("safeReturnTo", () => {
  it("keeps same-site relative paths", () => {
    expect(safeReturnTo("/orders?status=active")).toBe("/orders?status=active");
  });
  it("rejects absolute, protocol-relative, backslash and api targets", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "/api/trpc", "orders", undefined, 5]) {
      expect(safeReturnTo(bad)).toBe("/");
    }
  });
});

describe("normalizeEmail", () => {
  it("trims and lower-cases so login matches accounts created under Manus", () => {
    expect(normalizeEmail("  Man.Hey@Gmail.COM ")).toBe("man.hey@gmail.com");
  });
});

describe("session cookie", () => {
  it("round-trips a signed session", async () => {
    const token = await sdk.createSessionToken("google_123", { name: "A" });
    expect(await sdk.verifySession(token)).toEqual({ openId: "google_123", appId: "simuncle", name: "A" });
  });
  it("rejects a tampered or missing session", async () => {
    const token = await sdk.createSessionToken("google_123");
    expect(await sdk.verifySession(token + "x")).toBeNull();
    expect(await sdk.verifySession(undefined)).toBeNull();
  });
});
