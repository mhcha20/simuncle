import { describe, it, expect } from "vitest";

// Unit-test the change-detection logic extracted from scheduledSync.ts
// (pure functions, no DB / HTTP required)

type ProductStub = { productId: string; name: string; price: number };

function detectChanges(
  existing: Map<string, number>,
  incoming: ProductStub[]
) {
  const newIds = new Set(incoming.map((p) => p.productId));
  const added = incoming.filter((p) => !existing.has(p.productId));
  const removedIds = [...existing.keys()].filter((id) => !newIds.has(id));
  const priceChanged = incoming.filter((p) => {
    const oldPrice = existing.get(p.productId);
    if (oldPrice === undefined) return false;
    return Math.abs(oldPrice - p.price) >= 0.001;
  });
  return { added, removedIds, priceChanged };
}

describe("detectChanges", () => {
  const existing = new Map<string, number>([
    ["P1", 10.0],
    ["P2", 5.5],
    ["P3", 20.0],
  ]);

  it("detects newly added products", () => {
    const incoming: ProductStub[] = [
      { productId: "P1", name: "Plan 1", price: 10.0 },
      { productId: "P2", name: "Plan 2", price: 5.5 },
      { productId: "P3", name: "Plan 3", price: 20.0 },
      { productId: "P4", name: "New Plan", price: 8.0 }, // new
    ];
    const { added, removedIds, priceChanged } = detectChanges(existing, incoming);
    expect(added).toHaveLength(1);
    expect(added[0].productId).toBe("P4");
    expect(removedIds).toHaveLength(0);
    expect(priceChanged).toHaveLength(0);
  });

  it("detects removed products", () => {
    const incoming: ProductStub[] = [
      { productId: "P1", name: "Plan 1", price: 10.0 },
      // P2 and P3 are missing
    ];
    const { added, removedIds, priceChanged } = detectChanges(existing, incoming);
    expect(added).toHaveLength(0);
    expect(removedIds).toHaveLength(2);
    expect(removedIds).toContain("P2");
    expect(removedIds).toContain("P3");
    expect(priceChanged).toHaveLength(0);
  });

  it("detects price increases", () => {
    const incoming: ProductStub[] = [
      { productId: "P1", name: "Plan 1", price: 12.0 }, // was 10.0
      { productId: "P2", name: "Plan 2", price: 5.5 },
      { productId: "P3", name: "Plan 3", price: 20.0 },
    ];
    const { added, removedIds, priceChanged } = detectChanges(existing, incoming);
    expect(added).toHaveLength(0);
    expect(removedIds).toHaveLength(0);
    expect(priceChanged).toHaveLength(1);
    expect(priceChanged[0].productId).toBe("P1");
    expect(priceChanged[0].price).toBe(12.0);
  });

  it("detects price decreases", () => {
    const incoming: ProductStub[] = [
      { productId: "P1", name: "Plan 1", price: 10.0 },
      { productId: "P2", name: "Plan 2", price: 3.0 }, // was 5.5
      { productId: "P3", name: "Plan 3", price: 20.0 },
    ];
    const { added, removedIds, priceChanged } = detectChanges(existing, incoming);
    expect(priceChanged).toHaveLength(1);
    expect(priceChanged[0].productId).toBe("P2");
  });

  it("ignores floating-point noise below 0.001", () => {
    const incoming: ProductStub[] = [
      { productId: "P1", name: "Plan 1", price: 10.0000001 }, // noise
      { productId: "P2", name: "Plan 2", price: 5.5 },
      { productId: "P3", name: "Plan 3", price: 20.0 },
    ];
    const { priceChanged } = detectChanges(existing, incoming);
    expect(priceChanged).toHaveLength(0);
  });

  it("returns no changes when everything is identical", () => {
    const incoming: ProductStub[] = [
      { productId: "P1", name: "Plan 1", price: 10.0 },
      { productId: "P2", name: "Plan 2", price: 5.5 },
      { productId: "P3", name: "Plan 3", price: 20.0 },
    ];
    const { added, removedIds, priceChanged } = detectChanges(existing, incoming);
    expect(added).toHaveLength(0);
    expect(removedIds).toHaveLength(0);
    expect(priceChanged).toHaveLength(0);
  });

  it("handles empty existing map (first sync)", () => {
    const empty = new Map<string, number>();
    const incoming: ProductStub[] = [
      { productId: "P1", name: "Plan 1", price: 10.0 },
      { productId: "P2", name: "Plan 2", price: 5.5 },
    ];
    const { added, removedIds, priceChanged } = detectChanges(empty, incoming);
    expect(added).toHaveLength(2);
    expect(removedIds).toHaveLength(0);
    expect(priceChanged).toHaveLength(0);
  });
});
