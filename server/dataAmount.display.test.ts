import { describe, it, expect } from "vitest";
import { formatDataAmount } from "../client/src/lib/dataAmount";

describe("formatDataAmount (order/cart data volume display)", () => {
  it("uses structured fields when dataAmount is a positive number", () => {
    expect(formatDataAmount({ dataAmount: 5, dataUnit: "GB" })).toBe("5GB");
    expect(formatDataAmount({ dataAmount: 500, dataUnit: "MB" })).toBe("500MB");
    expect(formatDataAmount({ dataAmount: 1.5, dataUnit: "GB" })).toBe("1.5GB");
  });

  it("returns null (not 0GB) when dataAmount is null and name has no volume", () => {
    expect(formatDataAmount({ dataAmount: null, dataUnit: "GB" }, "Some Plan")).toBeNull();
    expect(formatDataAmount({ dataAmount: null, dataUnit: "GB" })).toBeNull();
  });

  it("falls back to parsing the plan name when dataAmount is null", () => {
    expect(
      formatDataAmount({ dataAmount: null, dataUnit: "GB" }, "Greater China-daily 500MB"),
    ).toBe("500MB");
    expect(
      formatDataAmount(
        { dataAmount: null, dataUnit: "GB" },
        "China Hong Kong Macao-SGIP-500MB/day,384kbps",
      ),
    ).toBe("500MB");
    expect(
      formatDataAmount({ dataAmount: null, dataUnit: "GB" }, "Greater China-fixed 20GB (3 days)"),
    ).toBe("20GB");
  });

  it("does not mistake network tokens like 4G/5G for data volume", () => {
    expect(formatDataAmount({ dataAmount: null, dataUnit: "GB" }, "Plan 4G/5G only")).toBeNull();
  });

  it("picks the largest volume token from the name", () => {
    expect(
      formatDataAmount({ dataAmount: null, dataUnit: "GB" }, "Combo 20GB + 500MB bonus"),
    ).toBe("20GB");
  });

  it("treats 0 dataAmount as invalid and falls back", () => {
    expect(formatDataAmount({ dataAmount: 0, dataUnit: "GB" }, "Daily 500MB")).toBe("500MB");
    expect(formatDataAmount({ dataAmount: "0", dataUnit: "GB" }, "No volume here")).toBeNull();
  });
});
