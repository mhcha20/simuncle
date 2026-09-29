import { describe, it, expect } from "vitest";
import { combineUsage } from "./vizlync";

const MB = 1048576;

describe("combineUsage", () => {
  it("returns base figures unchanged when there are no top-ups", () => {
    const base = { dataAllowance: 500 * MB, dataUsage: 248 * MB, status: "Active" };
    const r = combineUsage(base, []);
    expect(r.dataAllowance).toBe(500 * MB);
    expect(r.dataUsage).toBe(248 * MB);
    expect(r.topupCount).toBe(0);
    expect(r.addonAllowance).toBe(0);
    expect(r.addonUsage).toBe(0);
    // preserves other fields
    expect(r.status).toBe("Active");
  });

  it("sums one top-up's allowance and usage on top of the base", () => {
    const base = { dataAllowance: 500 * MB, dataUsage: 248 * MB };
    const topup = { dataAllowance: 500 * MB, dataUsage: 0 };
    const r = combineUsage(base, [topup]);
    expect(r.dataAllowance).toBe(1000 * MB);
    expect(r.dataUsage).toBe(248 * MB);
    expect(r.topupCount).toBe(1);
    expect(r.addonAllowance).toBe(500 * MB);
    expect(r.addonUsage).toBe(0);
  });

  it("sums multiple top-ups", () => {
    const base = { dataAllowance: 500 * MB, dataUsage: 100 * MB };
    const r = combineUsage(base, [
      { dataAllowance: 500 * MB, dataUsage: 50 * MB },
      { dataAllowance: 1000 * MB, dataUsage: 0 },
    ]);
    expect(r.dataAllowance).toBe(2000 * MB);
    expect(r.dataUsage).toBe(150 * MB);
    expect(r.topupCount).toBe(2);
    expect(r.addonAllowance).toBe(1500 * MB);
    expect(r.addonUsage).toBe(50 * MB);
  });

  it("ignores invalid / missing numeric fields safely", () => {
    const base = { dataAllowance: 500 * MB, dataUsage: 248 * MB };
    const r = combineUsage(base, [
      { dataAllowance: undefined, dataUsage: undefined },
      { dataAllowance: "not-a-number", dataUsage: null },
      { dataAllowance: 300 * MB, dataUsage: 10 * MB },
    ]);
    expect(r.dataAllowance).toBe(800 * MB);
    expect(r.dataUsage).toBe(258 * MB);
    // all three entries counted toward topupCount regardless of validity
    expect(r.topupCount).toBe(3);
    expect(r.addonAllowance).toBe(300 * MB);
    expect(r.addonUsage).toBe(10 * MB);
  });

  it("handles a base with missing fields", () => {
    const base = {};
    const r = combineUsage(base, [{ dataAllowance: 500 * MB, dataUsage: 20 * MB }]);
    expect(r.dataAllowance).toBe(500 * MB);
    expect(r.dataUsage).toBe(20 * MB);
  });
});
