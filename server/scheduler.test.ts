import { describe, expect, it } from "vitest";
import { cronMatches, JOBS, selectJobs } from "./scheduler";

const at = (iso: string) => new Date(iso);

describe("cronMatches (UTC)", () => {
  it("matches every-N-minutes", () => {
    expect(cronMatches("*/10 * * * *", at("2026-09-29T01:20:00Z"))).toBe(true);
    expect(cronMatches("*/10 * * * *", at("2026-09-29T01:25:00Z"))).toBe(false);
  });
  it("matches a daily time", () => {
    expect(cronMatches("30 1 * * *", at("2026-09-29T01:30:00Z"))).toBe(true);
    expect(cronMatches("30 1 * * *", at("2026-09-29T02:30:00Z"))).toBe(false);
  });
  it("matches every-6-hours on the hour", () => {
    expect(cronMatches("0 */6 * * *", at("2026-09-29T12:00:00Z"))).toBe(true);
    expect(cronMatches("0 */6 * * *", at("2026-09-29T13:00:00Z"))).toBe(false);
  });
  it("matches weekday (Monday = 1) and day of month", () => {
    expect(cronMatches("0 1 * * 1", at("2026-09-28T01:00:00Z"))).toBe(true); // Monday
    expect(cronMatches("0 1 * * 1", at("2026-09-29T01:00:00Z"))).toBe(false); // Tuesday
    expect(cronMatches("0 1 1 * *", at("2026-10-01T01:00:00Z"))).toBe(true);
    expect(cronMatches("0 1 1 * *", at("2026-10-02T01:00:00Z"))).toBe(false);
  });
  it("supports lists and ranges", () => {
    expect(cronMatches("0,30 9-11 * * *", at("2026-09-29T10:30:00Z"))).toBe(true);
    expect(cronMatches("0,30 9-11 * * *", at("2026-09-29T12:30:00Z"))).toBe(false);
  });
  it("rejects malformed expressions", () => {
    expect(() => cronMatches("* * * *", new Date())).toThrow();
  });
  it("all built-in jobs parse and point at /api/scheduled/", () => {
    for (const job of JOBS) {
      expect(() => cronMatches(job.cron, new Date())).not.toThrow();
      expect(job.path.startsWith("/api/scheduled/")).toBe(true);
    }
  });
});

describe("selectJobs", () => {
  it("returns everything when no names are given", () => {
    expect(selectJobs(JOBS, [])).toEqual(JOBS);
  });
  it("keeps only the named jobs", () => {
    expect(selectJobs(JOBS, ["reconcile-orders"]).map(j => j.name)).toEqual(["reconcile-orders"]);
  });
  it("rejects a misspelled name", () => {
    expect(() => selectJobs(JOBS, ["reconcile-order"])).toThrow(/unknown/);
  });
});
