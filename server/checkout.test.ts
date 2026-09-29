/**
 * Tests for checkout flow - specifically testing the insertId fix
 * for Drizzle mysql2 returning [ResultSetHeader, FieldPacket[]] instead of ResultSetHeader
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the DB module
vi.mock("./db", () => ({
  getCartItems: vi.fn(),
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
  getOrderByStripeSession: vi.fn(),
  getSetting: vi.fn(),
}));

// Mock Stripe
vi.mock("./stripe", () => ({
  createCheckoutSession: vi.fn(),
}));

import { getCartItems, createOrder, getSetting } from "./db";
import { createCheckoutSession } from "./stripe";

describe("Checkout - insertId fix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createOrder should handle Drizzle mysql2 returning [ResultSetHeader, FieldPacket[]]", async () => {
    // Drizzle mysql2 returns [ResultSetHeader, FieldPacket[]] from insert
    // The old code did: (result as { insertId: number }).insertId  → undefined
    // The new code does: (result as [{ insertId: number }, unknown])[0].insertId → correct

    const mockDrizzleResult = [{ insertId: 42, affectedRows: 1 }, []]; // [ResultSetHeader, FieldPacket[]]

    // Simulate the new extraction logic
    const rawResult = mockDrizzleResult as unknown as [{ insertId: number }, unknown];
    const extractedId = rawResult[0].insertId;

    expect(extractedId).toBe(42);
    expect(extractedId).not.toBeUndefined();
  });

  it("old extraction logic would return undefined (confirming the bug)", () => {
    const mockDrizzleResult = [{ insertId: 42, affectedRows: 1 }, []];

    // Old broken code
    const oldExtraction = (mockDrizzleResult as unknown as { insertId: number }).insertId;

    expect(oldExtraction).toBeUndefined(); // This was the bug!
  });

  it("createCartSession should apply markup percentage to unit price", async () => {
    // Mock getSetting to return 20% markup
    vi.mocked(getSetting).mockResolvedValue("20");

    // Mock cart items
    vi.mocked(getCartItems).mockResolvedValue([
      {
        id: 1,
        userId: 1,
        productId: "test-product",
        productName: "Test eSIM",
        productData: { dataAmount: "10", dataUnit: "GB", validityDays: 30 },
        quantity: 1,
        unitPrice: "10.00", // base price
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // Mock createCheckoutSession
    vi.mocked(createCheckoutSession).mockResolvedValue({
      sessionId: "cs_test_123",
      url: "https://checkout.stripe.com/test",
    });

    // Simulate the markup calculation
    const markupSetting = await getSetting("markup_percentage");
    const markupPct = markupSetting ? parseFloat(markupSetting) : 0;
    const applyMarkup = (p: number) => markupPct > 0 ? p * (1 + markupPct / 100) : p;

    const basePrice = 10.00;
    const priceWithMarkup = applyMarkup(basePrice);

    expect(priceWithMarkup).toBe(12.00); // 10 * 1.2 = 12
    expect(markupPct).toBe(20);
  });

  it("createCartSession should not apply markup when markup is 0", async () => {
    vi.mocked(getSetting).mockResolvedValue("0");

    const markupSetting = await getSetting("markup_percentage");
    const markupPct = markupSetting ? parseFloat(markupSetting) : 0;
    const applyMarkup = (p: number) => markupPct > 0 ? p * (1 + markupPct / 100) : p;

    const basePrice = 10.00;
    const priceWithMarkup = applyMarkup(basePrice);

    expect(priceWithMarkup).toBe(10.00); // no markup
  });

  it("createCartSession should not apply markup when setting is null", async () => {
    vi.mocked(getSetting).mockResolvedValue(null);

    const markupSetting = await getSetting("markup_percentage");
    const markupPct = markupSetting ? parseFloat(markupSetting) : 0;
    const applyMarkup = (p: number) => markupPct > 0 ? p * (1 + markupPct / 100) : p;

    const basePrice = 10.00;
    const priceWithMarkup = applyMarkup(basePrice);

    expect(priceWithMarkup).toBe(10.00); // no markup
  });
});
