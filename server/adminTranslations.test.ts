/**
 * Tests for the admin per-product translation procedures:
 *  - adminProducts.getProductTranslations: returns all source + 5-language fields
 *  - adminProducts.updateProductTranslations: persists edited translations
 *  - adminProducts.retranslateProduct: re-runs LLM translation for one lang and
 *    writes the result to the matching column
 *
 * The db layer and LLM helper are mocked so no real network/DB calls happen.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { TrpcContext } from "./_core/context";

// ---- Mocks ----
const getProductByIdMock = vi.fn();
const updateSetMock = vi.fn();
const updateWhereMock = vi.fn();
// Chainable drizzle-like update mock: db.update(table).set(...).where(...)
const dbMock = {
  update: vi.fn(() => ({
    set: (vals: unknown) => {
      updateSetMock(vals);
      return { where: (cond: unknown) => updateWhereMock(cond) };
    },
  })),
};

vi.mock("./db", () => ({
  // Procedures referenced at module load by the router import
  addCartItem: vi.fn(),
  adminListProducts: vi.fn(),
  clearCart: vi.fn(),
  createOrder: vi.fn(),
  getCartItems: vi.fn(),
  getOrderById: vi.fn(),
  getOrderByStripeSession: vi.fn(),
  getOrderByEmailAndId: vi.fn(),
  getProductById: getProductByIdMock,
  getProducts: vi.fn(),
  getProductsCount: vi.fn(),
  getUserOrders: vi.fn(),
  removeCartItem: vi.fn(),
  toggleProductActive: vi.fn(),
  updateProductCustomFields: vi.fn(),
  exportProductsForCsv: vi.fn(),
  bulkUpdateProductCustomFields: vi.fn(),
  updateCartItemQty: vi.fn(),
  updateOrderStatus: vi.fn(),
  updateProductTranslation: vi.fn(),
  upsertProduct: vi.fn(),
  getAllSettings: vi.fn(),
  getSetting: vi.fn(),
  setSetting: vi.fn(),
  getActiveAnnouncement: vi.fn(),
  listAnnouncements: vi.fn(),
  upsertAnnouncement: vi.fn(),
  deleteAnnouncement: vi.fn(),
  toggleAnnouncementActive: vi.fn(),
  savePushSubscription: vi.fn(),
  deletePushSubscription: vi.fn(),
  getAllPushSubscriptions: vi.fn(),
  getPushSubscriptionByUser: vi.fn(),
  adminListOrders: vi.fn(),
  adminGetOrderById: vi.fn(),
  adminDeleteOrder: vi.fn(),
  getCustomerEmailByUserId: vi.fn(),
  createNotification: vi.fn(),
  getUserNotifications: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  recordSearchAnalytic: vi.fn(),
  getTopSearches: vi.fn(),
  getSimilarProducts: vi.fn(),
  getUserTopupOrders: vi.fn(),
  adminListTopupOrders: vi.fn(),
  getCompletedTopupOrdersByParent: vi.fn(),
  getOrdersByIds: vi.fn(),
  createEmailLog: vi.fn(),
  getEmailLogsByOrderId: vi.fn(),
  getRecentEmailLogs: vi.fn(),
  getTranslationStats: vi.fn(),
  getUntranslatedProductIds: vi.fn(),
  // Used inside the new procedures via dynamic import
  getDb: vi.fn(async () => dbMock),
}));

const invokeLLMMock = vi.fn();
vi.mock("./_core/llm", () => ({
  invokeLLM: (args: unknown) => invokeLLMMock(args),
}));

// Avoid heavy side-effect modules pulled in by the router import.
vi.mock("./push", () => ({ sendPushToAll: vi.fn() }));
vi.mock("./vizlync", () => ({
  createTopupOrder: vi.fn(),
  fetchAllProducts: vi.fn(),
  getTopupPlans: vi.fn(),
  getVizlyncOrder: vi.fn(),
  getVizlyncUsage: vi.fn(),
  extractTopupPlans: vi.fn(),
  computeTopupPriceHkd: vi.fn(),
  selectMainTopupPlans: vi.fn(),
  combineUsage: vi.fn(),
  terminateVizlyncOrder: vi.fn(),
}));
vi.mock("./stripe", () => ({
  createCheckoutSession: vi.fn(),
  createTopupCheckoutSession: vi.fn(),
  confirmAndFulfillBySession: vi.fn(),
}));
vi.mock("./email", () => ({
  sendOrderConfirmationEmail: vi.fn(),
  sendCustomEmailToCustomer: vi.fn(),
  sendTerminationEmail: vi.fn(),
}));

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const ctx = createAdminContext();
  ctx.user = { ...ctx.user!, role: "user" };
  return ctx;
}

describe("adminProducts translation procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getProductTranslations returns source + all 5 language fields", async () => {
    getProductByIdMock.mockResolvedValue({
      productId: "P1",
      name: "Japan 5GB",
      description: "<p>Source desc</p>",
      planInfo: "Source plan",
      descriptionZhTW: "繁中描述",
      descriptionZhCN: "简中描述",
      descriptionJa: "日本語",
      descriptionKo: null,
      descriptionTh: null,
      planInfoZhTW: "繁中方案",
      planInfoZhCN: null,
      planInfoJa: null,
      planInfoKo: null,
      planInfoTh: null,
    });
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.adminProducts.getProductTranslations({ productId: "P1" });

    expect(result.productId).toBe("P1");
    expect(result.description).toBe("<p>Source desc</p>");
    expect(result.descriptionZhTW).toBe("繁中描述");
    expect(result.descriptionJa).toBe("日本語");
    // null fields are normalised to empty strings
    expect(result.descriptionKo).toBe("");
    expect(result.planInfoZhCN).toBe("");
  });

  it("getProductTranslations throws NOT_FOUND for missing product", async () => {
    getProductByIdMock.mockResolvedValue(undefined);
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createAdminContext());
    await expect(
      caller.adminProducts.getProductTranslations({ productId: "missing" })
    ).rejects.toThrow();
  });

  it("updateProductTranslations persists all language columns", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.adminProducts.updateProductTranslations({
      productId: "P1",
      descriptionZhTW: "新繁中",
      descriptionZhCN: "新简中",
      descriptionJa: "新日文",
      descriptionKo: "",
      descriptionTh: "",
      planInfoZhTW: "新繁中方案",
      planInfoZhCN: "",
      planInfoJa: "",
      planInfoKo: "",
      planInfoTh: "",
    });

    expect(result).toEqual({ success: true });
    expect(updateSetMock).toHaveBeenCalledTimes(1);
    const setVals = updateSetMock.mock.calls[0][0] as Record<string, unknown>;
    expect(setVals.descriptionZhTW).toBe("新繁中");
    expect(setVals.descriptionJa).toBe("新日文");
    expect(setVals.planInfoZhTW).toBe("新繁中方案");
    expect(updateWhereMock).toHaveBeenCalledTimes(1);
  });

  it("retranslateProduct calls LLM and writes the matching language columns", async () => {
    getProductByIdMock.mockResolvedValue({
      productId: "P1",
      name: "Japan 5GB",
      description: "Enjoy fast data in Japan",
      planInfo: "5GB for 7 Natural Days",
    });
    // Two translateText calls (description + planInfo)
    invokeLLMMock
      .mockResolvedValueOnce({ choices: [{ message: { content: "日本で高速データ" } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: "7暦日で5GB" } }] });

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.adminProducts.retranslateProduct({ productId: "P1", lang: "ja" });

    expect(invokeLLMMock).toHaveBeenCalledTimes(2);
    expect(result.description).toBe("日本で高速データ");
    expect(result.planInfo).toBe("7暦日で5GB");

    const setVals = updateSetMock.mock.calls[0][0] as Record<string, unknown>;
    expect(setVals.descriptionJa).toBe("日本で高速データ");
    expect(setVals.planInfoJa).toBe("7暦日で5GB");
  });

  it("retranslateProduct routes zh-TW translation to the ZhTW columns", async () => {
    getProductByIdMock.mockResolvedValue({
      productId: "P2",
      name: "Korea 3GB",
      description: "Korea data plan",
      planInfo: "3GB plan",
    });
    invokeLLMMock
      .mockResolvedValueOnce({ choices: [{ message: { content: "韓國數據方案" } }] })
      .mockResolvedValueOnce({ choices: [{ message: { content: "3GB 方案" } }] });

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createAdminContext());
    await caller.adminProducts.retranslateProduct({ productId: "P2", lang: "zh-TW" });

    const setVals = updateSetMock.mock.calls[0][0] as Record<string, unknown>;
    expect(setVals.descriptionZhTW).toBe("韓國數據方案");
    expect(setVals.planInfoZhTW).toBe("3GB 方案");
    // Should not touch Japanese columns
    expect(setVals.descriptionJa).toBeUndefined();
  });

  it("rejects non-admin callers", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createUserContext());
    await expect(
      caller.adminProducts.getProductTranslations({ productId: "P1" })
    ).rejects.toThrow();
  });
});
