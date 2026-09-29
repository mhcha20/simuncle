import { describe, expect, it } from "vitest";
import { extractTopupPlans, computeTopupPriceHkd, parsePlanDataGb, parsePlanValidityDays, selectMainTopupPlans } from "./vizlync";
import type { VizlyncTopupPlan } from "./vizlync";

describe("extractTopupPlans", () => {
  it("extracts the array from the real Vizlync shape { data wrapper already unwrapped }", () => {
    const raw = {
      originalOrder: { orderId: "VLZ6725" },
      topupPlans: [
        { productId: "A1", name: "Plan A", price: 12.96 },
        { productId: "B2", name: "Plan B", price: 5 },
      ],
    };
    const plans = extractTopupPlans(raw);
    expect(plans).toHaveLength(2);
    expect(plans[0].productId).toBe("A1");
  });

  it("handles a bare array", () => {
    const plans = extractTopupPlans([{ productId: "X", name: "X", price: 1 }]);
    expect(plans).toHaveLength(1);
  });

  it("handles a { plans: [...] } shape", () => {
    const plans = extractTopupPlans({ plans: [{ productId: "Y", name: "Y", price: 2 }] });
    expect(plans).toHaveLength(1);
  });

  it("handles a nested { data: { topupPlans: [...] } } shape", () => {
    const plans = extractTopupPlans({ data: { topupPlans: [{ productId: "Z", name: "Z", price: 3 }] } });
    expect(plans).toHaveLength(1);
  });

  // Regression: the original bug — an object was passed to Array.prototype.map
  it("returns [] for an object without a plans array (does NOT throw)", () => {
    expect(extractTopupPlans({ originalOrder: { orderId: "x" } })).toEqual([]);
  });

  it("returns [] for null / undefined / primitives", () => {
    expect(extractTopupPlans(null)).toEqual([]);
    expect(extractTopupPlans(undefined)).toEqual([]);
    expect(extractTopupPlans("oops")).toEqual([]);
    expect(extractTopupPlans(42)).toEqual([]);
  });
});

describe("computeTopupPriceHkd", () => {
  it("applies markup and HKD rate, rounding to nearest integer", () => {
    // 12.96 * 1.10 = 14.256; * 7.8 = 111.1968 -> round 111
    expect(computeTopupPriceHkd(12.96, 10, 7.8)).toBe(111);
  });

  it("works with zero markup", () => {
    // 5 * 7.8 = 39
    expect(computeTopupPriceHkd(5, 0, 7.8)).toBe(39);
  });

  it("returns 0 for invalid / non-positive prices", () => {
    expect(computeTopupPriceHkd(null, 10, 7.8)).toBe(0);
    expect(computeTopupPriceHkd(undefined, 10, 7.8)).toBe(0);
    expect(computeTopupPriceHkd("abc", 10, 7.8)).toBe(0);
    expect(computeTopupPriceHkd(0, 10, 7.8)).toBe(0);
    expect(computeTopupPriceHkd(-3, 10, 7.8)).toBe(0);
  });
});

describe("parsePlanDataGb", () => {
  it("parses GB from the plan name", () => {
    expect(parsePlanDataGb({ productId: "a", name: "Greater China-fixed 5GB (3 days)", price: 5 })).toBe(5);
    expect(parsePlanDataGb({ productId: "b", name: "Greater China-fixed 20GB (10 days)", price: 20 })).toBe(20);
  });

  it("parses MB from the name and converts to GB", () => {
    expect(parsePlanDataGb({ productId: "c", name: "Daily 500MB/day", price: 3 })).toBeCloseTo(500 / 1024, 5);
  });

  it("prefers structured dataAmount/dataUnit when present", () => {
    expect(parsePlanDataGb({ productId: "d", name: "whatever", price: 1, dataAmount: 10, dataUnit: "GB" })).toBe(10);
    expect(parsePlanDataGb({ productId: "e", name: "whatever", price: 1, dataAmount: 1024, dataUnit: "MB" })).toBe(1);
  });

  it("returns null when no volume can be determined", () => {
    expect(parsePlanDataGb({ productId: "f", name: "Unlimited plan", price: 9 })).toBeNull();
  });

  it("ignores 4G/5G network tokens and picks the real volume", () => {
    // "5G" has no B suffix so it must not be matched; "10GB" should win.
    expect(parsePlanDataGb({ productId: "g", name: "5G Network 10GB (5 days)", price: 10 })).toBe(10);
  });
});

describe("parsePlanValidityDays", () => {
  it("prefers the structured validityDays field", () => {
    expect(parsePlanValidityDays({ productId: "a", name: "whatever", price: 1, validityDays: 30 })).toBe(30);
  });
  it("parses '(N days)' from the name", () => {
    expect(parsePlanValidityDays({ productId: "b", name: "Greater China-fixed 5GB (3 days)", price: 5 })).toBe(3);
    expect(parsePlanValidityDays({ productId: "c", name: "Greater China-fixed 20GB (30 days)", price: 24 })).toBe(30);
  });
  it("parses Chinese day units", () => {
    expect(parsePlanValidityDays({ productId: "d", name: "大中華 10GB 7天", price: 8 })).toBe(7);
    expect(parsePlanValidityDays({ productId: "e", name: "日本 5GB 15日", price: 6 })).toBe(15);
  });
  it("recognizes word-based monthly/weekly/daily hints", () => {
    expect(parsePlanValidityDays({ productId: "f", name: "Monthly Unlimited", price: 99 })).toBe(30);
    expect(parsePlanValidityDays({ productId: "g", name: "月費方案", price: 99 })).toBe(30);
    expect(parsePlanValidityDays({ productId: "h", name: "Daily 500MB/day", price: 3 })).toBe(1);
  });
  it("returns null when no validity can be determined", () => {
    expect(parsePlanValidityDays({ productId: "i", name: "Greater China-fixed 5GB", price: 6 })).toBeNull();
  });
});

describe("selectMainTopupPlans", () => {
  const makeMany = (): VizlyncTopupPlan[] => [
    { productId: "p1", name: "Greater China-fixed 20GB (10 days)", price: 21 },
    { productId: "p2", name: "Greater China-fixed 20GB (3 days)", price: 19 },
    { productId: "p3", name: "Greater China-fixed 20GB (30 days)", price: 24 },
    { productId: "p4", name: "Greater China-fixed 20GB (5 days)", price: 20 },
    { productId: "p5", name: "Greater China-fixed 20GB", price: 19 },
    { productId: "p6", name: "Greater China-fixed 3GB (30 days)", price: 6 },
    { productId: "p7", name: "Greater China-fixed 5GB", price: 6.4 },
    { productId: "p8", name: "Greater China-fixed 5GB (3 days)", price: 6.4 },
    { productId: "p9", name: "Greater China-fixed 5GB (5 days)", price: 6.7 },
    { productId: "p10", name: "Greater China-fixed 1GB", price: 2 },
  ];

  it("returns at most `count` plans (default 4)", () => {
    const result = selectMainTopupPlans(makeMany());
    expect(result.length).toBeLessThanOrEqual(4);
  });

  it("spans low and high volumes (includes smallest and largest tiers)", () => {
    const result = selectMainTopupPlans(makeMany(), 4);
    const gbs = result.map((p) => parsePlanDataGb(p)!);
    expect(Math.min(...gbs)).toBe(1); // smallest = 1GB
    expect(Math.max(...gbs)).toBe(20); // largest = 20GB
  });

  it("always includes a long-validity (e.g. 30 day / monthly) option", () => {
    const result = selectMainTopupPlans(makeMany(), 4);
    const maxDays = Math.max(...result.map((p) => parsePlanValidityDays(p) ?? 0));
    expect(maxDays).toBe(30); // a 30-day plan must be present
  });

  it("puts the 'least data but longest validity' plan LAST", () => {
    const result = selectMainTopupPlans(makeMany(), 4);
    const tail = result[result.length - 1];
    // p6 = 3GB (30 days) is the smallest-data 30-day plan -> must be last.
    expect(tail.productId).toBe("p6");
    expect(parsePlanValidityDays(tail)).toBe(30);
  });

  it("orders the non-tail plans by data volume ascending", () => {
    const result = selectMainTopupPlans(makeMany(), 4);
    const head = result.slice(0, -1).map((p) => parsePlanDataGb(p) ?? Infinity);
    const sorted = [...head].sort((a, b) => a - b);
    expect(head).toEqual(sorted);
  });

  it("returns the list unchanged when it is already small", () => {
    const few: VizlyncTopupPlan[] = [
      { productId: "a", name: "1GB", price: 2 },
      { productId: "b", name: "5GB", price: 6 },
    ];
    expect(selectMainTopupPlans(few, 4)).toHaveLength(2);
  });

  it("falls back to cheapest few when no volume is parseable", () => {
    const plans: VizlyncTopupPlan[] = [
      { productId: "a", name: "Unlimited A", price: 30 },
      { productId: "b", name: "Unlimited B", price: 10 },
      { productId: "c", name: "Unlimited C", price: 20 },
      { productId: "d", name: "Unlimited D", price: 40 },
      { productId: "e", name: "Unlimited E", price: 5 },
    ];
    const result = selectMainTopupPlans(plans, 4);
    expect(result).toHaveLength(4);
    expect(Number(result[0].price)).toBe(5); // cheapest first
  });

  it("returns [] for empty input", () => {
    expect(selectMainTopupPlans([], 4)).toEqual([]);
  });
});
