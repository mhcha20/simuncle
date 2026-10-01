import { describe, expect, it, vi } from "vitest";
import { buildSiteFacts, buildSupportContext, detectDestinations } from "./supportContext";

describe("detectDestinations", () => {
  it("finds destinations in any language", () => {
    expect(detectDestinations("日本 eSIM 點用？")).toEqual(["JP"]);
    expect(detectDestinations("Best data plan for South Korea?")).toEqual(["KR"]);
    expect(detectDestinations("タイに行きます")).toEqual(["TH"]);
  });
  it("returns at most two, in the order they appear", () => {
    expect(detectDestinations("我去泰國同日本，再去新加坡")).toEqual(["TH", "JP"]);
  });
  it("returns nothing for general questions", () => {
    expect(detectDestinations("點樣安裝 eSIM？")).toEqual([]);
  });
});

describe("buildSiteFacts", () => {
  it("uses the given site address and tells the model not to guess", () => {
    const facts = buildSiteFacts("https://simuncle.com");
    expect(facts).toContain("https://simuncle.com/how-to-install");
    expect(facts).toContain("https://simuncle.com/products?topup=1");
    expect(facts).toMatch(/do not guess/);
  });
});

describe("buildSupportContext", () => {
  const plan = (over: Record<string, unknown> = {}) => ({
    productId: "FX1", name: "Japan 3 GB", price: 2, dataAmount: 3, dataUnit: "GB", validityDays: 7, topUpAvailable: true, ...over,
  });

  it("returns only the facts when no destination is mentioned (no DB calls)", async () => {
    const getProducts = vi.fn();
    const out = await buildSupportContext("點樣付款？", { getProducts, getSetting: async () => null });
    expect(out).toContain("SHOP FACTS");
    expect(out).not.toContain("CURRENT CHEAPEST PLANS");
    expect(getProducts).not.toHaveBeenCalled();
  });

  it("adds the destination's live plans with HKD prices and links", async () => {
    const getProducts = vi.fn(async () => ({ products: [plan(), plan({ productId: "FX2", name: "Japan topup 1GB" })] }));
    const settings: Record<string, string> = { markup_percentage: "50", hkd_rate: "8" };
    const out = await buildSupportContext("日本有咩 eSIM？", { getProducts, getSetting: async k => settings[k] ?? null });
    expect(getProducts).toHaveBeenCalledWith({ countries: ["JP"], limit: 8, sortBy: "price_asc" });
    expect(out).toContain("CURRENT CHEAPEST PLANS FOR JP");
    expect(out).toContain("Japan 3 GB | data: 3 GB | validity: 7 day(s) | HK$24 | top-up available"); // 2 * 1.5 * 8
    expect(out).toContain("/products/");
    expect(out).not.toContain("Japan topup 1GB"); // add-on plans are not offered as plans
  });
});
