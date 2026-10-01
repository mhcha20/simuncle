import { beforeEach, describe, expect, it, vi } from "vitest";

const retrieveMock = vi.fn();
const refundCreateMock = vi.fn();
const adminGetOrderByIdMock = vi.fn();
const updateOrderStatusMock = vi.fn();

vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { retrieve: retrieveMock, create: vi.fn() } };
    refunds = { create: refundCreateMock };
    webhooks = { constructEvent: vi.fn() };
  },
}));
vi.mock("./db", () => ({
  createOrder: vi.fn(), getOrderById: vi.fn(), getOrderByStripeSession: vi.fn(), getSetting: vi.fn(),
  createNotification: vi.fn(), createTopupOrder: vi.fn(), createEmailLog: vi.fn(), getProductById: vi.fn(),
  updateTopupOrderStatus: vi.fn(), getTopupOrderById: vi.fn(),
  updateOrderStatus: updateOrderStatusMock,
  adminGetOrderById: adminGetOrderByIdMock,
}));
vi.mock("./vizlync", () => ({ createVizlyncOrder: vi.fn(), getVizlyncOrder: vi.fn(), createTopupOrder: vi.fn() }));
vi.mock("./tgt", () => ({ createTgtOrder: vi.fn(), getTgtOrderByChannelNo: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./email", () => ({ sendOrderConfirmationEmail: vi.fn() }));

const order = (over: Record<string, unknown> = {}) => ({
  id: 5000003, status: "completed", stripePaymentIntentId: "pi_1", stripeSessionId: "cs_1", ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  retrieveMock.mockResolvedValue({ metadata: {}, payment_intent: "pi_1" });
  refundCreateMock.mockResolvedValue({ id: "re_1" });
});

describe("refundOrderPayment", () => {
  it("refunds the payment in full and marks the order refunded", async () => {
    adminGetOrderByIdMock.mockResolvedValue(order());
    const { refundOrderPayment } = await import("./stripe");
    const result = await refundOrderPayment(5000003);
    expect(result.refundId).toBe("re_1");
    expect(refundCreateMock).toHaveBeenCalledWith(
      { payment_intent: "pi_1", metadata: { order_id: "5000003" } },
      { idempotencyKey: "refund-order-5000003" },
    );
    expect(updateOrderStatusMock).toHaveBeenCalledWith(5000003, "refunded");
  });

  it("falls back to the payment on the checkout session", async () => {
    adminGetOrderByIdMock.mockResolvedValue(order({ stripePaymentIntentId: null }));
    retrieveMock.mockResolvedValue({ metadata: {}, payment_intent: "pi_from_session" });
    const { refundOrderPayment } = await import("./stripe");
    await refundOrderPayment(5000003);
    expect(refundCreateMock.mock.calls[0][0].payment_intent).toBe("pi_from_session");
  });

  it("refuses unpaid, already refunded and batch orders without touching Stripe", async () => {
    const { refundOrderPayment } = await import("./stripe");
    adminGetOrderByIdMock.mockResolvedValue(order({ status: "pending_payment" }));
    await expect(refundOrderPayment(1)).rejects.toThrow(/not been paid/);
    adminGetOrderByIdMock.mockResolvedValue(order({ status: "refunded" }));
    await expect(refundOrderPayment(1)).rejects.toThrow(/already refunded/);
    adminGetOrderByIdMock.mockResolvedValue(order());
    retrieveMock.mockResolvedValue({ metadata: { is_batch: "true" }, payment_intent: "pi_1" });
    await expect(refundOrderPayment(1)).rejects.toThrow(/other orders/);
    expect(refundCreateMock).not.toHaveBeenCalled();
    expect(updateOrderStatusMock).not.toHaveBeenCalled();
  });
});
