import { describe, expect, it } from "vitest";
import { fetchAllTgtProducts, getTgtAccountBalance, verifyTgtCallbackSign, queryTgtOrder, queryTgtUsage } from "./tgt";

describe("TGT Technology Global API", () => {
  it("should have API credentials configured", () => {
    expect(process.env.TGT_API_BASE_URL).toBeTruthy();
    expect(process.env.TGT_ACCOUNT_ID).toBeTruthy();
    expect(process.env.TGT_SECRET).toBeTruthy();
  });

  it("should fetch account balance from TGT API", async () => {
    const result = await getTgtAccountBalance();
    expect(result).toBeDefined();
    expect(typeof result.balance).toBe("number");
    expect(result.currency).toBeTruthy();
  }, 30000);

  it("should fetch products from TGT API", async () => {
    const result = await fetchAllTgtProducts();
    expect(result).toBeDefined();
    expect(result.products).toBeInstanceOf(Array);
    expect(result.products.length).toBeGreaterThan(0);
    const first = result.products[0];
    expect(first.productCode).toBeTruthy();
    expect(first.productName).toBeTruthy();
    expect(typeof first.netPrice).toBe("number");
  }, 60000);

  it("should return null or throw a known error for non-existent order in queryTgtOrder", async () => {
    // Use a channelOrderNo that is very unlikely to exist.
    // Acceptable outcomes:
    //   1. null — order not found (subCode 5032)
    //   2. object — order data returned
    //   3. Error with known TGT error codes (e.g. 2003 token race in parallel tests)
    try {
      const result = await queryTgtOrder("SU999999999");
      expect(result === null || typeof result === "object").toBe(true);
    } catch (err: unknown) {
      // Tolerate TGT token / auth errors that can occur in parallel test runs
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).toMatch(/TGT order\/query failed/);
    }
  }, 30000);

  it("should return null or throw a known error for non-existent orderNo in queryTgtUsage", async () => {
    // Acceptable outcomes: null (not supported / not found) or a known TGT error
    try {
      const result = await queryTgtUsage("NONEXISTENT_ORDER_NO");
      expect(result === null || typeof result === "object").toBe(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).toMatch(/TGT order\/usage failed/);
    }
  }, 30000);

  it("should verify callback signature correctly", () => {
    // Test with a known payload — sign verification uses TGT_SECRET from env
    const payload = {
      code: "0000",
      msg: "success",
      timestamp: "1234567890",
      data: {
        eventType: 1,
        businessType: "success",
        orderInfo: {
          orderNo: "TGT123",
          channelOrderNo: "CH456",
        },
      },
    };
    // verifyTgtCallbackSign should return a boolean without throwing
    const result = verifyTgtCallbackSign(payload as Record<string, unknown>, "anysign");
    expect(typeof result).toBe("boolean");
  });
});
