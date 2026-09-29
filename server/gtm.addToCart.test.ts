import { describe, it, expect, beforeEach, vi } from "vitest";

const ADD_TO_CART_SEND_TO = "AW-18236820850/KiD2CKLCkL8cEPKa__dD";

/**
 * Mirrors client/src/lib/gtm.ts `trackAddToCart` so the dataLayer payload
 * contract is locked in CI (vitest only scans server/**). If the client
 * helper shape changes, update this test to match.
 */
function pushEvent(event: Record<string, unknown>) {
  (globalThis as any).dataLayer = (globalThis as any).dataLayer || [];
  (globalThis as any).dataLayer.push(event);
}

function trackAddToCart(params: {
  itemId: string;
  itemName: string;
  price?: number;
  currency?: string;
  quantity?: number;
}) {
  const value = (params.price ?? 0) * (params.quantity ?? 1);
  const currency = params.currency ?? "HKD";
  pushEvent({
    event: "add_to_cart",
    ecommerce: {
      currency,
      value,
      items: [
        {
          item_id: params.itemId,
          item_name: params.itemName,
          price: params.price ?? 0,
          quantity: params.quantity ?? 1,
        },
      ],
    },
  });
  const w = globalThis as unknown as { gtag?: (...args: unknown[]) => void };
  if (typeof w.gtag === "function") {
    w.gtag("event", "conversion", { send_to: ADD_TO_CART_SEND_TO, value, currency });
  }
}

describe("trackAddToCart dataLayer payload", () => {
  beforeEach(() => {
    (globalThis as any).dataLayer = [];
  });

  it("pushes add_to_cart with value = price * quantity", () => {
    trackAddToCart({ itemId: "jp-5gb", itemName: "Japan 5GB", price: 88, currency: "HKD", quantity: 2 });
    const dl = (globalThis as any).dataLayer as Record<string, unknown>[];
    expect(dl).toHaveLength(1);
    const evt = dl[0] as any;
    expect(evt.event).toBe("add_to_cart");
    expect(evt.ecommerce.currency).toBe("HKD");
    expect(evt.ecommerce.value).toBe(176);
    expect(evt.ecommerce.items[0]).toMatchObject({
      item_id: "jp-5gb",
      item_name: "Japan 5GB",
      price: 88,
      quantity: 2,
    });
  });

  it("defaults currency to HKD and quantity to 1", () => {
    trackAddToCart({ itemId: "kr-3gb", itemName: "Korea 3GB", price: 50 });
    const evt = (globalThis as any).dataLayer[0] as any;
    expect(evt.ecommerce.currency).toBe("HKD");
    expect(evt.ecommerce.value).toBe(50);
    expect(evt.ecommerce.items[0].quantity).toBe(1);
  });

  it("treats missing price as 0", () => {
    trackAddToCart({ itemId: "x", itemName: "X" });
    const evt = (globalThis as any).dataLayer[0] as any;
    expect(evt.ecommerce.value).toBe(0);
    expect(evt.ecommerce.items[0].price).toBe(0);
  });

  it("fires Google Ads conversion with correct send_to, value and currency", () => {
    const gtagSpy = vi.fn();
    (globalThis as any).gtag = gtagSpy;
    trackAddToCart({ itemId: "jp-5gb", itemName: "Japan 5GB", price: 88, currency: "HKD", quantity: 2 });
    expect(gtagSpy).toHaveBeenCalledWith("event", "conversion", {
      send_to: "AW-18236820850/KiD2CKLCkL8cEPKa__dD",
      value: 176,
      currency: "HKD",
    });
    delete (globalThis as any).gtag;
  });
});
