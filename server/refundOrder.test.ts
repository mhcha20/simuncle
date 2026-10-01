import { beforeEach, describe, expect, it, vi } from "vitest";

const retrieveMock = vi.fn();
const refundCreateMock = vi.fn();
const adminGetOrderByIdMock = vi.fn();
const updateOrderStatusMock = vi.fn();
const sendCustomEmailMock = vi.fn();
const createEmailLogMock = vi.fn();

vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { retrieve: retrieveMock, create: vi.fn() } };
    refunds = { create: refundCreateMock };
    webhooks = { constructEvent: vi.fn() };
  },
}));
vi.mock("./db", () => ({
  createOrder: vi.fn(), getOrderById: vi.fn(), getOrderByStripeSession: vi.fn(), getSetting: vi.fn(),
  createNotification: vi.fn(), createTopupOrder: vi.fn(), createEmailLog: createEmailLogMock, getProductById: vi.fn(),
  getCustomerEmailByUserId: vi.fn(async () => "member@example.com"),
  updateTopupOrderStatus: vi.fn(), getTopupOrderById: vi.fn(),
  updateOrderStatus: updateOrderStatusMock,
  adminGetOrderById: adminGetOrderByIdMock,
}));
vi.mock("./vizlync", () => ({ createVizlyncOrder: vi.fn(), getVizlyncOrder: vi.fn(), createTopupOrder: vi.fn() }));
vi.mock("./tgt", () => ({ createTgtOrder: vi.fn(), getTgtOrderByChannelNo: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./email", () => ({ sendOrderConfirmationEmail: vi.fn(), sendCustomEmailToCustomer: sendCustomEmailMock }));

const order = (over: Record<string, unknown> = {}) => ({
  id: 5000003, status: "completed", stripePaymentIntentId: "pi_1", stripeSessionId: "cs_1", ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  retrieveMock.mockResolvedValue({ metadata: {}, payment_intent: "pi_1" });
  refundCreateMock.mockResolvedValue({ id: "re_1", amount: 500, currency: "hkd" });
  sendCustomEmailMock.mockResolvedValue(true);
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

  it("emails the customer and logs it, and a failed email does not undo the refund", async () => {
    adminGetOrderByIdMock.mockResolvedValue(order({ guestEmail: "guest@example.com" }));
    const { refundOrderPayment } = await import("./stripe");
    await refundOrderPayment(5000003);
    expect(sendCustomEmailMock.mock.calls[0][0].to).toBe("guest@example.com");
    expect(sendCustomEmailMock.mock.calls[0][0].content).toContain("HKD 5.00");
    expect(createEmailLogMock.mock.calls[0][0]).toMatchObject({ orderId: 5000003, emailType: "refund", status: "sent" });

    sendCustomEmailMock.mockRejectedValue(new Error("resend down"));
    adminGetOrderByIdMock.mockResolvedValue(order({ id: 7, guestEmail: "guest@example.com" }));
    await expect(refundOrderPayment(7)).resolves.toMatchObject({ refundId: "re_1" });
    expect(updateOrderStatusMock).toHaveBeenCalledWith(7, "refunded");
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
