import { describe, expect, it } from "vitest";
import { appendQuery } from "./stripe";

describe("appendQuery", () => {
  it("starts a query string when the URL has none", () => {
    expect(appendQuery("https://x.com/orders", "a=1")).toBe("https://x.com/orders?a=1");
  });
  it("continues an existing query string (no second '?')", () => {
    expect(appendQuery("https://x.com/orders?topup_success=true", "topup_session_id={CHECKOUT_SESSION_ID}"))
      .toBe("https://x.com/orders?topup_success=true&topup_session_id={CHECKOUT_SESSION_ID}");
  });
});
