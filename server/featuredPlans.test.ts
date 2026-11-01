import { describe, expect, it } from "vitest";
import { featuredCountryCodes, pickFeaturedPlan } from "./featuredPlans";

const jp = [{ id: "JP", name: "Japan" }];
const plan = (over: Record<string, unknown>) => ({ countries: jp, validityDays: 7, dataAmount: 5, dataUnit: "GB", planType: null, name: "Japan", ...over });

describe("pickFeaturedPlan", () => {
  it("prefers a single-country 5-10 day plan with at least 3 GB", () => {
    const plans = [
      plan({ name: "1 day daily", validityDays: 1, dataAmount: 500, dataUnit: "MB", planType: "daily" }),
      plan({ name: "multi", countries: [...jp, { id: "KR", name: "Korea" }] }),
      plan({ name: "3 days 1GB", validityDays: 3, dataAmount: 1 }),
      plan({ name: "7 days 5GB" }),
      plan({ name: "7 days 10GB", dataAmount: 10 }),
    ];
    expect(pickFeaturedPlan(plans)?.name).toBe("7 days 5GB");
  });

  it("falls back to the cheapest single-country fixed plan, then the cheapest plan", () => {
    expect(pickFeaturedPlan([plan({ name: "daily", planType: "daily" }), plan({ name: "3d", validityDays: 3, dataAmount: 1 })])?.name).toBe("3d");
    expect(pickFeaturedPlan([plan({ name: "daily", planType: "daily" })])?.name).toBe("daily");
    expect(pickFeaturedPlan([])).toBeNull();
  });

  it("treats MB amounts and '/day' names as what they are", () => {
    const plans = [plan({ name: "7 days 2048MB", dataAmount: 2048, dataUnit: "MB" }), plan({ name: "Japan-500MB/Natural day" }), plan({ name: "7 days 3072MB", dataAmount: 3072, dataUnit: "MB" })];
    expect(pickFeaturedPlan(plans)?.name).toBe("7 days 3072MB");
  });
});

describe("featuredCountryCodes", () => {
  it("uses the popular countries setting, keeping ISO codes only", () => {
    expect(featuredCountryCodes('["JP","KR","EU33","TH"]')).toEqual(["JP", "KR", "TH"]);
  });
  it("falls back to defaults for a missing or broken setting", () => {
    expect(featuredCountryCodes(null)).toHaveLength(8);
    expect(featuredCountryCodes("not json")[0]).toBe("JP");
  });
});
