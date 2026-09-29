/**
 * Tests for the Stripe order reconciliation job.
 *
 * Verifies that reconcilePendingOrders():
 *  - retrieves the Stripe session for each stale order
 *  - fulfills (calls handleCheckoutCompleted) only when payment_status === "paid"
 *  - skips unpaid sessions
 *  - counts errors without throwing
 *  - handles topup orders the same way
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// --- Mocks ---
const retrieveMock = vi.fn();
const handleCheckoutCompletedMock = vi.fn();
const getStalePendingOrdersMock = vi.fn();
const getStalePendingTopupOrdersMock = vi.fn();

// Mock the Stripe SDK so no real network calls happen.
vi.mock("stripe", () => {
  return {
    default: class {
      checkout = { sessions: { retrieve: retrieveMock } };
      webhooks = { constructEvent: vi.fn() };
    },
  };
});

// Mock db helpers used by reconcilePendingOrders (imported dynamically inside the fn).
vi.mock("./db", () => ({
  createOrder: vi.fn(),
  getOrderByStripeSession: vi.fn(),
  updateOrderStatus: vi.fn(),
  getSetting: vi.fn(),
  createNotification: vi.fn(),
  createTopupOrder: vi.fn(),
  updateTopupOrderStatus: vi.fn(),
  getTopupOrderById: vi.fn(),
  getStalePendingOrders: getStalePendingOrdersMock,
  getStalePendingTopupOrders: getStalePendingTopupOrdersMock,
}));

vi.mock("./vizlync", () => ({
  createVizlyncOrder: vi.fn(),
  getVizlyncOrder: vi.fn(),
  createTopupOrder: vi.fn(),
}));

vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./email", () => ({ sendOrderConfirmationEmail: vi.fn() }));

describe("reconcilePendingOrders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getStalePendingOrdersMock.mockResolvedValue([]);
    getStalePendingTopupOrdersMock.mockResolvedValue([]);
  });

  it("fulfills a stale order whose Stripe session is paid", async () => {
    getStalePendingOrdersMock.mockResolvedValue([
      { id: 480001, stripeSessionId: "cs_test_paid" },
    ]);
    retrieveMock.mockResolvedValue({ id: "cs_test_paid", payment_status: "paid" });

    const stripeMod = await import("./stripe");
    const spy = vi.spyOn(stripeMod, "handleCheckoutCompleted").mockResolvedValue(undefined);

    const result = await stripeMod.reconcilePendingOrders(5);

    expect(retrieveMock).toHaveBeenCalledWith("cs_test_paid");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result.checked).toBe(1);
    expect(result.fulfilled).toBe(1);
    expect(result.errors).toBe(0);
    spy.mockRestore();
  });

  it("skips a stale order whose Stripe session is not paid", async () => {
    getStalePendingOrdersMock.mockResolvedValue([
      { id: 123, stripeSessionId: "cs_test_unpaid" },
    ]);
    retrieveMock.mockResolvedValue({ id: "cs_test_unpaid", payment_status: "unpaid" });

    const stripeMod = await import("./stripe");
    const spy = vi.spyOn(stripeMod, "handleCheckoutCompleted").mockResolvedValue(undefined);

    const result = await stripeMod.reconcilePendingOrders(5);

    expect(result.checked).toBe(1);
    expect(result.fulfilled).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("counts an error when Stripe retrieve throws", async () => {
    getStalePendingOrdersMock.mockResolvedValue([
      { id: 999, stripeSessionId: "cs_test_err" },
    ]);
    retrieveMock.mockRejectedValue(new Error("stripe down"));

    const stripeMod = await import("./stripe");
    const result = await stripeMod.reconcilePendingOrders(5);

    expect(result.checked).toBe(1);
    expect(result.fulfilled).toBe(0);
    expect(result.errors).toBe(1);
  });

  it("skips a cs_test_ session when the active key is live mode (no error)", async () => {
    // Re-import the module with a live key so STRIPE_KEY_MODE resolves to "live".
    vi.resetModules();
    const prevKey = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_live_dummy_for_test";
    try {
      const liveMod = await import("./stripe");
      getStalePendingOrdersMock.mockResolvedValue([
        { id: 30001, stripeSessionId: "cs_test_legacy" },
      ]);
      const spy = vi.spyOn(liveMod, "handleCheckoutCompleted").mockResolvedValue(undefined);

      const result = await liveMod.reconcilePendingOrders(5);

      // Mode mismatch → not retrieved, not checked, not an error.
      expect(retrieveMock).not.toHaveBeenCalled();
      expect(result.checked).toBe(0);
      expect(result.fulfilled).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.details.some((d) => d.action.startsWith("skipped (mode-mismatch"))).toBe(true);
      spy.mockRestore();
    } finally {
      process.env.STRIPE_SECRET_KEY = prevKey;
      vi.resetModules();
    }
  });

  it("reconciles topup orders via handleCheckoutCompleted", async () => {
    getStalePendingTopupOrdersMock.mockResolvedValue([
      { id: 7, stripeSessionId: "cs_test_topup_paid" },
    ]);
    retrieveMock.mockResolvedValue({ id: "cs_test_topup_paid", payment_status: "paid" });

    const stripeMod = await import("./stripe");
    const spy = vi.spyOn(stripeMod, "handleCheckoutCompleted").mockResolvedValue(undefined);

    const result = await stripeMod.reconcilePendingOrders(5);

    expect(result.checked).toBe(1);
    expect(result.fulfilled).toBe(1);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
