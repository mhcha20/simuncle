import { beforeEach, describe, expect, it, vi } from "vitest";

const retrieveMock = vi.fn();
const createMock = vi.fn();
const getTopupOrderByIdMock = vi.fn();
const updateTopupOrderStatusMock = vi.fn();

vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { retrieve: retrieveMock, create: createMock } };
    webhooks = { constructEvent: vi.fn() };
  },
}));
vi.mock("./db", () => ({
  createOrder: vi.fn(), getOrderByStripeSession: vi.fn(), updateOrderStatus: vi.fn(), getSetting: vi.fn(),
  createNotification: vi.fn(), createTopupOrder: vi.fn(), createEmailLog: vi.fn(), getProductById: vi.fn(),
  updateTopupOrderStatus: updateTopupOrderStatusMock,
  getTopupOrderById: getTopupOrderByIdMock,
}));
vi.mock("./vizlync", () => ({ createVizlyncOrder: vi.fn(), getVizlyncOrder: vi.fn(), createTopupOrder: vi.fn() }));
vi.mock("./tgt", () => ({ createTgtOrder: vi.fn(), getTgtOrderByChannelNo: vi.fn() }));
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn() }));
vi.mock("./email", () => ({ sendOrderConfirmationEmail: vi.fn() }));

const topup = (over: Record<string, unknown> = {}) => ({
  id: 5000000, userId: 7, parentOrderId: 5000001, topupProductId: "ADD1", topupProductName: "SG 500MB",
  priceHkd: "12", status: "pending_payment", stripeSessionId: "cs_test_old", ...over,
});
const base = {
  topupOrderId: 5000000, userId: 7, successUrl: "https://x.com/orders?topup_success=true", cancelUrl: "https://x.com/orders",
  getParentVizlyncOrderId: async () => "VLZ1",
};

beforeEach(() => vi.clearAllMocks());

describe("resumeTopupCheckout", () => {
  it("reuses the Stripe page while it is still open", async () => {
    getTopupOrderByIdMock.mockResolvedValue(topup());
    retrieveMock.mockResolvedValue({ id: "cs_test_old", status: "open", payment_status: "unpaid", url: "https://checkout/old" });
    const { resumeTopupCheckout } = await import("./stripe");
    expect(await resumeTopupCheckout(base)).toEqual({ kind: "pay", url: "https://checkout/old" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("reports an already-paid session so it can be completed now", async () => {
    getTopupOrderByIdMock.mockResolvedValue(topup());
    retrieveMock.mockResolvedValue({ id: "cs_test_old", status: "complete", payment_status: "paid" });
    const { resumeTopupCheckout } = await import("./stripe");
    expect(await resumeTopupCheckout(base)).toEqual({ kind: "paid", sessionId: "cs_test_old" });
    expect(createMock).not.toHaveBeenCalled();
  });

  it("opens a new session for the SAME top-up order when the old one expired", async () => {
    getTopupOrderByIdMock.mockResolvedValue(topup());
    retrieveMock.mockResolvedValue({ id: "cs_test_old", status: "expired", payment_status: "unpaid" });
    createMock.mockResolvedValue({ id: "cs_test_new", url: "https://checkout/new", payment_intent: null });
    const { resumeTopupCheckout } = await import("./stripe");
    expect(await resumeTopupCheckout(base)).toEqual({ kind: "pay", url: "https://checkout/new" });
    const args = createMock.mock.calls[0][0];
    expect(args.metadata.topup_order_id).toBe("5000000");
    expect(args.metadata.vizlync_order_id).toBe("VLZ1");
    expect(args.line_items[0].price_data.unit_amount).toBe(1200);
    expect(args.success_url).toBe("https://x.com/orders?topup_success=true&topup_session_id={CHECKOUT_SESSION_ID}&topup_success=true");
    expect(updateTopupOrderStatusMock).toHaveBeenCalledWith(5000000, "pending_payment", expect.objectContaining({ stripeSessionId: "cs_test_new" }));
  });

  it("refuses someone else's or non-pending top-up", async () => {
    const { resumeTopupCheckout } = await import("./stripe");
    getTopupOrderByIdMock.mockResolvedValue(topup({ userId: 99 }));
    await expect(resumeTopupCheckout(base)).rejects.toThrow("NOT_FOUND");
    getTopupOrderByIdMock.mockResolvedValue(topup({ status: "completed" }));
    await expect(resumeTopupCheckout(base)).rejects.toThrow("NOT_PENDING");
  });
});
