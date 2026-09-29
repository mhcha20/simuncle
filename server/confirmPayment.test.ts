/**
 * Tests for confirmAndFulfillBySession() — the on-demand payment confirmation
 * called from the checkout success page (instead of relying on the webhook).
 *
 * Verifies that it:
 *  - fulfills (calls handleCheckoutCompleted) when the session is paid
 *  - returns "unpaid" without fulfilling when not paid
 *  - returns "error" when Stripe retrieve throws
 *  - skips a mode-mismatched session (live key + cs_test_) without calling Stripe
 *  - returns "not_found" for an empty session id
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const retrieveMock = vi.fn();

vi.mock("stripe", () => {
  return {
    default: class {
      checkout = { sessions: { retrieve: retrieveMock } };
      webhooks = { constructEvent: vi.fn() };
    },
  };
});

vi.mock("./db", () => ({
  createOrder: vi.fn(),
  getOrderByStripeSession: vi.fn(),
  updateOrderStatus: vi.fn(),
  getSetting: vi.fn(),
  createNotification: vi.fn(),
  createTopupOrder: vi.fn(),
  updateTopupOrderStatus: vi.fn(),
  getTopupOrderById: vi.fn(),
  getStalePendingOrders: vi.fn(),
  getStalePendingTopupOrders: vi.fn(),
}));

vi.mock("./vizlync", () => ({
  createVizlyncOrder: vi.fn(),
  getVizlyncOrder: vi.fn(),
  createTopupOrder: vi.fn(),
}));

vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./email", () => ({ sendOrderConfirmationEmail: vi.fn() }));

describe("confirmAndFulfillBySession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not_found for an empty session id", async () => {
    const mod = await import("./stripe");
    const result = await mod.confirmAndFulfillBySession("");
    expect(result.status).toBe("not_found");
    expect(retrieveMock).not.toHaveBeenCalled();
  });

  it("fulfills when the session is paid", async () => {
    retrieveMock.mockResolvedValue({ id: "cs_test_paid", payment_status: "paid" });
    const mod = await import("./stripe");
    const spy = vi.spyOn(mod, "handleCheckoutCompleted").mockResolvedValue(undefined);

    const result = await mod.confirmAndFulfillBySession("cs_test_paid");

    expect(retrieveMock).toHaveBeenCalledWith("cs_test_paid");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("fulfilled");
    spy.mockRestore();
  });

  it("returns unpaid without fulfilling when not paid", async () => {
    retrieveMock.mockResolvedValue({ id: "cs_test_unpaid", payment_status: "unpaid" });
    const mod = await import("./stripe");
    const spy = vi.spyOn(mod, "handleCheckoutCompleted").mockResolvedValue(undefined);

    const result = await mod.confirmAndFulfillBySession("cs_test_unpaid");

    expect(result.status).toBe("unpaid");
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("returns error when Stripe retrieve throws", async () => {
    retrieveMock.mockRejectedValue(new Error("stripe down"));
    const mod = await import("./stripe");
    const result = await mod.confirmAndFulfillBySession("cs_test_err");
    expect(result.status).toBe("error");
  });

  it("skips a cs_test_ session when the active key is live mode", async () => {
    vi.resetModules();
    const prevKey = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_live_dummy_for_test";
    try {
      const liveMod = await import("./stripe");
      const result = await liveMod.confirmAndFulfillBySession("cs_test_legacy");
      expect(result.status).toBe("mode_mismatch");
      expect(retrieveMock).not.toHaveBeenCalled();
    } finally {
      process.env.STRIPE_SECRET_KEY = prevKey;
      vi.resetModules();
    }
  });
});
