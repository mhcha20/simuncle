import { describe, expect, it } from "vitest";
import { shortPlanName } from "../client/src/lib/planName";

const C = (...ids: string[]) => ids.map((id) => ({ id, name: id }));

describe("shortPlanName", () => {
  it("TGT daily and fixed plans", () => {
    expect(shortPlanName({ name: "Hong Kong(China) & Macau(China) 1 day(500MB high speed/day)(Valid for 60 days)(ai1)", countries: C("HK", "MO"), validityDays: 1, dataAmount: null, dataUnit: "GB", planType: "daily" }, "zh-TW")).toBe("香港、澳門 1天 每日500MB");
    expect(shortPlanName({ name: "China 1GB/5 days(Valid for 60 days)(C4)", countries: C("CN"), validityDays: 5, dataAmount: "1.000", dataUnit: "GB", planType: "data" }, "en")).toMatch(/ 5 days 1GB$/);
    expect(shortPlanName({ name: "Korea 1 day(Unlimited/day)(Valid for 60 days)(P1)(5G)", countries: C("KR"), validityDays: 1, planType: "daily" }, "zh-TW")).toBe("韓國 1天 每日無限");
  });

  it("Vizlync names with carrier text and missing data fields", () => {
    expect(shortPlanName({ name: "Japan-SoftBank Local-5G-30GB-eSIM Carrier of 90 days  (15 Days)", countries: C("JP"), validityDays: 15, dataAmount: "30.000", dataUnit: "GB", planType: "Fixed" }, "zh-TW")).toBe("日本 15天 30GB");
    expect(shortPlanName({ name: "Italy-fixed 5GB (7 Days)", countries: C("IT"), validityDays: 7, dataAmount: null, dataUnit: "GB", planType: "Unlimited" }, "zh-TW")).toBe("意大利 7天 5GB");
    expect(shortPlanName({ name: "China Mainland-China Telecom-500MB/Natural Day,128kbps-eSIM Carrier of 90 days ", countries: C("CN"), validityDays: 1, dataAmount: "0.488", dataUnit: "GB", planType: "Unlimited" }, "zh-TW")).toMatch(/1天 每日500MB$/);
    expect(shortPlanName({ name: "Turkey-daily 500MB-eSIM Carrier of 90 days ", countries: C("TR"), validityDays: 1, dataAmount: "0.488", dataUnit: "GB", planType: "Unlimited" }, "zh-TW")).toMatch(/1天 每日500MB$/);
  });

  it("multi-country plans use the region and count", () => {
    const eu = C(...Array.from({ length: 33 }, (_, i) => `E${i}`));
    expect(shortPlanName({ name: "Europe 33-daily 1GB-eSIM Carrier of 90 days ", countries: eu, validityDays: 1, dataAmount: "1.000", planType: "Unlimited" }, "zh-TW")).toBe("歐洲 33國 1天 每日1GB");
    expect(shortPlanName({ name: "(RNR) AsiaLink 12-3GB,384kbps-eSIM Carrier of 90 days  (10 Days)", countries: C("TH", "VN", "PH", "TW", "HK", "JP", "NZ", "SG", "MY", "ID", "KR", "AU", "KH"), validityDays: 10, dataAmount: null, planType: "Unlimited" }, "en")).toBe("Asia 13 countries 10 days 3GB");
    expect(shortPlanName({ name: "Greater China-fixed 20GB-eSIM Carrier of 90 days  (12 Days)", countries: C("MO", "CN", "TW", "HK"), validityDays: 12, planType: "Unlimited" }, "zh-TW")).toBe("大中華 12天 20GB");
    expect(shortPlanName({ name: "AsiaLink 12-5G-5GB-384kbps (10 Days)", countries: C(...Array.from({ length: 13 }, (_, i) => `A${i}`)), validityDays: 10, planType: "Unlimited" }, "zh-TW")).toBe("亞洲 13國 10天 5GB");
  });

  it("top-up add-ons and unknown data", () => {
    expect(shortPlanName({ name: "TopUp Asia 7 Countries 3 GB", countries: C("HK", "ID", "MY", "SG", "TH", "VN", "PH"), validityDays: 30, dataAmount: "3.000", planType: "Fixed" }, "zh-TW")).toBe("加值包 亞洲 7國 30天 3GB");
    expect(shortPlanName({ name: "Philippines Short Trip", countries: C("PH"), validityDays: 5, dataAmount: "3.000", dataUnit: "GB", planType: "Fixed" }, "zh-TW")).toBe("菲律賓 5天 3GB");
    expect(shortPlanName({ name: "Mystery plan", countries: C("PH"), validityDays: 5, dataAmount: null, planType: "Fixed" }, "zh-TW")).toBeNull();
  });
});

describe("dataFromName", () => {
  it("reads fixed amounts and ignores per-day ones", async () => {
    const { dataFromName } = await import("../client/src/lib/planName");
    expect(dataFromName("Italy-fixed 5GB (7 Days)")).toBe("5GB");
    expect(dataFromName("United Kingdom 1GB/3 days(Valid for 60 days)(ai1)")).toBe("1GB");
    expect(dataFromName("Singapore-500MB/Natural day")).toBeNull();
    expect(dataFromName("Philippines Short Trip")).toBeNull();
  });
});
