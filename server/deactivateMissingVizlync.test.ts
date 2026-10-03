import { beforeEach, describe, expect, it, vi } from "vitest";

const updates: string[][] = [];
let activeIds: string[] = [];

vi.mock("drizzle-orm", async importOriginal => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return { ...actual, inArray: (_col: unknown, ids: string[]) => ({ ids }) };
});

vi.mock("mysql2/promise", () => ({ default: {}, createPool: vi.fn() }));
vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: () => ({
    select: () => ({ from: () => ({ where: async () => activeIds.map(productId => ({ productId })) }) }),
    update: () => ({ set: () => ({ where: async (cond: { ids?: string[] }) => { updates.push(cond.ids ?? []); } }) }),
  }),
}));

beforeEach(() => {
  updates.length = 0;
  process.env.DATABASE_URL = "mysql://t:t@localhost/test";
  vi.resetModules();
});

describe("deactivateMissingVizlyncProducts", () => {
  it("deactivates only the active products the API no longer lists", async () => {
    activeIds = Array.from({ length: 20 }, (_, i) => `P${i}`);
    const { deactivateMissingVizlyncProducts } = await import("./db");
    const valid = activeIds.slice(0, 18); // P18, P19 are gone (90% still listed)
    const result = await deactivateMissingVizlyncProducts(valid);
    expect(result.deactivated).toBe(2);
    expect(updates.flat().sort()).toEqual(["P18", "P19"]);
  });

  it("does nothing when the API list looks partial", async () => {
    activeIds = Array.from({ length: 20 }, (_, i) => `P${i}`);
    const { deactivateMissingVizlyncProducts } = await import("./db");
    const result = await deactivateMissingVizlyncProducts(activeIds.slice(0, 5));
    expect(result.deactivated).toBe(0);
    expect(result.skippedReason).toMatch(/partial/);
    expect(updates).toEqual([]);
  });

  it("does nothing for an empty list", async () => {
    activeIds = ["P1"];
    const { deactivateMissingVizlyncProducts } = await import("./db");
    expect((await deactivateMissingVizlyncProducts([])).deactivated).toBe(0);
    expect(updates).toEqual([]);
  });
});
