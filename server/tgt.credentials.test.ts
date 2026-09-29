import { describe, it, expect } from "vitest";
import axios from "axios";

const BASE = process.env.TGT_API_BASE_URL ?? "https://enterpriseapisandbox.tugegroup.com:8070/openapi";
const ACCOUNT_ID = process.env.TGT_ACCOUNT_ID ?? "";
const SECRET = process.env.TGT_SECRET ?? "";

describe("TGT credentials", () => {
  it("should connect to production TGT API (not sandbox)", () => {
    expect(BASE).toContain("enterpriseapi.tugegroup.com");
    expect(BASE).not.toContain("sandbox");
    expect(ACCOUNT_ID).toBe("Simuncle");
    expect(SECRET).toBeTruthy();
  });

  it("should obtain a valid TGT access token", async () => {
    const res = await axios.post(
      BASE + "/oauth/token",
      { accountId: ACCOUNT_ID, secret: SECRET },
      { headers: { "Content-Type": "application/json;charset=UTF-8" }, timeout: 15000 }
    );
    expect(res.data.code).toBe("0000");
    expect(res.data.data?.token ?? res.data.data?.accessToken).toBeTruthy();
  }, 20000);
});
