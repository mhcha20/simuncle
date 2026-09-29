import { describe, it, expect } from "vitest";

describe("Resend API Key", () => {
  it("should have RESEND_API_KEY configured", () => {
    const key = process.env.RESEND_API_KEY;
    expect(key).toBeTruthy();
    expect(key).toMatch(/^re_/);
  });

  it(
    "should be able to reach Resend API (key is valid for sending)",
    async () => {
      const key = process.env.RESEND_API_KEY;
      // GET /emails returns 200 or 403 (send-only key) — both mean key is valid
      // 401 means invalid key
      const res = await fetch("https://api.resend.com/emails", {
        method: "GET",
        headers: { Authorization: `Bearer ${key}` },
      });
      expect(res.status).not.toBe(401);
      console.log("Resend API response status:", res.status);
    },
    15000 // 15s timeout for network call
  );
});
