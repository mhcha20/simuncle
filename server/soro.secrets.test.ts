/**
 * Validates that SORO_REFRESH_TOKEN and SORO_SUPABASE_ANON_KEY are set
 * and can successfully refresh a Soro access token.
 */
import { describe, it, expect } from "vitest";

const SORO_SUPABASE_URL = "https://afocirmbqdxnkyescnev.supabase.co";

describe.skipIf(!process.env.SORO_REFRESH_TOKEN)("Soro Secrets Validation", () => {
  it("SORO_REFRESH_TOKEN and SORO_SUPABASE_ANON_KEY should be set", () => {
    expect(process.env.SORO_REFRESH_TOKEN, "SORO_REFRESH_TOKEN must be set").toBeTruthy();
    expect(process.env.SORO_SUPABASE_ANON_KEY, "SORO_SUPABASE_ANON_KEY must be set").toBeTruthy();
  });

  it("should be able to refresh Soro access token", async () => {
    const refreshToken = process.env.SORO_REFRESH_TOKEN;
    const anonKey = process.env.SORO_SUPABASE_ANON_KEY;

    if (!refreshToken || !anonKey) {
      console.warn("Skipping Soro token refresh test: secrets not set");
      return;
    }

    const resp = await fetch(
      `${SORO_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );

    expect(resp.ok, `Token refresh HTTP status: ${resp.status}`).toBe(true);

    const data = await resp.json();
    expect(data.access_token, "access_token should be returned").toBeTruthy();
    expect(data.refresh_token, "new refresh_token should be returned").toBeTruthy();
    expect(data.expires_at, "expires_at should be returned").toBeTruthy();

    console.log("✅ Soro token refresh OK");
    console.log("   New refresh_token:", data.refresh_token);
    console.log("   Expires at:", new Date(data.expires_at * 1000).toISOString());
  }, 15000);
});
